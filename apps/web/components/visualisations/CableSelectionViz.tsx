"use client"
import { useState } from "react"

// ── CableSelectionViz ─────────────────────────────────────────────────────────
// Interactive cable selection decision tree.
// User picks distance and speed generation; component shows the right cable type
// with specs, cost tier, field-replaceability, and a real deployment example.

type CableType = "passive_dac" | "aec" | "aoc" | "sr_pluggable" | "dr_pluggable" | "fr_pluggable"

const cables: {
  id: CableType
  name: string
  abbr: string
  maxDist400G: string
  maxDist800G: string
  medium: string
  powerW: string
  fieldReplaceable: boolean
  costTier: 1 | 2 | 3 | 4
  connector: string
  bestFor: string
  failureMode: string
  color: string
  border: string
}[] = [
  {
    id: "passive_dac",
    name: "Passive DAC",
    abbr: "DAC",
    maxDist400G: "7 m",
    maxDist800G: "3 m",
    medium: "Copper (no optics)",
    powerW: "<0.15 W",
    fieldReplaceable: true,
    costTier: 1,
    connector: "OSFP both ends",
    bestFor: "DGX node → ToR leaf switch (same rack, 1–3 m)",
    failureMode: "Internal strand break — switch goes Err-Disabled, NIC still reports Active (the Lab 0 failure)",
    color: "#14532d",
    border: "#22c55e",
  },
  {
    id: "aec",
    name: "Active Electrical Cable",
    abbr: "AEC",
    maxDist400G: "7 m",
    maxDist800G: "7 m",
    medium: "Copper + signal conditioning ICs",
    powerW: "1–2 W",
    fieldReplaceable: true,
    costTier: 2,
    connector: "OSFP both ends",
    bestFor: "800G intra-rack where passive DAC marginal (3–7 m)",
    failureMode: "Signal conditioning IC failure — link flap, intermittent errors. Often temperature-sensitive.",
    color: "#065f46",
    border: "#10b981",
  },
  {
    id: "aoc",
    name: "Active Optical Cable",
    abbr: "AOC",
    maxDist400G: "100 m",
    maxDist800G: "100 m",
    medium: "MMF (OM4) + fixed transceivers",
    powerW: "1–3 W",
    fieldReplaceable: false,
    costTier: 2,
    connector: "OSFP both ends (integrated, not pluggable)",
    bestFor: "Leaf → spine same row (10–30 m). Lighter and more flexible than pluggable SR.",
    failureMode: "Transceiver embedded — whole cable replaced on failure. Not suitable where cable run outlasts transceiver.",
    color: "#1e3a5f",
    border: "#60a5fa",
  },
  {
    id: "sr_pluggable",
    name: "Pluggable SR8",
    abbr: "SR8",
    maxDist400G: "100 m (OM4)",
    maxDist800G: "100 m (OM4)",
    medium: "MMF (OM4) + pluggable OSFP transceiver",
    powerW: "12–15 W (module)",
    fieldReplaceable: true,
    costTier: 3,
    connector: "MPO-16 (8 TX + 8 RX fibers)",
    bestFor: "Cross-row within same hall (30–100 m). Transceiver replaced independently of fiber run.",
    failureMode: "Module failure hot-swap in 30 sec. Fiber run stays. Preferred for large structured deployments.",
    color: "#4c1d95",
    border: "#a78bfa",
  },
  {
    id: "dr_pluggable",
    name: "Pluggable DR4 / DR8",
    abbr: "DR4/DR8",
    maxDist400G: "500 m (SMF)",
    maxDist800G: "500 m (SMF)",
    medium: "SMF (OS2) + pluggable OSFP transceiver",
    powerW: "12–15 W (module)",
    fieldReplaceable: true,
    costTier: 3,
    connector: "MPO-12 (DR4) / MPO-16 (DR8)",
    bestFor: "Long cross-hall and cross-building runs (100–500 m). Any run SMF is required.",
    failureMode: "Same field-swap model as SR8. SMF connectors more sensitive to contamination — clean regularly.",
    color: "#78350f",
    border: "#f59e0b",
  },
  {
    id: "fr_pluggable",
    name: "Pluggable FR4",
    abbr: "FR4",
    maxDist400G: "2 km (SMF)",
    maxDist800G: "2 km (SMF)",
    medium: "SMF (OS2) + pluggable OSFP transceiver",
    powerW: "12–15 W (module)",
    fieldReplaceable: true,
    costTier: 4,
    connector: "LC duplex (WDM — 4 wavelengths on 2 fibers)",
    bestFor: "Inter-building campus runs (500 m – 2 km). LR4 extends to 10 km.",
    failureMode: "WDM multiplexer drift under temperature extremes. Keep campus runs in conditioned spaces if possible.",
    color: "#7f1d1d",
    border: "#ef4444",
  },
]

// decision matrix: [distanceBracket][speedGen] → CableType
const decisionMatrix: Record<string, Record<string, CableType>> = {
  "0-5":    { "400G": "passive_dac",   "800G": "passive_dac"   },
  "5-7":    { "400G": "passive_dac",   "800G": "aec"           },
  "7-30":   { "400G": "aoc",           "800G": "aoc"           },
  "30-100": { "400G": "sr_pluggable",  "800G": "sr_pluggable"  },
  "100-500":{ "400G": "dr_pluggable",  "800G": "dr_pluggable"  },
  "500+":   { "400G": "fr_pluggable",  "800G": "fr_pluggable"  },
}

