import Link from "next/link";

import { getChapterSummaries } from "@/lib/chapters";

type AvailableItem = {
  number: string;
  title: string;
  href: string;
  duration: string;
  status: "Available";
  tags: string[];
  description: string;
  slug?: string;
};

type UpcomingItem = {
  number: string;
  title: string;
  status: "Coming soon";
  tags: string[];
  description?: string;
};

type LabItem = {
  number: string;
  title: string;
  href: string;
  duration: string;
  status: "Available";
  description: string;
};

// ── Part 1: Foundations (Ch0–Ch2) ─────────────────────────────────────────
const foundationChapters: AvailableItem[] = [
  {
    number: "0",
    title: "The Hardware Story",
    href: "/learn/ch0-hardware-foundations",
    duration: "40 min",
    status: "Available",
    tags: ["Hardware", "DGX", "NVLink", "DPU", "Rail topology"],
    description:
      "Physical layer orientation. What an HCA is, why NICs became DPUs, how a DGX node is wired, the three separate networks.",
    slug: "ch0-hardware-foundations",
  },
  {
    number: "1",
    title: "Operating Systems and Management Platforms",
    href: "/learn/ch1-os-platforms",
    duration: "35 min",
    status: "Available",
    tags: ["DGX OS", "ONYX", "Cumulus", "UFM", "Power-on", "First access"],
    description:
      "What runs on every device. How you access it after power-on. The management philosophy. CLI vs orchestrated. First power-on sequence.",
    slug: "ch1-os-platforms",
  },
  {
    number: "2",
    title: "Why HPC Networking Is Different",
    href: "/learn/ch2-why-different",
    duration: "25 min",
    status: "Available",
    tags: ["AllReduce", "Lossless", "RDMA", "JCT", "Tail latency"],
    description:
      "The AllReduce barrier, why TCP fails, tail latency math, and the mental model shift from enterprise to AI networking.",
    slug: "ch2-why-different",
  },
];

// ── Part 2: Fabric Operations (Ch3–Ch8) ───────────────────────────────────
const fabricChapters: AvailableItem[] = [
  {
    number: "3",
    title: "The CLI — Reading the Fabric",
    href: "/learn/ch3-the-cli",
    duration: "45 min",
    status: "Available",
    tags: ["ibstat", "show dcb pfc", "ethtool", "Diagnostic workflow"],
    description:
      "The commands and discipline for reading HPC fabric state. Which commands run where, how to read their output, and the investigation workflow from physical layer to configuration.",
    slug: "ch3-the-cli",
  },
  {
    number: "4",
    title: "InfiniBand Operations — ONYX CLI and Fabric Management",
    href: "/learn/ch4-infiniband-operations",
    duration: "50 min",
    status: "Available",
    tags: ["ONYX", "ibdiagnet", "UFM", "Subnet Manager", "Error counters"],
    description:
      "The InfiniBand operations layer: ONYX CLI, error counter interpretation, Subnet Manager management, ibdiagnet fabric sweep, and UFM event correlation.",
    slug: "ch4-infiniband-operations",
  },
  {
    number: "5",
    title: "PFC, ECN, and Congestion Control",
    href: "/learn/ch5-pfc-ecn-congestion",
    duration: "55 min",
    status: "Available",
    tags: ["PFC", "ECN", "DCQCN", "Pause storm", "Congestion"],
    description:
      "How losslessness actually works: PFC mechanics at the wire level, pause storm formation, ECN CE bit marking, DCQCN rate control algorithm, and the complete RoCEv2 port configuration checklist.",
    slug: "ch5-pfc-ecn-congestion",
  },
  {
    number: "6",
    title: "Efficient Load Balancing",
    href: "/learn/ch6-efficient-load-balancing",
    duration: "50 min",
    status: "Available",
    tags: ["ECMP", "DLB", "GLB", "RSHP", "Flowlets", "In-cast", "Elephant flows"],
    description:
      "Why AI traffic is structurally low-entropy and how that breaks ECMP. The four load balancing modes (SLB, DLB, GLB, sDLB). Per-packet spraying and RSHP. In-cast congestion patterns and how to diagnose them from spine utilisation counters.",
    slug: "ch6-efficient-load-balancing",
  },
  {
    number: "7",
    title: "Topology Design",
    href: "/learn/ch7-topology-design",
    duration: "60 min",
    status: "Available",
    tags: ["Fat-tree", "BasePOD", "SuperPOD", "Oversubscription", "ROD", "RUD", "Cabling"],
    description:
      "How AI fabric scales from one switch to a SuperPOD. Fat-tree topology math, bisection bandwidth, BasePOD vs SuperPOD reference designs, oversubscription calculations, ROD vs RUD wiring, switch buffer selection, and cabling constraints.",
    slug: "ch7-topology-design",
  },
  {
    number: "8",
    title: "NCCL — The Application Layer",
    href: "/learn/ch8-nccl-performance",
    duration: "55 min",
    status: "Available",
    tags: ["NCCL", "AllReduce", "busbw", "nccl-tests", "DCQCN tuning"],
    description:
      "How NCCL translates AllReduce into RDMA operations. Ring vs Tree vs Double-Binary Tree algorithms. The environment variables that determine whether NCCL finds RDMA or falls back to TCP. Reading nccl-tests output. Correlating busbw degradation to fabric diagnostics.",
    slug: "ch8-nccl-performance",
  },
];

