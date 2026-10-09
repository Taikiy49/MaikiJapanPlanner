<div align="center">
  <h1>MaikiJapanPlanner</h1>
  <p><strong>Next.js travel workspace with itineraries, bookings, notes, budgets, shared state, and optional AI assistance.</strong></p>
  <p>
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-303840?style=flat-square" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-303840?style=flat-square" />
    <img alt="React" src="https://img.shields.io/badge/React-303840?style=flat-square" />
    <img alt="SQLite" src="https://img.shields.io/badge/SQLite-303840?style=flat-square" />
  </p>
  <p><a href="#overview">Overview</a> · <a href="#getting-started">Getting started</a> · <a href="#repository-map">Repository map</a></p>
</div>

---

## Overview

A personal travel-planning workspace combining itineraries, bookings, notes, and budgeting. The application includes shared-state API routes and optional AI-assisted planning and budget parsing.

## What’s inside

- Trip and traveler organization, itineraries, and bookings.
- Notes with browser draft recovery.
- Monthly budget tracking and recorded trends.
- Server-side shared state and optional AI integrations.

## Getting started

Use a Node.js version satisfying `>=22.13.0` and supporting the `node:sqlite` API used by the state backend. Then:

```sh
npm ci
npm run dev
```

Build with `npm run build`, run tests with `npm test`, and lint with `npm run lint`. AI routes require `AI_GATEWAY_API_KEY` or the supported Vercel OIDC environment. Review `app/api/state/route.ts` and `db/shared.ts` before choosing local SQLite storage or the optional `EC2_API_ORIGIN` proxy; protect shared-state access with `DB_API_SECRET`.

## Repository map

| Location | Purpose |
| --- | --- |
| [`app/page.tsx`](./app/page.tsx) | Trip workspace |
| [`app/notes.tsx`](./app/notes.tsx) | Notes and draft recovery |
| [`app/budget.tsx`](./app/budget.tsx) | Budget interface |
| [`app/api/`](./app/api/) | Shared state, assistant, and budget parsing routes |
| [`db/shared.ts`](./db/shared.ts) | SQLite-backed shared state |
| [`lib/budget.ts`](./lib/budget.ts) | Budget calculations |
| [`tests/`](./tests/) | Budget and rendered-HTML checks |

## Project status

Personal application under development. Repository visibility and deployed-app access are separate. Configure authentication and shared-state protection before using real itineraries or financial information. Optional vinext/Cloudflare starter material remains alongside the current Next.js scripts.
