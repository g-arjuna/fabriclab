"use client"
import { useState } from "react"

// ── FormFactorViz ─────────────────────────────────────────────────────────────
// Compares OSFP / QSFP-DD / OSFP-XD form factors.
// Left column: selector. Right: specs + power budget + compatibility notes.

type FormFactor = "qsfp28" | "qsfp56" | "qsfpdd400" | "qsfpdd800" | "osfp400" | "osfp800" | "osfpxd"

const formFactors: {
  id: FormFactor
  name: string
  speed: string
  lanes: string
  modulation: string
  powerW: number
  backwardCompat: string[]
  whereUsed: string
  dgxUsed: boolean
  color: string
  border: string
  note: string
}[] = [
  {
    id: "qsfp28",
    name: "QSFP28",
    speed: "100G",
    lanes: "4 × 25G",
    modulation: "NRZ",
    powerW: 3.5,
    backwardCompat: ["QSFP+"],
    whereUsed: "Legacy 100G switches, storage networking",
    dgxUsed: false,
    color: "#1e293b",
    border: "#475569",
    note: "Legacy. Still widely deployed. QSFP-DD ports accept QSFP28 modules — a key backward-compat advantage.",
  },
  {
    id: "qsfp56",
    name: "QSFP56",
    speed: "200G",
    lanes: "4 × 50G",
    modulation: "PAM-4",
    powerW: 4,
    backwardCompat: ["QSFP28", "QSFP+"],
    whereUsed: "Some 200G HDR-adjacent Ethernet deployments",
    dgxUsed: false,
    color: "#1e293b",
    border: "#64748b",
    note: "Transitional form factor. QSFP-DD superseded it at 400G.",
  },
  {
    id: "qsfpdd400",
    name: "QSFP-DD 400G",
    speed: "400G",
    lanes: "8 × 50G",
    modulation: "PAM-4",
    powerW: 12,
    backwardCompat: ["QSFP28", "QSFP56", "QSFP+"],
    whereUsed: "Spine switches, mixed-generation leaf switches",
    dgxUsed: false,
    color: "#14532d",
    border: "#22c55e",
    note: "Backward compatible with all QSFP variants — one cage serves 100G legacy modules and 400G new modules. Best choice for mixed-generation infrastructure.",
  },
  {
    id: "qsfpdd800",
    name: "QSFP-DD 800G",
    speed: "800G",
    lanes: "8 × 100G",
    modulation: "PAM-4",
    powerW: 15,
    backwardCompat: ["QSFP28", "QSFP56", "QSFP-DD 400G", "QSFP+"],
    whereUsed: "Next-gen spine switches, 800G capable leaf switches",
    dgxUsed: false,
    color: "#065f46",
    border: "#10b981",
    note: "Same cage as QSFP-DD 400G. Backward compat preserved. Preferred for switch vendors who want investment protection.",
  },
  {
    id: "osfp400",
    name: "OSFP 400G",
    speed: "400G",
    lanes: "8 × 50G",
    modulation: "PAM-4",
    powerW: 15,
    backwardCompat: [],
    whereUsed: "DGX H100 NIC ports, SN5600 leaf switch ports",
    dgxUsed: true,
    color: "#1e3a5f",
    border: "#60a5fa",
    note: "Every DGX H100 NIC port is OSFP. Every SN5600 switch port is OSFP. No backward compat — purpose-built for higher power headroom. The OSFP cage is physically larger than QSFP-DD.",
  },
  {
    id: "osfp800",
    name: "OSFP 800G",
    speed: "800G",
    lanes: "8 × 100G",
    modulation: "PAM-4",
    powerW: 20,
    backwardCompat: ["OSFP 400G"],
    whereUsed: "DGX H200 / B200 NIC ports, 800G AI switches",
    dgxUsed: true,
    color: "#1e3a5f",
    border: "#93c5fd",
    note: "Same physical cage as OSFP 400G — 800G OSFP modules fit in 400G OSFP cages on switches with the right firmware. DGX B200 and H200 use 800G OSFP.",
  },
  {
    id: "osfpxd",
    name: "OSFP-XD 1.6T",
    speed: "1.6T",
    lanes: "8 × 200G",
    modulation: "448G PAM-4",
    powerW: 25,
    backwardCompat: [],
    whereUsed: "1.6T AI switches (2026+), next-gen DGX",
    dgxUsed: false,
    color: "#4c1d95",
    border: "#a78bfa",
    note: "OSFP Extended Density. New cage format — not compatible with OSFP 400G/800G cages. Standardised by OCP. 92% of 2025 hyperscale contracts specify OSFP-XD. Requires MPO-16 or higher fiber count.",
  },
]

