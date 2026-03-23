"use client"

import { useState } from "react"

type Day = "day0" | "day1" | "day2"

const days: { id: Day; label: string; subtitle: string }[] = [
  { id: "day0", label: "Day 0", subtitle: "Initial setup and bring-up" },
  { id: "day1", label: "Day 1", subtitle: "Normal operations" },
  { id: "day2", label: "Day 2", subtitle: "Troubleshooting" },
]

interface Task {
  task: string
  method: "cli" | "gui" | "orchestrated" | "api"
  tool: string
}

const tasks: Record<Day, Task[]> = {
  day0: [
    { task: "Provision DGX OS on all nodes", method: "orchestrated", tool: "Base Command Manager (BCM)" },
    { task: "Initial UFM setup and fabric discovery", method: "gui", tool: "UFM web interface" },
    { task: "Configure PFC/ECN on Spectrum switches", method: "orchestrated", tool: "Ansible + NVUE templates" },
    { task: "Validate GPU visibility on each node", method: "cli", tool: "nvidia-smi on DGX OS" },
    { task: "Validate InfiniBand port state", method: "cli", tool: "ibstat on DGX OS" },
    { task: "Set UFM routing algorithm", method: "gui", tool: "UFM → Routing → Algorithm" },
    { task: "Configure switch management IPs", method: "cli", tool: "ONYX console cable" },
    { task: "Run ibdiagnet for full fabric validation", method: "cli", tool: "ibdiagnet on management host" },
  ],
  day1: [
    { task: "Monitor GPU utilisation per job", method: "gui", tool: "BCM dashboard / DCGM" },
    { task: "Check fabric health overview", method: "gui", tool: "UFM dashboard" },
    { task: "Submit training jobs", method: "orchestrated", tool: "Slurm / Kubernetes" },
    { task: "Check switch error counters", method: "cli", tool: "ONYX: show ib counters" },
    { task: "Inspect PFC state on a specific port", method: "cli", tool: "Spectrum: show dcb pfc" },
    { task: "View per-port bandwidth utilisation", method: "gui", tool: "UFM topology view" },
    { task: "Check RDMA link state on a node", method: "cli", tool: "DGX: ibstat / rdma link show" },
    { task: "Upgrade switch firmware (all switches)", method: "orchestrated", tool: "UFM or Ansible" },
  ],
  day2: [
    { task: "GPU rail shows dark in monitoring", method: "cli", tool: "show topology / show rdma links" },
    { task: "AllReduce latency spike — root cause", method: "cli", tool: "show ib counters / ibdiagnet" },
    { task: "PFC pause storm suspected", method: "cli", tool: "ethtool -S eth0 / show dcb pfc" },
    { task: "Correlate switch error to UFM event", method: "gui", tool: "UFM event log + switch CLI" },
    { task: "Node not appearing in UFM", method: "cli", tool: "show ib sm / FM daemon logs on DGX" },
    { task: "Cable qualification (suspect optic)", method: "cli", tool: "ONYX: show interfaces ib transceiver" },
    { task: "Check DPU health independently", method: "cli", tool: "SSH to DPU management IP" },
    { task: "Emergency PFC disable on a port", method: "cli", tool: "ONYX configure terminal / Spectrum" },
  ],
}

const methodColors = {
  cli: { bg: "#1e3a5f", border: "#60a5fa", label: "CLI", text: "#93c5fd" },
  gui: { bg: "#065f46", border: "#34d399", label: "GUI", text: "#6ee7b7" },
  orchestrated: { bg: "#4c1d95", border: "#a78bfa", label: "Orchestrated", text: "#c4b5fd" },
  api: { bg: "#78350f", border: "#fbbf24", label: "API", text: "#fde68a" },
}

export function OperationsModeViz() {
  const [day, setDay] = useState<Day>("day1")

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        CLI vs GUI vs orchestrated — by operational phase
      </p>

      <div className="flex gap-2 mb-5">
        {days.map(d => (
          <button
            key={d.id}
            onClick={() => setDay(d.id)}
            className="flex-1 rounded-xl px-3 py-2.5 text-sm transition-all text-center"
            style={{
              backgroundColor: day === d.id ? "#1e3a5f" : "#0f172a",
              border: `1px solid ${day === d.id ? "#60a5fa" : "#1e293b"}`,
              color: day === d.id ? "#bfdbfe" : "#64748b",
            }}
          >
            <div className="font-semibold">{d.label}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{d.subtitle}</div>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(methodColors).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5 text-[10px]">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: val.bg, border: `1px solid ${val.border}` }} />
            <span style={{ color: val.text }}>{val.label}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {tasks[day].map((task, i) => {
          const m = methodColors[task.method]
          return (
            <div key={i} className="flex items-start gap-3 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: m.bg + "22", border: `1px solid ${m.border}22` }}>
              <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold flex-shrink-0 mt-0.5"
                style={{ backgroundColor: m.bg, color: m.text, border: `1px solid ${m.border}44` }}>
                {m.label}
              </span>
              <div className="flex-1 text-xs">
                <div className="text-slate-200">{task.task}</div>
                <div className="text-slate-500 mt-0.5 font-mono">{task.tool}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default OperationsModeViz
