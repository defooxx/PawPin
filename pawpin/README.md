# PawPin

PawPin is a community animal-care app prototype.

## Run locally

```bash
npm install
npm run dev
```

The current version is a React web prototype designed to look like a mobile
app. It can later be converted into a native iOS and Android app.

## Frontend structure

- `src/App.jsx` — active-screen state and toast coordination
- `src/components/AppShell.jsx` — shared header, content area, toast, and navigation
- `src/screens/` — one component per product area
- `src/services/api.js` — backend report and image-upload requests
- `src/services/location.js` — browser geolocation access
- `src/data.js` — prototype data and shared constants
- `src/styles.js` — global visual system injected by the app shell
