"use client";

import { useState } from "react";

// StorageFabricTopologyViz
// Shows the storage fabric topology: DGX nodes -> SN4600C leaf switches -> storage appliances
// Highlights the 2:1 oversubscription design and no-PFC policy

const DGX_NODES = [
  { id: "dgx0", label: "DGX-0", ip: "10.20.1.10", ports: ["enp170s0f0", "enp170s0f1", "enp41s0f0", "enp41s0f1"] },
  { id: "dgx1", label: "DGX-1", ip: "10.20.1.11", ports: ["enp170s0f0", "enp170s0f1", "enp41s0f0", "enp41s0f1"] },
  { id: "dgx2", label: "DGX-2", ip: "10.20.1.12", ports: ["enp170s0f0", "enp170s0f1", "enp41s0f0", "enp41s0f1"] },
  { id: "dgx3", label: "DGX-3", ip: "10.20.1.13", ports: ["enp170s0f0", "enp170s0f1", "enp41s0f0", "enp41s0f1"] },
];

const STORAGE_APPLIANCES = [
  { id: "stor0", label: "Storage-0", model: "NVMe-oF Target", nqn: "nqn.2024-01.com:stor0" },
  { id: "stor1", label: "Storage-1", model: "NVMe-oF Target", nqn: "nqn.2024-01.com:stor1" },
];

type FocusItem = string | null;

