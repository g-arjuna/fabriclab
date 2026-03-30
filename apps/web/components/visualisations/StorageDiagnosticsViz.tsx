"use client";

import { useState } from "react";

// StorageDiagnosticsViz -- Storage fabric diagnostic command reference
// Organised by layer: NVMe initiator, RDMA/NIC, storage switch, end-to-end

type DiagLayer = "nvme" | "rdma" | "switch" | "e2e";

interface DiagCmd {
  cmd: string;
  what: string;
  good: string;
  bad: string;
}

const DIAG_LAYERS: { id: DiagLayer; label: string; color: string; device: string }[] = [
  { id: "nvme", label: "NVMe Initiator", color: "#a78bfa", device: "DGX host CPU" },
  { id: "rdma", label: "RDMA / NIC", color: "#0ea5e9", device: "DGX CX7 (Slot1/2)" },
  { id: "switch", label: "Storage Switch", color: "#f59e0b", device: "SN4600C" },
  { id: "e2e", label: "End-to-End", color: "#22c55e", device: "DGX initiator" },
];

const DIAG_CMDS: Record<DiagLayer, DiagCmd[]> = {
  nvme: [
    {
      cmd: "nvme list-subsys",
      what: "Lists all NVMe-oF subsystems and their transport type (rdma or tcp)",
      good: "trtype=rdma for all storage subsystems",
      bad: "trtype=tcp means GDS is impossible and latency will be higher",
    },
    {
      cmd: "nvme list",
      what: "Lists all NVMe namespaces with their device path (/dev/nvme0n1 etc.)",
      good: "All expected namespaces listed",
      bad: "Missing namespace means a failed connection or target issue",
    },
    {
      cmd: "nvme error-log /dev/nvme0",
      what: "Shows the error log for the NVMe controller -- command errors and status codes",
      good: "Empty or all status=0x0000 entries",
      bad: "Non-zero status: 0x0004 = data transfer error, 0x0081 = namespace not ready",
    },
    {
      cmd: "nvme smart-log /dev/nvme0n1",
      what: "SMART health log -- distinguishes drive-side failures from fabric failures",
      good: "media_errors=0, num_err_log_entries=0",
      bad: "High media_errors = storage appliance hardware issue (not a fabric problem)",
    },
    {
      cmd: "lsmod | grep nvme_rdma",
      what: "Confirms the NVMe-oF RDMA initiator kernel module is loaded",
      good: "nvme_rdma module shows in lsmod output",
      bad: "Module missing -- NVMe-oF RDMA connections will not establish",
    },
  ],
  rdma: [
    {
      cmd: "rdma stat show dev mlx5_8",
      what: "RDMA statistics for the storage NIC. mlx5_8 = Slot1 port0 on H100 (verify with ibv_devinfo)",
      good: "Counters incrementing, no error fields increasing",
      bad: "retry_exceeded or local_length_error means QP is in error state, connection needs reset",
    },
    {
      cmd: "rdma link show",
      what: "RDMA link state for all RDMA devices",
      good: "All storage NIC ports show ACTIVE state",
      bad: "DOWN state -- link is physically down or misconfigured",
    },
    {
      cmd: "ibv_devinfo -d mlx5_8",
      what: "Confirms CX7 Slot1 is visible to the RDMA layer and shows capabilities",
      good: "state: PORT_ACTIVE, max_mr=2097152",
      bad: "Device not found -- driver not loaded or NIC not seated",
    },
    {
      cmd: "ethtool -S enp170s0f0 | grep -E 'rx_|tx_|err|drop'",
      what: "NIC-level counters including RDMA errors",
      good: "rx_discards_phy=0, tx_errors_phy=0",
      bad: "rx_pause_ctrl_phy non-zero = receiving pause frames (check if PFC is accidentally enabled on switch)",
    },
    {
      cmd: "mlnx_qos -i enp170s0f0 --dscp",
      what: "Shows DSCP-to-priority mapping on the storage NIC",
      good: "DSCP 26 -> priority 3 (or whatever the site standard is)",
      bad: "Mismatch with switch dscp-map = storage traffic queued in wrong priority class",
    },
  ],
  switch: [
    {
      cmd: "nv show interface swp1 counters",
      what: "Interface counters for DGX-facing port on SN4600C",
      good: "Counters incrementing, no errors",
      bad: "RX/TX errors increasing = physical layer or FCS errors",
    },
    {
      cmd: "nv show interface swp1 counters errors",
      what: "Error counters specifically: FCS, alignment, frame errors",
      good: "All zero or static (not incrementing)",
      bad: "Incrementing FCS errors = cable or optics issue on the DGX -> switch segment",
    },
    {
      cmd: "nv show qos interface swp1 buffer",
      what: "Buffer occupancy on the DGX-facing port. Persistent high occupancy = congestion",
      good: "Buffer usage under 20% of total",
      bad: "Near 100% = checkpoint bursts exceeding switch buffer, ECN should fire. Check ECN config.",
    },
    {
      cmd: "nv show qos interface swp1 pfc",
      what: "PFC status -- this should show PFC disabled on a storage switch",
      good: "tx_pause=0, rx_pause=0 -- PFC not enabled",
      bad: "tx_pause non-zero = PFC accidentally enabled. Will cause appliance-side stalls.",
    },
    {
      cmd: "nv show qos dscp-map",
      what: "DSCP-to-priority map on the switch -- must match NIC DSCP config",
      good: "DSCP 26 -> priority 3 (matches mlnx_qos output on the NIC)",
      bad: "DSCP 26 -> priority 0 = storage traffic queued as best-effort alongside management",
    },
  ],
  e2e: [
    {
      cmd: "fio --name=lat --filename=/dev/nvme0n1 --rw=randread --bs=4k --iodepth=1 --numjobs=1 --time_based --runtime=30",
      what: "4K random read latency at queue depth 1 -- baseline end-to-end latency measurement",
      good: "Under 100 microseconds (NVMe-oF RDMA target)",
      bad: "1-2ms = likely TCP fallback or QP error forcing retransmit path",
    },
    {
      cmd: "fio --name=seq --filename=/dev/nvme0n1 --rw=write --bs=4m --iodepth=16 --numjobs=4 --time_based --runtime=60",
      what: "4M sequential write throughput -- simulates checkpoint write pattern",
      good: "Close to 2x NIC port bandwidth (400 Gbps / 50 GB/s for dual 100GbE storage)",
      bad: "Below 50% of expected = oversubscription saturation or GDS not engaged",
    },
    {
      cmd: "lsmod | grep nvidia_fs && gds_check",
      what: "Confirms GPUDirect Storage is operational",
      good: "nvidia_fs module loaded, gds_check reports all checks passed",
      bad: "gds_check errors = PCIe peer-to-peer DMA is blocked (BIOS IOMMU or driver issue)",
    },
    {
      cmd: "nvme list-subsys && nvme discover -t rdma -a 10.20.2.5 -s 4420",
      what: "Rediscovers NVMe-oF targets -- useful after a link flap to verify reconnection",
      good: "Target subsystems listed with trtype=rdma",
      bad: "No response or transport error = fabric connectivity issue (check switch and appliance)",
    },
  ],
};