// ── Part 3: Physical Layer and Infrastructure (Ch9–Ch11) ──────────────────
const infrastructureChapters: AvailableItem[] = [
  {
    number: "9",
    title: "Optics, Cabling, and the Physical Layer",
    href: "/learn/ch9-optics-cabling",
    duration: "40 min",
    status: "Available",
    tags: ["Optics", "Cabling", "Fiber", "OSFP", "CPO", "Signal integrity"],
    description:
      "The physical layer beneath the fabric: 400G/800G optics, DSPs, fiber types, form factors, cable selection, and why signal integrity and power density now shape AI cluster design.",
    slug: "ch9-optics-cabling",
  },
  {
    number: "10",
    title: "The Storage Fabric",
    href: "/learn/ch10-storage-fabric",
    duration: "45 min",
    status: "Available",
    tags: ["Storage", "GDS", "NVMe-oF", "Parallel file systems", "Checkpointing"],
    description:
      "The separate network that feeds and protects training: storage isolation, GDS data paths, NVMe-oF transports, parallel file systems, checkpoint economics, and storage topology choices.",
    slug: "ch10-storage-fabric",
  },
  {
    number: "11",
    title: "Monitoring, Telemetry, and Observability",
    href: "/learn/ch11-monitoring-telemetry",
    duration: "48 min",
    status: "Available",
    tags: ["UFM API", "DCGM", "Prometheus", "Grafana", "Alert calibration", "Correlation"],
    description:
      "Know about problems before the ML engineer's Slack message arrives. UFM REST API, DCGM GPU metrics, Prometheus alert design, threshold calibration, and cross-layer correlation across four monitoring streams.",
    slug: "ch11-monitoring-telemetry",
  },
];

// ── Upcoming chapters ──────────────────────────────────────────────────────
const upcomingChapters: UpcomingItem[] = [
  {
    number: "12",
    title: "Scale-Up Networking — NVLink Switch System",
    status: "Coming soon",
    tags: ["NVLink Switch", "57.6 TB/s", "Scale-up", "SHARP"],
    description: "External NVLink Switch modules, 57.6 TB/s all-to-all at 256 GPUs, NVLink Network addressing, and the scale-up vs scale-out architecture decision.",
  },
  {
    number: "13",
    title: "Alternative Topologies",
    status: "Coming soon",
    tags: ["Torus", "Dragonfly", "Google TPU", "Fat-tree"],
    description: "Torus, folded torus, and dragonfly topologies — why they dominated HPC and why fat-tree wins for AI training.",
  },
  {
    number: "14",
    title: "GPU Hardware Generations",
    status: "Coming soon",
    tags: ["NVLink", "SXM", "PCIe", "GH200", "MIG"],
    description: "Network-relevant implications of GPU generations: NVLink/NVSwitch generation table, SXM vs PCIe form factors, GH200, H100 CNX, and Confidential Computing.",
  },
];

