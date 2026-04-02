"use client"
import { useState } from "react"

// -- ConnectX7PipelineViz -------------------------
// Shows ConnectX-7 firmware pipeline: WQE dequeue -> DMA -> BTH -> UDP/IP -> Ethernet -> DSCP -> PAM-4

const stages = [
  {
    id: 1, name: "WQE dequeue",
    hw: "Send Engine",
    desc: "HCA polls Send Queue ring buffer. Reads WQE: operation (RDMA_WRITE), remote VA, RKEY, scatter-gather list pointing into GPU HBM, QPN of remote peer.",
    fields: [
      { k: "op", v: "RDMA_WRITE (0x0A)" },
      { k: "remote_va", v: "0x7f3a00000000" },
      { k: "rkey", v: "0x00000001" },
      { k: "sg_va", v: "0x6f0000000000 (GPU HBM)" },
      { k: "len", v: "134217728 (128 MiB)" },
      { k: "dst_qpn", v: "0x000042" },
    ],
    packet: null,
  },
  {
    id: 2, name: "Payload DMA from GPU HBM",
    hw: "PCIe DMA engine",
    desc: "HCA DMA-reads gradient tensor from GPU HBM directly via PCIe peer-to-peer (GPUDirect RDMA). No system RAM. No CPU copies. Segments into 4200B chunks for MTU.",
    fields: [
      { k: "dma_source", v: "GPU HBM 0x6f0000000000" },
      { k: "pcie_path", v: "GPU -> NVSwitch -> CX7" },
      { k: "mtu", v: "4096 bytes (typical RoCEv2 jumbo MTU)" },
      { k: "payload_per_pkt", v: "~4026B first pkt, ~4042B remaining" },
      { k: "num_segments", v: "~32,000 pkts for 128 MiB (MTU-dependent)" },
      { k: "cpu_involvement", v: "ZERO" },
    ],
    packet: null,
  },
  {
    id: 3, name: "BTH construction",
    hw: "Transport engine",
    desc: "HCA builds InfiniBand Base Transport Header. PSN incremented per packet. Opcode: RDMA_WRITE_FIRST (first seg), MIDDLE, LAST. QPair from WQE dst_qpn.",
    fields: [
      { k: "opcode", v: "0x06 RDMA_WRITE_FIRST" },
      { k: "pkey", v: "0xFFFF (default)" },
      { k: "dst_qpn", v: "0x000042" },
      { k: "ack_req", v: "0 (no ACK on middle pkts)" },
      { k: "psn", v: "0x001F3A (increments per pkt)" },
    ],
    packet: ["BTH (12B)", "RETH (16B, first pkt only)", "Payload (4172B)"],
  },
  {
    id: 4, name: "UDP + IP header construction",
    hw: "RoCEv2 engine",
    desc: "RoCEv2 mode: wrap BTH in UDP/IP. Source UDP port derived from hash of local QPN (provides entropy for switch ECMP hash). Destination always 4791. DSCP 46 for lossless priority.",
    fields: [
      { k: "udp_src", v: "49512 (hash of QPN=local)" },
      { k: "udp_dst", v: "4791 (IANA RoCEv2, fixed)" },
      { k: "src_ip", v: "10.1.1.1 (mlx5_0 IP)" },
      { k: "dst_ip", v: "10.2.1.1 (remote HCA IP)" },
      { k: "dscp", v: "46 (EF -- maps to lossless PFC priority, site-configurable)" },
      { k: "ttl", v: "64" },
      { k: "df_bit", v: "set (no fragmentation)" },
    ],
    packet: ["IPv4 (20B)", "UDP (8B)", "BTH (12B)", "RETH (16B)", "Payload (4172B)"],
  },
  {
    id: 5, name: "Ethernet frame construction",
    hw: "Ethernet engine",
    desc: "Outer Ethernet header appended. Destination MAC is the leaf switch gateway MAC -- learned via ARP on HCA bring-up. Source MAC is the HCA's burned-in hardware MAC. No VLAN tag on uplinks in a routed fabric.",
    fields: [
      { k: "dst_mac", v: "aa:bb:cc:11:22:33 (leaf sw)" },
      { k: "src_mac", v: "94:6d:ae:aa:bb:cc (CX7)" },
      { k: "ethertype", v: "0x0800 (IPv4)" },
      { k: "vlan", v: "absent (routed uplink)" },
      { k: "fcs", v: "CRC32 (4B, auto-generated)" },
    ],
    packet: ["Ethernet (14B)", "IPv4 (20B)", "UDP (8B)", "BTH (12B)", "RETH (16B)", "Payload (4172B)", "FCS (4B)"],
  },
  {
    id: 6, name: "DSCP -> PFC priority mapping",
    hw: "QoS engine",
    desc: "DSCP 46 is mapped to a lossless PFC priority via mlnx_qos trust configuration. The priority number is site-configurable -- NVIDIA BasePOD reference uses priority 3, some deployments use priority 5. What is required is that this mapping is identical on the NIC and every switch in the fabric. A mismatch causes RoCEv2 traffic to be dropped silently under congestion.",
    fields: [
      { k: "dscp_value", v: "46 (EF)" },
      { k: "pfc_priority", v: "3 (BasePOD ref) or 5 (some defaults) -- site config" },
      { k: "verify_cmd", v: "mlnx_qos -i mlx5_0 --dscp" },
      { k: "switch_cmd", v: "show qos dscp-map (must match NIC)" },
      { k: "mismatch_result", v: "Silent drops under congestion" },
    ],
    packet: null,
  },
  {
    id: 7, name: "PAM-4 encoding -> wire",
    hw: "SerDes + OSFP transceiver",
    desc: "Ethernet frame serialised at 400G: 8 lanes x 50 Gbps, PAM-4 modulation (2 bits per symbol, 4 signal levels). 200G RS-FEC (Reed-Solomon Forward Error Correction) on each 100G lane pair. Frame exits via OSFP transceiver as optical signal.",
    fields: [
      { k: "lanes", v: "8 x 50 Gbps" },
      { k: "modulation", v: "PAM-4 (4-level, 2 bits/symbol)" },
      { k: "fec", v: "200G RS-FEC (RS(544,514))" },
      { k: "frame_time", v: "4228B / 400G ~= 84.6 ns/packet" },
      { k: "transceiver", v: "400G OSFP (optical) or DAC copper" },
    ],
    packet: null,
  },
]

