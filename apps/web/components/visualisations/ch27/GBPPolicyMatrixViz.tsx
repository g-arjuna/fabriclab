'use client'

import { useMemo, useState } from "react"

type Policy = "permit" | "deny" | "unset"

const epgs = [
  { id: "T1_COMPUTE", label: "T1 Compute", color: "#60a5fa" },
  { id: "T1_STORAGE", label: "T1 Storage", color: "#76e5b5" },
  { id: "T2_COMPUTE", label: "T2 Compute", color: "#a78bfa" },
  { id: "T2_STORAGE", label: "T2 Storage", color: "#fbbf24" },
] as const

const defaultMatrix: Record<string, Record<string, Policy>> = {
  T1_COMPUTE: { T1_COMPUTE: "permit", T1_STORAGE: "permit", T2_COMPUTE: "deny", T2_STORAGE: "deny" },
  T1_STORAGE: { T1_COMPUTE: "permit", T1_STORAGE: "permit", T2_COMPUTE: "deny", T2_STORAGE: "deny" },
  T2_COMPUTE: { T1_COMPUTE: "deny", T1_STORAGE: "deny", T2_COMPUTE: "permit", T2_STORAGE: "permit" },
  T2_STORAGE: { T1_COMPUTE: "deny", T1_STORAGE: "deny", T2_COMPUTE: "permit", T2_STORAGE: "permit" },
}

const policyMeta: Record<Policy, { color: string; bg: string; icon: string }> = {
  permit: { color: "#76e5b5", bg: "#13291f", icon: "OK" },
  deny: { color: "#f87171", bg: "#2a1518", icon: "X" },
  unset: { color: "#7c8db5", bg: "#111522", icon: "-" },
}

export default function GBPPolicyMatrixViz() {
  const [matrix, setMatrix] = useState(defaultMatrix)
  const [selected, setSelected] = useState<{ src: string; dst: string } | null>(null)

  const counts = useMemo(() => {
    const values = Object.values(matrix).flatMap((row) => Object.values(row))
    return {
      permit: values.filter((value) => value === "permit").length,
      deny: values.filter((value) => value === "deny").length,
      unset: values.filter((value) => value === "unset").length,
    }
  }, [matrix])

  const cyclePolicy = (src: string, dst: string) => {
    setMatrix((current) => {
      const next = current[src][dst] === "permit" ? "deny" : current[src][dst] === "deny" ? "unset" : "permit"
      return {
        ...current,
        [src]: {
          ...current[src],
          [dst]: next,
        },
      }
    })
    setSelected({ src, dst })
  }

  const generatedCommand = useMemo(() => {
    if (!selected) return null
    const action = matrix[selected.src][selected.dst]
    if (action === "unset") {
      return "# No explicit contract configured. Implicit deny applies."
    }
    return `nv set system security gbp contract ${selected.src}_TO_${selected.dst} \\
  src-epg ${selected.src} \\
  dst-epg ${selected.dst} \\
  action ${action}${action === "deny" ? " log" : ""}`
  }, [matrix, selected])

  return (
    <div
      style={{
        background: "#0f1117",
        border: "1px solid #2a2d3e",
        borderRadius: 12,
        padding: 24,
        color: "#e2e8f0",
        margin: "24px auto",
        maxWidth: 760,
      }}
    >
      <div style={{ fontSize: 12, color: "#7c8db5", letterSpacing: "0.08em", marginBottom: 6 }}>
        POLICY MATRIX
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#60a5fa", marginBottom: 16 }}>
        GBP Microsegmentation Contracts
      </div>

      <div style={{ overflowX: "auto", marginBottom: 18 }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 6 }}>
          <thead>
            <tr>
              <th style={{ color: "#7c8db5", fontSize: 11 }}>SRC / DST</th>
              {epgs.map((epg) => (
                <th key={epg.id} style={{ color: epg.color, fontSize: 11 }}>
                  {epg.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {epgs.map((src) => (
              <tr key={src.id}>
                <td style={{ color: src.color, fontSize: 11, fontWeight: 700, paddingRight: 8 }}>{src.label}</td>
                {epgs.map((dst) => {
                  const action = matrix[src.id][dst.id]
                  const meta = policyMeta[action]
                  const active = selected?.src === src.id && selected?.dst === dst.id
                  return (
                    <td key={dst.id}>
                      <button
                        onClick={() => cyclePolicy(src.id, dst.id)}
                        style={{
                          width: "100%",
                          borderRadius: 10,
                          border: `1px solid ${active ? "#60a5fa" : meta.color}`,
                          background: active ? "#172033" : meta.bg,
                          color: meta.color,
                          padding: "10px 8px",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{meta.icon}</div>
                        <div style={{ fontSize: 10 }}>{action}</div>
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {generatedCommand && (
        <div
          style={{
            background: "#111522",
            border: "1px solid #2a2d3e",
            borderRadius: 10,
            padding: 14,
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 11, color: "#7c8db5", marginBottom: 8 }}>Generated NVUE contract</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.7, color: "#76e5b5" }}>
            {generatedCommand}
          </pre>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { label: "Permit", value: counts.permit, color: "#76e5b5" },
          { label: "Deny", value: counts.deny, color: "#f87171" },
          { label: "Unset", value: counts.unset, color: "#7c8db5" },
          { label: "TCAM model", value: "Line-rate", color: "#60a5fa" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: "#111522",
              border: "1px solid #2a2d3e",
              borderRadius: 10,
              padding: "10px 12px",
              minWidth: 120,
            }}
          >
            <div style={{ fontSize: 10, color: "#7c8db5" }}>{item.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
