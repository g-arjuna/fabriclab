"use client"

import { useState } from "react"

type Scenario = "ecmp_collision" | "adaptive_routing" | "spectrum_x"

type Uplink = {
  label: string
  capacityGbps: number
  flows: string[]
  carriedGbps: number
  excessGbps: number
}

const flowDemand = { A: 300, B: 300, C: 300, D: 300 } as const
const totalOffered = Object.values(flowDemand).reduce((sum, value) => sum + value, 0)
const uplinkCapacity = 400

function build(mapping: string[][]): Uplink[] {
  return mapping.map((flows, index) => {
    const offered = flows.reduce((sum, flow) => sum + flowDemand[flow as keyof typeof flowDemand], 0)
    return {
      label: `Leaf A → Spine ${index + 1}`,
      capacityGbps: uplinkCapacity,
      flows,
      carriedGbps: Math.min(offered, uplinkCapacity),
      excessGbps: Math.max(0, offered - uplinkCapacity),
    }
  })
}

const models: Record<Scenario, {
  label: string
  subtitle: string
  uplinks: Uplink[]
  mechanism: string
  caution: string
}> = {
  ecmp_collision: {
    label: "Static ECMP collision",
    subtitle: "Same offered traffic, unfavorable hash placement",
    uplinks: build([["A", "B"], ["C"], ["D"], []]),
    mechanism: "Four independent 300 Gb/s flows offer 1,200 Gb/s in total. Static ECMP assigns each flow to one member using a five-tuple hash. In this deterministic example, flows A and B hash to uplink 1, so that uplink receives 600 Gb/s offered traffic against 400 Gb/s capacity. It can carry at most 400 Gb/s instantaneously; the remaining 200 Gb/s is excess offered load that must be absorbed by buffering, congestion feedback, source rate reduction, or loss.",
    caution: "Carried utilization is capped by capacity. The model does not convert excess rate into queue bytes because no duration is specified. Real sustained behavior depends on congestion control, pause behavior, dropping, buffer occupancy, and endpoint response.",
  },
  adaptive_routing: {
    label: "Eligible-path redistribution",
    subtitle: "Same offered traffic, different placement",
    uplinks: build([["A"], ["B"], ["C"], ["D"]]),
    mechanism: "Using the same 1,200 Gb/s offered demand, an adaptive or administratively improved placement can distribute the four flows across four eligible uplinks. Each uplink carries 300 Gb/s of 400 Gb/s capacity in this simplified instantaneous model. This demonstrates why placement matters; it is not a guarantee that adaptive routing always finds an ideal distribution.",
    caution: "InfiniBand adaptive-routing behavior depends on switch generation, fabric configuration, ordering requirements, transport behavior, and congestion information. Incast, endpoint limits, oversubscription, and synchronized traffic can still congest queues.",
  },
  spectrum_x: {
    label: "Spectrum-X illustrative distribution",
    subtitle: "Packet spraying plus reordering architecture",
    uplinks: build([["A"], ["B"], ["C"], ["D"]]),
    mechanism: "NVIDIA Spectrum-X documentation describes adaptive packet spraying across eligible paths with receiver-side reordering/direct placement by BlueField-3 SuperNIC hardware. For comparison with the same deterministic offered-load model, the carried traffic is shown with the same idealized distribution. This is an architectural illustration, not a benchmark result.",
    caution: "Packet spraying creates reordering that the architecture must handle. Capabilities depend on the specific switch, SuperNIC/NIC generation, firmware, software stack, transport, and deployment configuration. Do not infer a universal performance percentage.",
  },
}

function totalCarried(uplinks: Uplink[]) {
  return uplinks.reduce((sum, uplink) => sum + uplink.carriedGbps, 0)
}

export function ECMPViz() {
  const [scenario, setScenario] = useState<Scenario>("ecmp_collision")
  const model = models[scenario]
  const totalCapacity = model.uplinks.length * uplinkCapacity
  const excess = model.uplinks.reduce((sum, uplink) => sum + uplink.excessGbps, 0)

  return (
    <div data-testid="ecmp-viz" className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">ECMP collision model — conserved offered traffic</p>
      <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Load-balancing scenario">
        {(Object.keys(models) as Scenario[]).map((id) => (
          <button key={id} type="button" aria-pressed={scenario === id} onClick={() => setScenario(id)}
            className="rounded-xl px-3 py-2 text-xs transition-all text-left"
            style={{ backgroundColor: scenario === id ? "#1e3a5f" : "#0f172a", border: `1px solid ${scenario === id ? "#60a5fa" : "#1e293b"}`, color: scenario === id ? "#bfdbfe" : "#64748b" }}>
            <div className="font-semibold">{models[id].label}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{models[id].subtitle}</div>
          </button>
        ))}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-4" data-testid="ecmp-traffic-accounting">
        {[
          ["Offered load", `${totalOffered.toLocaleString()} Gb/s`, "4 flows × 300 Gb/s", "ecmp-offered-load"],
          ["Uplink capacity", `${totalCapacity.toLocaleString()} Gb/s`, "4 uplinks × 400 Gb/s", "ecmp-total-capacity"],
          ["Carried traffic", `${totalCarried(model.uplinks).toLocaleString()} Gb/s`, "sum of min(offered, capacity)", "ecmp-carried-capacity"],
          ["Excess offered load", `${excess.toLocaleString()} Gb/s`, "not carried instantaneously", "ecmp-excess-offered"],
        ].map(([label, value, sub, testid]) => (
          <div key={label} data-testid={testid} className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
            <div className="mt-1 font-mono text-lg font-bold text-cyan-200">{value}</div>
            <div className="mt-1 text-[11px] text-slate-500">{sub}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 rounded-xl bg-slate-800/50 p-4">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">Deterministic leaf-to-spine uplink model</p>
        <div className="space-y-3">
          {model.uplinks.map((uplink) => {
            const carriedPct = (uplink.carriedGbps / uplink.capacityGbps) * 100
            return (
              <div key={uplink.label} data-testid={`ecmp-uplink-${uplink.label}`}>
                <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs">
                  <span className="text-slate-300">{uplink.label}</span>
                  <span className="font-mono text-slate-400">
                    flows {uplink.flows.length ? uplink.flows.join("+") : "—"} · offered {uplink.flows.reduce((sum, flow) => sum + flowDemand[flow as keyof typeof flowDemand], 0)}G · carried {uplink.carriedGbps}G{uplink.excessGbps ? ` · excess ${uplink.excessGbps}G` : ""}
                  </span>
                </div>
                <div className="relative h-5 rounded-full bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${carriedPct}%`, backgroundColor: uplink.excessGbps ? "#ef4444" : carriedPct >= 75 ? "#f59e0b" : "#22c55e" }} data-testid="ecmp-carried-bar" data-width-pct={carriedPct} />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white drop-shadow">{carriedPct.toFixed(0)}% carried</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl bg-slate-800/50 p-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Model mechanics</p>
          <p className="text-sm leading-7 text-slate-300">{model.mechanism}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm leading-7 text-amber-100">{model.caution}</p>
        </div>
      </div>
    </div>
  )
}

export default ECMPViz
