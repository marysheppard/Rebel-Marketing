# Rebel Marketing — Contract-to-Cash

Polished web app for a marketing agency to manage clients, contracts, campaigns, work, costs, client approvals, billing, payments, AR, and profitability.

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + daisyUI
- Supabase (Auth, Database, RLS)
- Recharts
- Deploy target: Vercel

## Branch

Work happens on `feature/contract-to-cash` (not `main`).

## Environment variables

Copy `.env.local.example` to `.env.local` (already present locally):

```
NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL_HERE
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY_HERE
```

Use the **Project URL** and **anon / publishable** key from Supabase → Settings → API Keys.

Do **not** use the service-role or secret key in the frontend.

After changing `.env.local`, stop the local server and run `npm run dev` again.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Next.js prints (usually http://localhost:3000).

## Demo accounts

Password for all demo users: `DemoPass123!`

| Role | Email |
|------|--------|
| Agency Manager | manager@rebel.demo |
| Account Manager | am.jordan@rebel.demo |
| Account Manager | am.sam@rebel.demo |
| Marketing | creative.mia@rebel.demo |
| Marketing | creative.noah@rebel.demo |
| Billing | billing@rebel.demo |
| Client (Blue Ridge) | client.blueridge@rebel.demo |
| Client (Summit) | client.summit@rebel.demo |

On the login page, use the one-click demo buttons to switch perspectives quickly.

## Vercel

1. Import the GitHub repo into Vercel.
2. Set the same two `NEXT_PUBLIC_SUPABASE_*` env vars.
3. Deploy. Do not add service-role keys.

## Scripts

- `npm run dev` — local development
- `npm run build` — production build check
- `npm run start` — run production build locally
