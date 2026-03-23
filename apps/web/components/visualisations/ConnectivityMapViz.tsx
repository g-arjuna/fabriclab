"use client"

import { useState } from "react"

type Network = "oob" | "inband" | "compute" | "storage"

interface NetworkDetail {
  label: string
  speed: string
  color: string
  border: string
  path: string
  software: string
  purpose: string
  trafficExample: string
  physicalCable: string
}

const networks: Record<Network, NetworkDetail> = {
  oob: {
    label: "Out-of-band management",
    speed: "1 GbE",
    color: "#1e293b",
    border: "#64748b",
    path: "Management workstation → 1GbE switch → iDRAC port (DGX) / MGMT port (ONYX switch) / BMC port (BlueField DPU)",
    software: "iDRAC web GUI, IPMI, SSH to ONYX management interface, rshim console",
    purpose: "Power control, console access, OS provisioning, firmware updates. Works even when all other networks are down.",
    trafficExample: "IPMI power commands, virtual console video stream, PXE boot traffic, firmware update packages",
    physicalCable: "RJ45 Cat6, 1GbE. Usually a dedicated NIC on the DGX (not a ConnectX-7). Separate NIC on switches.",
  },
  inband: {
    label: "In-band management",
    speed: "10–25 GbE",
    color: "#064e3b",
    border: "#34d399",
    path: "DGX eth0 (management NIC) → 10/25GbE switch → UFM server, BCM server, monitoring infrastructure",
    software: "SSH for OS-level access, UFM for fabric management, BCM for cluster management, Grafana/Prometheus for monitoring",
    purpose: "Day-to-day cluster operations: job submission, health monitoring, OS-level management, log collection.",
    trafficExample: "Slurm job submissions, UFM discovery traffic, DCGM telemetry, log shipping, NFS for home directories",
    physicalCable: "RJ45 Cat6 or SFP28 DAC. This uses the DGX's standard Ethernet management NIC, NOT the ConnectX-7 NICs.",
  },
  compute: {
    label: "Compute fabric",
    speed: "400 Gb/s (NDR InfiniBand)",
    color: "#1e3a5f",
    border: "#60a5fa",
    path: "DGX mlx5_0→7 (ConnectX-7) → QM9700 leaf switch (Rail 0-7) → Q3400 spine switch → other leaf switches → other DGX nodes",
    software: "MLNX-OFED drivers, NCCL for training communication, UFM for routing, Fabric Manager for NVLink/IB initialisation",
    purpose: "GPU-to-GPU AllReduce during AI training. Zero tolerance for packet loss. Sub-2 microsecond latency required. No management traffic here.",
    trafficExample: "NCCL AllReduce gradient tensors (140+ GB per step for 70B model), RDMA Write operations, GPUDirect traffic",
    physicalCable: "OSFP to QSFP56 active optical cable (AOC) or OSFP DAC for short runs. Generates significant heat. Cost often exceeds switch cost.",
  },
  storage: {
    label: "Storage fabric",
    speed: "400 GbE (Ethernet)",
    color: "#065f46",
    border: "#4ade80",
    path: "DGX BlueField-3 DPU ports → Spectrum SN5600 switch → NVMe-oF storage arrays (WEKA, Lustre, NetApp)",
    software: "NVMe-oF protocol, GPUDirect Storage (GDS), BlueField-3 DPU as NVMe-oF initiator",
    purpose: "Reading training datasets to GPU memory, writing checkpoints. Physically separate from compute fabric to prevent storage I/O from affecting training.",
    trafficExample: "Training dataset reads (sequential, large block), checkpoint writes (burst traffic every 10-30 min), model weight loading",
    physicalCable: "QSFP-DD AOC or DAC. Same physical cable type as compute fabric but on different switches.",
  },
}

const networkOrder: Network[] = ["oob", "inband", "compute", "storage"]

export function ConnectivityMapViz() {
  const [selected, setSelected] = useState<Network>("compute")

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        The four networks — click each to explore
      </p>

      {/* Visual network stack */}
      <div className="space-y-2 mb-5">
        {networkOrder.map(n => {
          const net = networks[n]
          const isSelected = selected === n
          return (
            <button
              key={n}
              onClick={() => setSelected(n)}
              className="w-full rounded-xl px-4 py-3 text-left transition-all flex items-center justify-between"
              style={{
                backgroundColor: isSelected ? net.color + "55" : net.color + "22",
                border: `1px solid ${isSelected ? net.border : net.border + "33"}`,
              }}
            >
              <div className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: net.border }} />
                <div>
                  <div className="text-sm font-semibold text-white">{net.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: net.border }}>{net.speed}</div>
                </div>
              </div>
              <span className="text-slate-600 text-sm">{isSelected ? "▼" : "▶"}</span>
            </button>
          )
        })}
      </div>

      {/* Detail panel */}
      {(() => {
        const net = networks[selected]
        return (
          <div className="rounded-xl p-4 space-y-3"
            style={{ backgroundColor: net.color + "22", border: `1px solid ${net.border}33` }}>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-lg bg-black/20 p-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Path</div>
                <p className="text-slate-300 leading-6">{net.path}</p>
              </div>
              <div className="rounded-lg bg-black/20 p-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Software</div>
                <p className="text-slate-300 leading-6">{net.software}</p>
              </div>
              <div className="rounded-lg bg-black/20 p-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Purpose</div>
                <p className="text-slate-300 leading-6">{net.purpose}</p>
              </div>
              <div className="rounded-lg bg-black/20 p-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Physical cable</div>
                <p className="text-slate-300 leading-6">{net.physicalCable}</p>
              </div>
            </div>
            <div className="rounded-lg bg-black/20 p-3 text-xs">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Example traffic</div>
              <p className="text-slate-300 leading-6">{net.trafficExample}</p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default ConnectivityMapViz
