"use client";

import { useState } from "react";

// StorageDMAPathViz -- Traces the DMA path for an NVMe-oF write
// Two modes: host CPU path (data bounces through DRAM) vs GDS path (direct HBM -> CX7)

type PathMode = "cpu" | "gds";

const STEPS_CPU = [
  {
    id: "hbm",
    label: "GPU HBM",
    sub: "A100 / H100 80 GB HBM3",
    icon: "GPU",
    color: "#a78bfa",
    note: "Model weights live here after forward/backward pass",
  },
  {
    id: "pcie1",
    label: "PCIe 5.0 x16",
    sub: "~64 GB/s peak",
    icon: "BUS",
    color: "#64748b",
    note: "First PCIe crossing: GPU -> CPU/DRAM. Bottleneck in host CPU path.",
    isLink: true,
  },
  {
    id: "dram",
    label: "Pinned DRAM",
    sub: "Registered MR",
    icon: "CPU",
    color: "#0ea5e9",
    note: "ibv_reg_mr registers this as an RDMA Memory Region. The CX7 knows the IOVA mapping.",
  },
  {
    id: "pcie2",
    label: "PCIe 5.0 x16",
    sub: "~64 GB/s peak",
    icon: "BUS",
    color: "#64748b",
    note: "Second PCIe crossing: DRAM -> CX7 NIC. DMA-read by CX7 firmware.",
    isLink: true,
  },
  {
    id: "cx7",
    label: "ConnectX-7 NIC",
    sub: "Slot1 or Slot2 (storage)",
    icon: "NIC",
    color: "#22c55e",
    note: "CX7 DMA-reads from the registered DRAM MR, builds the RoCEv2 frame, puts it on the wire.",
  },
  {
    id: "switch",
    label: "Storage Switch",
    sub: "SN4600C 100GbE",
    icon: "SW",
    color: "#f59e0b",
    note: "No PFC. ECN thresholds set for bursty checkpoint traffic. 2:1 oversubscription.",
    isLink: true,
  },
  {
    id: "target",
    label: "Storage Appliance",
    sub: "NVMe-oF target",
    icon: "STO",
    color: "#f87171",
    note: "WEKA, DDN, NetApp or similar. NVMe-oF target controller accepts SQE capsule and acknowledges.",
  },
];

const STEPS_GDS = [
  {
    id: "hbm",
    label: "GPU HBM",
    sub: "A100 / H100 80 GB HBM3",
    icon: "GPU",
    color: "#a78bfa",
    note: "Model weights live here. nvidia-fs registers HBM pages directly as an RDMA MR.",
  },
  {
    id: "pcie1",
    label: "PCIe 5.0 x16",
    sub: "~64 GB/s peak -- used ONCE",
    icon: "BUS",
    color: "#22c55e",
    note: "Single PCIe crossing: CX7 DMA-reads directly from HBM. No bounce buffer. Peer-to-peer DMA window.",
    isLink: true,
  },
  {
    id: "cx7",
    label: "ConnectX-7 NIC",
    sub: "Slot1 or Slot2 (storage)",
    icon: "NIC",
    color: "#22c55e",
    note: "CX7 DMA-reads from HBM MR (RKEY was published in SQE SGL), builds RoCEv2 frame.",
  },
  {
    id: "switch",
    label: "Storage Switch",
    sub: "SN4600C 100GbE",
    icon: "SW",
    color: "#f59e0b",
    note: "Same storage fabric switch. No change here -- the difference is upstream.",
    isLink: true,
  },
  {
    id: "target",
    label: "Storage Appliance",
    sub: "NVMe-oF target (GDS-capable)",
    icon: "STO",
    color: "#f87171",
    note: "Target must support GDS on its side (WEKA, DDN, NetApp, Pure FlashBlade with NVMe-oF RDMA).",
  },
];

const ICON_LABELS: Record<string, string> = {
  GPU: "GPU",
  CPU: "CPU",
  NIC: "NIC",
  SW: "SW",
  STO: "STO",
  BUS: "-->",
};

