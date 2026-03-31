"use client";

import { useState } from "react";

// ServerPrefixViz -- /32 host routes for DGX server interfaces
// Shows BGP advertisement chain, ECMP paths, and why /24 subnets fail

type Mode = "correct" | "wrong";

const DGX_ADDRS = [
  { dgx: "DGX-01", nics: ["10.10.1.1", "10.10.1.2", "10.10.1.3", "10.10.1.4"] },
  { dgx: "DGX-02", nics: ["10.10.1.5", "10.10.1.6", "10.10.1.7", "10.10.1.8"] },
  { dgx: "DGX-03", nics: ["10.10.1.9", "10.10.1.10", "10.10.1.11", "10.10.1.12"] },
];

export function ServerPrefixViz() {
  const [mode, setMode] = useState<Mode>("correct");
  const [selected, setSelected] = useState<string | null>("10.10.1.5");

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 820 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Server Prefix Addressing
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          /32 Host Routes -- How Server IPs Enter the BGP Fabric
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setMode("correct")} style={{
          padding: "7px 18px", borderRadius: 6,
          border: `1px solid ${mode === "correct" ? "#22c55e" : "#334155"}`,
          background: mode === "correct" ? "#22c55e22" : "transparent",
          color: mode === "correct" ? "#4ade80" : "#64748b",
          cursor: "pointer", fontSize: 12, fontFamily: "monospace", fontWeight: mode === "correct" ? 700 : 400,
        }}>
          Correct: /32 host routes
        </button>
        <button onClick={() => setMode("wrong")} style={{
          padding: "7px 18px", borderRadius: 6,
          border: `1px solid ${mode === "wrong" ? "#ef4444" : "#334155"}`,
          background: mode === "wrong" ? "#ef444422" : "transparent",
          color: mode === "wrong" ? "#f87171" : "#64748b",
          cursor: "pointer", fontSize: 12, fontFamily: "monospace", fontWeight: mode === "wrong" ? 700 : 400,
        }}>
          Wrong: /24 subnets
        </button>
      </div>

      {mode === "correct" ? (
        <>
          {/* Fabric diagram with /32 flows */}
          <div style={{ background: "#1e293b", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <svg viewBox="0 0 680 260" style={{ width: "100%", height: "auto" }}>
              {/* Spines */}
              {[0, 1].map((i) => (
                <g key={i}>
                  <rect x={230 + i * 180} y={10} width={120} height={36} rx={6}
                    fill="#0c4a6e" stroke="#0ea5e9" strokeWidth={1.5} />
                  <text x={290 + i * 180} y={31} textAnchor="middle" fill="#7dd3fc" fontSize={10} fontWeight="bold">
                    Spine-0{i + 1}
                  </text>
                </g>
              ))}

              {/* Leaf switches */}
              {[0, 1, 2, 3].map((i) => (
                <g key={i}>
                  <rect x={10 + i * 165} y={80} width={130} height={36} rx={6}
                    fill="#312e81" stroke="#6366f1" strokeWidth={1.5} />
                  <text x={75 + i * 165} y={101} textAnchor="middle" fill="#a5b4fc" fontSize={10} fontWeight="bold">
                    Leaf-0{i + 1}
                  </text>
                </g>
              ))}

              {/* Leaf-to-spine uplinks */}
              {[0, 1, 2, 3].map((leaf) =>
                [0, 1].map((spine) => (
                  <line key={`${leaf}-${spine}`}
                    x1={75 + leaf * 165} y1={80}
                    x2={290 + spine * 180} y2={46}
                    stroke="#6366f133" strokeWidth={1} />
                ))
              )}

              {/* DGX nodes */}
              {DGX_ADDRS.map((dgx, di) => {
                const y = 150;
                const x = 10 + di * 220;
                return (
                  <g key={dgx.dgx}>
                    <rect x={x} y={y} width={200} height={95} rx={6}
                      fill="#0f172a" stroke="#334155" strokeWidth={1} />
                    <text x={x + 100} y={y + 16} textAnchor="middle" fill="#64748b" fontSize={9} fontWeight="bold">
                      {dgx.dgx}
                    </text>
                    {dgx.nics.map((ip, ni) => {
                      const isSelected = selected === ip;
                      return (
                        <g key={ip} onClick={() => setSelected(selected === ip ? null : ip)}
                          style={{ cursor: "pointer" }}>
                          <rect x={x + 4 + ni * 48} y={y + 22} width={44} height={24} rx={3}
                            fill={isSelected ? "#22c55e33" : "#1e293b"}
                            stroke={isSelected ? "#22c55e" : "#334155"}
                          />
                          <text x={x + 26 + ni * 48} y={y + 36} textAnchor="middle" fill={isSelected ? "#4ade80" : "#475569"} fontSize={8}>
                            {ip.split(".")[3]}
                          </text>
                          <text x={x + 26 + ni * 48} y={y + 45} textAnchor="middle" fill="#334155" fontSize={7}>
                            /32
                          </text>
                          {/* Connection to leaf */}
                          <line x1={x + 26 + ni * 48} y1={y + 22}
                            x2={75 + ni * 165} y2={116}
                            stroke={isSelected ? "#22c55e88" : "#1e293b"}
                            strokeWidth={isSelected ? 2 : 1}
                          />
                        </g>
                      );
                    })}
                    <text x={x + 100} y={y + 80} textAnchor="middle" fill="#334155" fontSize={8}>
                      Rail 0: Leaf-01  Rail 1: Leaf-02
                    </text>
                    <text x={x + 100} y={y + 90} textAnchor="middle" fill="#334155" fontSize={8}>
                      Rail 2: Leaf-03  Rail 3: Leaf-04
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Selected IP detail */}
          {selected && (
            <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px", borderLeft: "3px solid #22c55e", marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 700, marginBottom: 6 }}>{selected}/32 -- Route flow</div>
              <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.65 }}>
                1. DGX-02 configures {selected}/32 on its NIC interface (e.g. eth1)<br />
                2. Leaf-02 sees {selected}/32 as a directly connected route<br />
                3. Leaf-02 redistributes {selected}/32 into BGP via "redistribute connected"<br />
                4. Both spines learn {selected}/32 with next-hop = Leaf-02 loopback (10.10.0.2/32)<br />
                5. Other leaf switches install: ip route {selected}/32 via 10.10.0.2 (ECMP via both spines)<br />
                6. DGX-01 can now send AllReduce traffic to {selected}/32 via 2 ECMP paths
              </div>
            </div>
          )}

          <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, marginBottom: 5, textTransform: "uppercase" }}>BGP table on Leaf-01</div>
            <pre style={{ margin: 0, fontSize: 11, color: "#4ade80", lineHeight: 1.7 }}>{`B>  10.10.1.5/32 [20/0] via fe80::spine01, swp33 weight 1
                        via fe80::spine01, swp34 weight 1
B>  10.10.1.6/32 [20/0] via fe80::spine01, swp33 weight 1
                        via fe80::spine01, swp34 weight 1
# Each server /32 has 2 ECMP paths (one per spine)`}</pre>
          </div>
        </>
      ) : (
        <div>
          <div style={{ background: "#7f1d1d22", borderRadius: 10, padding: 16, borderLeft: "3px solid #ef4444", marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#f87171", fontWeight: 700, marginBottom: 8 }}>Wrong approach: /24 subnets</div>
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
              DGX-01 eth0: 10.10.1.1/24 (connected to Leaf-01)<br />
              DGX-02 eth0: 10.10.1.2/24 (connected to Leaf-02)<br />
              <br />
              <span style={{ color: "#f87171" }}>Problem:</span> Leaf-01 has a directly connected route for
              10.10.1.0/24. So does Leaf-02. These are connected routes, not BGP redistributed routes.
              BGP only advertises the subnet (10.10.1.0/24) from Leaf-01 -- meaning Leaf-01 claims
              ownership of the entire /24 including DGX-02's IP. Leaf-02 does the same.
              The spines receive conflicting advertisements for 10.10.1.0/24 from two different next-hops.
              Traffic for DGX-02 may arrive at Leaf-01 which has no physical connection to DGX-02.
              AllReduce between nodes on different leaves: broken.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 11, color: "#f87171", fontWeight: 700, marginBottom: 6 }}>BGP table with /24 -- ambiguous</div>
              <pre style={{ margin: 0, fontSize: 11, color: "#fca5a5", lineHeight: 1.65 }}>{`# On spine-01: receives SAME prefix from two different leaves
B   10.10.1.0/24 [20/0] via fe80::leaf01, swp1
B   10.10.1.0/24 [20/0] via fe80::leaf02, swp2
# Both leaves claim the whole /24 -- no way to know which DGX is where
# ECMP will send 50% of traffic to the wrong leaf`}</pre>
            </div>
            <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, marginBottom: 6 }}>BGP table with /32 -- precise</div>
              <pre style={{ margin: 0, fontSize: 11, color: "#4ade80", lineHeight: 1.65 }}>{`# On spine-01: each server IP uniquely owned by one leaf
B   10.10.1.1/32 via fe80::leaf01  # DGX-01 eth0 -> Leaf-01
B   10.10.1.2/32 via fe80::leaf02  # DGX-02 eth0 -> Leaf-02
# Unambiguous. Traffic always reaches the correct leaf.`}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServerPrefixViz;
