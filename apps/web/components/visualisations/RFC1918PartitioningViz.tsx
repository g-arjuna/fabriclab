"use client";

import { useState } from "react";

// RFC1918PartitioningViz -- Visual /8 address space partition map
// Shows the full 10.0.0.0/8 with each /16 block labelled
// Click each block to expand into its /24 allocations

type Block = {
  id: string;
  range: string;
  label: string;
  color: string;
  desc: string;
  subnets: { range: string; label: string; used: string }[];
};

const BLOCKS: Block[] = [
  {
    id: "oob",
    range: "10.0.0.0/16",
    label: "OOB Management",
    color: "#f87171",
    desc: "BMC ports, switch management interfaces, UFM server, monitoring. Physically separate OOB switch. NEVER routable from compute fabric.",
    subnets: [
      { range: "10.0.1.0/24", label: "DGX BMC -- Pod 1", used: "8/254 (8 DGX nodes)" },
      { range: "10.0.2.0/24", label: "Switch mgmt0 -- Pod 1", used: "8/254 (4 leaf + 2 spine + 1 stor + 1 oob)" },
      { range: "10.0.3.0/24", label: "Monitoring servers (UFM, Prom, Grafana)", used: "5/254" },
      { range: "10.0.10.0/24", label: "DGX BMC -- Pod 2", used: "0/254 (reserved)" },
      { range: "10.0.11.0/24", label: "Switch mgmt0 -- Pod 2", used: "0/254 (reserved)" },
      { range: "10.0.100.0/24", label: "Jump server / bastion", used: "1/254" },
      { range: "10.0.128.0/17", label: "RESERVED -- future OOB expansion", used: "0/32767" },
    ],
  },
  {
    id: "compute",
    range: "10.10.0.0/16",
    label: "Compute Fabric",
    color: "#6366f1",
    desc: "Switch loopbacks, server /32 host routes, in-band management. All routes present in BGP fabric. Summarisable per pod as /24.",
    subnets: [
      { range: "10.10.0.0/24", label: "Switch loopbacks -- Pod 1 (leaf/spine/super-spine)", used: "10/254" },
      { range: "10.10.1.0/24", label: "DGX compute /32s -- Pod 1, Rail 0+1", used: "64/254 (8 DGX x 8 ports)" },
      { range: "10.10.2.0/24", label: "DGX compute /32s -- Pod 1, Rail 2+3 (overflow)", used: "0/254 (reserved)" },
      { range: "10.10.4.0/24", label: "DGX in-band management (CX7 bond)", used: "8/254" },
      { range: "10.10.5.0/24", label: "P2P links (ONLY if using numbered links)", used: "0/254 (unused in unnumbered)" },
      { range: "10.10.10.0/24", label: "Switch loopbacks -- Pod 2", used: "0/254 (reserved)" },
      { range: "10.10.11.0/24", label: "DGX compute /32s -- Pod 2", used: "0/254 (reserved)" },
      { range: "10.10.100.0/24", label: "Super-spine loopbacks", used: "4/254" },
      { range: "10.10.128.0/17", label: "RESERVED -- future pods", used: "0/32767" },
    ],
  },
  {
    id: "storage",
    range: "10.20.0.0/16",
    label: "Storage Fabric",
    color: "#0ea5e9",
    desc: "DGX CX7 Slot1/Slot2 NIC addresses, storage appliance NVMe-oF target portals. On physically separate storage switches.",
    subnets: [
      { range: "10.20.1.0/24", label: "DGX storage NICs -- Pod 1 (4 ports x 8 DGX = 32)", used: "32/254" },
      { range: "10.20.2.0/24", label: "Storage appliance portals -- Pod 1", used: "8/254" },
      { range: "10.20.10.0/24", label: "DGX storage NICs -- Pod 2", used: "0/254 (reserved)" },
      { range: "10.20.11.0/24", label: "Storage appliance portals -- Pod 2", used: "0/254 (reserved)" },
      { range: "10.20.128.0/17", label: "RESERVED -- future storage expansion", used: "0/32767" },
    ],
  },
  {
    id: "tenants",
    range: "10.30.0.0/16",
    label: "EVPN Tenant VRFs",
    color: "#a78bfa",
    desc: "One /24 per tenant in EVPN-VXLAN multi-tenancy. Tenant subnets must NOT overlap. Routed within the tenant VRF only.",
    subnets: [
      { range: "10.30.1.0/24", label: "Tenant 1 -- Production training (VNI 10101)", used: "32/254" },
      { range: "10.30.2.0/24", label: "Tenant 2 -- Dev/test (VNI 10201)", used: "16/254" },
      { range: "10.30.3.0/24", label: "Tenant 3 -- Inference serving (VNI 10301)", used: "8/254" },
      { range: "10.30.0.0/24", label: "RESERVED -- shared infra VRF if needed", used: "0/254" },
      { range: "10.30.128.0/17", label: "RESERVED -- future tenants", used: "0/32767" },
    ],
  },
  {
    id: "reserved1",
    range: "10.100.0.0/16",
    label: "Future SuperPOD Expansion",
    color: "#334155",
    desc: "Reserved block for additional pods when scaling to a SuperPOD of 10+ BasePODs. Do not allocate this now.",
    subnets: [
      { range: "10.100.0.0/16", label: "RESERVED -- do not allocate", used: "0/65534" },
    ],
  },
  {
    id: "reserved2",
    range: "10.200.0.0/16",
    label: "Corporate Interconnect",
    color: "#475569",
    desc: "Address range used for BGP peering with the corporate network or data centre fabric. Kept separate to make route filtering at the border clean.",
    subnets: [
      { range: "10.200.1.0/24", label: "BGP peering links to corporate border", used: "0/254 (planned)" },
      { range: "10.200.2.0/24", label: "Jump server / bastion external access", used: "1/254" },
    ],
  },
];

