# Project Guidelines

## Scope
These instructions apply to all tasks in this workspace.

## Core Behavior
- Make the smallest safe change that solves the request.
- Do not add extra features, files, or refactors unless explicitly requested.
- After making changes, run a relevant validation command when possible.

## Documentation Source Rule
- For library/framework/tool usage (NestJS, Prisma, Clerk, Docker, Postgres, etc.), fetch and follow the latest official docs via Context7 before implementation.

## NestJS Conventions
- Use Nest CLI schematics for generated artifacts instead of manually creating generated structure.
- Preferred command pattern:
  - `nest generate <schematic> <name> [options]`
- Examples:
  - `nest generate module <name> --no-spec`
  - `nest generate service <name> --no-spec`
  - `nest generate guard <name> --no-spec`
  - `nest generate decorator <name> --no-spec`
  - `nest generate middleware <name> --no-spec`

## Environment and Secrets
- Keep secrets only in `.env`.
- Do not create `.env.example` unless explicitly asked.
- Reuse env variables from `.env` in Docker Compose using variable interpolation.

## Docker Conventions
- Keep local Docker setup minimal and only include required files/settings.
- Prefer env-driven Compose config over hardcoded credentials/ports.
- Avoid changing unrelated Docker services or adding optional infra unless requested.

## Prisma Conventions
- Use the existing Prisma setup in this repository (`prisma/schema.prisma`, `prisma.config.ts`).
- For PostgreSQL runtime in this repo, initialize PrismaClient with `@prisma/adapter-pg` in `PrismaService`.
- Use standard Prisma CLI workflow:
  - `pnpm prisma generate`
  - `pnpm prisma migrate dev --name <name>`
- Keep Prisma changes focused (schema, migrations, and required service wiring only).

## Clerk Conventions
- Ensure `.env` values are loaded before initializing Clerk middleware (for example, `import 'dotenv/config'` in `src/main.ts`).
- Pass `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` explicitly to `clerkMiddleware` in backend runtime setup.

## Command-Line Workflow
Use these commands by default when relevant:
- Install dependencies: `pnpm install`
- Build: `pnpm build`
- Lint: `pnpm lint`
- Unit tests: `pnpm test`
- E2E tests: `pnpm test:e2e`
- Start dev server: `pnpm start:dev`
- Start Docker services: `docker compose -f docker-compose.yml up -d`
- Stop Docker services: `docker compose -f docker-compose.yml down`

## Change Safety
- Do not revert unrelated user changes.
- If unexpected unrelated modifications are detected, pause and ask before proceeding.
