"use client"

import { useState } from "react"

type IBPhase = "ufm_first" | "locate" | "onyx_check" | "dgx_check" | "sm_check" | "ibdiagnet" | "action"

const ibPhases: { id: IBPhase; step: string; label: string; tool: string; color: string }[] = [
  { id: "ufm_first", step: "1", label: "Check UFM event log", tool: "UFM web GUI / ufm_cluster CLI", color: "#78350f" },
  { id: "locate", step: "2", label: "Locate physical component", tool: "UFM topology view", color: "#4c1d95" },
  { id: "onyx_check", step: "3", label: "Check port state on switch", tool: "ONYX: show interface ib / show ib counters", color: "#1e3a5f" },
  { id: "dgx_check", step: "4", label: "Check DGX NIC side", tool: "DGX: ibstat / rdma link show", color: "#14532d" },
  { id: "sm_check", step: "5", label: "Check SM view", tool: "ONYX: show ib sm", color: "#065f46" },
  { id: "ibdiagnet", step: "6", label: "Full fabric sweep", tool: "ibdiagnet --ls --pc --sm", color: "#374151" },
  { id: "action", step: "7", label: "Corrective action", tool: "Hardware replacement / SM restart / UFM config", color: "#166534" },
]

const phaseDetails: Record<IBPhase, { what: string; why: string; commands: string[] }> = {
  ufm_first: {
    what: "Before touching any CLI, check UFM's event log for the past hour.",
    why: "UFM gives you the timeline. You need to know what happened, and when, before you start digging. A link flap that happened 2 hours ago is a different problem to one happening right now.",
    commands: ["ufm_cluster -u admin events list --severity WARNING,ERROR --hours 1", "Or: UFM web GUI → Events tab → filter by severity"],
  },
  locate: {
    what: "Use UFM topology view to find the physical location of the reported component.",
    why: "QM9700-2/port7 needs to become 'Rack 4, top-of-rack switch 2, port 7, cable to row B, DGX node 12, Rail 7'. You need the physical location to fix it.",
    commands: ["UFM web GUI → Topology → find component by GUID or switch name", "UFM REST API: GET /ufmRest/v2/topology/links?switch=QM9700-2"],
  },
  onyx_check: {
    what: "SSH to the identified switch and check the specific port.",
    why: "The switch is the closest vantage point to the physical fault. Symbol errors on this switch confirm the physical layer problem. The port state tells you whether it is flapping or stuck down.",
    commands: ["show interface ib 1/7", "show ib counters", "clear counters ib 1/7  (after noting baseline)"],
  },
  dgx_check: {
    what: "SSH to the DGX node on the other end and check the NIC.",
    why: "Confirms which end has the problem. NIC state may show 'Polling' while switch shows 'Down' — tells you the NIC is still trying to connect.",
    commands: ["ibstat | grep -A 20 mlx5_7", "rdma link show | grep mlx5_7"],
  },
  sm_check: {
    what: "Verify the SM is aware of this component and has routed around it.",
    why: "After a link failure, the SM should have updated routing tables. If it has not, there may be an SM problem compounding the physical fault.",
    commands: ["show ib sm", "Check Last sweep time — should be recent", "Check Subnet size — should match expected node count"],
  },
  ibdiagnet: {
    what: "Run ibdiagnet for a complete fabric audit.",
    why: "Individual switch CLIs show you one device. ibdiagnet sees the whole fabric. It may reveal that the link you are investigating is one of several problems, or that the real problem is elsewhere.",
    commands: ["ibdiagnet --ls --pc --sm --extended_speeds all", "Takes 4–15 minutes for large fabrics"],
  },
  action: {
    what: "Take corrective action based on what the investigation found.",
    why: "Actions are different depending on the root cause: hardware replacement for physical faults, UFM restart for routing issues, OpenSM stop for SM storms.",
    commands: [
      "Physical (symbol errors): Replace transceiver → reseat cable → replace cable",
      "SM routing issue: UFM maintenance restart → let SM sweep",
      "SM storm: Stop rogue SM → systemctl stop opensm → verify single master",
      "VL credit issue: Engage NVIDIA support with ibdiagnet output",
    ],
  },
}

export function IBDiagnosticWorkflowViz() {
  const [phase, setPhase] = useState<IBPhase>("ufm_first")
  const detail = phaseDetails[phase]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">InfiniBand diagnostic workflow — click each phase</p>
      <div className="mb-5 overflow-x-auto">
        <div className="relative min-w-[560px]">
          <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-800" />
          <div className="relative flex justify-between">
            {ibPhases.map((p) => (
              <button key={p.id} onClick={() => setPhase(p.id)} className="flex flex-col items-center" style={{ flex: 1 }}>
                <div
                  className="z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all"
                  style={{
                    backgroundColor: phase === p.id ? p.color : "#0f172a",
                    border: `2px solid ${p.color}`,
                    color: phase === p.id ? "#fff" : p.color,
                    transform: phase === p.id ? "scale(1.2)" : "scale(1)",
                  }}
                >
                  {p.step}
                </div>
                <span className="mt-1 max-w-[50px] text-center text-[8px] leading-3 text-slate-600">{p.label.split(" ").slice(0, 2).join(" ")}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div
        className="space-y-3 rounded-xl p-4 text-xs"
        style={{
          backgroundColor: ibPhases.find((p) => p.id === phase)!.color + "22",
          border: `1px solid ${ibPhases.find((p) => p.id === phase)!.color + "44"}`,
        }}
      >
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">
            Step {ibPhases.find((p) => p.id === phase)!.step} — {ibPhases.find((p) => p.id === phase)!.label}
          </div>
          <div className="text-[10px] text-slate-500">{ibPhases.find((p) => p.id === phase)!.tool}</div>
        </div>
        <p className="leading-5 text-slate-300">{detail.what}</p>
        <p className="leading-5 text-slate-400">
          <span className="font-semibold text-slate-300">Why: </span>
          {detail.why}
        </p>
        <div className="rounded-lg bg-black/20 p-3">
          <div className="mb-1.5 text-[10px] text-slate-500">Commands</div>
          {detail.commands.map((cmd, i) => (
            <div key={i} className="font-mono text-[10px] leading-5 text-cyan-300 break-all">
              {cmd}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default IBDiagnosticWorkflowViz
