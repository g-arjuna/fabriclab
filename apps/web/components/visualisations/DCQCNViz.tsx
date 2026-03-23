"use client"
import { useState } from "react"

// DCQCNViz
type DCQCNPhase = "decrease" | "recovery" | "fast_recovery" | "cnp_during_recovery"

const dcqcnPhases: { id: DCQCNPhase; label: string; color: string }[] = [
  { id: "decrease", label: "Rate decrease on CNP", color: "#7f1d1d" },
  { id: "recovery", label: "Rate recovery (no CNPs)", color: "#14532d" },
  { id: "fast_recovery", label: "Fast recovery mode", color: "#065f46" },
  { id: "cnp_during_recovery", label: "CNP arrives during recovery", color: "#78350f" },
]

const dcqcnDetails: Record<DCQCNPhase, { description: string; formula?: string; observation: string }> = {
  decrease: {
    description: "A CNP arrives. DCQCN firmware immediately reduces the injection rate for this QP. Alpha is updated as a running average of CNP frequency — the more CNPs received, the higher alpha, the more aggressive the reduction.",
    formula: "New rate = Current rate × (1 − alpha/2)\nAlpha update: alpha = (1 − g) × alpha + g × 1\nwhere g = 1/256 (typical), alpha starts at 1/64",
    observation: "ethtool rx_ecn_marked grows. Throughput on this QP drops. Other QPs unaffected. DCQCN is per-QP, not per-NIC.",
  },
  recovery: {
    description: "After rp_time_reset (typically 55µs) with no new CNPs, DCQCN begins recovering the rate. The recovery is additive-increase, multiplicative-decrease (AIMD) — same principle as TCP but at NIC-firmware speed.",
    formula: "Rate recovery: rate += rp_byte_reset / current_rate\n(additive increase per byte sent)\nTarget rate: gradually approaches pre-congestion rate",
    observation: "rx_ecn_marked stops growing. Throughput gradually increases. If well-tuned, rate stabilises at the sustainable rate for the congested path.",
  },
  fast_recovery: {
    description: "In the first 5 rate recovery increments, DCQCN uses a faster additive increase to escape the minimum rate floor quickly. This prevents a flow from being stuck at a very low rate for a long time after brief congestion.",
    formula: "Fast recovery: rate += rp_byte_reset × HAI_timer_period\n(larger increment than normal recovery)\nAfter 5 increments: transitions to normal recovery mode",
    observation: "Rate increases faster in the first few recovery steps. Important for bursty AllReduce traffic where congestion is brief but complete rate recovery is needed quickly.",
  },
  cnp_during_recovery: {
    description: "If a new CNP arrives while DCQCN is in recovery mode, it immediately returns to rate decrease mode. This prevents the rate from recovering into sustained congestion. It is the multiplicative-decrease part of AIMD.",
    formula: "On CNP during recovery:\n  alpha_update(alpha + 1/128)  ← faster alpha increase\n  New rate = Current rate × (1 − alpha/2)\n  Reset recovery timer",
    observation: "Rate saw-teeth around the sustainable rate. This is normal DCQCN behaviour under sustained moderate congestion. If the saw-toothing is too large, tune rp_byte_reset and rp_time_reset.",
  },
}

export function DCQCNViz() {
  const [phase, setPhase] = useState<DCQCNPhase>("decrease")
  const detail = dcqcnDetails[phase]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        DCQCN rate control algorithm — NIC firmware in action
      </p>
      <div className="flex flex-wrap gap-2 mb-5">
        {dcqcnPhases.map(p => (
          <button key={p.id} onClick={() => setPhase(p.id)}
            className="rounded-xl px-3 py-2 text-xs transition-all text-left"
            style={{
              backgroundColor: phase === p.id ? p.color : "#0f172a",
              border: `1px solid ${phase === p.id ? p.color : "#1e293b"}`,
              color: phase === p.id ? "#fff" : "#64748b",
            }}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="space-y-3 text-xs">
        <div className="rounded-xl bg-slate-800/50 p-4">
          <p className="text-slate-300 leading-6">{detail.description}</p>
        </div>
        {detail.formula && (
          <div className="rounded-xl bg-[#0a0f1a] border border-white/10 p-4">
            <div className="text-[10px] text-slate-500 mb-1.5">Algorithm</div>
            <pre className="text-cyan-300 font-mono text-[10px] leading-6 whitespace-pre-wrap">{detail.formula}</pre>
          </div>
        )}
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
          <div className="text-[10px] text-green-500 uppercase tracking-widest mb-1">What you observe in counters</div>
          <p className="text-slate-300 leading-5">{detail.observation}</p>
        </div>
      </div>
    </div>
  )
}
export default DCQCNViz
