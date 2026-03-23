"use client"
import { useState } from "react"

type CounterScenario = "drops_and_pauses" | "pauses_no_drops" | "hidden_pause_storm" | "clean"

const scenarios: { id: CounterScenario; label: string; color: string }[] = [
  { id: "drops_and_pauses", label: "Drops and pauses", color: "#7f1d1d" },
  { id: "pauses_no_drops", label: "Pauses, no drops", color: "#78350f" },
  { id: "hidden_pause_storm", label: "Hidden pause storm", color: "#4c1d95" },
  { id: "clean", label: "Clean — no issues", color: "#14532d" },
]

const scenarioDetails: Record<CounterScenario, {
  switchOutput: string
  nicOutput: string
  switchStory: string
  nicStory: string
  combined: string
  insight: string
}> = {
  drops_and_pauses: {
    switchOutput: `leaf-switch # show interface counters

Interface eth0
  Output drops:      47,291   ← drops happening
  PFC pause frames:  12,847   ← pauses sent
  Buffer util:       87%      ← buffer near full`,
    nicOutput: `dgx-node-a:~$ ethtool -S eth0

  rx_pfc_pause_frames:  12847   ← switch paused this NIC
  tx_pfc_pause_frames:   8293   ← NIC paused the switch
  rx_ecn_marked:             0  ← no ECN signals
  tx_dropped:            47291  ← NIC dropping on transmit`,
    switchStory: "The switch is under congestion. Its output buffer is filling (87%). It is sending PAUSE frames to try to stop the sender. But it is still dropping packets — the congestion is too severe for PFC to fully contain.",
    nicStory: "The NIC confirms it received 12,847 PAUSE frames from the switch. It is also dropping on transmit (47,291 drops) — its own output queue is backing up. No ECN signals means the switch is not sending early congestion warnings.",
    combined: "Both ends agree: congestion is severe. PFC is active but overwhelmed. The 47,291 drop count appears on both sides — the switch reports drops on its egress port and the NIC reports the same drops on its transmit side.",
    insight: "Both PFC and ECN need attention. PFC may be on wrong priority or the congestion is simply too intense. Enable ECN so the switch can signal senders to slow down before buffers fill.",
  },
  pauses_no_drops: {
    switchOutput: `leaf-switch # show interface counters

Interface eth0
  Output drops:          0   ← no drops
  PFC pause frames:  3,241   ← pauses being sent
  Buffer util:         71%   ← buffer elevated but not critical`,
    nicOutput: `dgx-node-a:~$ ethtool -S eth0

  rx_pfc_pause_frames:   3241   ← NIC being paused by switch
  tx_pfc_pause_frames:    847   ← NIC pausing the switch too
  rx_ecn_marked:          294   ← ECN signals being received
  tx_dropped:               0   ← no drops at NIC`,
    switchStory: "The switch is under moderate congestion but PFC is working. It is pausing the sender before buffers overflow. Zero drops — the lossless mechanism is functioning correctly.",
    nicStory: "The NIC is being paused (3,241 rx_pfc_pause_frames) but not dropping anything. It is also receiving ECN marks (294) — the switch is sending early congestion signals. The system is reacting correctly.",
    combined: "This is healthy lossless operation under congestion. The pause frames are expected — they are the system working as designed. The ECN marks mean DCQCN is active and rate-limiting senders proactively.",
    insight: "No action needed on the lossless mechanism. If throughput is still degraded, investigate whether the AllReduce traffic pattern is creating a hot port — one sender overloading one path. Check other ports for similar patterns.",
  },
  hidden_pause_storm: {
    switchOutput: `leaf-switch # show interface counters

Interface eth0
  Output drops:         0   ← looks clean
  PFC pause frames:   847   ← moderate pauses
  Buffer util:         45%  ← buffer looks fine`,
    nicOutput: `dgx-node-a:~$ ethtool -S eth0

  rx_pfc_pause_frames:  94,283   ← 94K pauses in last poll interval
  tx_pfc_pause_frames:       0
  rx_ecn_marked:             0
  tx_dropped:                0`,
    switchStory: "The switch shows only 847 pause frames total and no drops. The switch view looks almost clean. Buffer utilisation is moderate. Nothing alarming.",
    nicStory: "The NIC tells a completely different story. 94,283 rx_pfc_pause_frames in the last poll interval. The NIC is being paused almost continuously. It is not dropping packets because PFC is working — but it is barely sending anything.",
    combined: "This is a pause storm hidden from the switch view. The switch sees 847 total pauses because each pause is brief — but they arrive so frequently that the NIC is held idle most of the time. The application sees near-zero throughput. A monitoring system watching only the switch would miss this entirely.",
    insight: "This is why you must check ethtool on the DGX even when the switch looks clean. The NIC counter reveals pause frequency that aggregate switch counters obscure. Check PFC watchdog — it should be firing after 200ms of continuous pause, but repeated short pauses can avoid it.",
  },
  clean: {
    switchOutput: `leaf-switch # show interface counters

Interface eth0
  Output drops:          0   ← no drops
  PFC pause frames:      0   ← no pauses
  Buffer util:          12%  ← buffer healthy`,
    nicOutput: `dgx-node-a:~$ ethtool -S eth0

  rx_pfc_pause_frames:    0   ← not being paused
  tx_pfc_pause_frames:    0
  rx_ecn_marked:          0
  tx_dropped:             0   ← no drops`,
    switchStory: "No congestion. Buffer utilisation is 12% — well under any threshold. No drops, no pause frames. The fabric is idle or under light load.",
    nicStory: "NIC confirms: not being paused, not dropping anything. Everything looks clean from the compute side as well.",
    combined: "Both ends agree: this link is healthy and uncongested. If a performance problem was reported, the root cause is not on this link.",
    insight: "When both ends show clean counters, the problem is elsewhere. Check other ports on the same switch, check the remote DGX node's counters, or escalate to a full ibdiagnet sweep to look across the whole fabric.",
  },
}

