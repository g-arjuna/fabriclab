"use client"
import { useState } from "react"

type View = "exchange" | "quanta" | "priority" | "headroom"

const views: { id: View; label: string }[] = [
  { id: "exchange", label: "Pause frame exchange" },
  { id: "quanta", label: "Pause quanta timing" },
  { id: "priority", label: "Priority-based PFC" },
  { id: "headroom", label: "Buffer headroom" },
]

export function PFCMechanicsViz() {
  const [view, setView] = useState<View>("exchange")

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        PFC mechanics — how pause frames actually work
      </p>
      <div className="flex flex-wrap gap-2 mb-5">
        {views.map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            className="rounded-lg px-3 py-1.5 text-xs transition-all"
            style={{
              backgroundColor: view === v.id ? "#1e3a5f" : "#0f172a",
              border: `1px solid ${view === v.id ? "#60a5fa" : "#1e293b"}`,
              color: view === v.id ? "#bfdbfe" : "#64748b",
            }}>
            {v.label}
          </button>
        ))}
      </div>

      {view === "exchange" && (
        <div className="space-y-4 text-xs">
          <p className="text-slate-300 leading-6">A PAUSE frame is a 64-byte Ethernet frame sent by a switch to its upstream neighbour. It is link-local — destination MAC <code className="text-cyan-300">01:80:C2:00:00:01</code> is never forwarded beyond the immediate link. The exchange is always between two adjacent devices.</p>
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0a0f1a] p-4">
            <svg viewBox="0 0 500 200" className="min-w-[500px]">
              {/* DGX sender */}
              <rect x="10" y="70" width="100" height="60" rx="6" fill="#14532d33" stroke="#22c55e" strokeWidth="1.5"/>
              <text x="60" y="98" textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="600">DGX Node</text>
              <text x="60" y="112" textAnchor="middle" fill="#4ade80" fontSize="7">sender</text>

              {/* Switch */}
              <rect x="200" y="70" width="100" height="60" rx="6" fill="#1e3a5f33" stroke="#60a5fa" strokeWidth="1.5"/>
              <text x="250" y="98" textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="600">Leaf Switch</text>
              <text x="250" y="112" textAnchor="middle" fill="#60a5fa" fontSize="7">congested</text>

              {/* Downstream */}
              <rect x="390" y="70" width="100" height="60" rx="6" fill="#4c1d9533" stroke="#a78bfa" strokeWidth="1.5"/>
              <text x="440" y="98" textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="600">Destination</text>
              <text x="440" y="112" textAnchor="middle" fill="#a78bfa" fontSize="7">slow receiver</text>

              {/* Data flow */}
              <line x1="110" y1="90" x2="198" y2="90" stroke="#4ade80" strokeWidth="2" markerEnd="url(#arrow-green)"/>
              <text x="154" y="82" textAnchor="middle" fill="#4ade80" fontSize="7">data →</text>

              <line x1="300" y1="90" x2="388" y2="90" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4 3"/>
              <text x="344" y="82" textAnchor="middle" fill="#a78bfa" fontSize="7">output slow</text>

              {/* PAUSE frame */}
              <line x1="198" y1="120" x2="112" y2="120" stroke="#f59e0b" strokeWidth="2.5" markerEnd="url(#arrow-amber)"/>
              <text x="155" y="140" textAnchor="middle" fill="#f59e0b" fontSize="7" fontWeight="600">PAUSE frame</text>
              <text x="155" y="150" textAnchor="middle" fill="#f59e0b" fontSize="6">(CoS 3, quanta=0xFFFF)</text>

              {/* Buffer fill indicator */}
              <rect x="215" y="155" width="70" height="8" rx="2" fill="#1e293b"/>
              <rect x="215" y="155" width="62" height="8" rx="2" fill="#ef4444"/>
              <text x="250" y="175" textAnchor="middle" fill="#ef4444" fontSize="6">buffer 89% full</text>

              <defs>
                <marker id="arrow-green" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#4ade80"/>
                </marker>
                <marker id="arrow-amber" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b"/>
                </marker>
              </defs>
            </svg>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 text-[10px]">
            {[
              { label: "Destination MAC", value: "01:80:C2:00:00:01", note: "Link-local multicast, never forwarded" },
              { label: "EtherType", value: "0x8808", note: "MAC Control frame" },
              { label: "Opcode", value: "0x0101", note: "Priority PAUSE (PFC)" },
            ].map(f => (
              <div key={f.label} className="rounded-lg bg-slate-800/50 p-2">
                <div className="text-slate-500">{f.label}</div>
                <div className="font-mono text-cyan-300 mt-0.5">{f.value}</div>
                <div className="text-slate-600 mt-0.5">{f.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "quanta" && (
        <div className="space-y-4 text-xs">
          <p className="text-slate-300 leading-6">One pause quanta = 512 bit-times. The duration depends on link speed. At 400G, the maximum quanta value gives a very short absolute pause — this is intentional for low-latency recovery.</p>
          <div className="space-y-2">
            {[
              { speed: "10 GbE", quantaDuration: "51.2 ns", maxPause: "3.36 ms", maxHex: "0xFFFF" },
              { speed: "25 GbE", quantaDuration: "20.5 ns", maxPause: "1.34 ms", maxHex: "0xFFFF" },
              { speed: "100 GbE", quantaDuration: "5.12 ns", maxPause: "335 µs", maxHex: "0xFFFF" },
              { speed: "400 GbE", quantaDuration: "1.28 ns", maxPause: "83.9 µs", maxHex: "0xFFFF" },
            ].map(row => (
              <div key={row.speed} className="flex flex-col gap-1 rounded-xl bg-slate-800/50 px-4 py-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-slate-300 font-semibold w-20 flex-shrink-0">{row.speed}</span>
                <span className="text-slate-500 w-24 flex-shrink-0">{row.quantaDuration} / quanta</span>
                <div className="flex-1 text-[10px]">
                  <span className="text-slate-500">Max pause (</span>
                  <span className="font-mono text-cyan-300">{row.maxHex}</span>
                  <span className="text-slate-500">): </span>
                  <span className="text-white font-semibold">{row.maxPause}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <p className="text-slate-300 leading-6">At 400G, the maximum pause duration is only 84 microseconds. This is why the PFC watchdog interval (200ms) is orders of magnitude longer — it is designed to catch pathological deadlocks, not legitimate brief pauses. A single congestion burst can trigger dozens of 84µs pause frames in rapid succession, but the watchdog only fires if pausing is <em>sustained</em> for 200ms continuously.</p>
          </div>
        </div>
      )}

      {view === "priority" && (
        <div className="space-y-4 text-xs">
          <p className="text-slate-300 leading-6">Classic 802.3x pause halts all traffic. Priority-based PFC (802.1Qbb) pauses only a specific CoS priority. The other 7 priorities continue flowing unaffected.</p>
          <div className="rounded-xl bg-[#0a0f1a] border border-white/10 p-4">
            <div className="text-[10px] uppercase tracking-widest text-slate-600 mb-3">8 traffic priorities on a 400G port</div>
            {[
              { cos: 0, label: "Best effort", pfc: false, example: "HTTP, management backup" },
              { cos: 1, label: "Background", pfc: false, example: "Bulk transfers" },
              { cos: 2, label: "Spare", pfc: false, example: "Unassigned" },
              { cos: 3, label: "RoCEv2 (RDMA)", pfc: true, example: "GPU AllReduce — DSCP 26" },
              { cos: 4, label: "Controlled load", pfc: false, example: "Video streaming" },
              { cos: 5, label: "Video", pfc: false, example: "Real-time video" },
              { cos: 6, label: "Voice", pfc: false, example: "VoIP" },
              { cos: 7, label: "Network control", pfc: false, example: "Routing protocols" },
            ].map(row => (
              <div key={row.cos}
                className="my-1 flex flex-col gap-1 rounded-lg px-3 py-1.5 text-[10px] sm:flex-row sm:items-center sm:gap-3"
                style={{
                  backgroundColor: row.pfc ? "#14532d33" : "#0f172a",
                  border: `1px solid ${row.pfc ? "#22c55e44" : "#1e293b"}`,
                }}>
                <span className="w-6 text-slate-600 font-mono">{row.cos}</span>
                <span className={row.pfc ? "text-white font-semibold flex-1" : "text-slate-400 flex-1"}>{row.label}</span>
                <span className="text-slate-600 flex-1">{row.example}</span>
                <span className={row.pfc ? "text-green-400 font-semibold" : "text-slate-700"}>
                  {row.pfc ? "PFC enabled" : "no PFC"}
                </span>
              </div>
            ))}
          </div>
          <p className="text-slate-400 leading-6">When the switch sends a PFC PAUSE frame for CoS 3, only CoS 3 (RDMA) traffic pauses. Management traffic (CoS 7) continues flowing — you can still SSH into the switch while an AllReduce is paused. Storage traffic (typically CoS 4) continues. Only the RDMA queue freezes.</p>
        </div>
      )}

      {view === "headroom" && (
        <div className="space-y-4 text-xs">
          <p className="text-slate-300 leading-6">The switch does not wait until its buffer is completely full before sending a PAUSE frame. It sends the PAUSE at a threshold — the headroom — to absorb packets already in-flight when the pause is sent.</p>
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0a0f1a] p-4">
            <svg viewBox="0 0 400 180" className="min-w-[400px]">
              {/* Buffer rectangle */}
              <rect x="50" y="20" width="60" height="140" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1"/>
              <text x="80" y="175" textAnchor="middle" fill="#64748b" fontSize="7">Buffer</text>

              {/* Fill zones */}
              <rect x="51" y="90" width="58" height="69" rx="2" fill="#14532d66"/>
              <rect x="51" y="51" width="58" height="38" rx="2" fill="#78350f66"/>
              <rect x="51" y="21" width="58" height="29" rx="2" fill="#7f1d1d66"/>

              {/* Labels */}
              <line x1="112" y1="90" x2="340" y2="90" stroke="#22c55e" strokeWidth="1" strokeDasharray="4 3"/>
              <text x="345" y="93" fill="#22c55e" fontSize="7" fontWeight="600">PFC threshold (60–80%)</text>
              <text x="345" y="103" fill="#64748b" fontSize="6">→ PAUSE frame sent here</text>

              <line x1="112" y1="51" x2="340" y2="51" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3"/>
              <text x="345" y="54" fill="#f59e0b" fontSize="7">Drop threshold (90–100%)</text>
              <text x="345" y="64" fill="#64748b" fontSize="6">→ Headroom absorbs in-flight</text>

              <line x1="112" y1="21" x2="340" y2="21" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 3"/>
              <text x="345" y="24" fill="#ef4444" fontSize="7">Buffer maximum (100%)</text>
              <text x="345" y="34" fill="#64748b" fontSize="6">→ Overflow, tail drop</text>

              {/* Arrow showing headroom */}
              <line x1="30" y1="51" x2="30" y2="90" stroke="#60a5fa" strokeWidth="2" markerStart="url(#arrow-up)" markerEnd="url(#arrow-down2)"/>
              <text x="5" y="72" fill="#60a5fa" fontSize="7" transform="rotate(-90,20,72)">headroom</text>

              <defs>
                <marker id="arrow-up" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
                  <path d="M2,0 L4,4 L0,4 Z" fill="#60a5fa"/>
                </marker>
                <marker id="arrow-down2" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto-start-reverse">
                  <path d="M2,0 L4,4 L0,4 Z" fill="#60a5fa"/>
                </marker>
              </defs>
            </svg>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
            <p className="text-slate-300 leading-6">At 400G with 200ns round-trip delay, headroom must accommodate at least 10 KB of in-flight packets. Production deployments use 64–128 KB headroom to handle variable latency conditions. The headroom zone is reserved exclusively for pause propagation — no new traffic is admitted once the PFC threshold is crossed.</p>
          </div>
        </div>
      )}
    </div>
  )
}
export default PFCMechanicsViz
