"use client"
import { useState } from "react"

// ── StorageSeparationViz ──────────────────────────────────────────────────────
// Shows what happens when storage and compute traffic share a fabric vs separate.
// Toggle between "Mixed" and "Separated" to see the failure cascade vs clean isolation.

type Scenario = "mixed" | "separated"

const events = [
  {
    id: "allreduce",
    label: "AllReduce burst begins",
    desc: "All 256 GPUs synchronise gradients simultaneously. Compute fabric hits near-saturation.",
    time: "t=0",
  },
  {
    id: "checkpoint",
    label: "Checkpoint write starts",
    desc: "DGX node begins writing 140 GB checkpoint to storage — sustained 800 Gbps traffic.",
    time: "t=0.2s",
  },
  {
    id: "buffer",
    label: "Switch buffer fills",
    desc: "In mixed scenario: storage write and AllReduce traffic compete for the same switch egress buffer.",
    time: "t=0.4s",
  },
  {
    id: "consequence",
    label: "Consequence",
    desc: "Mixed: PFC storm pauses AllReduce NIC. Every GPU at the barrier stalls. Separated: nothing — the fabrics are physically isolated.",
    time: "t=0.5s",
  },
]

const trafficProfiles = [
  {
    name: "AllReduce (compute)",
    pattern: "Bursty, synchronised",
    duration: "Microseconds per wave",
    tolerance: "Zero loss — any drop stalls all GPUs",
    fabric: "Lossless, non-blocking, PFC+ECN",
    color: "#1e3a5f",
    border: "#60a5fa",
  },
  {
    name: "Checkpoint write (storage)",
    pattern: "Sustained, sequential",
    duration: "1–30 seconds",
    tolerance: "Tolerates loss (TCP retransmit) — adds latency, not stall",
    fabric: "Standard Ethernet, oversubscription acceptable",
    color: "#14532d",
    border: "#22c55e",
  },
]

