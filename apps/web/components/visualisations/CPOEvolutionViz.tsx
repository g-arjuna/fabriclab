"use client"
import { useState } from "react"

// ── CPOEvolutionViz ───────────────────────────────────────────────────────────
// Shows the four stages of DSP migration: Pluggable → LPO → LRO → CPO.
// Each stage: where the DSP lives, cost impact, power, interop, field-replaceability.
// Clicking a stage shows a detailed breakdown with the tradeoffs.

type Stage = "pluggable" | "lpo" | "lro" | "cpo"

const stages: {
  id: Stage
  abbr: string
  label: string
  subtitle: string
  dspLocation: string
  costReduction: string
  powerReduction: string
  interopRisk: "none" | "medium" | "low" | "high"
  fieldReplaceable: boolean
  maturity: "production" | "ramping" | "early"
  maturityLabel: string
  primaryBeneficiary: string
  description: string
  tradeoff: string
  marketNote: string
  color: string
  border: string
}[] = [
  {
    id: "pluggable",
    abbr: "Pluggable",
    label: "Standard Pluggable",
    subtitle: "DSP inside the module — today's baseline",
    dspLocation: "Inside pluggable module (OSFP / QSFP-DD)",
    costReduction: "Baseline",
    powerReduction: "Baseline",
    interopRisk: "none",
    fieldReplaceable: true,
    maturity: "production",
    maturityLabel: "✓ Production — every AI cluster today",
    primaryBeneficiary: "Optics vendors",
    description:
      "The current architecture. Every pluggable transceiver contains its own DSP, laser, photodetector, and equalization circuitry. The DSP handles FEC, equalization, clock data recovery, and modulation for its own lanes — fully self-contained. The module plugs into a cage on the switch faceplate.",
    tradeoff:
      "High cost per port (DSP = 20–40% of BOM). High power (DSP = ~50% of module power). But perfect interoperability — any vendor's module in any vendor's switch. Hot-swap in 30 seconds when a module fails.",
    marketNote:
      "Will remain the majority of deployed ports through 2026 but increasingly challenged by CPO in new AI switch designs.",
    color: "#14532d",
    border: "#22c55e",
  },
  {
    id: "lpo",
    abbr: "LPO",
    label: "Linear-drive Pluggable Optics",
    subtitle: "DSP moved from module to switch ASIC",
    dspLocation: "Switch ASIC (not in module)",
    costReduction: "~30–40% lower module cost",
    powerReduction: "~30% lower per-port power",
    interopRisk: "high",
    fieldReplaceable: true,
    maturity: "ramping",
    maturityLabel: "⚡ Ramping — some 2025–2026 deployments",
    primaryBeneficiary: "Switch vendors",
    description:
      "The DSP is removed from the pluggable module entirely. The switch ASIC takes over all DSP functions — FEC, equalization, and clock recovery — for the connected port. The module itself becomes a simple linear optical assembly: laser, photodetector, and multiplexer. No intelligence.",
    tradeoff:
      "Module is cheaper and simpler. Module power drops significantly. But: each switch ASIC vendor implements DSP differently. An LPO module optimised for a Broadcom Tomahawk ASIC may not perform correctly with an NVIDIA Spectrum ASIC. Mixed-vendor fabrics face genuine interoperability risk.",
    marketNote:
      "Primarily benefits switch vendors, who can offer simpler modules and sell the integrated DSP as a switching platform advantage. Optics vendors dislike LPO — it commoditises their product.",
    color: "#78350f",
    border: "#f59e0b",
  },
  {
    id: "lro",
    abbr: "LRO",
    label: "Linear Receive Optics",
    subtitle: "DSP removed from RX path only",
    dspLocation: "TX path DSP remains in module; RX DSP moved to ASIC",
    costReduction: "~15–20% lower module cost",
    powerReduction: "~20% lower per-port power",
    interopRisk: "low",
    fieldReplaceable: true,
    maturity: "ramping",
    maturityLabel: "⚡ Ramping — primarily in switch upgrades",
    primaryBeneficiary: "Optics vendors",
    description:
      "A compromise between pluggable and full LPO. The receive-side DSP (demodulation, FEC decode, equalisation) is moved from the module into the switch ASIC. The transmit-side DSP stays in the module — the module still handles signal conditioning for the signal it sends into the cable.",
    tradeoff:
      "Better interoperability than full LPO because the TX path DSP in the module provides a more standardised interface to the cable. Lower cost and power savings than LPO, but more achievable across mixed-vendor deployments. Primarily benefits optics vendors who can deliver a lower-cost module while retaining some product differentiation in the TX path.",
    marketNote:
      "Considered by many analysts as the more practical near-term alternative to LPO. Several optics vendors announced LRO modules in 2025 targeting 800G AI switch upgrades.",
    color: "#4c1d95",
    border: "#a78bfa",
  },
  {
    id: "cpo",
    abbr: "CPO",
    label: "Co-Packaged Optics",
    subtitle: "Optics integrated into the switch ASIC package",
    dspLocation: "Switch ASIC (co-packaged — no pluggable module at all)",
    costReduction: "~40–50% lower per-port total cost (long run)",
    powerReduction: "~40–50% lower per-port power",
    interopRisk: "none",
    fieldReplaceable: false,
    maturity: "early",
    maturityLabel: "2026 volume ramp — NVIDIA leading, others following",
    primaryBeneficiary: "Switch vendors + hyperscalers",
    description:
      "The most radical approach. The optical module is integrated directly into the switch package — co-located with the ASIC on the same substrate. There is no cage, no pluggable module, no pluggable interface. Photons leave the switch faceplate through waveguides that are part of the switch assembly. The entire DSP, laser, and photodetector are inside the switch chassis.",
    tradeoff:
      "Dramatic power and density improvements: no module cage thermal challenge, DSP cooled by ASIC heatsink, higher port density per faceplate. But: no field-replaceable optics. When a laser fails, you open a support ticket — not a cage. The cluster architect must specify reach requirements (SR vs DR) at purchase time. CPO switches are a single-vendor optics decision, not a mix-and-match market.",
    marketNote:
      "Dell'Oro confirmed: 2026 is the volume ramp year on both InfiniBand and Ethernet AI switches. NVIDIA is leading CPO deployment. CPO is projected to add multi-billions to AI networking market size. Hyperscalers favour CPO for new large-scale builds; it significantly reduces facility power requirements at scale.",
    color: "#7f1d1d",
    border: "#ef4444",
  },
]

