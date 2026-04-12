'use client'

import { useMemo, useState } from "react"

type Range = {
  label: string
  start: number
  end: number
  color: string
}

function buildRanges(tenantCount: number): Range[] {
  const ranges: Range[] = []
  for (let tenant = 1; tenant <= tenantCount; tenant += 1) {
    const offset = (tenant - 1) * 1000
    ranges.push({ label: `T${tenant} Compute`, start: offset + 100, end: offset + 199, color: "#60a5fa" })
    ranges.push({ label: `T${tenant} Storage`, start: offset + 200, end: offset + 299, color: "#76e5b5" })
    ranges.push({ label: `T${tenant} L3 VNI`, start: tenant * 1000, end: tenant * 1000, color: "#a78bfa" })
  }
  ranges.push({ label: "Management", start: 9000, end: 9099, color: "#fbbf24" })
  ranges.push({ label: "OOB Overlay", start: 9100, end: 9199, color: "#f97316" })
  ranges.push({ label: "Shared Inference", start: 10000, end: 10999, color: "#f87171" })
  return ranges
}

export default function VNIAllocationViz() {
  const [tenantCount, setTenantCount] = useState(3)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(null)

  const ranges = useMemo(() => buildRanges(tenantCount), [tenantCount])
  const conflict = useMemo(() => {
    if (!query) return null
    const value = Number(query)
    if (Number.isNaN(value)) return null
    return ranges.find((range) => value >= range.start && value <= range.end) ?? null
  }, [query, ranges])

  const totalAllocated = ranges.reduce((sum, range) => sum + (range.end - range.start + 1), 0)

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
        ALLOCATION PLANNER
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#60a5fa", marginBottom: 16 }}>
        VNI Range Planning
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        {[1, 2, 3, 4, 6, 8].map((count) => (
          <button
            key={count}
            onClick={() => setTenantCount(count)}
            style={{
              borderRadius: 999,
              border: `1px solid ${tenantCount === count ? "#60a5fa" : "#2a2d3e"}`,
              background: tenantCount === count ? "#172033" : "#111522",
              color: tenantCount === count ? "#60a5fa" : "#9fb0d1",
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            {count} tenants
          </button>
        ))}

        <div style={{ marginLeft: "auto", minWidth: 180 }}>
          <div style={{ fontSize: 10, color: "#7c8db5", marginBottom: 4 }}>Conflict check</div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try VNI 1000"
            style={{
              width: "100%",
              borderRadius: 10,
              border: `1px solid ${conflict ? conflict.color : "#2a2d3e"}`,
              background: "#111522",
              color: "#e2e8f0",
              padding: "8px 10px",
            }}
          />
        </div>
      </div>

      {query && (
        <div
          style={{
            background: "#111522",
            border: `1px solid ${conflict ? conflict.color : "#76e5b5"}`,
            borderRadius: 10,
            padding: 14,
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 12, color: conflict ? conflict.color : "#76e5b5", fontWeight: 700 }}>
            {conflict ? `Occupied: ${conflict.label}` : "Free VNI - no collision found"}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
        {ranges.map((range) => (
          <button
            key={`${range.label}-${range.start}`}
            onClick={() => setSelected(selected === range.label ? null : range.label)}
            style={{
              textAlign: "left",
              borderRadius: 10,
              border: `1px solid ${selected === range.label ? range.color : "#2a2d3e"}`,
              background: "#111522",
              padding: 14,
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: range.color }}>{range.label}</div>
            <div style={{ fontSize: 12, color: "#a9b4cf", marginTop: 4 }}>
              {range.start} - {range.end}
            </div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { label: "Tenant count", value: tenantCount, color: "#60a5fa" },
          { label: "Allocated VNIs", value: totalAllocated, color: "#76e5b5" },
          { label: "Namespace", value: "24-bit", color: "#a78bfa" },
          { label: "Jumbo MTU", value: "9216", color: "#fbbf24" },
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
