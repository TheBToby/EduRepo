# EduRepo – Education Repository

Eine Online-Tauschbörse und ein kollaboratives Repository für **Lehrpersonen der Schweiz**.
Erstelle, teile, forke und entwickle Lehrmittel gemeinsam – einfach, sicher und auf den
**Lehrplan 21** abgestimmt.

> **Status:** MVP v0.1 – Grundgerüst und erste lauffähige Version.
> Die vollständigen Anforderungen liegen in [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md).

---

## Was kann EduRepo (MVP)?

- ✅ Registrierung (nur Lehrpersonen) mit **manuellem Freigabeprozess** durch Admin/Moderator
- ✅ Anmeldung via **E-Mail/Passwort**, **Google** und **Microsoft** (OAuth2)
- ✅ Passwort-zurücksetzen per E-Mail-Link
- ✅ Nutzerprofile mit Sprache & Theme-Präferenz
- ✅ **Lehrmittel-Repositories**: erstellen, versionieren, teilen (Sharing), forken
- ✅ **Metadaten** (Fach, Schulstufe, Sprache, Lehrplan-21-Bezug, Lizenz, Tags, …)
- ✅ **Verschlüsselter Datei-Upload/Download** (S3/MinIO, SSE)
- ✅ **Freigabemodell**: frei herunterladbar oder nur mit Eigentümer-Freigabe
- ✅ **Bewertungen & Kommentare** inkl. Eigentümer-Antworten
- ✅ **Moderation**: Melden, prüfen, entfernen
- ✅ **Rollen**: Nutzer, Moderator, Administrator
- ✅ **Konto löschen** (30 Tage reaktivierbar) inkl. Eigentumsübertragung
- ✅ **Mehrsprachig** (DE/FR/IT/EN) mit Sprachumschalter
- ✅ **Light/Dark/System** Theme
- 🚧 Chat & Communities → **Phase 2**

---

## Technologie-Stack

| Schicht | Technologie |
|---|---|
| Frontend | **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS** + `next-intl` + `next-themes` |
| Backend | **NestJS 10** (Node.js, TypeScript) + **Prisma** ORM |
| Datenbank | **PostgreSQL 16** |
| Object Storage | **MinIO** (S3-kompatibel, Entwicklung) → Produktion: Swiss S3 (z. B. Exoscale/Infomaniak) |
| Cache/Echtzeit | **Redis 7** (vorbereitet für Sessions/Rate-Limit/Chat) |
| Auth | JWT (httpOnly Cookie) + OAuth2 (Google/Microsoft) + Argon2 |
| Container | **Docker + Docker Compose** |

Siehe auch Abschnitt 7 (Technologieentscheid) in [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md).

---

## Schnellstart (Lokal / Home Server / Produktion)

> Voraussetzung: **Docker** und **Docker Compose** sind installiert und der Docker-Daemon läuft.

```bash
# 1) Konfiguration anlegen
cp .env.example .env
#    → .env öffnen und Werte anpassen (insb. JWT_SECRET, SMTP, OAuth)

# 2) Build & Start (Produktionsmodus – selbständige Images, kein Code-Mount)
docker compose up -d --build

# 3) Logs ansehen (Initialisierung: Prisma-Migration + Seed)
docker compose logs -f backend
```

### Entwicklungsmodus (Hot-Reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

> Override aktiviert dev-Stages, mountet `./backend` und `./frontend` als
> Volume und startet `nest --watch` / `next dev`.

Anschliessend erreichst du:

| URL | Bedeutung |
|---|---|
| http://localhost:3000 | **Frontend** (Next.js) |
| http://localhost:3000/de | Landing Page (Deutsch) |
| http://localhost:4000/api/docs | **API-Dokumentation** (Swagger) |
| http://localhost:9001 | **MinIO Console** (Datei-Storage) |

### Initialer Administrator

Beim ersten Start legt der Seed einen Admin an. E-Mail = `INITIAL_ADMIN_EMAIL` (Default:
`admin@edurepo.local`). Das **zufällige Initialpasswort** wird in den Backend-Logs ausgegeben:

```bash
docker compose logs backend | grep "Passwort"
```

> ⚠️ Passwort nach erstem Login sofort ändern!

---

## Verzeichnisstruktur

```
EduRepo/
├── docker-compose.yml      # Alle Services – produktionsreif (gebaute Images)
├── docker-compose.dev.yml  # Override für Entwicklung (Hot-Reload, Code-Mounts)
├── .env.example            # Vorlage für Konfiguration
├── docs/
│   ├── REQUIREMENTS.md     # Anforderungsdokument (lebend, versioniert)
│   └── RUNNING.md          # Ausführliche Docker-Anleitung & Troubleshooting
├── backend/                # NestJS API (Prisma, Auth, Repos, Files, Ratings, Moderation)
│   ├── prisma/schema.prisma
│   ├── src/
│   └── Dockerfile
└── frontend/               # Next.js App (i18n, Themes, Pages)
    ├── src/
    │   ├── app/[locale]/   # Lokalisierte Routen
    │   ├── components/
    │   ├── i18n/
    │   └── messages/       # de/fr/it/en
    └── Dockerfile
```

---

## Konfiguration (wichtige Env-Variablen)

Siehe `.env.example` für die vollständige Liste. Die wichtigsten:

| Variable | Bedeutung |
|---|---|
| `JWT_SECRET` | Geheimnis für JWTs – **stark & zufällig** setzen! |
| `DATABASE_URL` | PostgreSQL-Verbindung (intern) |
| `SMTP_*` | SMTP-Server für E-Mails (Reset, Registrierungs-Entscheid) |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth2 Credentials |
| `MICROSOFT_CLIENT_ID/SECRET` | Microsoft/Entra ID OAuth2 Credentials |
| `PUBLIC_BASE_URL` | Öffentliche Frontend-URL (für OAuth-Redirects) |
| `INITIAL_ADMIN_EMAIL` | E-Mail des initialen Admins |
| `MAX_FILE_SIZE_BYTES` | Max. Dateigrösse (Default: 100 MB) |

---

## Entwicklung

- Entwicklungsmodus starten:
  `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`
  (Backend-Änderungen werden dank Volume-Mount + `nest start --watch` hot-reloaded,
  Frontend läuft im `next dev`-Modus).
- Schema ändern? `backend/prisma/schema.prisma` anpassen → Backend-Neustart synchronisiert via
  `prisma db push` automatisch. Für reproduzierbare Migrationen später `prisma migrate dev` nutzen.
- API erkunden: http://localhost:4000/api/docs

Ausführliche Anleitung & Troubleshooting: [`docs/RUNNING.md`](docs/RUNNING.md).

---

## Sicherheit

- Passwörter als **Argon2**-Hash, **nie** im Klartext.
- **TLS/HTTPS-only** in Produktion (Reverse Proxy vorschalten).
- Dateien **verschlüsselt at-rest** via S3-SSE (AES-256).
- **RBAC** auf Ressourcen-Ebene (Repository-Mitgliedschaft, Rollen).
- Audit-Logs für administrative & Moderations-Aktionen.
- Schutz gegen User-Enumeration beim Passwort-Reset.

---

## Lizenz

MIT (vorbehaltlich späterer Anpassung).