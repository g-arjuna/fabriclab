"use client"

import { useState } from "react"

interface Device {
  id: string
  name: string
  category: string
  os: string
  osVersion: string
  color: string
  border: string
  description: string
  accessMethod: string
  firstCommand: string
  notes: string
}

const devices: Device[] = [
  {
    id: "dgx",
    name: "DGX H100",
    category: "Compute node",
    os: "DGX OS",
    osVersion: "Ubuntu 22.04 LTS (NVIDIA-customised)",
    color: "#14532d",
    border: "#22c55e",
    description: "DGX OS is a customised Ubuntu image with NVIDIA drivers, CUDA, NCCL, container runtime, and management agents pre-installed. Underneath it is standard Ubuntu — you can SSH in, run apt, use systemctl. NVIDIA adds nvsm, dcgm, and the fabric manager daemon.",
    accessMethod: "SSH to management IP, or iDRAC virtual console for boot-time access",
    firstCommand: "nvidia-smi  →  verify all 8 GPUs are visible\nibstat      →  verify all 8 ConnectX-7 NICs are active",
    notes: "Each DGX also has a separate iDRAC BMC accessible on a dedicated 1GbE port — completely independent of the host OS.",
  },
  {
    id: "quantum",
    name: "QM9700 (Quantum NDR)",
    category: "InfiniBand switch",
    os: "NVIDIA ONYX",
    osVersion: "ONYX 3.x (formerly MLNX-OS)",
    color: "#1e3a5f",
    border: "#60a5fa",
    description: "ONYX presents a Cisco IOS-style CLI. You will recognise show, configure terminal, no commands immediately. It runs on a Linux kernel underneath but exposes only the ONYX CLI by default. A web GUI is available on the management port.",
    accessMethod: "Console cable (micro-USB or RJ45, 115200 baud 8N1), or SSH to management IP",
    firstCommand: "show version\nshow interfaces ib status\nshow ib sm",
    notes: "UFM manages InfiniBand routing — you rarely use configure terminal on ONYX for routing config. CLI is primarily for monitoring.",
  },
  {
    id: "spectrum",
    name: "SN5600 (Spectrum-X)",
    category: "Ethernet switch",
    os: "Cumulus Linux or SONiC",
    osVersion: "Cumulus 5.x / SONiC 202305+",
    color: "#065f46",
    border: "#34d399",
    description: "Spectrum-X Ethernet switches can run either Cumulus Linux (Debian-based, NVUE configuration) or SONiC (Open Networking in the Cloud). Both expose a Linux shell underneath. RoCEv2 parameters (PFC, ECN) are configured here — this is what the lab simulator models.",
    accessMethod: "Console cable (RJ45, 9600 or 115200 baud), or SSH to management IP",
    firstCommand: "net show system           (Cumulus)\nshow version              (SONiC)\nshow interface status",
    notes: "This is the switch whose behaviour we simulate in the FabricLab CLI. show dcb pfc and show dcb ets reflect Cumulus/SONiC command patterns.",
  },
  {
    id: "bluefield",
    name: "BlueField-3 adapter (B200-class)",
    category: "Data Processing Unit",
    os: "BF-Bundle OS",
    osVersion: "Ubuntu 22.04 (Arm-side, independent)",
    color: "#4c1d95",
    border: "#a78bfa",
    description: "On later platforms such as DGX B200, a BlueField-3 adapter runs its own Ubuntu instance on embedded Arm CPUs — completely independent of the host OS. It has its own management IP, its own file system, and can be rebooted without touching the host. DGX H100/H200 use ConnectX-7 throughout instead of this BlueField management model.",
    accessMethod: "SSH to DPU management IP (separate from DGX), or: ssh ubuntu@192.168.100.2 via rshim0",
    firstCommand: "mlxconfig -d /dev/mst/mt41692_pciconf0 q\nbf-release show\nmst status",
    notes: "This is a later-platform workflow, not part of the standard DGX H100/H200 bring-up path used in this chapter.",
  },
  {
    id: "ufm",
    name: "UFM Server",
    category: "Fabric management",
    os: "UFM application",
    osVersion: "UFM 6.x on RHEL/Ubuntu management server",
    color: "#78350f",
    border: "#fbbf24",
    description: "UFM (Unified Fabric Manager) is a software application running on a dedicated x86 management server. It is the central brain of the InfiniBand fabric — it discovers all devices, assigns LIDs, computes routing, and monitors performance. You interact with it primarily via its web GUI or REST API.",
    accessMethod: "Web browser to UFM server IP, or REST API (curl/Python), or UFM CLI (ufm_cluster)",
    firstCommand: "Open https://[ufm-ip]:443 in browser\nDefault login: ufmsystem / 123456 (change immediately)",
    notes: "UFM must be running before DGX nodes boot — the Fabric Manager daemon on each DGX registers with UFM during startup.",
  },
  {
    id: "bcm",
    name: "Base Command Manager",
    category: "Cluster management",
    os: "BCM application",
    osVersion: "BCM 2.x on head node",
    color: "#1e293b",
    border: "#64748b",
    description: "Base Command Manager (formerly DGX System Software) runs on a head node and handles DGX provisioning (PXE boot, OS imaging), job scheduling integration (Slurm), telemetry collection, and health monitoring. It is your primary interface for managing a fleet of DGX nodes.",
    accessMethod: "Web browser to BCM head node IP, or bcm CLI on the head node",
    firstCommand: "bcm cluster show\nbcm node list\nbcm health check all",
    notes: "BCM integrates with UFM for network visibility and with DCGM for GPU health. In smaller deployments you may skip BCM and manage DGX nodes directly.",
  },
]

export function SoftwareStackViz() {
  const [selected, setSelected] = useState<Device>(devices[0])

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        What runs where — click each device
      </p>

      <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map(device => (
          <button
            key={device.id}
            onClick={() => setSelected(device)}
            className="rounded-xl px-3 py-2.5 text-left transition-all text-xs"
            style={{
              backgroundColor: selected.id === device.id ? device.color + "44" : "#0f172a",
              border: `1px solid ${selected.id === device.id ? device.border : "#1e293b"}`,
            }}
          >
            <div className="font-semibold text-white">{device.name}</div>
            <div className="text-[10px] mt-0.5" style={{ color: device.border }}>{device.os}</div>
            <div className="text-[9px] text-slate-600 mt-0.5">{device.category}</div>
          </button>
        ))}
      </div>

      <div
        className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: selected.color + "22", border: `1px solid ${selected.border}33` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">{selected.name}</h3>
            <p className="text-xs mt-0.5" style={{ color: selected.border }}>{selected.osVersion}</p>
          </div>
          <span className="rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider bg-slate-800 text-slate-400 flex-shrink-0">
            {selected.category}
          </span>
        </div>

        <p className="text-sm leading-7 text-slate-300">{selected.description}</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">How to access</div>
            <p className="text-xs text-slate-300">{selected.accessMethod}</p>
          </div>
          <div className="rounded-lg bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">First commands</div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs font-mono leading-5 text-cyan-300">
              {selected.firstCommand}
            </pre>
          </div>
        </div>

        {selected.notes && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
            <span className="font-semibold">Note: </span>{selected.notes}
          </div>
        )}
      </div>
    </div>
  )
}

export default SoftwareStackViz
