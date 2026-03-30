"use client";

import { useState } from "react";

// OOBTopologyViz -- Physical OOB management network topology
// Shows SN2201 switch, DGX BMC ports, switch management ports, UFM server

type PortGroup = "bmc" | "switchmgmt" | "servers" | null;

export function OOBTopologyViz() {
  const [highlight, setHighlight] = useState<PortGroup>(null);
  const [showIPs, setShowIPs] = useState(true);

  const bmc_color = "#f59e0b";
  const sw_color = "#6366f1";
  const ufm_color = "#22c55e";
  const ws_color = "#94a3b8";

  const dgx_nodes = [
    { id: "dgx0", ip: "10.0.1.10", label: "DGX-0" },
    { id: "dgx1", ip: "10.0.1.11", label: "DGX-1" },
    { id: "dgx2", ip: "10.0.1.12", label: "DGX-2" },
    { id: "dgx3", ip: "10.0.1.13", label: "DGX-3" },
    { id: "dgx4", ip: "10.0.1.14", label: "DGX-4" },
    { id: "dgx5", ip: "10.0.1.15", label: "DGX-5" },
    { id: "dgx6", ip: "10.0.1.16", label: "DGX-6" },
    { id: "dgx7", ip: "10.0.1.17", label: "DGX-7" },
  ];

  const switches_mgmt = [
    { id: "leaf0", ip: "10.0.2.10", label: "Leaf-0" },
    { id: "leaf1", ip: "10.0.2.11", label: "Leaf-1" },
    { id: "spine0", ip: "10.0.2.20", label: "Spine-0" },
    { id: "spine1", ip: "10.0.2.21", label: "Spine-1" },
    { id: "storsw", ip: "10.0.2.30", label: "StorSW" },
  ];

  const isHighlighted = (group: PortGroup) => highlight === null || highlight === group;

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 820 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>OOB Topology</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>SN2201 Management Switch -- BasePOD</div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { id: "bmc" as PortGroup, label: "DGX BMC ports", color: bmc_color },
          { id: "switchmgmt" as PortGroup, label: "Switch mgmt0 ports", color: sw_color },
          { id: "servers" as PortGroup, label: "UFM / workstation", color: ufm_color },
        ].map((g) => (
          <button key={String(g.id)} onClick={() => setHighlight(highlight === g.id ? null : g.id)}
            style={{
              padding: "5px 12px", borderRadius: 5, border: `1px solid ${highlight === g.id ? g.color : "#334155"}`,
              background: highlight === g.id ? g.color + "22" : "transparent",
              color: highlight === g.id ? g.color : "#64748b",
              cursor: "pointer", fontSize: 11, fontFamily: "monospace",
            }}
          >
            {g.label}
          </button>
        ))}
        <button onClick={() => setShowIPs(!showIPs)}
          style={{
            padding: "5px 12px", borderRadius: 5, border: "1px solid #334155",
            background: "transparent", color: showIPs ? "#94a3b8" : "#64748b",
            cursor: "pointer", fontSize: 11, fontFamily: "monospace",
          }}
        >
          {showIPs ? "IPs: on" : "IPs: off"}
        </button>
      </div>

      {/* Topology SVG */}
      <div style={{ background: "#1e293b", borderRadius: 10, padding: 16 }}>
        <svg viewBox="0 0 720 400" style={{ width: "100%", height: "auto" }}>
          {/* SN2201 OOB switch -- center */}
          <rect x={270} y={150} width={180} height={100} rx={8}
            fill="#292524" stroke="#f59e0b" strokeWidth={2} />
          <text x={360} y={175} textAnchor="middle" fill="#fbbf24" fontSize={12} fontWeight="bold">SN2201</text>
          <text x={360} y={193} textAnchor="middle" fill="#92400e" fontSize={10}>OOB Management Switch</text>
          <text x={360} y={210} textAnchor="middle" fill="#78716c" fontSize={9}>48x 1GbE RJ45 + 4x 25GbE uplink</text>
          <text x={360} y={225} textAnchor="middle" fill="#78716c" fontSize={9}>Cumulus Linux (NVUE)</text>
          <text x={360} y={240} textAnchor="middle" fill="#78716c" fontSize={9}>VRF mgmt isolated</text>

          {/* DGX nodes -- left column (BMC RJ45) */}
          {dgx_nodes.map((dgx, i) => {
            const y = 20 + i * 44;
            const active = isHighlighted("bmc");
            return (
              <g key={dgx.id}>
                <rect x={10} y={y} width={110} height={34} rx={5}
                  fill={active ? "#451a0322" : "#1e293b"}
                  stroke={active ? bmc_color : "#334155"}
                  strokeWidth={active ? 1.5 : 1}
                />
                <text x={65} y={y + 13} textAnchor="middle" fill={active ? bmc_color : "#64748b"} fontSize={10} fontWeight="bold">{dgx.label}</text>
                <text x={65} y={y + 25} textAnchor="middle" fill="#475569" fontSize={8}>{showIPs ? `BMC: ${dgx.ip}` : "BMC iDRAC port"}</text>
                <line x1={120} y1={y + 17} x2={270} y2={200 - (3 - i) * 8}
                  stroke={active ? bmc_color + "99" : "#1e293b"}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                />
              </g>
            );
          })}

          {/* Switch management ports -- right column */}
          {switches_mgmt.map((sw, i) => {
            const y = 40 + i * 56;
            const active = isHighlighted("switchmgmt");
            return (
              <g key={sw.id}>
                <rect x={590} y={y} width={120} height={38} rx={5}
                  fill={active ? "#1e1b4b22" : "#1e293b"}
                  stroke={active ? sw_color : "#334155"}
                  strokeWidth={active ? 1.5 : 1}
                />
                <text x={650} y={y + 14} textAnchor="middle" fill={active ? sw_color : "#64748b"} fontSize={10} fontWeight="bold">{sw.label} mgmt0</text>
                <text x={650} y={y + 27} textAnchor="middle" fill="#475569" fontSize={8}>{showIPs ? sw.ip : "eth0 / mgmt0 port"}</text>
                <line x1={590} y1={y + 19} x2={450} y2={200 - (2 - i) * 10}
                  stroke={active ? sw_color + "99" : "#1e293b"}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                />
              </g>
            );
          })}

          {/* UFM server -- bottom left */}
          {(() => {
            const active = isHighlighted("servers");
            return (
              <g>
                <rect x={40} y={340} width={120} height={44} rx={5}
                  fill={active ? "#14532d22" : "#1e293b"}
                  stroke={active ? ufm_color : "#334155"}
                  strokeWidth={active ? 1.5 : 1}
                />
                <text x={100} y={356} textAnchor="middle" fill={active ? ufm_color : "#64748b"} fontSize={10} fontWeight="bold">UFM Server</text>
                <text x={100} y={370} textAnchor="middle" fill="#475569" fontSize={8}>{showIPs ? "10.0.3.1" : "OOB: 10.0.3.0/24"}</text>
                <text x={100} y={380} textAnchor="middle" fill="#475569" fontSize={8}>SSH to switch mgmt0</text>
                <line x1={160} y1={362} x2={300} y2={250}
                  stroke={active ? ufm_color + "99" : "#1e293b"} strokeWidth={2} />
              </g>
            );
          })()}

          {/* Mgmt workstation -- bottom right */}
          {(() => {
            const active = isHighlighted("servers");
            return (
              <g>
                <rect x={570} y={340} width={130} height={44} rx={5}
                  fill={active ? "#1e293b44" : "#1e293b"}
                  stroke={active ? ws_color : "#334155"}
                  strokeWidth={active ? 1.5 : 1}
                />
                <text x={635} y={356} textAnchor="middle" fill={active ? ws_color : "#64748b"} fontSize={10} fontWeight="bold">Mgmt Workstation</text>
                <text x={635} y={370} textAnchor="middle" fill="#475569" fontSize={8}>{showIPs ? "10.0.0.1 (gateway)" : "Jump host / bastion"}</text>
                <text x={635} y={380} textAnchor="middle" fill="#475569" fontSize={8}>ipmitool, curl, SSH</text>
                <line x1={570} y1={362} x2={420} y2={250}
                  stroke={active ? ws_color + "88" : "#1e293b"} strokeWidth={2} />
              </g>
            );
          })()}

          {/* Uplink to corporate network */}
          <line x1={360} y1={150} x2={360} y2={100} stroke="#334155" strokeWidth={2} />
          <rect x={310} y={78} width={100} height={22} rx={4} fill="#1e293b" stroke="#334155" />
          <text x={360} y={93} textAnchor="middle" fill="#475569" fontSize={9}>Corporate uplink</text>
          <text x={360} y={105} textAnchor="middle" fill="#334155" fontSize={8}>(NOT compute fabric)</text>
        </svg>
      </div>

      {/* Port count table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 16 }}>
        {[
          { label: "BMC ports (8 DGX)", count: "8 ports", color: bmc_color, note: "swp1-8, VLAN 10" },
          { label: "Switch mgmt0 (5 switches)", count: "5 ports", color: sw_color, note: "swp9-13, VLAN 20" },
          { label: "UFM + workstation", count: "2 ports", color: ufm_color, note: "swp14-15, VLAN 20" },
        ].map((item) => (
          <div key={item.label} style={{ background: "#1e293b", borderRadius: 6, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: item.color, fontWeight: 700, marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 700, marginBottom: 2 }}>{item.count}</div>
            <div style={{ fontSize: 10, color: "#475569" }}>{item.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OOBTopologyViz;
