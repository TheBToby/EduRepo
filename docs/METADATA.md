# EduRepo – Metadaten-Empfehlungen für Lehrmittel-Repositories

Stand: 16.08.2026 · Ergänzung zu `docs/REQUIREMENTS.md`

Dieses Dokument beschreibt das Metadaten-Modell der Lehrmittel-Repositories und
bietet Empfehlungen, wie Lehrpersonen ihre Materialien verschlagworten – für
bessere Auffindbarkeit, Wiederverwendbarkeit und Kooperation (GitHub-ähnliches
Modell: Master-Repository mit Sub-Repositories, Versionen, Issues, Pull
Requests).

## Übersicht der Metadatenfelder

| Feld | Typ | Pflicht | Empfehlung |
|---|---|---|---|
| `title` | mehrsprachig (JSON: `{de, fr, it, en}`) | ✅ | Kurz und aussagekräftig; Fach + Thema + Stufe, z. B. „Bruchrechnen verstehen – Klasse 5“. |
| `description` | mehrsprachig (JSON) | ✅ | 2–4 Sätze: Was ist enthalten, wie einsetzbar? |
| `subjectId` | Katalog (Subject) | empfohlen | Aus dem Fächerkatalog (Mathematik, Deutsch, …) statt Freitext – wird von Moderatoren gepflegt. |
| `schoolLevel` | Enum | empfohlen | `KINDERGARTEN`, `PRIMARY`, `LOWER_SECONDARY`, `UPPER_SECONDARY`, `TERTIARY` – eine Hauptstufe pro Material. |
| `contentLanguage` | Enum | ✅ (Default DE) | `DE`, `FR`, `IT`, `RM`, `EN`, `OTHER` – Sprache des Materials (nicht der Benutzeroberfläche). |
| `materialType` | Enum | empfohlen | `worksheet`, `presentation`, `quiz`, `lessonPlan`, `reading`, `video`, `interactive`, `assessment`, `other`. |
| `educationSector` | Enum | optional | `GENERAL` (allgemeinbildend) oder `VOCATIONAL` (Berufsbildung). |
| `license` | Enum-artig | empfohlen | `CC-BY-SA`, `CC-BY`, `CC-BY-NC-SA`, `CC0`, `PD`, `internal` – klar stellen, ob Kollegen das Material weiterbearbeiten dürfen. |
| `curriculum21` | Freitext | empfohlen (CH) | Lehrplan-21-Bezug: Zyklus + Kompetenzbereich, z. B. „Zyklus 2, MA.2 Grösse, Mess und Funktionen“. |
| `learningGoals` | Freitext | empfohlen | Konkrete, beobachtbare Lernziele (1–5 Bullet-Punkte). |
| `targetGroup` | Freitext | optional | z. B. „5. Klasse Primarschule, Niveaugruppe B“. |
| `timeRequired` | Freitext | optional | Realistischer Aufwand, z. B. „2 Lektionen à 45 Min“. |
| `difficulty` | Enum | optional | `beginner`, `intermediate`, `advanced`. |
| `methodology` | Freitext | optional | Methodisch-didaktischer Ansatz (z. B. „Peer-Teaching mit Stationenbetrieb“). |
| `prerequisites` | Freitext | optional | Was Schüler:innen oder Lehrpersonen vorher können/bereitstellen müssen. |
| `tags` | Katalog (Tag) | empfohlen | Feinere Verschlagwortung („Differenzierung“, „Digital“, „Inklusion“) – frei wählbar aus dem Tag-Katalog. |
| `parentId` | Referenz | optional | Master-Repository, dem dieses Material untergeordnet ist (Hierarchie). |

## Empfehlungen zur Anwendung

### 1. Hierarchie: Master-Repositories und Sub-Repositories
- **Master-Repository** = thematische Klammer (z. B. „Jahrsthema Mittelalter – 7.
  Klasse“). Enthält selbst kaum Dateien, sondern bündelt Sub-Repositories.
- **Sub-Repository** = einzelnes, einsetzbares Material (z. B. „Einstiegslektion
  Mittelalter“, „Quiz Feudalsystem“) mit eigener Versionierung, eigenen Issues
  und eigenen Mitwirkenden.
- Die Hierarchie ist bewusst auf **eine Ebene** begrenzt (Master → Sub), um sie
  übersichtlich zu halten.
- Beiträge aus Sub-Repositories werden per **Pull Request** in den Master
  gemergt (übernimmt die aktuelle Version der Quelle als neue Version im Ziel).

### 2. Versionierung
- Jede inhaltliche Änderung = neue **Version** mit **Änderungsnotiz**
  (changeNote), z. B. „Fehler auf S. 3 korrigiert“.
- Dateien gehören immer zu einer konkreten Version – ältere Versionen bleiben
  abrufbar (Rückgriff auf den Stand vom letzten Schuljahr).
- Forks kennzeichnen die Herkunft (`isFork`, `forkedFromId`).

### 3. Zusammenarbeit
- **Issues** = Aufgaben, Fehlermeldungen, Ideen (nur Mitglieder). Mit
  Kommentaren für Gespräche; Schliessen/Erneutöffnen durch Autor oder Owner.
- **Pull Requests** = Änderungsvorschlag von einem Sub-Repo in den Master;
  Merge nur durch Eigentümer/Ziel-Mitglieder.
- **Mitglieder** = Mitwirkende (OWNER/COLLABORATOR); bei `APPROVAL_REQUIRED`
  erteilt der Owner die Download-Freigabe.
- **Sterne** = schnelles Merken/Reputations-Signal; Sortierung nach Sternen
  verfügbar (`sort=stars`).

### 4. Gute Praxis für Metadaten
1. **Fach und Stufe immer setzen** – die wichtigsten Filter in der Suche.
2. **Materialtyp wählen** – hilft Kollegen, passende Formate zu finden.
3. **Lizenz angeben** – standardmässig `CC-BY-SA` für offene Weiterentwicklung
   oder `internal`, wenn das Material nur im Kollegium kursieren soll.
4. **Lehrplan-21-Bezug so präzise wie möglich** – Zyklus + Kompetenzbereich.
5. **Titel-Konvention**: `Thema – Stufe/Zielgruppe` für Konsistenz in Listen.
6. **Tags sparsam, aber treffend** (3–6 Stück).

## Offene Erweiterungsideen (nicht implementiert)
- Metadaten-Completion-Score („Profil-Vollständigkeit“) auf Karten anzeigen.
- MARC/LOM-Export für den Anschluss an Schulbibliotheken.
- Automatische Fachvorschläge aus Titel/Beschreibung (KI).
- Verschachtelungstiefe > 1 (Baum statt flache Hierarchie).