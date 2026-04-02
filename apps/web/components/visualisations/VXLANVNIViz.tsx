"use client";

import { useState } from "react";

// VXLANVNIViz -- VXLAN VNI allocation and VLAN mapping
// Interactive: input pod/tenant/segment to generate VNI and VLAN
// Shows EVPN config, exhaustion maths, and tenant table

export function VXLANVNIViz() {
  const [pod, setPod] = useState(1);
  const [tenant, setTenant] = useState(1);
  const [segment, setSegment] = useState(1);
  const [tenantCount, setTenantCount] = useState(3);

  const vni_l2 = pod * 10000 + tenant * 100 + segment;
  const vni_l3 = pod * 10000 + tenant * 100 + (segment + 1);
  const vlan_id = tenant * 100 + segment;

  // Pre-built tenant table for illustration
  const EXAMPLE_TENANTS = Array.from({ length: tenantCount }, (_, i) => ({
    name: `Tenant ${i + 1}`,
    vlan_l2: (i + 1) * 100 + 1,
    vni_l2: pod * 10000 + (i + 1) * 100 + 1,
    vni_l3: pod * 10000 + (i + 1) * 100 + 2,
    subnet: `10.30.${i + 1}.0/24`,
    nodes: [8, 16, 32, 64][i % 4],
  }));

  const vlanUsed = tenantCount * 2 + 20; // tenant VLANs + infra
  const vlanPct = Math.round((vlanUsed / 4094) * 100);

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 820 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          VXLAN VNI Allocation
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          VNI Formula + EVPN Multi-Tenancy Planning
        </div>
      </div>

      {/* Formula display */}
      <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10, textTransform: "uppercase" }}>VNI Naming Formula</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {[
            { label: "Pod", value: pod, color: "#6366f1", min: 1, max: 9, setter: setPod },
            { label: "x 10000  +  Tenant", value: tenant, color: "#0ea5e9", min: 1, max: 99, setter: setTenant },
            { label: "x 100  +  Segment", value: segment, color: "#22c55e", min: 1, max: 9, setter: setSegment },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i > 0 && <span style={{ color: "#475569" }}>{f.label.split("  ")[0]}</span>}
              <div>
                <div style={{ fontSize: 9, color: f.color, textAlign: "center", marginBottom: 2 }}>
                  {i === 0 ? "Pod" : i === 1 ? "Tenant" : "Segment"}
                </div>
                <input
                  type="number"
                  value={f.value}
                  min={f.min}
                  max={f.max}
                  onChange={(e) => f.setter(Math.max(f.min, Math.min(f.max, Number(e.target.value))))}
                  style={{
                    width: 50, padding: "4px 6px", borderRadius: 5, textAlign: "center",
                    background: f.color + "22", border: `1px solid ${f.color}`,
                    color: f.color, fontFamily: "monospace", fontSize: 14, fontWeight: 700,
                  }}
                />
              </div>
              {i < 2 && <span style={{ color: "#475569", fontSize: 12 }}>+</span>}
            </div>
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: 10 }}>
            <div style={{ background: "#312e81", border: "2px solid #6366f1", borderRadius: 6, padding: "4px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#818cf8" }}>L2 VNI (MAC-VRF)</div>
              <div style={{ fontSize: 16, color: "#a5b4fc", fontWeight: 700 }}>{vni_l2}</div>
            </div>
            <div style={{ background: "#0c4a6e", border: "2px solid #0ea5e9", borderRadius: 6, padding: "4px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#38bdf8" }}>L3 VNI (IP-VRF)</div>
              <div style={{ fontSize: 16, color: "#7dd3fc", fontWeight: 700 }}>{vni_l3}</div>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#64748b" }}>
          VLAN ID (local to switch): <span style={{ color: "#f59e0b" }}>{vlan_id}</span>
          {"  "}
          Subnet: <span style={{ color: "#22c55e" }}>10.30.{tenant}.0/24</span>
        </div>
      </div>

      {/* Tenant table */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>
            Tenant Allocation Table (Pod {pod})
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "#64748b" }}>Tenants:</span>
            <input
              type="range" min={1} max={20} value={tenantCount}
              onChange={(e) => setTenantCount(Number(e.target.value))}
              style={{ width: 80 }}
            />
            <span style={{ fontSize: 11, color: "#f59e0b" }}>{tenantCount}</span>
          </div>
        </div>

        <div style={{ background: "#1e293b", borderRadius: 8, overflowX: "auto" }}>
          <div style={{ minWidth: 560 }}>
            <div style={{
              display: "grid", gridTemplateColumns: "120px 70px 80px 80px 130px 60px",
              gap: 0, padding: "6px 12px", background: "#334155",
            }}>
              {["Tenant", "VLAN", "L2 VNI", "L3 VNI", "Subnet", "GPUs"].map((h) => (
                <div key={h} style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>{h}</div>
              ))}
            </div>
            {EXAMPLE_TENANTS.map((t, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "120px 70px 80px 80px 130px 60px",
                padding: "7px 12px", background: i % 2 === 0 ? "#0f172a" : "transparent",
              }}>
                <div style={{ fontSize: 11, color: "#e2e8f0" }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "#f59e0b" }}>{t.vlan_l2}</div>
                <div style={{ fontSize: 11, color: "#6366f1" }}>{t.vni_l2}</div>
                <div style={{ fontSize: 11, color: "#0ea5e9" }}>{t.vni_l3}</div>
                <div style={{ fontSize: 11, color: "#22c55e" }}>{t.subnet}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{t.nodes}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* VLAN exhaustion warning */}
      <div style={{ background: "#1e293b", borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 11, color: "#64748b" }}>VLAN ID exhaustion ({tenantCount} tenants x 2 VLANs + 20 infra)</div>
          <div style={{ fontSize: 11, color: vlanPct > 80 ? "#ef4444" : vlanPct > 50 ? "#f59e0b" : "#22c55e" }}>
            {vlanUsed}/4094 ({vlanPct}%)
          </div>
        </div>
        <div style={{ height: 8, background: "#334155", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 4,
            background: vlanPct > 80 ? "#ef4444" : vlanPct > 50 ? "#f59e0b" : "#22c55e",
            width: `${vlanPct}%`, transition: "width 0.3s",
          }} />
        </div>
        {vlanPct > 60 && (
          <div style={{ fontSize: 10, color: "#f87171", marginTop: 6 }}>
            Warning: with {tenantCount} tenants + infrastructure VLANs you are at {vlanPct}% of the 4094 VLAN limit.
            Plan ahead -- once you exhaust VLANs, renumbering is a major migration.
          </div>
        )}
      </div>

      {/* EVPN config snippet */}
      <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
        <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>
          EVPN VXLAN Config on Cumulus (for VNI {vni_l2})
        </div>
        <pre style={{ margin: 0, fontSize: 11, color: "#22c55e", lineHeight: 1.7, overflowX: "auto" }}>{`# Map VLAN to VNI
nv set bridge domain br_default vlan ${vlan_id} vni ${vni_l2}

# Create tenant VRF with L3 VNI
nv set vrf TENANT${tenant} evpn vni ${vni_l3}

# Advertise tenant prefix in BGP
nv set vrf TENANT${tenant} router bgp address-family ipv4-unicast redistribute connected enable on

# Enable EVPN globally
nv set evpn enable on
nv set router bgp address-family l2vpn-evpn enable on

nv config apply

# Verify
nv show evpn vni ${vni_l2}
# Expected: VNI ${vni_l2}, type L2, VLAN ${vlan_id}, VTEP 10.10.0.1`}</pre>
      </div>
    </div>
  );
}

export default VXLANVNIViz;