export function StorageDiagnosticsViz() {
  const [activeLayer, setActiveLayer] = useState<DiagLayer>("nvme");
  const [expanded, setExpanded] = useState<number | null>(null);

  const cmds = DIAG_CMDS[activeLayer];
  const layerInfo = DIAG_LAYERS.find((l) => l.id === activeLayer)!;

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 780 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
          Storage Fabric Diagnostics
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          Commands by Layer
        </div>
      </div>

      {/* Layer tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {DIAG_LAYERS.map((l) => (
          <button
            key={l.id}
            onClick={() => { setActiveLayer(l.id); setExpanded(null); }}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: `1px solid ${activeLayer === l.id ? l.color : "#334155"}`,
              background: activeLayer === l.id ? l.color + "22" : "transparent",
              color: activeLayer === l.id ? l.color : "#64748b",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "monospace",
              fontWeight: activeLayer === l.id ? 700 : 400,
              transition: "all 0.15s",
            }}
          >
            {l.label}
            <span style={{ fontSize: 10, color: activeLayer === l.id ? l.color + "aa" : "#334155", marginLeft: 4 }}>
              ({l.device})
            </span>
          </button>
        ))}
      </div>

      {/* Command list */}
      {cmds.map((cmd, i) => (
        <div
          key={i}
          style={{
            background: "#1e293b",
            borderRadius: 8,
            marginBottom: 8,
            overflow: "hidden",
            border: `1px solid ${expanded === i ? layerInfo.color + "44" : "transparent"}`,
            transition: "border 0.15s",
          }}
        >
          {/* Command header */}
          <div
            onClick={() => setExpanded(expanded === i ? null : i)}
            style={{
              padding: "10px 14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: layerInfo.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#22c55e", fontFamily: "monospace", wordBreak: "break-all" }}>
                $ {cmd.cmd}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{cmd.what}</div>
            </div>
            <div style={{ fontSize: 14, color: "#334155" }}>
              {expanded === i ? "v" : ">"}
            </div>
          </div>

          {/* Expanded detail */}
          {expanded === i && (
            <div style={{ padding: "0 14px 12px 14px", borderTop: "1px solid #334155" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                <div style={{ background: "#0f172a", borderRadius: 6, padding: "8px 10px", borderLeft: "3px solid #22c55e" }}>
                  <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, marginBottom: 4 }}>GOOD OUTPUT</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>{cmd.good}</div>
                </div>
                <div style={{ background: "#0f172a", borderRadius: 6, padding: "8px 10px", borderLeft: "3px solid #ef4444" }}>
                  <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, marginBottom: 4 }}>BAD SIGNAL</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>{cmd.bad}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Triage flow */}
      <div style={{ marginTop: 16, background: "#1e293b", borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>
          Storage fault triage order
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { step: "1", label: "nvme list-subsys", note: "RDMA or TCP?" },
            { step: "2", label: "nvme error-log", note: "any failed I/O?" },
            { step: "3", label: "rdma stat show", note: "QP in error?" },
            { step: "4", label: "switch PFC check", note: "pause frames?" },
            { step: "5", label: "ethtool -S NIC", note: "physical errors?" },
            { step: "6", label: "fio latency", note: "E2E baseline" },
          ].map((s) => (
            <div key={s.step} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#94a3b8", fontWeight: 700, flexShrink: 0 }}>
                {s.step}
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#22c55e" }}>{s.label}</div>
                <div style={{ fontSize: 9, color: "#475569" }}>{s.note}</div>
              </div>
              {s.step !== "6" && <div style={{ color: "#334155", fontSize: 14, marginLeft: 2 }}>-&gt;</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StorageDiagnosticsViz;
