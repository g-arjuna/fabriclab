"use client"

import { useState } from "react"

type View = "anatomy" | "alternatives" | "whynvidia"

const alternatives = [
  {
    name: "NVIDIA DGX H100",
    vendor: "NVIDIA",
    gpu: "8× H100 SXM5 80GB",
    interconnect: "NVLink gen4 + ConnectX-7 400G × 8",
    network: "InfiniBand NDR or RoCEv2",
    strength: "Fully integrated stack — GPU + NIC + switch + software from one vendor. Widest adoption, best documentation, largest ecosystem.",
    limitation: "Expensive (~$300K). NVIDIA vendor lock-in.",
    color: "#14532d",
    border: "#22c55e",
  },
  {
    name: "AMD Instinct MI300X",
    vendor: "AMD",
    gpu: "8× MI300X 192GB HBM3",
    interconnect: "Infinity Fabric + ConnectX-7 or Pensando",
    network: "RoCEv2 (Ethernet only)",
    strength: "192 GB HBM3 per GPU — 2.4× more memory than H100. Attractive for inference and models too large for H100 memory. Lower cost.",
    limitation: "ROCm software ecosystem less mature than CUDA. No InfiniBand native. Smaller adoption means fewer reference architectures.",
    color: "#1e3a5f",
    border: "#60a5fa",
  },
  {
    name: "HPE Cray XD670",
    vendor: "HPE",
    gpu: "8× H100 SXM5 (NVIDIA GPU)",
    interconnect: "NVLink gen4 + ConnectX-7 × 8",
    network: "InfiniBand NDR or Ethernet",
    strength: "HPE's enterprise support, HPC heritage, integration with Cray software stack (PBS Pro, Slingshot). Used in national labs.",
    limitation: "Same GPUs as DGX, so no GPU advantage. Higher operational complexity than DGX in pure AI training contexts.",
    color: "#1e3a5f",
    border: "#38bdf8",
  },
  {
    name: "Google TPU v5p",
    vendor: "Google",
    gpu: "TPU v5p (custom ASIC)",
    interconnect: "ICI (Inter-Chip Interconnect) — proprietary",
    network: "Google proprietary fabric",
    strength: "Purpose-built for transformer training. Extreme scale — pods of 8960 chips. Best price/performance for Google's own workloads.",
    limitation: "Only available in Google Cloud. Cannot run arbitrary workloads — optimised for TPU-compatible models only.",
    color: "#1e3a5f",
    border: "#818cf8",
  },
]

const anatomyComponents = [
  { label: "H100 SXM5 × 8", role: "Primary compute", detail: "8 H100 GPUs, each with 80 GB HBM3 memory. Each GPU runs at 989 TFLOPS BF16. Connected to each other via 4 NVSwitch chips at 900 GB/s per GPU.", color: "#166534" },
  { label: "NVSwitch gen3 × 4", role: "Intra-node fabric", detail: "Creates non-blocking all-to-all between all 8 GPUs. 7.2 TB/s total fabric bandwidth. This is what enables tensor parallelism within a single DGX chassis.", color: "#1e40af" },
  { label: "ConnectX-7 × 8", role: "External fabric (rail 0–7)", detail: "One 400G NIC per GPU. Each NIC connects to a different leaf switch (rail-optimised topology). 8 independent 400G paths = 3.2 Tb/s total external bandwidth.", color: "#1d4ed8" },
  { label: "ConnectX-7 dual-port × 2", role: "Storage + in-band management", detail: "2 dual-port ConnectX-7 cards in Slot1 and Slot2 for the storage fabric and in-band management. Completely separate from the compute NICs. GPUDirect Storage path.", color: "#6d28d9" },
  { label: "Intel Xeon × 2", role: "Host management", detail: "2× Xeon Platinum 8480C (56 cores each). Manages OS, NCCL, job scheduling. CPU utilisation during training: 5–15%. Secondary role.", color: "#374151" },
  { label: "DDR5 2 TB", role: "System memory", detail: "2 TB of DDR5 system RAM. Framework overhead, data loading pipelines, CPU-side operations. Training data moves GPU→GPU via RDMA bypassing this.", color: "#92400e" },
  { label: "NVMe U.2 × 8 (~30 TB)", role: "Local storage", detail: "8× 3.84 TB NVMe U.2 SSDs (~30 TB usable). Local OS, framework installation, checkpoint storage. Training datasets live on shared parallel storage (Lustre, WEKA, BeeGFS). GPUDirect Storage (GDS) can read directly from NVMe to GPU memory without involving the host CPU.", color: "#1e293b" },
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

      <div className="flex gap-2 mb-5">
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
            {v === "anatomy" ? "Internal anatomy" : v === "alternatives" ? "Alternatives" : "Why NVIDIA won"}
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
            This course uses DGX and InfiniBand as the reference platform. It is worth being explicit about why NVIDIA dominates, rather than pretending it is the only option.
          </p>
          {[
            { title: "CUDA ecosystem lock-in", desc: "Most AI frameworks (PyTorch, TensorFlow, JAX) are primarily optimised for CUDA. The gap between CUDA and ROCm/OneAPI is narrowing but real. Most AI researchers write CUDA code. Most pre-trained models were trained on CUDA.", color: "#166534" },
            { title: "Vertical integration", desc: "NVIDIA sells the GPU, the NIC (ConnectX-7), the switch (Quantum/Spectrum), and the software (NCCL, UFM, CUDA). When something breaks, one vendor owns the full stack. No finger-pointing between GPU and NIC vendors.", color: "#1e40af" },
            { title: "Reference architectures", desc: "DGX BasePOD and SuperPOD are documented, validated, and deployed at scale. Any hyperscaler with an NVIDIA cluster uses variants of these designs. The community knowledge base is enormous.", color: "#6d28d9" },
            { title: "SHARP in-network compute", desc: "NVIDIA's InfiniBand switches can perform AllReduce summations as data flows through the fabric — reducing AllReduce communication time by up to 50% at large scale. No Ethernet switch offers this.", color: "#92400e" },
            { title: "But this is not permanent", desc: "AMD MI300X's memory advantage is real. Custom silicon (TPUs, Trainium, Gaudi) will continue to grow. The networking concepts you learn here — lossless fabric, RDMA, congestion control — apply regardless of which GPU wins.", color: "#374151" },
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
