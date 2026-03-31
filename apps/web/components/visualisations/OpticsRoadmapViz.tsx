"use client"
import { useState } from "react"

// ── OpticsRoadmapViz ────────────────────────────────────────────────────────
// Interactive timeline: optics speed generations mapped to DGX hardware eras
// Click any generation to expand its detail panel

type Gen = "200G" | "400G" | "800G" | "1600G" | "3200G"

const generations: {
  id: Gen
  speed: string
  label: string
  status: "deployed" | "ramping" | "early" | "future"
  statusLabel: string
  dgx: string
  nic: string
  switchPort: string
  formFactor: string
  lanesConfig: string
  modulation: string
  fec: boolean
  keyFact: string
  color: string
  border: string
}[] = [
  {
    id: "200G",
    speed: "200G",
    label: "HDR InfiniBand era",
    status: "deployed",
    statusLabel: "Legacy — still in production",
    dgx: "DGX A100",
    nic: "ConnectX-6",
    switchPort: "200G HDR",
    formFactor: "QSFP56",
    lanesConfig: "4 × 50G",
    modulation: "PAM-4",
    fec: true,
    keyFact: "First generation to require PAM-4. Many A100 clusters still running.",
    color: "#1e293b",
    border: "#475569",
  },
  {
    id: "400G",
    speed: "400G",
    label: "NDR era — current H100 baseline",
    status: "deployed",
    statusLabel: "✓ Production baseline (2023–present)",
    dgx: "DGX H100 / DGX H200",
    nic: "ConnectX-7",
    switchPort: "400G OSFP",
    formFactor: "OSFP / QSFP-DD",
    lanesConfig: "8 × 50G or 4 × 100G",
    modulation: "PAM-4",
    fec: true,
    keyFact: "DGX H100 and DGX H200 both operate at 400G per NIC port with ConnectX-7. H200 is a Hopper-generation product (SXM5 die, higher-bandwidth HBM3e) -- same NIC generation as H100. Supply stable, costs falling.",
    color: "#14532d",
    border: "#22c55e",
  },
  {
    id: "800G",
    speed: "800G",
    label: "B200 / GB200 era (Blackwell) -- ramping now",
    status: "ramping",
    statusLabel: "⚡ Fastest-growing segment (Dell'Oro 2026)",
    dgx: "DGX B200 / DGX GB200",
    nic: "ConnectX-8 (Blackwell-era NIC)",
    switchPort: "800G OSFP",
    formFactor: "OSFP",
    lanesConfig: "8 × 100G",
    modulation: "PAM-4",
    fec: true,
    keyFact: "Virtually all hyperscalers moving to 800G now. ~90M 800G/1.6T ports forecast front-end over 5 years.",
    color: "#1e3a5f",
    border: "#60a5fa",
  },
  {
    id: "1600G",
    speed: "1.6T",
    label: "OSFP-XD era — early ramp 2026",
    status: "early",
    statusLabel: "Early ramp — select hyperscale & NVIDIA",
    dgx: "B300 era (projected)",
    nic: "ConnectX-9 (projected)",
    switchPort: "1.6T OSFP-XD",
    formFactor: "OSFP-XD (OSFP Extended Density)",
    lanesConfig: "8 × 200G",
    modulation: "448G PAM-4",
    fec: true,
    keyFact: "OSFP-XD standardised by OCP. 92% of 2025 hyperscale contracts specify OSFP-XD. Volume shipments H2 2026.",
    color: "#4c1d95",
    border: "#a78bfa",
  },
  {
    id: "3200G",
    speed: "3.2T",
    label: "Next generation — 2027+",
    status: "future",
    statusLabel: "Demonstrated 2025 — commercial 2027+",
    dgx: "Future DGX (unannounced)",
    nic: "Future NIC",
    switchPort: "3.2T OSFP-XD",
    formFactor: "OSFP-XD",
    lanesConfig: "16 × 200G",
    modulation: "448G PAM-4",
    fec: true,
    keyFact: "16-fiber MPO connectors required. Amazon, Google, Meta gearing up. Infrastructure investment decision now.",
    color: "#7f1d1d",
    border: "#ef4444",
  },
]

