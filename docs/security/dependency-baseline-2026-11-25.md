# Dependency security baseline

Captured before the security stabilisation upgrade on 2026-11-25. Generated from non-mutating npm audit output in `apps/web`; no dependencies were changed while capturing it.

## Summary

- Full dependency tree: critical 2, high 6, moderate 1, low 0; total 9.
- Production dependency tree: critical 1, high 6, moderate 1, low 0; total 8.
- GitHub Dependabot additionally reported 93 open alert instances across package.json/package-lock.json (10 critical, 38 high, 39 medium, 6 low). Alert instances are duplicated across manifests; unique affected packages are fewer.

## Package assessment

| Package | Installed version | Dependency type | Exposure assessment | Recommended remediation |
|---|---|---|---|---|
| `next` | 16.2.3 | direct production dependency (`next`) | Production framework. Image optimisation is used through next/image; no remotePatterns, next/og, use cache, custom rewrites, or server actions were found in a source search. Proxy exists but performs canonical auth-host redirection rather than primary authorization. Windows-only RCE is not applicable to Vercel Linux deployment. These conditions reduce some paths but do not make the direct framework advisories safe to ignore. | Upgrade next and @next/mdx together to patched stable 16.4.6. |
| `tar` | 7.5.12 | transitive development dependency (`@tailwindcss/postcss` -> `@tailwindcss/oxide`) | Development/build archive parser exposure; not shipped as a production runtime dependency. Exploitability requires hostile tar input in the build toolchain. | Upgrade Tailwind/PostCSS toolchain or tar to a patched release. |
| `sharp` | 0.34.5 | transitive production optional dependency (`next` -> `sharp`) | Native image-processing exposure. next/image is present; current content images are repository-controlled and no remote image host patterns are configured. | Resolved by patched Next dependency if sharp >=0.35.5 is installed; otherwise target sharp explicitly. |
| `postcss` | 8.4.31 via next; 8.5.8 via Tailwind | transitive production and development dependency | Primarily build-time processing of CSS/source maps. Applicable if attacker-controlled CSS or sourceMappingURL input reaches the build. | Upgrade Next/Tailwind/PostCSS to audit-clean releases. |
| `js-yaml` | 3.14.2 | transitive production dependency (`gray-matter` -> `js-yaml`) | CPU-complexity DoS while parsing YAML frontmatter. Current MDX/frontmatter input is repository-controlled, so no unauthenticated remote input path was identified. | Update resolved js-yaml to >=3.15.2 within gray-matter compatible range. |
| `ws` | 8.20.0 | transitive production dependency (`@supabase/supabase-js` -> `@supabase/realtime-js` -> `ws`) | WebSocket memory-exhaustion DoS. No active Supabase Realtime channel subscription was found in app source, so present exposure appears limited, but the dependency remains in the production graph. | Upgrade Supabase client chain or ws to >=8.21.0. |
| `source-map-js` | 1.2.1 | transitive production/development dependency through PostCSS chains | Event-loop DoS when processing malicious indexed source maps; primarily build tooling exposure. | Update resolved package to >=1.2.2. |
| `nanoid` | 3.3.11 | transitive production/development dependency through PostCSS chains | Invalid/custom generator size and integer-overflow cases; normal PostCSS usage does not obviously expose those inputs. | Update resolved package to >=3.3.18. |
| `baseline-browser-mapping` | 2.10.9 | transitive production dependency (`next`) | Moderate DoS on invalid input; no direct attacker input path identified. | Update through patched Next or package refresh. |

## Advisory inventory

