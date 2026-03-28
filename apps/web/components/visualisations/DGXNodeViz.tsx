"use client"

import { useState } from "react"

type ComponentId = "gpu" | "nvswitch" | "nic" | "cpu" | "ram" | "nvme"

interface NodeComponent {
  id: ComponentId
  label: string
  count: string
  color: string
  description: string
  specs: string[]
}

const COMPONENTS: NodeComponent[] = [
  {
    id: "gpu",
    label: "H100 GPU",
    count: "× 8",
    color: "#166534",
    description: "NVIDIA H100 SXM5. The primary compute element. 80 GB HBM3 memory with 3.35 TB/s bandwidth. Connected to all other GPUs via NVSwitch at 900 GB/s. Connected to its dedicated ConnectX-7 NIC via PCIe for external communication.",
    specs: ["80 GB HBM3", "3.35 TB/s memory BW", "989 TFLOPS BF16", "700W TDP"],
  },
  {
    id: "nvswitch",
    label: "NVSwitch gen3",
    count: "× 4",
    color: "#1e3a5f",
    description: "NVIDIA NVSwitch gen3. Creates a full non-blocking all-to-all fabric between all 8 GPUs inside the node. Any GPU can send to any other GPU at 900 GB/s simultaneously. This is 18× faster than the external InfiniBand connections — which is why tensor parallelism runs within a single DGX node.",
    specs: ["900 GB/s per GPU", "7.2 TB/s total", "Non-blocking", "Sub-microsecond latency"],
  },
  {
    id: "nic",
    label: "ConnectX-7",
    count: "× 8",
    color: "#1d4ed8",
    description: "One ConnectX-7 HCA per GPU. Each NIC is dedicated to one GPU — connected via PCIe Gen5 for GPUDirect RDMA. Each NIC connects to a different leaf switch in the external fabric (rail-optimised topology). This means 8 independent 400G paths out of the node, one per GPU.",
    specs: ["400 Gb/s NDR", "PCIe Gen5 x16", "GPUDirect RDMA", "SHARP v3"],
  },
  {
    id: "cpu",
    label: "Intel Xeon",
    count: "× 2",
    color: "#4a1d96",
    description: "2× Intel Xeon Platinum 8480C (56 cores each, 112 cores total). The CPU's role is secondary in AI training — it manages the OS, NCCL library, and job scheduler. During training, CPU utilisation is typically 5–15%. The GPUs and NICs do all the heavy lifting.",
    specs: ["56 cores each", "112 total cores", "Sapphire Rapids", "60 MB L3 cache"],
  },
  {
    id: "ram",
    label: "System RAM",
    count: "2 TB",
    color: "#92400e",
    description: "2 TB DDR5 system memory. Not the primary memory for AI training — that is the 640 GB of GPU HBM3. System RAM is used for the OS, framework overhead, data loading pipelines, and CPU-side operations. With GPUDirect Storage, even data loading bypasses system RAM.",
    specs: ["2 TB DDR5", "8-channel", "3200 MT/s", "ECC protected"],
  },
  {
    id: "nvme",
    label: "NVMe SSDs",
    count: "~30 TB",
    color: "#1e293b",
    description: "~30 TB of local NVMe storage across 8× 3.84 TB U.2 drives. Used for OS, frameworks, and local checkpointing. Training datasets typically live on shared parallel storage (BeeGFS, WEKA) accessed over the storage fabric. GPUDirect Storage (GDS) can read directly from NVMe to GPU memory.",
    specs: ["8 × 3.84 TB U.2", "PCIe Gen4 NVMe", "~100 GB/s read", "GPUDirect Storage"],
  },
]

