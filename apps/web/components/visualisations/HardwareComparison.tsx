"use client"

import { useState } from "react"

type ServerType = "enterprise" | "ai"

const servers = {
  enterprise: {
    label: "Enterprise 2U server",
    example: "Dell PowerEdge R750",
    color: "#374151",
    components: [
      { label: "CPUs", value: "2× Intel Xeon (28 cores each)", role: "Primary compute" },
      { label: "RAM", value: "512 GB DDR4", role: "Working memory" },
      { label: "NICs", value: "2× 25 GbE (commodity)", role: "Network connectivity — mostly afterthought" },
      { label: "GPU", value: "None (or 1× low-end for visualisation)", role: "Rarely present" },
      { label: "Storage", value: "8× SAS/SATA HDDs or SSDs", role: "Application data" },
      { label: "Total network BW", value: "50 Gb/s", role: "2× 25G NICs" },
      { label: "Power", value: "~400–800W typical", role: "" },
      { label: "NIC role", value: "Moves packets to kernel", role: "CPU handles everything" },
    ],
  },
  ai: {
    label: "AI training server",
    example: "NVIDIA DGX H100",
    color: "#1d4ed8",
    components: [
      { label: "CPUs", value: "2× Intel Xeon (56 cores each)", role: "Secondary — manages GPUs" },
      { label: "RAM", value: "2 TB DDR5", role: "OS and framework overhead" },
      { label: "NICs (HCAs)", value: "8× ConnectX-7 400G", role: "Active co-processors — bypass CPU entirely" },
      { label: "GPU", value: "8× H100 SXM5 (primary compute)", role: "Runs all training workloads" },
      { label: "Storage", value: "30× 1TB NVMe U.2", role: "OS + local checkpoints" },
      { label: "Total network BW", value: "3,200 Gb/s", role: "8× 400G NICs — 64× more than enterprise" },
      { label: "Power", value: "~10,000W at full load", role: "12.5× more than enterprise server" },
      { label: "NIC role", value: "RDMA — bypasses CPU and kernel", role: "Moves data GPU↔GPU directly" },
    ],
  },
}

export function HardwareComparison() {
  const [active, setActive] = useState<ServerType>("enterprise")

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="flex gap-3 mb-5">
        {(["enterprise", "ai"] as ServerType[]).map((type) => (
          <button
            key={type}
            onClick={() => setActive(type)}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all"
            style={{
              backgroundColor: active === type ? servers[type].color : "#1e293b",
              border: active === type ? `2px solid ${servers[type].color}` : "1px solid rgba(255,255,255,0.1)",
              color: active === type ? "#fff" : "#94a3b8",
            }}
          >
            <div>{servers[type].label}</div>
            <div className="text-xs font-normal opacity-70 mt-1">{servers[type].example}</div>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {servers[active].components.map((comp, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 rounded-xl bg-slate-800/50 px-4 py-3"
          >
            <span className="text-xs text-slate-500 sm:w-36 flex-shrink-0 mt-0.5">{comp.label}</span>
            <div className="flex-1">
              <span className="text-sm font-medium text-slate-200">{comp.value}</span>
              {comp.role && (
                <span className="ml-2 text-xs text-slate-500">{comp.role}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-500 text-center">
        Toggle between server types to compare
      </p>
    </div>
  )
}

export default HardwareComparison