# CRM Outreach System

Lean CRM scaffold for contact imports, segmentation, email campaigns, and geographic prospecting.

## Stack

- Next.js
- TypeScript
- Prisma
- PostgreSQL
- Zod

## Quick Start

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Install dependencies:
   - `npm install`
3. Generate Prisma client:
   - `npm run prisma:generate`
4. Push schema to the database:
   - `npm run db:push`
5. Seed sample data:
   - `npm run db:seed`
6. Start the app:
   - `npm run dev`

## Current Scope

- Prisma schema for contacts, companies, segments, campaigns, prospects, suppressions, and imports
- API route scaffolding for core entities
- Data-backed dashboard and list pages
- CSV parsing helpers and first-pass import execution
- Prospect scoring and conversion endpoint

## Next Build Steps

- Replace placeholder list pages with create/edit flows
- Add authentication and role checks
- Add real campaign send queue and provider webhooks
- Add file-based import upload instead of raw CSV JSON payloads
- Tighten dedupe rules and bulk actions
