# Der rote Faden – die Wortweberei

Website von Carolina J. Kitsche mit Redaktionsbereich unter `/admin`.
Netlify baut bei jedem Push auf `main` automatisch.

## Aufbau

- `public/` – die Website, wird unverändert ausgeliefert
  - `index.html`, `success.html` – die Seiten. Hier stehen die Originaltexte.
  - `cms.js` – setzt Carolinas Änderungen in die Seite ein
  - `admin.html` – Redaktionsbereich
- `netlify/functions/api.mjs` – API unter `/api/*`
- `netlify/functions/fields.mjs` – was bearbeitbar ist, mit Beschriftung und Reiter
- `netlify/functions/auth.mjs` – Passwort und Sitzungscookie

## So funktioniert die Redaktion

Bearbeitbare Stellen sind im HTML markiert (`data-cms`, `data-cms-list`,
`data-cms-block`, `data-cms-img`). Der Admin-Bereich liest die Originale direkt
aus dem HTML. Im Netlify-Speicher (Blobs, Store `content`, Key `site`) liegen nur
Carolinas Abweichungen, hochgeladene Fotos im Store `media`.

Fällt die API aus, zeigt die Seite einfach die Originaltexte aus dem HTML.

Wichtig: Ändert jemand einen Text direkt im HTML, gilt das nur, solange Carolina
genau dieses Feld nicht selbst geändert hat.

Neues Feld: im HTML markieren und in `fields.mjs` eintragen. `npm test` schlägt an,
wenn beides nicht zusammenpasst.

## Einrichtung in Netlify

| Variable | Pflicht | Zweck |
|---|---|---|
| `ADMIN_PASSWORD` | ja | Startpasswort für `/admin`. Ohne das bleibt der Bereich zu. |
| `ADMIN_SECRET` | nein | Zusätzliches Geheimnis für die Signatur der Sitzungscookies. |

Ändert Carolina das Passwort im Admin-Bereich, gilt ein Hash im Blob-Store statt
`ADMIN_PASSWORD`. Notausgang: im Store `content` den Key `auth/password` löschen.

## Lokal

    npm install
    npm test
    ADMIN_PASSWORD=… npx netlify dev --offline
