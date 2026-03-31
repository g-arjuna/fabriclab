"use client";

import { useState } from "react";

// ComputeVsStorageFabricViz -- Side-by-side comparison of compute and storage fabric
// Dimension-by-dimension comparison with expandable detail for each row

interface Row {
  dim: string;
  compute: string;
  storage: string;
  detail: string;
  risk?: string;
}

const ROWS: Row[] = [
  {
    dim: "NIC hardware",
    compute: "8x single-port CX7 HCA per DGX",
    storage: "2x dual-port CX7 NIC per DGX (Slot1 + Slot2)",
    detail: "The compute CX7s are configured in RDMA mode (ibp* in IB, mlx5_0-7 in RoCEv2). The storage CX7s are in Ethernet NIC mode with RDMA verbs enabled. mlx5_8 and mlx5_9 on Slot1, mlx5_1/2 on Slot2 (varies by host).",
  },
  {
    dim: "Switch hardware",
    compute: "QM9700 (InfiniBand HDR) or SN5600 (RoCEv2)",
    storage: "SN4600C 100GbE or similar",
    detail: "QM9700 is an InfiniBand-native switch -- it understands IB routing, LIDs, and SM. SN4600C is a standard Ethernet/IP switch with no IB awareness. Storage switches are simpler, cheaper, and lower port density is acceptable.",
  },
  {
    dim: "Topology",
    compute: "Rail-optimised fat-tree, full bisection (1:1)",
    storage: "Simple leaf, 2:1 oversubscription acceptable",
    detail: "Compute topology is rail-optimised: each rail connects a GPU port on every DGX to a dedicated leaf switch. This ensures any two GPUs on the same rail have exactly one hop. Storage topology does not need this -- NVMe-oF checkpoint writes are not all-to-all.",
    risk: "Never put storage and compute traffic on the same physical switches. The PFC and ECN configurations conflict.",
  },
  {
    dim: "Transport protocol",
    compute: "RDMA (InfiniBand or RoCEv2)",
    storage: "NVMe-oF RDMA (preferred) or NVMe/TCP",
    detail: "Both use RDMA verbs at the NIC layer, but the application protocol above RDMA is completely different. Compute uses NCCL-level RDMA Write for AllReduce data movement. Storage NVMe-oF uses RDMA Send to deliver the NVMe SQE capsule, then the target pulls the data payload via RDMA Read (target-pull model) -- the target issues an RDMA Read WQE against the initiator's registered MR, and the initiator CX7 responds with RDMA Read Response frames.",
  },
  {
    dim: "PFC",
    compute: "Required -- lossless for AllReduce",
    storage: "NOT used in most storage fabric designs",
    detail: "Compute AllReduce is extremely sensitive to packet loss -- a single dropped packet stalls all 8 GPU ranks until the retransmit fires. Storage NVMe-oF reconnects gracefully from packet loss. Running PFC on the storage fabric risks pause frame propagation to the storage appliances.",
    risk: "If you see tx_pause on a storage switch port, PFC is accidentally enabled. Disable it immediately.",
  },
  {
    dim: "Congestion control",
    compute: "DCQCN with tight thresholds (Kmin ~80KB, Kmax ~400KB)",
    storage: "ECN only, larger thresholds (Kmin ~200KB, Kmax ~1MB)",
    detail: "Compute fabric uses DCQCN to prevent congestion in the first place -- the thresholds are tight because individual GPU messages are small (256 KB - 4 MB chunks) and latency matters. Storage checkpoint writes are large sequential bursts. Higher ECN thresholds allow the switch to absorb the burst without triggering rate reduction prematurely.",
  },
  {
    dim: "Traffic pattern",
    compute: "All-to-all, synchronised (AllReduce barrier)",
    storage: "Burst writes (checkpoint), sequential reads (dataset load)",
    detail: "Compute AllReduce is perfectly synchronised -- all 8 GPU ranks inject traffic simultaneously at a barrier. This creates incast congestion patterns that require PFC+DCQCN. Storage checkpoint writes are triggered by one node at a time (or small groups), and are large sequential blocks not small messages.",
  },
  {
    dim: "Payload",
    compute: "NCCL messages (RDMA Write chunks, 256KB-4MB typical)",
    storage: "NVMe command capsules (64B SQE) + RDMA Read data (target-pull, 4MB block)",
    detail: "The NVMe-oF SQE capsule is tiny (64 bytes) but triggers a large data transfer via RDMA Read (target-pull): the target issues a Read request against the initiator MR, and the initiator CX7 sends RDMA Read Response frames with the checkpoint payload. The frame anatomy is the same outer structure (Ethernet/IP/UDP/BTH) but the BTH opcodes (0x0D-0x10 for Read Response vs 0x06-0x08 for Write) and payload semantics are completely different from NCCL traffic.",
  },
  {
    dim: "GDS capable",
    compute: "Not applicable",
    storage: "Yes (RDMA transport only, requires nvidia-fs module)",
    detail: "GPUDirect Storage only works on the storage fabric, because it relies on NVMe-oF RDMA to carry the data. It cannot be used over NVMe/TCP, and it has nothing to do with the compute fabric.",
  },
  {
    dim: "Key diagnostic",
    compute: "ibstat, perfquery, DCGM, UFM",
    storage: "nvme error-log, rdma stat, fio, gds_check",
    detail: "UFM only covers InfiniBand fabrics. There is no equivalent management plane for the storage fabric. Storage fabric faults surface through NVMe error logs, RDMA QP error counters, and end-to-end I/O latency measurements.",
  },
];

