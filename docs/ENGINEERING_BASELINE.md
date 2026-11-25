# FabricLab engineering baseline

Date: 2026-11-25  
Machine: new Ubuntu recovery workstation  
Branch under test: `feat/rdma-runtime-recovery` based on `origin/preview` commit `1380424f59e9e65cd8b66d1aaee78b011439d2d8`

This document is an evidence inventory, not a broad repair plan. It records
baseline behaviour and prioritises follow-up issues without mixing unrelated
application fixes into the RDMA runtime PR.

## 1. Workstation and repository baseline

| Item | Observed value |
|---|---|
| Host OS | Ubuntu 24.04.5 LTS |
| Host kernel | 7.0.0-44-generic |
| CPU | Intel i7-3632QM, x86_64, 4 cores/8 threads, VT-x |
| RAM/storage | 15 GiB RAM; about 193 GiB free on root initially |
| Virtualisation | `/dev/kvm` present; `kvm_intel` loaded |
| Docker | Docker 27.5.1; Compose v5.8.0 |
| Containerlab | 0.83.0 |
| Git/GitHub | Git 2.43.0; `gh` authenticated as `g-arjuna` with repo/workflow scopes |
| Python | 3.12.3 |
| Node | Node v24.22.3 and npm 11.19.1 installed through existing `fnm` |
| Host RDMA tools | `rdma` and `rdma_rxe` module present; `ibv_devices`/`rxe_cfg` absent |

The existing checkout at `/home/devbox/src/fabriclab` was retained. No files
from the handoff commit were missing. The handoff commit is present on
`origin/preview` and contains the ten original `labs/rdma-basics` files.

## 2. Web application baseline

Commands run from `apps/web` after `npm ci`:

| Check | Result | Evidence/notes |
|---|---|---|
| `node_modules/.bin/tsc --noEmit --project tsconfig.json` | PASS | exit 0 |
| `npm run build` | PASS | Next.js 16.2.3/Turbopack production build completed |
| `/` | PASS | HTTP 200 from local dev server |
| `/curriculum` | PASS | HTTP 200 |
| `/learn/ch0-hardware-foundations` | PASS | HTTP 200 |
| `/lab` | PASS | HTTP 200 |
| `/module/rocev2/lab` | PASS redirect | HTTP 307; route compatibility redirect, not a failure |
| Playwright guest smoke | FAIL | Chromium ran after installation, but the test still expects the stale heading `Master the fabric`; actual H1 is `Learn the fabric that keeps AI clusters alive.` |
| Authenticated/admin/progress/community tests | SKIPPED | require a dedicated Supabase test project and service-role credentials; must not run against production |

`npm ci` completed but reported 9 dependency vulnerabilities (1 moderate, 6
high, 2 critical). It also warned that install scripts for `@tailwindcss/oxide`
and `sharp` were not covered by `allowScripts`. These are pre-existing baseline
concerns; no dependency update was attempted in this task.

No production Supabase administrative credential was used. Community feedback
stored only in production is therefore unavailable to this baseline. Required
for future triage: either a read-only/exported feedback snapshot or a dedicated
test Supabase project containing representative feedback.

## 3. Content and catalog inventory

`apps/web/content/catalog.json` currently contains:

- 28 chapter entries (`ch0` through `ch27`), all marked `free` and preview-enabled; 17 are default-published.
- 21 lab entries, all marked `free` and preview-enabled; 14 are default-published.
- 22 TypeScript lab scenario files under `apps/web/data/labs/` (including `solutionGuides.ts`).

Lab slugs currently in the source catalog: `lab0a-fabric-cli-orientation`,
`lab0b-roce-counter-reading`, `lab0-failed-rail`, `lab1-pfc-fix`,
`lab2-congestion`, `lab3-uneven-spine`, `lab4-topology-sizing`,
`lab5-nccl-diagnosis`, `lab6-alert-triage`, `lab7-pause-storm`,
`lab8-pfc-priority-mismatch`, `lab9-errdisable-recovery`, `lab10-ecmp-hotspot`,
`lab11-bgp-path-failure`, `lab14-srv6-te-path-steering`,
`lab15-rdma-rkey-exposure`, `lab16-spectrum-x-platform-audit`,
`lab17-roce-day-zero-config`, `lab18-ecn-threshold-tuning`,
`lab19-adaptive-routing-imbalance`, `lab20-evpn-tenant-leak`.

The README still claims 20 chapters and 12 labs; the deployment smoke test
still expects the text `17 chapters. 12 scenario labs.` Both are stale relative
to the source catalog.

## 4. RDMA practical-lab baseline and progress

The original handoff correctly identified that the committed Containerlab
implementation was not proven. In this recovery session:

1. Containerlab nodes were built and Experiment A eventually reached RTS.
2. SEND/RECEIVE could not complete across host-kernel network namespaces on the
   workstation kernel; the sender hit retry exhaustion and no valid RoCE data
   plane was established. This was not accepted as success.
3. Kernel research showed that important RXE network-namespace fixes land only
   in newer kernels than this host's 7.0-series kernel. The implementation was
   therefore pivoted to two kernel-isolated KVM/QEMU Ubuntu guests packaged in
   a Docker helper.
4. In the VM architecture all four experiments passed with real Pyverbs and
   `rdma_rxe`: resource creation, SEND/RECEIVE, RDMA WRITE, and RDMA READ.
