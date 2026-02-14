# JobFlow AI

Full-stack JobFlow AI scaffold with a production-grade UI, role-based access, partner CRM, and working core flows. Designed for Netlify deploys with local dev support.

## Status
- UI shell and all core pages implemented.
- Role-based routing and dev bypass are working.
- Job board, pipeline, partner profile, and company CRM are functional using Prisma + Postgres.
- Gmail sync endpoint reads inbox and writes events (requires real OAuth token).
- Resume upload is wired to Supabase Storage (optional; can be skipped).

## What’s Implemented

### UI / Layout
- Left sidebar + topbar search + glassmorphism cards.
- Pages:
  - `/dashboard`: KPI overview.
  - `/pipeline`: Kanban with drag/drop.
  - `/analytics`: KPI counts from DB + real Sankey + source chart.
  - `/jobs`: Job board (apply creates application).
  - `/partners`: partner profile + job posting.
  - `/company`: company CRM (drag/drop updates applicants).
  - `/admin`: admin panel with partner approval + user management.
  - `/services`: service overview + pricing.
  - `/login`: Google sign-in.

### Auth & Roles
- Auth.js with Google OAuth.
- Roles: `CANDIDATE`, `PARTNER`, `ADMIN`.
- User status: `ACTIVE`, `SUSPENDED` (suspended users are blocked).
- Middleware protects routes.
- Dev bypass available for local testing without auth.

### Core Flows (Working)
- Create partner profile (`/partners`).
- Post partner jobs (`/partners`).
- Apply to job (`/jobs`) → creates application.
- Drag/drop in user pipeline (`/pipeline`) → updates status.
- Drag/drop in company CRM (`/company`) → updates status and reflects in user pipeline.
- Analytics counts + Sankey + source success chart (`/analytics`).
- Admin can change user roles and suspend users (`/admin`).

### APIs
- `/api/auth/[...nextauth]` (Auth.js)
- `/api/jobs` (create/list jobs)
- `/api/applications` (create/update)
- `/api/partners` (create partner profile)
- `/api/company/applications` (company updates)
- `/api/admin/partners` (admin approves)
- `/api/admin/bootstrap` (promote admin)
- `/api/email-sync` (Gmail sync)
- `/api/admin/users` (list/update user role/status)
- `/api/resumes` + `/api/resumes/upload` (optional resume upload)

## Project Structure
```
/Users/varen/Desktop/JobFlowAI-release
├── app
│   ├── (app)
│   │   ├── analytics/page.tsx
│   │   ├── company/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── jobs/page.tsx
│   │   ├── partners/page.tsx
│   │   ├── pipeline/page.tsx
│   │   ├── resumes/page.tsx
│   │   ├── services/page.tsx
│   │   └── admin/page.tsx
│   ├── api
│   │   ├── admin/bootstrap/route.ts
│   │   ├── admin/partners/route.ts
│   │   ├── applications/route.ts
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── company/applications/route.ts
│   │   ├── email-sync/route.ts
│   │   ├── jobs/route.ts
│   │   ├── partners/route.ts
│   │   ├── quick-add/route.ts
│   │   ├── resumes/route.ts
│   │   └── resumes/upload/route.ts
│   ├── login/page.tsx
│   └── globals.css
├── components
│   ├── CompanyCRMClient.tsx
│   ├── JobBoardClient.tsx
│   ├── PipelineClient.tsx
│   ├── Sidebar.tsx
│   └── Topbar.tsx
├── lib
│   ├── auth.ts
│   ├── db.ts
│   ├── gmail.ts
│   └── supabase.ts
├── middleware.ts
├── prisma/schema.prisma
├── netlify.toml
├── package.json
└── README.md
```

## Environment Variables
Create `/Users/varen/Desktop/JobFlowAI-release/.env`:
```
# Launch mode
APP_MODE=prod

# Authentication and OAuth values
# (set these in your local .env and Netlify UI)
AUTH_*=
OAUTH_*=

# Storage and database connection values
STORAGE_*=
DB_CONNECTION_STRING=

# Admin bootstrap
ADMIN_EMAIL=admin@example.com

# Dev bypass
DEV_BYPASS_AUTH=false
```

Notes:
- `DEV_BYPASS_AUTH=false` is required for production.
- `APP_MODE=prod` disables demo bypass mode.

## Local Setup
```bash
cd "/Users/varen/Desktop/JobFlowAI-release"
npm install --no-fund --no-audit
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Open:
- `http://localhost:3000/dashboard`
- `http://localhost:3000/pipeline`
- `http://localhost:3000/jobs`
- `http://localhost:3000/partners`
- `http://localhost:3000/company`

## Dev Seed (optional)
When `DEV_BYPASS_AUTH=true`, call:
```
POST /api/dev/seed
```
This creates a sample company, job, and application for quick testing.

## Admin Bootstrap
When using real auth:
1. Set `ADMIN_EMAIL` in `.env`.
2. Sign in.
3. Run:
   ```
   curl -X POST http://localhost:3000/api/admin/bootstrap
   ```

## Supabase Storage (optional for resumes)
Create a bucket named `resumes` and set it to **public**.

## Netlify
`netlify.toml` is configured for Next.js with OpenNext. Deploy as normal:
- Build command: `npm run build`
- Publish directory: `.next`

## Launch Checklist
See `/Users/varen/Desktop/JobFlowAI-release/docs/LAUNCH_CHECKLIST.md`.

## Known Limitations / TODO
- Email sync reads latest emails but no advanced NLP pipeline yet.
- Admin UI covers users + partner approvals; audits/logs are not implemented.
- Resume upload optional; can be skipped.

## How to Resume Work Later
1. Read this README.
2. Check `/Users/varen/Desktop/JobFlowAI-release/prisma/schema.prisma` for schema.
3. Review API routes in `/Users/varen/Desktop/JobFlowAI-release/app/api`.
4. Start server and verify flows in the order above.
