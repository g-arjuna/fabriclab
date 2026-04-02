"use client"

import { useState } from "react"

type ComponentId = "cpu" | "ram" | "nic" | "storage" | "switch" | "cable"

interface Component {
  id: ComponentId
  label: string
  sublabel: string
  color: string
  borderColor: string
  description: string
  detail: string
  specs: string[]
}

const COMPONENTS: Component[] = [
  {
    id: "cpu",
    label: "CPU × 2",
    sublabel: "Intel Xeon Platinum",
    color: "#1e293b",
    borderColor: "#475569",
    description: "The brain of a normal server",
    detail: "Two CPUs handle everything — compute, network packet processing, storage I/O. In enterprise servers the CPU is the bottleneck. Every network packet passes through the kernel, which the CPU processes. At 25GbE this is manageable. At 400GbE it becomes impossible — CPUs simply cannot process packets fast enough.",
    specs: ["28 cores each", "56 total cores", "~200W TDP", "Handles all packet processing"],
  },
  {
    id: "ram",
    label: "RAM",
    sublabel: "256–512 GB DDR4",
    color: "#1e293b",
    borderColor: "#475569",
    description: "Working memory for applications",
    detail: "Standard DDR4 system memory. All network packets pass through system RAM on their way in and out — the kernel buffers them here. This copy operation (kernel space → user space) is one of the things RDMA eliminates entirely in HPC networking.",
    specs: ["256–512 GB DDR4", "8-channel", "~200 GB/s bandwidth", "Packets buffered here"],
  },
  {
    id: "nic",
    label: "NIC × 2",
    sublabel: "25 GbE commodity",
    color: "#1e293b",
    borderColor: "#475569",
    description: "Moves packets to/from the kernel",
    detail: "A commodity NIC at 25GbE. Its entire job is to hand packets to the kernel and receive packets from the kernel. The CPU processes every packet. The NIC has no intelligence — it is a dumb pipe. This is fine for enterprise workloads. It will not work for GPU training.",
    specs: ["2× 25 GbE", "50 Gb/s total", "Kernel-mediated", "CPU processes all packets"],
  },
  {
    id: "storage",
    label: "Storage",
    sublabel: "SAS/SATA HDDs or SSDs",
    color: "#1e293b",
    borderColor: "#475569",
    description: "Application and OS data",
    detail: "Standard SAS or SATA drives for OS and application data. Nothing exotic. In HPC storage, this gets replaced by NVMe U.2 SSDs with PCIe Gen4 bandwidth — and then further by GPUDirect Storage which bypasses system RAM entirely.",
    specs: ["8–24 drives", "SAS/SATA", "Sequential read ~1 GB/s", "CPU mediates all I/O"],
  },
  {
    id: "switch",
    label: "ToR Switch",
    sublabel: "48× 25GbE + 8× 100G uplink",
    color: "#1e293b",
    borderColor: "#6366f1",
    description: "Top-of-rack Ethernet switch",
    detail: "A standard top-of-rack switch. 48 downlink ports at 25GbE for servers, 8 uplink ports at 100GbE toward the aggregation layer. Runs RSTP or MSTP for loop prevention. BGP or OSPF for routing. You know this device. The AI networking equivalent is the leaf switch — same physical position, completely different technology.",
    specs: ["48× 25GbE downlinks", "8× 100GbE uplinks", "~1.2 Tb/s capacity", "Standard Ethernet protocols"],
  },
  {
    id: "cable",
    label: "DAC / Fibre",
    sublabel: "25GbE connections",
    color: "#1e293b",
    borderColor: "#475569",
    description: "Copper DAC or optical fibre",
    detail: "Direct Attach Copper (DAC) for short runs under 7m, or SFP28 optical transceivers for longer distances. In HPC, cables are OSFP or QSFP-DD running at 400G — they generate significant heat and require careful cable management. A fully populated DGX SuperPOD has thousands of these cables.",
    specs: ["DAC up to 7m", "SFP28 optical for longer", "25G per lane", "Passive copper or active optical"],
  },
]

export function EnterpriseBaselineViz() {
  const [selected, setSelected] = useState<Component | null>(null)

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        Enterprise server + switch — the familiar baseline
      </p>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Server diagram */}
        <div className="w-full max-w-[280px] flex-shrink-0 space-y-1">
          <div className="mb-1 text-xs text-slate-500">Server (2U)</div>
          <div className="space-y-1 rounded-xl border border-slate-700 bg-slate-950 p-3">
            {COMPONENTS.slice(0, 4).map(comp => (
              <button
                key={comp.id}
                onClick={() => setSelected(selected?.id === comp.id ? null : comp)}
                className="w-full rounded-lg px-3 py-2 text-left text-xs transition-all hover:brightness-125"
                style={{
                  backgroundColor: selected?.id === comp.id ? "#1e3a5f" : "#0f172a",
                  border: `1px solid ${selected?.id === comp.id ? "#60a5fa" : comp.borderColor}`,
                }}
              >
                <span className="font-semibold text-slate-200">{comp.label}</span>
                <span className="ml-2 text-slate-500">{comp.sublabel}</span>
              </button>
            ))}
          </div>

          {/* Cable */}
          <div className="flex items-center justify-center py-1">
            <button
              onClick={() => setSelected(selected?.id === "cable" ? null : COMPONENTS[5])}
              className="flex flex-col items-center gap-0.5"
            >
              <div className={`h-6 w-0.5 ${selected?.id === "cable" ? "bg-cyan-400" : "bg-slate-600"}`} />
              <span className={`text-[9px] ${selected?.id === "cable" ? "text-cyan-400" : "text-slate-600"}`}>25GbE</span>
              <div className={`h-6 w-0.5 ${selected?.id === "cable" ? "bg-cyan-400" : "bg-slate-600"}`} />
            </button>
          </div>

          {/* Switch */}
          <button
            onClick={() => setSelected(selected?.id === "switch" ? null : COMPONENTS[4])}
            className="w-full rounded-xl px-3 py-3 text-left text-xs transition-all hover:brightness-125"
            style={{
              backgroundColor: selected?.id === "switch" ? "#1e1b4b" : "#0f0a2e",
              border: `1px solid ${selected?.id === "switch" ? "#818cf8" : "#4338ca"}`,
            }}
          >
            <div className="font-semibold text-indigo-300">ToR Switch</div>
            <div className="text-indigo-500 text-[10px] mt-0.5">48× 25GbE + 8× 100G uplink</div>
            <div className="mt-2 flex gap-1 flex-wrap">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="h-2 w-2 rounded-sm bg-indigo-800" />
              ))}
              <span className="text-[9px] text-indigo-700 ml-1">... 48 ports</span>
            </div>
          </button>
        </div>

        {/* Detail panel — mt-6 added to give breathing room from the diagram */}
        <div className="flex-1 mt-6 lg:mt-0">
          {selected ? (
            <div className="rounded-xl border border-white/10 bg-slate-800 p-4 h-full">
              <h3 className="text-sm font-semibold text-white">{selected.label}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{selected.description}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{selected.detail}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {selected.specs.map(s => (
                  <span key={s} className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300">{s}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-slate-600 p-6 text-center gap-3">
              <span>Click any component to understand its role</span>
              <span className="text-xs text-slate-700">This is the baseline we are about to leave behind</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EnterpriseBaselineViz
