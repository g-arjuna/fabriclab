"use client"
import { useState } from "react"

// ── NVLinkScaleViz ─────────────────────────────────────────────────────────
// Side-by-side: intra-node NVLink (Ch0 domain) vs NVLink Switch System.
// Click "cross-node" to reveal the bandwidth cliff when AllReduce crosses
// the node boundary on IB vs NVLink Switch.

type View = "intra" | "switch"

export function NVLinkScaleViz() {
  const [view, setView] = useState<View>("intra")

  const GPU_COLOR    = "#8b5cf6"
  const NVSWITCH_CLR = "#6d28d9"
  const IB_COLOR     = "#3b82f6"
  const NVLS_COLOR   = "#f59e0b"

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">NVLink — Intra-node vs Scale-out</p>
      <p className="mb-4 text-xs text-slate-600">
        Toggle between the two fabric tiers. The bandwidth cliff at the node boundary is the problem NVLink Switch solves.
      </p>

      {/* Toggle */}
      <div style={{ display: "flex", background: "#0f172a", borderRadius: 8, padding: 3, gap: 3, marginBottom: 20, width: "fit-content" }}>
        {([["intra", "Intra-node NVLink"], ["switch", "NVLink Switch System"]] as [View, string][]).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              background: view === v ? (v === "intra" ? "#581c87" : "#78350f") : "transparent",
              color: view === v ? "#fff" : "#64748b",
              border: "none",
              borderRadius: 6,
              padding: "5px 16px",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: view === v ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "intra" ? (
        /* ── Intra-node view ── */
        <div>
          <svg viewBox="0 0 560 240" style={{ width: "100%", maxWidth: 560 }}>
            {/* DGX chassis border */}
            <rect x={20} y={20} width={520} height={200} rx={12} ry={12}
              fill="none" stroke="#334155" strokeWidth={1.5} strokeDasharray="6,3" />
            <text x={30} y={16} fontSize={9} fill="#475569" fontFamily="ui-monospace, monospace">
              DGX H100 Node (single chassis)
            </text>

            {/* 4 NVSwitch chips in centre */}
            {[0,1,2,3].map(i => (
              <g key={i}>
                <rect x={220} y={40 + i * 46} width={120} height={32} rx={6}
                  fill={NVSWITCH_CLR} opacity={0.85} />
                <text x={280} y={62 + i * 46} fontSize={9} fill="#ede9fe"
                  textAnchor="middle" fontFamily="ui-monospace, monospace">
                  NVSwitch {i+1}
                </text>
              </g>
            ))}

            {/* 8 GPU boxes — 4 left, 4 right */}
            {[0,1,2,3].map(i => (
              <g key={`gl${i}`}>
                <rect x={30} y={38 + i * 46} width={60} height={32} rx={6}
                  fill={GPU_COLOR} opacity={0.85} />
                <text x={60} y={58 + i * 46} fontSize={9} fill="#ede9fe"
                  textAnchor="middle" fontFamily="ui-monospace, monospace">GPU {i}</text>
              </g>
            ))}
            {[0,1,2,3].map(i => (
              <g key={`gr${i}`}>
                <rect x={470} y={38 + i * 46} width={60} height={32} rx={6}
                  fill={GPU_COLOR} opacity={0.85} />
                <text x={500} y={58 + i * 46} fontSize={9} fill="#ede9fe"
                  textAnchor="middle" fontFamily="ui-monospace, monospace">GPU {i+4}</text>
              </g>
            ))}

            {/* Connections GPU → NVSwitch (simplified) */}
            {[0,1,2,3].map(i => (
              <line key={`ll${i}`}
                x1={90} y1={54 + i * 46}
                x2={220} y2={56 + Math.floor(i / 1) * 46}
                stroke="#a78bfa" strokeWidth={1.2} opacity={0.5} />
            ))}
            {[0,1,2,3].map(i => (
              <line key={`lr${i}`}
                x1={470} y1={54 + i * 46}
                x2={340} y2={56 + i * 46}
                stroke="#a78bfa" strokeWidth={1.2} opacity={0.5} />
            ))}

            {/* Bandwidth label */}
            <text x={280} y={220} fontSize={10} fill="#86efac" textAnchor="middle" fontWeight="700">
              13.6 Tb/s all-to-all · 900 GB/s per GPU · 1 hop
            </text>
          </svg>

          <div style={{ background: "#1e1333", borderRadius: 10, padding: 12, marginTop: 8 }}>
            <p style={{ fontSize: 12, color: "#c4b5fd", margin: 0, lineHeight: 1.6 }}>
              All 8 GPUs are one NVSwitch hop away from each other. The 4 NVSwitch chips provide full all-to-all connectivity at 13.6 Tb/s aggregate. Every AllReduce that stays within this node runs at full NVLink bandwidth.
            </p>
          </div>
        </div>
      ) : (
        /* ── NVLink Switch view ── */
        <div>
          <svg viewBox="0 0 560 280" style={{ width: "100%", maxWidth: 560 }}>
            {/* Three DGX nodes */}
            {[0, 1, 2].map(n => (
              <g key={n}>
                <rect x={10 + n * 175} y={180} width={155} height={70} rx={8}
                  fill="none" stroke="#334155" strokeWidth={1} strokeDasharray="4,2" />
                <text x={87 + n * 175} y={196} fontSize={8} fill="#475569"
                  textAnchor="middle" fontFamily="ui-monospace, monospace">
                  DGX H100 Node {n + 1}
                </text>
                {/* 8 mini GPUs */}
                {[0,1,2,3,4,5,6,7].map(g => (
                  <rect key={g}
                    x={14 + n * 175 + g * 18} y={200}
                    width={14} height={22} rx={3}
                    fill={GPU_COLOR} opacity={0.7} />
                ))}
              </g>
            ))}
            {/* Ellipsis node */}
            <text x={544} y={220} fontSize={14} fill="#475569" textAnchor="middle">…</text>
            <text x={544} y={235} fontSize={8} fill="#475569" textAnchor="middle">×32</text>

            {/* NVLink Switch modules — spine tier */}
            {[0,1].map(s => (
              <g key={s}>
                <rect x={100 + s * 220} y={60} width={160} height={36} rx={8}
                  fill={NVLS_COLOR} opacity={0.85} />
                <text x={180 + s * 220} y={82} fontSize={9} fill="#1c1917"
                  textAnchor="middle" fontFamily="ui-monospace, monospace" fontWeight="700">
                  NVLink Switch {s === 0 ? "(Leaf)" : "(Spine)"}
                </text>
              </g>
            ))}

            {/* Connections: nodes → leaf switch */}
            {[0,1,2].map(n => (
              <line key={n}
                x1={87 + n * 175} y1={180}
                x2={180} y2={96}
                stroke="#fbbf24" strokeWidth={1.5} opacity={0.6} />
            ))}
            {/* Leaf → spine */}
            <line x1={260} y1={78} x2={320} y2={78}
              stroke="#fbbf24" strokeWidth={2} opacity={0.8} />

            {/* Bandwidth labels */}
            <text x={280} y={40} fontSize={10} fill="#fbbf24" textAnchor="middle" fontWeight="700">
              57.6 TB/s all-to-all (256 GPUs)
            </text>
            <text x={280} y={54} fontSize={9} fill="#64748b" textAnchor="middle">
              18× more than equivalent IB fabric
            </text>
            <text x={280} y={270} fontSize={9} fill="#64748b" textAnchor="middle">
              Same OSFP cables · firmware mode selects NVLink vs IB
            </text>
          </svg>

          <div style={{ background: "#1c1a04", borderRadius: 10, padding: 12, marginTop: 8 }}>
            <p style={{ fontSize: 12, color: "#fde68a", margin: 0, lineHeight: 1.6 }}>
              NVLink Switch extends the scale-up fabric across chassis boundaries. The same 900 GB/s per-GPU NVLink bandwidth is maintained whether the target GPU is in the same DGX node or a different one — as long as both nodes are connected to the NVLink Switch System.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default NVLinkScaleViz
