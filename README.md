# PawPin

PawPin is a community animal-care app prototype with a mobile-style web app and a simple backend for reporting.

## Run locally

From the repo root:

```bash
npm install
npm start
```

This builds and serves the verified frontend bundle from `pawpin/`.
Open `http://localhost:5173` in your browser.

Use `npm run dev` when you specifically need Vite hot reloading.

To run the backend locally:

```bash
cd backend
npm install
npm run dev
```

The backend runs at `http://localhost:4000`.

## Foundation: authentication and profiles

The web account button supports email/password registration, JWT sessions,
profile editing, signed-in report history, shelter/vet applications, and admin
approval. The backend can use local SQLite or PostgreSQL through
`DATABASE_URL`.

Set the same Google OAuth web client ID as `GOOGLE_CLIENT_ID` in
`backend/.env` and `VITE_GOOGLE_CLIENT_ID` in `pawpin/.env.local` to enable
Google sign-in. Shelter and vet verification documents are uploaded as
authenticated Cloudinary assets and shown to admins with signed URLs.

Local admin credentials are configured only in `backend/.env` using
`ADMIN_EMAIL` and `ADMIN_PASSWORD`. Change them before any shared deployment.
Open `/admin` in the web app for the dedicated admin entry point.

Cloudinary credentials belong only in `backend/.env`. Copy
`backend/.env.example` to `backend/.env`, fill in the three Cloudinary values,
and configure `CORS_ORIGINS` for the browser origins allowed to call the API.
Never place Cloudinary credentials in `EXPO_PUBLIC_*` or `VITE_*` variables.
The precise-location report list is disabled by default; do not enable
`ENABLE_REPORT_LIST` until that endpoint is protected by authentication.

The backend perceptually fingerprints uploaded images and sends likely
duplicates to the `review` queue. Shelters can access that queue with the
private `SHELTER_API_TOKEN` and mark reports as `false`, `abusive`, or `clear`.
Each confirmed false or abusive report adds one strike; reporters are
suspended after `SUSPENSION_THRESHOLD` strikes. Set a separate,
long-random `REPORTER_HASH_SECRET` so reporter IDs are stored only as hashes.

```bash
curl http://localhost:4000/moderation/reports \
  -H "Authorization: Bearer $SHELTER_API_TOKEN"

curl -X PATCH http://localhost:4000/moderation/reports/1 \
  -H "Authorization: Bearer $SHELTER_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"abusive","reason":"Misleading report","shelterId":"shelter-1"}'
```

## Project structure

- `pawpin/` — web app frontend built with React + Vite
- `backend/` — simple Express API for report submission
- `.github/workflows/ci.yml` — CI build for frontend and backend checks

## Notes

- The backend persists reports, checks duplicate images, rate limits
  submissions, and provides a token-protected shelter moderation API.