const distanceBrackets = [
  { id: "0-5",     label: "0 – 5 m",     example: "Within rack (DGX → ToR switch)" },
  { id: "5-7",     label: "5 – 7 m",     example: "End-of-rack runs, adjacent rack" },
  { id: "7-30",    label: "7 – 30 m",    example: "Same switch row (leaf → spine)" },
  { id: "30-100",  label: "30 – 100 m",  example: "Cross-row within data hall" },
  { id: "100-500", label: "100 – 500 m", example: "Long cross-hall, different switch rows" },
  { id: "500+",    label: "500 m – 2 km", example: "Inter-building campus runs" },
]

const speedGens = [
  { id: "400G", label: "400G (DGX H100)" },
  { id: "800G", label: "800G (DGX B200)" },
]

const costLabels = ["", "Low", "Medium", "High", "Very High"]
const costColors = ["", "#22c55e", "#f59e0b", "#f97316", "#ef4444"]

export function CableSelectionViz() {
  const [distance, setDistance] = useState("7-30")
  const [speed, setSpeed] = useState("400G")

  const recommendedId = decisionMatrix[distance]?.[speed] ?? "passive_dac"
  const rec = cables.find(c => c.id === recommendedId)!

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        Cable selection — pick your scenario
      </p>
      <p className="mb-5 text-xs text-slate-600">
        Select run distance and port speed to see the right cable type
      </p>

      {/* Speed selector */}
      <div className="mb-4">
        <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-2">Port speed generation</div>
        <div className="flex gap-2">
          {speedGens.map(g => (
            <button
              key={g.id}
              onClick={() => setSpeed(g.id)}
              className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                backgroundColor: speed === g.id ? "#1e3a5f" : "#0f172a",
                border: `1px solid ${speed === g.id ? "#60a5fa" : "#1e293b"}`,
                color: speed === g.id ? "#93c5fd" : "#475569",
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Distance selector */}
      <div className="mb-5">
        <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-2">Cable run distance</div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {distanceBrackets.map(d => (
            <button
              key={d.id}
              onClick={() => setDistance(d.id)}
              className="rounded-xl px-3 py-2.5 text-left transition-all"
              style={{
                backgroundColor: distance === d.id ? "#1e3a5f55" : "#0f172a",
                border: `1px solid ${distance === d.id ? "#60a5fa" : "#1e293b"}`,
              }}
            >
              <div className="text-xs font-bold" style={{ color: distance === d.id ? "#93c5fd" : "#64748b" }}>
                {d.label}
              </div>
              <div className="text-[8px] text-slate-600 mt-0.5 leading-3">{d.example}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div
        className="rounded-xl p-4 mb-4 transition-all"
        style={{ backgroundColor: rec.color + "33", border: `2px solid ${rec.border}66` }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="rounded-xl px-3 py-1.5 text-sm font-black font-mono"
            style={{ backgroundColor: rec.border + "33", color: rec.border }}
          >
            {rec.abbr}
          </div>
          <div>
            <div className="text-white font-semibold text-sm">{rec.name}</div>
            <div className="text-[10px] text-slate-400">{rec.medium}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mb-3 sm:grid-cols-4">
          {[
            { l: "Max reach (400G)", v: rec.maxDist400G },
            { l: "Max reach (800G)", v: rec.maxDist800G },
            { l: "Module power", v: rec.powerW },
            { l: "Connector", v: rec.connector },
          ].map(r => (
            <div key={r.l} className="rounded-lg bg-slate-900/70 p-2">
              <div className="text-[9px] text-slate-500 mb-0.5">{r.l}</div>
              <div className="text-slate-200 text-[11px] font-medium">{r.v}</div>
            </div>
          ))}
        </div>

        {/* Cost + replaceability badges */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <span
            className="text-[10px] rounded-lg px-2.5 py-1 font-medium"
            style={{ backgroundColor: costColors[rec.costTier] + "22", color: costColors[rec.costTier] }}
          >
            Cost: {costLabels[rec.costTier]}
          </span>
          <span
            className="text-[10px] rounded-lg px-2.5 py-1 font-medium"
            style={{
              backgroundColor: rec.fieldReplaceable ? "#22c55e22" : "#ef444422",
              color: rec.fieldReplaceable ? "#22c55e" : "#ef4444",
            }}
          >
            {rec.fieldReplaceable ? "✓ Field-replaceable (hot-swap)" : "✗ Non-replaceable — whole cable swap"}
          </span>
        </div>

        {/* Best for + failure */}
        <div className="space-y-2">
          <div
            className="rounded-lg p-2.5 text-[10px] leading-4 text-slate-300"
            style={{ borderLeft: `3px solid ${rec.border}`, backgroundColor: rec.border + "0d" }}
          >
            <span className="font-semibold text-slate-200">Best for: </span>{rec.bestFor}
          </div>
          <div className="rounded-lg bg-slate-900/60 p-2.5 text-[10px] leading-4 text-slate-500">
            <span className="font-semibold text-slate-400">Failure mode: </span>{rec.failureMode}
          </div>
        </div>
      </div>

      {/* Full decision matrix summary */}
      <div className="rounded-xl bg-slate-800/40 border border-white/5 p-3">
        <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-2">Quick reference</div>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 text-[9px]">
          {[
            { range: "≤ 5 m", choice: "Passive DAC" },
            { range: "5–7 m (800G)", choice: "AEC" },
            { range: "7–30 m", choice: "AOC or SR8" },
            { range: "30–100 m", choice: "SR8 pluggable (MMF)" },
            { range: "100–500 m", choice: "DR4/DR8 pluggable (SMF)" },
            { range: "500 m – 2 km", choice: "FR4 pluggable (SMF)" },
          ].map(r => (
            <div key={r.range} className="rounded p-1.5 bg-slate-900/60 flex justify-between gap-1">
              <span className="text-slate-600">{r.range}</span>
              <span className="text-slate-400 font-medium text-right">{r.choice}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CableSelectionViz
