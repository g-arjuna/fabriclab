"use client"
import { useState } from "react"

// -- DGXNetworkInterfacesViz -------------------------
// Shows the four distinct network identities on a DGX H100 chassis:
// 1. Compute network (8x CX7 HCA)
// 2. Storage / in-band management (2x dual-port CX7)
// 3. Host OOB management (1GbE motherboard NIC)
// 4. BMC (AST2600 dedicated IPMI port)

type Identity = "compute" | "storage" | "mgmt" | "bmc"

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
    detail: "DGX H100 and H200 use additional ConnectX-7 ports (not BlueField-3) for the storage and in-band management fabric. These are standard CX7 adapters with their own IPs, invisible on the compute fabric. NOTE: DGX B200 and DGX GB200 NVL72 replace these CX7 NICs with BlueField-3 DPUs running their own ARM Linux with independent IP spaces -- a fundamentally different architecture covered in Chapters 17 and 18.",
  },
  {
    id: "mgmt" as Identity,
    label: "Host management (1GbE OOB)",
    hw: "1GbE motherboard NIC",
    ports: "1x 1GbE RJ45",
    speed: "1 Gbps",
    color: "#6B21A8",
    border: "#9333EA",
    bg: "#2e1065",
    linuxDev: "eno1 or similar",
    ipExample: "172.16.1.1 (OOB management IP)",
    stack: "Standard Linux TCP/IP -- SSH, Prometheus, DCGM exporter (in-band), kubectl, NCCL bootstrap (NCCL_SOCKET_IFNAME).",
    fabric: "OOB management switch (flat L2, separate from compute/storage fabrics)",
    arp: "Yes -- standard ARP via Linux kernel",
    kernelInvolved: true,
    detail: "The host OOB interface carries host-OS-level management traffic: SSH sessions, monitoring agent scrapes (Prometheus/DCGM exporter on TCP 9400), Docker/containerd management, and NCCL rendezvous/bootstrap before QPs are established. This is NOT the BMC path -- the host CPU is alive and the OS is running for all traffic on this interface.",
  },
  {
    id: "bmc" as Identity,
    label: "BMC (AST2600 / IPMI)",
    hw: "ASPEED AST2600 SoC (dedicated)",
    ports: "1x 1GbE RJ45 (independent of host NIC)",
    speed: "1 Gbps",
    color: "#7C2D12",
    border: "#F97316",
    bg: "#431407",
    linuxDev: "Not visible to host OS -- independent SoC",
    ipExample: "172.16.2.1 (BMC IP -- separate from host OOB)",
    stack: "ASPEED BMC firmware -- IPMI/Redfish/iKVM over dedicated 1GbE PHY. Independent of host CPU and OS.",
    fabric: "OOB management switch (same physical switch as host OOB, separate VLAN recommended)",
    arp: "Yes -- BMC ARP is independent of host OS",
    kernelInvolved: false,
    detail: "The BMC is a completely separate SoC (ASPEED AST2600, dual-core Cortex-A7 at 1.2 GHz, 512MB DDR4, 128MB SPI NOR flash). It is powered by the server standby rail -- alive as long as AC mains power is present, even when the host is off or panicked. Handles IPMI power control, serial-over-LAN console, hardware sensor polling (temperature, fan, PSU), KVM-over-IP, and Redfish API. Default credentials are admin/admin -- must be changed before production.",
  },
]

export function DGXNetworkInterfacesViz() {
  const [active, setActive] = useState<Identity>("compute")
  const sel = identities.find((i) => i.id === active)!

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">DGX H100 -- four network identities</div>
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
