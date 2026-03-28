"use client"
import { useState } from "react"

const checklistItems = [
  {
    step: 1,
    title: "Jumbo frames (MTU 9000)",
    device: "Both DGX host and switch",
    command: "ip link set eth0 mtu 9000  # DGX host\nnv set interface eth0 link mtu 9000  # Switch",
    verify: "ip link show eth0 | grep mtu",
    failMode: "MTU 1500 on either side causes RDMA fragmentation. Performance drops to 1/6th. RDMA connections may fail entirely.",
    color: "#1e3a5f",
    border: "#60a5fa",
  },
  {
    step: 2,
    title: "DSCP trust mode",
    device: "Switch (leaf)",
    command: "nv set interface eth0 qos trust dscp",
    verify: "show dcb ets  →  check trust mode",
    failMode: "If switch trusts CoS instead of DSCP, it ignores the NIC's DSCP 26 marking. RoCEv2 traffic gets placed in the wrong queue with no PFC protection.",
    color: "#065f46",
    border: "#34d399",
  },
  {
    step: 3,
    title: "DSCP 26 → CoS 3 mapping",
    device: "Switch (leaf)",
    command: "nv set qos mapping traffic-class 3 dscp 26",
    verify: "nv show qos mapping",
    failMode: "If DSCP 26 maps to CoS 0 (common default), RoCEv2 traffic competes with best-effort and receives no priority scheduling.",
    color: "#4c1d95",
    border: "#a78bfa",
  },
  {
    step: 4,
    title: "ETS Strict Priority on CoS 3",
    device: "Switch (leaf)",
    command: "nv set qos scheduler tc 3 mode strict",
    verify: "show dcb ets  →  TC3: Strict Priority",
    failMode: "If CoS 3 uses weighted scheduling, RDMA traffic latency varies with queue depth. DCQCN feedback loops become unstable.",
    color: "#78350f",
    border: "#fbbf24",
  },
  {
    step: 5,
    title: "PFC on CoS 3",
    device: "Switch AND DGX host (must match)",
    command: "nv set interface eth0 qos pfc priority 3  # switch\nmlnx_qos -i eth0 --pfc 0,0,0,1,0,0,0,0  # DGX",
    verify: "show dcb pfc  →  PFC enabled priorities: 3 (cos3)",
    failMode: "PFC on wrong priority: looks enabled, provides no protection to RDMA traffic. Drops occur under congestion.",
    color: "#7f1d1d",
    border: "#ef4444",
  },
  {
    step: 6,
    title: "ECN thresholds",
    device: "Switch (leaf)",
    command: "nv set qos congestion-control profile roce \\\n    min-threshold 150000 max-threshold 1500000 probability 100",
    verify: "show dcb ets  →  ECN marking: enabled, DCQCN: active",
    failMode: "Without ECN: all congestion handled by PFC pauses. Buffer utilisation stays high. Pause storms more likely. Training throughput degraded.",
    color: "#14532d",
    border: "#22c55e",
  },
]

export function RoCEv2ConfigChecklist() {
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState<Set<number>>(new Set())

  const toggleCheck = (step: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setChecked(prev => {
      const next = new Set(prev)
      next.has(step) ? next.delete(step) : next.add(step)
      return next
    })
  }

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        RoCEv2 port configuration checklist — click to expand each item
      </p>
      <div className="space-y-2">
        {checklistItems.map(item => {
          const isSelected = selected === item.step
          const isDone = checked.has(item.step)
          return (
            <div
              key={item.step}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(isSelected ? null : item.step)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setSelected(isSelected ? null : item.step)
                }
              }}
              className="w-full rounded-xl text-left transition-all"
              style={{
                backgroundColor: isSelected ? `${item.color}33` : isDone ? "#14532d22" : "#0f172a",
                border: `1px solid ${isSelected ? item.border : isDone ? "#22c55e44" : "#1e293b"}`,
              }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={e => toggleCheck(item.step, e)}
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-xs transition-all"
                  style={{
                    backgroundColor: isDone ? "#14532d" : "#1e293b",
                    border: `1px solid ${isDone ? "#22c55e" : "#475569"}`,
                    color: isDone ? "#4ade80" : "#475569",
                  }}
                >
                  {isDone ? "âœ“" : item.step}
                </button>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <div className="mt-0.5 text-[10px] text-slate-500">{item.device}</div>
                </div>
                <span className="text-xs text-slate-600">{isSelected ? "â–²" : "â–¼"}</span>
              </div>
              {isSelected && (
                <div className="space-y-2 px-4 pb-4 text-xs">
                  <div className="rounded-lg border border-white/10 bg-[#0a0f1a] p-3">
                    <div className="mb-1 text-[10px] text-slate-500">Configuration command</div>
                    <pre className="whitespace-pre-wrap font-mono text-[10px] leading-6 text-cyan-300">{item.command}</pre>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-[#0a0f1a] p-3">
                    <div className="mb-1 text-[10px] text-slate-500">Verify with</div>
                    <code className="font-mono text-[10px] text-green-300">{item.verify}</code>
                  </div>
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                    <span className="font-semibold text-red-400">If skipped: </span>
                    <span className="text-slate-300">{item.failMode}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-3 text-center text-xs text-slate-600">
        {checked.size}/6 items verified — click checkbox when confirmed on the device
      </div>
    </div>
  )
}

export default RoCEv2ConfigChecklist
