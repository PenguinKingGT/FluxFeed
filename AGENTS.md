# Repository Guidelines

## Project Structure & Module Organization

FluxFeed is a WXT browser extension built with React and TypeScript. Browser entrypoints live in `entrypoints/` (`background`, `content`, `popup`, and `options`). UI components belong in `components/`, hooks in `hooks/`, domain logic and types in `lib/`, and Zustand state in `store/`. Put served files and locale catalogs in `public/`, artwork in `assets/`, unit tests in `tests/unit/`, and browser tests in `tests/e2e/`. Consult `docs/architecture.md` and the relevant `docs/features/` document before changing cross-boundary behavior.

## Build, Test, and Development Commands

Use `pnpm`; the lockfile is committed.

- `pnpm install`: install dependencies and prepare WXT-generated files.
- `pnpm dev` / `pnpm dev:firefox`: run the extension in development mode.
- `pnpm build` / `pnpm build:firefox`: create Chrome or Firefox production builds.
- `pnpm compile`: type-check with TypeScript without emitting files.
- `pnpm lint` (`pnpm lint:fix`): run Oxlint (or apply safe fixes).
- `pnpm test --run`: run the Vitest suite once.
- `pnpm test:e2e`: build Chrome and run Playwright extension tests.

## Coding Style & Naming Conventions

Follow the existing two-space indentation, single quotes, semicolons, ES modules, and React function-component style. Use PascalCase for component files (`ReaderLayout.tsx`), kebab-case for utility modules (`feed-fetcher.ts`), and `*.test.ts` or `*.test.tsx` for tests. Prefer named exports and the `@/` path alias. Reuse semantic Tailwind tokens and existing `components/ui/` primitives instead of introducing one-off styling.

## Testing Guidelines

Vitest runs in `jsdom` with IndexedDB initialized by `tests/setup-indexeddb.ts`; Playwright covers the built extension with one worker. Add focused unit or component tests beside the existing behavioral suites. Reserve E2E tests for browser permissions, entrypoint integration, and critical workflows. Before submitting, run `pnpm test --run`, `pnpm compile`, and `pnpm lint`; include builds and E2E checks for runtime or manifest changes.

## Commit & Pull Request Guidelines

History follows Conventional Commit-style subjects, including `feat:`, `fix:`, and `test:`, with optional scopes such as `feat(reader):`. Keep commits focused and imperative. Pull requests should explain user-visible impact, link the relevant issue or feature document, list verification performed, and include screenshots or clips for UI changes.

## Security, Localization & Documentation

Keep feed/database writes, browser APIs, and external AI calls in the background runtime. Store AI keys only in `browser.storage.local`; never expose them through page state or logs. Treat feed and AI content as untrusted. Keep English, Simplified Chinese, and Japanese locale resources synchronized. Update all three README files when features, installation, permissions, privacy, or browser support change.