5. Real UDP/4791 pcaps were captured on the isolated data interface. Wireshark
   decodes were correlated with application QPN, PSN, RETH virtual address,
   RKEY, and length. Evidence is under `labs/rdma-basics/evidence/reference-run/`.

This satisfies the first runtime milestone, but the `/practical/rdma` React
frontend has deliberately not been started.

## 5. Evidence-backed issue inventory

Priority definitions: P0 critical functionality or serious technical
misinformation; P1 broken user-facing functionality or significant content
errors; P2 usability/presentation/documentation; P3 enhancement.

### P0 — Chapter 16 incorrectly describes ordinary RDMA WRITE target completion

Observation: `apps/web/content/chapters/ch16-gpu-compute-network-packet-anatomy.mdx`
states that when the last RDMA WRITE segment is received, the destination HCA
posts a completion entry to the destination's Completion Queue and NCCL sees
that completion. This is materially wrong for an ordinary RDMA WRITE: no remote
receive WR is consumed and no normal receive CQE is generated on the target.
The new `exp_c_write.py` demonstrates this directly: the target polled zero
CQEs while verifying that memory changed.

Proposed next step: correct the chapter in a focused content PR, explaining
sender completion versus target memory update and the optional immediate-data /
write-with-imm distinction.

### P1 — Chapter 25 has extensive UTF-8 mojibake

Observation: `apps/web/content/chapters/ch25-roce-configuration-operations.mdx`
contains sequences such as `â€”`, `â†’`, `Ã—`, `Âµs`, and `â‰ˆ`, indicating
double-decoded UTF-8. This affects headings, formulas, tables, and technical
instructions.

Proposed next step: mechanically repair encoding in a standalone content PR,
then manually review formulas and units because some characters are semantic.

### P1 — Lab 15 terminology and mechanism need expert review

Observation: Lab 15 teaches RKEY exposure/isolation, but multiple statements
need scrutiny:

- RKEY entropy/rotation is presented as though values can be relied on to be
  high-entropy and checked by numeric range; kernel/providers do not generally
  offer that semantic guarantee.
- `ibv_reg_mr rotate` appears lab-simulated and should not be confused with the
  real verbs API.
- Host-side “GID filtering” needs precise implementation terminology; a GID is
  an address/identifier, not by itself a general host access-control primitive.
- PKey partition terminology is InfiniBand-specific and should not be blurred
  with RoCEv2/VRF isolation without explicit qualification.
- MR access permissions (`IBV_ACCESS_REMOTE_READ`, `REMOTE_WRITE`, etc.) are not
  clearly separated from RKEY secrecy and QP connectivity.

Proposed next step: revise the lab using the now-working Pyverbs reference
implementation as the technical baseline; clearly separate simulation-only
commands from real commands.

### P1 — Authenticated browser tests are unsafe without a dedicated environment

Observation: Playwright helpers require `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, and a smoke user; they can create users and mutate
entitlement/progress/notification state. No local `.env.local` exists. Running
these tests against production would violate operational safety.

Proposed next step: create a disposable Supabase test project or local Supabase
configuration, document required non-production secrets, and mark tests by
environment type.

### P2 — README and deployment smoke assertions are stale

Observation: README claims 20 chapters/12 labs; catalog contains 28 chapters/21
labs. `tests/deploy.smoke.spec.ts` expects heading text `Master the fabric` and
`17 chapters. 12 scenario labs.` The actual homepage H1 is `Learn the fabric
that keeps AI clusters alive.`, while the page displays 17 published chapters
and 21 scenario labs in its summary cards. The guest smoke test therefore fails
before reaching later assertions. This is documentation/test drift rather than
proof of a rendering defect.

Proposed next step: derive counts from catalog data or update the assertions in
a small documentation/test PR.

### P2 — No established GitHub Actions validation pipeline

Observation: `.github` exists but there is no validated CI pipeline established
in this baseline for install, typecheck, build, catalog consistency, encoding
checks, or safe smoke tests.

Proposed next step: add a minimal CI workflow that runs `npm ci`, TypeScript,
and production build first; add browser/RDMA integration jobs separately
because they need browsers/KVM/non-production credentials.

### P2 — Dependency vulnerability and install-script warnings

Observation: `npm ci` reports 9 vulnerabilities and blocked/uncovered install
scripts for native assets. No exploit path was assessed in this task.

Proposed next step: run `npm audit` in a maintenance task, upgrade deliberately,
and decide whether `allowScripts` should cover required native packages.

### P2 — Community feedback unavailable without production access

Observation: GitHub issues #3/#4 are closed smoke/probe artifacts; issue #6 is
the active RDMA practical tracking issue. No authorised non-production source
of community feedback was available.

Proposed next step: provide a read-only export or dedicated development
Supabase project. Do not use production service credentials for inventory.

### P3 — RDMA frontend implementation

Observation: issue #6 ultimately asks for `/practical/rdma`. The runtime and
evidence now exist, but the browser experience is not started.

Proposed next step: after the focused runtime PR is reviewed, implement the
frontend around the committed event logs and packet analysis rather than around
mock protocol behaviour.

## 6. Recommended next maintenance task

Fix the Chapter 16 RDMA WRITE completion explanation first. It is a small,
high-value correction of serious technical misinformation and can now cite a
reproducible experiment and packet capture. Keep it separate from the RDMA
runtime PR.
