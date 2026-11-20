# Deploy and Host Kaneo with Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/kaneo-2-project-management-postgres-s3-u?referralCode=20H68q)

Kaneo is an open-source project management tool with kanban boards, list and timeline views, time tracking, labels, comments and integrations. This template runs Kaneo 2.50 with PostgreSQL 18 and a Railway Bucket for task images and attachments, and creates your admin account before the site goes online.

## About Hosting Kaneo

Kaneo ships as one container: a Node.js API and an nginx server for the web app. The API applies its database migrations on start and keeps all data in PostgreSQL. Uploads go straight from the browser to S3-compatible storage through short-lived signed URLs; the bucket stays private and Kaneo checks access before serving a file.

On Railway the template adds a small start script. It creates the first admin from template variables while the public port is still closed, so nobody can claim a fresh instance before you. It also sets the Bucket's CORS rule for your domain, so uploads work without manual storage setup. Registration is closed by default; you add teammates yourself.

## Common Use Cases

- Plan sprints and track tasks on kanban boards for a small team
- Replace Jira, Linear or Trello with a self-hosted tool you control
- Track time per task and keep comments and screenshots next to the work
- Give agents and scripts access through Kaneo's API and built-in MCP endpoint

## Dependencies for Kaneo Hosting

- Kaneo 2.50.0 (`ghcr.io/usekaneo/kaneo`, pinned by digest)
- PostgreSQL 18 (Railway's `postgres-ssl` image)
- A Railway Bucket (S3-compatible) for images and attachments

### Deployment Dependencies

- Kaneo source and releases: https://github.com/usekaneo/kaneo
- Kaneo documentation: https://kaneo.app/docs
- Environment variables: https://kaneo.app/docs/core/installation/environment-variables
- Railway Buckets: https://docs.railway.com/guides/storage-buckets

### Implementation Details

| Service | What it does | Public |
|---|---|---|
| Kaneo | API + web app (nginx on port 5173), migrations on start | yes |
| Postgres | All Kaneo data | no |
| Bucket | Task images and attachments (private, signed URLs) | no |

**First login**

1. Open the **Kaneo** service's public URL.
2. Sign in with `KANEO_ADMIN_EMAIL` (default `admin@example.com`) and the generated `KANEO_ADMIN_PASSWORD` from the Kaneo service's Variables tab.
3. Create a workspace, then change your e-mail and password under your profile settings.

**Adding teammates.** `DISABLE_REGISTRATION=true` means strangers cannot sign up. As the instance admin you can create accounts under Admin > Users, or invite people to a workspace (invitation e-mails need SMTP; invited addresses can also register directly). Set `DISABLE_REGISTRATION=false` to open sign-up.

**E-mail (optional).** Kaneo sends invitations and password resets over SMTP only. Set the `SMTP_*` variables; Railway allows outbound SMTP on the Pro plan. `DISABLE_EMAIL_OTP_SIGN_IN=true` keeps password sign-in once SMTP is configured.

**Uploads.** The Bucket variables are filled in for you. On every start the Kaneo service sets the Bucket's CORS rule to `KANEO_CLIENT_URL`. The default size limit is 10 MiB (`S3_MAX_IMAGE_UPLOAD_BYTES`).

**Custom domain.** Add the domain to the Kaneo service, set `KANEO_CLIENT_URL` to `https://{your-domain}` and redeploy; the API URL and the Bucket CORS rule follow it.

**Scaling.** One replica is enough for most teams. To run several replicas, add a Redis service and set `REDIS_URL` on Kaneo so live updates reach every replica.

**Versions.** The image is pinned in `services/kaneo/Dockerfile` (`KANEO_IMAGE`, tag and digest). To upgrade, change the tag and digest to a newer release from the Kaneo releases page and redeploy; migrations run automatically. Back up Postgres first.

**Resources.** Measured on Railway: Kaneo about 0.31 GB RAM idle, Postgres about 0.10 GB, near-zero CPU. Fits the Trial, Hobby and Pro plans; expect roughly $4-6 per month for a small team.

This is a community template; it is not affiliated with the Kaneo project.

### Why Deploy Kaneo on Railway?

Railway runs Kaneo, its database and its file storage as one project with private networking, managed volumes and HTTPS. You get a working instance with a secure admin login in a few minutes, and you can add a custom domain, scale up or upgrade the pinned version from the dashboard.
