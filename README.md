# FabricLab

FabricLab is an interactive HPC / AI data centre networking learning platform for network
engineers moving from enterprise networking into AI cluster infrastructure.

The repo now combines:

- repo-backed chapter content and visualisations
- a state-driven lab simulator
- Supabase-backed learner data, release metadata, synced progress, community comments, and forum threads
- a Vercel-ready Next.js app in `apps/web`

## Repo status

- 17 chapter routes live (`Ch0-Ch16`)
- 12 interactive labs
- 119+ React visualisation components registered in `mdxComponents.ts`
- catalog-driven curriculum metadata in `apps/web/content/catalog.json`
- Supabase auth/access/release-control scaffolding in repo

## Access model

Current defaults:

- every published chapter is open
- every published lab is open
- sign-in is required for chapters and labs
- signed-in learners get synced progress plus community/admin features
- release controls still exist so unfinished content can stay unpublished

## Chapter status

| Ch | Slug | Title | Status |
|----|------|-------|--------|
| 0 | ch0-hardware-foundations | The Hardware Story | live |
| 1 | ch1-os-platforms | Operating Systems and Management Platforms | live |
| 2 | ch2-why-different | Why HPC Networking Is Different | live |
| 3 | ch3-the-cli | The CLI - Reading the Fabric | live |
| 4 | ch4-infiniband-operations | InfiniBand Operations | live |
| 5 | ch5-pfc-ecn-congestion | PFC, ECN, and Congestion Control | live |
| 6 | ch6-efficient-load-balancing | Efficient Load Balancing | live |
| 7 | ch7-topology-design | Topology Design | live |
| 8 | ch8-nccl-performance | NCCL - The Application Layer | live |
| 9 | ch9-optics-cabling | Optics, Cabling, and the Physical Layer | live |
| 10 | ch10-storage-fabric | The Storage Fabric | live |
| 11 | ch11-monitoring-telemetry | Monitoring, Telemetry, and Observability | live |
| 12 | ch12-nvlink-switch-system | Scale-Up Networking - NVLink Switch System | live |
| 13 | ch13-alternative-topologies | Alternative Topologies | live |
| 14 | ch14-gpu-hardware-generations | GPU Hardware Generations and Network Implications | live |
| 15 | ch15-ip-routing-ai-fabrics | IP Routing for AI/ML Fabrics | live |
| 16 | ch16-gpu-compute-network-packet-anatomy | The GPU Compute Network - Packet Anatomy | live |

## Labs

| Lab | Slug | Fault modelled |
|-----|------|----------------|
| 0 | lab0-failed-rail | Rail failure isolated to an err-disabled switch port |
| 1 | lab1-pfc-fix | PFC not enabled on the compute traffic class |
| 2 | lab2-congestion | Fabric congestion from missing ECN |
| 3 | lab3-uneven-spine | ECMP hot-spotting on spine uplinks |
| 4 | lab4-topology-sizing | Undersized fabric proposal and oversubscription analysis |
| 5 | lab5-nccl-diagnosis | NCCL transport fallback to sockets |
| 6 | lab6-alert-triage | Silent fabric degradation across UFM, DCGM, and switch telemetry |
| 7 | lab7-pause-storm | Hidden NIC-side pause storm caused by missing ECN |
| 8 | lab8-pfc-priority-mismatch | PFC enabled on the wrong traffic class |
| 9 | lab9-errdisable-recovery | Physical fault causing err-disable and rail recovery workflow |
| 10 | lab10-ecmp-hotspot | BGP Link Bandwidth community missing -> equal ECMP on reduced-capacity spine |
| 11 | lab11-bgp-path-failure | Different-ASN spines -> suboptimal 3-hop routing on link failure |

## Quickstart

```bash
cd apps/web
npm install
cp .env.example .env.local
```

Fill in the Supabase values in `apps/web/.env.local`, then:

