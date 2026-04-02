"use client"
import { useState } from "react"

// ── FiberTypesViz ────────────────────────────────────────────────────────────
// MMF vs SMF comparison. Left panel: MMF grades (OM3/OM4/OM5).
// Right panel: SMF reach classes (DR/FR/LR/ZR).
// Interactive: hover a scenario to highlight the correct fiber choice.

type FiberMode = "mmf" | "smf"

type Scenario = {
  id: string
  label: string
  distance: string
  fiberChoice: FiberMode
  grade: string
  connector: string
  cableType: string
  example: string
}

const scenarios: Scenario[] = [
  {
    id: "inrack",
    label: "Within rack",
    distance: "1–5 m",
    fiberChoice: "mmf",
    grade: "No fiber — use DAC copper",
    connector: "OSFP direct",
    cableType: "Passive DAC or AEC",
    example: "DGX node → ToR leaf switch in same rack",
  },
  {
    id: "samerow",
    label: "Within row",
    distance: "5–30 m",
    fiberChoice: "mmf",
    grade: "OM4 MMF",
    connector: "MPO-16",
    cableType: "AOC or SR8 pluggable",
    example: "Leaf → spine switches in same switch row",
  },
  {
    id: "crossrow",
    label: "Cross-row",
    distance: "30–100 m",
    fiberChoice: "mmf",
    grade: "OM4 MMF",
    connector: "MPO-16",
    cableType: "SR8 pluggable OSFP",
    example: "Leaf switches in different switch rows (large hall)",
  },
  {
    id: "longhall",
    label: "Long hall run",
    distance: "100–500 m",
    fiberChoice: "smf",
    grade: "SMF (OS2)",
    connector: "MPO-12",
    cableType: "DR4 / DR8 pluggable",
    example: "Cross-hall DGX pod connections",
  },
  {
    id: "crossbldg",
    label: "Cross-building",
    distance: "500 m – 2 km",
    fiberChoice: "smf",
    grade: "SMF (OS2)",
    connector: "LC duplex",
    cableType: "FR4 pluggable",
    example: "Inter-building on campus dark fibre",
  },
  {
    id: "campus",
    label: "Long campus / DCI",
    distance: "2–80+ km",
    fiberChoice: "smf",
    grade: "SMF (OS2)",
    connector: "LC duplex",
    cableType: "LR4 / ZR pluggable",
    example: "Between data centres (not AI cluster fabric)",
  },
]

const mmfGrades = [
  { name: "OM3", core: "50 µm", wavelength: "850 nm", lightSource: "VCSEL", maxSpeed: "100G", maxDist: "100m @ 100G / 240m @ 40G", note: "Legacy — avoid for new AI deployments" },
  { name: "OM4", core: "50 µm", wavelength: "850 nm", lightSource: "VCSEL", maxSpeed: "400G", maxDist: "150m @ 100G–400G", note: "Current standard for AI cluster intra-rack and intra-row" },
  { name: "OM5", core: "50 µm", wavelength: "850 + 953 nm", lightSource: "VCSEL (SWDM)", maxSpeed: "400G+", maxDist: "150m with WDM over 4 fibres", note: "WDM enables 400G over fewer fibres. Backward compatible with OM4 transceivers." },
]

const smfClasses = [
  { name: "DR4 / DR8", wavelength: "1310 nm", maxDist: "500 m", connector: "MPO-12 / MPO-16", typical: "Long cross-row, cross-hall, mid-of-row designs" },
  { name: "FR4", wavelength: "1310 nm", maxDist: "2 km", connector: "LC duplex", typical: "Inter-building campus connections" },
  { name: "LR4", wavelength: "1310 nm", maxDist: "10 km", connector: "LC duplex", typical: "Long campus or dark fibre campus runs" },
  { name: "ZR / ZR+", wavelength: "1550 nm DWDM", maxDist: "80–120 km", connector: "LC duplex", typical: "Data centre interconnect (DCI) — not AI cluster fabric" },
]

