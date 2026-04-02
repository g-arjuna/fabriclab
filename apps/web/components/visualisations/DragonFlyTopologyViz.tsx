"use client"
import { useState } from "react"

// ── DragonFlyTopologyViz ─────────────────────────
// Illustrates dragonfly topology: local clique groups
// connected by single global links. Toggle to show
// direct vs adaptive (indirect) routing paths.

const GROUPS = [
  { id: 0, label: "Group A", cx: 130, cy: 120, color: "#185FA5", fill: "#B5D4F4", stroke: "#378ADD" },
  { id: 1, label: "Group B", cx: 380, cy: 80,  color: "#0F6E56", fill: "#9FE1CB", stroke: "#1D9E75" },
  { id: 2, label: "Group C", cx: 560, cy: 200, color: "#854F0B", fill: "#FAC775", stroke: "#BA7517" },
  { id: 3, label: "Group D", cx: 460, cy: 360, color: "#534AB7", fill: "#CECBF6", stroke: "#7F77DD" },
  { id: 4, label: "Group E", cx: 200, cy: 360, color: "#993C1D", fill: "#F5C4B3", stroke: "#D85A30" },
]

// One global link per pair (not all pairs — dragonfly is sparse)
const GLOBAL_LINKS = [
  [0, 1], [0, 2], [0, 3], [1, 2], [1, 4], [2, 3], [3, 4],
]

// Switches within each group (3 per group, all-to-all)
function groupSwitches(cx: number, cy: number) {
  return [
    { x: cx - 28, y: cy - 16 },
    { x: cx + 28, y: cy - 16 },
    { x: cx,      y: cy + 20 },
  ]
}

export function DragonFlyTopologyViz() {
  const [mode, setMode] = useState<"direct" | "adaptive">("direct")
  const [hoverGroup, setHoverGroup] = useState<number | null>(null)

  // Direct path: Group A → Group C (1 global hop)
  // Adaptive path: Group A → Group B → Group C (2 global hops via intermediate)
  const directPath = [[0, 2]]
  const adaptivePath = [[0, 1], [1, 2]]
  const activePath = mode === "direct" ? directPath : adaptivePath

  function isActivePath(a: number, b: number) {
    return activePath.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
  }

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">Dragonfly topology</div>
      <div className="mb-4 text-xs text-slate-600">Local all-to-all cliques + sparse global links. Toggle to see direct vs adaptive routing (Group A → Group C).</div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {(["direct", "adaptive"] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "6px 16px",
              borderRadius: "8px",
              border: `1px solid ${mode === m ? "#3B8BD4" : "#444441"}`,
              background: mode === m ? "#0C447C" : "transparent",
              color: mode === m ? "#B5D4F4" : "#888780",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            {m === "direct" ? "Direct routing" : "Adaptive routing (indirect)"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto pb-2">
      <svg width="100%" viewBox="0 0 680 460" style={{ display: "block", minWidth: 680 }}>
        <defs>
          <marker id="df-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>

        {/* Global links */}
        {GLOBAL_LINKS.map(([a, b], i) => {
          const ga = GROUPS[a], gb = GROUPS[b]
          const active = isActivePath(a, b)
          const isCongested = mode === "direct" && a === 0 && b === 2
          return (
            <line
              key={i}
              x1={ga.cx} y1={ga.cy}
              x2={gb.cx} y2={gb.cy}
              stroke={active ? "#EF9F27" : isCongested ? "#E24B4A" : "#444441"}
              strokeWidth={active ? 3 : isCongested ? 2 : 1}
              strokeDasharray={isCongested && !active ? "5 3" : undefined}
              opacity={active ? 1 : 0.5}
              markerEnd={active ? "url(#df-arrow)" : undefined}
            />
          )
        })}

        {/* Groups */}
        {GROUPS.map(g => {
          const sw = groupSwitches(g.cx, g.cy)
          const hov = hoverGroup === g.id
          return (
            <g
              key={g.id}
              onMouseEnter={() => setHoverGroup(g.id)}
              onMouseLeave={() => setHoverGroup(null)}
              style={{ cursor: "default" }}
            >
              {/* Group bubble */}
              <ellipse
                cx={g.cx} cy={g.cy}
                rx={58} ry={46}
                fill={g.fill}
                fillOpacity={hov ? 0.35 : 0.15}
                stroke={g.stroke}
                strokeWidth={hov ? 1.5 : 0.8}
              />
              {/* Intra-group links (all-to-all) */}
              {sw.map((s1, i) =>
                sw.map((s2, j) => {
                  if (j <= i) return null
                  return (
                    <line
                      key={`${i}-${j}`}
                      x1={s1.x} y1={s1.y}
                      x2={s2.x} y2={s2.y}
                      stroke={g.stroke}
                      strokeWidth="1.2"
                      opacity="0.7"
                    />
                  )
                })
              )}
              {/* Switch nodes */}
              {sw.map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r="7" fill={g.fill} stroke={g.stroke} strokeWidth="1" />
              ))}
              {/* Group label */}
              <text
                x={g.cx} y={g.cy + 42}
                textAnchor="middle"
                fontSize="12"
                fontWeight="500"
                fill={g.color}
              >
                {g.label}
              </text>
              {/* Host nodes indicator */}
              <text x={g.cx} y={g.cy - 36} textAnchor="middle" fontSize="10" fill={g.color} opacity="0.7">
                hosts
              </text>
            </g>
          )
        })}

        {/* Path annotation */}
        {mode === "direct" && (
          <text x="340" y="445" textAnchor="middle" fontSize="11" fill="#EF9F27">
            Direct: A → C via 1 global link (can be congested under load)
          </text>
        )}
        {mode === "adaptive" && (
          <text x="340" y="445" textAnchor="middle" fontSize="11" fill="#EF9F27">
            Adaptive: A → B → C via 2 global links (avoids congested direct link)
          </text>
        )}
      </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginTop: "12px" }}>
        {[
          { label: "Intra-group", value: "All-to-all", note: "Short cables, low cost", color: "#9FE1CB" },
          { label: "Inter-group", value: "1 link/pair", note: "Bottleneck for AllReduce", color: "#F0997B" },
          { label: "Deployed at", value: "Frontier / Perlmutter", note: "Cray Slingshot, scientific HPC", color: "#CECBF6" },
        ].map(({ label, value, note, color }) => (
          <div key={label} style={{ background: "#1e293b", borderRadius: "8px", padding: "10px 12px" }}>
            <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "3px" }}>{label}</div>
            <div style={{ fontSize: "13px", fontWeight: 500, color }}>{value}</div>
            <div style={{ fontSize: "11px", color: "#5F5E5A", marginTop: "2px" }}>{note}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DragonFlyTopologyViz
