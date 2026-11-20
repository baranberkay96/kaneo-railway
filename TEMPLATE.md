# Kaneo 2 Project Management (Postgres, S3 uploads): composer spec

Listing name: **Kaneo 2 Project Management (Postgres, S3 uploads)**
Description (68 chars): Kanban, list and timeline project tracking with a pre-created admin.
Category: Other. Icon: `https://cdn.jsdelivr.net/gh/selfhst/icons/svg/kaneo.svg`
Repository: `baranberkay96/kaneo-railway` (this folder is the repo root).

## Services

| Service | Source | Public | Volume | Healthcheck |
|---|---|---|---|---|
| Kaneo | repo `/services/kaneo` (`FROM ghcr.io/usekaneo/kaneo:2.50.0@sha256:03ad082e…094d`, released 2026-11-19) | domain → 5173 | none | `/api/health`, 600 s |
| Postgres | `ghcr.io/railwayapp-templates/postgres-ssl:18.6@sha256:4fc833b4…c863` (= `:18`, checked 2026-11-20) | no | `/var/lib/postgresql/data` | — |
| Bucket | Railway Bucket `Bucket` | — | — | — |

Restart policy ALWAYS on Kaneo (survives Postgres starting late, STANDARD 8.5).
No Redis: upstream only needs it to relay live updates between several API replicas; one replica uses the in-memory adapter.

## Start sequence (`railway-kaneo.sh`, adapted from upstream `deploy/kaneo-entrypoint.sh`, MIT)

1. `KANEO_CLIENT_URL` not an http(s) URL → `https://$RAILWAY_PUBLIC_DOMAIN` + warning; `KANEO_API_URL` derived as upstream does.
2. `AUTH_SECRET` shorter than 32 chars (upstream exits) → its SHA-256 hex + warning; empty → random + warning.
3. `railway-kaneo.mjs bucket-cors`: `PutBucketCors` (GET/PUT/HEAD from `KANEO_CLIENT_URL` + `CORS_ORIGINS`, `ETag` exposed) with the AWS SDK already in the image; 5 retries, never fatal.
4. Upstream runtime storage + `env.sh`, API started, wait for `/api/health` on 127.0.0.1:1337.
5. `railway-kaneo.mjs admin`: if `/api/instance/status` says no users, sign up `KANEO_ADMIN_EMAIL`/`KANEO_ADMIN_PASSWORD` on 127.0.0.1 (the first account becomes instance admin). Invalid e-mail → `admin@example.com`; password outside 8-128 → random password nobody knows (fail closed) + log hint. Accounts exist → skipped.
6. Only then nginx starts, so the public domain never serves an unclaimed instance.

## Improvements over market templates

Market (2026-11): leader "Kaneo" ≈35 active, web+api images on `:latest`, Postgres 17, `AUTH_SECRET` **empty** (sessions reset on every restart), public Postgres TCP proxy, no uploads. Others: single container on `:latest`; SeaweedFS for uploads with a public S3 domain.

- Current single-container image (2.50.0) pinned by digest instead of the old web/api pair on `:latest`.
- Stable `AUTH_SECRET` and `NOTIFICATION_SECRET_ENCRYPTION_KEY` from `secret()`.
- First admin created before the site opens; registration closed by default (upstream leaves it open until someone signs up).
- Uploads on a Railway Bucket with automatic CORS (no extra storage service, no public S3 domain).
- Postgres 18, private only (no TCP proxy).
- Odd form values never stop the start (STANDARD 8.29).

## Resources

Measured on Railway, 2026-11-20 (Kaneo 2.50.0, Postgres 18.6), idle after login, workspace, project, task and an upload:

| Service | RAM | CPU |
|---|---|---|
| Kaneo | 0.31 GB | ~0.03 vCPU after start, ~0 idle |
| Postgres | 0.10 GB | ~0 |

Estimate: ~0.4 GB ≈ $4/month + a little CPU, volume and bucket storage ≈ **$4-6/month**. Minimum plan: Trial (both services far below 1 GB). Hobby recommended for persistence beyond the trial.
Prices: RAM $10/GB-month, vCPU $20/month, volume $0.15/GB-month.

## Verification checklist

1. Kaneo and Postgres SUCCESS; `GET /api/health` 200; log shows `bucket CORS allows …` and `first admin … created`.
2. `GET /api/instance/status` → `hasUsers: true, hasAdmin: true`; stranger `POST /api/auth/sign-up/email` → 403.
3. Sign in with `KANEO_ADMIN_EMAIL`/`KANEO_ADMIN_PASSWORD` → 200; wrong password → 401.
4. Create workspace, project and task; request an image upload URL, CORS preflight from the Kaneo origin → 200 with `Access-Control-Allow-Origin`, PUT to the Bucket → 200, finalize → asset readable when signed in, 401 anonymous.
5. `GET /api/admin/system`: database, storage `ok`.
6. Fresh deploy with `AUTH_SECRET=x`, `KANEO_ADMIN_PASSWORD=abc`, `KANEO_ADMIN_EMAIL=not-an-email`, `KANEO_CLIENT_URL=nonsense` → SUCCESS with warnings, admin locked.

All six were run on 2026-11-20 and passed.

## Open questions

- Upgrading across major Kaneo versions: upstream migrates on start; test on a copy first.
- Live updates with several replicas need Redis (not included, see README).