export function StorageDMAPathViz() {
  const [mode, setMode] = useState<PathMode>("cpu");
  const [selected, setSelected] = useState<string | null>(null);

  const steps = mode === "cpu" ? STEPS_CPU : STEPS_GDS;
  const selectedStep = steps.find((s) => s.id === selected);

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 780 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
          Storage DMA Path
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          GPU HBM to Storage Appliance
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["cpu", "gds"] as PathMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setSelected(null); }}
            style={{
              padding: "7px 18px",
              borderRadius: 6,
              border: `1px solid ${mode === m ? "#6366f1" : "#334155"}`,
              background: mode === m ? "#6366f122" : "transparent",
              color: mode === m ? "#818cf8" : "#94a3b8",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "monospace",
              fontWeight: mode === m ? 700 : 400,
            }}
          >
            {m === "cpu" ? "Host CPU Path" : "GDS Path (GPUDirect Storage)"}
          </button>
        ))}
      </div>

      {/* PCIe crossing callout */}
      <div style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        marginBottom: 20,
        padding: "8px 12px",
        borderRadius: 6,
        background: mode === "cpu" ? "#7f1d1d22" : "#14532d22",
        border: `1px solid ${mode === "cpu" ? "#ef444422" : "#22c55e22"}`,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: mode === "cpu" ? "#f87171" : "#22c55e", flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: "#94a3b8" }}>
          {mode === "cpu"
            ? "PCIe crossings: 2 (HBM -> DRAM, then DRAM -> CX7). The bounce buffer doubles PCIe load."
            : "PCIe crossings: 1 (HBM -> CX7 directly). nvidia-fs opens a peer-to-peer DMA window."}
        </div>
      </div>

      {/* Path diagram */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
        {steps.map((step, i) => (
          <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
            {step.isLink ? (
              /* Link/bus connector */
              <div
                onClick={() => setSelected(selected === step.id ? null : step.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                  padding: "0 4px",
                }}
              >
                <div style={{
                  width: 56,
                  height: 3,
                  background: selected === step.id ? step.color : step.color + "88",
                  borderRadius: 2,
                  marginBottom: 4,
                  transition: "background 0.15s",
                }} />
                <div style={{ fontSize: 9, color: selected === step.id ? step.color : "#475569", textAlign: "center", maxWidth: 60, lineHeight: 1.3 }}>
                  {step.sub}
                </div>
              </div>
            ) : (
              /* Node box */
              <div
                onClick={() => setSelected(selected === step.id ? null : step.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: 8,
                  background: selected === step.id ? step.color + "33" : "#1e293b",
                  border: `2px solid ${selected === step.id ? step.color : step.color + "44"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: step.color,
                  transition: "all 0.15s",
                  marginBottom: 6,
                }}>
                  {ICON_LABELS[step.icon]}
                </div>
                <div style={{ fontSize: 10, color: selected === step.id ? step.color : "#94a3b8", textAlign: "center", maxWidth: 60, lineHeight: 1.3, fontWeight: selected === step.id ? 700 : 400 }}>
                  {step.label}
                </div>
                <div style={{ fontSize: 9, color: "#475569", textAlign: "center", maxWidth: 60 }}>{step.sub}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {selectedStep && (
        <div style={{
          marginTop: 20,
          background: "#1e293b",
          borderRadius: 8,
          padding: "12px 16px",
          borderLeft: `3px solid ${selectedStep.color}`,
          animation: "fadeIn 0.15s ease",
        }}>
          <div style={{ fontSize: 13, color: selectedStep.color, fontWeight: 700, marginBottom: 6 }}>{selectedStep.label}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.65 }}>{selectedStep.note}</div>
        </div>
      )}

      {!selected && (
        <div style={{ marginTop: 12, fontSize: 11, color: "#334155", textAlign: "center" }}>
          click any node or link for details
        </div>
      )}
    </div>
  );
}

export default StorageDMAPathViz;
