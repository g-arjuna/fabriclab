// IBvsRoCEInfraViz.tsx
"use client"
import { useState } from "react"

type Filter = "all" | "changes" | "same"

const rows = [
  { layer: "NIC firmware mode", ib: "LINK_TYPE = IB(1)", eth: "LINK_TYPE = ETH(2)", changes: true },
  { layer: "NIC addressing", ib: "LID assigned by SM", eth: "MAC + IP address", changes: true },
  { layer: "Flow control", ib: "Credit-based (protocol)", eth: "PFC + ECN (configured)", changes: true },
  { layer: "Leaf switches", ib: "QM9700 (IB NDR)", eth: "SN5600 (Ethernet)", changes: true },
  { layer: "Spine switches", ib: "Q3400 (IB)", eth: "Standard Ethernet", changes: true },
  { layer: "Switch OS", ib: "NVIDIA ONYX", eth: "Cumulus Linux / SONiC", changes: true },
  { layer: "Fabric management", ib: "UFM — centralised SM", eth: "Distributed, per-switch config", changes: true },
  { layer: "Lossless mechanism", ib: "Built into protocol", eth: "PFC + ECN on every port", changes: true },
  { layer: "Multi-tenancy", ib: "IB partitions (pkeys)", eth: "Standard VLANs / VXLANs", changes: true },
  { layer: "Diagnostic tooling", ib: "ibdiagnet, UFM console", eth: "show dcb pfc, ethtool", changes: true },
  { layer: "Physical cables", ib: "QSFP56 / OSFP", eth: "QSFP56 / OSFP (same)", changes: false },
  { layer: "Rail topology", ib: "1 NIC per GPU, per switch", eth: "1 NIC per GPU, per switch (same)", changes: false },
  { layer: "DGX node hardware", ib: "Unchanged", eth: "Unchanged", changes: false },
  { layer: "NVLink / NVSwitch", ib: "Unchanged", eth: "Unchanged", changes: false },
  { layer: "DGX OS", ib: "Unchanged", eth: "Unchanged", changes: false },
  { layer: "CUDA / framework", ib: "Unchanged", eth: "Unchanged", changes: false },
  { layer: "Storage fabric", ib: "Always Ethernet (separate)", eth: "Always Ethernet (separate)", changes: false },
  { layer: "Management network", ib: "Always 1GbE / 10GbE", eth: "Always 1GbE / 10GbE", changes: false },
  { layer: "ibstat tool", ib: "Works (shows IB layer)", eth: "Works (shows RDMA layer)", changes: false },
  { layer: "NCCL / training job", ib: "Unchanged", eth: "Unchanged", changes: false },
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
        The ConnectX-7 mode selection propagates through every external layer. The DGX node itself is untouched.
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
      <div className="rounded-xl bg-[#0a0f1a] border border-white/10 overflow-hidden">
        <table className="w-full text-xs">
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
