'use client'

import { useMemo, useState } from "react"

const steps = [
  {
    id: "tenant",
    title: "Tenant Frame",
    detail: "A tenant Ethernet frame leaves the DGX host with its inner MAC, IP, and RoCE payload intact.",
    outer: false,
  },
  {
    id: "vtep",
    title: "Ingress VTEP",
    detail: "The Spectrum-4 leaf classifies the VLAN, maps it to a VNI, and prepares the outer tunnel headers.",
    outer: true,
  },
  {
    id: "vxlan",
    title: "VXLAN in Transit",
    detail: "The underlay routes only on the outer VTEP IPs while the tenant frame remains preserved inside the tunnel.",
    outer: true,
  },
  {
    id: "decap",
    title: "Egress VTEP",
    detail: "The remote leaf validates the VNI, strips the outer headers, and restores the original tenant frame.",
    outer: false,
  },
  {
    id: "deliver",
    title: "Delivered",
    detail: "The destination host receives the same inner frame that was sent, with the overlay hidden from the application.",
    outer: false,
  },
] as const

const innerHeaders = [
  { label: "Dst MAC", color: "#76e5b5" },
  { label: "Src MAC", color: "#76e5b5" },
  { label: "Inner IP", color: "#60a5fa" },
  { label: "RoCEv2", color: "#fbbf24" },
  { label: "Payload", color: "#a78bfa" },
]

const outerHeaders = [
  { label: "Outer Eth", color: "#f87171" },
  { label: "Outer IP", color: "#f97316" },
  { label: "UDP 4789", color: "#fbbf24" },
  { label: "VNI 100", color: "#60a5fa" },
]

export default function VXLANEncapViz() {
  const [active, setActive] = useState(0)
  const step = steps[active]

  const stats = useMemo(
    () => [
      { label: "Inner payload", value: "4096B", color: "#76e5b5" },
      { label: "Tunnel overhead", value: "50B", color: "#f87171" },
      { label: "Encap mode", value: "Spectrum-4 ASIC", color: "#60a5fa" },
    ],
    [],
  )

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
        INTERACTIVE OVERLAY VIEW
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#60a5fa", marginBottom: 18 }}>
        VXLAN Encapsulation Timeline
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {steps.map((item, index) => (
          <button
            key={item.id}
            onClick={() => setActive(index)}
            style={{
              borderRadius: 999,
              border: `1px solid ${index === active ? "#60a5fa" : "#2a2d3e"}`,
              background: index === active ? "#172033" : "#111522",
              color: index === active ? "#60a5fa" : "#9fb0d1",
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {index + 1}. {item.title}
          </button>
        ))}
      </div>

      <div
        style={{
          background: "#111522",
          border: "1px solid #2a2d3e",
          borderRadius: 10,
          padding: 16,
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24", marginBottom: 6 }}>
          {step.title}
        </div>
        <div style={{ fontSize: 13, color: "#a9b4cf", lineHeight: 1.7 }}>{step.detail}</div>
      </div>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr" }}>
        {step.outer && (
          <div
            style={{
              background: "#111522",
              border: "1px solid #f8717133",
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 11, color: "#f87171", letterSpacing: "0.08em", marginBottom: 8 }}>
              OUTER UNDERLAY HEADERS
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {outerHeaders.map((field) => (
                <div
                  key={field.label}
                  style={{
                    borderRadius: 8,
                    border: `1px solid ${field.color}`,
                    padding: "8px 10px",
                    minWidth: 110,
                  }}
                >
                  <div style={{ color: field.color, fontSize: 11, fontWeight: 700 }}>{field.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            background: "#111522",
            border: "1px solid #2a2d3e",
            borderRadius: 10,
            padding: 14,
          }}
        >
          <div style={{ fontSize: 11, color: "#76e5b5", letterSpacing: "0.08em", marginBottom: 8 }}>
            INNER TENANT FRAME
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {innerHeaders.map((field) => (
              <div
                key={field.label}
                style={{
                  borderRadius: 8,
                  border: `1px solid ${field.color}`,
                  padding: "8px 10px",
                  minWidth: field.label === "Payload" ? 130 : 110,
                }}
              >
                <div style={{ color: field.color, fontSize: 11, fontWeight: 700 }}>{field.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#111522",
              border: "1px solid #2a2d3e",
              borderRadius: 10,
              padding: "10px 12px",
              minWidth: 140,
            }}
          >
            <div style={{ fontSize: 10, color: "#7c8db5" }}>{stat.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
