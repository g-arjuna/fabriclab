"use client"

import { useState } from "react"

type PlatformId = "h100" | "mi325x" | "mi350x" | "b200"

const palette = {
  bg: "#0a0f1a",
  panel: "#111827",
  border: "#1e293b",
  text: "#f1f5f9",
  muted: "#94a3b8",
  faint: "#475569",
  nv: "#76b900",
  amd: "#ed6c02",
  future: "#7c3aed",
  ok: "#22c55e",
} as const

const platforms = [
  {
    id: "h100" as const,
    label: "DGX H100",
    vendor: "NVIDIA",
    color: palette.nv,
    scaleUp: 900,
    memory: "80 GB HBM2e",
    memBw: "3.35 TB/s",
    topology: "NVSwitch hub",
    detail: "18 NVLink 4.0 links per GPU routed through NVSwitch crossbars.",
    scaleOut: "ConnectX-7 IB/RoCEv2",
  },
  {
    id: "mi325x" as const,
    label: "MI325X",
    vendor: "AMD",
    color: palette.amd,
    scaleUp: 336,
    memory: "256 GB HBM3E",
    memBw: "6 TB/s",
    topology: "Fully meshed xGMI",
    detail: "8 xGMI links per GPU. Production RCCL often lands around 310-330 GB/s.",
    scaleOut: "Pollara 400 RoCEv2/UEC",
  },
  {
    id: "mi350x" as const,
    label: "MI350X",
    vendor: "AMD",
    color: "#f97316",
    scaleUp: 1075,
    memory: "288 GB HBM3E",
    memBw: "8 TB/s",
    topology: "Gen4 xGMI mesh",
    detail: "7 Gen4 xGMI links and 5.5 TB/s intra-package Infinity Fabric.",
    scaleOut: "Pollara 400 RoCEv2/UEC",
  },
  {
    id: "b200" as const,
    label: "DGX B200",
    vendor: "NVIDIA",
    color: "#60a5fa",
    scaleUp: 1800,
    memory: "192 GB HBM3E",
    memBw: "8 TB/s",
    topology: "NVSwitch hub",
    detail: "NVLink 5.0 doubles H100-era scale-up bandwidth.",
    scaleOut: "ConnectX-8 / BlueField-3",
  },
]

function meshLines(color: string) {
  const points = [
    [70, 50],
    [150, 50],
    [230, 50],
    [310, 50],
    [70, 150],
    [150, 150],
    [230, 150],
    [310, 150],
  ]

  return (
    <>
      {points.map((a, index) =>
        points.slice(index + 1).map((b, inner) => (
          <line
            key={`${index}-${inner}`}
            x1={a[0]}
            y1={a[1]}
            x2={b[0]}
            y2={b[1]}
            stroke={color}
            strokeOpacity={0.28}
            strokeWidth={1}
          />
        )),
      )}
      {points.map((point, index) => (
        <g key={`gpu-${index}`}>
          <circle cx={point[0]} cy={point[1]} r={18} fill="#0f1929" stroke={color} strokeWidth={1.6} />
          <text x={point[0]} y={point[1] + 1} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={10} fontFamily="monospace">
            G{index}
          </text>
        </g>
      ))}
    </>
  )
}

function nvswitchLines(color: string) {
  const gpus = [
    [70, 50],
    [150, 50],
    [230, 50],
    [310, 50],
    [70, 150],
    [150, 150],
    [230, 150],
    [310, 150],
  ]

  return (
    <>
      <circle cx={190} cy={100} r={38} fill="#162033" stroke={color} strokeWidth={1.8} strokeOpacity={0.8} />
      <text x={190} y={95} textAnchor="middle" fill={color} fontSize={15} fontWeight="700" fontFamily="monospace">
        NVS
      </text>
      <text x={190} y={111} textAnchor="middle" fill={color} fontSize={11} fontFamily="monospace">
        x4
      </text>
      {gpus.map((point, index) => (
        <g key={`gpu-${index}`}>
          <line x1={190} y1={100} x2={point[0]} y2={point[1]} stroke={color} strokeOpacity={0.45} strokeWidth={1.4} />
          <circle cx={point[0]} cy={point[1]} r={18} fill="#0f1929" stroke={color} strokeWidth={1.6} />
          <text x={point[0]} y={point[1] + 1} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={10} fontFamily="monospace">
            G{index}
          </text>
        </g>
      ))}
    </>
  )
}

export function AMDvsNVIDIAInterconnectViz() {
  const [selected, setSelected] = useState<PlatformId>("h100")
  const current = platforms.find((item) => item.id === selected) ?? platforms[0]

  return (
    <div className="my-8 overflow-x-auto">
      <div style={{ minWidth: 820, borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.bg, padding: 24, color: palette.text }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ marginBottom: 6, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: palette.faint }}>
            Ch0 · Hardware Foundations
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Intra-node interconnect: NVIDIA vs AMD</h3>
          <p style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.7, color: palette.muted }}>
            This compares scale-up bandwidth inside one GPU server. The external Ethernet fabric remains the same operational problem across both vendors.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {platforms.map((item) => (
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
              {item.vendor} · {item.label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
          <div style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.panel, padding: 18 }}>
            <div style={{ marginBottom: 10, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: palette.faint }}>
              Topology shape
            </div>
            <svg viewBox="0 0 380 200" style={{ width: "100%", height: "auto" }}>
              {current.vendor === "NVIDIA" ? nvswitchLines(current.color) : meshLines(current.color)}
            </svg>
            <div style={{ marginTop: 10, fontSize: 11, color: current.color }}>{current.topology}</div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.panel, padding: 18 }}>
              <div style={{ marginBottom: 12, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: palette.faint }}>
                Scale-up bandwidth
              </div>
              {platforms.map((item) => (
                <div key={item.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: item.id === selected ? item.color : palette.muted }}>{item.label}</span>
                    <span style={{ color: item.id === selected ? item.color : palette.muted, fontFamily: "monospace", fontWeight: 700 }}>
                      {item.scaleUp} GB/s
                    </span>
                  </div>
                  <div style={{ height: 10, overflow: "hidden", borderRadius: 999, background: "#1f2937" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(item.scaleUp / 1800) * 100}%`,
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
                Selected platform
              </div>
              {[
                ["Memory / GPU", current.memory],
                ["Memory bandwidth", current.memBw],
                ["Scale-up topology", current.topology],
                ["External NIC", current.scaleOut],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${palette.border}`, fontSize: 12 }}>
                  <span style={{ color: palette.faint }}>{label}</span>
                  <span style={{ color: palette.text, fontWeight: 600 }}>{value}</span>
                </div>
              ))}
              <p style={{ margin: "12px 0 0", fontSize: 12, lineHeight: 1.7, color: palette.muted }}>{current.detail}</p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.panel, padding: 18 }}>
          <div style={{ marginBottom: 10, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: palette.faint }}>
            External fabric view
          </div>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.8, color: palette.muted }}>
            Switches still see the same kind of scale-out problem: 400GbE ports, RoCEv2 transport, PFC-protected lossless queues, and ECN feedback. The switch does not care whether traffic originated from ConnectX-7 or Pollara 400.
          </p>
          <div style={{ marginTop: 12, display: "flex", gap: 18, flexWrap: "wrap", fontSize: 11 }}>
            <span style={{ color: palette.ok }}>Same DSCP / QoS intent on Ethernet fabrics</span>
            <span style={{ color: palette.ok }}>Same RoCEv2 operational tuning</span>
            <span style={{ color: palette.future }}>UALink is AMD&apos;s future multi-node scale-up direction</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AMDvsNVIDIAInterconnectViz
