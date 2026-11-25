# Next.js security stabilisation

This document records the dependency remediation performed on `fix/next-security-stabilisation`.

## Dependency changes

Direct dependency changes:

| Package | Before | After | Reason |
|---|---:|---:|---|
| `next` | 16.2.3 | 16.4.6 | Patched stable Next.js 16.x release addressing critical/high framework advisories. |
| `@next/mdx` | 16.2.3 | 16.4.6 | Kept exactly aligned with the Next.js framework release. |
| `@supabase/supabase-js` | ^2.57.4 | ^2.119.2 | Refreshes the realtime/WebSocket dependency chain, including `ws`. |
| `tailwindcss` | 4.1.13 | 4.3.5 | Refreshes the Tailwind/PostCSS build chain. |
| `@tailwindcss/postcss` | 4.1.13 | 4.3.5 | Refreshes Tailwind oxide/PostCSS transitive dependencies. |

Important resolved transitive versions after `npm ci`:

| Package | Resolved version |
|---|---:|
| `sharp` | 0.35.5 |
| `postcss` | 8.5.23 via Next.js; 8.5.33 via Tailwind |
| `js-yaml` | 3.15.2 |
| `nanoid` | 3.3.20 |
| `source-map-js` | 1.2.4 |
| `baseline-browser-mapping` | 2.11.39 |
| `tar` | no vulnerable installed instance remains in the npm audit tree |
| `ws` | no vulnerable installed instance remains in the npm audit tree |

## Audit result

Non-mutating audit before remediation:

- full tree: 2 critical, 6 high, 1 moderate (9 total);
- production tree: 1 critical, 6 high, 1 moderate (8 total).

Non-mutating audit after remediation and deterministic `npm ci`:

- full tree: 0 critical, 0 high, 0 moderate, 0 low;
- production tree: 0 critical, 0 high, 0 moderate, 0 low.

No `npm audit fix --force` command was used. No advisory was suppressed or ignored.

## Exposure notes

The upgrade is still necessary even though some individual critical advisories had deployment preconditions that did not match the current Vercel Linux deployment. In particular, `next/image` is used by chapter content, so image-optimisation advisory classes were relevant. No `next/og`, `use cache`, custom rewrites, Server Actions, or remote image host patterns were identified during source inspection. The proxy performs canonical auth-entry-host redirection and is not the primary authorisation boundary, but proxy/middleware bypass fixes are still security-relevant framework hardening.

## Validation performed locally

- `npm ci`: pass, zero audit findings.
- `npx tsc --noEmit --project tsconfig.json`: pass.
- `npm run build`: pass with Next.js 16.4.6/Turbopack; all 26 static pages generated.
- Safe public local-mode browser smoke: pass.
- Chapter 2/3/4 public browser smoke tests: pass.
- Chapter 0 public browser smoke required a stale assertion repair because the chapter now has 15 parts rather than the hard-coded 14; the repaired test validates the catalog-derived page count dynamically and passes.
- Image optimisation: `/_next/image` returned HTTP 200 with an image content type for a repository-controlled JPEG.
- Proxy behaviour: with `AUTH_ENTRY_HOSTS=auth.fabriclab.test`, a request carrying that host received a 307 redirect to `/login` on the canonical local origin and preserved the original path in `next`; the canonical host itself continued without redirect.

## Residual release risk

At the time of the final local audit there are no unresolved critical, high, or moderate advisories in either the production or full dependency tree. Dependency risk can reappear as new advisories are published, so the GitHub Actions workflow performs non-mutating production and full-tree audits with a moderate severity threshold.
