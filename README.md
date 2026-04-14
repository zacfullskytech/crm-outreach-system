# CRM Outreach System

Lean CRM for contact imports, segmentation, email campaigns, and geographic prospecting.
Targets veterinary clinics and private medical practices.

---

## Stack

- Next.js (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod validation
- Resend or Mailgun for email

---

## Quick Start

```bash
cp .env.example .env
# Set DATABASE_URL / DIRECT_URL and email provider values in .env

npm install
npm run prisma:generate
npm run db:push
npm run db:seed
npm run dev
```

## Azure Deployment

There are now two documented Azure paths:

- `AZURE_DEPLOYMENT.md` for Azure App Service
- `AZURE_CONTAINER_APPS.md` for Azure Container Apps

Recommended path from current experience:
- Azure Container Apps for the Next.js app
- Supabase Postgres for the database
- Supabase pooler URL for `DATABASE_URL`
- Supabase direct URL for `DIRECT_URL`
- build the image with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_APP_BASE_URL`
- provide `SUPABASE_URL` and `SUPABASE_ANON_KEY` at runtime for server auth

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL runtime connection string (Supabase pooler recommended in production) |
| `DIRECT_URL` | Direct PostgreSQL connection string for Prisma schema operations |
| `SUPABASE_URL` | Supabase project URL used by server auth clients |
| `SUPABASE_ANON_KEY` | Supabase anon public key used by server auth clients |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL used by browser auth clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional browser fallback for local/dev; production browser config is served at runtime |
| `NEXT_PUBLIC_APP_BASE_URL` | Public URL used by client-side fetches; for container builds this must be injected at build time |
| `BRAVE_API_KEY` | Brave Search API key used for Prospecting Studio web discovery |
| `EMAIL_PROVIDER` | `dry-run`, `resend`, or `mailgun` |
| `RESEND_API_KEY` | Resend API key |
| `MAILGUN_API_KEY` | Mailgun API key |
| `MAILGUN_DOMAIN` | Mailgun sending domain |
| `EMAIL_WEBHOOK_SECRET` | Webhook signature verification |
| `DEFAULT_FROM_EMAIL` | Default sender email |
| `DEFAULT_FROM_NAME` | Default sender name |
| `APP_BASE_URL` | Public URL for unsubscribe links |

If `EMAIL_PROVIDER` is not set, the app runs in dry-run mode and logs emails to console without sending.

For Azure Container Apps, the `NEXT_PUBLIC_*` variables used in browser code must be present during the image build, not only at runtime. See [AZURE_CONTAINER_APPS.md](/home/ubuntu/.openclaw/workspace/AZURE_CONTAINER_APPS.md).

---

## API Surface

### Contacts
| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/contacts` | List contacts |
| `POST` | `/api/contacts` | Create contact |
| `POST` | `/api/contacts/bulk-tag` | Tag or untag a set of contacts |

### Companies
| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/companies` | List companies |
| `POST` | `/api/companies` | Create company |

### Tags
| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/tags` | List tags |
| `POST` | `/api/tags` | Create tag |

### Segments
| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/segments` | List segments |
| `POST` | `/api/segments` | Create segment |
| `POST` | `/api/segments/preview` | Preview count for a filter JSON |

### Campaigns
| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/campaigns` | List campaigns |
| `POST` | `/api/campaigns` | Create campaign draft |
| `GET` | `/api/campaigns/preview?segmentId=` | Preview audience for a segment |
| `GET` | `/api/campaigns/:id` | Campaign detail and delivery stats |
| `POST` | `/api/campaigns/:id/test-send` | Send test email |
| `POST` | `/api/campaigns/:id/send` | Snapshot recipients and start send |
| `POST` | `/api/campaigns/:id/dispatch` | Process the send queue in batches |

### Prospects
| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/prospects` | List prospects |
| `POST` | `/api/prospects` | Create prospect |
| `POST` | `/api/prospects/:id/convert` | Convert to company + contact |

### Imports
| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/imports` | List import jobs |
| `POST` | `/api/imports` | Upload CSV and detect headers |
| `POST` | `/api/imports/:id/map` | Save column mapping |
| `POST` | `/api/imports/:id/execute` | Run import with mapped rows |

### Suppressions
| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/suppressions` | List suppressions |
| `POST` | `/api/suppressions` | Add suppression manually |

### Email
| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/email/webhook` | Receive provider delivery events |

### Unsubscribe
| Method | Route | Purpose |
|---|---|---|
| `GET` | `/unsubscribe?email=&token=&campaign=` | Public unsubscribe handler |

---

## Campaign Send Flow

```
1. Create campaign draft  (POST /api/campaigns)
2. Preview audience       (GET  /api/campaigns/preview?segmentId=)
3. Test send              (POST /api/campaigns/:id/test-send)
4. Snapshot + start       (POST /api/campaigns/:id/send)
   → resolves segment, removes ineligible contacts, checks suppressions
   → creates campaign_recipients snapshot
   → sets campaign status to SENDING
5. Dispatch batches       (POST /api/campaigns/:id/dispatch)
   → sends in batches of 20 with 1.5s delays
   → updates per-recipient status
   → marks campaign SENT when queue is empty
6. Webhook events         (POST /api/email/webhook)
   → updates delivered / opened / clicked / bounced statuses
   → auto-suppresses bounces and complaints
```

---

## Merge Fields

Templates support `{{field}}` tokens:

| Token | Source |
|---|---|
| `{{contact_name}}` | Contact full name |
| `{{first_name}}` | Contact first name |
| `{{last_name}}` | Contact last name |
| `{{company_name}}` | Company name |
| `{{city}}` | Company city |
| `{{state}}` | Company state |
| `{{industry}}` | Company industry |

---

## Prospect Scoring

Default score weights:

| Signal | Points |
|---|---|
| Industry = Veterinary | +20 |
| Industry = Private Medical Practice | +20 |
| State present | +10 |
| City present | +10 |
| Website present | +10 |
| Valid email present | +15 |
| Named contact present | +10 |
| Employee count > 100 | -10 |
| Business type suggests chain/network | -20 |

Score bands: `70+` high · `40–69` medium · `<40` low

---

## Next Build Steps

- Authentication and session management
- Contact/company edit and delete actions
- Real-time send progress indicator
- Sequence (multi-step drip) campaigns
- Automated prospect import from directories
- Map-based geographic prospect targeting
- Full reporting dashboard with charts
