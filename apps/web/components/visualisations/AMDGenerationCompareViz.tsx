"use client"

import { useState } from "react"

type GenerationId = "mi300x" | "mi325x" | "mi350x" | "mi355x"

const palette = {
  bg: "#0a0f1a",
  panel: "#111827",
  border: "#1e293b",
  text: "#f1f5f9",
  muted: "#94a3b8",
  faint: "#475569",
  warn: "#f59e0b",
} as const

const generations = [
  {
    id: "mi300x" as const,
    label: "MI300X",
    year: "2023",
    color: "#f59e0b",
    memory: "192 GB HBM3",
    memBw: "5.2 TB/s",
    xgmi: 288,
    links: "6 links",
    inf: "~3.2 TB/s",
    tdp: "750W",
    note: "Introduced the large-memory chiplet approach that defined later Instinct platforms.",
  },
  {
    id: "mi325x" as const,
    label: "MI325X",
    year: "2024",
    color: "#f97316",
    memory: "256 GB HBM3E",
    memBw: "6 TB/s",
    xgmi: 336,
    links: "8 links",
    inf: "~3.5 TB/s",
    tdp: "1000W",
    note: "Memory increases and xGMI connectivity improve, but it is still fundamentally a CDNA 3-era platform.",
  },
  {
    id: "mi350x" as const,
    label: "MI350X",
    year: "2025",
    color: "#ef4444",
    memory: "288 GB HBM3E",
    memBw: "8 TB/s",
    xgmi: 1075,
    links: "7 Gen4 links",
    inf: "5.5 TB/s",
    tdp: "1000W",
    note: "CDNA 4 is the major jump: much faster xGMI and a rebuilt Infinity Fabric.",
  },
  {
    id: "mi355x" as const,
    label: "MI355X",
    year: "2025",
    color: "#dc2626",
    memory: "288 GB HBM3E",
    memBw: "8 TB/s",
    xgmi: 1075,
    links: "7 Gen4 links",
    inf: "5.5 TB/s",
    tdp: "1400W",
    note: "The liquid-cooled MI355X keeps the same interconnect profile but pushes power and sustained clocks higher.",
  },
]

function ChipletDiagram({ color }: { color: string }) {
  const tiles = [
    [24, 20],
    [92, 20],
    [160, 20],
    [228, 20],
    [24, 82],
    [92, 82],
    [160, 82],
    [228, 82],
  ]

  return (
    <svg viewBox="0 0 320 210" style={{ width: "100%", height: "auto" }}>
      <rect x={16} y={142} width={288} height={52} rx={8} fill="#162033" stroke={color} strokeWidth={1.6} strokeOpacity={0.7} />
      <text x={160} y={165} textAnchor="middle" fill={color} fontFamily="monospace" fontSize={11} fontWeight="700">
        I/O Die
      </text>
      <text x={160} y={180} textAnchor="middle" fill={palette.faint} fontFamily="monospace" fontSize={10}>
        Infinity Fabric backbone
      </text>

      {tiles.map(([x, y], index) => (
        <g key={`tile-${index}`}>
          <rect x={x} y={y} width={52} height={34} rx={6} fill={`${color}18`} stroke={color} strokeWidth={1.4} />
          <line x1={x + 26} y1={y + 34} x2={x + 26} y2={142} stroke={color} strokeOpacity={0.35} strokeDasharray="3,3" />
          <text x={x + 26} y={y + 20} textAnchor="middle" fill={color} fontFamily="monospace" fontSize={10}>
            XCD{index}
          </text>
        </g>
      ))}
    </svg>
  )
}

export function AMDGenerationCompareViz() {
  const [selected, setSelected] = useState<GenerationId>("mi325x")
  const current = generations.find((item) => item.id === selected) ?? generations[1]

  return (
    <div className="my-8 overflow-x-auto">
      <div style={{ minWidth: 820, borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.bg, padding: 24, color: palette.text }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ marginBottom: 6, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: palette.faint }}>
            AMD Instinct · Generational comparison
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>MI300X -&gt; MI325X -&gt; MI350X</h3>
          <p style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.7, color: palette.muted }}>
            The important point for a network engineer is how AMD&apos;s node-local scale-up bandwidth changes across generations, because that changes what spills onto the external fabric.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {generations.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item.id)}
              style={{
                borderRadius: 999,
                border: `1px solid ${selected === item.id ? item.color : palette.border}`,
                background: selected === item.id ? `${item.color}18` : "transparent",
                color: selected === item.id ? item.color : palette.muted,
                padding: "8px 14px",
                fontFamily: "monospace",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {item.label} · {item.year}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
          <div style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.panel, padding: 18 }}>
            <div style={{ marginBottom: 10, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: palette.faint }}>
              Chiplet layout
            </div>
            <ChipletDiagram color={current.color} />
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.panel, padding: 18 }}>
              <div style={{ marginBottom: 12, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: palette.faint }}>
                xGMI progression
              </div>
              {generations.map((item) => (
                <div key={item.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: item.id === selected ? item.color : palette.muted }}>{item.label}</span>
                    <span style={{ color: item.id === selected ? item.color : palette.muted, fontFamily: "monospace", fontWeight: 700 }}>
                      {item.xgmi} GB/s
                    </span>
                  </div>
                  <div style={{ height: 10, overflow: "hidden", borderRadius: 999, background: "#1f2937" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(item.xgmi / 1075) * 100}%`,
                        borderRadius: 999,
                        background: item.id === selected ? item.color : "#334155",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.panel, padding: 18 }}>
              <div style={{ marginBottom: 12, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: palette.faint }}>
                Selected generation
              </div>
              {[
                ["Memory", current.memory],
                ["Memory bandwidth", current.memBw],
                ["xGMI links", current.links],
                ["Aggregate xGMI", `${current.xgmi} GB/s`],
                ["Intra-package Infinity Fabric", current.inf],
                ["TDP", current.tdp],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${palette.border}`, fontSize: 12 }}>
                  <span style={{ color: palette.faint }}>{label}</span>
                  <span style={{ color: palette.text, fontWeight: 600 }}>{value}</span>
                </div>
              ))}
              <p style={{ margin: "12px 0 0", fontSize: 12, lineHeight: 1.7, color: palette.muted }}>{current.note}</p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.panel, padding: 18 }}>
          <div style={{ marginBottom: 10, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: palette.faint }}>
            NVIDIA context
          </div>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.8, color: palette.muted }}>
            H100 NVLink 4.0 is 900 GB/s, B200 NVLink 5.0 is 1,800 GB/s, and MI350X xGMI Gen4 is about 1,075 GB/s. That means MI350 closes the H100-era gap meaningfully, but Blackwell has already moved the target again.
          </p>
          <div style={{ marginTop: 12, fontSize: 11, color: palette.warn }}>
            The external fabric lesson stays unchanged: all of these nodes still scale out over RoCEv2-capable Ethernet.
          </div>
        </div>
      </div>
    </div>
  )
}

export default AMDGenerationCompareViz