export function ComputeVsStorageFabricViz() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showRisks, setShowRisks] = useState(false);

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 820 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
          Fabric Comparison
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          Compute Fabric vs Storage Fabric
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center" }}>
        <button
          onClick={() => setShowRisks(!showRisks)}
          style={{
            padding: "5px 12px",
            borderRadius: 5,
            border: `1px solid ${showRisks ? "#ef4444" : "#334155"}`,
            background: showRisks ? "#ef444422" : "transparent",
            color: showRisks ? "#f87171" : "#64748b",
            cursor: "pointer",
            fontSize: 11,
            fontFamily: "monospace",
          }}
        >
          {showRisks ? "Hiding risks" : "Show misconfiguration risks"}
        </button>
        <div style={{ fontSize: 11, color: "#334155" }}>click any row for detail</div>
      </div>

      {/* Header row */}
      <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 1fr", gap: 8, marginBottom: 8, padding: "0 10px" }}>
        <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase" }}>Dimension</div>
        <div style={{ fontSize: 10, color: "#6366f1", textTransform: "uppercase" }}>Compute Fabric</div>
        <div style={{ fontSize: 10, color: "#0ea5e9", textTransform: "uppercase" }}>Storage Fabric</div>
      </div>

      {/* Data rows */}
      {ROWS.map((row, i) => (
        <div
          key={i}
          style={{
            marginBottom: 4,
            borderRadius: 8,
            overflow: "hidden",
            border: `1px solid ${expanded === i ? "#334155" : "transparent"}`,
            transition: "border 0.15s",
          }}
        >
          {/* Row header */}
          <div
            onClick={() => setExpanded(expanded === i ? null : i)}
            style={{
              display: "grid",
              gridTemplateColumns: "150px 1fr 1fr",
              gap: 8,
              padding: "8px 10px",
              cursor: "pointer",
              background: expanded === i ? "#1e293b" : "#0f172a",
              transition: "background 0.1s",
            }}
          >
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{row.dim}</div>
            <div style={{ fontSize: 11, color: "#a5b4fc", lineHeight: 1.4 }}>{row.compute}</div>
            <div style={{ fontSize: 11, color: "#7dd3fc", lineHeight: 1.4 }}>{row.storage}</div>
          </div>

          {/* Expanded detail */}
          {expanded === i && (
            <div style={{ background: "#1e293b", padding: "10px 12px", borderTop: "1px solid #334155" }}>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.65, marginBottom: row.risk && showRisks ? 10 : 0 }}>
                {row.detail}
              </div>
              {row.risk && showRisks && (
                <div style={{ background: "#7f1d1d22", borderRadius: 6, padding: "8px 10px", borderLeft: "3px solid #ef4444" }}>
                  <div style={{ fontSize: 10, color: "#f87171", fontWeight: 700, marginBottom: 3 }}>MISCONFIGURATION RISK</div>
                  <div style={{ fontSize: 11, color: "#fca5a5" }}>{row.risk}</div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Key insight box */}
      <div style={{ marginTop: 16, background: "#1e293b", borderRadius: 8, padding: "12px 14px", borderLeft: "3px solid #f59e0b" }}>
        <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: 700, marginBottom: 6 }}>The core confusion to avoid</div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.65 }}>
          Both fabrics use ConnectX-7 NICs and RoCEv2 framing. This does NOT mean they share a configuration.
          The PFC requirement, ECN thresholds, and traffic patterns are fundamentally different.
          A storage fabric misconfigured as a compute fabric (with PFC enabled) will pause-storm on
          checkpoint bursts. A compute fabric misconfigured as a storage fabric (PFC disabled) will drop
          packets and destroy AllReduce performance.
        </div>
      </div>
    </div>
  );
}

export default ComputeVsStorageFabricViz;
