# Quizzo

Quizzo is a production-ready quiz platform for creating, publishing, attempting, and reviewing MCQ quizzes. It supports instructor quiz management, student attempts, timed sessions, result review, reattempts, admin controls, email verification, Google sign-in, Supabase realtime refreshes, Vercel Blob storage, and AI-assisted quiz generation.

Production domain: https://quizzo.tech

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma ORM with PostgreSQL
- Supabase Postgres and Realtime
- NextAuth v5
- Resend email delivery
- Vercel Blob file storage
- Google Gemini or NVIDIA API for AI quiz generation
- Vercel deployment in Mumbai, India: `bom1`

## Core Features

- Public landing page with production SEO metadata, robots, sitemap, and structured data.
- Credentials auth, Google auth, signup email verification, and forgot-password OTP flow.
- Student, instructor, and admin roles.
- Instructor quiz creation, editing, publishing, scheduling, password gates, attempt controls, timers, shuffling, and analytics.
- Student quiz taking, autosave, result review, and targeted reattempt flows.
- Admin user and quiz management.
- Supabase realtime refresh for quiz lists, results, role changes, and deleted-user session handling.
- Vercel region verification endpoint at `/api/vercel-region`.

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` from the environment variables listed below, then generate Prisma Client:

```bash
npx prisma generate
```

Apply database migrations locally:

```bash
npx prisma migrate dev
```

Start the development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Environment Variables

Do not commit real secret values. Configure these in `.env.local` for development and in Vercel Project Settings for production.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by the app and Prisma Client. Supabase pooler is acceptable for runtime. |
| `DIRECT_URL` | Yes | Direct PostgreSQL connection string used by Prisma migrations and introspection. Use the direct Supabase database port, not PgBouncer. |
| `NEXTAUTH_SECRET` or `AUTH_SECRET` | Yes | NextAuth session and token signing secret. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public Supabase project URL for realtime clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Public Supabase anon or publishable key. |
| `RESEND_API_KEY` | Yes for email OTP | Resend API key for signup, forgot password, and account email verification. |
| `RESEND_FROM_EMAIL` or `RESEND_FROM` | Yes for email OTP | Verified sender address used by Resend. |
| `BLOB_READ_WRITE_TOKEN` | Yes for uploads | Vercel Blob token for storing uploaded/generated quiz JSON assets. |
| `AUTH_GOOGLE_ID` or `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID. Required for Google login. |
| `AUTH_GOOGLE_SECRET` or `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret. Required for Google login. |
| `NVIDIA_API_KEY` | Optional | AI quiz generation provider key. |
| `GEMINI_API_KEY` | Optional | AI quiz generation provider key. Used when NVIDIA is not configured. |

Vercel automatically provides `VERCEL` and `VERCEL_REGION`. The app uses those only for deployment diagnostics.

## Database

The Prisma schema lives in `prisma/schema.prisma`.

Useful commands:

```bash
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
```

Use `migrate dev` only for local development. Use `migrate deploy` in production or CI so deployed databases receive committed migrations without creating new migration files.

## Supabase Realtime

Quizzo uses Supabase Realtime for live list refreshes and session-state changes. After migrations are deployed, make sure realtime is enabled for the event tables used by the app:

- `QuizListEvent`
- `ResultListEvent`
- `RoleChangeEvent`

The app should be deployed in the same region family as the Supabase database to reduce latency. This project is configured for Supabase Mumbai and Vercel Mumbai.

## Vercel Deployment

`vercel.json` pins serverless execution to Mumbai:

```json
{
  "regions": ["bom1"]
}
```

Production deployment checklist:

- Set the production domain to `quizzo.tech`.
- Add every required environment variable in Vercel.
- Confirm Supabase database location is Mumbai, India.
- Deploy Prisma migrations with `npx prisma migrate deploy`.
- Deploy the app to Vercel.
- Visit `https://quizzo.tech/api/vercel-region` and confirm:

```json
{
  "expectedRegion": "bom1",
  "actualRegion": "bom1",
  "matchesExpectedRegion": true,
  "isVercel": true
}
```

If `actualRegion` returns `local`, the endpoint is being opened from a local dev server instead of Vercel.

## SEO

Production SEO is configured for `quizzo.tech`.

- Landing page: `/`
- Robots: `/robots.txt`
- Sitemap: `/sitemap.xml`
- Region diagnostic: `/api/vercel-region`

After production deploy, submit `https://quizzo.tech/sitemap.xml` in Google Search Console and keep the primary domain canonical.

## Quality Checks

Run these before a production deploy:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The production build requires all required environment variables to be present.

## Operational Notes

- Keep `NEXTAUTH_SECRET` or `AUTH_SECRET` stable across deployments. Changing it signs users out.
- Keep `DIRECT_URL` private and use it only for migrations.
- Rotate email, OAuth, Blob, and AI provider keys if they are exposed.
- Admin deletion of a user immediately invalidates that user's active session and redirects them back to signup.
- Browser-native password reveal buttons are intentionally hidden so the app's password visibility control stays consistent.

## Repository Layout

```text
app/          Next.js routes, pages, layouts, and API handlers
components/   Auth, dashboard, quiz, admin, live, and UI components
lib/          Auth, Prisma, Supabase, email, storage, AI, and utility modules
prisma/       Prisma schema and database migrations
vercel.json   Vercel production region configuration
```
