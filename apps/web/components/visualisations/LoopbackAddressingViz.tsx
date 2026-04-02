"use client";

import { useState } from "react";

// LoopbackAddressingViz -- Switch loopback address planning
// Shows pod-indexed scheme, /32 rationale, VTEP option A vs B

type Mode = "scheme" | "vtep" | "config";

const SWITCH_TYPES = [
  { type: "leaf", label: "Leaf switches", color: "#6366f1", range: ".1-.15", example: "leaf-01: 10.10.0.1/32\nleaf-02: 10.10.0.2/32\nleaf-03: 10.10.0.3/32\nleaf-04: 10.10.0.4/32\n[.5-.15 reserved]" },
  { type: "spine", label: "Spine switches", color: "#0ea5e9", range: ".16-.31", example: "spine-01: 10.10.0.16/32\nspine-02: 10.10.0.17/32\n[.18-.31 reserved]" },
  { type: "mgmt", label: "UFM / monitoring", color: "#22c55e", range: ".32-.47", example: "ufm-01: 10.10.0.32/32\nprometheus: 10.10.0.33/32\n[.34-.47 reserved]" },
  { type: "superspine", label: "Super-spines (SuperPOD)", color: "#a78bfa", range: ".48-.63", example: "super-spine-01: 10.10.0.48/32\nsuper-spine-02: 10.10.0.49/32\n[.50-.63 reserved]" },
  { type: "vtep", label: "Anycast VTEP (optional)", color: "#f59e0b", range: ".64-.79", example: "leaf-01/02 anycast VTEP: 10.10.0.64/32\nleaf-03/04 anycast VTEP: 10.10.0.65/32\n[.66-.79 reserved]" },
];

const VTEP_OPTIONS = [
  {
    id: "a", label: "Option A: Loopback = VTEP",
    color: "#22c55e",
    pros: ["Zero extra config -- loopback auto-used as VTEP IP", "Simpler BGP EVPN config", "Fewer addresses to track"],
    cons: ["No anycast VTEP possible", "Dual-homed servers must use VRRP or similar for gateway redundancy"],
    config: `# Cumulus Linux NVUE: Option A
nv set interface lo ip address 10.10.0.1/32
nv set nve vxlan source-ip 10.10.0.1
nv config apply`,
    when: "Single-homed servers. Simpler deployments. No MLAG needed.",
  },
  {
    id: "b", label: "Option B: Dedicated VTEP loopback (anycast)",
    color: "#6366f1",
    pros: ["Anycast VTEP: leaf-01 and leaf-02 share one VTEP IP", "Dual-homed servers need no reconvergence on leaf failure", "Traffic continues via surviving leaf without MAC/ARP update"],
    cons: ["Extra loopback interface per leaf pair", "MLAG or EVPN multi-homing required on the leaf pair", "More complex VTEP IP planning"],
    config: `# Cumulus Linux NVUE: Option B (anycast VTEP)
# leaf-01 AND leaf-02 both configure the SAME VTEP IP
nv set interface lo ip address 10.10.0.1/32      # unique loopback
nv set interface vtep0 ip address 10.10.0.64/32  # shared anycast VTEP
nv set nve vxlan source-ip 10.10.0.64
# Both leaves advertise 10.10.0.64/32 into BGP
# Remote leaves ECMP to either leaf for VXLAN traffic
nv config apply`,
    when: "Dual-homed servers via MLAG or EVPN multi-homing. Production multi-tenant deployments.",
  },
];

