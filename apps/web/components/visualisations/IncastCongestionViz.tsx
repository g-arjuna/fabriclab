"use client"

import { useState } from "react"

type IncastPhase = "normal" | "allreduce_start" | "incast_peak" | "drain" | "counter_signature"

const incastPhases: { id: IncastPhase; label: string; color: string }[] = [
  { id: "normal", label: "Between barriers", color: "#14532d" },
  { id: "allreduce_start", label: "AllReduce begins", color: "#065f46" },
  { id: "incast_peak", label: "In-cast peak", color: "#7f1d1d" },
  { id: "drain", label: "Buffer draining", color: "#78350f" },
  { id: "counter_signature", label: "Counter signature", color: "#1e3a5f" },
]

const incastDetails: Record<
  IncastPhase,
  { description: string; switchSees: string; counterValues: string }
> = {
  normal: {
    description:
      "GPUs are computing — forward pass, backward pass. Traffic is low and steady. Each GPU sends occasional keep-alive and small coordination packets. The leaf switch is nearly idle. Buffers are at 5-10%.",
    switchSees:
      "Low, steady traffic from all 32 DGX nodes. Uplinks to spine at 5-15% utilisation. No drops, no pauses.",
    counterValues: "Output drops: 0\nPFC pause frames: 0\nBuffer util: 8%",
  },
  allreduce_start: {
    description:
      "The synchronisation barrier is reached. Every GPU simultaneously begins sending its gradient tensor to all peers. On Leaf Switch 0, all 32 DGX Node GPU-0 ports begin transmitting simultaneously at 400G each. Aggregate input: 32 x 400G = 12.8 Tb/s. Available uplinks to spine: 8 x 400G = 3.2 Tb/s. Burst ratio: 4:1.",
    switchSees:
      "All 32 input ports suddenly at full rate simultaneously. Uplinks to spine instantly loaded. Buffer fill begins.",
    counterValues:
      "Output drops: 0 (buffers not yet full)\nPFC pause frames: 0 (threshold not reached)\nBuffer util: 35% and rising",
  },
  incast_peak: {
    description:
      "The in-cast has reached its peak. The leaf switch's output buffer is filling rapidly. The switch sends PFC PAUSE frames to slow the 32 senders. Senders pause briefly, buffer drains slightly, senders resume. This stop-start cycle continues for the duration of the AllReduce. This is expected and healthy — PFC is working. Without RSHP, some spine uplinks are handling 90% of the traffic while others are idle.",
    switchSees:
      "Buffer at 80-90%. PFC active on all 32 input ports simultaneously. This is the in-cast signature: PFC activity on input ports, congestion on output uplinks.",
    counterValues: "Output drops: 0\nPFC pause frames: 4,823 (and growing)\nBuffer util: 87%",
  },
  drain: {
    description:
      "The AllReduce completes. GPUs have received all gradients and begin the next computation phase. Traffic drops sharply back to the low-level baseline. The switch buffer drains. PFC activity stops. Buffer utilisation returns to single digits.",
    switchSees:
      "Sudden traffic reduction. All input ports go quiet. Buffer drains quickly at output rates. No more PFC needed.",
    counterValues:
      "Output drops: 0\nPFC pause frames: 4,823 (static — no new frames)\nBuffer util: 12% and falling",
  },
  counter_signature: {
    description:
      "The diagnostic signature that identifies in-cast vs other congestion types. Key observation: PFC pause frames appear on INPUT ports (the switch is pausing its upstream senders), while any drops are on OUTPUT uplinks (the congestion point). In pure in-cast, input ports are healthy — the problem is at the egress, not the ingress.",
    switchSees:
      "Drops (if any) on uplink interfaces toward spine. PFC pause frames on downlink interfaces toward DGX nodes. This asymmetry — drops on output, pauses on input — is the in-cast signature.",
    counterValues:
      "Downlink ports (-> DGX nodes):\n  PFC pause frames: growing\n  Output drops: 0\n\nUplink ports (-> Spine):\n  PFC pause frames: 0\n  Output drops: non-zero (if overloaded)",
  },
}

export function IncastCongestionViz() {
  const [phase, setPhase] = useState<IncastPhase>("incast_peak")
  const detail = incastDetails[phase]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        In-cast congestion — the AllReduce traffic pattern at the switch
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        {incastPhases.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPhase(item.id)}
            className="rounded-lg px-3 py-1.5 text-xs transition-all"
            style={{
              backgroundColor: phase === item.id ? item.color : "#0f172a",
              border: `1px solid ${phase === item.id ? item.color : "#1e293b"}`,
              color: phase === item.id ? "#fff" : "#64748b",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 text-xs">
        <div className="rounded-xl bg-slate-800/50 p-4">
          <p className="leading-6 text-slate-300">{detail.description}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0a0f1a] p-3">
          <div className="mb-1.5 text-[10px] text-slate-500">What the switch sees</div>
          <p className="leading-5 text-slate-400">{detail.switchSees}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0a0f1a] p-3">
          <div className="mb-1.5 text-[10px] text-slate-500">show interface counters output</div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-cyan-300">
            {detail.counterValues}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default IncastCongestionViz