export function FiberTypesViz() {
  const [activeScenario, setActiveScenario] = useState<string>("samerow")
  const [mode, setMode] = useState<FiberMode>("mmf")

  const active = scenarios.find(s => s.id === activeScenario)!

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        Fiber selection guide — by deployment scenario
      </p>
      <p className="mb-5 text-xs text-slate-600">
        Select a scenario to see the right fiber choice. Toggle to explore MMF grades or SMF reach classes.
      </p>

      {/* Scenario selector */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {scenarios.map(s => {
          const isActive = s.id === activeScenario
          const isMmf = s.fiberChoice === "mmf"
          const col = isMmf ? "#22c55e" : "#60a5fa"
          return (
            <button
              key={s.id}
              onClick={() => { setActiveScenario(s.id); setMode(s.fiberChoice) }}
              className="rounded-xl p-2.5 text-left transition-all"
              style={{
                backgroundColor: isActive ? col + "22" : "#0f172a",
                border: `1px solid ${isActive ? col : "#1e293b"}`,
              }}
            >
              <div className="text-[9px] font-bold mb-0.5" style={{ color: isActive ? col : "#64748b" }}>
                {s.label}
              </div>
              <div className="text-[8px] text-slate-600">{s.distance}</div>
              <div
                className="mt-1 text-[8px] rounded px-1 inline-block"
                style={{ backgroundColor: col + "22", color: col }}
              >
                {isMmf ? "MMF" : "SMF"}
              </div>
            </button>
          )
        })}
      </div>

      {/* Active scenario answer */}
      <div
        className="rounded-xl p-4 mb-5"
        style={{
          backgroundColor: active.fiberChoice === "mmf" ? "#14532d22" : "#1e3a5f22",
          border: `1px solid ${active.fiberChoice === "mmf" ? "#22c55e44" : "#60a5fa44"}`,
        }}
      >
        <div className="grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
          {[
            { l: "Distance", v: active.distance },
            { l: "Fiber type", v: active.grade },
            { l: "Connector", v: active.connector },
            { l: "Cable type", v: active.cableType },
          ].map(row => (
            <div key={row.l}>
              <div className="text-[9px] text-slate-500 mb-0.5">{row.l}</div>
              <div className="font-semibold text-white">{row.v}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[10px] text-slate-400 italic">{active.example}</div>
      </div>

      {/* Mode toggle */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        {(["mmf", "smf"] as FiberMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              backgroundColor: mode === m ? (m === "mmf" ? "#22c55e22" : "#60a5fa22") : "#0f172a",
              border: `1px solid ${mode === m ? (m === "mmf" ? "#22c55e" : "#60a5fa") : "#1e293b"}`,
              color: mode === m ? (m === "mmf" ? "#22c55e" : "#60a5fa") : "#64748b",
            }}
          >
            {m === "mmf" ? "Multi-Mode Fiber (MMF)" : "Single-Mode Fiber (SMF)"}
          </button>
        ))}
      </div>

      {/* Physical cross-section diagram */}
      <div className="mb-4 overflow-x-auto rounded-xl border border-white/8 bg-[#060d18] p-4">
        <svg viewBox="0 0 500 110" className="min-w-[500px]">
          {mode === "mmf" ? (
            <>
              {/* MMF cross section - large core */}
              <circle cx="80" cy="55" r="40" fill="#1e3a5f44" stroke="#3b82f6" strokeWidth="2" />
              <circle cx="80" cy="55" r="25" fill="#3b82f622" stroke="#60a5fa" strokeWidth="1.5" />
              {/* multiple light rays */}
              {[10, 20, -10, -20, 5].map((angle, i) => {
                const rad = (angle * Math.PI) / 180
                return (
                  <line key={i}
                    x1={80 - 20 * Math.cos(rad)} y1={55 - 20 * Math.sin(rad)}
                    x2={80 + 20 * Math.cos(rad)} y2={55 + 20 * Math.sin(rad)}
                    stroke="#38bdf8" strokeWidth="1" opacity={0.6 - i * 0.1}
                  />
                )
              })}
              <text x="80" y="108" textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="600">MMF — 50 µm core</text>
              <text x="80" y="8" textAnchor="middle" fill="#64748b" fontSize="8">Multiple light modes</text>

              {/* OM grades */}
              {mmfGrades.map((g, i) => {
                const x = 200 + i * 105
                return (
                  <g key={g.name}>
                    <rect x={x - 42} y="15" width="84" height="80" rx="6"
                      fill="#0f172a" stroke="#1e3a5f" strokeWidth="1" />
                    <text x={x} y="32" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="700">{g.name}</text>
                    <text x={x} y="46" textAnchor="middle" fill="#94a3b8" fontSize="7">{g.core}</text>
                    <text x={x} y="57" textAnchor="middle" fill="#94a3b8" fontSize="7">{g.wavelength}</text>
                    <text x={x} y="68" textAnchor="middle" fill="#22c55e" fontSize="7" fontWeight="600">{g.maxSpeed}</text>
                    <text x={x} y="79" textAnchor="middle" fill="#64748b" fontSize="6">{g.maxDist.split(" / ")[0]}</text>
                    <text x={x} y="89" textAnchor="middle" fill="#475569" fontSize="6">{g.lightSource}</text>
                  </g>
                )
              })}
            </>
          ) : (
            <>
              {/* SMF cross section - tiny core */}
              <circle cx="80" cy="55" r="40" fill="#4c1d9544" stroke="#7c3aed" strokeWidth="2" />
              <circle cx="80" cy="55" r="5" fill="#a78bfa88" stroke="#a78bfa" strokeWidth="1.5" />
              {/* single ray */}
              <line x1="55" y1="55" x2="105" y2="55" stroke="#c4b5fd" strokeWidth="1.5" opacity={0.8} />
              <text x="80" y="108" textAnchor="middle" fill="#a78bfa" fontSize="9" fontWeight="600">SMF — 8–10 µm core</text>
              <text x="80" y="8" textAnchor="middle" fill="#64748b" fontSize="8">Single light mode — no dispersion</text>

              {/* SMF classes */}
              {smfClasses.map((s, i) => {
                const x = 185 + i * 82
                return (
                  <g key={s.name}>
                    <rect x={x - 36} y="15" width="72" height="80" rx="6"
                      fill="#0f172a" stroke="#4c1d95" strokeWidth="1" />
                    <text x={x} y="32" textAnchor="middle" fill="#a78bfa" fontSize="9" fontWeight="700">{s.name}</text>
                    <text x={x} y="44" textAnchor="middle" fill="#60a5fa" fontSize="8" fontWeight="600">{s.maxDist}</text>
                    <text x={x} y="56" textAnchor="middle" fill="#94a3b8" fontSize="6">{s.connector}</text>
                    <text x={x} y="68" textAnchor="middle" fill="#94a3b8" fontSize="6">{s.wavelength}</text>
                    <text x={x} y="87" textAnchor="middle" fill="#475569" fontSize="6" style={{ maxWidth: "70px" }}>
                      {s.typical.length > 28 ? s.typical.slice(0, 28) + "…" : s.typical}
                    </text>
                  </g>
                )
              })}
            </>
          )}
        </svg>
      </div>

      {/* Key takeaway */}
      <div className="rounded-xl border border-white/5 bg-slate-800/40 p-3">
        <div className="text-[10px] text-slate-400 leading-4">
          <span className="font-semibold text-green-400">OM4 MMF</span> handles everything inside a data hall (≤100m). 
          Only cross to SMF when distance exceeds 100m. The fiber itself outlasts many transceiver generations — 
          OM4 installed for 100G today supports 400G, 800G, and 1.6T with transceiver upgrades.
        </div>
      </div>
    </div>
  )
}

export default FiberTypesViz
