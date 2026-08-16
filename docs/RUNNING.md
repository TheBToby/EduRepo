# EduRepo – Docker-Anleitung & Troubleshooting

Diese Anleitung beschreibt den Betrieb der EduRepo-Plattform in einer
**Docker-Container-Umgebung** (Test/Lokal/Home Server) sowie das Deployment
auf einem **Produktivserver** (Produktionsmodus = Standard-Compose).

> Voraussetzungen: **Docker ≥ 24** und **Docker Compose v2** (`docker compose`).
> Prüfen: `docker --version && docker compose version`.

---

## 1. Einrichtung (erstmalig)

### 1.1 `.env` erstellen

```bash
cp .env.example .env
```

Öffne `.env` und passe zwingend folgende Werte an:

```ini
# Starks Geheimnis erzeugen (z. B.):
#   openssl rand -hex 32
JWT_SECRET=<dein-geheimnis>
APP_SECRET=<noch-ein-geheimnis>

# SMTP (dein Mailserver)
SMTP_HOST=smtp.dein-provider.ch
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=dein-user
SMTP_PASS=dein-passwort
SMTP_FROM="EduRepo <noreply@deine-domain.ch>"

# Öffentliche URL (für OAuth-Redirects!)
PUBLIC_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:4000
CORS_ORIGINS=http://localhost:3000

# OAuth (für Google/Microsoft-Login)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_TENANT=common   # oder deine Tenant-ID
```

### 1.2 OAuth-Redirect-URIs konfigurieren

Trage in den jeweiligen Provider-Konsolen folgende **Redirect-URIs** ein:

| Provider | Redirect-URI |
|---|---|
| Google Cloud Console | `${PUBLIC_BASE_URL}/api/auth/google/callback` → lokal: `http://localhost:4000/auth/google/callback`* |
| Microsoft Entra ID | `${PUBLIC_BASE_URL}/api/auth/microsoft/callback` |

\* Hinweis: Die OAuth-Start- und Callback-Endpunkte liegen im **Backend** (Port 4000).
Falls du einen Reverse-Proxy vorlegst, leite `/api/*` ans Backend weiter und trage
die Proxy-URL als `PUBLIC_BASE_URL` ein.

### 1.3 Starten (Produktionsmodus – Standard)

```bash
docker compose up -d --build
```

Die `docker-compose.yml` ist **produktionsreif**: Backend & Frontend werden als
komplett gebaute Images gestartet (Multi-Stage-Build, kein Quellcode-Mount).
Das reicht für Server-Deployments und lokale Tests ohne Hot-Reload.

> **Wichtig für Server:** Benötigt nur das Repo (bzw. die Images) – nicht jedoch
> eingecheckte/existierende `node_modules` oder besondere Ordnerrechte.

Beim **ersten** Start passiert im Hintergrund:

1. PostgreSQL, Redis, MinIO starten (mit Healthchecks).
2. `minio-init` legt den Bucket `edurepo-files` an.
3. Backend-Entrypoint wendet das DB-Schema an (`prisma migrate deploy`, sobald
   Migrationen existieren; sonst `prisma db push`) und führt den Seed aus
   (Fächer-Katalog + Admin-Konto).
4. Backend (`node dist/src/main.js`) und Frontend (`node server.js`, Next.js
   standalone) starten.

### 1.4 Starten (Entwicklungsmodus – Hot-Reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Das Override `docker-compose.dev.yml` aktiviert die **dev-Stages** der
Dockerfiles, mountet den Quellcode als Volume (`./backend`, `./frontend`) und
startet `nest start --watch` bzw. `next dev` – Änderungen am Code werden
sofort wirksam (inkl. `prisma db push` + Seed beim Start).

> Alle weiteren `docker compose`-Befehle in Entwicklung ebenfalls mit
> `-f docker-compose.yml -f docker-compose.dev.yml` ausführen.

Status prüfen:

```bash
docker compose ps
```

---

## 2. Initialen Admin einloggen

Das initiale Admin-Passwort wird **zufällig** generiert und beim ersten Seed in den
Logs ausgegeben:

```bash
docker compose logs backend | grep -A3 "Initialer Administrator"
```

Beispiel-Ausgabe:

```
------------------------------------------------------------
 Initialer Administrator angelegt
   E-Mail:     admin@edurepo.local
   Passwort:   a1b2c3d4e5f6...  (nur Development, bitte sofort ändern!)
------------------------------------------------------------
```

Anmelden unter http://localhost:3000/de/login.
**Passwort danach sofort im Profil ändern!**

---

## 3. URLs

| Dienst | URL | Hinweis |
|---|---|---|
| Frontend | http://localhost:3000 | Next.js (App) |
| Landing | http://localhost:3000/de | Deutsch (auch `/fr`, `/it`, `/en`) |
| API-Docs | http://localhost:4000/api/docs | Swagger-UI |
| MinIO Console | http://localhost:9001 | Login: `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` |
| PostgreSQL | localhost:5432 | Direktzugriff für Tools (z. B. DBeaver) |
| Redis | localhost:6379 | |

