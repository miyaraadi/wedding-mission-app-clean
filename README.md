# Wedding Mission App

A mobile-first site for wedding "mission cards": guests scan a QR code
(`?mission=037`), see the mission text, and upload a photo/video.

**Stateless by design:** the server never treats local disk as durable
storage. Each upload is streamed to a scratch temp file only long enough to
push it to Google Drive; once Drive confirms the file was created, the temp
file is deleted and *then* the guest sees "Mission complete ❤️". If the
Drive upload fails for any reason, the temp file is deleted and the guest
sees a friendly retry message instead — nothing is silently lost or
half-saved on the server. This makes the app safe to run on free
stateless/ephemeral hosts, where the local filesystem can be wiped at any
time.

## Stack

- **Node.js + Express** (plain server, no framework overhead)
- **Vanilla HTML/CSS/JS** frontend (no build step, RTL Hebrew, vintage design)
- **Multer** for handling uploads
- **googleapis** for Google Drive (OAuth2, resumable upload)
- **express-basic-auth** to protect the admin page

## Run it locally

```bash
cd wedding-mission-app
npm install
cp .env.example .env
npm start
```

Then open:
- `http://localhost:3000/?mission=037` — guest mission page
- `http://localhost:3000/admin` — admin page (user/pass from `.env`)

**Note:** until `GOOGLE_REFRESH_TOKEN` is set (see below), uploads will
fail with the friendly retry message by design — there is no local fallback
storage. Connect Drive first, then guest uploads will work end to end.

## Environment variables (all secrets live here, never in code)

| Variable | Needed for | Notes |
|---|---|---|
| `PORT` | server | defaults to 3000 |
| `ADMIN_USER` / `ADMIN_PASSWORD` | admin page | Basic Auth login |
| `GOOGLE_CLIENT_ID` | Drive | from Google Cloud Console OAuth client |
| `GOOGLE_CLIENT_SECRET` | Drive | **do not commit** |
| `GOOGLE_REDIRECT_URI` | Drive | see below — must match Google Console exactly |
| `GOOGLE_REFRESH_TOKEN` | Drive | obtained once via `/auth/google` (see below) |
| `GOOGLE_DRIVE_FOLDER_ID` | Drive | optional — a specific Drive folder to upload into |

## Connecting Google Drive (one-time, after deployment)

Guests never touch Google login — this is done once, by you, as the
wedding Google account.

1. In Google Cloud Console, create an **OAuth Client ID** of type
   *Web application*.
2. Add this as an **Authorized redirect URI**:
   ```
   https://YOUR-DEPLOYED-DOMAIN/auth/google/callback
   ```
   (for local testing it's `http://localhost:3000/auth/google/callback`)
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`
   in your server's environment.
4. Visit `https://YOUR-DEPLOYED-DOMAIN/auth/google` in a browser, logged in
   as the wedding Google account, and approve access.
5. You'll be shown a refresh token on screen — copy it into
   `GOOGLE_REFRESH_TOKEN` and restart the server. Drive sync is now live.

Until step 5 is done, uploads still work fine — they just stay on local
disk until Drive is connected, then nothing further needs to change.

## Admin page

`/admin` shows every upload grouped by mission number, with a link to each
Drive file. It reads this list live from Google Drive (via each file's
`appProperties` metadata: mission id, mission title, original filename,
upload timestamp) — there is no local uploads database to fall out of sync.
Protected by HTTP Basic Auth (`ADMIN_USER` / `ADMIN_PASSWORD`).

## Architecture notes

- Guest credentials for Google are never involved or exposed to the
  browser — only the server holds the OAuth client secret and refresh
  token, both from environment variables.
- The one-time OAuth flow (`/auth/google`, `/auth/google/callback`) is for
  the wedding couple's own Google account, run once after deploy.
- Temp files live under the OS temp directory and are deleted right after
  a successful (or failed) Drive upload — safe even if the host wipes local
  disk between requests or restarts.
- Resumable upload for large videos is preserved: the `googleapis` client
  uses resumable upload under the hood for media bodies of this size.

## Adding/editing missions

Edit `data/missions.json` — it's a simple `"id": "text"` map.

## Deploying

Any Node host works (Render, Railway, Fly.io, a small VPS, etc.). Just:
1. Set the environment variables above in the host's dashboard.
2. Deploy.
3. Add the deployed redirect URI to Google Cloud Console.
4. Run the one-time `/auth/google` flow.
5. Generate your QR codes pointing to `https://YOUR-DOMAIN/?mission=XXX`.

### Render (free plan)

A `render.yaml` blueprint is included. On Render:
1. New → Blueprint → connect this GitHub repo. Render will read
   `render.yaml` and set up a free web service running `npm install` then
   `npm start`.
2. Render sets `PORT` for you automatically — the app already reads
   `process.env.PORT` and binds to `0.0.0.0`, so no changes are needed.
3. Fill in the env vars listed in `render.yaml` (`ADMIN_USER`,
   `ADMIN_PASSWORD`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_REDIRECT_URI`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID`)
   in the Render dashboard — never in the repo.
4. Once you have your Render URL, set
   `GOOGLE_REDIRECT_URI=https://YOUR-APP.onrender.com/auth/google/callback`,
   add the same URI in Google Cloud Console, then visit
   `https://YOUR-APP.onrender.com/auth/google` once to get
   `GOOGLE_REFRESH_TOKEN`.

Note: Render's free plan spins down on inactivity, so the first request
after idle time will be slow (cold start) — normal for this plan, not a
bug in the app.
