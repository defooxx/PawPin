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

## Deploy the backend to Railway

This repository contains separate frontend, backend, and iOS projects. For the
Railway backend service, open **Settings** and set:

- **Root Directory:** `/backend`
- **Config File Path:** `/backend/railway.json`

The checked-in Railway config installs backend dependencies, starts the Express
API, and checks `/health` before marking a deployment healthy.

Add a Railway PostgreSQL service and reference its `DATABASE_URL` from the
backend service. SQLite is suitable locally, but its file will not persist
across ordinary Railway deployments unless a volume is mounted.
Keep `DATABASE_SSL=false` for Railway's private PostgreSQL URL. Set it to
`true` only when using an external database provider that requires SSL.

In the PawPin service's **Variables** tab, add a reference variable:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

The exact `Postgres` name must match the name of your Railway PostgreSQL
service. Merely adding a PostgreSQL service does not always expose its
connection URL to the PawPin service.

Add these required variables to the Railway backend service:

```text
REPORTER_HASH_SECRET=<long random value>
AUTH_JWT_SECRET=<different long random value>
CLOUDINARY_CLOUD_NAME=<Cloudinary cloud name>
CLOUDINARY_API_KEY=<Cloudinary API key>
CLOUDINARY_API_SECRET=<Cloudinary API secret>
CORS_ORIGINS=https://your-frontend-domain.example
EXPOSE_AUTH_TOKENS=false
```

Do not manually set `PORT`; Railway supplies it. Optional variables and local
defaults are documented in `backend/.env.example`. After deployment, opening
`https://your-railway-domain/health` should return `{"status":"ok", ...}`.

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

Location buttons always ask the user to choose between one GPS reading and
continuous foreground sharing. Continuous sharing stops when the user taps
Stop Sharing, closes the form, or leaves the screen. PawPin does not request
background-location permission.

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
