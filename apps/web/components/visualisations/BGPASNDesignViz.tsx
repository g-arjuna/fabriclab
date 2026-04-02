"use client"
import { useState } from "react"

// ── BGPASNDesignViz ─────────────────────────
// Shows same-ASN vs different-ASN spine failure scenarios

type Mode = "same" | "diff"
type FailureState = "none" | "one" | "two"

export function BGPASNDesignViz() {
  const [mode, setMode] = useState<Mode>("same")
  const [failure, setFailure] = useState<FailureState>("none")

  const spineAAsnLabel = mode === "same" ? "ASN 65000" : "ASN 65001"
  const spineBAsnLabel = mode === "same" ? "ASN 65000" : "ASN 65002"

  const linkADown = failure === "one" || failure === "two"
  const linkBDown = failure === "two"

  type PathState = "ok" | "suboptimal" | "down"

  function getState(): { path: PathState; explanation: string; detail: string } {
    if (failure === "none") return {
      path: "ok",
      explanation: "Normal operation",
      detail: "Traffic from Server1 → Server5 takes optimal 2-hop path via SpineA or SpineB using ECMP.",
    }
    if (failure === "one") {
      if (mode === "same") return {
        path: "ok",
        explanation: "SpineA link failed — clean failover",
        detail: "SpineA withdraws Server5 route. ECMP shifts 100% of traffic to SpineB. Still 2 hops. No suboptimal routing.",
      }
      return {
        path: "suboptimal",
        explanation: "SpineA link failed — SUBOPTIMAL path via SpineB",
        detail: "With different ASNs, SpineA can re-advertise Server5 via SpineB (AS-PATH: 65001 → 65002 → 65004). Leaf1 accepts this 3-hop path. Traffic hits SpineA → SpineB → Leaf2, doubling load on SpineB → Leaf2 link.",
      }
    }
    return {
      path: "down",
      explanation: mode === "same" ? "Both links failed — correctly declared unreachable" : "Both links failed — correctly declared unreachable",
      detail: mode === "same"
        ? "Both spines withdraw Server5. Leaf1 has no route. Orchestrator reassigns job. Correct behaviour."
        : "Both spines have no path. Server5 unreachable. Same outcome as same-ASN — but only in worst case.",
    }
  }

  const { path, explanation, detail } = getState()
  const pathColor = path === "ok" ? "#1D9E75" : path === "suboptimal" ? "#BA7517" : "#E24B4A"

  const nodeStyle = (active: boolean, color: string) => ({
    background: active ? color : "#1e293b",
    border: `1px solid ${active ? color : "#334155"}`,
    borderRadius: 8,
    padding: "8px 12px",
    textAlign: "center" as const,
    fontSize: 12,
    fontWeight: 500 as const,
    color: active ? "#fff" : "#94a3b8",
    transition: "all 0.2s",
    minWidth: 90,
  })

  const linkStyle = (down: boolean, highlight: boolean) => ({
    height: 2,
    background: down ? "#E24B4A" : highlight ? pathColor : "#334155",
    borderRadius: 1,
    flex: 1,
    position: "relative" as const,
    transition: "background 0.3s",
  })

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">BGP ASN design — failure behavior</div>
      <div className="mb-5 text-xs text-slate-600">Toggle spine ASN design and simulate link failures to see the routing impact.</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          onClick={() => setMode("same")}
          style={{ flex: 1, padding: "8px 0", background: mode === "same" ? "#185FA5" : "transparent", border: `1px solid ${mode === "same" ? "#185FA5" : "#334155"}`, borderRadius: 8, color: mode === "same" ? "#fff" : "#94a3b8", fontSize: 12, cursor: "pointer" }}
        >
          Same ASN on spines
        </button>
        <button
          onClick={() => setMode("diff")}
          style={{ flex: 1, padding: "8px 0", background: mode === "diff" ? "#BA7517" : "transparent", border: `1px solid ${mode === "diff" ? "#BA7517" : "#334155"}`, borderRadius: 8, color: mode === "diff" ? "#fff" : "#94a3b8", fontSize: 12, cursor: "pointer" }}
        >
          Different ASNs on spines
        </button>
      </div>

      <div className="overflow-x-auto pb-2">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 20, minWidth: 420 }}>
        <div style={{ display: "flex", gap: 40 }}>
          <div style={nodeStyle(true, "#185FA5")}>Leaf1{"\n"}ASN 65001<br/><span style={{ fontSize: 10, fontWeight: 400, color: "#93c5fd" }}>Server1</span></div>
          <div style={{ width: 40 }} />
          <div style={nodeStyle(true, "#185FA5")}>Leaf2{"\n"}ASN 65004<br/><span style={{ fontSize: 10, fontWeight: 400, color: "#93c5fd" }}>Server5</span></div>
        </div>

        <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={linkStyle(false, path === "ok" || path === "suboptimal")} />
            <div style={nodeStyle(!linkADown, "#1D9E75")}>SpineA<br/><span style={{ fontSize: 10 }}>{spineAAsnLabel}</span></div>
            <div style={linkStyle(linkADown, path === "ok")} />
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={linkStyle(false, path === "ok" || path === "suboptimal")} />
            <div style={nodeStyle(!linkBDown, "#1D9E75")}>SpineB<br/><span style={{ fontSize: 10 }}>{spineBAsnLabel}</span></div>
            <div style={linkStyle(linkBDown, true)} />
          </div>
        </div>

        {path === "suboptimal" && (
          <div style={{ fontSize: 10, color: "#BA7517", background: "#3b1f08", border: "1px solid #BA7517", borderRadius: 6, padding: "4px 10px" }}>
            SpineA re-advertising via SpineB (3-hop path)
          </div>
        )}
      </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(["none", "one", "two"] as FailureState[]).map((f) => (
          <button
            key={f}
            onClick={() => setFailure(f)}
            style={{
              flex: 1,
              padding: "8px 0",
              background: failure === f ? "#1e293b" : "transparent",
              border: `1px solid ${failure === f ? "#475569" : "#334155"}`,
              borderRadius: 8,
              color: failure === f ? "#e2e8f0" : "#64748b",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            {f === "none" ? "No failure" : f === "one" ? "SpineA link fails" : "Both links fail"}
          </button>
        ))}
      </div>

      <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 14px", borderLeft: `3px solid ${pathColor}` }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: pathColor, marginBottom: 6 }}>{explanation}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{detail}</div>
      </div>
    </div>
  )
}

export default BGPASNDesignViz