export function DGXNodeViz() {
  const [selected, setSelected] = useState<NodeComponent | null>(null)

  return (
    <div className="my-8">
      <p className="mb-3 text-xs uppercase tracking-widest text-slate-500">
        DGX H100 internals — click any component
      </p>
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
        {/* Component grid */}
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {/* 8 GPUs */}
          {Array.from({ length: 8 }).map((_, i) => (
            <button
              key={`gpu-${i}`}
              onClick={() => setSelected(selected?.id === "gpu" ? null : COMPONENTS[0])}
              className="flex flex-col items-center justify-center rounded-xl p-2 transition-all hover:brightness-110"
              style={{
                backgroundColor: selected?.id === "gpu" ? "#14532d" : "#166534",
                border: selected?.id === "gpu" ? "2px solid #22c55e" : "1px solid #15803d",
                height: 64,
              }}
            >
              <span className="text-[10px] font-bold text-green-100">H100</span>
              <span className="text-[8px] text-green-300">GPU {i}</span>
              <span className="text-[8px] text-green-400">80GB</span>
            </button>
          ))}
        </div>

        {/* NVSwitch row */}
        <div className="my-2 flex gap-2">
          <div className="flex-shrink-0 flex items-center">
            <span className="text-[9px] text-slate-500 w-16">NVSwitch</span>
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <button
              key={`nvs-${i}`}
              onClick={() => setSelected(selected?.id === "nvswitch" ? null : COMPONENTS[1])}
              className="flex-1 flex items-center justify-center rounded-lg transition-all hover:brightness-110"
              style={{
                backgroundColor: selected?.id === "nvswitch" ? "#1e3a8a" : "#1e3a5f",
                border: selected?.id === "nvswitch" ? "2px solid #60a5fa" : "1px solid #1e40af",
                height: 28,
              }}
            >
              <span className="text-[9px] font-semibold text-blue-200">NVSw {i + 1}</span>
            </button>
          ))}
        </div>

        {/* NICs row */}
        <div className="my-2 flex gap-2">
          <div className="flex-shrink-0 flex items-center">
            <span className="text-[9px] text-slate-500 w-16">ConnectX-7</span>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <button
              key={`nic-${i}`}
              onClick={() => setSelected(selected?.id === "nic" ? null : COMPONENTS[2])}
              className="flex-1 flex flex-col items-center justify-center rounded-lg transition-all hover:brightness-110"
              style={{
                backgroundColor: selected?.id === "nic" ? "#1e3a8a" : "#1d4ed8",
                border: selected?.id === "nic" ? "2px solid #93c5fd" : "1px solid #2563eb",
                height: 36,
              }}
            >
              <span className="text-[8px] font-bold text-blue-100">CX-7</span>
              <span className="text-[7px] text-blue-300">Rail {i}</span>
            </button>
          ))}
        </div>

        {/* CPU / RAM / NVMe row */}
        <div className="my-2 flex gap-2">
          <div className="flex-shrink-0 flex items-center">
            <span className="text-[9px] text-slate-500 w-16">System</span>
          </div>
          {[COMPONENTS[3], COMPONENTS[4], COMPONENTS[5]].map((comp) => (
            <button
              key={comp.id}
              onClick={() => setSelected(selected?.id === comp.id ? null : comp)}
              className="flex-1 flex flex-col items-center justify-center rounded-lg transition-all hover:brightness-110"
              style={{
                backgroundColor: selected?.id === comp.id
                  ? comp.color
                  : comp.color,
                border: selected?.id === comp.id ? "2px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
                height: 40,
                opacity: selected?.id === comp.id ? 1 : 0.75,
              }}
            >
              <span className="text-[9px] font-semibold text-slate-200">{comp.label}</span>
              <span className="text-[8px] text-slate-400">{comp.count}</span>
            </button>
          ))}
        </div>

        {/* External ports label */}
        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="flex gap-2">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-[9px] text-slate-500 w-16">External</span>
            </div>
            <div className="flex-1 flex gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`port-${i}`}
                  className="flex-1 flex items-center justify-center rounded text-[7px] font-mono"
                  style={{
                    backgroundColor: "#0a1628",
                    border: "1px solid #1e3a5f",
                    height: 20,
                    color: "#3b82f6",
                  }}
                >
                  ↑{i}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-1 text-[9px] text-slate-600 ml-20">
            8 OSFP ports → 8 different leaf switches (rail-optimised)
          </p>
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-800 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {selected.label} {selected.count}
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                close ×
              </button>
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-300">{selected.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.specs.map(spec => (
                <span
                  key={spec}
                  className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-center text-xs text-slate-600">
            Click any component to learn about it
          </p>
        )}
      </div>
    </div>
  )
}

export default DGXNodeViz
