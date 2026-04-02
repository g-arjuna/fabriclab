"use client"

import { useState } from "react"

type Stage = "nic" | "hca" | "dpu"

const stages: { id: Stage; label: string; era: string; example: string; color: string }[] = [
  { id: "nic", label: "NIC", era: "1990s–2015", example: "Intel X550, Broadcom BCM57xxx", color: "#374151" },
  { id: "hca", label: "HCA", era: "2015–2021", example: "Mellanox ConnectX-5/6", color: "#1d4ed8" },
  { id: "dpu", label: "DPU", era: "2021–present", example: "NVIDIA BlueField-3", color: "#6d28d9" },
]

const stageDetail: Record<Stage, {
  fullName: string
  definition: string
  dataPath: string[]
  offloads: string[]
  limitation: string
  cpu: string
  memory: string
  useCase: string
}> = {
  nic: {
    fullName: "Network Interface Card",
    definition: "A commodity component that connects a server to the network. Its job is to move Ethernet frames between the wire and the kernel's network stack. The CPU processes every packet — TCP/IP, checksums, buffer management — all CPU work.",
    dataPath: ["Wire", "NIC ASIC (DMA)", "System RAM (kernel buffer)", "Kernel network stack (CPU)", "User space application"],
    offloads: ["Checksum offload (basic)", "Large segment offload (LSO)", "Receive side scaling (RSS)"],
    limitation: "Cannot bypass the kernel. Every packet touches the CPU. At 100GbE+, the CPU becomes the bottleneck. Latency is measured in microseconds because of kernel overhead.",
    cpu: "None (dumb ASIC)",
    memory: "Small internal buffers only",
    useCase: "Enterprise servers, web infrastructure, databases — any workload where CPU packet processing is acceptable",
  },
  hca: {
    fullName: "Host Channel Adapter",
    definition: "An RDMA-capable NIC. The key innovation: the HCA implements the transport protocol entirely in hardware. Applications post Work Requests directly to the HCA via a memory-mapped queue — no syscalls, no kernel involvement. The HCA DMA's data directly to/from GPU or CPU memory.",
    dataPath: ["Wire", "HCA ASIC (transport in hardware)", "DMA directly to GPU/CPU memory", "Application reads completion queue"],
    offloads: ["Full RDMA transport (RC, UD, UC)", "Send/Receive, RDMA Write, RDMA Read", "Atomic operations", "GPUDirect RDMA", "SHARP in-network compute"],
    limitation: "Still primarily a 'smart NIC' — the host CPU runs the OS, security, and storage stack. Cannot independently manage tenant isolation or run complex security policy without host CPU involvement.",
    cpu: "Embedded processor (limited)",
    memory: "Dedicated HCA SRAM (~128 MB)",
    useCase: "AI/HPC training clusters, RDMA storage (NVMe-oF), financial trading infrastructure requiring sub-microsecond latency",
  },
  dpu: {
    fullName: "Data Processing Unit",
    definition: "A fully programmable SmartNIC with an embedded multi-core Arm CPU complex running a complete OS independently from the host. A DPU can run infrastructure services — virtual switching, storage offload, security policy, encryption — entirely independently of the host CPU, freeing host CPUs to run workloads exclusively.",
    dataPath: ["Wire", "DPU ASIC", "Embedded Arm CPUs (16 cores on BlueField-3)", "Services: OVS, NVMe-oF, TLS, firewall", "Host CPU only sees processed traffic"],
    offloads: ["OVS (Open vSwitch) offload", "NVMe-oF initiator/target", "TLS 1.3 / IPsec termination", "Full RDMA (same as HCA)", "Firewall / microsegmentation", "DOCA SDK programmable pipeline"],
    limitation: "More expensive than an HCA. The embedded CPU complex adds cost and power. Not needed for pure AI training workloads where the host manages everything — DPUs shine in multi-tenant cloud environments.",
    cpu: "16× Arm Cortex-A78 cores",
    memory: "32 GB LPDDR5 (independent of host)",
    useCase: "Cloud provider bare-metal infrastructure, multi-tenant GPU clusters, storage disaggregation, zero-trust security enforcement at line rate",
  },
}

export function NICEvolutionViz() {
  const [stage, setStage] = useState<Stage>("hca")

  const detail = stageDetail[stage]
  const stageObj = stages.find(s => s.id === stage)!

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        The NIC evolution: NIC → HCA → DPU
      </p>

      {/* Stage selector */}
      <div className="flex gap-3 mb-5">
        {stages.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStage(s.id)}
            className="flex-1 rounded-xl p-3 text-left transition-all"
            style={{
              backgroundColor: stage === s.id ? s.color : "#0f172a",
              border: `1px solid ${stage === s.id ? s.color : "#1e293b"}`,
            }}
          >
            <div className="text-sm font-bold text-white">{s.label}</div>
            <div className="text-[9px] text-white/60 mt-0.5">{s.era}</div>
            <div className="text-[9px] text-white/40 mt-0.5">{s.example}</div>
          </button>
        ))}
      </div>

      {/* Detail */}
      <div className="space-y-4">
        <div>
          <div className="text-xs font-semibold text-white mb-1">{detail.fullName}</div>
          <p className="text-sm leading-7 text-slate-300">{detail.definition}</p>
        </div>

        {/* Data path */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Data path</div>
          <div className="flex flex-wrap items-center gap-1">
            {detail.dataPath.map((step, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-300">{step}</span>
                {i < detail.dataPath.length - 1 && (
                  <span className="text-slate-600">→</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Offloads */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Hardware offloads</div>
          <div className="flex flex-wrap gap-2">
            {detail.offloads.map(o => (
              <span
                key={o}
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{ backgroundColor: stageObj.color + "33", color: "#e2e8f0", border: `1px solid ${stageObj.color}44` }}
              >
                {o}
              </span>
            ))}
          </div>
        </div>

        {/* Specs row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-800 p-3 text-xs">
            <div className="text-slate-500 mb-1">Embedded CPU</div>
            <div className="text-slate-200 font-medium">{detail.cpu}</div>
          </div>
          <div className="rounded-xl bg-slate-800 p-3 text-xs">
            <div className="text-slate-500 mb-1">Dedicated memory</div>
            <div className="text-slate-200 font-medium">{detail.memory}</div>
          </div>
        </div>

        {/* Limitation */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
          <span className="font-semibold">Limitation: </span>{detail.limitation}
        </div>

        {/* Use case */}
        <div className="rounded-xl border border-white/10 bg-slate-800 p-3 text-xs text-slate-300">
          <span className="font-semibold text-slate-200">Best for: </span>{detail.useCase}
        </div>
      </div>
    </div>
  )
}

export default NICEvolutionViz
