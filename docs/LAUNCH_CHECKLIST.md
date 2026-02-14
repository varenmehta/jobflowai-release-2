# Launch Checklist (Netlify)

## Pre-Launch (Local)
1. `nvm use 20`
2. `npm install`
3. `npm run prisma:migrate -- --name <migration-name>`
4. `npm run prisma:generate`
5. `npm run test:e2e`

## Supabase
1. Project created.
2. `DATABASE_URL` copied.
3. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` copied.
4. Storage bucket `resumes` created (public).

## Google OAuth
1. OAuth consent screen completed.
2. OAuth client created (Web application).
3. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-site>.netlify.app/api/auth/callback/google`
4. Add test users if not verified.

## Netlify
1. New site from Git.
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Environment variables added:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `AUTH_TRUST_HOST=true`
   - `APP_MODE=prod`
5. Deploy.

## Post-Launch
1. Visit `/api/health` → `{ ok: true }`.
2. Sign in via Google.
3. Run `/api/admin/bootstrap` once.
4. Validate dashboards + pipelines.