export function LoopbackAddressingViz() {
  const [mode, setMode] = useState<Mode>("scheme");
  const [selected, setSelected] = useState<string | null>("leaf");
  const [vtepOption, setVtepOption] = useState<string>("a");

  const sel = SWITCH_TYPES.find((s) => s.type === selected);
  const vtep = VTEP_OPTIONS.find((v) => v.id === vtepOption);

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 820 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Loopback Addressing
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          Pod-Indexed /32 Assignment Scheme
        </div>
      </div>

      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(["scheme", "vtep", "config"] as Mode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: "6px 14px", borderRadius: 6,
            border: `1px solid ${mode === m ? "#6366f1" : "#334155"}`,
            background: mode === m ? "#6366f122" : "transparent",
            color: mode === m ? "#818cf8" : "#64748b",
            cursor: "pointer", fontSize: 11, fontFamily: "monospace", fontWeight: mode === m ? 700 : 400,
          }}>
            {m === "scheme" ? "Address scheme" : m === "vtep" ? "VTEP options" : "Config examples"}
          </button>
        ))}
      </div>

      {mode === "scheme" && (
        <>
          {/* /24 block visual */}
          <div style={{ background: "#1e293b", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 10 }}>
              10.10.0.0/24 -- BasePOD 1 switch loopbacks (256 addresses, click a segment)
            </div>
            <div style={{ overflowX: "auto", paddingBottom: 4 }}>
              <div style={{ display: "flex", height: 32, borderRadius: 5, overflow: "hidden", gap: 2, minWidth: 560 }}>
                {SWITCH_TYPES.map((st, i) => (
                  <div
                    key={st.type}
                    onClick={() => setSelected(st.type)}
                    style={{
                      flex: i === 4 ? 1 : 2,
                      background: selected === st.type ? st.color : st.color + "55",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", transition: "background 0.15s",
                      fontSize: 9, color: "#e2e8f0", fontWeight: 700,
                    }}
                    title={st.label}
                  >
                    {st.range}
                  </div>
                ))}
                <div style={{ flex: 5, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#334155" }}>
                  .80 - .255 RESERVED
                </div>
              </div>
            </div>
          </div>

          {/* Switch type buttons */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {SWITCH_TYPES.map((st) => (
              <button key={st.type} onClick={() => setSelected(st.type)} style={{
                padding: "5px 10px", borderRadius: 5,
                border: `1px solid ${selected === st.type ? st.color : "#334155"}`,
                background: selected === st.type ? st.color + "22" : "transparent",
                color: selected === st.type ? st.color : "#64748b",
                cursor: "pointer", fontSize: 11, fontFamily: "monospace",
              }}>
                {st.label} ({st.range})
              </button>
            ))}
          </div>

          {sel && (
            <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 16px", borderLeft: `3px solid ${sel.color}` }}>
              <div style={{ fontSize: 12, color: sel.color, fontWeight: 700, marginBottom: 8 }}>{sel.label} -- {sel.range}</div>
              <pre style={{ margin: 0, fontSize: 12, color: "#4ade80", lineHeight: 1.7, overflowX: "auto" }}>{sel.example}</pre>
            </div>
          )}

          {/* /32 rationale */}
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, marginBottom: 5 }}>Why /32 not /24 for loopbacks?</div>
              <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.65 }}>
                A /24 loopback would attract traffic for the entire subnet to that switch.
                A /32 is exactly one address -- the switch's identity. No broadcast domain.
                Each switch advertises only its own /32 into BGP. The fabric table has one
                entry per switch, not one subnet per tier.
              </div>
            </div>
            <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, marginBottom: 5 }}>Pod-indexing convention</div>
              <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.65 }}>
                Pod N uses 10.10.(N*10).0/24. Pod 1 = 10.10.0.0/24. Pod 2 = 10.10.10.0/24.
                This leaves room within each /24 for device-type sub-allocation (leaf .1-.15,
                spine .16-.31) AND makes the pod the summarisable unit at the SuperPOD layer.
              </div>
            </div>
          </div>
        </>
      )}

      {mode === "vtep" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {VTEP_OPTIONS.map((v) => (
              <button key={v.id} onClick={() => setVtepOption(v.id)} style={{
                padding: "6px 14px", borderRadius: 6,
                border: `1px solid ${vtepOption === v.id ? v.color : "#334155"}`,
                background: vtepOption === v.id ? v.color + "22" : "transparent",
                color: vtepOption === v.id ? v.color : "#64748b",
                cursor: "pointer", fontSize: 11, fontFamily: "monospace", fontWeight: vtepOption === v.id ? 700 : 400,
              }}>
                {v.label}
              </button>
            ))}
          </div>

          {vtep && (
            <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, borderLeft: `3px solid ${vtep.color}` }}>
              <div style={{ fontSize: 13, color: vtep.color, fontWeight: 700, marginBottom: 12 }}>{vtep.label}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, marginBottom: 5, textTransform: "uppercase" }}>Advantages</div>
                  {vtep.pros.map((p, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                      <div style={{ color: "#22c55e", fontSize: 10, flexShrink: 0 }}>+</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{p}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#f87171", fontWeight: 700, marginBottom: 5, textTransform: "uppercase" }}>Trade-offs</div>
                  {vtep.cons.map((c, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                      <div style={{ color: "#f87171", fontSize: 10, flexShrink: 0 }}>-</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{c}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: "#0f172a", borderRadius: 5, padding: "8px 10px", marginBottom: 10 }}>
                <pre style={{ margin: 0, fontSize: 11, color: "#22c55e", lineHeight: 1.6, overflowX: "auto" }}>{vtep.config}</pre>
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                <span style={{ color: "#475569" }}>Use when: </span>{vtep.when}
              </div>
            </div>
          )}
        </>
      )}

      {mode === "config" && (
        <div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Cumulus Linux NVUE -- full loopback config for leaf-01 (BasePOD 1)</div>
            <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 14px" }}>
              <pre style={{ margin: 0, fontSize: 11, color: "#22c55e", lineHeight: 1.75, overflowX: "auto" }}>{`# Set the loopback /32
nv set interface lo ip address 10.10.0.1/32

# Configure BGP with loopback as router-ID
nv set router bgp autonomous-system 4200000001
nv set router bgp router-id 10.10.0.1

# Advertise connected loopback into BGP
nv set vrf default router bgp address-family ipv4-unicast redistribute connected enable on

# VTEP source (Option A: same as loopback)
nv set nve vxlan source-ip 10.10.0.1

# Apply
nv config apply

# Verify
nv show interface lo
# Expected: inet 10.10.0.1/32

nv show router bgp
# Expected: router-id 10.10.0.1

nv show nve vxlan
# Expected: source-ip 10.10.0.1`}</pre>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Verifying remote loopbacks are reachable via BGP</div>
            <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 14px" }}>
              <pre style={{ margin: 0, fontSize: 11, color: "#22c55e", lineHeight: 1.75, overflowX: "auto" }}>{`# From leaf-01: ping spine-01 loopback
ping -c 3 10.10.0.16

# Check BGP table for loopback routes
nv show vrf default router bgp address-family ipv4-unicast route 10.10.0.16/32
# Expected: next-hop fe80::... via swp33 and swp34 (two ECMP paths via both spines)

# Confirm ECMP paths (should see 2 paths, one per spine)
ip route show 10.10.0.16/32
# Expected: nexthop via fe80::... dev swp33 weight 1
#           nexthop via fe80::... dev swp34 weight 1`}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoopbackAddressingViz;
