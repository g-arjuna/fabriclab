// IBvsRoCEInfraViz.tsx
"use client"
import { useState } from "react"

type Filter = "all" | "changes" | "same"

const rows = [
  { layer: "NIC firmware mode", ib: "LINK_TYPE = IB(1)", eth: "LINK_TYPE = ETH(2)", changes: true },
  { layer: "NIC addressing", ib: "LID assigned by SM", eth: "MAC + IP address", changes: true },
  { layer: "Congestion/loss design", ib: "Credit-based loss avoidance under correct operation", eth: "Design-dependent; course reference commonly uses PFC/ECN", changes: true },
  { layer: "Leaf switches", ib: "Example: NVIDIA Quantum-generation IB switches", eth: "Example: Spectrum-generation or other suitable Ethernet switches", changes: true },
  { layer: "Spine switches", ib: "InfiniBand spine models", eth: "Ethernet spine models", changes: true },
  { layer: "Switch OS", ib: "NVIDIA ONYX", eth: "Cumulus Linux / SONiC", changes: true },
  { layer: "Fabric management", ib: "Subnet Manager required; UFM optional management platform", eth: "Distributed, per-switch config", changes: true },
  { layer: "Congestion-loss avoidance", ib: "Credit-based mechanism; failures still possible", eth: "QoS/congestion-control design-dependent; transport recovery remains relevant", changes: true },
  { layer: "Multi-tenancy", ib: "IB partitions (pkeys)", eth: "Standard VLANs / VXLANs", changes: true },
  { layer: "Diagnostic tooling", ib: "ibdiagnet, UFM console", eth: "show dcb pfc, ethtool", changes: true },
  { layer: "Physical connectivity", ib: "OSFP/QSFP variants — validate exact support", eth: "OSFP/QSFP variants — form factor alone does not prove interoperability", changes: true },
  { layer: "Rail topology", ib: "Rail-affinity reference wiring", eth: "Rail-affinity reference wiring can be similar", changes: false },
  { layer: "DGX node hardware", ib: "Unchanged", eth: "Unchanged", changes: false },
  { layer: "NVLink / NVSwitch", ib: "Unchanged", eth: "Unchanged", changes: false },
  { layer: "DGX OS", ib: "Unchanged", eth: "Unchanged", changes: false },
  { layer: "CUDA / framework", ib: "Unchanged", eth: "Unchanged", changes: false },
  { layer: "Storage fabric", ib: "Deployment-dependent (IB or Ethernet in reference designs)", eth: "Deployment-dependent (IB or Ethernet in reference designs)", changes: false },
  { layer: "Management network", ib: "Architecture-dependent in-band/out-of-band design", eth: "Architecture-dependent in-band/out-of-band design", changes: false },
  { layer: "ibstat tool", ib: "Works (shows IB layer)", eth: "Works (shows RDMA layer)", changes: false },
  { layer: "NCCL / training job", ib: "Same collective semantics", eth: "Same collective semantics; tuning and transport configuration can differ", changes: false },
]

const ibColor = "#818cf8"
const ethColor = "#22c55e"
const changesColor = "#f59e0b"
const sameColor = "#64748b"

export function IBvsRoCEInfraViz() {
  const [filter, setFilter] = useState<Filter>("all")

  const visible = rows.filter(r => {
    if (filter === "changes") return r.changes
    if (filter === "same") return !r.changes
    return true
  })

  const filterBtns: { key: Filter; label: string; count: number; color: string }[] = [
    { key: "all", label: "All layers", count: rows.length, color: "#3b82f6" },
    { key: "changes", label: "What changes", count: rows.filter(r => r.changes).length, color: changesColor },
    { key: "same", label: "What stays the same", count: rows.filter(r => !r.changes).length, color: sameColor },
  ]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">InfiniBand vs RoCEv2 — infrastructure impact</p>
      <p className="mb-4 text-xs text-slate-500">
        Adapter personality and fabric selection affect multiple external layers. Exact ConnectX-7 mode support is SKU- and firmware-dependent.
      </p>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filterBtns.map(btn => (
          <button key={btn.key} onClick={() => setFilter(btn.key)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5"
            style={{
              backgroundColor: filter === btn.key ? btn.color + "22" : "#0f172a",
              border: `1px solid ${filter === btn.key ? btn.color : "#1e293b"}`,
              color: filter === btn.key ? btn.color : "#64748b",
            }}>
            {btn.label}
            <span className="rounded px-1 text-[10px]"
              style={{ backgroundColor: btn.color + "33", color: btn.color }}>
              {btn.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 bg-[#0a0f1a]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-xs">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-3 text-slate-500 font-medium w-1/3">Layer / aspect</th>
              <th className="text-left p-3 font-medium" style={{ color: ibColor }}>
                InfiniBand mode
              </th>
              <th className="text-left p-3 font-medium" style={{ color: ethColor }}>
                Ethernet / RoCEv2 mode
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr key={row.layer}
                className={i % 2 === 0 ? "bg-white/[0.02]" : ""}
                style={row.changes ? { borderLeft: `2px solid ${changesColor}44` } : {}}>
                <td className="p-3 font-mono text-slate-400 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {row.changes
                      ? <span className="text-amber-400 text-[10px]">↕</span>
                      : <span className="text-slate-600 text-[10px]">—</span>}
                    {row.layer}
                  </div>
                </td>
                <td className="p-3" style={{ color: row.changes ? ibColor : "#475569" }}>{row.ib}</td>
                <td className="p-3" style={{ color: row.changes ? ethColor : "#475569" }}>{row.eth}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="text-amber-400">↕</span> Changes with NIC mode
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-slate-600">—</span> Stays the same
        </span>
      </div>
    </div>
  )
}

export default IBvsRoCEInfraViz
