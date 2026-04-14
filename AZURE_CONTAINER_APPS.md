# Azure Container Apps Deployment Guide

This app is a better fit for Azure container-based deployment than Azure App Service source deployment.

## Recommended Architecture

- **App runtime:** Azure Container Apps
- **Image registry:** Azure Container Registry (ACR)
- **Database:** Supabase Postgres
- **Email:** start with `EMAIL_PROVIDER=dry-run`

## Why Container Apps

This avoids Azure App Service's Oryx/source-deploy runtime behavior and runs the app exactly as packaged.

## Files Added

- `Dockerfile`
- `.dockerignore`

The container listens on port `8080` and starts with:

```bash
npm run start:azure
```

## Environment Variables Required

### Build-time required

These must be present during `docker build`.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_APP_BASE_URL`

### Runtime required

- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `APP_BASE_URL`
- `NEXT_PUBLIC_APP_BASE_URL`
- `EMAIL_PROVIDER`
- `DEFAULT_FROM_EMAIL`
- `DEFAULT_FROM_NAME`

### Optional runtime vars

- `BRAVE_API_KEY` for Prospecting Studio web discovery
- `RESEND_API_KEY` when `EMAIL_PROVIDER=resend`
- `MAILGUN_API_KEY` when `EMAIL_PROVIDER=mailgun`
- `MAILGUN_DOMAIN` when `EMAIL_PROVIDER=mailgun`
- `EMAIL_WEBHOOK_SECRET` when using `/api/email/webhook`

### Not used by this app

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

## Azure Resources Needed

1. Resource Group
2. Azure Container Registry (ACR)
3. Azure Container Apps Environment
4. Azure Container App

## Suggested Azure CLI Flow

### 1. Create ACR

```bash
az acr create \
  --resource-group crm-outreach-rg \
  --name <your-acr-name> \
  --sku Basic
```

### 2. Build and push image

Pass the public Supabase URL and app base URL at build time.

```bash
az acr build \
  --registry <your-acr-name> \
  --image crm-outreach-system:latest \
  --build-arg NEXT_PUBLIC_SUPABASE_URL='https://<your-project>.supabase.co' \
  --build-arg NEXT_PUBLIC_APP_BASE_URL='https://<container-app-fqdn>' \
  https://github.com/<owner>/<repo>.git#main
```

The browser anon key is now served from runtime config instead of being required as a build arg.

### 3. Create Container Apps environment

```bash
az containerapp env create \
  --name crm-outreach-env \
  --resource-group crm-outreach-rg \
  --location eastus
```

### 4. Create the container app

```bash
az containerapp create \
  --name crm-outreach-app \
  --resource-group crm-outreach-rg \
  --environment crm-outreach-env \
  --image <your-acr-name>.azurecr.io/crm-outreach-system:latest \
  --target-port 8080 \
  --ingress external \
  --registry-server <your-acr-name>.azurecr.io \
  --query properties.configuration.ingress.fqdn
```

### 5. Set secrets/env vars

Use Azure Portal or CLI to set app secrets and environment variables.

Recommended runtime set:

```env
DATABASE_URL=postgresql://<pooler-user>:<encoded-password>@<pooler-host>:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://<direct-user>:<encoded-password>@<direct-host>:5432/postgres
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
APP_BASE_URL=https://<container-app-fqdn>
NEXT_PUBLIC_APP_BASE_URL=https://<container-app-fqdn>
EMAIL_PROVIDER=dry-run
BRAVE_API_KEY=<your-brave-search-api-key>
DEFAULT_FROM_EMAIL=campaigns@example.com
DEFAULT_FROM_NAME=Field Notes CRM
```

Notes:

- `DATABASE_URL` should use the Supabase pooler.
- `DIRECT_URL` should use the direct Postgres host on port `5432`.
- Do not leave spaces after `=` when setting values in Azure.
- If the app URL changes, rebuild the image with the new `NEXT_PUBLIC_APP_BASE_URL` and update the runtime `APP_BASE_URL` to match.

## Runtime Notes

- The container includes the built `.next` output
- The container includes `node_modules`
- No Oryx source-build behavior is involved at runtime
- A healthy revision does not prove the login page will work; missing build-time `NEXT_PUBLIC_*` values only show up in the browser at request time

## First Validation

After deployment, test in this order:

- `/login`
- create an account / sign in
- `/contacts`
- `/companies`
- `/segments`
- `/campaigns`
- `/prospects`
- `/imports`
- `/settings`

If `/login` briefly renders and then fails, check the browser console first. In current builds, server auth depends on `SUPABASE_URL` and `SUPABASE_ANON_KEY`, while browser auth depends on runtime config plus `NEXT_PUBLIC_SUPABASE_URL`.

## Optional Next Step

If you want CI/CD later, connect GitHub Actions to build/push the image to ACR automatically on push.
