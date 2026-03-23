"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const GITHUB_URL = "https://github.com/g-arjuna/fabriclab";

const TERMINAL_LINES = [
  { text: "fabric-sim:~$ show dcb pfc", color: "#e2e8f0", isPrompt: true },
  { text: "Interface eth0", color: "#94a3b8", isPrompt: false },
  { text: "  Priority Flow Control:  enabled", color: "#94a3b8", isPrompt: false },
  { text: "  PFC enabled priorities: 3 (cos3)", color: "#94a3b8", isPrompt: false },
  { text: "  Watchdog:               enabled", color: "#22d3ee", isPrompt: false },
  { text: "", color: "", isPrompt: false },
  { text: "fabric-sim:~$ disable pfc", color: "#e2e8f0", isPrompt: true },
  { text: "PFC disabled on eth0. Verify with: show dcb pfc", color: "#22c55e", isPrompt: false },
];

const chapterCardsLegacy = [
  {
    id: "Chapter 0",
    title: "The Hardware Story",
    tag: "Foundations",
    description:
      "DGX anatomy, NVLink, NICs vs HCAs vs DPUs, rail topology, the three networks.",
    status: "Available",
    href: "/learn/ch0-hardware-foundations",
  },
  {
    id: "Chapter 1",
    title: "OS and Management",
    tag: "Foundations",
    description:
      "DGX OS, ONYX, UFM, first power-on sequence. What runs where and how to access it.",
    status: "Available",
    href: "/learn/ch1-os-platforms",
  },
  {
    id: "Chapter 2",
    title: "Why HPC Networking Is Different",
    tag: "Foundations",
    description:
      "The AllReduce barrier, why TCP fails, lossless requirements, the mental model shift.",
    status: "Available",
    href: "/learn/ch2-why-different",
  },
  {
    id: "Chapter 3",
    title: "The CLI — Reading the Fabric",
    tag: "Foundations",
    description:
      "The commands and discipline for reading HPC fabric state. Which commands run where, how to read their output, and the investigation workflow from physical layer to configuration.",
    status: "Available",
    href: "/learn/ch3-the-cli",
  },
  {
    id: "Chapter 4",
    title: "InfiniBand Operations",
    tag: "Foundations",
    description:
      "ONYX CLI, ibdiagnet, UFM, error counter interpretation, and Subnet Manager operations.",
    status: "Available",
    href: "/learn/ch4-infiniband-operations",
  },
  {
    id: "Chapter 5",
    title: "PFC, ECN, and Congestion Control",
    tag: "Foundations",
    description:
      "How losslessness actually works: PFC mechanics, pause storms, ECN marking, DCQCN, and the full RoCEv2 configuration checklist.",
    status: "Available",
    href: "/learn/ch5-pfc-ecn-congestion",
  },
  {
    id: "Chapter 6",
    title: "Topology Design",
    tag: "Architecture",
    description:
      "Fat-tree, DragonFly+, DGX BasePOD, DGX SuperPOD — designing the fabric.",
    status: "Coming soon",
    href: "/curriculum",
  },
];

const chapterCards = [
  {
    id: "Chapter 0",
    title: "The Hardware Story",
    tag: "Foundations",
    description:
      "DGX anatomy, NVLink, NICs vs HCAs vs DPUs, rail topology, the three networks.",
    status: "Available",
    href: "/learn/ch0-hardware-foundations",
  },
  {
    id: "Chapter 1",
    title: "OS and Management",
    tag: "Foundations",
    description:
      "DGX OS, ONYX, UFM, first power-on sequence. What runs where and how to access it.",
    status: "Available",
    href: "/learn/ch1-os-platforms",
  },
  {
    id: "Chapter 2",
    title: "Why HPC Networking Is Different",
    tag: "Foundations",
    description:
      "The AllReduce barrier, why TCP fails, lossless requirements, the mental model shift.",
    status: "Available",
    href: "/learn/ch2-why-different",
  },
  {
    id: "Chapter 3",
    title: "The CLI — Reading the Fabric",
    tag: "Foundations",
    description:
      "The commands and discipline for reading HPC fabric state. Which commands run where, how to read their output, and the investigation workflow from physical layer to configuration.",
    status: "Available",
    href: "/learn/ch3-the-cli",
  },
  {
    id: "Chapter 4",
    title: "InfiniBand Operations",
    tag: "Foundations",
    description:
      "ONYX CLI, ibdiagnet, UFM, error counter interpretation, and Subnet Manager operations.",
    status: "Available",
    href: "/learn/ch4-infiniband-operations",
  },
  {
    id: "Chapter 5",
    title: "PFC, ECN, and Congestion Control",
    tag: "Foundations",
    description:
      "How losslessness actually works: PFC mechanics, pause storms, ECN marking, DCQCN, and the full RoCEv2 configuration checklist.",
    status: "Available",
    href: "/learn/ch5-pfc-ecn-congestion",
  },
  {
    id: "Chapter 6",
    title: "Topology Design",
    tag: "Architecture",
    description:
      "Fat-tree, DragonFly+, DGX BasePOD, DGX SuperPOD — designing the fabric.",
    status: "Coming soon",
    href: "/curriculum",
  },
];

