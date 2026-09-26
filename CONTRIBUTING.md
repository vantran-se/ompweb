# Contributing to omp-web

Thanks for your interest in contributing!

## Setup

- Node.js 26 or newer
- The [omp](https://github.com/can1357/oh-my-pi) binary on your `PATH` (or set `OMP_WEB_OMP_BIN`)

```bash
npm install
npm run dev   # http://127.0.0.1:30178
```

## Checks (must pass before submitting)

```bash
npx tsc --noEmit                                   # type check
npm run lint                                       # ESLint, zero warnings
npm test                                           # unit tests
```

Avoid `npm run build` during local development — it writes to `.next/` and
interferes with the dev server. Builds are for release work.

## Release distribution

The canonical repository is `vantran-se/ompweb`; `@vantran-se/ompweb` is
package metadata only and must not be published to npm. Releases are GitHub
Release assets (`ompweb-v<version>.tar.gz`, `SHA256SUMS`, and installers).
Build with Node 26; Bun may optionally launch the release build, but Node remains
the runtime. Release changes must preserve checksum verification, archive path
validation, same-filesystem staging, atomic activation, rollback, and user
configuration under `~/.omp/agent`.

Do not replace Next.js with Vite. The App Router, route handlers, proxy/auth
boundary, and Node server are coupled deployment contracts; doing so would be a
server rewrite, not a bundler swap.

### React tests

Tests use `node:test` and `jiti`; no Jest or Vitest configuration is required.
For interactive components and hooks, import `tests/setup-dom.mjs` before
`@testing-library/react/pure.js`, and register `cleanup` with `afterEach`.
Use DOM queries and `@testing-library/user-event` for component interactions,
and `renderHook` for hook state and lifecycle tests. Keep the real jsdom
`window` and `document`; mock only the browser or network APIs a scenario needs.

Static HTML tests can continue using `react-dom/server`. Layout, scrolling,
and native browser navigation still require real-browser verification.
The jsdom version follows the Node 26 runtime baseline.

## Conventions

- **Styling**: use the design tokens in `app/globals.css` (colors, radius,
  shadow, motion) — no hardcoded colors. Shared primitives live in
  `components/ui/` (Dialog/Tooltip/Collapsible/field/toast, built on Base UI);
  icons come from `lucide-react`.
- **i18n**: every user-facing string needs entries in all three dictionaries:
  `lib/i18n/locales/{en,zh-CN,ja}.json`.
- **Architecture**: omp-web never imports `@oh-my-pi/*` or `@earendil-works/*`
  packages (Bun-only). Live agent features go through the `omp` child process
  via RPC; see `DESIGN.md` and `AGENTS.md` for the full contract.

## Pull requests

- Keep PRs focused; describe the user-visible change and how you verified it.
- For UI changes, include before/after screenshots in both light and dark
  themes when practical.

## Reporting issues

Please use the issue templates and include your OS, Node version, omp version,
and browser.