const labs: LabItem[] = [
  {
    number: "0",
    title: "Identify the failed rail",
    href: "/lab?lab=lab0-failed-rail",
    duration: "12 min",
    status: "Available",
    description:
      "A GPU rail has gone dark. Use the topology map and CLI tools to identify which rail, confirm the RDMA state, and isolate whether the fault is on the NIC or switch side.",
  },
  {
    number: "1",
    title: "Fix the PFC misconfiguration",
    href: "/lab?lab=lab1-pfc-fix",
    duration: "10 min",
    status: "Available",
    description:
      "A RoCEv2 workload is experiencing retransmissions. PFC is misconfigured. Diagnose and fix it.",
  },
  {
    number: "2",
    title: "Diagnose fabric congestion",
    href: "/lab?lab=lab2-congestion",
    duration: "15 min",
    status: "Available",
    description:
      "Throughput has dropped 40%. Investigate using interface counters and ECN configuration commands.",
  },
  {
    number: "3",
    title: "Diagnose uneven spine utilisation",
    href: "/lab?lab=lab3-uneven-spine",
    duration: "15 min",
    status: "Available",
    description:
      "AllReduce throughput has dropped with no drops visible. Diagnose why spine links are uneven and fix load balancing to restore full training throughput.",
  },
  {
    number: "4",
    title: "Evaluate topology proposals",
    href: "/lab?lab=lab4-topology-sizing",
    duration: "15 min",
    status: "Available",
    description:
      "Two vendors propose different switch configurations for a 64-node DGX H100 cluster. Calculate oversubscription ratios, identify which proposal meets requirements, and submit a recommendation before the purchase order is signed.",
  },
  {
    number: "5",
    title: "Diagnose NCCL transport fallback",
    href: "/lab?lab=lab5-nccl-diagnosis",
    duration: "20 min",
    status: "Available",
    description:
      "A 16-node cluster shows 3 GB/s busbw instead of expected performance. All hardware is healthy. Diagnose why NCCL is using socket transport and fix the environment variable misconfiguration.",
  },
];

function Tag({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-slate-400">
      {children}
    </span>
  );
}

function AvailableCard({ item }: { item: AvailableItem }) {
  return (
    <Link
      href={item.href}
      className="group flex items-start gap-5 rounded-2xl border border-white/8 bg-slate-900 p-5 transition hover:border-white/20"
    >
      <div className="min-w-14 text-4xl font-semibold leading-none text-slate-700">{item.number}</div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl font-semibold text-white">{item.title}</h3>
          <span className="rounded-full bg-green-950 px-3 py-1 text-xs text-green-400">{item.duration}</span>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-green-400">{item.status}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-400">{item.description}</p>
      </div>
      <div className="pt-1 text-2xl text-slate-600 transition group-hover:text-slate-300">→</div>
    </Link>
  );
}

function UpcomingCard({ item }: { item: UpcomingItem }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-slate-900 p-5 opacity-50">
      <div className="flex items-start gap-5">
        <div className="min-w-14 text-4xl font-semibold leading-none text-slate-700">{item.number}</div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-white">{item.title}</h3>
            <span className="rounded-full bg-amber-950 px-3 py-1 text-xs text-amber-300">Coming soon</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
          {item.description ? <p className="mt-4 text-sm leading-7 text-slate-400">{item.description}</p> : null}
        </div>
      </div>
    </div>
  );
}

