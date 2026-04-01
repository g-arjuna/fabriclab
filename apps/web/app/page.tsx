import Link from "next/link";
import type { ReactNode } from "react";

import { TerminalPreview } from "@/components/landing/TerminalPreview";
import { PublicTopNav } from "@/components/layout/PublicTopNav";
import { getHomepageCatalog } from "@/lib/catalog/homepage";
import { SOURCE_LABS } from "@/lib/catalog/source";

const GITHUB_URL = "https://github.com/g-arjuna/fabriclab";

const personas = [
  {
    title: "CCNP / CCIE engineers",
    body: "You can read BGP tables and design VxLAN fabrics. You have not spent time inside InfiniBand or RoCE yet. FabricLab is the transition path.",
  },
  {
    title: "HPC cluster administrators",
    body: "You manage the servers, but the fabric still feels opaque. FabricLab closes the gap between compute operations and network operations.",
  },
  {
    title: "Cloud and platform architects",
    body: "You are designing GPU infrastructure and need to understand what lossless fabrics demand at the protocol and operational level.",
  },
  {
    title: "Network engineers growing into AI infrastructure",
    body: "AI fabrics are a fast-moving specialisation. FabricLab gives you a structured path before the first production incident lands on your desk.",
  },
];

const learningLoop = [
  {
    title: "Structured chapters",
    body: "Connect hardware, transport behavior, congestion control, and operator workflow in one guided read.",
    accent: "border-white/10 bg-slate-900/70",
    icon: <BookIcon />,
  },
  {
    title: "Stateful CLI labs",
    body: "Commands read live lab state, so the simulator reacts to the exact fault you are tracing.",
    accent: "border-cyan-400/25 bg-cyan-400/10 shadow-[0_24px_80px_rgba(34,211,238,0.12)]",
    icon: <TerminalIcon />,
  },
  {
    title: "Community feedback",
    body: "Leave chapter notes, lab corrections, and platform issues right where the technical context lives.",
    accent: "border-white/10 bg-slate-900/70",
    icon: <BrainNetworkIcon />,
  },
];

const communityValues = [
  {
    title: "Comment where the issue appears",
    body: "Leave technical corrections, lab glitches, and operator notes directly on the relevant chapter or lab page.",
  },
  {
    title: "Contribute through the repo",
    body: "Fix a chapter, add a lab, or improve a visualisation through focused pull requests on GitHub.",
  },
  {
    title: "Free to read, forever",
    body: "Every chapter and lab is free to access. Sign in only when you want synced progress or discussion tools.",
  },
];

const homepageLabCount = SOURCE_LABS.length;

function SurfaceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-5 shadow-[0_22px_70px_rgba(2,6,23,0.35)] backdrop-blur sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function RackIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="10" y="8" width="28" height="10" rx="2" />
      <rect x="10" y="20" width="28" height="10" rx="2" />
      <rect x="10" y="32" width="28" height="10" rx="2" />
      <circle cx="16" cy="13" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="25" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="37" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 24c4 0 4-12 8-12s4 24 8 24 4-24 8-24 4 24 8 24 4-12 8-12" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="8" y="8" width="32" height="32" rx="6" />
      <path d="M8 20h32M8 30h32M20 8v32M30 8v32" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 10h18a6 6 0 0 1 6 6v20H18a6 6 0 0 0-6 6z" />
      <path d="M12 10v28a6 6 0 0 1 6-6h18" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="6" y="10" width="36" height="28" rx="5" />
      <path d="m14 20 6 5-6 5M24 30h10" />
    </svg>
  );
}

function BrainNetworkIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="16" cy="14" r="4" />
      <circle cx="32" cy="14" r="4" />
      <circle cx="14" cy="30" r="4" />
      <circle cx="34" cy="30" r="4" />
      <path d="M20 14h8M18 17l-2 9M30 17l2 9M18 30h12" />
    </svg>
  );
}

function ChapterIcon({ tag }: { tag: string }) {
  if (tag === "Foundations") return <RackIcon />;
  if (tag === "Operations") return <WaveIcon />;
  return <GridIcon />;
}

