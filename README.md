# FabricLab

Free, open-source learning platform for HPC and AI data-centre networking — built for network engineers moving from enterprise environments into GPU cluster infrastructure.

**Live at [fabriclab.dev](https://fabriclab.dev)**

---

## What it is

FabricLab combines written chapters with a browser-based CLI simulator so you can read about a concept and immediately work through a realistic fault scenario. No VMs, no lab provisioning — just open a chapter and start learning.

- **20 chapters** — InfiniBand, RoCEv2, NCCL, congestion control, topology design, GPU generations, storage fabric, optics, BGP for AI fabrics, and more
- **12 interactive labs** — diagnose fabric faults using real CLI commands in a stateful terminal simulator
- **100+ React visualisations** — packet paths, congestion mechanics, cluster topologies, protocol stacks

All content is free to read. Sign in to sync progress and join chapter discussions.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Content | MDX + custom React visualisation components |
| Auth & database | Supabase (Postgres + Row Level Security) |
| Deployment | Vercel |
| Terminal emulator | xterm.js |

---

## Running locally

```bash
cd apps/web
npm install
cp .env.example .env.local
```

Fill in the Supabase values in `.env.local`, then:

```bash
npm run catalog:sync
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The platform runs in read-only mode without Supabase — chapters and labs are fully accessible, auth and progress sync are disabled.

### Environment variables

See `apps/web/.env.example` for the full list. The minimum required to run with auth:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | App origin (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |
| `SUPABASE_ADMIN_EMAILS` | Comma-separated admin email addresses |
| `AUTH_SESSION_SECRET` | Secret for session cookies |

OAuth (`GOOGLE_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_ID`, etc.) and community integrations are optional.

### Supabase setup

1. Create a Supabase project and set the site URL to `http://localhost:3000`.
2. Apply the migrations in order from `supabase/migrations/`.
3. Run `npm run catalog:sync` from `apps/web` to populate the content catalog.
4. Optionally configure Google and/or GitHub OAuth.

---

## Project layout

```
apps/web/
  app/                        Next.js routes
  content/chapters/           MDX chapter files
  content/catalog.json        chapter and lab metadata
  data/labs/                  lab scenario config
  components/visualisations/  React visualisation components
  lib/catalog/                catalog and access helpers
  lib/auth/                   server-side auth helpers
  lib/supabase/               database clients
supabase/migrations/          schema and RLS policies
```

---

## Contributing

Contributions are welcome — especially:

- technical corrections backed by primary references
- lab feedback from working network engineers
- UI and accessibility improvements
- new chapter or lab ideas

Open an issue or pull request at [g-arjuna/fabriclab](https://github.com/g-arjuna/fabriclab). For larger changes, open an issue first to discuss scope.

---

## License

MIT