---

## 4. Häufige Befehle

```bash
# Container anzeigen
docker compose ps

# Logs (live, aller Services)
docker compose logs -f

# Nur Backend-Logs
docker compose logs -f backend

# Stoppen
docker compose down

# Stoppen + alle Daten löschen (Achtung: DB/Dateien weg!)
docker compose down -v
# Auch die gemounteten docker-data/ Ordner löschen:
#   rm -rf docker-data

# Nur Backend neu starten
docker compose restart backend

# Image neu bauen (nach Dependency-Änderung in package.json)
docker compose up -d --build backend

# Ein Befehl im Backend-Container ausführen
docker compose exec backend npx prisma studio
docker compose exec backend sh
```

---

## 5. Datenbank-Schema anpassen

Das Backend nutzt im Dev-Modus `prisma db push` (synchronisiert das Schema direkt beim
Start, keine vorgenerierten Migrationen nötig).

Workflow:

1. `backend/prisma/schema.prisma` anpassen.
2. `docker compose restart backend` – der Start-Hook führt `prisma db push` erneut aus.

Für **reproduzierbare Migrationen** (empfohlen vor Produktion):

```bash
docker compose exec backend npx prisma migrate dev --name <name>
```

Die erzeugten Migrationsdateien werden unter `backend/prisma/migrations/` gespeichert.

---

## 6. Seed erneut ausführen

Der Seed ist **idempotent** – er überschreibt Fächer-Kataloge nicht destruktiv und legt
den Admin nur an, wenn er noch nicht existiert. Erneut erzwingen:

```bash
docker compose exec backend npx prisma db seed
```

---

## 7. Backup & Restore

### Backup (DB)

```bash
docker compose exec postgres pg_dump -U edurepo edurepo > backup.sql
```

### Restore (DB)

```bash
cat backup.sql | docker compose exec -T postgres psql -U edurepo edurepo
```

### Backup (Dateien / MinIO)

Die Dateien liegen im Volume `./docker-data/minio`. Für ein Datei-Backup dieses
Verzeichnis sichern. Alternativ mit `mc` (MinIO Client):

```bash
docker compose run --rm minio-init mc mirror local/edurepo-files /backup
```

---

## 8. Produktion

Der **Produktionsmodus ist bereits der Standard** (`docker compose up -d --build`):

- Backend & Frontend laufen als **multi-stage gebaute Images** (kein Quellcode-Mount,
  keine Dev-Abhängigkeiten im Backend-Image, Non-Root-User `node`).
- Der Backend-Entrypoint (`docker-entrypoint.sh`) wendet das Schema an:
  `prisma migrate deploy`, sobald `prisma/migrations/` existiert, sonst
  `prisma db push` – und startet danach `node dist/src/main.js`.
- Frontend: Next.js **standalone**-Build (`output: 'standalone'`), Start via
  `node server.js`.
- `NODE_ENV` defaultet auf `production`, wenn nicht in `.env` gesetzt.

Zusätzlich für den produktiven Einsatz beachten:

- **TLS/HTTPS**: Reverse Proxy (Caddy/Traefik/Nginx) vorlegen; HTTPS erzwingen.
- **`NEXT_PUBLIC_*`-Variablen** (z. B. `NEXT_PUBLIC_API_URL`) werden beim
  **Image-Build** eingebrannt → bei Änderung neu bauen
  (`docker compose up -d --build frontend`).
- `JWT_SECRET`, `APP_SECRET`, DB-Passwörter, MinIO-Root-Credentials → streng geheim.
- Rate-Limiting & Brute-Force-Schutz am Proxy konfigurieren.
- Regelmässige **Backups** (DB + Object Storage) einrichten.
- (Optional) ClamAV für Virenscan beim Upload ergänzen.

---

## 9. Troubleshooting

| Symptom | Ursache / Lösung |
|---|---|
| Backend startet nicht, `Cannot connect to Postgres` | Warte, bis der `postgres`-Healthcheck grün ist. `docker compose ps`. |
| `Bucket ready` fehlt | `minio-init` prüfen: `docker compose logs minio-init`. |
| Frontend zeigt "Lädt …" endlos | Vermutlich nicht eingeloggt → `/login`. Oder API nicht erreichbar (`NEXT_PUBLIC_API_URL` prüfen). |
| OAuth-Redirect fehlerhaft | `PUBLIC_BASE_URL` und Redirect-URIs in Google/Microsoft-Konsole vergleichen. |
| Keine E-Mails kommen | `SMTP_*` prüfen. Ohne `SMTP_HOST` loggt das Backend Mails nur (Dev-Modus). |
| 413 Payload Too Large | Datei > `MAX_FILE_SIZE_BYTES` (Default 100 MB) oder Proxy-Limit. |
| Port bereits belegt | Port in `docker-compose.yml` oder auf dem Host ändern. |
| Änderungen in `package.json` greifen nicht | Image neu bauen: `docker compose up -d --build backend`. |
| `ENOENT: /app/package.json` (Frontend) oder `Could not find Prisma Schema` (Backend) auf dem Server | Alte Dev-Compose mit `./frontend:/app`-/`./backend:/app`-Mounts aktiv? Für Produktion **nur** `docker-compose.yml` nutzen (keine Override-Datei). Der Fehler entstand, wenn auf dem Server kein Quellcode lag und Docker leere Ordner über `/app` mountete. |
| `NEXT_PUBLIC_*`-Änderung zeigt keine Wirkung | Wert ist im Frontend-Image eingebrannt → `docker compose up -d --build frontend`. |

