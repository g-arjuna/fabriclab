"use client"

import { useState } from "react"

interface Era {
  id: string
  years: string
  title: string
  color: string
  borderColor: string
  summary: string
  detail: string
  tech: string[]
  why: string
}

const eras: Era[] = [
  {
    id: "early",
    years: "2010–2015",
    title: "Early deep learning",
    color: "#1e293b",
    borderColor: "#475569",
    summary: "Standard Ethernet + TCP/IP",
    detail: "Researchers used whatever Ethernet was available. Models were small enough to train on one or two GPUs. AlexNet (2012) used two GTX 580s with 3 GB each. The network was not a bottleneck because datasets and models were small. Multi-GPU training used PCIe peer transfers, not a real network fabric.",
    tech: ["10GbE / 40GbE", "TCP/IP", "PCIe peer-to-peer", "NFS storage"],
    why: "Models were small. One or two GPUs sufficed. Network was irrelevant to training speed.",
  },
  {
    id: "ib_emergence",
    years: "2016–2018",
    title: "InfiniBand adoption begins",
    color: "#1e3a5f",
    borderColor: "#3b82f6",
    summary: "Supercomputer tech enters AI clusters",
    detail: "Models outgrew single GPUs. Researchers discovered InfiniBand — which had existed in supercomputing since the early 2000s — and adopted it for GPU clusters. InfiniBand's credit-based flow control made it naturally lossless. GPUDirect RDMA allowed GPU memory to be directly exposed to the InfiniBand fabric. The V100 (2017) had 300 GB/s NVLink and full InfiniBand support.",
    tech: ["InfiniBand EDR (100G)", "GPUDirect RDMA", "NVLink gen2", "Mellanox ConnectX-4/5"],
    why: "InfiniBand was battle-tested in supercomputing for exactly this use case — lossless, low-latency interconnect for tightly coupled parallel workloads.",
  },
  {
    id: "nvidia_mellanox",
    years: "2019–2020",
    title: "NVIDIA acquires Mellanox",
    color: "#14532d",
    borderColor: "#22c55e",
    summary: "$6.9B acquisition closes March 2020",
    detail: "NVIDIA acquired Mellanox Technologies for $6.9 billion — the largest acquisition in NVIDIA's history at the time. Mellanox made the ConnectX NICs and InfiniBand switches that connected NVIDIA GPUs. By owning both the GPU and the network, NVIDIA could design them together. The DGX reference architecture became a fully integrated product. HDR InfiniBand (200G) launched with the A100 era.",
    tech: ["InfiniBand HDR (200G)", "A100 + ConnectX-6", "NVLink gen3", "DGX A100"],
    why: "Vertical integration. NVIDIA saw that the network connecting GPUs was as important as the GPUs themselves. Owning Mellanox meant owning the full stack.",
  },
  {
    id: "rocev2",
    years: "2021–2023",
    title: "RoCEv2 scales up",
    color: "#1e3a5f",
    borderColor: "#38bdf8",
    summary: "RDMA over Ethernet becomes viable at scale",
    detail: "RoCEv2 (RDMA over Converged Ethernet v2) had existed for years but scaling it was difficult. Ethernet needed to be made lossless via PFC (Priority Flow Control) and ECN (Explicit Congestion Notification). Cloud providers with existing Ethernet infrastructure adopted RoCEv2 rather than replacing everything with InfiniBand. NVIDIA launched Spectrum-X — Ethernet switches and NICs designed specifically for RoCEv2 AI workloads. NDR InfiniBand (400G) launched with the H100.",
    tech: ["InfiniBand NDR (400G)", "RoCEv2 + PFC + ECN", "ConnectX-7", "Spectrum-X", "DGX H100"],
    why: "Enterprises with existing Ethernet infrastructure wanted RDMA performance without replacing all their switches. Spectrum-X made RoCEv2 operationally simpler.",
  },
  {
    id: "present",
    years: "2024–present",
    title: "Two camps, XDR on horizon",
    color: "#1e3a5f",
    borderColor: "#818cf8",
    summary: "InfiniBand vs Ethernet — both are real",
    detail: "The industry has settled into two camps. Large-scale AI training clusters use InfiniBand NDR (400G, DGX H100/H200) or the ramping XDR generation (800G, DGX B200/GB200 Blackwell). Enterprise and multi-tenant clusters often use RoCEv2 over Spectrum-X Ethernet. NVIDIA's Quantum-X800 switches support XDR InfiniBand at 800G per port. The DGX H200 is a Hopper-generation product (same ConnectX-7 NIC as H100, upgraded GPU die and HBM3e). The DGX B200 is Blackwell -- new NIC generation, BlueField-3 DPUs for storage, 800G optics.",
    tech: ["InfiniBand XDR (800G)", "Spectrum-X 800GbE", "BlueField-3 DPU", "ConnectX-8", "DGX B200 / GB200"],
    why: "No single winner. Choice depends on scale, existing infrastructure, budget, and operational expertise.",
  },
]

export function IndustryEvolutionViz() {
  const [selected, setSelected] = useState<Era>(eras[1])

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        Industry evolution — click any era
      </p>

      {/* Timeline */}
      <div className="relative mb-5">
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-700" />
        <div className="flex justify-between relative">
          {eras.map((era) => (
            <button
              key={era.id}
              onClick={() => setSelected(era)}
              className="flex flex-col items-center group"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all z-10"
                style={{
                  backgroundColor: selected.id === era.id ? era.borderColor : era.color,
                  border: `2px solid ${era.borderColor}`,
                  transform: selected.id === era.id ? "scale(1.2)" : "scale(1)",
                }}
              >
                <div className="w-2 h-2 rounded-full bg-white opacity-80" />
              </div>
              <span className="text-[9px] mt-2 text-slate-500 text-center max-w-[60px]">{era.years}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: selected.color,
          border: `1px solid ${selected.borderColor}`,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">{selected.title}</h3>
            <p className="text-xs mt-0.5" style={{ color: selected.borderColor }}>{selected.summary}</p>
          </div>
          <span className="text-[10px] text-slate-400 flex-shrink-0">{selected.years}</span>
        </div>

        <p className="mt-3 text-sm leading-7 text-slate-300">{selected.detail}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {selected.tech.map(t => (
            <span key={t} className="rounded-full bg-black/20 px-2 py-0.5 text-[10px]" style={{ color: selected.borderColor }}>
              {t}
            </span>
          ))}
        </div>

        <div className="mt-3 rounded-lg bg-black/20 px-3 py-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-500">Why this happened: </span>
          <span className="text-xs text-slate-300">{selected.why}</span>
        </div>
      </div>
    </div>
  )
}

export default IndustryEvolutionViz
