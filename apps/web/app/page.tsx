import Link from "next/link";

import { AuthControls } from "@/components/auth/AuthControls";
import { TerminalPreview } from "@/components/landing/TerminalPreview";
import { getHomepageCatalog } from "@/lib/catalog/homepage";
import { SOURCE_CHAPTERS, SOURCE_LABS } from "@/lib/catalog/source";

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

const homepageChapterCount = SOURCE_CHAPTERS.length;
const homepageLabCount = SOURCE_LABS.length;

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
  if (tag === "Foundations") return "bg-slate-800 text-slate-400";
  if (tag === "Operations") return "bg-blue-950 text-blue-400";
  if (tag === "Infrastructure") return "bg-green-950 text-green-400";
  return "bg-purple-950 text-purple-400";
}

function partTag(partKey?: string) {
  if (partKey === "foundations") return "Foundations";
  if (partKey === "fabric-operations") return "Operations";
  if (partKey === "infrastructure") return "Infrastructure";
  return "Architecture";
}

export default async function Home() {
  const chapters = await getHomepageCatalog();

  const homepageChapterCards = chapters.map((chapter) => ({
    id: `Chapter ${chapter.number}`,
    title: chapter.title,
    tag: partTag(chapter.partKey),
    description: chapter.description,
    isPublished: chapter.isPublished,
    href: chapter.isPublished ? chapter.href : "/curriculum",
  }));

  return (
    <main className="bg-[#020617] text-slate-100">
      <nav className="fixed inset-x-0 top-0 z-50 h-16 border-b border-white/8 bg-slate-950/65 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="font-mono text-sm uppercase tracking-[0.32em] text-cyan-400">FABRICLAB</span>
            <span className="text-slate-600">/</span>
            <span className="rounded-full border border-white/10 bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-[0.28em] text-slate-400">
              Community beta
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/curriculum" className="text-sm text-slate-400 transition hover:text-slate-200">
              Curriculum
            </Link>
            <Link href="/lab" className="text-sm text-slate-400 transition hover:text-slate-200">
              Labs
            </Link>
            <Link href="/community" className="text-sm text-slate-400 transition hover:text-slate-200">
              Community
            </Link>
            <AuthControls compact />
            <Link
              href="/learn/ch0-hardware-foundations"
              className="rounded-full bg-cyan-400 px-4 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Start learning
            </Link>
          </div>
        </div>
      </nav>

      <section
        className="relative flex min-h-screen items-center overflow-hidden px-6 pb-16 pt-28"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(56,189,248,0.15), transparent), #020617",
        }}
      >
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(148,163,184,0.15) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-950/50 to-transparent" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
            OPEN PLATFORM / HPC NETWORKING / COMMUNITY REVIEWED
          </p>
          <h1 className="mt-8 text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            <span className="block">Master the fabric</span>
            <span className="mt-2 block text-cyan-400">that runs AI.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-center text-lg leading-8 text-slate-400">
            InfiniBand. RoCEv2. RDMA. DGX SuperPOD. Spectrum-X. Learn AI and HPC networking through
            interactive chapters, stateful labs, and a simulator built for network engineers.
            Sign in once, then keep your progress and discussion history attached to one account.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/learn/ch0-hardware-foundations"
              className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Open Chapter 0
            </Link>
            <Link
              href="/curriculum"
              className="rounded-full border border-white/20 px-6 py-3 text-sm text-slate-300 transition hover:border-white/40"
            >
              Explore the curriculum
            </Link>
            <Link
              href="/community"
              className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-6 py-3 text-sm text-cyan-300 transition hover:border-cyan-500/50 hover:text-cyan-200"
            >
              Join the community
            </Link>
          </div>

          <TerminalPreview />

          <p className="mt-8 animate-bounce text-xs text-slate-600">scroll to explore</p>
        </div>
      </section>

      <section className="bg-slate-950 py-24">
        <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">THE GAP</p>
            <h2 className="mt-4 text-4xl font-semibold text-white">
              There is no Packet Tracer for HPC networking.
            </h2>
            <div className="mt-6 space-y-6 text-base leading-8 text-slate-300">
              <p>
                Network engineers who can troubleshoot BGP, reason about ECMP, and design VxLAN
                fabrics still walk into AI data centers and find an unfamiliar world. The knowledge
                is fragmented across vendor docs, conference talks, and incident writeups.
              </p>
              <p>
                FabricLab turns that scattered knowledge into a structured, reviewable, interactive
                platform. Chapters explain the hardware and protocols. Labs let you test commands
                against live state. The community can then sharpen both.
              </p>
            </div>
          </div>

          <div className="grid gap-6">
            {[
              { value: "400G", label: "per GPU rail in a modern DGX training fabric" },
              { value: "0", label: "packet drops tolerated in healthy RDMA training flows" },
              { value: "17", label: "published chapters live in the open catalog today" },
            ].map((stat) => (
              <div
                key={stat.value}
                className="rounded-2xl border border-white/8 bg-slate-900 p-6 shadow-2xl shadow-slate-950/50"
              >
                <div className="border-l-2 border-cyan-400 pl-5">
                  <p className="text-4xl font-semibold text-cyan-400">{stat.value}</p>
                  <p className="mt-2 text-sm text-slate-400">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">CURRICULUM</p>
          <h2 className="mt-4 text-4xl font-semibold text-white">
            A structured path from hardware to protocol.
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-400">
            {homepageChapterCount} chapters. {homepageLabCount} scenario labs. One simulator. Browse
            the catalog in public, then sign in to open the learning surfaces.
          </p>

          <div className="mt-10 flex gap-6 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible">
            {homepageChapterCards.map((card) => {
              const cardContent = (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <ChapterIcon tag={card.tag} />
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${tagClasses(card.tag)}`}>
                      {card.tag}
                    </span>
                  </div>
                  <p className="mt-6 text-sm text-slate-500">{card.id}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{card.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-400">{card.description}</p>
                  <div className="mt-6 flex items-center gap-2 text-sm">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        card.isPublished ? "bg-green-500" : "bg-amber-400"
                      }`}
                    />
                    <span className={card.isPublished ? "text-green-400" : "text-amber-300"}>
                      {card.isPublished ? "Available" : "Staged"}
                    </span>
                  </div>
                </>
              );

              if (card.isPublished) {
                return (
                  <Link
                    key={card.id}
                    href={card.href}
                    className="min-w-[280px] rounded-2xl border border-white/8 bg-slate-900 p-6 shadow-2xl shadow-slate-950/50 transition hover:border-white/20"
                  >
                    {cardContent}
                  </Link>
                );
              }

              return (
                <div
                  key={card.id}
                  className="min-w-[280px] rounded-2xl border border-white/8 bg-slate-900 p-6 opacity-85 shadow-2xl shadow-slate-950/50"
                >
                  {cardContent}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">HOW IT WORKS</p>
          <h2 className="mt-4 text-4xl font-semibold text-white">Three systems. One learning loop.</h2>

          <div className="mt-10 grid gap-8 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-slate-900 p-8 shadow-2xl shadow-slate-950/50">
              <BookIcon />
              <h3 className="mt-6 text-2xl font-semibold text-white">Structured chapters</h3>
              <p className="mt-4 text-base leading-8 text-slate-400">
                Each chapter connects physical hardware, transport behavior, congestion control, and
                operator workflow into one narrative with visual support.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-500/30 bg-slate-900 p-8 shadow-2xl shadow-cyan-950/25 ring-1 ring-cyan-500/20">
              <TerminalIcon />
              <h3 className="mt-6 text-2xl font-semibold text-white">Stateful CLI labs</h3>
              <p className="mt-4 text-base leading-8 text-slate-400">
                The simulator is not static text. Commands read live lab state, so outputs change as
                you diagnose faults, fix configuration, or recover links.
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-slate-900 p-8 shadow-2xl shadow-slate-950/50">
              <BrainNetworkIcon />
              <h3 className="mt-6 text-2xl font-semibold text-white">Community feedback loop</h3>
              <p className="mt-4 text-base leading-8 text-slate-400">
                Readers can comment directly on chapters and labs, report technical glitches, and
                help tighten the curriculum without waiting for a closed release cycle.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">WHO THIS IS FOR</p>
          <h2 className="mt-4 text-4xl font-semibold text-white">
            Built by a network engineer, for network engineers.
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {personas.map((persona) => (
              <div
                key={persona.title}
                className="rounded-2xl border border-white/8 bg-slate-900 p-6 shadow-2xl shadow-slate-950/50"
              >
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                  {persona.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">{persona.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">COMMUNITY</p>
          <h2 className="mt-4 text-4xl font-semibold text-white">
            Keep the platform open. Make it sharper every week.
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-slate-900 p-6 shadow-2xl shadow-slate-950/50">
              <h3 className="text-xl font-semibold text-white">Comment where the issue appears</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Leave technical corrections, lab glitches, and operator notes directly on the
                relevant chapter or lab page.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-slate-900 p-6 shadow-2xl shadow-slate-950/50">
              <h3 className="text-xl font-semibold text-white">Contribute through the repo</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                The repository is set up for focused fixes, issue reports, new labs, and chapter
                improvements without turning the platform into a private product wall.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-slate-900 p-6 shadow-2xl shadow-slate-950/50">
              <h3 className="text-xl font-semibold text-white">Support without restricting access</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                FabricLab stays openly accessible. Support links are optional and simply help fund
                more chapter review, better labs, and platform polish.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div
            className="mx-auto max-w-3xl rounded-3xl border border-cyan-500/20 p-12 text-center shadow-2xl shadow-slate-950/50"
            style={{
              background:
                "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(56,189,248,0.08), transparent), #0f172a",
            }}
          >
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">START LEARNING</p>
            <h2 className="mt-4 text-4xl font-semibold text-white">
              Learn the fabric in the open.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-400">
              Browse the catalog in public, then sign in to open chapters and labs, join tracked
              discussions, and keep your progress attached to one account.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/learn/ch0-hardware-foundations"
                className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Open Chapter 0
              </Link>
              <Link
                href="/lab"
                className="rounded-full border border-white/20 px-6 py-3 text-sm text-slate-300 transition hover:border-white/40"
              >
                Go to the labs
              </Link>
              <Link
                href="/community"
                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-6 py-3 text-sm text-cyan-300 transition hover:border-cyan-500/50 hover:text-cyan-200"
              >
                Community hub
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
