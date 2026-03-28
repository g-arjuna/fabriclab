"use client"
import { useState } from "react"

// ── TPUPodViz ─────────────────────────
// Illustrates Google TPU Pod 3D torus layout
// and contrasts spatial locality (conv) with
// all-to-all communication (transformer)

const MODES = ["Convolution (local comm)", "Transformer (all-to-all)"] as const
type Mode = typeof MODES[number]

// Small 4×4×2 simplified representation
function torusNodes(kx: number, ky: number, kz: number) {
  const nodes: { x: number; y: number; z: number }[] = []
  for (let z = 0; z < kz; z++)
    for (let y = 0; y < ky; y++)
      for (let x = 0; x < kx; x++)
        nodes.push({ x, y, z })
  return nodes
}

// Project 3D → 2D isometric-ish
function proj(x: number, y: number, z: number, ox: number, oy: number, s: number) {
  return {
    px: ox + x * s - z * (s * 0.45),
    py: oy + y * s - z * (s * 0.3),
  }
}

export function TPUPodViz() {
  const [mode, setMode] = useState<Mode>("Convolution (local comm)")
  const [hovNode, setHovNode] = useState<string | null>(null)
  const KX = 5, KY = 4, KZ = 2
  const nodes = torusNodes(KX, KY, KZ)
  const S = 42, OX = 200, OY = 50

  // "Focus" node at (2,2,0) — the selected node
  const focus = { x: 2, y: 2, z: 0 }
  const key = (n: { x: number; y: number; z: number }) => `${n.x}-${n.y}-${n.z}`

  function isNeighbour(n: { x: number; y: number; z: number }) {
    return (
      (Math.abs(n.x - focus.x) === 1 && n.y === focus.y && n.z === focus.z) ||
      (Math.abs(n.y - focus.y) === 1 && n.x === focus.x && n.z === focus.z) ||
      (Math.abs(n.z - focus.z) === 1 && n.x === focus.x && n.y === focus.y)
    )
  }

  function isFocus(n: { x: number; y: number; z: number }) {
    return n.x === focus.x && n.y === focus.y && n.z === focus.z
  }

  function nodeColor(n: { x: number; y: number; z: number }) {
    if (isFocus(n)) return { fill: "#EF9F27", stroke: "#BA7517" }
    if (mode === "Convolution (local comm)" && isNeighbour(n)) return { fill: "#9FE1CB", stroke: "#1D9E75" }
    if (mode === "Transformer (all-to-all)") return { fill: "#F5C4B3", stroke: "#D85A30" }
    return { fill: "#444441", stroke: "#5F5E5A" }
  }

  const activeLinks = mode === "Convolution (local comm)"
    ? nodes.filter(isNeighbour).map(n => ({ from: focus, to: n }))
    : nodes.filter(n => !isFocus(n)).map(n => ({ from: focus, to: n }))

  const viewH = OY + KY * S + KZ * S * 0.3 + 80

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">TPU Pod 3D torus — communication patterns</div>
      <div className="mb-4 text-xs text-slate-600">
        The amber node is the active TPU. Toggle to see how communication differs between convolutional and transformer workloads.
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {MODES.map(m => (
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
            {m}
          </button>
        ))}
      </div>

      <svg width="100%" viewBox={`0 0 680 ${viewH}`} style={{ display: "block" }}>
        {/* Torus links */}
        {nodes.map(n => {
          const neighbours = [
            { x: (n.x + 1) % KX, y: n.y, z: n.z },
            { x: n.x, y: (n.y + 1) % KY, z: n.z },
            { x: n.x, y: n.y, z: (n.z + 1) % KZ },
          ]
          return neighbours.map(nb => {
            const p1 = proj(n.x, n.y, n.z, OX, OY, S)
            const p2 = proj(nb.x, nb.y, nb.z, OX, OY, S)
            const isWrap = nb.x < n.x || nb.y < n.y || nb.z < n.z
            return (
              <line
                key={`l-${key(n)}-${key(nb)}`}
                x1={p1.px} y1={p1.py}
                x2={p2.px} y2={p2.py}
                stroke="#444441"
                strokeWidth="0.8"
                opacity={isWrap ? 0.2 : 0.4}
                strokeDasharray={isWrap ? "3 3" : undefined}
              />
            )
          })
        })}

        {/* Active communication lines */}
        {activeLinks.map(({ from, to }, i) => {
          const p1 = proj(from.x, from.y, from.z, OX, OY, S)
          const p2 = proj(to.x, to.y, to.z, OX, OY, S)
          const isConv = mode === "Convolution (local comm)"
          return (
            <line
              key={`al-${i}`}
              x1={p1.px} y1={p1.py}
              x2={p2.px} y2={p2.py}
              stroke={isConv ? "#1D9E75" : "#D85A30"}
              strokeWidth={isConv ? 2 : 0.8}
              opacity={isConv ? 0.9 : 0.4}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map(n => {
          const p = proj(n.x, n.y, n.z, OX, OY, S)
          const { fill, stroke } = nodeColor(n)
          const hov = hovNode === key(n)
          return (
            <circle
              key={key(n)}
              cx={p.px} cy={p.py}
              r={isFocus(n) ? 10 : hov ? 9 : 7}
              fill={fill}
              stroke={stroke}
              strokeWidth={isFocus(n) ? 2 : 1}
              onMouseEnter={() => setHovNode(key(n))}
              onMouseLeave={() => setHovNode(null)}
              style={{ cursor: "default", transition: "r 0.1s" }}
            />
          )
        })}

        {/* Legend */}
        <circle cx="60" cy={viewH - 50} r="7" fill="#EF9F27" stroke="#BA7517" strokeWidth="1" />
        <text x="74" y={viewH - 46} fontSize="11" fill="#B4B2A9">Active TPU (focus node)</text>
        {mode === "Convolution (local comm)" && (
          <>
            <circle cx="60" cy={viewH - 32} r="7" fill="#9FE1CB" stroke="#1D9E75" strokeWidth="1" />
            <text x="74" y={viewH - 28} fontSize="11" fill="#B4B2A9">Nearest neighbours only (6 nodes, 1 hop)</text>
          </>
        )}
        {mode === "Transformer (all-to-all)" && (
          <>
            <circle cx="60" cy={viewH - 32} r="7" fill="#F5C4B3" stroke="#D85A30" strokeWidth="1" />
            <text x="74" y={viewH - 28} fontSize="11" fill="#B4B2A9">All other TPUs — high hop count for distant nodes</text>
          </>
        )}
      </svg>

      <div style={{ marginTop: "12px", padding: "10px 14px", background: "#1e293b", borderRadius: "8px", fontSize: "12px", color: "#5F5E5A", borderLeft: `2px solid ${mode === "Convolution (local comm)" ? "#1D9E75" : "#D85A30"}` }}>
        {mode === "Convolution (local comm)"
          ? "Convolution: each TPU communicates only with its 6 torus neighbours. Topology matches workload perfectly."
          : "Transformer attention: every token attends to every other token → all-to-all traffic → distant nodes incur many hops on a torus."}
      </div>
    </div>
  )
}

export default TPUPodViz