const statusColors: Record<string, string> = {
  deployed: "#22c55e",
  ramping: "#60a5fa",
  early: "#a78bfa",
  future: "#f59e0b",
}

export function OpticsRoadmapViz() {
  const [selected, setSelected] = useState<Gen>("400G")
  const sel = generations.find(g => g.id === selected)!

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        Optics speed roadmap — click a generation
      </p>
      <p className="mb-5 text-xs text-slate-600">
        Each generation maps to specific DGX hardware and form factors
      </p>

      {/* Timeline row */}
      <div className="relative mb-6">
        {/* connecting line */}
        <div className="absolute top-6 left-0 right-0 h-px bg-slate-700 z-0" />
        <div className="relative z-10 flex items-start justify-between gap-1">
          {generations.map(g => {
            const isSelected = g.id === selected
            return (
              <button
                key={g.id}
                onClick={() => setSelected(g.id)}
                className="flex flex-col items-center gap-2 flex-1 min-w-0"
              >
                {/* circle */}
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center transition-all text-[10px] font-bold"
                  style={{
                    backgroundColor: isSelected ? g.border : g.color,
                    border: `2px solid ${g.border}`,
                    color: "#fff",
                    boxShadow: isSelected ? `0 0 16px ${g.border}55` : "none",
                    transform: isSelected ? "scale(1.15)" : "scale(1)",
                  }}
                >
                  {g.speed}
                </div>
                {/* status dot */}
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: statusColors[g.status] }}
                />
                <span
                  className="text-[9px] text-center leading-3 max-w-[70px]"
                  style={{ color: isSelected ? g.border : "#475569" }}
                >
                  {g.dgx.split(" ")[0] + " " + (g.dgx.split(" ")[1] ?? "")}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-5 flex-wrap">
        {[
          { s: "deployed", l: "In production" },
          { s: "ramping", l: "Ramping now" },
          { s: "early", l: "Early ramp" },
          { s: "future", l: "Future" },
        ].map(x => (
          <div key={x.s} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColors[x.s] }} />
            <span className="text-[9px] text-slate-500">{x.l}</span>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      <div
        className="rounded-xl p-4 transition-all"
        style={{ backgroundColor: sel.color + "33", border: `1px solid ${sel.border}44` }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <span
              className="text-2xl font-black font-mono"
              style={{ color: sel.border }}
            >
              {sel.speed}
            </span>
            <span className="ml-3 text-sm text-slate-300">{sel.label}</span>
          </div>
          <span
            className="text-[9px] rounded-full px-2 py-0.5 font-medium"
            style={{ backgroundColor: statusColors[sel.status] + "22", color: statusColors[sel.status] }}
          >
            {sel.statusLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
          {[
            { label: "DGX generation", value: sel.dgx },
            { label: "NIC", value: sel.nic },
            { label: "Switch port", value: sel.switchPort },
            { label: "Form factor", value: sel.formFactor },
            { label: "Lane config", value: sel.lanesConfig },
            { label: "Modulation", value: sel.modulation },
          ].map(row => (
            <div key={row.label} className="rounded-lg bg-slate-900/60 p-2">
              <div className="text-[9px] text-slate-500 mb-0.5">{row.label}</div>
              <div className="text-slate-200 font-medium text-[11px]">{row.value}</div>
            </div>
          ))}
        </div>

        <div
          className="rounded-lg p-3 text-[11px] leading-5 text-slate-300"
          style={{ backgroundColor: sel.border + "11", borderLeft: `3px solid ${sel.border}` }}
        >
          {sel.keyFact}
        </div>
      </div>

      {/* DGX → optics dependency note */}
      <p className="mt-4 text-[10px] text-slate-600 leading-4">
        Fiber plant: OM4 supports 400G, 800G, and 1.6T — only transceivers and switch ports change between generations.
        Plan fiber for 10 years. Plan transceivers and switches for a 3-year refresh cycle.
      </p>
    </div>
  )
}

export default OpticsRoadmapViz
