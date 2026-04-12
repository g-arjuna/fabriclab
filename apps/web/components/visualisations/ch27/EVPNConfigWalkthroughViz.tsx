'use client'

import { useMemo, useState } from "react"

const steps = [
  {
    title: "Phase 1 - Underlay BGP",
    command: "nv set router bgp autonomous-system 65001\nnv set router bgp router-id 10.0.0.1",
    effect: "Leaf loopback becomes reachable fabric-wide.",
  },
  {
    title: "Phase 1 - Spine Neighbors",
    command:
      "nv set vrf default router bgp neighbor swp1 remote-as 65100\nnv set vrf default router bgp neighbor swp2 remote-as 65100",
    effect: "The VTEP underlay can now exchange reachability with both spines.",
  },
  {
    title: "Phase 2 - VXLAN Interfaces",
    command:
      "nv set interface vxlan100 vxlan id 100\nnv set interface vxlan200 vxlan id 200",
    effect: "Each tenant segment now has an L2 VNI endpoint on the leaf.",
  },
  {
    title: "Phase 2 - Bridge Mapping",
    command:
      "nv set bridge domain br_default vlan 10 vni 100\nnv set bridge domain br_default vlan 20 vni 200",
    effect: "Host-facing VLANs are tied to their correct overlay segments.",
  },
  {
    title: "Phase 3 - VRF and L3 VNI",
    command: "nv set vrf TENANT1 vni 1000\nnv set vrf TENANT2 vni 2000",
    effect: "Symmetric IRB has a routed VNI for each tenant VRF.",
  },
  {
    title: "Phase 4 - EVPN Address Family",
    command:
      "nv set evpn enable on\nnv set vrf default router bgp address-family l2vpn-evpn enable on",
    effect: "The fabric begins exchanging EVPN control-plane routes.",
  },
  {
    title: "Phase 4 - Tenant 1 RTs",
    command:
      "nv set vrf TENANT1 router bgp rd 65001:100\nnv set vrf TENANT1 router bgp route-import from-evpn route-target 65000:100",
    effect: "Tenant 1 imports and exports only its own route-target.",
  },
  {
    title: "Phase 4 - Tenant 2 RTs",
    command:
      "nv set vrf TENANT2 router bgp rd 65001:200\nnv set vrf TENANT2 router bgp route-import from-evpn route-target 65000:200",
    effect: "Tenant 2 remains isolated because its route-target differs from Tenant 1.",
  },
] as const

export default function EVPNConfigWalkthroughViz() {
  const [applied, setApplied] = useState(0)

  const state = useMemo(() => {
    const values = [
      { label: "Underlay BGP", value: applied >= 2 ? "Established" : "Pending", color: "#60a5fa" },
      { label: "VXLAN", value: applied >= 4 ? "Mapped" : "Pending", color: "#76e5b5" },
      { label: "Symmetric IRB", value: applied >= 5 ? "Enabled" : "Pending", color: "#fbbf24" },
      { label: "EVPN", value: applied >= 6 ? "Active" : "Pending", color: "#a78bfa" },
      { label: "Tenant Isolation", value: applied >= 8 ? "Scoped by RT" : "Pending", color: "#f87171" },
    ]
    return values
  }, [applied])

  const current = steps[Math.min(applied, steps.length - 1)]

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
        STEP-BY-STEP CONFIG BUILDER
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#60a5fa", marginBottom: 18 }}>
        EVPN Deployment Walkthrough
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {steps.map((step, index) => (
          <button
            key={step.title}
            onClick={() => setApplied(index)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              border: `1px solid ${index <= applied ? "#76e5b5" : "#2a2d3e"}`,
              background: index <= applied ? "#172617" : "#111522",
              color: index <= applied ? "#76e5b5" : "#7c8db5",
              cursor: "pointer",
            }}
          >
            {index + 1}
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
          {current.title}
        </div>
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            fontSize: 12,
            lineHeight: 1.7,
            color: "#76e5b5",
            background: "#0c1018",
            border: "1px solid #2a2d3e",
            borderRadius: 8,
            padding: 12,
          }}
        >
          {current.command}
        </pre>
        <div style={{ fontSize: 13, color: "#a9b4cf", marginTop: 10, lineHeight: 1.7 }}>{current.effect}</div>
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
        {state.map((item) => (
          <div
            key={item.label}
            style={{
              background: "#111522",
              border: "1px solid #2a2d3e",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            <div style={{ fontSize: 10, color: "#7c8db5" }}>{item.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button
          onClick={() => setApplied((value) => Math.max(0, value - 1))}
          style={{
            borderRadius: 999,
            border: "1px solid #2a2d3e",
            background: "#111522",
            color: "#c8d1e8",
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >
          Back
        </button>
        <button
          onClick={() => setApplied((value) => Math.min(steps.length - 1, value + 1))}
          style={{
            borderRadius: 999,
            border: "1px solid #76e5b5",
            background: "#172617",
            color: "#76e5b5",
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >
          Apply next step
        </button>
      </div>
    </div>
  )
}
