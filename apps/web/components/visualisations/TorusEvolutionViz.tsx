"use client"
import { useState } from "react"

// ── TorusEvolutionViz ─────────────────────────
// Shows torus topology from 1D ring through 5D,
// with node count, links per node, max hop count,
// and an animated SVG layout for each dimension level

const DIMS = [
  {
    label: "1D ring",
    dim: 1,
    nodes: 8,
    k: 8,
    linksPerNode: 2,
    maxHops: 4,
    machine: "None (illustrative)",
    desc: "Each node connects to 2 neighbours. Max hop = N/2.",
  },
  {
    label: "2D torus",
    dim: 2,
    nodes: 64,
    k: 8,
    linksPerNode: 4,
    maxHops: 8,
    machine: "Early Cray T3D/T3E",
    desc: "N, S, E, W links. Edges wrap. Max hop = 2×(K/2).",
  },
  {
    label: "3D torus",
    dim: 3,
    nodes: 512,
    k: 8,
    linksPerNode: 6,
    maxHops: 12,
    machine: "IBM Blue Gene /L /P, Cray XT3–XT6",
    desc: "+/- in X, Y, Z. Max hop = 3×(K/2).",
  },
  {
    label: "5D torus",
    dim: 5,
    nodes: 32768,
    k: 8,
    linksPerNode: 10,
    maxHops: 20,
    machine: "IBM Blue Gene /Q (Mira, Sequoia)",
    desc: "5 axes, 2 links each. Max hop = 5×(K/2).",
  },
  {
    label: "6D Tofu",
    dim: 6,
    nodes: 88128,
    k: "mixed",
    linksPerNode: 10,
    maxHops: 22,
    machine: "Fujitsu K computer (world #1 in 2011)",
    desc: "6D mesh/torus. Folded for short cables.",
  },
]

function Ring8({ highlight }: { highlight: boolean }) {
  const cx = 120, cy = 120, r = 70
  const nodes = 8
  const pts = Array.from({ length: nodes }, (_, i) => {
    const a = (i * 2 * Math.PI) / nodes - Math.PI / 2
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })
  return (
    <svg viewBox="0 0 240 240" width="240" height="240">
      {pts.map((p, i) => {
        const next = pts[(i + 1) % nodes]
        return <line key={i} x1={p.x} y1={p.y} x2={next.x} y2={next.y} stroke={highlight ? "#3B8BD4" : "#888780"} strokeWidth="1.5" />
      })}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="8" fill={highlight ? "#B5D4F4" : "#D3D1C7"} stroke={highlight ? "#3B8BD4" : "#888780"} strokeWidth="1" />
      ))}
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="11" fill="#888780">8 nodes</text>
    </svg>
  )
}

function Torus2D({ highlight }: { highlight: boolean }) {
  const K = 6, spacing = 28, ox = 20, oy = 20
  const pts: { x: number; y: number }[][] = Array.from({ length: K }, (_, r) =>
    Array.from({ length: K }, (_, c) => ({ x: ox + c * spacing, y: oy + r * spacing }))
  )
  const nodeColor = highlight ? "#B5D4F4" : "#D3D1C7"
  const strokeColor = highlight ? "#3B8BD4" : "#888780"
  return (
    <svg viewBox="0 0 200 200" width="200" height="200">
      {pts.map((row, r) =>
        row.map((p, c) => {
          const right = pts[r][(c + 1) % K]
          const down = pts[(r + 1) % K][c]
          return (
            <g key={`${r}-${c}`}>
              <line x1={p.x} y1={p.y} x2={right.x} y2={right.y} stroke={strokeColor} strokeWidth="1" opacity={c === K - 1 ? 0.3 : 1} strokeDasharray={c === K - 1 ? "3 2" : undefined} />
              <line x1={p.x} y1={p.y} x2={down.x} y2={down.y} stroke={strokeColor} strokeWidth="1" opacity={r === K - 1 ? 0.3 : 1} strokeDasharray={r === K - 1 ? "3 2" : undefined} />
            </g>
          )
        })
      )}
      {pts.map((row, r) =>
        row.map((p, c) => (
          <circle key={`n-${r}-${c}`} cx={p.x} cy={p.y} r="5" fill={nodeColor} stroke={strokeColor} strokeWidth="0.8" />
        ))
      )}
      <text x="100" y="192" textAnchor="middle" fontSize="9" fill="#888780">dashed = wrap-around links</text>
    </svg>
  )
}

