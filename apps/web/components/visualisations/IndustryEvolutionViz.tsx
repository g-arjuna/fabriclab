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
    detail: "Researchers used whatever Ethernet was available. Models were small enough to train on one or two GPUs. AlexNet (2012) used two GTX 580s with 3 GB each. In those examples, the external network was often not the dominant bottleneck because datasets, synchronization volume, and job scale were limited. Multi-GPU communication commonly used PCIe peer transfers rather than a large multi-node fabric.",
    tech: ["10GbE / 40GbE", "TCP/IP", "PCIe peer-to-peer", "NFS storage"],
    why: "Many early workloads fit one or two GPUs, so multi-node collective traffic was limited or absent. This was workload-dependent, not proof that enterprise networks are never bottlenecks.",
  },
  {
    id: "ib_emergence",
    years: "2016–2018",
    title: "InfiniBand adoption begins",
    color: "#1e3a5f",
    borderColor: "#3b82f6",
    summary: "Supercomputer tech enters AI clusters",
    detail: "Models outgrew single GPUs. Researchers discovered InfiniBand — which had existed in supercomputing since the early 2000s — and adopted it for GPU clusters. InfiniBand's credit-based flow control was engineered to avoid congestion-induced loss under correct operation. GPUDirect RDMA allowed GPU memory to be directly exposed to the InfiniBand fabric. The V100 (2017) had 300 GB/s NVLink and full InfiniBand support.",
    tech: ["InfiniBand EDR (100G)", "GPUDirect RDMA", "NVLink gen2", "Mellanox ConnectX-4/5"],
    why: "InfiniBand was battle-tested in supercomputing for tightly coupled parallel workloads because of its low-latency design and congestion-loss-avoidance mechanisms.",
  },
  {
    id: "nvidia_mellanox",
    years: "2019–2020",
    title: "NVIDIA acquires Mellanox",
    color: "#14532d",
    borderColor: "#22c55e",
    summary: "$6.9B transaction announced March 2019; closes April 27, 2020",
    detail: "NVIDIA announced the acquisition of Mellanox Technologies in March 2019 for approximately $6.9 billion and completed it on April 27, 2020 — the largest acquisition in NVIDIA's history at the time. Mellanox made the ConnectX NICs and InfiniBand switches that connected NVIDIA GPUs. By owning both the GPU and the network, NVIDIA could design them together. The DGX reference architecture became a fully integrated product. HDR InfiniBand (200G) launched with the A100 era.",
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
    detail: "RoCEv2 existed before 2021; adoption for large AI fabrics increased as lossless Ethernet design, congestion control, NICs, and collective libraries matured. A common large-scale RoCEv2 design uses PFC and ECN as part of a loss-avoidance and congestion-control architecture, although those mechanisms are distinct and not universal protocol guarantees. Organizations with Ethernet operational expertise adopted RoCEv2 in some designs rather than replacing everything with InfiniBand. NVIDIA introduced Spectrum-X as an Ethernet platform designed for AI workloads. NDR InfiniBand (400G) launched with the H100.",
    tech: ["InfiniBand NDR (400G)", "RoCEv2 + PFC + ECN", "ConnectX-7", "Spectrum-X", "DGX H100"],
    why: "Some enterprises and cloud operators wanted RDMA-style transport while preserving Ethernet operational models. Whether existing infrastructure can be reused depends on switch capability, topology, buffering, telemetry, and configuration.",
  },
  {
    id: "present",
    years: "2024–present",
    title: "Two camps, XDR on horizon",
    color: "#1e3a5f",
    borderColor: "#818cf8",
    summary: "InfiniBand vs Ethernet — both are real",
    detail: "Large AI clusters use both InfiniBand and Ethernet in deployment-specific designs. Examples include InfiniBand NDR/XDR generations and RoCEv2 over engineered Ethernet fabrics such as Spectrum-X. Neither protocol choice is a universal indicator of cluster size or quality. NVIDIA's Quantum-X800 switches support XDR InfiniBand at 800G per port. The DGX H200 is a Hopper-generation product (same ConnectX-7 NIC as H100, upgraded GPU die and HBM3e). The DGX B200 is Blackwell-generation hardware with newer networking adapters and documented BlueField-3 NIC-mode behavior; exact adapter roles and offload services are configuration-dependent.",
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
