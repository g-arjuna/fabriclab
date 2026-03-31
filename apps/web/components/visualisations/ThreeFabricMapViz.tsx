"use client";

import { useState } from "react";

// ThreeFabricMapViz -- Shows all three DGX cluster fabrics side by side
// Compute / Storage / OOB Management with their key design properties

type Fabric = "compute" | "storage" | "oob";

const FABRICS: {
  id: Fabric;
  label: string;
  color: string;
  switch: string;
  speed: string;
  ports: string;
  topology: string;
  pfc: string;
  purpose: string;
  failure: string;
  props: { k: string; v: string }[];
}[] = [
  {
    id: "compute",
    label: "Compute Fabric",
    color: "#6366f1",
    switch: "QM9700 (IB) / SN5600 (RoCEv2)",
    speed: "200 / 400 Gbps per port",
    ports: "8x CX7 HCA per DGX",
    topology: "Rail-optimised fat-tree, 1:1",
    pfc: "Required -- lossless",
    purpose: "GPU-to-GPU RDMA, AllReduce synchronisation",
    failure: "Training jobs stall. NCCL times out. GPU idle.",
    props: [
      { k: "Protocol", v: "RDMA (IB or RoCEv2)" },
      { k: "PFC", v: "Yes -- mandatory" },
      { k: "ECN Kmin", v: "~80 KB" },
      { k: "Oversubscription", v: "1:1 (full bisection)" },
      { k: "Routing", v: "SM (IB) or BGP ECMP (RoCEv2)" },
      { k: "Managed by", v: "UFM (IB) or BGP config (RoCEv2)" },
    ],
  },
  {
    id: "storage",
    label: "Storage Fabric",
    color: "#0ea5e9",
    switch: "SN4600C (100GbE)",
    speed: "100 Gbps per port",
    ports: "2x dual-port CX7 NIC per DGX",
    topology: "Simple leaf, 2:1 oversubscription",
    pfc: "NOT used -- ECN only",
    purpose: "NVMe-oF checkpoint writes, dataset reads",
    failure: "Checkpoints fail. Dataset load stalls. Training pauses.",
    props: [
      { k: "Protocol", v: "NVMe-oF RDMA or TCP" },
      { k: "PFC", v: "No -- would stall appliances" },
      { k: "ECN Kmin", v: "~200 KB" },
      { k: "Oversubscription", v: "2:1 (burst tolerant)" },
      { k: "Routing", v: "Static or simple BGP" },
      { k: "Managed by", v: "nvme-rdma + cuFile (GDS)" },
    ],
  },
  {
    id: "oob",
    label: "OOB Management",
    color: "#f59e0b",
    switch: "SN2201 (1GbE, 48-port)",
    speed: "1 Gbps per port",
    ports: "1x BMC RJ45 per DGX + switch mgmt0",
    topology: "Flat L2, single VLAN (or VLAN-separated)",
    pfc: "N/A -- standard Ethernet",
    purpose: "Power control, console, firmware, UFM polling, IPMI/Redfish, KVM-over-IP",
    failure: "Cannot recover. No power cycle, no console, no fix.",
    props: [
      { k: "Protocol", v: "IPMI/Redfish/SSH/HTTPS" },
      { k: "PFC", v: "N/A" },
      { k: "Bandwidth", v: "1 Gbps -- control plane only" },
      { k: "Oversubscription", v: "N/A -- very low traffic" },
      { k: "Routing", v: "Static, separate RFC 1918 range" },
      { k: "Managed by", v: "AST2600 BMC + VRF mgmt" },
    ],
  },
];

export function ThreeFabricMapViz() {
  const [active, setActive] = useState<Fabric | null>(null);
  const [showFailure, setShowFailure] = useState(false);

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 820 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Three-Fabric Model
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          DGX Cluster -- Complete Fabric Picture
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setShowFailure(!showFailure)}
          style={{
            padding: "5px 12px", borderRadius: 5, border: `1px solid ${showFailure ? "#ef4444" : "#334155"}`,
            background: showFailure ? "#ef444422" : "transparent", color: showFailure ? "#f87171" : "#64748b",
            cursor: "pointer", fontSize: 11, fontFamily: "monospace",
          }}
        >
          {showFailure ? "Showing: failure impact" : "Show failure impact"}
        </button>
        <div style={{ fontSize: 11, color: "#334155", alignSelf: "center" }}>click a fabric for full detail</div>
      </div>

      {/* Fabric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {FABRICS.map((fab) => (
          <div
            key={fab.id}
            onClick={() => setActive(active === fab.id ? null : fab.id)}
            style={{
              background: active === fab.id ? fab.color + "18" : "#1e293b",
              border: `2px solid ${active === fab.id ? fab.color : "#334155"}`,
              borderRadius: 10,
              padding: 14,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: 12, color: fab.color, fontWeight: 700, marginBottom: 8 }}>{fab.label}</div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>SWITCH</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, lineHeight: 1.4 }}>{fab.switch}</div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>SPEED / PORT</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>{fab.speed}</div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>PFC</div>
            <div style={{
              display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
              background: fab.id === "compute" ? "#3730a3" : fab.id === "storage" ? "#7f1d1d" : "#334155",
              color: fab.id === "compute" ? "#a5b4fc" : fab.id === "storage" ? "#fca5a5" : "#94a3b8",
            }}>
              {fab.pfc}
            </div>
            {showFailure && (
              <div style={{ marginTop: 10, background: "#7f1d1d22", borderRadius: 5, padding: "6px 8px", borderLeft: `2px solid #ef4444` }}>
                <div style={{ fontSize: 9, color: "#f87171", fontWeight: 700, marginBottom: 2 }}>IF THIS FABRIC FAILS</div>
                <div style={{ fontSize: 10, color: "#fca5a5" }}>{fab.failure}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {active && (() => {
        const fab = FABRICS.find((f) => f.id === active)!;
        return (
          <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, borderLeft: `3px solid ${fab.color}` }}>
            <div style={{ fontSize: 13, color: fab.color, fontWeight: 700, marginBottom: 12 }}>{fab.label} -- Detail</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {fab.props.map((p) => (
                <div key={p.k} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                  <div style={{ fontSize: 10, color: "#475569", minWidth: 100 }}>{p.k}</div>
                  <div style={{ fontSize: 11, color: "#cbd5e1" }}>{p.v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "#94a3b8", lineHeight: 1.6, borderTop: "1px solid #334155", paddingTop: 10 }}>
              <span style={{ color: "#64748b" }}>Purpose: </span>{fab.purpose}
            </div>
          </div>
        );
      })()}

      {/* DGX node diagram */}
      <div style={{ marginTop: 20, background: "#1e293b", borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
          DGX H100 -- Which NIC goes to which fabric
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { label: "mlx5_0-7 (CX7 HCA x8)", fabric: "compute", color: "#6366f1" },
            { label: "enp170s0f0/1 Slot1 CX7", fabric: "storage", color: "#0ea5e9" },
            { label: "enp41s0f0/1 Slot2 CX7", fabric: "storage", color: "#0ea5e9" },
            { label: "BMC RJ45 (iDRAC)", fabric: "oob", color: "#f59e0b" },
          ].map((item) => (
            <div key={item.label} style={{
              padding: "6px 10px", borderRadius: 6, background: item.color + "18",
              border: `1px solid ${item.color}44`, display: "flex", alignItems: "center", gap: 6,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.label}</div>
              <div style={{ fontSize: 10, color: item.color, fontWeight: 600 }}>{"->"} {item.fabric}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ThreeFabricMapViz;
