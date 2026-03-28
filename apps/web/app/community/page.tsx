import Link from "next/link";

import { getPublicCommunityConfig } from "@/lib/community/config";

function LinkCard({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 transition hover:border-white/20"
    >
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-400">{body}</p>
      <span className="mt-5 inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300">
        {cta}
      </span>
    </a>
  );
}

export default function CommunityPage() {
  const config = getPublicCommunityConfig();

  return (
    <main className="min-h-screen bg-[#020617] px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-sm text-cyan-300 transition hover:text-cyan-200">
            {"<- Back to FabricLab"}
          </Link>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/curriculum"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              Open curriculum
            </Link>
            <Link
              href="/lab"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              Open labs
            </Link>
          </div>
        </div>

        <header className="mt-10 max-w-4xl">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Community</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">
            Build FabricLab in the open
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            FabricLab is now positioned as a free public learning platform. The fastest way to make
            it better is to capture operator feedback directly on chapters and labs, keep the repo
            contribution-ready, and make support optional rather than mandatory.
          </p>
        </header>

        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">In-app feedback</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Comment on every chapter and lab</h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              Each published chapter and lab can host public discussion. Signed-in users can leave
              technical corrections, lab glitches, operator questions, and readability feedback
              directly on the content they are reviewing.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Contribution workflow</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Use the docs, then open focused changes</h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              The repo now includes contribution guidance, a code of conduct, and a roadmap for the
              highest-value fixes. Keep educational content changes scoped, cite primary sources for
              technical corrections, and prefer small PRs over giant rewrites.
            </p>
          </div>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {config.repoUrl ? (
            <LinkCard
              title="Repository"
              body="Browse the code, chapter plumbing, and platform docs."
              href={config.repoUrl}
              cta="Open repo"
            />
          ) : null}
          {config.issuesUrl ? (
            <LinkCard
              title="Issue tracker"
              body="Report reproducible bugs, broken routes, or contribution-sized improvements."
              href={config.issuesUrl}
              cta="Open issues"
            />
          ) : null}
          {config.discussionsUrl ? (
            <LinkCard
              title="Discussions"
              body="Share ideas, chapter requests, roadmap thoughts, and broader community feedback."
              href={config.discussionsUrl}
              cta="Open discussions"
            />
          ) : null}
          {config.supportUrl ? (
            <LinkCard
              title="Support FabricLab"
              body="Keep the platform free and help fund more lab realism, chapter polish, and review time."
              href={config.supportUrl}
              cta="Support"
            />
          ) : null}
        </section>

        {!config.repoUrl && !config.issuesUrl && !config.discussionsUrl && !config.supportUrl ? (
          <section className="mt-12 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-6">
            <p className="text-sm leading-7 text-amber-100">
              External community and support links are not configured yet. Set the optional
              `NEXT_PUBLIC_COMMUNITY_*` and `NEXT_PUBLIC_SUPPORT_URL` variables when you are ready
              to expose the public repo, issue tracker, discussion board, or donation page.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