```bash
npm run catalog:sync
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful routes:

- `/`
- `/curriculum`
- `/login`
- `/account`
- `/admin/releases`
- `/learn/ch0-hardware-foundations`
- `/lab?lab=lab0-failed-rail`

## Required environment variables

Defined in `apps/web/.env.example`:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ADMIN_EMAILS`
- `AUTH_SESSION_SECRET`
- `NEXT_PUBLIC_OAUTH_PROVIDERS` (optional, for example `google,github`)
- `GOOGLE_OAUTH_CLIENT_ID` (optional)
- `GOOGLE_OAUTH_CLIENT_SECRET` (optional)
- `GITHUB_OAUTH_CLIENT_ID` (optional)
- `GITHUB_OAUTH_CLIENT_SECRET` (optional)
- `AUTH_ENTRY_HOSTS` (optional, for example `auth.fabriclab.dev`)
- `NEXT_PUBLIC_COMMUNITY_REPO_URL` (optional)
- `NEXT_PUBLIC_COMMUNITY_ISSUES_URL` (optional)
- `NEXT_PUBLIC_COMMUNITY_DISCUSSIONS_URL` (optional)
- `NEXT_PUBLIC_SUPPORT_URL` (optional)
- `GITHUB_COMMUNITY_ISSUES_TOKEN` (optional, server-side issue mirroring)
- `GITHUB_COMMUNITY_ISSUE_LABELS` (optional, comma-separated labels for mirrored issues)

## Supabase setup

1. Create a Supabase dev project.
2. Set site URL to `http://localhost:3000`.
3. Apply the SQL in `supabase/migrations/20260328_001_auth_access_release_control.sql`.
4. Apply the SQL in `supabase/migrations/20260329_002_community_comments.sql`.
5. Apply the SQL in `supabase/migrations/20260329_003_community_forum_threads.sql`.
6. Run `npm run catalog:sync` from `apps/web`.
7. Configure Google and/or GitHub OAuth clients for the FabricLab-owned callback routes if you want live sign-in.

## Community setup

FabricLab now supports two community surfaces:

- in-app chapter and lab comment threads
- in-app chapter and lab tracked discussions with optional GitHub issue mirroring
- an in-app general forum at `/community`
- optional external links for repo, issues, discussions, and support

If you want general forum threads to optionally create matching GitHub issues, set:

- `GITHUB_COMMUNITY_ISSUES_TOKEN`
- `GITHUB_COMMUNITY_ISSUE_LABELS`

The token should be a GitHub token that can create issues in the FabricLab repository. For a
fine-grained personal access token, grant repository access to `g-arjuna/fabriclab` and enable
`Issues: Read and write`. The GitHub target is derived from
`NEXT_PUBLIC_COMMUNITY_REPO_URL`.

If you want to expose public community destinations, set the optional `NEXT_PUBLIC_COMMUNITY_*`
and `NEXT_PUBLIC_SUPPORT_URL` variables in `apps/web/.env.local` and in Vercel.

If you enable first-party OAuth providers, set `NEXT_PUBLIC_OAUTH_PROVIDERS`
to a comma-separated list such as `google,github` so the login page can show the corresponding buttons.

## Project structure

```text
apps/web/
  app/                        Next.js routes
  content/chapters/           MDX chapter files
  content/catalog.json        chapter/lab metadata and default release settings
  data/labs/                  lab scenario configuration
  components/visualisations/  React visualisation components
  components/terminal/        xterm.js multi-device terminal
  components/topology/        topology views
  components/auth/            auth/session client UI
  lib/catalog/                shared catalog + access helpers
  lib/auth/                   server-side viewer/admin helpers
  lib/supabase/               browser/server/admin clients
  lib/progress/               remote progress sync helpers
  lib/mdxComponents.ts        MDX component registry
supabase/migrations/          schema and RLS
```

## Release workflow

Content remains git-driven:

1. Claude writes content artifacts
2. Codex deploys/integrates them
3. update `apps/web/content/catalog.json` for any new chapter/lab
4. run `npm run catalog:sync`
5. verify locally / on preview
6. publish from `/admin/releases` when the content is ready

This prevents unfinished weekly content drops from automatically going live.

## Validation

```bash
apps/web/node_modules/.bin/tsc --noEmit --project apps/web/tsconfig.json
```

## Two-agent workflow

- Claude owns educational content, MDX prose, lab narrative, and visualisation teaching logic
- Codex owns platform engineering, integration, auth, release control, deployment plumbing,
  registries, image placement, and browser QA
