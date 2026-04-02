"use client";

import { useState } from "react";

// GDSPathViz -- Compares the GDS path and the host CPU path side by side
// Shows the software stack, PCIe hops, and where to verify each layer

type Layer = {
  name: string;
  desc: string;
  cmd?: string;
  color: string;
  present: { cpu: boolean; gds: boolean };
};

const LAYERS: Layer[] = [
  {
    name: "PyTorch / Framework",
    desc: "torch.save() or explicit checkpoint write. In GDS mode, cuFile API replaces the standard file I/O path.",
    cmd: "python -c \"import cufile; print(cufile.__version__)\"",
    color: "#f59e0b",
    present: { cpu: true, gds: true },
  },
  {
    name: "cuFile / libcufile",
    desc: "GDS user-space library. Registers HBM buffer as RDMA MR via ibv_reg_mr. Not present in host CPU path.",
    cmd: "ldd /usr/lib/libcufile.so | grep rdma",
    color: "#a78bfa",
    present: { cpu: false, gds: true },
  },
  {
    name: "nvidia-fs kernel module",
    desc: "GPUDirect Storage driver. Opens PCIe peer-to-peer DMA window between GPU and CX7. Not loaded in host CPU path.",
    cmd: "lsmod | grep nvidia_fs",
    color: "#c4b5fd",
    present: { cpu: false, gds: true },
  },
  {
    name: "cudaMemcpy (HBM -> DRAM)",
    desc: "In host CPU path, the framework copies checkpoint tensor from GPU to pinned system DRAM. Consumes one full PCIe crossing. Not needed in GDS path.",
    cmd: "nvidia-smi dmon -s u  # watch PCIe utilisation",
    color: "#ef4444",
    present: { cpu: true, gds: false },
  },
  {
    name: "Pinned DRAM MR",
    desc: "In host CPU path, nvme-rdma registers a pinned DRAM region as RDMA MR at connection setup. The CX7 DMA-reads from here.",
    color: "#f87171",
    present: { cpu: true, gds: false },
  },
  {
    name: "nvme-rdma kernel module",
    desc: "NVMe-oF RDMA initiator driver. Manages queue pairs, posts WQEs, handles CQEs. Present in both paths -- in GDS path, cuFile bypasses its data path but uses its QP connections.",
    cmd: "lsmod | grep nvme_rdma",
    color: "#0ea5e9",
    present: { cpu: true, gds: true },
  },
  {
    name: "libibverbs / rdma-core",
    desc: "RDMA verbs user-space library. ibv_reg_mr, ibv_post_send, ibv_poll_cq. Used by both nvme-rdma and cuFile.",
    cmd: "ibv_devinfo -d mlx5_8",
    color: "#22c55e",
    present: { cpu: true, gds: true },
  },
  {
    name: "ConnectX-7 NIC Firmware",
    desc: "CX7 firmware DMA-reads data from registered MR (HBM in GDS, DRAM in CPU path). Builds RoCEv2 frame. Hardware-offloaded -- no CPU involvement in data movement.",
    cmd: "ethtool -S enp170s0f0 | grep tx_bytes",
    color: "#4ade80",
    present: { cpu: true, gds: true },
  },
  {
    name: "PCIe 5.0 x16 (HBM -> DRAM)",
    desc: "First PCIe crossing in host CPU path only. GPU HBM to system DRAM. ~64 GB/s peak. Bottleneck for large checkpoints.",
    color: "#ef444455",
    present: { cpu: true, gds: false },
  },
  {
    name: "PCIe 5.0 x16 (-> CX7 NIC)",
    desc: "Data exits the server here. In GDS path, the CX7 reads from HBM directly (peer-to-peer). In CPU path, it reads from DRAM. One crossing in GDS, two in CPU path.",
    color: "#22c55e",
    present: { cpu: true, gds: true },
  },
  {
    name: "Storage Fabric (SN4600C)",
    desc: "L3 hop from DGX storage leaf switch to storage appliance. Identical for both paths.",
    color: "#f59e0b",
    present: { cpu: true, gds: true },
  },
];