| Package | Advisory | Severity | Affected range | Title |
|---|---|---|---|---|
| `baseline-browser-mapping` | [GHSA-w5vr-8v7q-w6rv](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) | moderate | `>=2.0.0 <2.11.0` | baseline-browser-mapping process termination on invalid input causes denial of service |
| `js-yaml` | [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68) | moderate | `<3.15.0` | JS-YAML: Quadratic-complexity DoS in merge key handling via repeated aliases |
| `js-yaml` | [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m) | high | `>=3.0.0 <3.15.0` | js-yaml: YAML merge-key chains can force quadratic CPU consumption |
| `js-yaml` | [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) | high | `>=3.0.0 <3.15.1` | JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported |
| `js-yaml` | [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) | high | `>=3.0.0 <3.15.2` | js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources |
| `nanoid` | [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) | high | `<3.3.16` | nanoid: non-secure generators can loop indefinitely with negative size |
| `nanoid` | [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) | high | `<3.3.18` | nanoid: custom generators can loop indefinitely when size is zero |
| `nanoid` | [GHSA-xwg4-73v4-xw9w](https://github.com/advisories/GHSA-xwg4-73v4-xw9w) | high | `<3.3.12` | nanoid: Integer Overflow or Wraparound |
| `next` | [GHSA-8h8q-6873-q5fj](https://github.com/advisories/GHSA-8h8q-6873-q5fj) | high | `>=16.0.0 <16.2.5` | Next.js Vulnerable to Denial of Service with Server Components |
| `next` | [GHSA-3g8h-86w9-wvmq](https://github.com/advisories/GHSA-3g8h-86w9-wvmq) | low | `>=16.0.0 <16.2.5` | Next.js's Middleware / Proxy redirects can be cache-poisoned |
| `next` | [GHSA-ffhc-5mcf-pf4q](https://github.com/advisories/GHSA-ffhc-5mcf-pf4q) | moderate | `>=16.0.0 <16.2.5` | Next.js vulnerable to cross-site scripting in App Router applications using CSP nonces |
| `next` | [GHSA-vfv6-92ff-j949](https://github.com/advisories/GHSA-vfv6-92ff-j949) | low | `>=16.0.0 <16.2.5` | Next.js vulnerable to cache poisoning via collisions in React Server Component cache-busting |
| `next` | [GHSA-gx5p-jg67-6x7h](https://github.com/advisories/GHSA-gx5p-jg67-6x7h) | moderate | `>=16.0.0 <16.2.5` | Next.js has cross-site scripting in beforeInteractive scripts with untrusted input |
| `next` | [GHSA-mg66-mrh9-m8jx](https://github.com/advisories/GHSA-mg66-mrh9-m8jx) | high | `>=16.0.0 <16.2.5` | Next.js vulnerable to Denial of Service via connection exhaustion in applications using Cache Components |
| `next` | [GHSA-h64f-5h5j-jqjh](https://github.com/advisories/GHSA-h64f-5h5j-jqjh) | moderate | `>=16.0.0 <16.2.5` | Next.js has a Denial of Service in the Image Optimization API |
| `next` | [GHSA-c4j6-fc7j-m34r](https://github.com/advisories/GHSA-c4j6-fc7j-m34r) | high | `>=16.0.0 <16.2.5` | Next.js vulnerable to server-side request forgery in applications using WebSocket upgrades |
| `next` | [GHSA-492v-c6pp-mqqv](https://github.com/advisories/GHSA-492v-c6pp-mqqv) | high | `>=16.0.0 <16.2.5` | Next.js has a Middleware / Proxy bypass through dynamic route parameter injection |
| `next` | [GHSA-wfc6-r584-vfw7](https://github.com/advisories/GHSA-wfc6-r584-vfw7) | moderate | `>=16.0.0 <16.2.5` | Next.js vulnerable to cache poisoning in React Server Component responses |
| `next` | [GHSA-267c-6grr-h53f](https://github.com/advisories/GHSA-267c-6grr-h53f) | high | `>=16.0.0 <16.2.5` | Next.js has a Middleware / Proxy bypass in App Router applications via segment-prefetch routes |
| `next` | [GHSA-36qx-fr4f-26g5](https://github.com/advisories/GHSA-36qx-fr4f-26g5) | high | `>=16.0.0 <16.2.5` | Next.js has a Middleware / Proxy bypass in Pages Router applications using i18n |
| `next` | [GHSA-6gpp-xcg3-4w24](https://github.com/advisories/GHSA-6gpp-xcg3-4w24) | high | `>=16.0.0 <16.2.11` | Next.js: Middleware / Proxy bypass in App Router applications using Turbopack and single locale |
| `next` | [GHSA-m99w-x7hq-7vfj](https://github.com/advisories/GHSA-m99w-x7hq-7vfj) | high | `>=16.0.0 <16.2.11` | Next.js: Denial of Service in App Router using Server Actions |
| `next` | [GHSA-89xv-2m56-2m9x](https://github.com/advisories/GHSA-89xv-2m56-2m9x) | high | `>=16.0.0 <16.2.11` | Next.js: Server-Side Request Forgery in Server Actions on custom servers |
| `next` | [GHSA-68g3-v927-f742](https://github.com/advisories/GHSA-68g3-v927-f742) | moderate | `>=16.0.0 <16.2.11` | Next.js: Cache confusion of response bodies for requests with bodies |
| `next` | [GHSA-4633-3j49-mh5q](https://github.com/advisories/GHSA-4633-3j49-mh5q) | moderate | `>=16.0.0 <16.2.11` | Next.js: Cache confusion of response bodies for requests with bodies containing invalid UTF-8 byte sequences |
| `next` | [GHSA-4c39-4ccg-62r3](https://github.com/advisories/GHSA-4c39-4ccg-62r3) | moderate | `>=16.0.0 <16.2.11` | Next.js: Unbounded Server Action payload in Edge runtime |
| `next` | [GHSA-p9j2-gv94-2wf4](https://github.com/advisories/GHSA-p9j2-gv94-2wf4) | high | `>=16.0.0 <16.2.11` | Next.js: Server-Side Request Forgery in rewrites via attacker-controlled destination hostname |
| `next` | [GHSA-q8wf-6r8g-63ch](https://github.com/advisories/GHSA-q8wf-6r8g-63ch) | moderate | `>=16.0.0 <16.2.11` | Next.js: Denial of Service in the Image Optimization API using SVGs |
| `next` | [GHSA-955p-x3mx-jcvp](https://github.com/advisories/GHSA-955p-x3mx-jcvp) | moderate | `>=16.0.0 <16.2.11` | Next.js: Unauthenticated disclosure of internal Server Function endpoints |
| `next` | [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) | critical | `>=16.0.0 <16.3.3` | Next.js: Unauthenticated Remote Code Execution on windows-hosted servers |
| `next` | [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) | critical | `>=16.0.0 <16.3.3` | Next.js: Unauthenticated Remote Code Execution in Image Optimization API when AVIF files are used |
| `next` | [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j) | critical | `>=16.2.0 <16.3.6` | Next.js: Remote Code Execution in next/og ImageResponse |
| `next` | [GHSA-4jqv-mc3x-m676](https://github.com/advisories/GHSA-4jqv-mc3x-m676) | moderate | `>=16.0.0 <16.3.8` | Next.js has cache poisoning of SSG and ISR pages in self-hosted applications |
| `next` | [GHSA-39w2-rjm5-chcv](https://github.com/advisories/GHSA-39w2-rjm5-chcv) | low | `>=16.0.0 <16.3.8` | Next.js has information disclosure in development server's Model Context Protocol endpoint |
| `next` | [GHSA-f87g-xv8r-7p7x](https://github.com/advisories/GHSA-f87g-xv8r-7p7x) | moderate | `>=16.0.0 <16.3.8` | Next.js has information disclosure in App Router metadata image routes via dynamicParams bypass |
| `next` | [GHSA-mcj8-r9mp-w47p](https://github.com/advisories/GHSA-mcj8-r9mp-w47p) | moderate | `>=16.0.0 <16.3.8` | Next.js has cache poisoning in SSG/ISR rendering that leads to cross-user content substitution and persistent denial of service |
| `next` | [GHSA-cjq9-62q9-8jv4](https://github.com/advisories/GHSA-cjq9-62q9-8jv4) | high | `>=16.0.0 <16.3.8` | Next.js has Server-Side Request Forgery in Image Optimization |
| `next` | [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw) | critical | `>=16.0.0 <=16.4.0` | Next.js: Unauthenticated Remote Code Execution in Image Optimization API when SVG files are used |
| `next` | [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) | high | `>=16.0.0 <=16.4.0` | Next.js: Denial of Service in App Router using Server Actions |
| `next` | [GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr) | critical | `>=16.0.0 <=16.4.0` | Next.js: Unauthenticated Remote Code Execution in `use cache` functions returning typed arrays |
| `next` | [GHSA-26hh-7cqf-hhc6](https://github.com/advisories/GHSA-26hh-7cqf-hhc6) | high | `>=16.0.0 <16.2.6` | Next.js has a Middleware / Proxy bypass in App Router applications via segment-prefetch routes - Incomplete Fix Follow-Up |
| `next` | [GHSA-vc7v-qv4w-wrv8](https://github.com/advisories/GHSA-vc7v-qv4w-wrv8) | moderate | `>=16.2.0 <=16.4.4` | Next.js: Cache leak across root param values in nested 'use cache' functions via delayed inner stream metadata |
| `next` | [GHSA-7qx7-33qx-rqx2](https://github.com/advisories/GHSA-7qx7-33qx-rqx2) | moderate | `>=16.0.0 <=16.4.4` | Next.js: SVG rejection bypass in the image optimization |
| `next` | [GHSA-f3mh-rxg3-f5g2](https://github.com/advisories/GHSA-f3mh-rxg3-f5g2) | moderate | `>=16.0.0 <=16.4.4` | Next.js: HttpOnly cookie exposure through internal response header on Next.js Edge runtime routes |
| `next` | [GHSA-pc58-hwjq-p385](https://github.com/advisories/GHSA-pc58-hwjq-p385) | moderate | `>=16.0.0 <=16.4.4` | Next.js: Cross-client response injection and disclosure in self-hosted Next.js applications forwarding fetched responses |
| `next` | [GHSA-rhh4-g77r-r9qj](https://github.com/advisories/GHSA-rhh4-g77r-r9qj) | moderate | `>=16.0.0 <=16.4.4` | Next.js: Cross-user cache disclosure and poisoning in Next.js use cache with binary arguments |
| `postcss` | [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) | moderate | `<8.5.10` | PostCSS has XSS via Unescaped </style> in its CSS Stringify Output |
| `postcss` | [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) | high | `<=8.5.11` | PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments |
| `postcss` | [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) | moderate | `<=8.5.22` | PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset |
| `postcss` | [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | high | `<=8.5.17` | PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure |
| `sharp` | [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) | high | `<0.35.0` | sharp inherited vulnerabilities in libvips: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 |
| `sharp` | [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) | high | `<0.35.4` | sharp: Vulnerabilities in libheif: GHSA-g89c-p67h-r497 and GHSA-2jg2-4ch7-h545 |
| `sharp` | [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) | high | `<0.35.5` | sharp : Vulnerability in librsvg dependency CVE-2026-96889 |
| `source-map-js` | [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) | high | `>=1.0.0 <1.2.2` | source-map-js allows event-loop denial of service through indexed source-map section offsets |
| `tar` | [GHSA-vmf3-w455-68vh](https://github.com/advisories/GHSA-vmf3-w455-68vh) | moderate | `<=7.5.15` | node-tar applies PAX size override to intermediary GNU long-name/long-link headers, causing tar parser interpretation differential (file smuggling) |
| `tar` | [GHSA-w8wr-v893-vjvp](https://github.com/advisories/GHSA-w8wr-v893-vjvp) | moderate | `<=7.5.17` | node-tar: Process crash via PAX numeric path type confusion |
| `tar` | [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw) | critical | `<=7.5.18` | node-tar: Decompression/parse DoS via unlimited input |
| `tar` | [GHSA-8x88-c5mf-7j5w](https://github.com/advisories/GHSA-8x88-c5mf-7j5w) | high | `<=7.5.17` | node-tar: Negative tar entry size causes infinite loop in archive replace |
| `tar` | [GHSA-gvwx-54wh-qm9j](https://github.com/advisories/GHSA-gvwx-54wh-qm9j) | moderate | `<=7.5.16` | node-tar: Uncaught Exception DoS via NUL byte in PAX path/linkpath records |
| `tar` | [GHSA-r292-9mhp-454m](https://github.com/advisories/GHSA-r292-9mhp-454m) | high | `<=7.5.20` | node-tar: Uncontrolled recursion in mapHas/filesFilter allows uncatchable stack-overflow DoS via crafted long-path tar with member selection |
| `ws` | [GHSA-58qx-3vcg-4xpx](https://github.com/advisories/GHSA-58qx-3vcg-4xpx) | moderate | `>=8.0.0 <8.20.1` | ws: Uninitialized memory disclosure |
| `ws` | [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) | high | `>=8.0.0 <8.21.0` | ws: Memory exhaustion DoS from tiny fragments and data chunks |

## Notes

Severity is not treated as proof of exploitability. The direct Next.js production dependency is nevertheless the first priority because it contains multiple critical remote-code-execution advisory classes and many high-severity proxy, SSRF, cache, and denial-of-service advisories. Remaining transitive findings require the exposure distinctions above rather than blanket suppression.
