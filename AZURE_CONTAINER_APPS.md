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

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `APP_BASE_URL`
- `EMAIL_PROVIDER`
- `DEFAULT_FROM_EMAIL`
- `DEFAULT_FROM_NAME`

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

```bash
az acr build \
  --registry <your-acr-name> \
  --image crm-outreach-system:latest \
  .
```

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

## Runtime Notes

- The container includes the built `.next` output
- The container includes `node_modules`
- No Oryx source-build behavior is involved at runtime

## First Validation

After deployment, test:

- `/`
- `/contacts`
- `/companies`
- `/segments`
- `/campaigns`
- `/prospects`
- `/imports`
- `/settings`

## Optional Next Step

If you want CI/CD later, connect GitHub Actions to build/push the image to ACR automatically on push.
