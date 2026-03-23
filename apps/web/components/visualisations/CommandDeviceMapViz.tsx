"use client"
import { useState } from "react"

type DeviceFilter = "all" | "dgx" | "spectrum" | "onyx" | "simulator"

interface Command {
  cmd: string
  device: Exclude<DeviceFilter, "all">
  purpose: string
  layer: "physical" | "traffic" | "config" | "switch"
}

const commands: Command[] = [
  { cmd: "ibstat", device: "dgx", purpose: "Overview of all IB/RoCE NIC ports — State, Rate, LID", layer: "physical" },
  { cmd: "rdma link show", device: "dgx", purpose: "Per-device RDMA link state — cleaner than ibstat for quick checks", layer: "physical" },
  { cmd: "ibdiagnet", device: "dgx", purpose: "Full fabric diagnostic sweep — use when simpler commands fail", layer: "physical" },
  { cmd: "ethtool -S eth0", device: "dgx", purpose: "NIC hardware statistics — rx/tx pause frames, drops, ECN marks", layer: "traffic" },
  { cmd: "dcb pfc show dev eth0", device: "dgx", purpose: "PFC state from the DGX host perspective (iproute2 dcb tool)", layer: "config" },
  { cmd: "mlnx_qos -i eth0", device: "dgx", purpose: "QoS configuration and per-priority counters", layer: "config" },
  { cmd: "show dcb pfc", device: "spectrum", purpose: "PFC state per interface on the Spectrum switch", layer: "config" },
  { cmd: "show dcb ets", device: "spectrum", purpose: "ETS bandwidth allocation and ECN/DCQCN configuration", layer: "config" },
  { cmd: "show interface counters", device: "spectrum", purpose: "Per-port packet counters — drops, pauses, buffer utilisation", layer: "traffic" },
  { cmd: "show roce", device: "spectrum", purpose: "RoCEv2 configuration summary — PFC, ECN, DSCP, MTU, GID", layer: "config" },
  { cmd: "show interfaces ib status", device: "onyx", purpose: "InfiniBand port state — Active/Down/Polling", layer: "physical" },
  { cmd: "show ib counters", device: "onyx", purpose: "Per-port IB error counters — symbol errors, link downs", layer: "traffic" },
  { cmd: "show ib sm", device: "onyx", purpose: "Subnet manager status — is SM running, who is master", layer: "config" },
  { cmd: "show topology", device: "simulator", purpose: "Rail-to-NIC mapping with NIC and switch port state", layer: "switch" },
  { cmd: "show rdma links", device: "simulator", purpose: "Per-rail RDMA link state with WARNING for misconfigurations", layer: "physical" },
  { cmd: "show switch port rail<N>", device: "simulator", purpose: "Switch-side port detail — oper state, err reason, last flap", layer: "switch" },
]

const deviceInfo: Record<Exclude<DeviceFilter, "all">, { label: string; os: string; color: string; border: string }> = {
  dgx: { label: "DGX host", os: "DGX OS (Ubuntu)", color: "#14532d", border: "#22c55e" },
  spectrum: { label: "Spectrum-X switch", os: "Cumulus Linux", color: "#065f46", border: "#34d399" },
  onyx: { label: "ONYX switch", os: "NVIDIA ONYX", color: "#1e3a5f", border: "#60a5fa" },
  simulator: { label: "FabricLab simulator", os: "Simulator (models above)", color: "#4c1d95", border: "#a78bfa" },
}

const layerColors = {
  physical: "#1e3a5f",
  traffic: "#065f46",
  config: "#4c1d95",
  switch: "#78350f",
}

export function CommandDeviceMapViz() {
  const [filter, setFilter] = useState<DeviceFilter>("all")
  const [selected, setSelected] = useState<Command | null>(null)

  const visible = filter === "all" ? commands : commands.filter(c => c.device === filter)

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">Command device map — which commands run where</p>

      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setFilter("all")}
          className="rounded-lg px-3 py-1.5 text-xs transition-all"
          style={{ backgroundColor: filter === "all" ? "#1e293b" : "#0f172a", border: `1px solid ${filter === "all" ? "#475569" : "#1e293b"}`, color: filter === "all" ? "#e2e8f0" : "#475569" }}>
          All commands
        </button>
        {(Object.entries(deviceInfo) as [Exclude<DeviceFilter, "all">, typeof deviceInfo[keyof typeof deviceInfo]][]).map(([id, info]) => (
          <button key={id} onClick={() => setFilter(id)}
            className="rounded-lg px-3 py-1.5 text-xs transition-all"
            style={{ backgroundColor: filter === id ? info.color : "#0f172a", border: `1px solid ${filter === id ? info.border : "#1e293b"}`, color: filter === id ? "#fff" : "#475569" }}>
            {info.label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {visible.map((cmd, i) => {
          const device = deviceInfo[cmd.device]
          const isSelected = selected?.cmd === cmd.cmd
          return (
            <button key={i} onClick={() => setSelected(isSelected ? null : cmd)}
              className="w-full text-left rounded-xl px-3 py-2.5 transition-all flex items-start gap-3"
              style={{ backgroundColor: isSelected ? device.color + "44" : "#0f172a", border: `1px solid ${isSelected ? device.border : "#1e293b"}` }}>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-xs font-mono text-cyan-300">{cmd.cmd}</code>
                  <span className="rounded-full px-1.5 py-0.5 text-[9px]" style={{ backgroundColor: device.color, color: device.border }}>
                    {device.label}
                  </span>
                  <span className="rounded-full px-1.5 py-0.5 text-[9px]" style={{ backgroundColor: layerColors[cmd.layer] + "44", color: "#94a3b8" }}>
                    {cmd.layer}
                  </span>
                </div>
                {isSelected && <p className="mt-1.5 text-xs text-slate-300 leading-5">{cmd.purpose}</p>}
                {!isSelected && <p className="mt-0.5 text-xs text-slate-600 leading-5">{cmd.purpose}</p>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
export default CommandDeviceMapViz