export function StorageSeparationViz() {
  const [scenario, setScenario] = useState<Scenario>("mixed")
  const [activeEvent, setActiveEvent] = useState(0)

  const ev = events[activeEvent]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        Why storage and compute fabrics must be physically separated
      </p>
      <p className="mb-5 text-xs text-slate-600">
        Toggle to see the failure cascade on a mixed fabric vs clean isolation on a separated fabric
      </p>

      {/* Scenario toggle */}
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        {(["mixed", "separated"] as Scenario[]).map(s => (
          <button
            key={s}
            onClick={() => { setScenario(s); setActiveEvent(0) }}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex-1"
            style={{
              backgroundColor: scenario === s
                ? s === "mixed" ? "#7f1d1d" : "#14532d"
                : "#0f172a",
              border: `1px solid ${scenario === s
                ? s === "mixed" ? "#ef4444" : "#22c55e"
                : "#1e293b"}`,
              color: scenario === s
                ? s === "mixed" ? "#fca5a5" : "#86efac"
                : "#475569",
            }}
          >
            {s === "mixed" ? "✗ Mixed fabric (broken)" : "✓ Separated fabrics (correct)"}
          </button>
        ))}
      </div>

      {/* Topology diagram */}
      <div className="mb-5 overflow-x-auto rounded-xl border border-white/8 bg-[#060d18] p-4">
        <svg viewBox="0 0 560 200" className="min-w-[560px]">
          {scenario === "mixed" ? (
            <>
              {/* Single switch */}
              <rect x="180" y="80" width="200" height="40" rx="6"
                fill="#7f1d1d33" stroke="#ef4444" strokeWidth="1.5" />
              <text x="280" y="104" textAnchor="middle" fill="#fca5a5" fontSize="10" fontWeight="700">
                Shared switch
              </text>
              {/* Compute NIC → switch */}
              <line x1="60" y1="50" x2="200" y2="90" stroke="#60a5fa" strokeWidth="2" />
              <text x="30" y="50" textAnchor="middle" fill="#60a5fa" fontSize="8">ConnectX-7</text>
              <text x="30" y="62" textAnchor="middle" fill="#475569" fontSize="8">AllReduce</text>
              {/* DPU → switch */}
              <line x1="60" y1="155" x2="200" y2="115" stroke="#22c55e" strokeWidth="2" />
              <text x="30" y="155" textAnchor="middle" fill="#22c55e" fontSize="8">ConnectX-7</text>
              <text x="30" y="167" textAnchor="middle" fill="#475569" fontSize="8">checkpoint</text>
              {/* switch → compute dest */}
              <line x1="380" y1="90" x2="490" y2="50" stroke="#60a5fa" strokeWidth="2" />
              <text x="520" y="50" textAnchor="middle" fill="#60a5fa" fontSize="8">GPU peer</text>
              {/* switch → storage */}
              <line x1="380" y1="110" x2="490" y2="155" stroke="#22c55e" strokeWidth="2" />
              <text x="524" y="155" textAnchor="middle" fill="#22c55e" fontSize="8">Storage</text>
              {/* Buffer full indicator */}
              {activeEvent >= 2 && (
                <>
                  <rect x="210" y="88" width="140" height="24" rx="4" fill="#ef444433" />
                  <text x="280" y="104" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="700">
                    BUFFER FULL
                  </text>
                </>
              )}
              {/* PFC storm indicator */}
              {activeEvent >= 3 && (
                <>
                  <line x1="200" y1="95" x2="85" y2="58" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" />
                  <text x="130" y="72" textAnchor="middle" fill="#ef4444" fontSize="8">PAUSE!</text>
                </>
              )}
            </>
          ) : (
            <>
              {/* Compute switch */}
              <rect x="170" y="30" width="160" height="36" rx="6"
                fill="#1e3a5f33" stroke="#60a5fa" strokeWidth="1.5" />
              <text x="250" y="52" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="700">
                Compute switch
              </text>
              {/* Storage switch */}
              <rect x="170" y="134" width="160" height="36" rx="6"
                fill="#14532d33" stroke="#22c55e" strokeWidth="1.5" />
              <text x="250" y="156" textAnchor="middle" fill="#86efac" fontSize="9" fontWeight="700">
                Storage switch
              </text>
              {/* ConnectX-7 → compute switch */}
              <line x1="60" y1="48" x2="170" y2="48" stroke="#60a5fa" strokeWidth="2" />
              <text x="30" y="44" textAnchor="middle" fill="#60a5fa" fontSize="8">ConnectX-7</text>
              <text x="30" y="56" textAnchor="middle" fill="#475569" fontSize="8">AllReduce</text>
              {/* DPU → storage switch */}
              <line x1="60" y1="152" x2="170" y2="152" stroke="#22c55e" strokeWidth="2" />
              <text x="30" y="148" textAnchor="middle" fill="#22c55e" fontSize="8">ConnectX-7</text>
              <text x="30" y="160" textAnchor="middle" fill="#475569" fontSize="8">checkpoint</text>
              {/* compute switch → GPU peers */}
              <line x1="330" y1="48" x2="490" y2="48" stroke="#60a5fa" strokeWidth="2" />
              <text x="524" y="52" textAnchor="middle" fill="#60a5fa" fontSize="8">GPU peers</text>
              {/* storage switch → storage */}
              <line x1="330" y1="152" x2="490" y2="152" stroke="#22c55e" strokeWidth="2" />
              <text x="520" y="156" textAnchor="middle" fill="#22c55e" fontSize="8">Storage</text>
              {/* Isolation label */}
              <text x="250" y="100" textAnchor="middle" fill="#334155" fontSize="8">physically isolated</text>
              <line x1="180" y1="68" x2="180" y2="132" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 2" />
              <line x1="320" y1="68" x2="320" y2="132" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 2" />
              {/* Green check when event 3 */}
              {activeEvent >= 3 && (
                <>
                  <circle cx="250" cy="100" r="12" fill="#14532d" stroke="#22c55e" strokeWidth="1.5" />
                  <text x="250" y="105" textAnchor="middle" fill="#22c55e" fontSize="12">✓</text>
                </>
              )}
            </>
          )}
        </svg>
      </div>

      {/* Timeline stepper */}
      <div className="mb-3 grid grid-cols-2 gap-1.5 sm:flex">
        {events.map((e, i) => (
          <button
            key={e.id}
            onClick={() => setActiveEvent(i)}
            className="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium text-center transition-all"
            style={{
              backgroundColor: activeEvent === i
                ? scenario === "mixed" ? "#7f1d1d55" : "#14532d55"
                : "#0f172a",
              border: `1px solid ${activeEvent === i
                ? scenario === "mixed" ? "#ef4444" : "#22c55e"
                : "#1e293b"}`,
              color: activeEvent === i ? "#e2e8f0" : "#475569",
            }}
          >
            {e.time}
          </button>
        ))}
      </div>

      <div
        className="rounded-xl p-3 mb-5"
        style={{
          backgroundColor: scenario === "mixed" ? "#7f1d1d22" : "#14532d22",
          border: `1px solid ${scenario === "mixed" ? "#ef444433" : "#22c55e33"}`,
        }}
      >
        <div className="text-xs font-semibold mb-1" style={{ color: scenario === "mixed" ? "#fca5a5" : "#86efac" }}>
          {ev.label}
        </div>
        <div className="text-[11px] text-slate-400 leading-4">{ev.desc}</div>
      </div>

      {/* Traffic pattern comparison */}
      <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-2">Traffic pattern mismatch</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {trafficProfiles.map(p => (
          <div
            key={p.name}
            className="rounded-xl p-3"
            style={{ backgroundColor: p.color + "33", border: `1px solid ${p.border}44` }}
          >
            <div className="text-[10px] font-bold mb-2" style={{ color: p.border }}>{p.name}</div>
            {[
              { l: "Pattern", v: p.pattern },
              { l: "Duration", v: p.duration },
              { l: "Loss tolerance", v: p.tolerance },
              { l: "Fabric required", v: p.fabric },
            ].map(r => (
              <div key={r.l} className="mb-1">
                <div className="text-[9px] text-slate-600">{r.l}</div>
                <div className="text-[10px] text-slate-300 leading-3">{r.v}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default StorageSeparationViz
