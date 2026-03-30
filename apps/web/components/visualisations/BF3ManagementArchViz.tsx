"use client";

import { useState } from "react";

// BF3ManagementArchViz -- Compares DGX H100 and DGX B200 management architecture
// H100: CX7 NICs only, host CPU runs NVMe-oF initiator
// B200: BlueField-3 DPUs with ARM cores, ARM runs NVMe-oF initiator + rshim path

type Platform = "h100" | "b200";

export function BF3ManagementArchViz() {
  const [platform, setPlatform] = useState<Platform>("h100");
  const [selected, setSelected] = useState<string | null>(null);

  type Block = {
    id: string; label: string; sub: string; color: string;
    x: number; y: number; w: number; h: number; detail: string; cmd?: string;
  };

  const H100_BLOCKS: Block[] = [
    {
      id: "h100_gpu", label: "8x NVIDIA H100 GPU", sub: "NVLink + HBM3",
      color: "#22c55e", x: 20, y: 20, w: 220, h: 40,
      detail: "8 GPUs in the DGX H100 chassis. Connected via NVLink 4.0 for intra-node communication. Compute fabric uses 8x single-port CX7 HCA.",
    },
    {
      id: "h100_cpu", label: "2x Intel Xeon Platinum 8480+", sub: "Host CPU (60 cores each)",
      color: "#6366f1", x: 20, y: 80, w: 220, h: 40,
      detail: "The host CPU runs the DGX OS (Ubuntu), NVMe-oF initiator (nvme-rdma), DCGM exporter, NVSM agents, and all management daemons. NVMe-oF is fully host-CPU-driven -- no offload.",
    },
    {
      id: "h100_cx7_compute", label: "8x CX7 HCA (mlx5_0-7)", sub: "Compute fabric (400GbE/HDR)",
      color: "#0ea5e9", x: 20, y: 140, w: 220, h: 40,
      detail: "Eight single-port ConnectX-7 HCAs. Compute RDMA traffic only. Each connects to a rail on the compute leaf switch. No management role.",
    },
    {
      id: "h100_cx7_stor", label: "2x dual-port CX7 NIC (Slot1/2)", sub: "Storage + in-band mgmt",
      color: "#f59e0b", x: 20, y: 200, w: 220, h: 40,
      detail: "Two dual-port CX7 NICs in PCIe Slot1 and Slot2. enp170s0f0/1 (Slot1) and enp41s0f0/1 (Slot2) carry NVMe-oF storage and in-band management SSH/monitoring traffic. The host CPU (nvme-rdma driver) drives all NVMe-oF operations.",
      cmd: "nvme list-subsys  # on host CPU",
    },
    {
      id: "h100_bmc", label: "AST2600 BMC (iDRAC)", sub: "1GbE OOB port -> OOB switch",
      color: "#f87171", x: 20, y: 260, w: 220, h: 40,
      detail: "Standard BMC via OOB 1GbE. IPMI/Redfish for power control and hardware monitoring. Completely independent of the CX7 NICs. This is the ONLY out-of-band path on the H100.",
      cmd: "ipmitool -I lanplus -H 10.0.1.10 -U admin -P pass chassis status",
    },
  ];

  const B200_BLOCKS: Block[] = [
    {
      id: "b200_gpu", label: "8x NVIDIA B200 GPU", sub: "NVLink 5.0 + HBM3e",
      color: "#22c55e", x: 20, y: 20, w: 220, h: 40,
      detail: "8 Blackwell GPUs in the DGX B200. Compute fabric uses 4x single-port CX7 HCA (fewer than H100 because B200 PCIe topology differs).",
    },
    {
      id: "b200_cpu", label: "2x Intel Xeon Platinum", sub: "Host CPU",
      color: "#6366f1", x: 20, y: 80, w: 220, h: 40,
      detail: "The host CPU runs the DGX OS and orchestration software but does NOT run the NVMe-oF initiator. That responsibility has been offloaded to the BlueField-3 ARM cores.",
    },
    {
      id: "b200_cx7", label: "4x CX7 HCA (compute fabric)", sub: "200/400GbE per port",
      color: "#0ea5e9", x: 20, y: 140, w: 220, h: 40,
      detail: "Four single-port CX7 HCAs for the compute fabric. Fewer than H100 due to different PCIe topology on the B200 platform.",
    },
    {
      id: "b200_bf3", label: "2x BlueField-3 DPU (NIC mode)", sub: "Dual-port, storage + mgmt",
      color: "#a78bfa", x: 20, y: 200, w: 220, h: 70,
      detail: "This is the key difference. Two dual-port BlueField-3 DPUs replace the CX7 Slot1/Slot2 NICs. Each BF3 has 8x ARM Cortex-A78 cores running ARM Linux. The NVMe-oF initiator runs on the BF3 ARM cores. The host communicates with the BF3 via rshim (PCIe character device).",
      cmd: "lsmod | grep rshim  # on host  |  nvme list-subsys  # on BF3 ARM Linux",
    },
    {
      id: "b200_bmc", label: "AST2600 BMC + BF3 OOB port", sub: "Two OOB paths",
      color: "#f87171", x: 20, y: 290, w: 220, h: 40,
      detail: "The B200 has two OOB paths: the standard AST2600 BMC 1GbE (for power and hardware monitoring) AND the BlueField-3 oob_net0 interface (for ARM Linux management, NVMe-oF initiator diagnostics, BFB firmware updates). Both connect to the OOB switch.",
      cmd: "ssh ubuntu@<BF3-OOB-IP>  # direct ARM Linux access",
    },
  ];

  const blocks = platform === "h100" ? H100_BLOCKS : B200_BLOCKS;
  const selectedBlock = blocks.find((b) => b.id === selected);

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 800 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>BlueField-3 Architecture</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>DGX H100 vs DGX B200 -- Management Model</div>
      </div>

      {/* Platform toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["h100", "b200"] as Platform[]).map((p) => (
          <button key={p} onClick={() => { setPlatform(p); setSelected(null); }} style={{
            padding: "7px 20px", borderRadius: 6,
            border: `1px solid ${platform === p ? "#6366f1" : "#334155"}`,
            background: platform === p ? "#6366f122" : "transparent",
            color: platform === p ? "#818cf8" : "#64748b",
            cursor: "pointer", fontSize: 12, fontFamily: "monospace", fontWeight: platform === p ? 700 : 400,
          }}>
            DGX {p.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Key difference callout */}
      {platform === "b200" && (
        <div style={{ background: "#312e8122", borderRadius: 8, padding: "10px 14px", marginBottom: 16, borderLeft: "3px solid #a78bfa" }}>
          <div style={{ fontSize: 11, color: "#c4b5fd", fontWeight: 700, marginBottom: 4 }}>Key architectural shift</div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
            The DGX B200 replaces CX7 storage NICs with BlueField-3 DPUs. The NVMe-oF initiator moves from the host Intel Xeon
            to the BF3 ARM cores. This adds a second OOB management path (BF3 oob_net0) and requires rshim for firmware updates.
          </div>
        </div>
      )}

      {/* Block diagram */}
      <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <svg viewBox={`0 0 660 ${platform === "h100" ? 330 : 370}`} style={{ width: "100%", height: "auto" }}>
          {/* Platform label */}
          <text x={330} y={16} textAnchor="middle" fill="#475569" fontSize={11}>
            DGX {platform.toUpperCase()} -- Component Stack
          </text>

          {blocks.map((b) => (
            <g key={b.id} onClick={() => setSelected(selected === b.id ? null : b.id)} style={{ cursor: "pointer" }}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6}
                fill={selected === b.id ? b.color + "33" : "#0f172a"}
                stroke={selected === b.id ? b.color : b.color + "44"}
                strokeWidth={selected === b.id ? 2 : 1}
              />
              <text x={b.x + 10} y={b.y + 18} fill={b.color} fontSize={10} fontWeight="bold">{b.label}</text>
              <text x={b.x + 10} y={b.y + 32} fill="#475569" fontSize={9}>{b.sub}</text>
            </g>
          ))}

          {/* rshim annotation for B200 */}
          {platform === "b200" && (
            <>
              <rect x={270} y={214} width={180} height={50} rx={6}
                fill="#312e8122" stroke="#a78bfa44" strokeWidth={1} />
              <text x={360} y={232} textAnchor="middle" fill="#c4b5fd" fontSize={10} fontWeight="bold">rshim (PCIe)</text>
              <text x={360} y={246} textAnchor="middle" fill="#6366f1" fontSize={9}>/dev/rshim0/boot</text>
              <text x={360} y={258} textAnchor="middle" fill="#6366f1" fontSize={9}>/dev/rshim0/console</text>
              <line x1={240} y1={235} x2={270} y2={235} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="3 2" />
            </>
          )}

          {/* OOB paths */}
          {platform === "b200" && (
            <>
              <rect x={430} y={290} width={220} height={60} rx={6}
                fill="#451a0322" stroke="#f59e0b44" />
              <text x={540} y={308} textAnchor="middle" fill="#fbbf24" fontSize={10} fontWeight="bold">OOB Switch (SN2201)</text>
              <text x={540} y={324} textAnchor="middle" fill="#92400e" fontSize={9}>BMC: 10.0.1.x (power/hw)</text>
              <text x={540} y={336} textAnchor="middle" fill="#92400e" fontSize={9}>BF3 oob_net0: 10.0.1.y (ARM mgmt)</text>
              <line x1={240} y1={310} x2={430} y2={310} stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 2" />
              <line x1={240} y1={325} x2={430} y2={325} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 2" />
            </>
          )}
          {platform === "h100" && (
            <>
              <rect x={430} y={270} width={200} height={44} rx={6}
                fill="#451a0322" stroke="#f59e0b44" />
              <text x={530} y={288} textAnchor="middle" fill="#fbbf24" fontSize={10} fontWeight="bold">OOB Switch (SN2201)</text>
              <text x={530} y={302} textAnchor="middle" fill="#92400e" fontSize={9}>BMC only: 10.0.1.x</text>
              <line x1={240} y1={280} x2={430} y2={284} stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 2" />
            </>
          )}
        </svg>
      </div>

      {/* Selected block detail */}
      {selectedBlock ? (
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 16px", borderLeft: `3px solid ${selectedBlock.color}` }}>
          <div style={{ fontSize: 13, color: selectedBlock.color, fontWeight: 700, marginBottom: 6 }}>{selectedBlock.label}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.65, marginBottom: selectedBlock.cmd ? 8 : 0 }}>
            {selectedBlock.detail}
          </div>
          {selectedBlock.cmd && (
            <div style={{ background: "#0f172a", borderRadius: 4, padding: "6px 10px", fontSize: 11, color: "#22c55e" }}>
              $ {selectedBlock.cmd}
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "#334155", textAlign: "center" }}>click a component for detail</div>
      )}
    </div>
  );
}

export default BF3ManagementArchViz;