export function CounterBothEndsViz() {
  const [scenario, setScenario] = useState<CounterScenario>("hidden_pause_storm")
  const detail = scenarioDetails[scenario]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        Traffic counters — two perspectives on the same link
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {scenarios.map(s => (
          <button key={s.id} onClick={() => setScenario(s.id)}
            className="rounded-lg px-3 py-1.5 text-xs transition-all"
            style={{
              backgroundColor: scenario === s.id ? s.color : "#0f172a",
              border: `1px solid ${scenario === s.id ? s.color : "#1e293b"}`,
              color: scenario === s.id ? "#fff" : "#64748b",
            }}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        {/* Switch output */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-blue-400" />
            <span className="text-xs font-semibold text-blue-400">Switch terminal</span>
            <span className="text-[10px] text-slate-600">Cumulus Linux</span>
          </div>
          <pre className="rounded-xl bg-[#0a0f1a] border border-blue-500/20 p-3 font-mono text-[10px] leading-6 text-slate-300 overflow-x-auto whitespace-pre-wrap">
            {detail.switchOutput}
          </pre>
          <p className="mt-2 text-xs text-slate-400 leading-5">{detail.switchStory}</p>
        </div>

        {/* NIC output */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-xs font-semibold text-green-400">DGX host terminal</span>
            <span className="text-[10px] text-slate-600">DGX OS</span>
          </div>
          <pre className="rounded-xl bg-[#0a1a0f] border border-green-500/20 p-3 font-mono text-[10px] leading-6 text-slate-300 overflow-x-auto whitespace-pre-wrap">
            {detail.nicOutput}
          </pre>
          <p className="mt-2 text-xs text-slate-400 leading-5">{detail.nicStory}</p>
        </div>
      </div>

      {/* Combined reading */}
      <div className="space-y-2 text-xs">
        <div className="rounded-xl bg-slate-800/50 p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Reading both together</div>
          <p className="text-slate-300 leading-6">{detail.combined}</p>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="text-[10px] uppercase tracking-widest text-cyan-600 mb-1.5">Insight</div>
          <p className="text-slate-300 leading-6">{detail.insight}</p>
        </div>
      </div>

      {scenario === "hidden_pause_storm" && (
        <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
          <span className="font-semibold">Key takeaway: </span>
          The hidden pause storm scenario is why checking only the switch is insufficient. A monitoring system watching only switch counters would report this link as healthy. Only the NIC counter reveals the truth.
        </div>
      )}
    </div>
  )
}

export default CounterBothEndsViz