function Torus3D({ highlight }: { highlight: boolean }) {
  const K = 4, s = 36, ox = 30, oy = 30, dx = 12, dy = 8
  const stroke = highlight ? "#3B8BD4" : "#888780"
  const fill = highlight ? "#B5D4F4" : "#D3D1C7"
  const project = (x: number, y: number, z: number) => ({
    sx: ox + x * s + z * dx,
    sy: oy + y * s + z * dy,
  })
  const nodes: { x: number; y: number; z: number }[] = []
  for (let z = 0; z < K; z++)
    for (let y = 0; y < K; y++)
      for (let x = 0; x < K; x++)
        nodes.push({ x, y, z })
  return (
    <svg viewBox="0 0 220 220" width="220" height="220">
      {nodes.map(({ x, y, z }) => {
        const p = project(x, y, z)
        const px = project((x + 1) % K, y, z)
        const py = project(x, (y + 1) % K, z)
        const pz = project(x, y, (z + 1) % K)
        return (
          <g key={`${x}-${y}-${z}`}>
            <line x1={p.sx} y1={p.sy} x2={px.sx} y2={px.sy} stroke={stroke} strokeWidth="0.8" opacity="0.6" />
            <line x1={p.sx} y1={p.sy} x2={py.sx} y2={py.sy} stroke={stroke} strokeWidth="0.8" opacity="0.6" />
            <line x1={p.sx} y1={p.sy} x2={pz.sx} y2={pz.sy} stroke={stroke} strokeWidth="0.6" opacity="0.4" />
          </g>
        )
      })}
      {nodes.map(({ x, y, z }) => {
        const p = project(x, y, z)
        return <circle key={`n-${x}-${y}-${z}`} cx={p.sx} cy={p.sy} r="4" fill={fill} stroke={stroke} strokeWidth="0.7" />
      })}
      <text x="110" y="212" textAnchor="middle" fontSize="9" fill="#888780">4×4×4 = 64 shown (512 at K=8)</text>
    </svg>
  )
}

function DimIcon({ dim, highlight }: { dim: number; highlight: boolean }) {
  if (dim === 1) return <Ring8 highlight={highlight} />
  if (dim === 2) return <Torus2D highlight={highlight} />
  if (dim === 3) return <Torus3D highlight={highlight} />
  const fill = highlight ? "#B5D4F4" : "#D3D1C7"
  const stroke = highlight ? "#3B8BD4" : "#888780"
  return (
    <svg viewBox="0 0 220 180" width="220" height="180">
      <text x="110" y="70" textAnchor="middle" fontSize="13" fill={stroke}>{dim}D torus</text>
      <text x="110" y="92" textAnchor="middle" fontSize="11" fill="#888780">(K^{dim} nodes)</text>
      <text x="110" y="114" textAnchor="middle" fontSize="11" fill="#888780">{2 * dim} links/node</text>
      <circle cx="110" cy="145" r="16" fill={fill} stroke={stroke} strokeWidth="1" />
      <text x="110" y="150" textAnchor="middle" fontSize="10" fill={stroke}>node</text>
    </svg>
  )
}

export function TorusEvolutionViz() {
  const [sel, setSel] = useState(0)
  const d = DIMS[sel]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">Torus topology evolution</div>
      <div className="mb-4 text-xs text-slate-600">Select a dimension count to explore the topology and its real-world deployments</div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {DIMS.map((dim, i) => (
          <button
            key={i}
            onClick={() => setSel(i)}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: `1px solid ${sel === i ? "#3B8BD4" : "#444441"}`,
              background: sel === i ? "#0C447C" : "transparent",
              color: sel === i ? "#B5D4F4" : "#888780",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: sel === i ? 500 : 400,
            }}
          >
            {dim.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 auto" }}>
          <DimIcon dim={d.dim} highlight={true} />
        </div>

        <div style={{ flex: "1 1 220px" }}>
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", color: "#5F5E5A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Description</div>
            <div style={{ fontSize: "14px", color: "#B4B2A9" }}>{d.desc}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "16px" }}>
            {[
              { label: "Dimensions", value: String(d.dim) },
              { label: "Links / node", value: String(d.linksPerNode) },
              { label: "Nodes (K=8)", value: d.nodes.toLocaleString() },
              { label: "Max hop count", value: String(d.maxHops) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#1e293b", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "3px" }}>{label}</div>
                <div style={{ fontSize: "18px", fontWeight: 500, color: "#B5D4F4" }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#1e293b", borderRadius: "8px", padding: "10px 12px" }}>
            <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Real machine</div>
            <div style={{ fontSize: "13px", color: "#9FE1CB" }}>{d.machine}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "16px", padding: "10px 14px", background: "#1e293b", borderRadius: "8px", borderLeft: "2px solid #888780", fontSize: "12px", color: "#5F5E5A" }}>
        No switches — each node is its own router. Links per node = 2×dimensions. Max hop count = dimensions × (K÷2).
      </div>
    </div>
  )
}

export default TorusEvolutionViz
