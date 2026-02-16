# frontend

Web dashboard for the LLM router platform. Lets users manage AI provider credentials, generate API keys, and monitor routing analytics.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, React 19)
- **Deployment**: [OpenNext](https://opennext.js.org/) + [Cloudflare Workers](https://workers.cloudflare.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Radix primitives)
- **Auth**: [better-auth](https://www.better-auth.com/) client (email/password + GitHub OAuth)
- **Data Fetching**: [TanStack Query v5](https://tanstack.com/query) + [ky](https://github.com/sindresorhus/ky)
- **Charts**: [Recharts](https://recharts.org/)
- **Validation**: [Zod v4](https://zod.dev/)

## Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- Running [backend](../backend) service

## Setup

```bash
# From repo root
bun install

# Development
cd packages/frontend
bun run dev           # http://localhost:3000
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_BETTERAUTH_BASE_URL` | **Yes** | Backend URL for auth (e.g. `http://localhost:8000`) |
| `NEXT_PUBLIC_BACKEND_URL` | **Yes** | Backend API base URL (e.g. `http://localhost:8000`) |

For Cloudflare Workers production, set these as Wrangler secrets. For local Wrangler dev, set `NEXTJS_ENV=development` in `.dev.vars`.

## Pages

| Route | Description |
|-------|-------------|
| `/auth` | Login, sign up, forgot password, GitHub OAuth |
| `/` | Analytics dashboard (time series, latency, cost, errors, tokens) |
| `/connections` | AI provider credential management (OpenAI, AWS Bedrock) |
| `/api-keys` | API key CRUD (create, enable/disable, delete) |
| `/account` | Profile, password, sessions, account deletion |
| `/connect` | Onboarding wizard (connect provider → create first API key) |

All routes except `/auth` are behind a server-side session guard.

## Features

- **Analytics Dashboard** — time-interval selector (15m/1h/24h/7d), overview KPIs (requests, latency p50/p95/p99, cost, error rate), time-series charts, per-provider breakdowns
- **Provider Connections** — configure API keys for OpenAI and AWS Bedrock, enable/disable individual providers
- **API Key Management** — create with optional expiration, one-time key reveal + copy, enable/disable toggle
- **Onboarding** — 2-step wizard: connect a provider, then create an API key
- **Account Settings** — profile edit, password change, active session management, account deletion

## Scripts

```bash
bun run dev          # Next.js dev server (HMR)
bun run build        # Production build
bun run preview      # Build with OpenNext + run via Wrangler locally
bun run deploy       # Deploy to Cloudflare Workers
bun run upload       # Build + upload without deploying
bun run cf-typegen   # Regenerate Cloudflare env types
```

## Project Structure

```
src/
├── app/
│   ├── auth/page.tsx                          # Auth page
│   └── (authenticated)/
│       ├── layout.tsx                         # Server-side session guard
│       ├── connect/page.tsx                   # Onboarding wizard
│       └── (dashboard)/
│           ├── page.tsx                       # Analytics dashboard
│           ├── connections/page.tsx            # Provider connections
│           ├── api-keys/page.tsx              # API key management
│           └── account/page.tsx               # Account settings
├── components/
│   ├── analytics/                             # Chart components
│   ├── app-sidebar.tsx                        # Navigation sidebar
│   └── ui/                                    # shadcn/ui primitives
└── lib/
    ├── auth-client.ts                         # better-auth client setup
    ├── providers.tsx                           # Supported AI provider config
    └── api/
        ├── analytics.ts                       # React Query hooks — analytics
        ├── api-keys.ts                        # React Query hooks — API keys
        └── secrets.ts                         # React Query hooks — provider secrets
```