### Logs_inspezionieren

```bash
# Alle Services
docker compose logs -f

# Letzte 200 Zeilen Backend
docker compose logs --tail 200 backend

# Nur Fehler
docker compose logs backend 2>&1 | grep -i error
```

### Komplett neu starten (frisch)

```bash
docker compose down -v
rm -rf docker-data
docker compose up -d --build
docker compose logs -f backend   # Admin-Passwort notieren!
```

---

## 10. Coder Workspace (virtuelle IDE)

Bei der Weiterentwicklung in einer **Coder-Workspace-Umgebung** gilt:

### Persistente Daten

Alle Daten, die ein Workspace-Update überleben müssen (PostgreSQL, Redis, MinIO),
liegen in `/opt/coder/EduRepo/docker-data/` – gesteuert über `EDUREPO_DATA_DIR`
in der `.env` (Standard ohne Coder: `./docker-data` im Repo).

### Zugriff über die lokale Workspace-IP

Die `.env` ist auf die lokale IP des Workspaces konfiguriert (z. B. `172.20.0.2`),
damit Smoke Tests direkt im Browser (z. B. Brave) möglich sind:

| Dienst | URL |
|---|---|
| Frontend | `http://<workspace-ip>:3000` |
| API-Docs | `http://<workspace-ip>:4000/api/docs` |
| MinIO Console | `http://<workspace-ip>:9001` |

### API-Aufrufe: Same-Origin-Proxy (wichtig!)

Der Browser ruft das Backend **nie direkt** auf. Stattdessen leitet der Next.js-Server
alle `/api/*`-Pfade per Rewrite an das Backend weiter (`next.config.mjs`). Dadurch:

- funktionieren Logins/Cookies über **jede** Zugriffs-URL (localhost, lokale IP,
  Coder-Proxy-URL wie `https://3000--main--<workspace>--<host>`),
- gibt es keine CORS- oder Mixed-Content-Fehler,
- bleibt `NEXT_PUBLIC_API_URL` standardmässig **leer** (Same-Origin).

Ein "Failed to fetch" im Browser deutet meist darauf hin, dass `NEXT_PUBLIC_API_URL`
auf eine vom Browser aus nicht erreichbare Adresse (z. B. interne Docker-IP) gesetzt ist.

> Hinweis: Nach einer Workspace-Aktualisierung kann sich die IP ändern – dann
> `PUBLIC_BASE_URL`, `API_BASE_URL`, `CORS_ORIGINS` und `S3_PUBLIC_ENDPOINT`
> in der `.env` anpassen und `docker compose up -d` ausführen.

### Smoke Test (Brave, headless)

```bash
# Screenshot der Landing Page
brave-browser --headless --no-sandbox --disable-gpu \
  --screenshot=/tmp/frontend-de.png --window-size=1280,900 \
  --virtual-time-budget=15000 http://172.20.0.2:3000/de

# DOM-Inhalte prüfen
brave-browser --headless --no-sandbox --disable-gpu --dump-dom \
  --virtual-time-budget=15000 http://172.20.0.2:3000/de | grep -i edurepo
```

### Besonderheiten dieser Umgebung

- **Ältere vCPU (nur SSE2 / kein x86-64-v2):** Aktuelle MinIO- und mc-Releases
  starten nicht (`Fatal glibc error`). Deshalb sind in der `docker-compose.yml`
  ältere, kompatible Releases gepinnt (`MINIO_IMAGE`, `MC_IMAGE` überschreibbar).
- **Brave-Installation offline:** Brave via GitHub-Release-`.deb` installieren
  (Brave-apt-Repo ist je nach Netzwerk-DNS evtl. nicht erreichbar).

## 11. Datenfluss (Kurz)

```
Browser → :3000 (Next.js Frontend, SSR) → :4000 (NestJS Backend API)
                                              ├── PostgreSQL (Metadaten, Nutzer, Versionen)
                                              ├── Redis (Cache/Sessions – vorbereitet)
                                              └── MinIO/S3 (verschlüsselte Dateien, SSE)
```

Authentifizierung läuft via **httpOnly Cookie** (`access_token`, JWT). Das Cookie wird
vom Backend beim Login gesetzt und bei jedem Request automatisch vom Browser mitgesendet.
OAuth-Logins leiten über das Backend und setzen dasselbe Cookie.