function LabCard({ item }: { item: LabItem }) {
  return (
    <Link
      href={item.href}
      className="group flex items-start gap-5 rounded-2xl border border-white/8 bg-slate-900 p-5 transition hover:border-white/20"
    >
      <div className="min-w-14 text-4xl font-semibold leading-none text-slate-700">{item.number}</div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl font-semibold text-white">{item.title}</h3>
          <span className="rounded-full bg-green-950 px-3 py-1 text-xs text-green-400">{item.duration}</span>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-green-400">{item.status}</span>
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-400">{item.description}</p>
      </div>
      <div className="pt-1 text-2xl text-slate-600 transition group-hover:text-slate-300">→</div>
    </Link>
  );
}

export default async function CurriculumPage() {
  const chapters = await getChapterSummaries();
  const availableSlugs = new Set(chapters.map((chapter) => chapter.slug));

  function filterAvailable(items: AvailableItem[]) {
    return items.filter((item) => (item.slug ? availableSlugs.has(item.slug) : true));
  }

  const visibleFoundations     = filterAvailable(foundationChapters);
  const visibleFabric          = filterAvailable(fabricChapters);
  const visibleInfrastructure  = filterAvailable(infrastructureChapters);

  return (
    <main className="min-h-screen bg-[#020617] px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm text-cyan-300 transition hover:text-cyan-200">
          ← FabricLab
        </Link>

        <header className="mt-10 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">LEARNING PATH</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">
            HPC Networking — from hardware to protocol
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            A structured curriculum for network engineers entering the AI infrastructure space.
            Start with Chapter 0 regardless of your experience level — the hardware context makes
            everything else click.
          </p>
        </header>

        {/* Part 1 — Foundations */}
        {visibleFoundations.length > 0 && (
          <section className="mt-14">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Part 1 — Foundations</p>
              <p className="mt-2 text-sm text-slate-500">No prerequisites · Ch 0–2</p>
            </div>
            <div className="space-y-5">
              {visibleFoundations.map((chapter) => (
                <AvailableCard key={chapter.number} item={chapter} />
              ))}
            </div>
          </section>
        )}

        {/* Part 2 — Fabric Operations */}
        {visibleFabric.length > 0 && (
          <section className="mt-14">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                Part 2 — Fabric Operations
              </p>
              <p className="mt-2 text-sm text-slate-500">Requires Part 1 · Ch 3–8</p>
            </div>
            <div className="space-y-5">
              {visibleFabric.map((chapter) => (
                <AvailableCard key={chapter.number} item={chapter} />
              ))}
            </div>
          </section>
        )}

        {/* Part 3 — Physical Layer and Infrastructure */}
        {visibleInfrastructure.length > 0 && (
          <section className="mt-14">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                Part 3 — Physical Layer and Infrastructure
              </p>
              <p className="mt-2 text-sm text-slate-500">Requires Part 2 · Ch 9–11</p>
            </div>
            <div className="space-y-5">
              {visibleInfrastructure.map((chapter) => (
                <AvailableCard key={chapter.number} item={chapter} />
              ))}
            </div>
          </section>
        )}

        {/* Coming soon */}
        <section className="mt-14">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
              Part 4 — Scale and Architecture
            </p>
            <p className="mt-2 text-sm text-slate-500">Requires Part 3 · Ch 12–14</p>
          </div>
          <div className="space-y-5">
            {upcomingChapters.map((chapter) => (
              <UpcomingCard key={chapter.number} item={chapter} />
            ))}
          </div>
        </section>

        {/* Labs */}
        <section className="mt-14 pb-8">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Labs</p>
            <p className="mt-2 text-sm text-slate-500">Scenario-based · separate from chapters</p>
          </div>
          <div className="space-y-5">
            {labs.map((lab) => (
              <LabCard key={lab.number} item={lab} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