export function GDSPathViz() {
  const [selected, setSelected] = useState<number | null>(null);

  const selectedLayer = selected !== null ? LAYERS[selected] : null;

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 780 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
          GPUDirect Storage
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          GDS vs Host CPU Path -- Stack Comparison
        </div>
      </div>

      {/* Column headers */}
      <div style={{ overflowX: "auto", paddingBottom: 6 }}>
        <div style={{ minWidth: 520 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px", gap: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#64748b" }}>SOFTWARE / HARDWARE LAYER</div>
            <div style={{ fontSize: 11, color: "#f87171", textAlign: "center" }}>HOST CPU PATH</div>
            <div style={{ fontSize: 11, color: "#22c55e", textAlign: "center" }}>GDS PATH</div>
          </div>

          {LAYERS.map((layer, i) => (
            <div
              key={i}
              onClick={() => setSelected(selected === i ? null : i)}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 100px 100px",
                gap: 8,
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: 6,
                cursor: "pointer",
                background: selected === i ? "#1e293b" : "transparent",
                border: `1px solid ${selected === i ? layer.color + "55" : "transparent"}`,
                marginBottom: 3,
                transition: "all 0.1s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: layer.color, flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: selected === i ? "#e2e8f0" : "#94a3b8", fontWeight: selected === i ? 600 : 400 }}>
                  {layer.name}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                {layer.present.cpu
                  ? <span style={{ color: "#f87171", fontSize: 14 }}>YES</span>
                  : <span style={{ color: "#334155", fontSize: 14 }}>--</span>}
              </div>
              <div style={{ textAlign: "center" }}>
                {layer.present.gds
                  ? <span style={{ color: "#22c55e", fontSize: 14 }}>YES</span>
                  : <span style={{ color: "#334155", fontSize: 14 }}>--</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selectedLayer && (
        <div style={{
          marginTop: 16,
          background: "#1e293b",
          borderRadius: 8,
          padding: "12px 16px",
          borderLeft: `3px solid ${selectedLayer.color}`,
        }}>
          <div style={{ fontSize: 13, color: selectedLayer.color, fontWeight: 700, marginBottom: 5 }}>{selectedLayer.name}</div>
          <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.65, marginBottom: selectedLayer.cmd ? 8 : 0 }}>
            {selectedLayer.desc}
          </div>
          {selectedLayer.cmd && (
            <div style={{ background: "#0f172a", borderRadius: 4, padding: "6px 10px", fontSize: 11, color: "#22c55e", fontFamily: "monospace" }}>
              $ {selectedLayer.cmd}
            </div>
          )}
        </div>
      )}

      {/* PCIe crossing summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 20 }}>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 11, color: "#f87171", fontWeight: 700, marginBottom: 6 }}>Host CPU Path -- PCIe crossings</div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
            1. GPU HBM -&gt; system DRAM (cudaMemcpy)<br />
            2. system DRAM -&gt; CX7 NIC (DMA read)<br />
            Total: 2 x ~64 GB/s PCIe crossings
          </div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, marginBottom: 6 }}>GDS Path -- PCIe crossings</div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
            1. GPU HBM -&gt; CX7 NIC (peer-to-peer DMA)<br />
            Total: 1 x ~64 GB/s PCIe crossing<br />
            ~2x improvement for large sequential writes
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, padding: "8px 12px", borderRadius: 6, background: "#1e293b", borderLeft: "3px solid #f59e0b" }}>
        <div style={{ fontSize: 11, color: "#94a3b8" }}>
          GDS requires: <span style={{ color: "#fbbf24" }}>nvidia-fs module</span> loaded +
          {" "}<span style={{ color: "#fbbf24" }}>NVMe-oF RDMA transport</span> (not TCP) +
          {" "}<span style={{ color: "#fbbf24" }}>GDS-capable storage appliance</span>.
          Verify: <span style={{ color: "#22c55e" }}>gds_check</span>
        </div>
      </div>
    </div>
  );
}

export default GDSPathViz;
