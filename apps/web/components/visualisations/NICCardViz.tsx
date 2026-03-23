"use client"

import { useState } from "react"

interface PortInfo {
  id: string
  label: string
  description: string
  speed: string
  connector: string
  use: string
}

const PORTS: PortInfo[] = [
  {
    id: "osfp1",
    label: "OSFP port 1",
    description: "Primary data port. In a DGX H100 this connects to a leaf switch on GPU Rail 0. Carries all RDMA traffic for GPU 0. At 400 Gb/s this single port moves data faster than the total bandwidth of most enterprise data centers.",
    speed: "400 Gb/s NDR",
    connector: "OSFP (Octal Small Form-factor Pluggable)",
    use: "InfiniBand compute fabric",
  },
  {
    id: "osfp2",
    label: "OSFP port 2",
    description: "Secondary data port. Can be used as an independent 400G port or bonded with port 1 for 800G operation (with ConnectX-8). On a ConnectX-7 this is typically used as a second independent fabric connection.",
    speed: "400 Gb/s NDR",
    connector: "OSFP",
    use: "Secondary fabric or storage",
  },
  {
    id: "pcie",
    label: "PCIe x16 edge",
    description: "The PCIe Gen 5 x16 host interface. This is how the NIC connects to the server's CPU complex. With GPUDirect RDMA, data can flow directly between GPU HBM memory and the NIC, bypassing this PCIe connection entirely — which is how sub-2µs latency is achieved.",
    speed: "PCIe Gen 5 x16 (128 GB/s)",
    connector: "PCIe edge connector",
    use: "Host interface to CPU/GPU complex",
  },
  {
    id: "led",
    label: "Link LEDs",
    description: "Status LEDs showing link state. Green steady = link up and active. Green blinking = link active with traffic. Amber = link detected but not active. Off = no cable or link down. First thing to check when diagnosing connectivity issues.",
    speed: "N/A",
    connector: "N/A",
    use: "Visual link status indicator",
  },
]

export function NICCardViz() {
  const [selected, setSelected] = useState<PortInfo | null>(null)

  return (
    <div className="my-8">
      <p className="mb-3 text-xs uppercase tracking-widest text-slate-500">
        ConnectX-7 HCA — click any component
      </p>
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* NIC diagram */}
          <div className="flex-shrink-0">
            <svg viewBox="0 0 320 160" width="320" height="160">
              {/* PCB body */}
              <rect x="10" y="20" width="300" height="120" rx="4" fill="#1a2535" stroke="#334155" strokeWidth="1"/>

              {/* PCIe connector at bottom */}
              <rect x="30" y="122" width="200" height="16" rx="2" fill="#0f172a" stroke="#475569" strokeWidth="1"/>
              <text x="130" y="133" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">PCIe Gen5 x16</text>
              {/* PCIe notch */}
              <rect x="90" y="122" width="6" height="16" fill="#1a2535"/>

              {/* OSFP cages */}
              <g
                onClick={() => setSelected(selected?.id === "osfp1" ? null : PORTS[0])}
                style={{ cursor: "pointer" }}
              >
                <rect x="240" y="30" width="52" height="36" rx="3"
                  fill={selected?.id === "osfp1" ? "#0c4a6e" : "#0f2744"}
                  stroke={selected?.id === "osfp1" ? "#22d3ee" : "#1e40af"}
                  strokeWidth={selected?.id === "osfp1" ? "2" : "1"}
                />
                <rect x="248" y="38" width="36" height="20" rx="2" fill="#0a1628" stroke="#1e3a5f" strokeWidth="1"/>
                <text x="266" y="52" textAnchor="middle" fill="#60a5fa" fontSize="7" fontFamily="monospace">OSFP</text>
                <text x="266" y="62" textAnchor="middle" fill="#3b82f6" fontSize="6">400G</text>
              </g>

              <g
                onClick={() => setSelected(selected?.id === "osfp2" ? null : PORTS[1])}
                style={{ cursor: "pointer" }}
              >
                <rect x="240" y="72" width="52" height="36" rx="3"
                  fill={selected?.id === "osfp2" ? "#0c4a6e" : "#0f2744"}
                  stroke={selected?.id === "osfp2" ? "#22d3ee" : "#1e40af"}
                  strokeWidth={selected?.id === "osfp2" ? "2" : "1"}
                />
                <rect x="248" y="80" width="36" height="20" rx="2" fill="#0a1628" stroke="#1e3a5f" strokeWidth="1"/>
                <text x="266" y="94" textAnchor="middle" fill="#60a5fa" fontSize="7" fontFamily="monospace">OSFP</text>
                <text x="266" y="104" textAnchor="middle" fill="#3b82f6" fontSize="6">400G</text>
              </g>

              {/* Processor die */}
              <rect x="80" y="40" width="80" height="60" rx="4" fill="#0a1628" stroke="#1e3a5f" strokeWidth="1"/>
              <rect x="90" y="50" width="60" height="40" rx="2" fill="#111827" stroke="#374151" strokeWidth="0.5"/>
              <text x="120" y="74" textAnchor="middle" fill="#6b7280" fontSize="8" fontFamily="monospace">ConnectX-7</text>
              <text x="120" y="84" textAnchor="middle" fill="#4b5563" fontSize="6">MT4129</text>

              {/* Link LEDs */}
              <g
                onClick={() => setSelected(selected?.id === "led" ? null : PORTS[3])}
                style={{ cursor: "pointer" }}
              >
                <circle cx="215" cy="45" r="5" fill={selected?.id === "led" ? "#22c55e" : "#15803d"} stroke="#166534" strokeWidth="1"/>
                <circle cx="215" cy="65" r="5" fill={selected?.id === "led" ? "#22c55e" : "#15803d"} stroke="#166534" strokeWidth="1"/>
                <text x="225" y="48" fill="#4b5563" fontSize="7">LNK</text>
                <text x="225" y="68" fill="#4b5563" fontSize="7">ACT</text>
              </g>

              {/* PCIe label */}
              <g
                onClick={() => setSelected(selected?.id === "pcie" ? null : PORTS[2])}
                style={{ cursor: "pointer" }}
              >
                <rect x="30" y="112" width="200" height="4" rx="1"
                  fill={selected?.id === "pcie" ? "#1e40af" : "#1e293b"}
                  stroke={selected?.id === "pcie" ? "#60a5fa" : "#334155"}
                  strokeWidth="1"
                />
              </g>

              {/* Label */}
              <text x="20" y="16" fill="#475569" fontSize="8" fontFamily="monospace">NVIDIA ConnectX-7 HCA — MCX75310AAS-HEAT</text>
            </svg>
          </div>

          {/* Info panel */}
          <div className="flex-1">
            {selected ? (
              <div>
                <h3 className="text-sm font-semibold text-white">{selected.label}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-300">{selected.description}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex gap-3 text-xs">
                    <span className="text-slate-500 w-20 flex-shrink-0">Speed</span>
                    <span className="text-slate-300">{selected.speed}</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-slate-500 w-20 flex-shrink-0">Connector</span>
                    <span className="text-slate-300">{selected.connector}</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-slate-500 w-20 flex-shrink-0">Used for</span>
                    <span className="text-slate-300">{selected.use}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[80px] rounded-xl border border-dashed border-white/10 text-sm text-slate-500 p-4">
                Click any part of the NIC to learn about it
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NICCardViz