const maturityColors: Record<string, string> = {
  production: "#22c55e",
  ramping: "#60a5fa",
  early: "#a78bfa",
}

const interopColors: Record<string, string> = {
  none: "#22c55e",
  low: "#f59e0b",
  medium: "#f97316",
  high: "#ef4444",
}
const interopLabels: Record<string, string> = {
  none: "None — full interop",
  low: "Low",
  medium: "Medium",
  high: "High — mixed-vendor risk",
}

export function CPOEvolutionViz() {
  const [selected, setSelected] = useState<Stage>("pluggable")
  const [tab, setTab] = useState<"overview" | "tradeoff" | "market">("overview")
  const sel = stages.find(s => s.id === selected)!

  // DSP position diagram
  const dspPositions: Record<Stage, { moduleHasDSP: boolean; asicHasDSP: boolean; integrated: boolean }> = {
    pluggable: { moduleHasDSP: true,  asicHasDSP: false, integrated: false },
    lpo:       { moduleHasDSP: false, asicHasDSP: true,  integrated: false },
    lro:       { moduleHasDSP: true,  asicHasDSP: true,  integrated: false },
    cpo:       { moduleHasDSP: false, asicHasDSP: true,  integrated: true  },
  }
  const dsp = dspPositions[selected]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        CPO evolution — DSP migration path
      </p>
      <p className="mb-5 text-xs text-slate-600">
        Each stage moves DSP work out of the pluggable module to reduce cost and power
      </p>

      {/* Stage selector — horizontal arrow flow */}
      <div className="relative mb-6 overflow-x-auto">
        <div className="min-w-[560px]">
        <div className="absolute top-7 left-0 right-0 h-px bg-slate-700 z-0" />
        <div className="relative z-10 flex items-start justify-between gap-2">
          {stages.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1 min-w-0">
              <button
                onClick={() => { setSelected(s.id); setTab("overview") }}
                className="flex flex-col items-center gap-2 flex-1"
              >
                <div
                  className="h-14 w-14 rounded-2xl flex flex-col items-center justify-center transition-all text-[9px] font-bold text-center leading-3 px-1"
                  style={{
                    backgroundColor: selected === s.id ? s.border + "44" : "#0f172a",
                    border: `2px solid ${selected === s.id ? s.border : s.border + "33"}`,
                    color: selected === s.id ? s.border : "#475569",
                    transform: selected === s.id ? "scale(1.1)" : "scale(1)",
                    boxShadow: selected === s.id ? `0 0 14px ${s.border}44` : "none",
                  }}
                >
                  {s.abbr}
                </div>
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: maturityColors[s.maturity] }}
                />
              </button>
              {i < stages.length - 1 && (
                <svg width="20" height="14" viewBox="0 0 20 14" className="flex-shrink-0 mt-0">
                  <path d="M1 7 L16 7 M12 2 L17 7 L12 12" stroke="#334155" strokeWidth="1.5" fill="none" />
                </svg>
              )}
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* DSP location diagram */}
      <div className="mb-5 overflow-x-auto rounded-xl border border-white/8 bg-[#060d18] p-4">
        <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-3">DSP location in this architecture</div>
        <svg viewBox="0 0 500 90" className="min-w-[500px]">
          {/* Cable */}
          <rect x="10" y="30" width="80" height="30" rx="6"
            fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
          <text x="50" y="48" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600">Cable / Fiber</text>

          {/* Arrow cable → module */}
          <path d="M90 45 L120 45" stroke="#334155" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* Module box */}
          {!dsp.integrated ? (
            <>
              <rect x="120" y="15" width="130" height="60" rx="6"
                fill={dsp.moduleHasDSP ? sel.color + "33" : "#0f172a"}
                stroke={dsp.moduleHasDSP ? sel.border : "#1e293b"}
                strokeWidth={dsp.moduleHasDSP ? 2 : 1} />
              <text x="185" y="33" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600">
                Pluggable Module
              </text>
              {/* Laser + PD always in module */}
              <rect x="128" y="40" width="40" height="22" rx="3"
                fill="#1e293b" stroke="#334155" strokeWidth="1" />
              <text x="148" y="54" textAnchor="middle" fill="#64748b" fontSize="7">Laser/PD</text>
              {/* DSP in module if pluggable or LRO */}
              <rect x="176" y="40" width="66" height="22" rx="3"
                fill={dsp.moduleHasDSP ? sel.border + "33" : "#0f172a"}
                stroke={dsp.moduleHasDSP ? sel.border : "#1e293b"}
                strokeWidth={dsp.moduleHasDSP ? 1.5 : 1} />
              <text x="209" y="54" textAnchor="middle"
                fill={dsp.moduleHasDSP ? sel.border : "#334155"} fontSize="7" fontWeight={dsp.moduleHasDSP ? "700" : "400"}>
                {dsp.moduleHasDSP ? "DSP ⚡" : "DSP (removed)"}
              </text>
            </>
          ) : (
            /* CPO — no module box */
            <>
              <text x="185" y="48" textAnchor="middle" fill="#475569" fontSize="8" fontStyle="italic">
                No pluggable module
              </text>
            </>
          )}

          {/* Arrow module → ASIC */}
          <path d="M250 45 L280 45" stroke="#334155" strokeWidth="1.5" />

          {/* Switch ASIC box */}
          <rect x="280" y="10" width="150" height="70" rx="6"
            fill={dsp.asicHasDSP ? sel.color + "33" : "#0f172a"}
            stroke={dsp.asicHasDSP ? sel.border : "#334155"}
            strokeWidth={dsp.asicHasDSP ? 2 : 1} />
          <text x="355" y="27" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600">
            Switch ASIC
          </text>
          {/* SerDes always */}
          <rect x="288" y="34" width="50" height="20" rx="3"
            fill="#1e293b" stroke="#334155" strokeWidth="1" />
          <text x="313" y="47" textAnchor="middle" fill="#64748b" fontSize="7">SerDes</text>
          {/* DSP in ASIC for LPO / CPO / LRO (rx side) */}
          <rect x="344" y="34" width="78" height="20" rx="3"
            fill={dsp.asicHasDSP ? sel.border + "33" : "#0f172a"}
            stroke={dsp.asicHasDSP ? sel.border : "#1e293b"}
            strokeWidth={dsp.asicHasDSP ? 1.5 : 1} />
          <text x="383" y="47" textAnchor="middle"
            fill={dsp.asicHasDSP ? sel.border : "#334155"} fontSize="7" fontWeight={dsp.asicHasDSP ? "700" : "400"}>
            {dsp.asicHasDSP ? "DSP ⚡" : "PFE"}
          </text>
          <text x="355" y="72" textAnchor="middle" fill="#475569" fontSize="7">PFE</text>

          {/* Arrow ASIC → PFE label */}
          <path d="M430 45 L465 45" stroke="#334155" strokeWidth="1" />
          <text x="480" y="48" textAnchor="middle" fill="#475569" fontSize="7">→ fabric</text>

          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#334155" />
            </marker>
          </defs>
        </svg>
        {dsp.integrated && (
          <div className="mt-2 text-[9px] text-center text-red-400">
            CPO: optics co-packaged into ASIC — no pluggable cage on faceplate
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-4">
        {[
          { l: "Module cost", v: sel.costReduction },
          { l: "Power saving", v: sel.powerReduction },
          {
            l: "Interop risk",
            v: interopLabels[sel.interopRisk],
            color: interopColors[sel.interopRisk],
          },
          {
            l: "Field-replaceable",
            v: sel.fieldReplaceable ? "Yes (hot-swap)" : "No — board RMA",
            color: sel.fieldReplaceable ? "#22c55e" : "#ef4444",
          },
        ].map(s => (
          <div key={s.l} className="rounded-xl bg-slate-800/50 p-3 text-center">
            <div className="text-[9px] text-slate-500 mb-1">{s.l}</div>
            <div
              className="text-xs font-bold leading-4"
              style={{ color: s.color ?? "#e2e8f0" }}
            >
              {s.v}
            </div>
          </div>
        ))}
      </div>

      {/* Maturity + beneficiary */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <span
          className="text-[9px] rounded-full px-2.5 py-1 font-medium"
          style={{ backgroundColor: maturityColors[sel.maturity] + "22", color: maturityColors[sel.maturity] }}
        >
          {sel.maturityLabel}
        </span>
        <span className="text-[9px] rounded-full px-2.5 py-1 font-medium bg-slate-800 text-slate-400">
          Primary beneficiary: {sel.primaryBeneficiary}
        </span>
      </div>

      {/* Detail tabs */}
      <div className="mb-3 flex flex-wrap gap-1">
        {([
          { k: "overview" as const, l: "What it is" },
          { k: "tradeoff" as const, l: "The tradeoff" },
          { k: "market" as const, l: "Market status" },
        ]).map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
            style={{
              backgroundColor: tab === t.k ? sel.border + "33" : "#0f172a",
              color: tab === t.k ? sel.border : "#475569",
              border: `1px solid ${tab === t.k ? sel.border + "66" : "#1e293b"}`,
            }}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div
        className="rounded-xl p-4 text-xs text-slate-300 leading-5"
        style={{ backgroundColor: sel.color + "22", border: `1px solid ${sel.border}33` }}
      >
        {tab === "overview" && sel.description}
        {tab === "tradeoff" && sel.tradeoff}
        {tab === "market" && sel.marketNote}
      </div>

      {/* Bottom callout */}
      <div className="mt-4 rounded-xl bg-red-950/30 border border-red-500/20 p-3">
        <div className="text-[10px] text-slate-400 leading-4">
          <span className="font-semibold text-red-400">The 2026 CPO inflection: </span>
          Dell'Oro Group confirmed CPO begins volume ramp on AI switches in 2026.
          NVIDIA leads on both InfiniBand and Ethernet AI switches. CPO reduces per-port power by 40–50%,
          which at hyperscale means tens of megawatts of data centre capacity freed.
          The operational model changes: failed optics = support ticket, not hot-swap.
        </div>
      </div>
    </div>
  )
}

export default CPOEvolutionViz