export function RFC1918PartitioningViz() {
  const [selected, setSelected] = useState<string | null>("compute");
  const sel = BLOCKS.find((b) => b.id === selected);

  // Visual /8 space - each /16 is 1/256 of the space
  // We show 10.0 through 10.255 as a grid
  const usedRanges: Record<string, string> = {
    "0": "oob", "10": "compute", "20": "storage", "30": "tenants", "100": "reserved1", "200": "reserved2",
  };
  const colorMap: Record<string, string> = {
    oob: "#f87171", compute: "#6366f1", storage: "#0ea5e9", tenants: "#a78bfa",
    reserved1: "#334155", reserved2: "#475569",
  };

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 820 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          RFC 1918 Partitioning
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          10.0.0.0/8 -- Full Allocation Plan
        </div>
      </div>

      {/* Visual /8 heat map */}
      <div style={{ background: "#1e293b", borderRadius: 10, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "#64748b", marginBottom: 8 }}>
          10.0.0.0/8 address space -- each cell = one /16 block (third octet shown)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(16, 1fr)", gap: 2 }}>
          {Array.from({ length: 256 }, (_, i) => {
            const thirdOctet = String(i);
            const blockId = usedRanges[thirdOctet];
            const color = blockId ? colorMap[blockId] : "#1e293b";
            const isSelected = blockId && blockId === selected;
            return (
              <div
                key={i}
                onClick={() => blockId && setSelected(blockId === selected ? null : blockId)}
                title={`10.${i}.0.0/16`}
                style={{
                  height: 14,
                  borderRadius: 2,
                  background: color,
                  opacity: blockId ? (isSelected ? 1 : 0.5) : 0.15,
                  cursor: blockId ? "pointer" : "default",
                  transition: "opacity 0.1s",
                  border: isSelected ? `1px solid ${color}` : "1px solid transparent",
                }}
              />
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
          {BLOCKS.map((b) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: b.color }} />
              <div style={{ fontSize: 9, color: "#64748b" }}>{b.range}</div>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: "#1e293b", border: "1px solid #334155" }} />
            <div style={{ fontSize: 9, color: "#334155" }}>unallocated</div>
          </div>
        </div>
      </div>

      {/* Block selector */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {BLOCKS.map((b) => (
          <button key={b.id} onClick={() => setSelected(selected === b.id ? null : b.id)}
            style={{
              padding: "5px 10px", borderRadius: 5,
              border: `1px solid ${selected === b.id ? b.color : "#334155"}`,
              background: selected === b.id ? b.color + "22" : "transparent",
              color: selected === b.id ? b.color : "#64748b",
              cursor: "pointer", fontSize: 11, fontFamily: "monospace",
            }}
          >
            {b.range}
          </button>
        ))}
      </div>

      {/* Selected block detail */}
      {sel && (
        <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, borderLeft: `4px solid ${sel.color}` }}>
          <div style={{ fontSize: 14, color: sel.color, fontWeight: 700, marginBottom: 4 }}>{sel.range} -- {sel.label}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, marginBottom: 14 }}>{sel.desc}</div>

          {/* Subnet table */}
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Subnet Allocations</div>
          {sel.subnets.map((s, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "160px 1fr 120px",
              gap: 10, padding: "6px 8px", borderRadius: 4,
              background: i % 2 === 0 ? "#0f172a" : "transparent",
              marginBottom: 2,
            }}>
              <div style={{ fontSize: 11, color: sel.color, fontFamily: "monospace" }}>{s.range}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.label}</div>
              <div style={{ fontSize: 10, color: "#475569", textAlign: "right" }}>{s.used}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RFC1918PartitioningViz;