export function StorageFabricTopologyViz() {
  const [focus, setFocus] = useState<FocusItem>(null);
  const [showPFC, setShowPFC] = useState(false);

  const isActive = (id: string) => focus === null || focus === id;

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 800 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
          Storage Fabric Topology
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          DGX BasePOD -- 4 Nodes, 2:1 Oversubscription
        </div>
      </div>

      {/* Legend and controls */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { color: "#6366f1", label: "DGX node (CX7 storage NIC)" },
            { color: "#f59e0b", label: "SN4600C storage switch" },
            { color: "#f87171", label: "Storage appliance" },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{l.label}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowPFC(!showPFC)}
          style={{
            padding: "5px 12px",
            borderRadius: 5,
            border: `1px solid ${showPFC ? "#ef4444" : "#334155"}`,
            background: showPFC ? "#ef444422" : "transparent",
            color: showPFC ? "#f87171" : "#64748b",
            cursor: "pointer",
            fontSize: 11,
            fontFamily: "monospace",
          }}
        >
          {showPFC ? "PFC: OFF (correct)" : "Show PFC status"}
        </button>
      </div>

      {/* Topology SVG */}
      <div style={{ background: "#1e293b", borderRadius: 10, padding: 20, marginBottom: 20, overflowX: "auto" }}>
        <svg viewBox="0 0 720 320" style={{ width: "100%", height: "auto", minWidth: 720 }}>
          {/* DGX nodes -- left column */}
          {DGX_NODES.map((dgx, i) => {
            const y = 30 + i * 70;
            return (
              <g
                key={dgx.id}
                onClick={() => setFocus(focus === dgx.id ? null : dgx.id)}
                style={{ cursor: "pointer" }}
              >
                <rect x={10} y={y} width={130} height={54} rx={6}
                  fill={focus === dgx.id ? "#312e81" : "#1e1b4b"}
                  stroke={isActive(dgx.id) ? "#6366f1" : "#1e293b"}
                  strokeWidth={2}
                />
                <text x={75} y={y + 16} textAnchor="middle" fill="#a5b4fc" fontSize={11} fontWeight="bold">{dgx.label}</text>
                <text x={75} y={y + 30} textAnchor="middle" fill="#64748b" fontSize={9}>2x dual-port CX7 NIC</text>
                <text x={75} y={y + 43} textAnchor="middle" fill="#475569" fontSize={9}>{dgx.ip}</text>
              </g>
            );
          })}

          {/* Storage switch -- center */}
          <g onClick={() => setFocus(focus === "sw0" ? null : "sw0")} style={{ cursor: "pointer" }}>
            <rect x={270} y={80} width={180} height={160} rx={8}
              fill={focus === "sw0" ? "#451a03" : "#292524"}
              stroke={isActive("sw0") ? "#f59e0b" : "#1e293b"}
              strokeWidth={2}
            />
            <text x={360} y={105} textAnchor="middle" fill="#fbbf24" fontSize={12} fontWeight="bold">SN4600C</text>
            <text x={360} y={122} textAnchor="middle" fill="#92400e" fontSize={10}>Storage Leaf Switch</text>
            <text x={360} y={140} textAnchor="middle" fill="#78716c" fontSize={9}>64x 100GbE ports</text>

            {/* Port labels */}
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <rect x={282} y={152 + i * 18} width={58} height={12} rx={2} fill="#3f3f46" />
                <text x={311} y={162 + i * 18} textAnchor="middle" fill="#a1a1aa" fontSize={8}>swp{i + 1}</text>
              </g>
            ))}
            {[0, 1].map((i) => (
              <g key={i}>
                <rect x={380} y={152 + i * 18} width={58} height={12} rx={2} fill="#44403c" />
                <text x={409} y={162 + i * 18} textAnchor="middle" fill="#a1a1aa" fontSize={8}>swp{i + 33}</text>
              </g>
            ))}
            <text x={360} y={230} textAnchor="middle" fill="#f59e0b" fontSize={9}>2:1 oversubscription</text>

            {/* No-PFC indicator */}
            {showPFC && (
              <>
                <rect x={295} y={240} width={130} height={20} rx={4} fill="#7f1d1d" />
                <text x={360} y={254} textAnchor="middle" fill="#fca5a5" fontSize={9} fontWeight="bold">PFC DISABLED (correct)</text>
              </>
            )}
          </g>

          {/* Storage appliances -- right column */}
          {STORAGE_APPLIANCES.map((stor, i) => {
            const y = 100 + i * 90;
            return (
              <g key={stor.id} onClick={() => setFocus(focus === stor.id ? null : stor.id)} style={{ cursor: "pointer" }}>
                <rect x={580} y={y} width={130} height={60} rx={6}
                  fill={focus === stor.id ? "#7f1d1d" : "#2d1a1a"}
                  stroke={isActive(stor.id) ? "#f87171" : "#1e293b"}
                  strokeWidth={2}
                />
                <text x={645} y={y + 18} textAnchor="middle" fill="#fca5a5" fontSize={11} fontWeight="bold">{stor.label}</text>
                <text x={645} y={y + 33} textAnchor="middle" fill="#7f1d1d" fontSize={9}>{stor.model}</text>
                <text x={645} y={y + 47} textAnchor="middle" fill="#44403c" fontSize={8}>{stor.nqn.slice(0, 26)}</text>
              </g>
            );
          })}

          {/* Lines: DGX nodes -> switch (server-facing ports) */}
          {DGX_NODES.map((dgx, i) => {
            const y = 30 + i * 70 + 27;
            const sw_y = 152 + i * 18 + 6;
            return (
              <line key={dgx.id}
                x1={140} y1={y}
                x2={282} y2={sw_y}
                stroke={isActive(dgx.id) && isActive("sw0") ? "#6366f180" : "#1e293b"}
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
            );
          })}

          {/* Lines: switch -> storage appliances (uplinks) */}
          {STORAGE_APPLIANCES.map((stor, i) => {
            const sw_y = 152 + i * 18 + 6;
            const stor_y = 100 + i * 90 + 30;
            return (
              <line key={stor.id}
                x1={438} y1={sw_y}
                x2={580} y2={stor_y}
                stroke={isActive(stor.id) && isActive("sw0") ? "#f59e0b80" : "#1e293b"}
                strokeWidth={2}
              />
            );
          })}
        </svg>
      </div>

      {/* Oversubscription explanation */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, marginBottom: 6 }}>Oversubscription maths</div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
            4 DGX nodes x 4 x 100GbE = 1600 Gbps downlink<br />
            2 x 100GbE uplinks to storage = 200 Gbps<br />
            Oversubscription: 8:1 at peak (4 nodes bursting)<br />
            Effective design ratio: 2:1 per node<br />
            Acceptable because checkpoints are bursty, not sustained.
          </div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, marginBottom: 6 }}>Design rules</div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
            No PFC on storage fabric<br />
            ECN only (Kmin 200KB, Kmax 1MB)<br />
            NVMe-oF reconnect handles packet loss<br />
            Separate VLANs from compute fabric<br />
            DSCP marking: verify NIC and switch match
          </div>
        </div>
      </div>
    </div>
  );
}

export default StorageFabricTopologyViz;
