"use client"

import { useState } from "react"

type Network = "compute" | "storage" | "inband" | "oob"

interface NetworkInfo {
  label: string
  sublabel: string
  color: string
  adapters: string
  switchText: string
  bandwidth: string
  protocol: string
  description: string
}

const networks: Record<Network, NetworkInfo> = {
  compute: {
    label: "Compute fabric",
    sublabel: "GPU collective traffic",
    color: "#60a5fa",
    adapters: "Eight single-port ConnectX-7 compute adapters; four twin-port OSFP cages expose one port per adapter (OSFP1P1–OSFP4P2).",
    switchText: "QM9700 NDR InfiniBand leaf and spine switches in the DGX H100 SuperPOD reference architecture",
    bandwidth: "400 Gb/s per rail × 8 rails = 3.2 Tb/s nominal one-direction endpoint capacity",
    protocol: "InfiniBand NDR in the reference architecture; Ethernet compute fabrics are separate designs",
    description: "Carries collective and other GPU-training traffic. The rail-optimized reference design uses one compute adapter per rail and physically separate leaf/spine layers.",
  },
  storage: {
    label: "Storage fabric",
    sublabel: "Shared storage access",
    color: "#34d399",
    adapters: "Slot1 P1 and Slot2 P1 of the two dual-port ConnectX-7 adapters, configured for InfiniBand storage in the H100 SuperPOD reference design.",
    switchText: "MQM9700-NS2F / QM9700 InfiniBand storage switches in the reference architecture",
    bandwidth: "Architecture-sized storage bandwidth; the reference requires at least 40 GB/s per node rather than assuming every adapter port is storage",
    protocol: "InfiniBand storage fabric using RDMA-capable storage protocols according to the selected array/software stack",
    description: "Connects nodes to shared storage. The official H100 SuperPOD reference architecture uses InfiniBand storage; Ethernet storage is an alternative deployment design and is not mixed into this reference drawing.",
  },
  inband: {
    label: "In-band management",
    sublabel: "Host OS and cluster services",
    color: "#f59e0b",
    adapters: "Slot1 P2 and Slot2 P2 of the two dual-port ConnectX-7 adapters, configured as Ethernet in the documented default port mapping.",
    switchText: "SN4600C 100GbE Ethernet switches in the reference architecture",
    bandwidth: "100GbE-class redundant in-band management connectivity in the reference design; dual-port Slot3 and 10GbE host-management interfaces are separate hardware capabilities",
    protocol: "Ethernet/IP for provisioning, telemetry, scheduler/fabric-management access, home filesystem/service access, and related control traffic",
    description: "Provides operational access to the host OS and cluster services. In-band management is logically distinct from storage even when designs consolidate or share Ethernet infrastructure.",
  },
  oob: {
    label: "Out-of-band management",
    sublabel: "BMC / Redfish / IPMI",
    color: "#cbd5e1",
    adapters: "Dedicated 1GbE RJ45 BMC interface. The adjacent onboard LAN/host-management port is not the BMC interface.",
    switchText: "SN2201 1GbE Ethernet switches in the reference architecture",
    bandwidth: "1 GbE BMC connectivity",
    protocol: "Redfish, IPMI, SNMP, KVM, and web management as supported by the BMC",
    description: "Provides independent platform-management access when production networking or the host OS is unhealthy. It is physically and functionally distinct from in-band management.",
  },
}

function cable(x1: number, y1: number, x2: number, y2: number, net: Network, selected: Network) {
  const active = selected === net
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={networks[net].color} strokeWidth={active ? 3 : 1.2} opacity={active ? 1 : 0.28} strokeLinecap="round" data-testid={`fabric-link-${net}`} data-active={active ? "true" : "false"} />
}

