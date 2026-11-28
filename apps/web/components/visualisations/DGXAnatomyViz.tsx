"use client"

import { useState } from "react"

type View = "anatomy" | "alternatives" | "whynvidia"

const alternatives = [
  {
    name: "NVIDIA DGX H100",
    vendor: "NVIDIA",
    gpu: "8× H100 SXM5 80GB",
    interconnect: "NVLink gen4 + ConnectX-7 400G × 8",
    network: "DGX H100 reference compute fabric: InfiniBand NDR; adapter personality is platform/configuration-dependent",
    strength: "Fully integrated stack — GPU + NIC + switch + software from one vendor. Broad adoption, extensive documentation, and a large ecosystem.",
    limitation: "High acquisition cost and vendor ecosystem dependency; exact pricing is configuration- and time-dependent.",
    color: "#14532d",
    border: "#22c55e",
  },
  {
    name: "AMD Instinct MI300X",
    vendor: "AMD",
    gpu: "8× MI300X 192GB HBM3",
    interconnect: "Infinity Fabric + platform-dependent NIC choices",
    network: "Platform-dependent Ethernet/RoCE scale-out designs",
    strength: "192 GB HBM3 per GPU — 2.4× more memory than H100. Attractive where memory capacity is a primary constraint. Cost and total value are procurement- and workload-dependent.",
    limitation: "The ROCm ecosystem and operational tooling differ from CUDA; maturity is workload- and version-dependent. NIC, transport, and scale-out design support is platform-specific. Public deployment and reference-design material may be less extensive than NVIDIA material.",
    color: "#1e3a5f",
    border: "#60a5fa",
  },
  {
    name: "HPE Cray XD670",
    vendor: "HPE",
    gpu: "8× H100 SXM5 (NVIDIA GPU)",
    interconnect: "NVLink gen4 + ConnectX-7 × 8",
    network: "Platform-dependent InfiniBand or Ethernet configurations",
    strength: "HPE enterprise support and HPC system-integration heritage. Exact accelerator, interconnect, and management capabilities depend on the selected configuration.",
    limitation: "Same GPUs as DGX, so no GPU advantage. Higher operational complexity than DGX in pure AI training contexts.",
    color: "#1e3a5f",
    border: "#38bdf8",
  },
  {
    name: "Google TPU v5p",
    vendor: "Google",
    gpu: "TPU v5p (custom ASIC)",
    interconnect: "ICI (Inter-Chip Interconnect) — proprietary",
    network: "Google-managed proprietary/inter-chip networking",
    strength: "Purpose-built accelerator architecture available at large scale in Google Cloud. Suitability and cost-effectiveness depend on model, framework, software support, and workload.",
    limitation: "Only available through Google Cloud rather than as on-premises server hardware. Software/model compatibility and migration effort must be evaluated per workload.",
    color: "#1e3a5f",
    border: "#818cf8",
  },
]

const anatomyComponents = [
  { label: "H100 SXM5 × 8", role: "Primary compute", detail: "8 H100 GPUs, each with 80 GB HBM3 memory. Each GPU has 900 GB/s aggregate bidirectional NVLink endpoint bandwidth in the DGX H100 reference design. Four NVSwitch chips provide the intra-node scale-up fabric.", color: "#166534" },
  { label: "NVSwitch gen3 × 4", role: "Intra-node fabric", detail: "Provides the scale-up fabric among eight GPUs. The 7.2 TB/s figure is system endpoint bandwidth (8 × 900 GB/s), not switch-chip bandwidth or bisection bandwidth.", color: "#1e40af" },
  { label: "ConnectX-7 × 8", role: "External fabric (rail 0–7)", detail: "Eight 400G ConnectX-7 compute adapters in the reference DGX H100 design. The wiring uses GPU/NIC rail affinity; it does not mean a GPU physically contains a NIC. Connector and logical-port counts must be distinguished.", color: "#1d4ed8" },
  { label: "ConnectX-7 dual-port × 2", role: "Storage + in-band management", detail: "Two additional dual-port ConnectX-7 cards in Slot1/Slot2 support storage and in-band-management functions in the documented platform. Their use is configuration-dependent.", color: "#6d28d9" },
  { label: "Intel Xeon × 2", role: "Host management", detail: "2× Xeon Platinum 8480C (56 cores each). Runs application orchestration, data loading, preprocessing, framework operations, storage management, kernel services, and communication setup. Utilization is workload-dependent.", color: "#374151" },
  { label: "DDR5 2 TB", role: "System memory", detail: "2 TB of DDR5 system RAM. Framework overhead, data loading pipelines, CPU-side operations. Some training traffic can bypass system RAM on supported RDMA data paths, but host memory remains important for application and framework operation.", color: "#92400e" },
  { label: "NVMe U.2 × 8 (~30 TB)", role: "Local storage", detail: "8× 3.84 TB NVMe U.2 SSDs (~30 TB usable). Data-cache storage; the operating system resides on separate OS drives. They may also support local caching/checkpoint workflows depending on configuration. Training datasets live on shared parallel storage (Lustre, WEKA, BeeGFS). Supported GPUDirect Storage configurations can avoid intermediate host-memory staging on the data path, while setup and orchestration still involve host software.", color: "#1e293b" },
]