void chapterCardsLegacy;

const personas = [
  {
    title: "CCNP / CCIE engineers",
    body: "You can read BGP tables and design VxLAN fabrics. You have never touched InfiniBand. This is your on-ramp.",
  },
  {
    title: "HPC cluster administrators",
    body: "You manage the servers. The network team handles the fabric. This platform closes the gap so you understand the full stack.",
  },
  {
    title: "Cloud architects",
    body: "You are designing GPU cluster infrastructure. You need to understand why lossless networking is non-negotiable and what it costs to get wrong.",
  },
  {
    title: "Network engineering students",
    body: "HPC fabric engineering is one of the fastest-growing specialisations in infrastructure. Get ahead of the curve before you need it.",
  },
];

function TerminalPreview() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) {
      const timeoutId = window.setTimeout(() => {
        setVisibleLines(0);
        setCurrentChar(0);
        setIsPaused(false);
      }, 3000);

      return () => window.clearTimeout(timeoutId);
    }

    const intervalId = window.setInterval(() => {
      setVisibleLines((currentVisibleLines) => {
        if (currentVisibleLines >= TERMINAL_LINES.length) {
          return currentVisibleLines;
        }

        const line = TERMINAL_LINES[currentVisibleLines];

        setCurrentChar((currentCurrentChar) => {
          if (currentCurrentChar < line.text.length) {
            return currentCurrentChar + 1;
          }

          if (currentVisibleLines + 1 >= TERMINAL_LINES.length) {
            setIsPaused(true);
          }

          window.setTimeout(() => {
            setVisibleLines(currentVisibleLines + 1);
            setCurrentChar(0);
          }, 0);

          return currentCurrentChar;
        });

        return currentVisibleLines;
      });
    }, 25);

    return () => window.clearInterval(intervalId);
  }, [isPaused]);

  return (
    <div className="mt-12 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f1a] text-left shadow-2xl shadow-slate-950/50">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-2 w-2 rounded-full bg-rose-400" />
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="ml-3 text-xs text-slate-500">FabricLab CLI</span>
      </div>
      <div className="h-48 space-y-1 p-4 font-mono text-sm">
        {TERMINAL_LINES.map((line, index) => {
          if (index < visibleLines) {
            return (
              <div key={`${line.text}-${index}`} style={{ color: line.color || "#94a3b8" }}>
                {line.text || "\u00A0"}
              </div>
            );
          }

          if (index === visibleLines && !isPaused) {
            const partialText = line.text.slice(0, currentChar);

            return (
              <div key={`${line.text}-${index}`} style={{ color: line.color || "#94a3b8" }}>
                {partialText}
                <span className="inline-block h-4 w-2 translate-y-0.5 bg-cyan-400 align-middle animate-[blink_0.5s_steps(1)_infinite]" />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
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
  if (tag === "Foundations") {
    return <RackIcon />;
  }

  if (tag === "RoCEv2") {
    return <WaveIcon />;
  }

  return <GridIcon />;
}

function tagClasses(tag: string) {
  if (tag === "Foundations") {
    return "bg-slate-800 text-slate-400";
  }

  if (tag === "RoCEv2") {
    return "bg-blue-950 text-blue-400";
  }

  if (tag === "Operations") {
    return "bg-green-950 text-green-400";
  }

  return "bg-purple-950 text-purple-400";
}

export default function Home() {
  return (
    <main className="bg-[#020617] text-slate-100">
      <style jsx global>{`
        @keyframes blink {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0;
          }
        }
      `}</style>

      <nav className="fixed inset-x-0 top-0 z-50 h-16 border-b border-white/8 bg-slate-950/65 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="font-mono text-sm uppercase tracking-[0.32em] text-cyan-400">FABRICLAB</span>
            <span className="text-slate-600">·</span>
            <span className="rounded-full border border-white/10 bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-[0.28em] text-slate-400">
              Beta
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/curriculum" className="text-sm text-slate-400 transition hover:text-slate-200">
              Curriculum
            </Link>
            <Link href="/lab" className="text-sm text-slate-400 transition hover:text-slate-200">
              Lab
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-slate-400 transition hover:text-slate-200"
            >
              GitHub
            </a>
            <Link
              href="/learn/ch0-hardware-foundations"
              className="rounded-full bg-cyan-400 px-4 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Start learning →
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
            OPEN PLATFORM · HPC NETWORKING · INTERACTIVE LABS
          </p>
          <h1 className="mt-8 text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            <span className="block">Master the fabric</span>
            <span className="mt-2 block text-cyan-400">that runs AI.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-center text-lg leading-8 text-slate-400">
            InfiniBand. RoCEv2. RDMA. DGX SuperPOD. Spectrum-X. Learn HPC networking through
            interactive CLI simulation — the way Packet Tracer taught you enterprise networking.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/learn/ch0-hardware-foundations"
              className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Start with Chapter 0 →
            </Link>
            <Link
              href="/curriculum"
              className="rounded-full border border-white/20 px-6 py-3 text-sm text-slate-300 transition hover:border-white/40"
            >
              Explore the curriculum
            </Link>
          </div>

          <TerminalPreview />

          <p className="mt-8 animate-bounce text-xs text-slate-600">↓ scroll to explore</p>
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
                Network engineers who can troubleshoot BGP, design spanning tree, and read OSPF
                LSAs find themselves completely lost when they walk into an AI data center for the
                first time. The knowledge lives in vendor runbooks, pre-sales conversations, and
                conference papers — not in any structured, interactive learning resource.
              </p>
              <p>
                GNS3 and EVE-NG stop at the edge. Cisco Packet Tracer never heard of InfiniBand.
                NVIDIA&apos;s own documentation assumes you already understand RDMA semantics. There
                is no simulation environment for HPC fabric — until now.
              </p>
            </div>
          </div>

          <div className="grid gap-6">
            {[
              { value: "400G", label: "per GPU rail in a DGX H100 cluster" },
              { value: "0", label: "packet drops tolerated in RDMA workloads" },
              { value: "7μs", label: "typical AllReduce latency in a SuperPOD" },
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
            Six chapters. Two scenario labs. One interactive CLI simulator.
          </p>

          <div className="mt-10 flex gap-6 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible">
            {chapterCards.map((card) => {
              const isAvailable = card.status === "Available";
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
                        isAvailable ? "bg-green-500" : "bg-amber-400"
                      }`}
                    />
                    <span className={isAvailable ? "text-green-400" : "text-amber-300"}>{card.status}</span>
                  </div>
                </>
              );

              if (isAvailable) {
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
                Each chapter tells a complete story — from the physical hardware through the
                protocol details to the operational commands. Interactive visualisations make
                abstract concepts tangible.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-500/30 bg-slate-900 p-8 shadow-2xl shadow-cyan-950/25 ring-1 ring-cyan-500/20">
              <TerminalIcon />
              <h3 className="mt-6 text-2xl font-semibold text-white">CLI simulation</h3>
              <p className="mt-4 text-base leading-8 text-slate-400">
                A real terminal simulator running against virtual fabric state. Type{" "}
                <span className="font-mono text-slate-200">show dcb pfc</span> and get output that
                reflects the actual topology. Change state. See the output change. Complete graded
                scenario labs.
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-slate-900 p-8 shadow-2xl shadow-slate-950/50">
              <BrainNetworkIcon />
              <h3 className="mt-6 text-2xl font-semibold text-white">Knowledge panel</h3>
              <p className="mt-4 text-base leading-8 text-slate-400">
                Run a command and the knowledge panel automatically surfaces the relevant concept —
                PFC, ECN, RDMA queue pairs. Learning happens at the moment you need it, not in a
                separate tab.
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
              The fabric that runs AI waits for no one.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-400">
              Chapter 0 is free. No account required. Open the terminal and type your first
              command.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/learn/ch0-hardware-foundations"
                className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Open Chapter 0 →
              </Link>
              <Link
                href="/lab"
                className="rounded-full border border-white/20 px-6 py-3 text-sm text-slate-300 transition hover:border-white/40"
              >
                Go to the lab →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono uppercase tracking-[0.28em] text-cyan-400">FABRICLAB</span>
            <span>© 2026</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/curriculum" className="transition hover:text-slate-400">
              Curriculum
            </Link>
            <Link href="/lab" className="transition hover:text-slate-400">
              Lab
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="transition hover:text-slate-400">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

