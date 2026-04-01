'use client'
import { useState } from "react"

const SPINES = [
  { id: 0, label: "Spine-0", load: 0.82, color: "#ef4444" },
  { id: 1, label: "Spine-1", load: 0.21, color: "#22c55e" },
  { id: 2, label: "Spine-2", load: 0.35, color: "#22c55e" },
  { id: 3, label: "Spine-3", load: 0.68, color: "#f59e0b" },
  { id: 4, label: "Spine-4", load: 0.15, color: "#22c55e" },
  { id: 5, label: "Spine-5", load: 0.44, color: "#22c55e" },
  { id: 6, label: "Spine-6", load: 0.91, color: "#ef4444" },
  { id: 7, label: "Spine-7", load: 0.28, color: "#22c55e" },
]

const PKT_COUNT = 16

function getLoadColor(load: number) {
  if (load >= 0.8) return "#ef4444"
  if (load >= 0.6) return "#f59e0b"
  return "#22c55e"
}

function getLoadLabel(load: number) {
  if (load >= 0.8) return "High"
  if (load >= 0.6) return "Med"
  return "Low"
}

export function UECMultipathViz() {
  const [mode, setMode] = useState<"rshp" | "uec">("rshp")
  const [msgId] = useState(77)

  // RSHP: hash-based, probabilistic assignment
  const rshpAssignment = Array.from({ length: PKT_COUNT }, (_, i) => {
    // Simulate a biased hash -- some spines get more
    const hashSeeds = [0, 0, 3, 1, 6, 6, 2, 0, 3, 7, 6, 1, 0, 4, 3, 6]
    return hashSeeds[i]
  })

  // UEC: NPM-aware assignment -- avoids overloaded spines (0 and 6)
  const uecAssignment = Array.from({ length: PKT_COUNT }, (_, i) => {
    const preferred = [1, 2, 4, 5, 7, 1, 2, 4, 5, 7, 1, 2, 4, 5, 7, 1]
    return preferred[i]
  })

  const assignment = mode === "rshp" ? rshpAssignment : uecAssignment

  // Count packets per spine
  const spineCounts = SPINES.map(s => assignment.filter(a => a === s.id).length)

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: "24px", fontFamily: "monospace", color: "#e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>
          Packet spraying: hash-based ECMP (RSHP) vs UEC native multipath with NPM
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["rshp", "uec"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              background: mode === m ? "#1e3a5f" : "transparent",
              border: `1px solid ${mode === m ? "#3b82f6" : "#334155"}`,
              borderRadius: 5, padding: "5px 14px", cursor: "pointer",
              color: mode === m ? "#93c5fd" : "#64748b", fontSize: 11,
            }}>{m === "rshp" ? "RSHP (hash)" : "UEC (NPM-aware)"}</button>
          ))}
        </div>
      </div>

      {/* NPM feedback display */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>
          {mode === "uec"
            ? "NPM feedback received from each spine -- sender avoids overloaded paths"
            : "No path feedback -- ECMP hash distributes probabilistically across all paths"}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {SPINES.map(s => (
            <div key={s.id} style={{ flex: 1, textAlign: "center" }}>
              <div style={{
                background: "#1e293b",
                border: `1px solid ${mode === "uec" ? getLoadColor(s.load) : "#334155"}`,
                borderRadius: 6, padding: "8px 4px",
              }}>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: mode === "uec" ? getLoadColor(s.load) : "#475569", marginTop: 4 }}>
                  {mode === "uec" ? `${Math.round(s.load * 100)}%` : "?"}
                </div>
                {mode === "uec" && (
                  <div style={{ fontSize: 9, color: getLoadColor(s.load), marginTop: 2 }}>
                    {getLoadLabel(s.load)}
                  </div>
                )}
              </div>
              {/* Bar */}
              <div style={{ height: 60, background: "#1e293b", borderRadius: "0 0 4px 4px", position: "relative", overflow: "hidden" }}>
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  height: `${s.load * 100}%`,
                  background: mode === "uec" ? getLoadColor(s.load) + "44" : "#33415544",
                  transition: "all 0.3s",
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Packet assignment grid */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
          Message ID {msgId} -- {PKT_COUNT} packets assigned to spines
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {Array.from({ length: PKT_COUNT }, (_, i) => {
            const spine = assignment[i]
            const spineData = SPINES[spine]
            const isOverloaded = spineData.load >= 0.8
            return (
              <div key={i} style={{
                background: isOverloaded && mode === "rshp" ? "#2d1b1b" : "#1e293b",
                border: `1px solid ${isOverloaded && mode === "rshp" ? "#ef4444" : spineData.color}`,
                borderRadius: 5, padding: "6px 10px", textAlign: "center",
              }}>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>pkt#{i}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: isOverloaded && mode === "rshp" ? "#ef4444" : spineData.color }}>
                  S{spine}
                </div>
                {mode === "uec" && <div style={{ fontSize: 8, color: "#475569" }}>PathID={i % 8}</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Distribution histogram */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Packets per spine:</div>
        <div style={{ display: "flex", gap: 6 }}>
          {SPINES.map((s, i) => {
            const count = spineCounts[i]
            const isOverloaded = s.load >= 0.8
            return (
              <div key={s.id} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: isOverloaded && mode === "rshp" ? "#ef4444" : s.color, marginBottom: 4 }}>
                  {count}
                </div>
                <div style={{
                  height: Math.max(4, count * 12),
                  background: isOverloaded && mode === "rshp" ? "#ef4444" : s.color,
                  borderRadius: 3, opacity: 0.7,
                  transition: "all 0.3s",
                }} />
                <div style={{ fontSize: 9, color: "#475569", marginTop: 3 }}>S{s.id}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      <div style={{
        background: "#1e293b", borderRadius: 8, padding: "12px 16px",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
      }}>
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>RSHP (hash-based)</div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
            Hash varies source UDP port per packet. Statistical distribution.
            Blind to actual path load. Spine-0 and Spine-6 receive packets despite {">"}80% utilisation.
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 4 }}>UEC with NPM</div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
            Sender reads NPM utilisation per spine before assigning path IDs.
            Overloaded spines (S0, S6) excluded. Load distributed only across low/medium utilisation paths.
          </div>
        </div>
      </div>
    </div>
  )
}

export default UECMultipathViz
