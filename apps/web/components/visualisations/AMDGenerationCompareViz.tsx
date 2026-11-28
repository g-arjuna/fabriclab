"use client"

import { useState } from "react"

type Id = "mi300x" | "mi325x" | "mi350x" | "mi355x"

const rows = [
  { id: "mi300x" as Id, label: "MI300X", year: "2023", color: "#f59e0b", memory: "192 GB HBM3", memBw: "5.3 TB/s", p2p: 896, totalIo: "1,024 GB/s", power: "750 W", note: "CDNA 3 baseline. Seven scale-up links per GPU connect to the other seven GPUs in the 8-OAM platform; a separate PCIe Gen5 x16 connection faces the host/I/O domain." },
  { id: "mi325x" as Id, label: "MI325X", year: "2024", color: "#f97316", memory: "256 GB HBM3E", memBw: "6.0 TB/s", p2p: 896, totalIo: "1,024 GB/s", power: "1,000 W", note: "Same documented P2P ring aggregate bandwidth as MI300X, with larger and faster HBM3E. Do not replace the 896 GB/s peak metric with an undocumented measured collective number." },
  { id: "mi350x" as Id, label: "MI350X", year: "2025", color: "#ef4444", memory: "288 GB HBM3E", memBw: "8.0 TB/s", p2p: 1075.2, totalIo: "1,203.2 GB/s", power: "1,000 W", note: "CDNA 4 increases documented P2P ring aggregate bandwidth by approximately 20% under this metric: 1,075.2 / 896 = 1.2." },
  { id: "mi355x" as Id, label: "MI355X", year: "2025", color: "#dc2626", memory: "288 GB HBM3E", memBw: "8.0 TB/s", p2p: 1075.2, totalIo: "1,203.2 GB/s", power: "1,400 W", note: "Liquid-cooled variant with higher power envelope; interconnect metric is the same in the ROCm comparison table." },
]

export function AMDGenerationCompareViz() {
  const [selected, setSelected] = useState<Id>("mi325x")
  const current = rows.find((row) => row.id === selected) ?? rows[1]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-[#0a0f1a] p-5 text-slate-100">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">AMD Instinct generations — official metric definitions</p>
      <p className="mb-4 text-xs leading-5 text-slate-500">
        The chart uses ROCm's “P2P ring aggregate BW” metric in decimal GB/s, aggregate bidirectional. It is a peak architectural bandwidth metric, not measured RCCL algorithm bandwidth or RCCL bus bandwidth.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {rows.map((row) => (
          <button key={row.id} type="button" onClick={() => setSelected(row.id)}
            className="rounded-full px-3 py-2 text-xs"
            style={{ border: `1px solid ${selected === row.id ? row.color : "#1e293b"}`, backgroundColor: selected === row.id ? `${row.color}18` : "#0f172a", color: selected === row.id ? row.color : "#94a3b8" }}>
            {row.label} · {row.year}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
          <div className="mb-3 text-[10px] uppercase tracking-widest text-slate-500">P2P ring aggregate bandwidth</div>
          {rows.map((row) => (
            <div key={row.id} className="mb-3">
              <div className="mb-1 flex justify-between gap-3 text-xs">
                <span style={{ color: row.id === selected ? row.color : "#94a3b8" }}>{row.label}</span>
                <span className="font-mono" style={{ color: row.id === selected ? row.color : "#94a3b8" }}>{row.p2p} GB/s</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full" style={{ width: `${(row.p2p / 1075.2) * 100}%`, backgroundColor: row.id === selected ? row.color : "#475569" }} />
              </div>
            </div>
          ))}
          <p className="mt-3 text-xs leading-5 text-slate-500">
            AMD product pages may also report broader “total aggregate I/O” or per-link numbers. Those figures describe different scopes. Mixing them in one comparison is a units error.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">Selected generation</div>
          <dl className="space-y-2 text-xs">
            {[
              ["Memory", current.memory],
              ["Peak memory bandwidth", current.memBw],
              ["P2P ring aggregate", `${current.p2p} GB/s`],
              ["Total peak aggregate I/O", current.totalIo],
              ["Maximum power", current.power],
            ].map(([term, value]) => (
              <div key={term} className="grid gap-1 sm:grid-cols-[150px_1fr]"><dt className="text-slate-500">{term}</dt><dd className="text-slate-200">{value}</dd></div>
            ))}
          </dl>
          <p className="mt-3 text-sm leading-6 text-slate-300">{current.note}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-7 text-amber-100">
        Scale-up bandwidth constrains what communication can stay inside a node, but it does not by itself prove faster training. RCCL/NCCL algorithm bandwidth, bus bandwidth, message sizes, clock behavior, memory pressure, software versions, and workload partitioning all affect measured results.
      </div>
    </div>
  )
}

export default AMDGenerationCompareViz