function tagClasses(tag: string) {
  if (tag === "Foundations") return "bg-slate-800 text-slate-300";
  if (tag === "Operations") return "bg-blue-950 text-blue-300";
  if (tag === "Infrastructure") return "bg-emerald-950 text-emerald-300";
  return "bg-purple-950 text-purple-300";
}

function partTag(partKey?: string) {
  if (partKey === "foundations") return "Foundations";
  if (partKey === "fabric-operations") return "Operations";
  if (partKey === "infrastructure") return "Infrastructure";
  return "Architecture";
}

export default async function Home() {
  const chapters = await getHomepageCatalog();
  const publishedCount = chapters.filter((chapter) => chapter.isPublished).length;

  const homepageChapterCards = chapters.map((chapter) => ({
    id: `Chapter ${chapter.number}`,
    title: chapter.title,
    tag: partTag(chapter.partKey),
    description: chapter.description,
    isPublished: chapter.isPublished,
    href: chapter.isPublished ? chapter.href : "/curriculum",
  }));

  const heroStats = [
    { value: `${publishedCount}`, label: "published chapters" },
    { value: `${homepageLabCount}`, label: "scenario labs" },
    { value: "Free", label: "public access model" },
  ];

  const gapStats = [
    { value: `${homepageLabCount}`, label: "scenario labs available in the simulator catalog" },
    { value: `${publishedCount}`, label: "chapters currently published in the open catalog" },
  ];

  return (
    <main className="bg-[#020617] text-slate-100">
      <PublicTopNav />

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at top left, rgba(34,211,238,0.18), transparent 36%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.14), transparent 26%), linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,1))",
          }}
        />
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(148,163,184,0.18) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:pb-24 lg:pt-18">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs uppercase tracking-[0.28em] text-cyan-200">
                <span className="h-2 w-2 rounded-full bg-cyan-300" />
                Open platform for AI fabric engineers
              </div>

              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-7xl">
                Learn the fabric
                <span className="mt-2 block text-cyan-400">that keeps AI clusters alive.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                InfiniBand. RoCEv2. RDMA. Congestion control. Scale-out fabric design. FabricLab
                teaches AI and HPC networking through interactive chapters, stateful labs, and a
                simulator built for network engineers.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/learn/ch0-hardware-foundations"
                  className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Start with Chapter 0
                </Link>
                <Link
                  href="/curriculum"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-slate-200 transition hover:border-white/30 hover:bg-white/8"
                >
                  Browse the curriculum
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                <Link
                  href="/community"
                  className="inline-flex items-center gap-2 text-cyan-300 transition hover:text-cyan-200"
                >
                  Join the discussion
                  <span>{"->"}</span>
                </Link>
                <Link
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 transition hover:text-slate-200"
                >
                  <GitHubIcon />
                  View the repo
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {heroStats.map((stat) => (
                  <SurfaceCard key={stat.label} className="p-4 sm:p-5">
                    <p className="text-2xl font-semibold text-white sm:text-3xl">{stat.value}</p>
                    <p className="mt-2 text-sm text-slate-400">{stat.label}</p>
                  </SurfaceCard>
                ))}
              </div>
            </div>

            <div className="relative">
              <TerminalPreview className="mt-4 max-w-none" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:gap-14">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">The gap</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              There is no Packet Tracer for HPC networking.
            </h2>
            <div className="mt-5 space-y-5 text-base leading-8 text-slate-300">
              <p>
                Network engineers who can troubleshoot BGP, reason about ECMP, and design VxLAN
                fabrics still walk into AI data centers and find an unfamiliar world. The knowledge
                is fragmented across vendor docs, conference talks, and incident writeups.
              </p>
              <p>
                FabricLab turns that scattered knowledge into a structured, open, community-reviewed
                platform. Chapters explain the hardware and protocols. Labs let you test commands
                against live state. Anyone can contribute a correction, a new lab, or a sharper
                explanation.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {gapStats.map((stat) => (
              <SurfaceCard key={stat.label} className="h-full">
                <div className="border-l-2 border-cyan-400 pl-4">
                  <p className="text-3xl font-semibold text-cyan-300 sm:text-4xl">{stat.value}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{stat.label}</p>
                </div>
              </SurfaceCard>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950/70 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Curriculum</p>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                A structured path from hardware to protocol.
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-400 sm:text-lg">
                {chapters.length} chapters. {homepageLabCount} scenario labs. One simulator. All
                chapters are free to read. Sign in when you want synced progress and discussion.
              </p>
            </div>
            <Link
              href="/curriculum"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-slate-200 transition hover:border-white/30 hover:bg-white/8"
            >
              Open the full curriculum
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {homepageChapterCards.map((card) => {
              const cardContent = (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <ChapterIcon tag={card.tag} />
                    <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] ${tagClasses(card.tag)}`}>
                      {card.tag}
                    </span>
                  </div>
                  <p className="mt-5 text-sm text-slate-500">{card.id}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{card.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-400">{card.description}</p>
                  <div className="mt-6 flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          card.isPublished ? "bg-emerald-400" : "bg-amber-400"
                        }`}
                      />
                      <span className={card.isPublished ? "text-emerald-300" : "text-amber-300"}>
                        {card.isPublished ? "Available now" : "Coming soon"}
                      </span>
                    </div>
                    <span className="text-slate-500">{card.isPublished ? "Read" : "Preview"}</span>
                  </div>
                </>
              );

              const className =
                "rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 shadow-[0_22px_70px_rgba(2,6,23,0.35)] transition hover:border-white/20";

              if (card.isPublished) {
                return (
                  <Link key={card.id} href={card.href} className={className}>
                    {cardContent}
                  </Link>
                );
              }

              return (
                <div key={card.id} className={`${className} opacity-90`}>
                  {cardContent}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">How it works</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              Three systems. One learning loop.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {learningLoop.map((item) => (
              <div
                key={item.title}
                className={`rounded-[1.9rem] border p-6 sm:p-8 ${item.accent}`}
              >
                {item.icon}
                <h3 className="mt-6 text-2xl font-semibold text-white">{item.title}</h3>
                <p className="mt-4 text-base leading-8 text-slate-400">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950/70 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Who this is for</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              Built by a network engineer, for network engineers.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {personas.map((persona) => (
              <SurfaceCard key={persona.title} className="h-full">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  {persona.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{persona.body}</p>
              </SurfaceCard>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Community</p>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                Open source. Community reviewed. Always free.
              </h2>
            </div>
            <Link
              href="/community"
              className="inline-flex items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm text-cyan-200 transition hover:border-cyan-400/35 hover:text-cyan-100"
            >
              Visit the community hub
            </Link>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {communityValues.map((value) => (
              <SurfaceCard key={value.title} className="h-full">
                <h3 className="text-xl font-semibold text-white">{value.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{value.body}</p>
                {value.title === "Contribute through the repo" ? (
                  <Link
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 text-sm text-cyan-300 transition hover:text-cyan-200"
                  >
                    <GitHubIcon />
                    g-arjuna/fabriclab
                  </Link>
                ) : null}
              </SurfaceCard>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20 pt-8 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div
            className="overflow-hidden rounded-[2rem] border border-cyan-400/20 p-6 shadow-[0_26px_80px_rgba(2,6,23,0.4)] sm:p-8 lg:p-12"
            style={{
              background:
                "radial-gradient(circle at top, rgba(34,211,238,0.12), transparent 36%), linear-gradient(180deg, rgba(15,23,42,0.95), rgba(2,6,23,0.98))",
            }}
          >
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Start learning</p>
                <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                  Learn the fabric in the open.
                </h2>
                <p className="mt-4 text-base leading-8 text-slate-300 sm:text-lg">
                  Every chapter is free to read. Sign in to track your progress, join chapter
                  discussions, and keep your learning history in one place.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  href="/learn/ch0-hardware-foundations"
                  className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Open Chapter 0
                </Link>
                <Link
                  href="/lab"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-slate-200 transition hover:border-white/30 hover:bg-white/8"
                >
                  Go to the labs
                </Link>
                <Link
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-6 py-3 text-sm text-cyan-200 transition hover:border-cyan-400/35 hover:text-cyan-100"
                >
                  <GitHubIcon />
                  View on GitHub
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