export function ConnectX7PipelineViz() {
  const [stage, setStage] = useState(0)
  const s = stages[stage]

  const colors = ["#185FA5", "#0F6E56", "#712B13", "#854F0B", "#6B21A8", "#185FA5", "#0F6E56"]
  const borders = ["#378ADD", "#1D9E75", "#D85A30", "#BA7517", "#9333EA", "#378ADD", "#1D9E75"]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">ConnectX-7 packet construction pipeline</div>
      <div className="mb-5 text-xs text-slate-600">7 firmware stages from WQE to wire. Select a stage to inspect fields.</div>

      <div style={{ overflowX: "auto", paddingBottom: 6, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid #334155", minWidth: 560 }}>
          {stages.map((st, i) => (
            <button
              key={st.id}
              onClick={() => setStage(i)}
              style={{
                flex: 1,
                padding: "8px 6px",
                background: stage === i ? colors[i] : "#1e293b",
                border: "none",
                borderRight: i < stages.length - 1 ? "1px solid #334155" : "none",
                cursor: "pointer",
                fontSize: 9,
                color: stage === i ? "#fff" : "#475569",
                fontWeight: stage === i ? 500 : 400,
                transition: "all 0.15s",
                lineHeight: 1.3,
              }}
            >
              {st.id}. {st.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 14 }}>
        <div style={{ background: "#1e293b", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 8 }}>Stage {s.id} -- {s.name}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6, marginBottom: 10 }}>{s.desc}</div>
          <div style={{ fontSize: 10, color: colors[stage], marginBottom: 6 }}>Hardware unit: {s.hw}</div>
        </div>
        <div style={{ background: "#111827", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 8 }}>Fields at this stage</div>
          {s.fields.map((f) => (
            <div key={f.k} style={{ display: "flex", gap: 8, marginBottom: 5, alignItems: "baseline", flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", minWidth: 110 }}>{f.k}:</span>
              <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace", lineHeight: 1.6, wordBreak: "break-word" }}>{f.v}</span>
            </div>
          ))}
        </div>
      </div>

      {s.packet && (
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 8 }}>Packet structure after this stage</div>
          <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
            {s.packet.map((layer, i) => (
              <div key={i} style={{ background: colors[i % colors.length], borderRadius: 4, padding: "4px 8px", fontSize: 10, color: "#fff", fontFamily: "monospace" }}>
                {layer}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 8 }}>
            Total frame: {s.packet.reduce((acc, l) => {
              const match = l.match(/\((\d+)B\)/)
              return acc + (match ? parseInt(match[1]) : 0)
            }, 0)}B
          </div>
        </div>
      )}
    </div>
  )
}

export default ConnectX7PipelineViz
