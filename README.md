# The Growth Network Matching Platform

AI-powered matching and deal facilitation platform for Exoasia Innovation Hub.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm, pnpm, or yarn
- Supabase CLI (for local dev)

## Setup

1) Install dependencies

```bash
npm install
```

2) Install Supabase CLI

Use any of the supported install methods from Supabase. Example using npm:

```bash
npm install -g supabase
```

Verify:

```bash
supabase --version
```

3) Create `.env.local`

Create a `.env.local` in the project root. You can copy the supplied example:

```powershell
copy .env.local.example .env.local
```

Then open `.env.local` and fill values for:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

Where to get values:

- Local dev: run `supabase start` and use the local API URL and anon/service keys from the CLI output.
- Remote dev: use your Supabase project settings.

4) Start Supabase locally (optional but recommended for local dev)

```bash
supabase start
```

5) Run the web app

```bash
npm run dev
```

Open http://localhost:3000.

## Running with Docker

You can also run the web app in a Docker container.

1) Build the image:

```bash
docker build -t exoasia-matching-platform .
```

2) Run the container:

```bash
docker run -p 3000:3000 --env-file .env.local exoasia-matching-platform
```

The app will be available at http://localhost:3000.

## Useful Commands

```bash
supabase start
supabase stop
supabase status
npm run seed:invited
```

Seed with custom credentials:

```bash
npm run seed:invited -- invited.member@example.com "Invite123!"
```

On Windows PowerShell you can run the seed command with inline env vars like this:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL='https://your-project-ref.supabase.co';
$env:SUPABASE_SERVICE_ROLE_KEY='service-role-key';
node scripts/seed-invited-account.mjs
```

## Notes

- The app is built with Next.js App Router.
- Keep `.env.local` out of version control.