const powerBarMax = 30

export function FormFactorViz() {
  const [selected, setSelected] = useState<FormFactor>("osfp400")
  const sel = formFactors.find(f => f.id === selected)!

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        Transceiver form factors — select to compare
      </p>
      <p className="mb-5 text-xs text-slate-600">
        Form factor determines which cage a module fits in and which devices are compatible
      </p>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">

        {/* Selector column */}
        <div className="space-y-1.5">
          {formFactors.map(f => (
            <button
              key={f.id}
              onClick={() => setSelected(f.id)}
              className="w-full rounded-xl px-3 py-2.5 text-left transition-all"
              style={{
                backgroundColor: selected === f.id ? f.color + "55" : "#0f172a",
                border: `1px solid ${selected === f.id ? f.border : "#1e293b"}`,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold" style={{ color: selected === f.id ? f.border : "#94a3b8" }}>
                    {f.name}
                  </span>
                  <span className="ml-2 text-[10px] text-slate-500">{f.speed}</span>
                </div>
                {f.dgxUsed && (
                  <span className="text-[8px] rounded px-1.5 py-0.5 font-bold bg-blue-500/20 text-blue-400">
                    DGX H100
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Detail column */}
        <div className="space-y-3">

          {/* Header */}
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: sel.color + "33", border: `1px solid ${sel.border}55` }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl font-black font-mono" style={{ color: sel.border }}>
                {sel.speed}
              </span>
              <span className="text-sm font-semibold text-white">{sel.name}</span>
              {sel.dgxUsed && (
                <span className="text-[9px] rounded-full px-2 py-0.5 bg-blue-500/20 text-blue-300 font-medium">
                  Used in DGX H100
                </span>
              )}
            </div>

            {/* Specs grid */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              {[
                { l: "Lane configuration", v: sel.lanes },
                { l: "Modulation", v: sel.modulation },
                { l: "Module power", v: `${sel.powerW} W` },
                { l: "Used in", v: sel.whereUsed },
              ].map(r => (
                <div key={r.l} className="rounded-lg bg-slate-900/70 p-2">
                  <div className="text-[9px] text-slate-500 mb-0.5">{r.l}</div>
                  <div className="text-slate-200 text-[11px] font-medium">{r.v}</div>
                </div>
              ))}
            </div>

            {/* Power bar */}
            <div className="mb-3">
              <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                <span>Module power draw</span>
                <span>{sel.powerW} W per port</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${(sel.powerW / powerBarMax) * 100}%`,
                    backgroundColor: sel.border,
                  }}
                />
              </div>
              <div className="flex justify-between text-[8px] text-slate-600 mt-0.5">
                <span>0 W</span>
                <span>64-port switch total: {sel.powerW * 64} W in optics alone</span>
              </div>
            </div>

            {/* Note */}
            <div
              className="rounded-lg p-3 text-[11px] leading-5 text-slate-300"
              style={{ borderLeft: `3px solid ${sel.border}`, backgroundColor: sel.border + "0d" }}
            >
              {sel.note}
            </div>
          </div>

          {/* Backward compatibility */}
          <div className="rounded-xl bg-slate-800/40 border border-white/5 p-3">
            <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-2">
              Backward compatibility (this cage accepts)
            </div>
            {sel.backwardCompat.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {[sel.name, ...sel.backwardCompat].map(n => (
                  <span
                    key={n}
                    className="text-[10px] rounded-lg px-2 py-1 font-medium"
                    style={{
                      backgroundColor: n === sel.name ? sel.border + "33" : "#1e293b",
                      color: n === sel.name ? sel.border : "#64748b",
                      border: `1px solid ${n === sel.name ? sel.border + "66" : "#334155"}`,
                    }}
                  >
                    {n === sel.name ? `${n} (this)` : n}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 italic">
                No backward compatibility — purpose-built cage only accepts {sel.name} modules.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom note */}
      <div className="mt-4 rounded-xl bg-blue-950/30 border border-blue-500/20 p-3">
        <div className="text-[10px] text-slate-400 leading-4">
          <span className="font-semibold text-blue-400">DGX H100 port identity: </span>
          Every NIC port on a DGX H100 is OSFP. The SN5600 leaf switch also uses OSFP ports.
          This is why the same cable connects server to switch for both InfiniBand and RoCEv2 modes —
          the form factor is identical; only the firmware mode differs.
        </div>
      </div>
    </div>
  )
}

export default FormFactorViz
