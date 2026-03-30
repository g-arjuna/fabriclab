"use client";

import { useState } from "react";

// SwitchMgmtVsDataViz -- Switch management port vs data plane ports
// Key insight: VRF mgmt isolation means management is reachable even when data plane is broken

type Scenario = "normal" | "data_broken" | "mgmt_broken";

const SCENARIOS: { id: Scenario; label: string; color: string; desc: string }[] = [
  { id: "normal", label: "Normal operation", color: "#22c55e", desc: "Both data plane and management plane are up. SSH via eth0 (mgmt VRF) and data traffic flows normally on swp ports." },
  { id: "data_broken", label: "Data plane broken", color: "#f59e0b", desc: "Forwarding table corrupt, wrong config, ASIC issue -- data traffic is broken. SSH via eth0 (mgmt VRF) still works perfectly. You can SSH in and fix the config." },
  { id: "mgmt_broken", label: "Management plane broken", color: "#ef4444", desc: "OOB switch is down or eth0 misconfigured. Data traffic continues forwarding normally (VRF isolation). You need physical console access to fix mgmt connectivity." },
];

export function SwitchMgmtVsDataViz() {
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const sc = SCENARIOS.find((s) => s.id === scenario)!;

  const dataOK = scenario !== "data_broken";
  const mgmtOK = scenario !== "mgmt_broken";

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 800 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Management vs Data Plane
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          VRF mgmt Isolation -- Why eth0 Always Works
        </div>
      </div>

      {/* Scenario selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {SCENARIOS.map((s) => (
          <button key={s.id} onClick={() => setScenario(s.id)} style={{
            padding: "6px 14px", borderRadius: 6,
            border: `1px solid ${scenario === s.id ? s.color : "#334155"}`,
            background: scenario === s.id ? s.color + "22" : "transparent",
            color: scenario === s.id ? s.color : "#64748b",
            cursor: "pointer", fontSize: 11, fontFamily: "monospace", fontWeight: scenario === s.id ? 700 : 400,
          }}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px", marginBottom: 20, borderLeft: `3px solid ${sc.color}` }}>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{sc.desc}</div>
      </div>

      {/* Switch diagram */}
      <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <svg viewBox="0 0 680 280" style={{ width: "100%", height: "auto" }}>
          {/* Cumulus Linux switch chassis */}
          <rect x={220} y={60} width={240} height={160} rx={10}
            fill="#0f172a" stroke="#334155" strokeWidth={2} />
          <text x={340} y={80} textAnchor="middle" fill="#64748b" fontSize={11}>Cumulus Linux Switch</text>

          {/* Management CPU (ARM) */}
          <rect x={240} y={90} width={95} height={60} rx={6}
            fill="#1e293b" stroke={mgmtOK ? "#6366f1" : "#ef444433"} strokeWidth={1.5} />
          <text x={287} y={108} textAnchor="middle" fill="#818cf8" fontSize={9} fontWeight="bold">ARM Mgmt CPU</text>
          <text x={287} y={121} textAnchor="middle" fill="#475569" fontSize={8}>eth0 / mgmt VRF</text>
          <text x={287} y={132} textAnchor="middle" fill="#475569" fontSize={8}>sshd, snmpd</text>
          <text x={287} y={143} textAnchor="middle" fill="#475569" fontSize={8}>nvued, frr (mgmt)</text>

          {/* Forwarding ASIC */}
          <rect x={345} y={90} width={100} height={60} rx={6}
            fill="#1e293b" stroke={dataOK ? "#0ea5e9" : "#ef444433"} strokeWidth={1.5} />
          <text x={395} y={108} textAnchor="middle" fill="#38bdf8" fontSize={9} fontWeight="bold">Spectrum ASIC</text>
          <text x={395} y={121} textAnchor="middle" fill="#475569" fontSize={8}>swp1..swp64</text>
          <text x={395} y={132} textAnchor="middle" fill="#475569" fontSize={8}>HW FIB / FRR</text>
          <text x={395} y={143} textAnchor="middle" fill="#475569" fontSize={8}>PFC / ECN / QoS</text>

          {/* VRF mgmt label */}
          <rect x={240} y={162} width={95} height={20} rx={3}
            fill={mgmtOK ? "#312e8122" : "#7f1d1d22"}
            stroke={mgmtOK ? "#6366f144" : "#ef444444"}
          />
          <text x={287} y={175} textAnchor="middle" fill={mgmtOK ? "#818cf8" : "#f87171"} fontSize={8}>
            {mgmtOK ? "vrf mgmt (isolated)" : "vrf mgmt (unreachable)"}
          </text>

          {/* Main VRF label */}
          <rect x={345} y={162} width={100} height={20} rx={3}
            fill={dataOK ? "#0c4a6e22" : "#7f1d1d22"}
            stroke={dataOK ? "#0ea5e944" : "#ef444444"}
          />
          <text x={395} y={175} textAnchor="middle" fill={dataOK ? "#38bdf8" : "#f87171"} fontSize={8}>
            {dataOK ? "vrf default (data)" : "vrf default (broken)"}
          </text>

          {/* eth0 port */}
          <rect x={230} y={200} width={75} height={22} rx={4}
            fill={mgmtOK ? "#1e1b4b" : "#7f1d1d"}
            stroke={mgmtOK ? "#6366f1" : "#ef4444"} strokeWidth={1.5} />
          <text x={267} y={215} textAnchor="middle" fill={mgmtOK ? "#818cf8" : "#f87171"} fontSize={9} fontWeight="bold">
            eth0 (mgmt)
          </text>

          {/* swp data ports (simplified) */}
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={345 + i * 22} y={200} width={18} height={22} rx={3}
                fill={dataOK ? "#0c4a6e" : "#7f1d1d"}
                stroke={dataOK ? "#0ea5e9" : "#ef4444"} strokeWidth={1}
              />
              <text x={354 + i * 22} y={215} textAnchor="middle" fill={dataOK ? "#38bdf8" : "#f87171"} fontSize={8}>
                swp{i + 1}
              </text>
            </g>
          ))}
          <text x={395} y={236} textAnchor="middle" fill="#334155" fontSize={9}>... swp1-64</text>

          {/* OOB switch -- far left */}
          <rect x={20} y={155} width={90} height={36} rx={5}
            fill={mgmtOK ? "#1e293b" : "#7f1d1d22"}
            stroke={mgmtOK ? "#f59e0b" : "#ef4444"}
          />
          <text x={65} y={170} textAnchor="middle" fill={mgmtOK ? "#fbbf24" : "#f87171"} fontSize={9} fontWeight="bold">OOB Switch</text>
          <text x={65} y={183} textAnchor="middle" fill="#475569" fontSize={8}>SN2201 1GbE</text>

          {/* mgmt workstation -- far left top */}
          <rect x={20} y={80} width={90} height={36} rx={5}
            fill="#1e293b" stroke="#94a3b8" strokeWidth={1} />
          <text x={65} y={95} textAnchor="middle" fill="#94a3b8" fontSize={9} fontWeight="bold">Mgmt WS</text>
          <text x={65} y={108} textAnchor="middle" fill="#475569" fontSize={8}>SSH / ipmitool</text>

          {/* DGX nodes -- far right */}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={590} y={80 + i * 60} width={80} height={36} rx={5}
                fill="#1e293b" stroke={dataOK ? "#6366f1" : "#334155"}
              />
              <text x={630} y={95 + i * 60} textAnchor="middle" fill={dataOK ? "#a5b4fc" : "#475569"} fontSize={9} fontWeight="bold">DGX-{i}</text>
              <text x={630} y={108 + i * 60} textAnchor="middle" fill="#475569" fontSize={8}>GPU RDMA</text>
            </g>
          ))}

          {/* Connection lines */}
          {/* WS -> OOB switch */}
          <line x1={65} y1={116} x2={65} y2={155} stroke="#64748b" strokeWidth={1.5} />
          {/* OOB switch -> eth0 */}
          <line x1={110} y1={173} x2={230} y2={211}
            stroke={mgmtOK ? "#6366f1" : "#ef444488"}
            strokeWidth={2}
            strokeDasharray={mgmtOK ? "0" : "6 3"}
          />
          {mgmtOK && <text x={170} y={200} textAnchor="middle" fill="#6366f1" fontSize={9}>SSH 10.0.2.x</text>}
          {!mgmtOK && <text x={170} y={200} textAnchor="middle" fill="#ef4444" fontSize={9}>UNREACHABLE</text>}

          {/* data ports -> DGX */}
          {[0, 1, 2].map((i) => (
            <line key={i} x1={455} y1={211 - i * 5}
              x2={590} y2={98 + i * 60}
              stroke={dataOK ? "#0ea5e988" : "#334155"}
              strokeWidth={1.5}
              strokeDasharray={dataOK ? "4 2" : "4 4"}
            />
          ))}
        </svg>
      </div>

      {/* VRF explanation */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, marginBottom: 6 }}>vrf mgmt -- what it means</div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.65 }}>
            A Linux VRF is a separate routing table. eth0 (the management port) uses the "mgmt" VRF routing table.
            swp1-64 (the data ports) use the "default" VRF routing table. Traffic in one VRF cannot accidentally
            cross into the other -- they are completely isolated in the kernel.
          </div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, marginBottom: 6 }}>Operational rule</div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.65 }}>
            Always verify eth0 SSH connectivity before making any data plane changes.
            If your config change breaks the forwarding table, you can still SSH in to fix it.
            If you break eth0 first, you need a console cable.
          </div>
          <div style={{ background: "#0f172a", borderRadius: 4, padding: "5px 8px", fontSize: 10, color: "#22c55e", marginTop: 6 }}>
            $ ip vrf exec mgmt ping 10.0.2.1
          </div>
        </div>
      </div>
    </div>
  );
}

export default SwitchMgmtVsDataViz;
