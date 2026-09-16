# SIRI Worldwide

SIRI Worldwide is a mobile-first two-person chat app for sending messages between English and Swahili speakers, with one-tap translation and Firebase-backed message persistence.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/siri-worldwide run dev` — run the SIRI Worldwide web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/siri-worldwide/src/App.tsx` — chat experience and interaction state
- `artifacts/siri-worldwide/src/lib/siri-persistence.ts` — Firebase Firestore REST persistence with localStorage demo fallback
- `artifacts/siri-worldwide/src/index.css` — dark visual theme and responsive chat styling
- `artifacts/siri-worldwide/.env.example` — Firebase web environment variable names
- `artifacts/api-server/.env.example` — `ADMIN_EMAIL` Secret placeholder

## Architecture decisions

- Firebase Firestore REST is used directly from the web client so the chat can persist without introducing a second application-specific API.
- When Firebase is not configured, the app stays usable in local demo mode with seeded messages and localStorage persistence.
- The first build models two demo identities instead of adding auth so the core send/translate flow is testable immediately.
- Floor 2 admin access uses Firebase Email/Password authentication in the browser and checks the signed-in email against the API server's `ADMIN_EMAIL` Secret.

## Product

- Two people can switch speaking identities and send chat messages.
- Each message has a globe action that reveals an English or Swahili translation.
- Firebase-connected conversations poll for new messages every five seconds; preview mode persists locally.
- `/admin` provides the email/password-gated admin archive with user cards and per-message deletion.

## User preferences

- The user requested a simple, modern, dark, mobile-first chat app.

## Gotchas

- Add `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_API_KEY` to enable cross-device Firestore sync; otherwise the UI intentionally uses local demo mode.
- Add `VITE_FIREBASE_AUTH_DOMAIN` and `VITE_FIREBASE_APP_ID` plus enable Email/Password sign-in in Firebase before using `/admin`.
- Store the authorized admin email in the `ADMIN_EMAIL` Replit Secret.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
