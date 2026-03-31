"use client";

import { useState } from "react";

// SuperPodScalingViz -- BasePOD to SuperPOD scaling
// Shows how pod-indexed addressing enables clean BGP summarisation

export function SuperPodScalingViz() {
  const [podCount, setPodCount] = useState(2);
  const [showRoutes, setShowRoutes] = useState<"full" | "summary">("summary");

  const pods = Array.from({ length: podCount }, (_, i) => ({
    id: i + 1,
    name: `BasePOD-${i + 1}`,
    loopbackBlock: `10.10.${i * 10}.0/24`,
    computeBlock: `10.10.${i * 10 + 1}.0/24`,
    oobBlock: `10.0.${i * 10 + 1}.0/24`,
    storageBlock: `10.20.${i * 10 + 1}.0/24`,
    summaryCompute: `10.10.${i * 10}.0/23`,
    asn: `420000000${i + 1}`,
    dgxCount: 8,
    color: ["#6366f1", "#0ea5e9", "#22c55e", "#f59e0b"][i % 4],
  }));

  const fullRoutes = pods.flatMap((p) => [
    ...Array.from({ length: p.dgxCount * 8 }, (_, j) => `10.10.${p.id * 10 - 9}.${j + 1}/32`),
    `${p.loopbackBlock}`,
  ]);

  const summaryRoutes = pods.flatMap((p) => [p.summaryCompute]);

  const routes = showRoutes === "full" ? fullRoutes.slice(0, 20) : summaryRoutes;

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 820 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          SuperPOD Scaling
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          BGP Route Aggregation at Pod Boundaries
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#64748b" }}>BasePODs:</span>
          <input type="range" min={1} max={4} value={podCount}
            onChange={(e) => setPodCount(Number(e.target.value))}
            style={{ width: 80 }} />
          <span style={{ fontSize: 11, color: "#f59e0b" }}>{podCount}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["full", "summary"] as const).map((m) => (
            <button key={m} onClick={() => setShowRoutes(m)} style={{
              padding: "5px 12px", borderRadius: 5,
              border: `1px solid ${showRoutes === m ? "#6366f1" : "#334155"}`,
              background: showRoutes === m ? "#6366f122" : "transparent",
              color: showRoutes === m ? "#818cf8" : "#64748b",
              cursor: "pointer", fontSize: 11, fontFamily: "monospace",
            }}>
              {m === "full" ? "Full /32 table" : "Summarised table"}
            </button>
          ))}
        </div>
      </div>

      {/* Topology diagram */}
      <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <svg viewBox={`0 0 720 ${100 + podCount * 90}`} style={{ width: "100%", height: "auto" }}>
          {/* Super-spine */}
          <rect x={270} y={10} width={180} height={60} rx={8}
            fill="#292524" stroke="#a78bfa" strokeWidth={2} />
          <text x={360} y={34} textAnchor="middle" fill="#c4b5fd" fontSize={11} fontWeight="bold">Super-Spine</text>
          <text x={360} y={50} textAnchor="middle" fill="#7c3aed" fontSize={9}>10.10.100.1-4/32</text>
          <text x={360} y={63} textAnchor="middle" fill="#475569" fontSize={8}>
            BGP table: {showRoutes === "summary" ? `${podCount} summaries` : `${podCount * 65}+ routes`}
          </text>

          {/* BasePOD blocks */}
          {pods.map((pod, i) => {
            const x = podCount === 1 ? 270 : 20 + i * (680 / podCount);
            const y = 120;
            const w = podCount === 1 ? 180 : Math.min(160, 640 / podCount);
            return (
              <g key={pod.id}>
                {/* Uplink to super-spine */}
                <line x1={x + w / 2} y1={y} x2={360} y2={70}
                  stroke={pod.color + "88"} strokeWidth={1.5} strokeDasharray="4 2" />
                {/* Summary label on uplink */}
                {showRoutes === "summary" && (
                  <text x={(x + w / 2 + 360) / 2} y={(y + 70) / 2 - 5}
                    textAnchor="middle" fill={pod.color} fontSize={8} fontWeight="bold">
                    {pod.summaryCompute}
                  </text>
                )}

                {/* Pod box */}
                <rect x={x} y={y} width={w} height={130} rx={8}
                  fill={pod.color + "11"} stroke={pod.color + "66"} strokeWidth={1.5} />
                <text x={x + w / 2} y={y + 18} textAnchor="middle" fill={pod.color} fontSize={10} fontWeight="bold">
                  {pod.name}
                </text>
                <text x={x + w / 2} y={y + 32} textAnchor="middle" fill="#475569" fontSize={8}>
                  ASN: {pod.asn}
                </text>

                {/* Leaf switches */}
                {[0, 1].map((li) => (
                  <g key={li}>
                    <rect x={x + 8 + li * (w / 2)} y={y + 44} width={w / 2 - 14} height={24} rx={4}
                      fill="#1e293b" stroke={pod.color + "55"} />
                    <text x={x + 8 + li * (w / 2) + (w / 2 - 14) / 2} y={y + 60} textAnchor="middle" fill={pod.color + "cc"} fontSize={8}>
                      leaf-0{li + 1}
                    </text>
                  </g>
                ))}

                {/* Addresses */}
                <text x={x + w / 2} y={y + 86} textAnchor="middle" fill="#475569" fontSize={8}>
                  {pod.loopbackBlock}
                </text>
                <text x={x + w / 2} y={y + 99} textAnchor="middle" fill={pod.color + "aa"} fontSize={8}>
                  {pod.computeBlock}
                </text>
                <text x={x + w / 2} y={y + 112} textAnchor="middle" fill="#0ea5e9aa" fontSize={8}>
                  {pod.storageBlock}
                </text>
                <text x={x + w / 2} y={y + 125} textAnchor="middle" fill="#f87171aa" fontSize={8}>
                  {pod.oobBlock}
                </text>

                {/* DGX count */}
                <text x={x + w / 2} y={y + 143} textAnchor="middle" fill="#334155" fontSize={8}>
                  {pod.dgxCount} DGX x 8 NICs = {pod.dgxCount * 8} /32s
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Route table comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: "#f87171", fontWeight: 700 }}>Without summarisation</div>
            <div style={{ fontSize: 10, color: "#f87171" }}>{podCount * 65}+ routes</div>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
            Super-spine carries every /32 from every pod.
            At {podCount} pods x 8 DGX x 8 NICs = {podCount * 64} server /32s
            plus {podCount * 10} switch loopbacks.
            Reconvergence after super-spine reboot takes minutes.
          </div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>With summarisation</div>
            <div style={{ fontSize: 10, color: "#22c55e" }}>{podCount} routes</div>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
            Super-spine carries one /23 per pod.
            {pods.map((p) => ` ${p.summaryCompute}`).join(",")}.
            Reconvergence is seconds regardless of cluster size.
            Works only if pod addressing is aggregatable from day one.
          </div>
        </div>
      </div>

      {/* Summary config */}
      <div style={{ marginTop: 14, background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
        <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginBottom: 5, textTransform: "uppercase" }}>
          Aggregate route config (on leaf switches, suppresses /32s toward super-spine)
        </div>
        <pre style={{ margin: 0, fontSize: 11, color: "#22c55e", lineHeight: 1.7 }}>{pods.slice(0, 1).map((p) =>
`# leaf-01 in ${p.name}: aggregate compute prefix before advertising to super-spine
nv set vrf default router bgp address-family ipv4-unicast aggregate-route ${p.summaryCompute} summary-only
nv config apply
# summary-only: suppresses the individual /32 host routes from being sent upward
# The super-spine only sees ${p.summaryCompute}, not 64 individual /32s`
        ).join("\n")}</pre>
      </div>
    </div>
  );
}

export default SuperPodScalingViz;