export function DGXAnatomyViz() {
  const [view, setView] = useState<View>("anatomy")
  const [selected, setSelected] = useState<number | null>(null)
  const [altSelected, setAltSelected] = useState<number>(0)

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        DGX H100 — anatomy and alternatives
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {(["anatomy", "alternatives", "whynvidia"] as View[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              backgroundColor: view === v ? "#166534" : "#0f172a",
              border: `1px solid ${view === v ? "#22c55e" : "#1e293b"}`,
              color: view === v ? "#bbf7d0" : "#64748b",
            }}
          >
            {v === "anatomy" ? "Internal anatomy" : v === "alternatives" ? "Alternatives" : "Why NVIDIA became the reference"}
          </button>
        ))}
      </div>

      {view === "anatomy" && (
        <div className="space-y-2">
          {anatomyComponents.map((comp, i) => (
            <button
              key={i}
              onClick={() => setSelected(selected === i ? null : i)}
              className="w-full text-left rounded-xl px-4 py-3 transition-all"
              style={{
                backgroundColor: selected === i ? comp.color : "#0f172a",
                border: `1px solid ${comp.color}${selected === i ? "ff" : "66"}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-sm font-semibold text-white">{comp.label}</span>
                  <span className="ml-3 text-xs text-slate-400">{comp.role}</span>
                </div>
              </div>
              {selected === i && (
                <p className="mt-2 text-sm leading-7 text-slate-200">{comp.detail}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {view === "alternatives" && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            {alternatives.map((alt, i) => (
              <button
                key={i}
                onClick={() => setAltSelected(i)}
                className="rounded-lg px-3 py-1.5 text-xs transition-all"
                style={{
                  backgroundColor: altSelected === i ? alt.color : "#0f172a",
                  border: `1px solid ${altSelected === i ? alt.border : "#1e293b"}`,
                  color: altSelected === i ? "#fff" : "#64748b",
                }}
              >
                {alt.vendor}
              </button>
            ))}
          </div>
          {(() => {
            const alt = alternatives[altSelected]
            return (
              <div className="rounded-xl p-4" style={{ backgroundColor: alt.color + "33", border: `1px solid ${alt.border}44` }}>
                <h3 className="text-sm font-bold text-white">{alt.name}</h3>
                <div className="mt-3 space-y-2 text-xs">
                  {[
                    { label: "GPU", value: alt.gpu },
                    { label: "Interconnect", value: alt.interconnect },
                    { label: "Network", value: alt.network },
                  ].map(row => (
                    <div key={row.label} className="flex gap-3">
                      <span className="w-24 text-slate-500 flex-shrink-0">{row.label}</span>
                      <span className="text-slate-200">{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-200">
                  <span className="font-semibold">Strength: </span>{alt.strength}
                </div>
                <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-200">
                  <span className="font-semibold">Limitation: </span>{alt.limitation}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {view === "whynvidia" && (
        <div className="space-y-3">
          <p className="text-sm leading-7 text-slate-300">
            This course uses DGX and InfiniBand as the reference platform. It is worth being explicit about why NVIDIA is commonly used as the reference platform, without treating that position as permanent, universal, or proof of superiority in every workload.
          </p>
          {[
            { title: "CUDA ecosystem momentum", desc: "Major AI frameworks and many production training pipelines have deep CUDA support. ROCm and other software stacks are viable in suitable workloads, but ecosystem maturity and operational familiarity differ by organization and software version.", color: "#166534" },
            { title: "Vertical integration", desc: "NVIDIA sells the GPU, the NIC (ConnectX-7), the switch (Quantum/Spectrum), and the software (NCCL, UFM, CUDA). When something breaks, one vendor owns the full stack. No finger-pointing between GPU and NIC vendors.", color: "#1e40af" },
            { title: "Reference architectures", desc: "DGX BasePOD and SuperPOD are documented reference architectures with extensive public implementation detail. Other vendors also provide validated designs; do not treat one public reference architecture as universal industry practice.", color: "#6d28d9" },
            { title: "SHARP in-network compute", desc: "SHARP can accelerate supported collectives in supported InfiniBand configurations by performing reductions in the network. Benefits are workload- and scale-dependent; do not use a universal percentage or assume no other hardware can implement collective acceleration.", color: "#92400e" },
            { title: "This is not permanent or universal", desc: "AMD memory capacity, custom accelerators, Ethernet operational models, and workload-specific economics can change the platform decision. The networking concepts in this course — congestion control, RDMA behavior, telemetry, and topology design — remain relevant across accelerator vendors.", color: "#374151" },
          ].map(item => (
            <div key={item.title} className="rounded-xl p-4" style={{ backgroundColor: item.color + "33", border: `1px solid ${item.color}66` }}>
              <h4 className="text-sm font-semibold text-white mb-1">{item.title}</h4>
              <p className="text-sm leading-6 text-slate-300">{item.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DGXAnatomyViz
