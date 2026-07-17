# Running the Althaqalayn monorepo

Requires Node >=20 and pnpm.

    pnpm install        # install all workspaces
    pnpm dev            # turbo: run mobile (Expo) + admin (Next.js) dev servers
    pnpm typecheck      # typecheck every package
    pnpm build          # build all

Apps:
- `apps/mobile` — Expo. `pnpm --filter mobile exec expo start` → Expo Go.
- `apps/admin`  — Next.js. `pnpm --filter admin dev` → http://localhost:3000.

Shared packages (`packages/theme|types|api|i18n`) import as `@althaqalayn/*`.
Design references live in `design/`.
