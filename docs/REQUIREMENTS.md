# EduRepo (Education Repository) — Anforderungsdokument

> **Status:** v0.2 (Entscheidungen eingearbeitet)  
> **Datum:** 2026-08-12  
> **Verfasser:** Cline (in Absprache mit Auftraggeber)  
> **Sprache des Dokuments:** Deutsch (Plattform mehrsprachig)  
> **Änderungen:** siehe [Änderungshistorie](#11-änderungshistorie)

Dieses Dokument ist die **zentrale, lebende Quelle** für alle Anforderungen an EduRepo. Initial erstellte Anforderungen sowie laufend ergänzte (auch neue, über Cline beauftragte) Anforderungen werden hier dokumentiert, versioniert und nachverfolgt. Jede Anforderung hat eine eindeutige ID (z. B. `FA-AUTH-001`) und eine Priorisierung nach **MoSCoW**:

- **M** = Must have (für erste Version / MVP)
- **S** = Should have (kurz nach MVP)
- **C** = Could have (spätere Phase)
- **W** = Won't have (bewusst nicht, zumindest vorerst)

---

## 1. Einleitung

### 1.1 Zweck
EduRepo ist eine Online-Tauschbörse und ein kollaboratives Repository für **Lehrpersonen der Schweiz**. Sie ermöglicht das Hochladen, Teilen, Weiterentwickeln, Forken, Bewerten und Kommentieren von selbst erarbeiteten Lehrmitteln. Die Plattform orientiert sich konzeptionell an Funktionen eines Git-Repositorys, übersetzt in eine für Lehrpersonen verständliche und auf ihre Bedürfnisse zugeschnittene Benutzeroberfläche.

### 1.2 Ziele
- **Austausch** selbst erstellter Lehrmittel zwischen Lehrpersonen.
- **Ko-Kreation & Weiterentwicklung** von Lehrmitteln (Versionsverlauf, Forks, Sharing).
- **Qualitätssicherung** durch Bewertungen, Kommentare und Moderation.
- **Passgenauigkeit zum Schweizer Schulsystem**, insbesondere **Lehrplan 21**.
- **Exklusivität**: Nutzung nur für aktive und ehemalige Lehrpersonen.

### 1.3 Zielgruppe
Ausschliesslich **aktive und ehemalige Lehrpersonen** in der Schweiz. Nicht angemeldete Personen haben ausschliesslich Zugriff auf eine öffentliche Einstiegsseite mit Basisinformationen (siehe `FA-PUB-001`).

### 1.4 Glossar
| Begriff | Bedeutung |
|---|---|
| Lehrmittel | Eine selbst erstellte, in EduRepo verwaltete Unterrichtseinheit/Datei/Dateisammlung (Repository). |
| Repository | Ein Lehrmittel inkl. Metadaten, Versionen, Freigaben und Diskussion. |
| Lehrplan 21 | Gesamtschweizerischer Lehrplan für die Volksschule (DE/FR/IT). |
| Fork | Eigene Kopie eines Lehrmittels, die unabhängig weiterentwickelt werden kann. |
| Sharing | Gemeinsame Eigentümerschaft / Kollaboration an einem Lehrmittel. |
| Moderatoren / Administratoren | Siehe [Abschnitt 3](#3-nutzerrollen--berechtigungen). |

---

## 2. Vision & Abgrenzung

### 2.1 Vision
Lehrpersonen in der Schweiz finden, teilen und entwickeln gemeinsam hochwertige, praxistaugliche Lehrmittel – einfach, sicher und in ihrer Sprache, mit Bezug zum Schweizer Lehrplan.

### 2.2 In Scope (erste Version)
- Authentifizierung & Freigabeprozess (nur Lehrpersonen)
- Profile & Nutzerverwaltung (inkl. Rollen)
- Repositories erstellen, verwalten, versionieren, teilen, forken
- Upload gängiger Datei- & Medienformate (verschlüsselt)
- Metadaten-Pflege, Suche, Filter
- Bewertungen & Kommentare inkl. Moderation
- Chat / private Nachrichten (1:1)
- Öffentliche Einstiegsseite
- Mehrsprachigkeit (DE/FR/IT/RM/EN), Dark/Light Mode

### 2.3 Out of Scope (zumindest initial)
- Mobile Native Apps (erst Web)
- Bezahlmodelle / Marktplatz mit Transaktionen
- Vollständiger Git-Server (echte Git-Kommandos). EduRepo implementiert eine **vereinfachte, auf Lehrmittel zugeschnittene** Variante (Versionen, Forks, Sharing) – siehe `FA-REPO-010`.
- Integration mit externen LMS (Moodle, Teams Classes etc.) → spätere Phase

---

## 3. Nutzerrollen & Berechtigungen

| Rolle | Kernberechtigungen |
|---|---|
| **Gast** (nicht angemeldet) | Nur öffentliche Einstiegsseite (`FA-PUB-001`). Keine Funktionalität. |
| **Nutzer** (Lehrperson) | Eigenes Profil, eigene Repositories verwalten, Repositories teilen/forken (i. d. R. freigegebene), Upload/Download gemäss Freigabe, Bewertungen/Kommentare, Chat. |
| **Moderator** | Alle Nutzer-Berechtigungen + Sammlungen, Kategorien & Tags verwalten, **Communities** erstellen/verwalten, Mitglieder verwalten, Nachrichten an Community senden, **Nutzerkonten sperren** (nicht löschen), gemeldete Inhalte prüfen/entfernen, neue Registrierungen bestätigen. |
| **Administrator** | Vollzugriff: alles Moderatoren-Recht + **Nutzerkonten sperren und löschen**, Rollen vergeben, System-/Konfigurations-Einstellungen, Vollzugriff auf alle Repositories. |

Siehe detaillierte Anforderungen: [FA-ROLE](#611-rollen--berechtigungen-fa-role).

---

## 4. Funktionale Anforderungen — Übersicht nach Modulen

| Modul | IDs | Beschreibung |
|---|---|---|
| Öffentliche Einstiegsseite | `FA-PUB-*` | Landing Page für Gäste. |
| Authentifizierung & Konto | `FA-AUTH-*` | Login, Registrierung, Passwort, OAuth, Kontolöschung. |
| Profil | `FA-PROF-*` | Profilverwaltung. |
| Nutzer-/Rollenverwaltung | `FA-ROLE-*` | Admin-/Mod-Funktionen, Freigabeprozess. |
| Repositories (Lehrmittel) | `FA-REPO-*` | Erstellen, Versionieren, Forken, Sharing. |
| Dateien & Upload | `FA-FILE-*` | Upload, Formate, Verschlüsselung, Download. |
| Metadaten | `FA-META-*` | Metadatenmodell, Kategorien, Tags. |
| Suche & Entdeckung | `FA-SEARCH-*` | Suche, Filter, Sortierung. |
| Bewertungen & Kommentare | `FA-RATE-*` | Bewertung, Kommentare, Antworten, Meldung. |
| Chat & Nachrichten | `FA-CHAT-*` | 1:1 Chat, private Nachrichten. |
| Communities | `FA-COMM-*` | Communitys durch Moderatoren. |
| Moderation | `FA-MOD-*` | Meldungen prüfen, Inhalte entfernen. |
| Benachrichtigungen | `FA-NOTIF-*` | In-App-/Mail-Benachrichtigungen. |
| Internationalisierung & UI | `FA-I18N-*` | Sprachen, Dark/Light, Hilfetexte. |

---

## 5. Funktionale Anforderungen — Detail

### 5.1 Öffentliche Einstiegsseite (FA-PUB)
- **FA-PUB-001 [M]:** Gäste sehen eine öffentliche Landing Page mit Erklärung von Zweck, Zielgruppe und Funktionsweise. **Keine** Lehrmittel-Einsicht, kein Download.
- **FA-PUB-002 [M]:** Von der Landing Page aus sind **Login** und **Registrierung** erreichbar.
- **FA-PUB-003 [M]:** Sprachumschalter ist auf der Landing Page sichtbar.
- **FA-PUB-004 [S]:** Impressionen / Statistiken (z. B. Anzahl Lehrmittel) als Vertrauenssignal – **nur aggregiert, ohne sensible Daten**.

### 5.2 Authentifizierung & Konto (FA-AUTH)
- **FA-AUTH-001 [M]:** Jeder Nutzer muss angemeldet sein, um Lehrmittel hoch-/herunterzuladen oder sonstige Funktionalität zu nutzen.
- **FA-AUTH-002 [M]:** Anmeldung via **E-Mail + Passwort**.
- **FA-AUTH-003 [M]:** Anmeldung via **Google-Konto** (OAuth2).
- **FA-AUTH-004 [M]:** Anmeldung via **Microsoft-Konto** (OAuth2).
- **FA-AUTH-005 [M]:** **Passwort vergessen**-Funktion mit sicherem Reset-Link per E-Mail.
- **FA-AUTH-006 [M]:** Registrierung **nur** für aktive/former Lehrpersonen; neue Registrierungen **müssen** durch Administrator oder Moderator bestätigt werden (Freigabeprozess), bevor das Konto aktiv wird (`FA-AUTH-009`). **Verifikation in v1: rein manuelle Prüfung** durch Admin/Moderator (kein automatischer Domain-/Nachweis-Check). Siehe Entscheidung D-7.
- **FA-AUTH-007 [M]:** Nutzer können ihr Konto löschen. Das Konto bleibt **30 Tage** reaktivierbar (Soft-Delete), danach **endgültige Löschung**.
- **FA-AUTH-008 [M]:** Bei der Kontolöschung kann der Nutzer seine **Lehrmittel an einen anderen Nutzer übergeben** (neuer Eigentümer).
- **FA-AUTH-009 [M]:** Kontostatus: *pending* (Wartet auf Freigabe), *active*, *soft-deleted* (30 Tage), *locked* (durch Admin/Mod), *deactivated* (durch Admin/Mod).
- **FA-AUTH-010 [S]:** Zwei-Faktor-Authentifizierung (2FA, TOTP) optional durch Nutzer aktivierbar.
- **FA-AUTH-011 [M]:** Session-Management mit sicheren, http-only Cookies; automatischer Logout bei Inaktivität.
- **FA-AUTH-012 [M]:** Account-Verknüpfung: Passwort- und OAuth-Logins können demselben Konto zugeordnet werden.

### 5.3 Profil (FA-PROF)
- **FA-PROF-001 [M]:** Jeder Nutzer hat ein Profil und kann es bearbeiten.
- **FA-PROF-002 [M]:** Profil enthält mind.: Anzeigename, E-Mail (verifiziert), Avatar, **bevorzugte Sprache** (für UI), **Schulstufe/Fachbereich** (Freitext/Auswahl).
- **FA-PROF-003 [M]:** Profil-Sichtbarkeit ist steuerbar (z. B. öffentlich sichtbare Lehrmittel-Übersicht, aber keine sensiblen Daten).
- **FA-PROF-004 [M]:** Präferenz für **Theme** (Light/Dark/System) im Profil speicherbar.
- **FA-PROF-005 [S]:** Kurz-Bio und "Themen-Schwerpunkte".

### 5.4 Nutzer-/Rollenverwaltung (FA-ROLE)
- **FA-ROLE-001 [M]:** Drei Kategorien: **Administrator, Moderator, Nutzer** (Berechtigungen siehe [Abschnitt 3](#3-nutzerrollen--berechtigungen)).
- **FA-ROLE-002 [M]:** Administratoren können Nutzerkonten **sperren und löschen**.
- **FA-ROLE-003 [M]:** Moderatoren können Nutzerkonten **sperren** (nicht löschen).
- **FA-ROLE-004 [M]:** Administratoren und Moderatoren können Konten **deaktivieren** (ohne sofortige Löschung).
- **FA-ROLE-005 [M]:** Administratoren können **Rollen** vergeben/entziehen.
- **FA-ROLE-006 [M]:** Freigabeprozess: Liste ausstehender Registrierungen; Ablehnen (mit Begründung) oder Bestätigen.
- **FA-ROLE-007 [M]:** Audit-Log für administrative Aktionen (Sperren, Löschen, Rollenänderung, Moderationseingriffe).

### 5.5 Repositories / Lehrmittel (FA-REPO)
- **FA-REPO-001 [M]:** Nutzer erstellen Repositories (Lehrmittel) mit Titel und Metadaten.
- **FA-REPO-002 [M]:** Metadaten bei Erstellung und jederzeit bearbeitbar (siehe `FA-META`).
- **FA-REPO-003 [M]:** Lehrmittel aktualisieren; **vorangegangene Versionen bleiben sichtbar und herunterladbar**.
- **FA-REPO-004 [M]:** Versionsgeschichte mit Metadaten pro Version (Datum, Autor, Änderungsnotiz).
- **FA-REPO-005 [M]:** **Freigabemodell**: pro Lehrmittel wählbar – (a) **frei herunterladbar** durch alle oder (b) **nur nach Bestätigung** durch den Eigentümer (`FA-REPO-006`).
- **FA-REPO-006 [M]:** Eigentümer kann gezielt **Nutzer freigeben**; nur diese können herunterladen (bei Modell b).
- **FA-REPO-007 [M]:** **Sharing / Co-Eigentümerschaft**: mehrere Nutzer als Eigentümer eines Lehrmittels.
- **FA-REPO-008 [M]:** **Fork**: Kopie eines Lehrmittels, die unabhängig weiterentwickelt wird; Quellverweis bleibt erhalten.
- **FA-REPO-009 [S]:** **Merge-/Pull-Request-artiger** Vorschlag: Fork-Inhaber kann Änderungen an Original vorschlagen; Eigentümer kann annehmen/ablehnen.
- **FA-REPO-010 [M]:** Das "Repository"-Verhalten ist eine **vereinfachte, auf Lehrmittel zugeschnittene** Logik (Versionen, Forks, Sharing) – **kein** vollwertiger Git-Server. *(Offen: Tiefe der Diff-Darstellung – siehe [Abschnitt 10](#10-offene-fragen).)*
- **FA-REPO-011 [S]:** Sammlungen / Collections (Gruppierung mehrerer Lehrmittel).

### 5.6 Dateien & Upload (FA-FILE)
- **FA-FILE-001 [M]:** Upload gängiger **Dokumentformate** (PDF, DOCX, PPTX, XLSX, ODT, MD, TXT, HTML).
- **FA-FILE-002 [M]:** Upload gängiger **Medienformate** (Bilder: PNG/JPG/SVG/GIF; Audio: MP3/OGG/WAV; Video: MP4/WebM).
- **FA-FILE-003 [M]:** Dateien werden **verschlüsselt** auf der Hosting-Plattform gespeichert (siehe `NFA-SEC`).
- **FA-FILE-004 [M]:** Zugriff/Löschung nur durch **berechtigte** Personen (Eigentümer, freigegebene Nutzer, Admins).
- **FA-FILE-005 [M]:** Download gemäss Freigabemodell (`FA-REPO-005`/`FA-REPO-006`).
- **FA-FILE-006 [S]:** Virenscan/Malware-Scan beim Upload (z. B. ClamAV).
- **FA-FILE-007 [M]:** Maximale Dateigrösse **100 MB** pro Datei (v1). Speicherkontingente pro Nutzer werden durch **Administratoren oder Moderatoren** festgelegt/angepasst (kontospezifisches Quota, Standard-Quota konfigurierbar). Siehe Entscheidung D-6.
- **FA-FILE-008 [S]:** Drag-&-Drop-Upload mit Fortschrittsanzeige; Mehrfach-Upload.

### 5.7 Metadaten (FA-META)
> Inhalt als **Freitext**, Kategorien als **Auswahl**. Vorschlag für das Metadatenmodell:

| Feld | Typ | Pflicht | Hinweis |
|---|---|---|---|
| Titel | Freitext | ja | |
| Beschreibung/Inhalt | Freitext (mehrspachig) | ja | |
| Schulfach | Auswahl | ja | Mathe, Deutsch, … (verwaltbar durch Moderatoren) |
| Schulstufe | Auswahl | ja | Kindergarten, Primarstufe, Sek I, Sek II, Tertiär |
| Sprache des Lehrmittels | Auswahl | ja | DE/FR/IT/RM/EN/Andere |
| **Lehrplan-21-Bezug** | Auswahl + Freitext | nein | Kompetenzbereich/Zyklus (verwaltbar) |
| Bildungsziel / Lernziele | Freitext | nein | |
| Zielgruppe (Alter/Klasse) | Freitext/Auswahl | nein | |
| Zeitbedarf | Auswahl/Freitext | nein | z. B. "1 Lektion", "Reihe" |
| Materialtyp | Auswahl | nein | Arbeitsblatt, Präsentation, Unterrichtsreihe, … |
| Schwierigkeitsgrad | Auswahl | nein | |
| **Lizenz** | Auswahl | ja | CC-BY, CC-BY-SA, CC0, "Eigenbedarf", … |
| Tags | Freitext (Multi) | nein | frei vergebbar |
| Methodik/Didaktik | Freitext | nein | |
| Voraussetzungen | Freitext | nein | |
| Bildungsbereich | Auswahl | nein | Allgemeinbildend/Berufsbildend |
| Autoren/Eigentümer + Co-Autoren | System | automatisch | |
| Sichtbarkeit/Freigabe | System | automatisch | |
| Erstellt/Geändert/Version | System | automatisch | |

- **FA-META-001 [M]:** Metadaten wie oben; Kategorien/Schulfächer/Lehrplan-Bezug durch **Moderatoren** zentral verwaltbar (Katalog).
- **FA-META-002 [M]:** Tags frei ergänzbar; **Moderatoren** können Tags zusammenführen/bereinigen.
- **FA-META-003 [M]:** Metadaten sind **mehrsprachig** (zumindest Titel/Beschreibung).

### 5.8 Suche & Entdeckung (FA-SEARCH)
- **FA-SEARCH-001 [M]:** Suche nach Lehrmitteln (Volltext über Titel/Beschreibung/Tags).
- **FA-SEARCH-002 [M]:** Filter nach Schulfach, Schulstufe, Sprache, Lizenz, Materialtyp, Bewertung.
- **FA-SEARCH-003 [M]:** Sortierung (Aktualität, Bewertung, Beliebtheit).
- **FA-SEARCH-004 [S]:** Facettierte Suche / gespeicherte Suchen.

### 5.9 Bewertungen & Kommentare (FA-RATE)
> Vorschlag Bewertungskategorien (1–5 Sterne je Kategorie):

- **Gesamt** (Pflicht)
- Didaktische Qualität
- Methodische Umsetzung
- Fachliche Richtigkeit
- Praktische Einsetzbarkeit
- Verständlichkeit/Klarheit
- Zeitaufwand Vorbereitung (niedrig = gut)
- Schülermotivation/Engagement

- **FA-RATE-001 [M]:** Jeder Nutzer kann heruntergeladene/freigegebene Lehrmittel **bewerten** und **kommentieren**.
- **FA-RATE-002 [M]:** Eigentümer kann Bewertungen/Kommentare **antworten**.
- **FA-RATE-003 [M]:** Missbräuchliche Bewertungen/Kommentare können an **Admin/Mod** gemeldet werden.
- **FA-RATE-004 [M]:** Moderatoren/Admins können gemeldete Inhalte prüfen und entfernen.
- **FA-RATE-005 [M]:** Es kann nur bewertet werden, wer das Lehrmittel heruntergeladen/freigegeben erhalten hat (Vermeidung von Fake-Bewertungen).
- **FA-RATE-006 [S]:** Bewertungen sind editierbar; Änderungen sichtbar.

### 5.10 Chat & private Nachrichten (FA-CHAT)
- **FA-CHAT-001 [M]:** 1:1 Chat zwischen ausgewählten Nutzern.
- **FA-CHAT-002 [M]:** Private Nachrichten (asynchron).
- **FA-CHAT-003 [S]:** Blockieren/Reporten von Nutzern.
- **FA-CHAT-004 [S]:** Gruppen-/Community-Chats (siehe `FA-COMM`).
- **FA-CHAT-005 [M]:** Chat-Inhalte werden verschlüsselt gespeichert; nur Teilnehmer haben Zugriff.

### 5.11 Communities (FA-COMM)
- **FA-COMM-001 [M]:** **Moderatoren** können Communities erstellen.
- **FA-COMM-002 [M]:** Moderatoren verwalten Mitglieder.
- **FA-COMM-003 [M]:** Moderatoren können **Nachrichten an die gesamte Community** versenden.
- **FA-COMM-004 [S]:** Community-Sammel-Feed / geteilte Sammlungen.

### 5.12 Moderation (FA-MOD)
- **FA-MOD-001 [M]:** Zentrale Meldungs-Queue für Admins/Moderatoren.
- **FA-MOD-002 [M]:** Aktionen: Inhalt entfernen, Bewertung/Kommentar löschen, Nutzer verwarnen/sperren.
- **FA-MOD-003 [M]:** Begründung & Audit-Log pro Aktion.

### 5.13 Benachrichtigungen (FA-NOTIF)
- **FA-NOTIF-001 [M]:** In-App-Benachrichtigungen (Freigabeanfrage, neue Bewertung, Nachricht, Freigabe-Status der Registrierung).
- **FA-NOTIF-002 [M]:** E-Mail-Benachrichtigungen (konfigurierbar).
- **FA-NOTIF-003 [S]:** Wöchentlicher Digest optional.

### 5.14 Internationalisierung & UI (FA-I18N)
- **FA-I18N-001 [M]:** **UI-Sprachen in v1: Deutsch, Französisch, Italienisch, Englisch** (Rätoromanisch als UI-Sprache erst später). **Inhaltssprache der Lehrmittel** unterstützt hingegen DE/FR/IT/**RM**/EN/Andere (siehe Metadaten). Siehe Entscheidung D-8.
- **FA-I18N-002 [M]:** Sprachumschalter öffentlich sichtbar; für angemeldete Nutzer im Profil gespeichert.
- **FA-I18N-003 [M]:** **Light/Dark Mode**, wählbar oder **System-Modus**.
- **FA-I18N-004 [M]:** Hilfetexte bei einzelnen Funktionen.
- **FA-I18N-005 [M]:** Modernes, intuitives, responsives UI (Mobile-tauglich).

---

## 6. Nicht-funktionale Anforderungen (NFA)

### 6.1 Performance & Skalierbarkeit (NFA-PERF)
- **NFA-PERF-001:** Bis zu **50'000 registrierte Nutzer**, **sporadische** Nutzung. Auslegung auf typische Spitzen (z. B. Schulbeginn, Semesterwechsel).
- **NFA-PERF-002:** Ladezeiten UI < 2s (P95) bei normaler Last.
- **NFA-PERF-003:** Horizontal skalierbar (stateless App-Server, externer Object Storage).

### 6.2 Sicherheit (NFA-SEC)
- **NFA-SEC-001:** **Verschlüsselung** der hochgeladenen Lehrmittel **at-rest** (z. B. AES-256 / server-side encryption des Object Storages).
- **NFA-SEC-002:** Verschlüsselung **in transit** (TLS/HTTPS-only).
- **NFA-SEC-003:** Passwörter mit starkem Hash (Argon2id/bcrypt), never plaintext.
- **NFA-SEC-004:** Schutz gegen OWASP Top 10 (XSS, CSRF, SQLi, IDOR, …).
- **NFA-SEC-005:** Data Privacy nach Schweizer **DSG/FADP** und (soweit anwendbar) DSGVO: Datenminimierung, Auskunft/Löschung, Einwilligung.
- **NFA-SEC-006:** Zugriffskontrolle rollenbasiert (RBAC); Autorisierung auf Ressourcen-Ebene.
- **NFA-SEC-007:** Rate Limiting & Brute-Force-Schutz beim Login.
- **NFA-SEC-008:** Audit-Logs für sicherheitsrelevante Aktionen.

### 6.3 Verfügbarkeit (NFA-AVAIL)
- **NFA-AVAIL-001:** Einfaches Hosting (siehe [Technologievorschlag](#7-technologievorschlag)); Backups für DB und Object Storage.

### 6.4 Wartbarkeit (NFA-MAINT)
- **NFA-MAINT-001:** Klare Trennung Frontend/Backend; versioniertes Requirements-Doc (dieses Dokument).
- **NFA-MAINT-002:** Testumgebung via **Docker Compose** (`docker-compose.yml` + Anleitung).

---

## 7. Technologieentscheid (finalisiert)

> **Entschieden (v0.2):** Der Empfohlene Stack (Vorschlag A — "TypeScript-Vollstack") wird umgesetzt. Hosting der MVP-Version erfolgt auf dem **Home Server** des Auftraggebers via **Docker Compose**. Hosting für Produktion wird zu einem späteren Zeitpunkt geklärt. Siehe Entscheidungen D-1, D-2, D-3.

### 7.1 Empfohlener Stack (Vorschlag A — "TypeScript-Vollstack")

| Schicht | Technologie | Begründung |
|---|---|---|
| **Frontend** | **Next.js (React) + TypeScript + Tailwind CSS** | SSR/SSG, hervorragende i18n-Unterstützung, performant, grosse Community; UI-Komponenten (z. B. shadcn/ui) für schnelles, modernes UI inkl. Dark Mode. |
| **Backend** | **NestJS (Node.js, TypeScript)** | Modular, gut für komplexe Domäne (Auth, Repos, Moderation, Chat), WebSocket-Support für Echtzeit-Chat. |
| **API** | REST (primär) + WebSocket (Chat) | Einfach, breit verstanden. GraphQL optional später. |
| **Datenbank** | **PostgreSQL** | Robust, relationale Integrität, Volltextsuche, JSON-Spalten für flexible Metadaten. |
| **Object Storage** | **S3-kompatibel** (Test: **MinIO**; Prod: Swiss S3 wie Exoscale/Infomaniak) | Skalierbar, serverseitig verschlüsselbar, günstiger Datei-Storage. |
| **Cache / Echtzeit** | **Redis** | Sessions, Rate Limiting, Chat-Pub/Sub, Caching. |
| **Auth** | OAuth2 (Google, Microsoft) + E-Mail/Passwort; **NextAuth/Auth.js** oder eigenes JWT-Modul | Mehrere Provider, sicheres Session-Handling. |
| **Suche** | PostgreSQL Full-Text (Start) → später **Meilisearch/Typesense** | Start einfach; upgradefähig bei Bedarf. |
| **Container** | **Docker + Docker Compose** | Wie in Architektur gefordert. |
| **CI/CD** | GitHub Actions | Repo bereits auf GitHub. |

### 7.2 Alternative (Vorschlag B — "Python-Vollstack")
Falls Python-Kompetenz im Team vorhanden: **Django + Django REST Framework** (Backend), Next.js (Frontend), PostgreSQL, MinIO/S3. Vorteil: eingebautes Admin, ORM, Auth; viele Libraries für Medienverarbeitung.

### 7.3 Hosting-Empfehlung (Produktion)
Anforderung: **einfach hostbar**, sporadisch 50k Nutzer, Schweizer Kontext (**Data Residency Schweiz** empfohlen).

- **Option 1 (empfohlen, einfach):** Managed Container/PaaS bei Schweizer Provider (**Exoscale**, **Infomaniak**, **Swisscom Digital**). S3-Object-Storage dort für verschlüsselte Lehrmittel.
- **Option 2 (mehr Kontrolle):** Eigene VM + Docker/Docker Swarm auf Schweizer Host; Managed PostgreSQL.
- **Option 3 (kostenbewusst, einfacher Einstieg):** Railway/Render/Fly.io – **Achtung:** Datenhaltung evtl. ausserhalb CH; nur bei ausreichender Data-Residency-Klärung.

### 7.4 Warum kein echter Git-Server?
Binäre Lehrmittel (PDF, DOCX, Bilder, Video) sind für Git ungeeignet. Stattdessen: **anwendungsspezifische Versionslogik** (Versionen = eigenständige, verschlüsselte Blobs + Metadaten + Änderungsnotiz), **Forks** = Kopie mit Quellverweis, **Sharing** = RBAC auf Ressource. Die UX nutzt die bekannten Git-Konzepte (Repo, Fork, Versionsverlauf, Pull-Request-ähnliche Vorschläge), ohne die Git-Komplexität.

---

## 8. Architektur (Skizze)

```
                ┌────────────────────────────┐
   Browser ──▶  │  Next.js Frontend (SSR)    │
                └─────────────┬──────────────┘
                              │ REST/WebSocket
                ┌─────────────▼──────────────┐
                │   NestJS Backend (API)      │
                └──┬──────────┬───────────┬───┘
                   │          │           │
        ┌──────────▼─┐  ┌─────▼────┐  ┌───▼──────────┐
        │ PostgreSQL │  │  Redis   │  │ Object Store │
        │ (Metadaten,│  │ (Session,│  │ (S3/MinIO,   │
        │  Versionen,│  │  Cache,  │  │  verschlüsselt)│
        │  Nutzer)   │  │  Chat)   │  │              │
        └────────────┘  └──────────┘  └──────────────┘
```

- **Auth-Provider:** Google, Microsoft (OAuth2) + E-Mail/Passwort.
- **E-Mail:** Transactional Mail (z. B. Resend/Postmark/Swiss SMTP) für Reset/Mails.

---

## 9. Entscheidungen (Klärung vom 2026-08-12)

> Die initialen offenen Fragen wurden geklärt. Neue offene Fragen werden in [Abschnitt 10](#10-offene-fragen) laufend ergänzt.

| ID | Thema | Entscheidung |
|---|---|---|
| **D-1** | Hosting (MVP) | MVP läuft auf dem **Home Server** des Auftraggebers via Docker Compose. |
| **D-2** | Hosting (Prod) | Produktives Hosting wird **zu einem späteren Zeitpunkt** geklärt (noch offen). |
| **D-3** | Technologie-Stack | **Vorschlag A** (Next.js + NestJS + PostgreSQL + S3/MinIO + Redis) wird umgesetzt. |
| **D-4** | MVP-Umfang | Vorschlag bestätigt: Auth+Freigabe, Profile, Repos erstellen/versionieren/teilen/forken, verschlüsselter Upload/Download, Metadaten, Suche, Bewertungen/Kommentare, i18n (DE/FR/IT/EN), Dark/Light. **Chat & Communities → Phase 2.** |
| **D-5** | Versions-/Fork-Detailtiefe | **Vereinfachter** Versionsverlauf für v1 (Blobs + Änderungsnotiz, keine echten Datei-Diffs). |
| **D-6** | Datei-/Speicherlimits | **100 MB** max. pro Datei; **Kontingente pro Nutzer** durch Admins/Moderatoren festlegbar. |
| **D-7** | Registrierungs-Proof | v1: **rein manuelle Prüfung** durch Admin/Moderator (kein automatischer Check). |
| **D-8** | Rätoromanisch | **Kein RM in der UI in v1** (nur DE/FR/IT/EN). RM aber als **Inhaltssprache** der Lehrmittel unterstützt. |
| **D-9** | E-Mail-Versand | **SMTP-Server vorhanden**; Konfiguration über Environment-Variablen in `docker-compose`. |
| **D-10** | OAuth-Credentials | **Reale** Google- und Microsoft-Client-Credentials werden in v1 unterstützt (via Env-Vars). |

---

## 10. Offene Fragen & laufend ergänzte Anforderungen

> Diese Sektion ist die **lebende Liste** für neue/offene Fragen und nachträglich beauftragte Anforderungen. Neue Einträge werden mit Datum und Ursprung ("beauftragt via Cline") ergänzt und in der [Änderungshistorie](#11-änderungshistorie) nachgetragen.

| ID | Thema | Frage / Anforderung | Status |
|---|---|---|---|
| OQ-1 | Hosting Produktion | Konkrete Hosting-Umgebung für Produktion (Provider, Data Residency Schweiz?) | offen (später) |

> **Laufend ergänzte Anforderungen** werden als neue `FA-*`/`NFA-*`-Einträge mit Datum und Ursprung ("beauftragt via Cline") aufgenommen und in der [Änderungshistorie](#11-änderungshistorie) nachgetragen.

---

## 11. Änderungshistorie

| Version | Datum | Änderung | Ursprung |
|---|---|---|---|
| 0.1 | 2026-08-12 | Initiale Erstellung des Anforderungsdokuments aus Aufgabenstellung | Cline (initial) |
| 0.2 | 2026-08-12 | Entscheidungen D-1…D-10 eingearbeitet: Hosting (MVP=Home Server), Stack bestätigt, MVP-Umfang, vereinfachter Versionsverlauf, 100 MB Dateilimit + Quota durch Admin/Mod, manuelle Registrierungsprüfung, RM nur als Inhaltssprache, SMTP via Env-Vars, reale OAuth-Credentials. | Cline (nach Q&A) |
