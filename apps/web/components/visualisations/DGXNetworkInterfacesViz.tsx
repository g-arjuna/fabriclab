"use client"
import { useState } from "react"

// -- DGXNetworkInterfacesViz -------------------------
// Shows the three distinct network identities on a DGX H100 chassis

type Identity = "compute" | "storage" | "mgmt"

const identities = [
  {
    id: "compute" as Identity,
    label: "Compute network",
    hw: "8x ConnectX-7 HCA",
    ports: "8x 400G OSFP",
    speed: "3.2 Tbps total",
    color: "#185FA5",
    border: "#378ADD",
    bg: "#0c3260",
    linuxDev: "mlx5_0 ... mlx5_7",
    ipExample: "10.1.1.1 ... 10.1.1.8",
    stack: "CUDA -> NCCL -> libibverbs -> HCA firmware (kernel bypassed after QP setup)",
    fabric: "Compute fabric (SN5600 Spectrum-X or QM9700 IB)",
    arp: "Yes -- HCA ARPs for leaf switch gateway MAC at startup",
    kernelInvolved: false,
    detail: "GPU 0 -> HCA0 (mlx5_0) -> swp1 on Leaf0. GPU 1 -> HCA1 (mlx5_1) -> swp1 on Leaf1. Rail-optimised: each GPU rail has its own dedicated leaf switch. During AllReduce, traffic never passes through more than one leaf and one spine.",
  },
  {
    id: "storage" as Identity,
    label: "OOB / management fabric",
    hw: "2x ConnectX-7 (OOB/mgmt)",
    ports: "2x 400G OSFP (or 2x 100G depending on config)",
    speed: "Up to 800 Gbps",
    color: "#0F6E56",
    border: "#1D9E75",
    bg: "#0a2e22",
    linuxDev: "mlx5_8, mlx5_9 (separate from compute CX7s)",
    ipExample: "192.168.1.1, 192.168.1.2 (OOB fabric IPs)",
    stack: "Standard Linux kernel TCP/IP or libibverbs -- used for UFM management, NVMe-oF storage, OOB fabric",
    fabric: "OOB/storage fabric (separate Spectrum-X or standard Ethernet, 2:1 oversubscription OK)",
    arp: "Yes -- standard ARP via Linux kernel",
    kernelInvolved: true,
    detail: "DGX H100 uses additional ConnectX-7 ports (not BlueField-3) for the OOB/management/storage fabric. These are standard CX7 adapters with their own IPs, invisible on the compute fabric. NOTE: DGX H200 and DGX GB200 NVL72 DO use BlueField-3 DPUs for storage, running their own ARM Linux with independent IP spaces -- a fundamentally different architecture covered in Chapter 17.",
  },
  {
    id: "mgmt" as Identity,
    label: "Management / BMC",
    hw: "1GbE OOB port + BMC (AST2600)",
    ports: "1x 1GbE host OOB + 1x 1GbE dedicated BMC",
    speed: "1 Gbps each",
    color: "#6B21A8",
    border: "#9333EA",
    bg: "#2e1065",
    linuxDev: "eno1 or similar (host OOB); BMC not visible to host OS",
    ipExample: "172.16.1.1 (host OOB); 172.16.2.1 (BMC -- separate)",
    stack: "Host OOB: standard Linux TCP/IP -- SSH, Prometheus, kubectl, NCCL bootstrap. BMC: independent ASPEED firmware.",
    fabric: "OOB management switch (flat L2 or L3, separate from all compute/storage fabrics)",
    arp: "Yes -- standard ARP on both host OOB and BMC interfaces",
    kernelInvolved: true,
    detail: "The host OOB interface carries management traffic: SSH, monitoring agents, Docker/containerd, and NCCL rendezvous/bootstrap (before QPs are established -- controlled by NCCL_SOCKET_IFNAME). The BMC is a completely independent AST2600 processor handling IPMI power control, serial-over-LAN, hardware event logs, and KVM-over-IP. The BMC functions even when the host OS is off or panicked.",
  },
]

export function DGXNetworkInterfacesViz() {
  const [active, setActive] = useState<Identity>("compute")
  const sel = identities.find((i) => i.id === active)!

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">DGX H100 -- three network identities</div>
      <div className="mb-5 text-xs text-slate-600">Click each network to see its hardware, stack, and role.</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
        {identities.map((id) => (
          <button
            key={id.id}
            onClick={() => setActive(id.id)}
            style={{
              background: active === id.id ? id.bg : "#1e293b",
              border: `1px solid ${active === id.id ? id.border : "#334155"}`,
              borderRadius: 10,
              padding: "10px 12px",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 500, color: active === id.id ? "#e2e8f0" : "#94a3b8" }}>{id.label}</div>
            <div style={{ fontSize: 10, color: active === id.id ? id.border : "#475569", marginTop: 3 }}>{id.hw}</div>
            <div style={{ fontSize: 10, color: active === id.id ? "#64748b" : "#334155", marginTop: 2 }}>{id.speed}</div>
          </button>
        ))}
      </div>

      <div style={{ background: sel.bg, border: `1px solid ${sel.border}`, borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#e2e8f0", marginBottom: 14 }}>{sel.label}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          {[
            { label: "Hardware", value: sel.hw },
            { label: "Ports", value: sel.ports },
            { label: "Linux device", value: sel.linuxDev },
            { label: "IP example", value: sel.ipExample },
            { label: "Fabric", value: sel.fabric },
            { label: "ARP runs?", value: sel.arp },
          ].map((row) => (
            <div key={row.label}>
              <div style={{ fontSize: 10, color: "#64748b" }}>{row.label}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: row.label === "Linux device" || row.label === "IP example" ? "monospace" : "inherit" }}>{row.value}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${sel.border}30`, paddingTop: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>Software stack</div>
          <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace", lineHeight: 1.6 }}>{sel.stack}</div>
        </div>

        <div style={{
          background: sel.kernelInvolved ? "#14532d30" : "#1e3a5f30",
          border: `1px solid ${sel.kernelInvolved ? "#1D9E75" : "#378ADD"}30`,
          borderRadius: 6,
          padding: "6px 10px",
          fontSize: 11,
          color: sel.kernelInvolved ? "#86efac" : "#93c5fd",
          marginBottom: 10,
        }}>
          Linux kernel involved in data path: <strong>{sel.kernelInvolved ? "Yes" : "No -- hardware bypass"}</strong>
        </div>

        <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.7 }}>{sel.detail}</div>
      </div>
    </div>
  )
}

export default DGXNetworkInterfacesViz