export function FullWiringViz() {
  const [selected, setSelected] = useState<Network>("compute")
  const current = networks[selected]

  return (
    <div data-testid="full-wiring-viz" className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">DGX H100 SuperPOD reference — four functional networks</p>
      <p className="mb-4 text-xs leading-5 text-slate-500">The drawing represents the documented H100 reference allocation: Slot1/Slot2 port 1 for InfiniBand storage, Slot1/Slot2 port 2 for Ethernet in-band management, and the dedicated BMC port for out-of-band management. Adapter hardware capability, factory-default port mode, reference architecture configuration, and alternative deployment designs are different concepts.</p>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="Fabric function selector">
        {(Object.keys(networks) as Network[]).map((id) => (
          <button key={id} type="button" aria-pressed={selected === id} onClick={() => setSelected(id)}
            className="rounded-xl px-3 py-2 text-left text-xs"
            style={{ backgroundColor: selected === id ? `${networks[id].color}22` : "#0f172a", border: `1px solid ${selected === id ? networks[id].color : "#1e293b"}`, color: selected === id ? networks[id].color : "#94a3b8" }}>
            <div className="font-semibold">{networks[id].label}</div>
            <div className="mt-1 text-[10px] opacity-75">{networks[id].sublabel}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
          <svg viewBox="0 0 570 330" className="w-full" role="img" aria-label={`DGX H100 four-fabric wiring: ${current.label} selected`} data-testid={`fabric-diagram-${selected}`}>
            <rect x="25" y="72" width="180" height="218" rx="12" fill="#0f172a" stroke="#334155" />
            <text x="115" y="94" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="700">DGX H100 node</text>
            <text x="115" y="111" textAnchor="middle" fill="#4ade80" fontSize="8">8× H100 GPU</text>

            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <rect x={43 + i * 38} y="126" width="30" height="28" rx="5" fill="#166534" stroke="#22c55e" />
                <text x={58 + i * 38} y="144" textAnchor="middle" fill="#bbf7d0" fontSize="7">OSFP{i + 1}</text>
              </g>
            ))}
            <text x="115" y="172" textAnchor="middle" fill="#60a5fa" fontSize="7">4 twin-port cages · 8 compute CX7 ports</text>

            <rect x="43" y="190" width="62" height="26" rx="5" fill={selected === "storage" ? "#064e3b" : "#172033"} stroke={networks.storage.color} />
            <text x="74" y="207" textAnchor="middle" fill="#a7f3d0" fontSize="7">Slot1/2 P1</text>
            <rect x="112" y="190" width="62" height="26" rx="5" fill={selected === "inband" ? "#451a03" : "#172033"} stroke={networks.inband.color} />
            <text x="143" y="207" textAnchor="middle" fill="#fde68a" fontSize="7">Slot1/2 P2</text>
            <rect x="43" y="232" width="62" height="24" rx="5" fill={selected === "oob" ? "#1e293b" : "#0f172a"} stroke={networks.oob.color} />
            <text x="74" y="248" textAnchor="middle" fill="#e2e8f0" fontSize="7">BMC 1GbE</text>
            <rect x="112" y="232" width="62" height="24" rx="5" fill="#0f172a" stroke="#475569" />
            <text x="143" y="248" textAnchor="middle" fill="#94a3b8" fontSize="7">Slot3 / 10GbE</text>

            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => cable(58 + (i % 4) * 38, 154, 274, 58 + i * 12, "compute", selected))}
            {cable(74, 190, 274, 198, "storage", selected)}
            {cable(143, 190, 274, 238, "inband", selected)}
            {cable(74, 232, 274, 282, "oob", selected)}

            <rect x="274" y="42" width="120" height="92" rx="8" fill={selected === "compute" ? "#172554" : "#0f172a"} stroke={networks.compute.color} />
            <text x="334" y="65" textAnchor="middle" fill="#bfdbfe" fontSize="9" fontWeight="700">COMPUTE</text>
            <text x="334" y="82" textAnchor="middle" fill="#93c5fd" fontSize="8">QM9700 leaf</text>
            <text x="334" y="98" textAnchor="middle" fill="#93c5fd" fontSize="8">QM9700 spine</text>
            <text x="334" y="116" textAnchor="middle" fill="#60a5fa" fontSize="7">NDR InfiniBand</text>

            <rect x="274" y="168" width="120" height="54" rx="8" fill={selected === "storage" ? "#064e3b" : "#0f172a"} stroke={networks.storage.color} />
            <text x="334" y="190" textAnchor="middle" fill="#a7f3d0" fontSize="9" fontWeight="700">STORAGE</text>
            <text x="334" y="207" textAnchor="middle" fill="#6ee7b7" fontSize="8">MQM9700 IB</text>

            <rect x="274" y="228" width="120" height="42" rx="8" fill={selected === "inband" ? "#451a03" : "#0f172a"} stroke={networks.inband.color} />
            <text x="334" y="246" textAnchor="middle" fill="#fde68a" fontSize="9" fontWeight="700">IN-BAND MGMT</text>
            <text x="334" y="261" textAnchor="middle" fill="#fbbf24" fontSize="8">SN4600C 100GbE</text>

            <rect x="274" y="276" width="120" height="34" rx="8" fill={selected === "oob" ? "#1e293b" : "#0f172a"} stroke={networks.oob.color} />
            <text x="334" y="291" textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="700">OOB BMC</text>
            <text x="334" y="304" textAnchor="middle" fill="#cbd5e1" fontSize="8">SN2201 1GbE</text>

            <rect x="430" y="72" width="112" height="218" rx="10" fill="#020617" stroke="#1e293b" />
            <text x="486" y="95" textAnchor="middle" fill="#64748b" fontSize="9">Fabric roles</text>
            {(Object.keys(networks) as Network[]).map((id, i) => (
              <g key={id}>
                <circle cx="452" cy={126 + i * 42} r="7" fill={networks[id].color} opacity={selected === id ? 1 : 0.35} />
                <text x="466" y={130 + i * 42} fill={selected === id ? networks[id].color : "#64748b"} fontSize="8">{networks[id].label}</text>
              </g>
            ))}
          </svg>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4" data-testid={`fabric-details-${selected}`}>
          <h3 className="text-sm font-semibold" style={{ color: current.color }}>{current.label}</h3>
          <p className="mt-1 text-xs text-slate-500">{current.sublabel}</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">{current.description}</p>
          <dl className="mt-4 space-y-3 text-xs">
            {[
              ["Adapter mapping", current.adapters],
              ["Reference switches", current.switchText],
              ["Bandwidth scope", current.bandwidth],
              ["Protocol / function", current.protocol],
            ].map(([term, value]) => (
              <div key={term} className="rounded-lg bg-slate-900/80 p-3">
                <dt className="font-semibold text-slate-200">{term}</dt>
                <dd className="mt-1 leading-5 text-slate-400">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}

export default FullWiringViz
