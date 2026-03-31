"use client";

import { useState } from "react";

// PodScaleViz -- Shows scale of address space at BasePOD and SuperPOD
// Illustrates why discipline is required when you hit 1000+ addresses

const CONFIGS = [
  {
    id: "basepod_8",
    label: "BasePOD (8 DGX)",
    color: "#22c55e",
    dgx: 8,
    switches: 10,
    compute_ips: 8 * 8,
    loopbacks: 10,
    bmc_ips: 8,
    storage_ips: 8 * 4,
    vteps: 4,
    mgmt_ips: 8,
    total_vlans: 30,
  },
  {
    id: "basepod_32",
    label: "BasePOD (32 DGX)",
    color: "#6366f1",
    dgx: 32,
    switches: 20,
    compute_ips: 32 * 8,
    loopbacks: 20,
    bmc_ips: 32,
    storage_ips: 32 * 4,
    vteps: 8,
    mgmt_ips: 32,
    total_vlans: 60,
  },
  {
    id: "superpod_140",
    label: "SuperPOD (140 DGX H100)",
    color: "#f59e0b",
    dgx: 140,
    switches: 60,
    compute_ips: 140 * 8,
    loopbacks: 60,
    bmc_ips: 140,
    storage_ips: 140 * 4,
    vteps: 20,
    mgmt_ips: 140,
    total_vlans: 120,
  },
  {
    id: "superpod_max",
    label: "SuperPOD (1024 DGX)",
    color: "#ef4444",
    dgx: 1024,
    switches: 400,
    compute_ips: 1024 * 8,
    loopbacks: 400,
    bmc_ips: 1024,
    storage_ips: 1024 * 4,
    vteps: 80,
    mgmt_ips: 1024,
    total_vlans: 600,
  },
];

export function PodScaleViz() {
  const [active, setActive] = useState("basepod_8");
  const cfg = CONFIGS.find((c) => c.id === active)!;

  const metrics = [
    { label: "Compute /32 IPs", value: cfg.compute_ips, color: "#6366f1", max: 8192 },
    { label: "Switch loopbacks", value: cfg.loopbacks, color: "#0ea5e9", max: 400 },
    { label: "BMC OOB IPs", value: cfg.bmc_ips, color: "#f87171", max: 1024 },
    { label: "Storage NIC IPs", value: cfg.storage_ips, color: "#22c55e", max: 4096 },
    { label: "In-band mgmt IPs", value: cfg.mgmt_ips, color: "#f59e0b", max: 1024 },
    { label: "VTEP addresses", value: cfg.vteps, color: "#a78bfa", max: 80 },
    { label: "VLANs consumed", value: cfg.total_vlans, color: "#64748b", max: 4094 },
  ];

  const totalIPs = cfg.compute_ips + cfg.loopbacks + cfg.bmc_ips + cfg.storage_ips + cfg.mgmt_ips + cfg.vteps;

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 820 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Deployment Scale
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          Address Space Requirements by Cluster Size
        </div>
      </div>

      {/* Config selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {CONFIGS.map((c) => (
          <button key={c.id} onClick={() => setActive(c.id)} style={{
            flex: 1, minWidth: 120, padding: "8px 10px", borderRadius: 7,
            border: `2px solid ${active === c.id ? c.color : "#334155"}`,
            background: active === c.id ? c.color + "18" : "#1e293b",
            color: active === c.id ? c.color : "#64748b",
            cursor: "pointer", fontSize: 10, fontFamily: "monospace",
            fontWeight: active === c.id ? 700 : 400, textAlign: "center",
          }}>
            {c.label}
            <div style={{ fontSize: 12, color: active === c.id ? c.color : "#334155", marginTop: 2 }}>
              {c.dgx} DGX
            </div>
          </button>
        ))}
      </div>

      {/* Total banner */}
      <div style={{
        background: cfg.color + "18", border: `1px solid ${cfg.color}44`,
        borderRadius: 8, padding: "10px 16px", marginBottom: 16, textAlign: "center",
      }}>
        <div style={{ fontSize: 13, color: cfg.color, fontWeight: 700 }}>
          Total planned IPs: {totalIPs.toLocaleString()}
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
          Across compute, OOB, storage, management, and loopback address families
        </div>
      </div>

      {/* Metric bars */}
      {metrics.map((m) => {
        const pct = Math.min(100, (m.value / m.max) * 100);
        return (
          <div key={m.label} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{m.label}</div>
              <div style={{ fontSize: 11, color: m.color, fontWeight: 600 }}>
                {m.value.toLocaleString()}
                <span style={{ color: "#475569", fontWeight: 400 }}> / {m.max.toLocaleString()} max</span>
              </div>
            </div>
            <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3, background: m.color,
                width: `${pct}%`, transition: "width 0.4s ease",
              }} />
            </div>
          </div>
        );
      })}

      {/* VLAN exhaustion warning for large configs */}
      {cfg.total_vlans > 400 && (
        <div style={{ marginTop: 14, background: "#7f1d1d22", borderRadius: 7, padding: "8px 12px", borderLeft: "3px solid #ef4444" }}>
          <div style={{ fontSize: 11, color: "#f87171" }}>
            At {cfg.total_vlans} VLANs consumed across this deployment, you are at
            {" "}{Math.round((cfg.total_vlans / 4094) * 100)}% of the 4094 VLAN limit.
            Plan tenant VLAN allocation carefully. With multi-tenancy, VLANs deplete faster than IPs.
          </div>
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 11, color: "#475569", textAlign: "center" }}>
        A one-hour addressing session before deployment prevents weeks of debugging.
      </div>
    </div>
  );
}

export default PodScaleViz;
