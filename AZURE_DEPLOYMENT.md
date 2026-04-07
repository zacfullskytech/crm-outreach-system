# Azure App Service Deployment Guide

This app is ready to deploy to Azure App Service using Supabase as the database.

## Recommended Architecture

- **App runtime:** Azure App Service (Linux, Node 20 or Node 22)
- **Database:** Supabase Postgres
- **Email:** start with `EMAIL_PROVIDER=dry-run`, switch to Resend or Mailgun later

## Before You Start

Make sure the repo builds locally:

```bash
npm install
npm run build
```

## Azure Resources to Create

1. **Resource Group**
2. **App Service Plan**
3. **Web App**
   - Runtime stack: Node.js
   - OS: Linux

## Deployment Options

### Option A — GitHub deployment (recommended)

1. Push this repo to GitHub
2. In Azure App Service, open **Deployment Center**
3. Connect the GitHub repo
4. Let Azure deploy on push

### Option B — Zip deploy

Use Azure CLI or App Service deployment tools to upload the built app source.

## App Service Configuration

In Azure App Service → **Environment variables** (or Configuration), add:

### Required

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `APP_BASE_URL`
- `EMAIL_PROVIDER`
- `DEFAULT_FROM_EMAIL`
- `DEFAULT_FROM_NAME`

### Suggested initial values

```env
EMAIL_PROVIDER=dry-run
DEFAULT_FROM_EMAIL=campaigns@example.com
DEFAULT_FROM_NAME=Field Notes CRM
```

### Supabase notes

- Use the **pooler** URL for `DATABASE_URL`
- Use the **direct** database URL for `DIRECT_URL`
- URL-encode special characters in the password

## Startup Command

Set the App Service startup command to:

```bash
npm run start:azure
```

The script binds to `0.0.0.0` and uses Azure's `PORT` variable.

## Build Notes

This repo includes a `postinstall` hook that runs Prisma client generation automatically:

```bash
prisma generate
```

## Database Schema Updates

Do **not** rely on App Service startup to mutate the schema.

Run schema updates manually before or after deploy:

```bash
npm run db:push
```

If you want seed data in the Azure environment, run:

```bash
npm run db:seed
```

## Recommended First Deployment Flow

1. Create App Service
2. Configure environment variables
3. Deploy app code
4. Run `npm run db:push`
5. Optionally run `npm run db:seed`
6. Open the Azure URL and smoke test the UI

## Smoke Test Checklist

- Home page loads
- Contacts page loads
- Companies page loads
- Segments page loads
- Campaigns page loads
- Prospects page loads
- Settings page loads
- Create company/contact/prospect works
- Settings save works

## After First Deploy

Next recommended improvements:

- add authentication
- add edit/delete flows
- switch from `dry-run` to a real email provider
- add a custom domain
- add SSL-backed public branding domain
