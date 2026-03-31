"use client";

import { useState } from "react";

// AddressFamiliesViz -- Every address family in an AI fabric visualised
// Click each family to see: why it exists, what device owns it, which range, what breaks if wrong

const FAMILIES = [
  {
    id: "loopback",
    label: "Switch Loopbacks",
    icon: "LB",
    color: "#6366f1",
    range: "10.10.0.0/24 per pod",
    prefix: "/32",
    owner: "Every switch",
    count: "~50 per BasePOD",
    purpose: "Router identity, BGP router-ID, VTEP IP, UFM polling target, Prometheus scrape target",
    breaks: "If duplicated: BGP table corruption, traffic to wrong switch, SNMP returning wrong counters",
    example: "leaf-01: 10.10.0.1/32  spine-01: 10.10.0.16/32",
  },
  {
    id: "server32",
    label: "Server /32 Host Routes",
    icon: "SRV",
    color: "#0ea5e9",
    range: "10.10.1.0/23 per pod",
    prefix: "/32",
    owner: "Each DGX NIC",
    count: "8 per DGX = 64-256 per pod",
    purpose: "GPU compute interface address. Advertised by directly connected leaf into BGP. Enables pure L3 fabric with no shared L2 domain",
    breaks: "If /24 subnet used instead: inter-switch routing fails, AllReduce cannot cross leaf boundaries",
    example: "DGX-01 eth0: 10.10.1.1/32  DGX-01 eth1: 10.10.1.2/32",
  },
  {
    id: "oob",
    label: "OOB BMC Addresses",
    icon: "BMC",
    color: "#f87171",
    range: "10.0.1.0/24 per pod",
    prefix: "/24 block, one /32 per device",
    owner: "AST2600 BMC on each DGX",
    count: "1 per DGX + 1 per switch",
    purpose: "Out-of-band power control, IPMI, Redfish, console access. Physically separate network. Works when host OS is down",
    breaks: "If same /16 as compute: host can reach BMC via compute fabric, physical separation becomes meaningless",
    example: "DGX-01 BMC: 10.0.1.1  switch mgmt0: 10.0.2.1",
  },
  {
    id: "inband",
    label: "In-Band Management",
    icon: "IB",
    color: "#f59e0b",
    range: "10.10.4.0/24 per pod",
    prefix: "/32 per DGX",
    owner: "DGX host CX7 Slot1/Slot2 bond",
    count: "1 per DGX",
    purpose: "SSH, Prometheus DCGM scrape, Ansible, monitoring. Uses the storage CX7 NICs so survives compute NIC failures. Routed via compute fabric BGP",
    breaks: "If same /24 as GPU compute: Prometheus scraping and NCCL training traffic compete in same subnet",
    example: "DGX-01 mgmt bond: 10.10.4.1/32",
  },
  {
    id: "storage",
    label: "Storage NIC Addresses",
    icon: "STO",
    color: "#22c55e",
    range: "10.20.1.0/24 per pod",
    prefix: "/32 per NIC port",
    owner: "DGX CX7 Slot1/Slot2 (4 ports per DGX)",
    count: "4 per DGX = 32-128 per pod",
    purpose: "NVMe-oF initiator source addresses for checkpoint writes and dataset reads. On physically separate storage fabric",
    breaks: "If same /16 as compute: storage switch ACLs cannot distinguish storage from compute traffic",
    example: "DGX-01 enp170s0f0: 10.20.1.1/32  enp170s0f1: 10.20.1.2/32",
  },
  {
    id: "vtep",
    label: "VTEP (VXLAN) Addresses",
    icon: "VT",
    color: "#a78bfa",
    range: "Same as loopback OR dedicated loopback2",
    prefix: "/32 per leaf (or /32 shared for anycast pair)",
    owner: "Leaf switches running EVPN",
    count: "1 per leaf (or 1 per anycast pair)",
    purpose: "Outer IP source/destination for VXLAN encapsulated frames. Must be routable via compute fabric BGP so remote VTEPs can reach each other",
    breaks: "If not advertised into BGP: VXLAN tunnels fail, tenant traffic black-holes between pods",
    example: "leaf-01 VTEP: 10.10.0.1/32 (same as loopback)  OR anycast pair: 10.10.0.65/32 (shared between leaf-01 and leaf-02)",
  },
  {
    id: "p2p",
    label: "P2P Link Addresses",
    icon: "P2P",
    color: "#64748b",
    range: "NOT needed for BGP unnumbered",
    prefix: "/31 if numbered",
    owner: "Inter-switch links",
    count: "0 in BGP unnumbered fabric",
    purpose: "Required only when: troubleshooting convenience via per-link ping, third-party switch compatibility, external BGP peering",
    breaks: "BGP unnumbered fabric has zero P2P addresses -- that is correct and intentional",
    example: "BGP unnumbered: no IPv4 on swp1  Numbered fallback: leaf-01 swp1 = 10.10.5.0/31",
  },
  {
    id: "tenant",
    label: "Tenant VRF Subnets",
    icon: "VRF",
    color: "#f59e0b",
    range: "10.30.0.0/16 total",
    prefix: "/24 per tenant",
    owner: "GPU servers within each tenant",
    count: "1 subnet per tenant",
    purpose: "In EVPN multi-tenancy, each tenant gets a dedicated L3 subnet within its IP-VRF. Servers in one tenant cannot route to servers in another tenant by default",
    breaks: "If tenant subnets overlap: EVPN RT import matches wrong VRF, cross-tenant traffic leakage",
    example: "Tenant1 GPU subnet: 10.30.1.0/24  Tenant2 GPU subnet: 10.30.2.0/24",
  },
];

