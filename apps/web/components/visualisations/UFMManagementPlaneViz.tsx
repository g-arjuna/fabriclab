"use client";

import { useState } from "react";

// UFMManagementPlaneViz -- UFM uses two separate communication channels
// 1. IB MADs over the InfiniBand fabric for topology discovery
// 2. SSH/REST over OOB management network for config and firmware

type Channel = "ib" | "oob" | null;

export function UFMManagementPlaneViz() {
  const [active, setActive] = useState<Channel>(null);

  const ibActive = active === null || active === "ib";
  const oobActive = active === null || active === "oob";

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 800 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>UFM Management Plane</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          Two Independent Communication Channels
        </div>
      </div>

      {/* Channel selectors */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => setActive(active === "ib" ? null : "ib")} style={{
          padding: "6px 14px", borderRadius: 6,
          border: `1px solid ${active === "ib" ? "#a78bfa" : "#334155"}`,
          background: active === "ib" ? "#a78bfa22" : "transparent",
          color: active === "ib" ? "#a78bfa" : "#64748b",
          cursor: "pointer", fontSize: 11, fontFamily: "monospace", fontWeight: active === "ib" ? 700 : 400,
        }}>
          IB MADs (topology discovery)
        </button>
        <button onClick={() => setActive(active === "oob" ? null : "oob")} style={{
          padding: "6px 14px", borderRadius: 6,
          border: `1px solid ${active === "oob" ? "#f59e0b" : "#334155"}`,
          background: active === "oob" ? "#f59e0b22" : "transparent",
          color: active === "oob" ? "#f59e0b" : "#64748b",
          cursor: "pointer", fontSize: 11, fontFamily: "monospace", fontWeight: active === "oob" ? 700 : 400,
        }}>
          SSH/REST (OOB mgmt)
        </button>
      </div>

      {/* Diagram */}
      <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, marginBottom: 20, overflowX: "auto" }}>
        <svg viewBox="0 0 700 300" style={{ width: "100%", height: "auto", minWidth: 700 }}>

          {/* UFM Server -- center */}
          <rect x={260} y={100} width={180} height={100} rx={8}
            fill="#1e293b" stroke="#22c55e" strokeWidth={2} />
          <text x={350} y={125} textAnchor="middle" fill="#4ade80" fontSize={12} fontWeight="bold">UFM Server</text>
          <text x={350} y={143} textAnchor="middle" fill="#475569" fontSize={9}>Unified Fabric Manager</text>

          {/* IB HCA on UFM */}
          <rect x={275} y={152} width={80} height={24} rx={4}
            fill="#312e81" stroke={ibActive ? "#a78bfa" : "#334155"} strokeWidth={1.5} />
          <text x={315} y={167} textAnchor="middle" fill="#a78bfa" fontSize={9}>IB HCA port</text>
          <text x={315} y={177} textAnchor="middle" fill="#475569" fontSize={8}>SubnGet MADs</text>

          {/* OOB NIC on UFM */}
          <rect x={365} y={152} width={70} height={24} rx={4}
            fill="#451a03" stroke={oobActive ? "#f59e0b" : "#334155"} strokeWidth={1.5} />
          <text x={400} y={167} textAnchor="middle" fill="#fbbf24" fontSize={9}>OOB NIC</text>
          <text x={400} y={177} textAnchor="middle" fill="#475569" fontSize={8}>SSH / REST</text>

          {/* InfiniBand fabric -- left */}
          <rect x={30} y={80} width={140} height={140} rx={8}
            fill="#1e1b4b22" stroke={ibActive ? "#a78bfa" : "#334155"} strokeWidth={1.5} strokeDasharray="5 3" />
          <text x={100} y={100} textAnchor="middle" fill="#818cf8" fontSize={11} fontWeight="bold">IB Fabric</text>
          <text x={100} y={116} textAnchor="middle" fill="#475569" fontSize={9}>QM9700 switches</text>

          {/* IB switches */}
          {[0, 1].map((i) => (
            <g key={i}>
              <rect x={45} y={125 + i * 55} width={90} height={34} rx={4}
                fill="#1e293b" stroke={ibActive ? "#6366f155" : "#334155"} />
              <text x={90} y={140 + i * 55} textAnchor="middle" fill="#6366f1" fontSize={9}>Spine-{i} (QM9700)</text>
              <text x={90} y={152 + i * 55} textAnchor="middle" fill="#475569" fontSize={8}>LID assigned by SM</text>
            </g>
          ))}

          {/* OOB management switch -- right */}
          <rect x={530} y={100} width={140} height={100} rx={8}
            fill="#451a0322" stroke={oobActive ? "#f59e0b" : "#334155"} strokeWidth={1.5} strokeDasharray="5 3" />
          <text x={600} y={120} textAnchor="middle" fill="#fbbf24" fontSize={11} fontWeight="bold">OOB Network</text>
          <text x={600} y={136} textAnchor="middle" fill="#475569" fontSize={9}>SN2201 1GbE</text>
          <rect x={545} y={145} width={110} height={40} rx={4}
            fill="#1e293b" stroke={oobActive ? "#f59e0b44" : "#334155"} />
          <text x={600} y={162} textAnchor="middle" fill="#fbbf24" fontSize={9}>mgmt0 (Spine-0)</text>
          <text x={600} y={175} textAnchor="middle" fill="#475569" fontSize={8}>SSH target: 10.0.2.20</text>

          {/* IB MAD path: UFM HCA -> IB Fabric */}
          <line x1={275} y1={163} x2={170} y2={163}
            stroke={ibActive ? "#a78bfa" : "#1e293b"} strokeWidth={2.5}
          />
          {ibActive && (
            <>
              <text x={222} y={155} textAnchor="middle" fill="#a78bfa" fontSize={9} fontWeight="bold">IB MADs</text>
              <text x={222} y={167} textAnchor="middle" fill="#6366f1" fontSize={8}>SubnGet/SubnSet</text>
            </>
          )}

          {/* OOB SSH path: UFM OOB NIC -> OOB switch */}
          <line x1={435} y1={163} x2={530} y2={163}
            stroke={oobActive ? "#f59e0b" : "#1e293b"} strokeWidth={2.5}
          />
          {oobActive && (
            <>
              <text x={482} y={155} textAnchor="middle" fill="#f59e0b" fontSize={9} fontWeight="bold">SSH / REST</text>
              <text x={482} y={167} textAnchor="middle" fill="#92400e" fontSize={8}>ONYX CLI / API</text>
            </>
          )}

          {/* Function labels */}
          {ibActive && (
            <rect x={20} y={240} width={220} height={50} rx={5}
              fill="#312e8122" stroke="#a78bfa44">
            </rect>
          )}
          {ibActive && (
            <>
              <text x={130} y={257} textAnchor="middle" fill="#818cf8" fontSize={9} fontWeight="bold">IB MADs -- what UFM can do</text>
              <text x={130} y={270} textAnchor="middle" fill="#6366f1" fontSize={8}>Discover topology (all LIDs, GUIDs)</text>
              <text x={130} y={282} textAnchor="middle" fill="#6366f1" fontSize={8}>Assign LIDs, program routing tables</text>
            </>
          )}

          {oobActive && (
            <rect x={460} y={240} width={220} height={50} rx={5}
              fill="#451a0322" stroke="#f59e0b44">
            </rect>
          )}
          {oobActive && (
            <>
              <text x={570} y={257} textAnchor="middle" fill="#fbbf24" fontSize={9} fontWeight="bold">OOB SSH -- what UFM can do</text>
              <text x={570} y={270} textAnchor="middle" fill="#f59e0b" fontSize={8}>Push switch config / ACLs</text>
              <text x={570} y={282} textAnchor="middle" fill="#f59e0b" fontSize={8}>Firmware updates, log collection</text>
            </>
          )}
        </svg>
      </div>

      {/* Failure modes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, marginBottom: 6 }}>If OOB network is down</div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.65 }}>
            UFM can still see fabric topology via IB MADs. LID assignment and path computation continue.
            But UFM cannot push config changes or collect switch logs. Fabric continues running on existing config.
          </div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, marginBottom: 6 }}>If IB fabric is down</div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.65 }}>
            UFM loses fabric visibility -- no topology, no LID assignment. But UFM can still SSH into every switch
            via OOB. You can still push configuration and diagnose what went wrong at the switch level.
          </div>
        </div>
      </div>
    </div>
  );
}

export default UFMManagementPlaneViz;
