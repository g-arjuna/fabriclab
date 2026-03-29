import Link from "next/link";
import type { ReactNode } from "react";

import { CommunityForum } from "@/components/community/CommunityForum";
import { getPublicCommunityConfig } from "@/lib/community/config";

function LinkCard({
  title,
  body,
  href,
  cta,
  icon,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
  icon: ReactNode;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 transition hover:border-white/20"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950 text-cyan-300">
        {icon}
      </div>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-400">{body}</p>
      <span className="mt-5 inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300">
        {cta}
      </span>
    </a>
  );
}

function RepositoryIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M12 .5C5.65.5.5 5.7.5 12.13c0 5.14 3.29 9.5 7.86 11.03.58.11.79-.26.79-.57 0-.28-.01-1.03-.02-2.03-3.2.71-3.88-1.57-3.88-1.57-.52-1.35-1.28-1.71-1.28-1.71-1.04-.73.08-.71.08-.71 1.15.08 1.75 1.2 1.75 1.2 1.02 1.78 2.68 1.27 3.33.97.1-.75.4-1.27.72-1.56-2.55-.3-5.24-1.3-5.24-5.76 0-1.27.45-2.3 1.18-3.12-.12-.3-.51-1.5.11-3.14 0 0 .97-.31 3.17 1.19a10.86 10.86 0 0 1 5.78 0c2.19-1.5 3.16-1.19 3.16-1.19.63 1.64.24 2.84.12 3.14.74.82 1.18 1.85 1.18 3.12 0 4.47-2.69 5.46-5.25 5.75.41.36.77 1.06.77 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.21.69.8.57A11.66 11.66 0 0 0 23.5 12.13C23.5 5.7 18.35.5 12 .5Z" />
    </svg>
  );
}

function IssueIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
      <circle cx="12" cy="12" r="8.5" strokeWidth="1.7" />
      <path d="M12 7.5v5.4" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="16.2" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DiscussionIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
      <path
        d="M6 6.5h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H11l-4.5 3v-3H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
      <path
        d="M12 20s-6.5-4.26-8.53-8.03C1.8 8.88 3.3 5.5 6.9 5.5c2.04 0 3.3 1.18 4.1 2.38.8-1.2 2.06-2.38 4.1-2.38 3.6 0 5.1 3.38 3.43 6.47C18.5 15.74 12 20 12 20Z"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
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
              icon={<RepositoryIcon />}
            />
          ) : null}
          {config.issuesUrl ? (
            <LinkCard
              title="Issue tracker"
              body="Report reproducible bugs, broken routes, or contribution-sized improvements."
              href={config.issuesUrl}
              cta="Open issues"
              icon={<IssueIcon />}
            />
          ) : null}
          {config.discussionsUrl ? (
            <LinkCard
              title="Discussions"
              body="Share ideas, chapter requests, roadmap thoughts, and broader community feedback."
              href={config.discussionsUrl}
              cta="Open discussions"
              icon={<DiscussionIcon />}
            />
          ) : null}
          {config.supportUrl ? (
            <LinkCard
              title="Support FabricLab"
              body="Keep the platform free and help fund more lab realism, chapter polish, and review time."
              href={config.supportUrl}
              cta="Support"
              icon={<SupportIcon />}
            />
          ) : null}
        </section>

        <CommunityForum />

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
