"use client";

import { useState } from "react";

// ManagementAddressViz -- Three management planes and their addressing
// OOB (BMC), In-band management, Storage -- what they are, how addressed, when each is needed

type Plane = "oob" | "inband" | "storage";

const PLANES: {
  id: Plane; label: string; color: string; range: string;
  nic: string; switch_: string; routable: string; when: string;
  addrs: { dev: string; ip: string; note: string }[];
  cmd: string;
}[] = [
  {
    id: "oob",
    label: "OOB Plane (BMC iDRAC)",
    color: "#f87171",
    range: "10.0.1.0/24 (BasePOD 1)",
    nic: "AST2600 BMC 1GbE RJ45 (rear panel)",
    switch_: "SN2201 OOB switch -- physically separate",
    routable: "NOT routable from compute or storage fabric",
    when: "Host OS is down. Hard power cycle. BIOS/firmware update. Physical access substitute.",
    addrs: [
      { dev: "DGX-01 BMC", ip: "10.0.1.1", note: "iDRAC -- always on (standby power)" },
      { dev: "DGX-02 BMC", ip: "10.0.1.2", note: "" },
      { dev: "leaf-01 mgmt0", ip: "10.0.2.1", note: "Switch management -- VRF mgmt" },
      { dev: "spine-01 mgmt0", ip: "10.0.2.16", note: "" },
      { dev: "UFM server", ip: "10.0.3.1", note: "UFM OOB NIC" },
    ],
    cmd: "ipmitool -I lanplus -H 10.0.1.1 -U admin -P pass chassis status",
  },
  {
    id: "inband",
    label: "In-Band Management Plane",
    color: "#f59e0b",
    range: "10.10.4.0/24 (BasePOD 1)",
    nic: "DGX CX7 Slot1/Slot2 bonded (enp170s0f0 + enp41s0f0)",
    switch_: "Compute leaf switch -- same as compute fabric physically",
    routable: "Routable via compute fabric BGP",
    when: "SSH, Ansible, Prometheus DCGM scrape, monitoring, health checks. Used when host OS is running.",
    addrs: [
      { dev: "DGX-01 mgmt bond", ip: "10.10.4.1", note: "Bond of Slot1+Slot2 port0" },
      { dev: "DGX-02 mgmt bond", ip: "10.10.4.2", note: "" },
      { dev: "DGX-03 mgmt bond", ip: "10.10.4.3", note: "" },
      { dev: "UFM server (in-band)", ip: "10.10.4.32", note: "UFM's compute fabric connection" },
    ],
    cmd: "ssh ubuntu@10.10.4.1  # normal SSH into DGX host OS",
  },
  {
    id: "storage",
    label: "Storage Plane (NVMe-oF)",
    color: "#22c55e",
    range: "10.20.1.0/24 (DGX) + 10.20.2.0/24 (appliances)",
    nic: "DGX CX7 Slot1/Slot2 all 4 ports (enp170s0f0/1, enp41s0f0/1)",
    switch_: "SN4600C storage leaf switch -- physically separate",
    routable: "NOT routable from compute fabric -- storage subnet only",
    when: "NVMe-oF checkpoint writes, dataset reads. GDS path for GPU-direct storage.",
    addrs: [
      { dev: "DGX-01 Slot1 port0", ip: "10.20.1.1", note: "enp170s0f0 -- NVMe-oF initiator" },
      { dev: "DGX-01 Slot1 port1", ip: "10.20.1.2", note: "enp170s0f1" },
      { dev: "DGX-01 Slot2 port0", ip: "10.20.1.3", note: "enp41s0f0" },
      { dev: "DGX-01 Slot2 port1", ip: "10.20.1.4", note: "enp41s0f1" },
      { dev: "WEKA appliance portal", ip: "10.20.2.1", note: "NVMe-oF target" },
    ],
    cmd: "nvme connect -t rdma -a 10.20.2.1 -s 4420 -n nqn.2024-01.com:storage1",
  },
];

export function ManagementAddressViz() {
  const [active, setActive] = useState<Plane>("oob");

  const plane = PLANES.find((p) => p.id === active)!;

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 820 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Management Address Planning
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          Three Separate Planes -- Three Separate Ranges
        </div>
      </div>

      {/* Plane selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {PLANES.map((p) => (
          <button key={p.id} onClick={() => setActive(p.id)} style={{
            flex: 1, padding: "10px 8px", borderRadius: 8,
            border: `2px solid ${active === p.id ? p.color : "#334155"}`,
            background: active === p.id ? p.color + "18" : "#1e293b",
            color: active === p.id ? p.color : "#64748b",
            cursor: "pointer", fontSize: 11, fontFamily: "monospace",
            fontWeight: active === p.id ? 700 : 400, textAlign: "center",
          }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Plane detail */}
      <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, borderLeft: `4px solid ${plane.color}`, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          {[
            { label: "Range", value: plane.range },
            { label: "NIC", value: plane.nic },
            { label: "Switch", value: plane.switch_ },
            { label: "Routable from other fabrics", value: plane.routable },
          ].map((row) => (
            <div key={row.label}>
              <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", marginBottom: 2 }}>{row.label}</div>
              <div style={{ fontSize: 11, color: row.label === "Routable from other fabrics" && row.value.startsWith("NOT") ? "#f87171" : "#94a3b8" }}>
                {row.value}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #334155", paddingTop: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", marginBottom: 3 }}>Use this plane when</div>
          <div style={{ fontSize: 12, color: "#e2e8f0" }}>{plane.when}</div>
        </div>
      </div>

      {/* Address table */}
      <div style={{ background: "#1e293b", borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "160px 120px 1fr", padding: "6px 12px", background: "#334155" }}>
          {["Device", "IP Address", "Notes"].map((h) => (
            <div key={h} style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>{h}</div>
          ))}
        </div>
        {plane.addrs.map((addr, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "160px 120px 1fr",
            padding: "7px 12px", background: i % 2 === 0 ? "#0f172a" : "transparent",
          }}>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{addr.dev}</div>
            <div style={{ fontSize: 11, color: plane.color, fontFamily: "monospace" }}>{addr.ip}</div>
            <div style={{ fontSize: 11, color: "#475569" }}>{addr.note}</div>
          </div>
        ))}
      </div>

      {/* Command */}
      <div style={{ background: "#0f172a", borderRadius: 6, padding: "8px 12px" }}>
        <div style={{ fontSize: 10, color: plane.color, fontWeight: 700, marginBottom: 4 }}>Typical command using this plane</div>
        <div style={{ fontSize: 11, color: "#22c55e" }}>$ {plane.cmd}</div>
      </div>
    </div>
  );
}

export default ManagementAddressViz;