export function AddressFamiliesViz() {
  const [selected, setSelected] = useState<string | null>("loopback");

  const sel = FAMILIES.find((f) => f.id === selected);

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 820 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Address Families
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          Everything That Needs an IP in an AI Fabric
        </div>
      </div>

      {/* Family grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
        {FAMILIES.map((f) => (
          <div
            key={f.id}
            onClick={() => setSelected(selected === f.id ? null : f.id)}
            style={{
              background: selected === f.id ? f.color + "22" : "#1e293b",
              border: `2px solid ${selected === f.id ? f.color : "#334155"}`,
              borderRadius: 8,
              padding: "10px 8px",
              cursor: "pointer",
              transition: "all 0.15s",
              textAlign: "center",
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 6, background: f.color + "33",
              border: `1px solid ${f.color}`, display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 6px", fontSize: 9, color: f.color, fontWeight: 700,
            }}>
              {f.icon}
            </div>
            <div style={{ fontSize: 10, color: selected === f.id ? f.color : "#94a3b8", fontWeight: selected === f.id ? 700 : 400, lineHeight: 1.3 }}>
              {f.label}
            </div>
            <div style={{ fontSize: 9, color: "#475569", marginTop: 3 }}>{f.prefix}</div>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {sel && (
        <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, borderLeft: `4px solid ${sel.color}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: sel.color + "33", border: `1px solid ${sel.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: sel.color, fontWeight: 700 }}>
              {sel.icon}
            </div>
            <div>
              <div style={{ fontSize: 14, color: sel.color, fontWeight: 700 }}>{sel.label}</div>
              <div style={{ fontSize: 11, color: "#475569" }}>{sel.count} &nbsp;|&nbsp; Prefix: {sel.prefix}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginBottom: 3, textTransform: "uppercase" }}>Range / Block</div>
              <div style={{ fontSize: 11, color: "#e2e8f0", fontFamily: "monospace" }}>{sel.range}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginBottom: 3, textTransform: "uppercase" }}>Owner</div>
              <div style={{ fontSize: 11, color: "#e2e8f0" }}>{sel.owner}</div>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginBottom: 3, textTransform: "uppercase" }}>Purpose</div>
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.65 }}>{sel.purpose}</div>
          </div>

          <div style={{ background: "#7f1d1d22", borderRadius: 6, padding: "8px 10px", marginBottom: 10, borderLeft: "2px solid #ef4444" }}>
            <div style={{ fontSize: 10, color: "#f87171", fontWeight: 700, marginBottom: 3 }}>WHAT BREAKS IF WRONG</div>
            <div style={{ fontSize: 11, color: "#fca5a5", lineHeight: 1.55 }}>{sel.breaks}</div>
          </div>

          <div style={{ background: "#0f172a", borderRadius: 5, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, marginBottom: 3 }}>EXAMPLE</div>
            <div style={{ fontSize: 11, color: "#4ade80", fontFamily: "monospace" }}>{sel.example}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddressFamiliesViz;
