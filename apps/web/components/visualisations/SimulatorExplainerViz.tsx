"use client"
import { useState } from "react"

type Tab = "how_it_works" | "device_contexts" | "does_not_model" | "workflow"

const tabs: { id: Tab; label: string }[] = [
  { id: "how_it_works", label: "How it works" },
  { id: "device_contexts", label: "Device contexts" },
  { id: "does_not_model", label: "What it does not model" },
  { id: "workflow", label: "How to use it" },
]

type DeviceContext = "dgx" | "leaf" | "spine"

const deviceContexts: Record<DeviceContext, {
  label: string
  os: string
  promptColor: string
  bgColor: string
  prompt: string
  commands: { cmd: string; models: string }[]
}> = {
  dgx: {
    label: "DGX Host",
    os: "DGX OS (Ubuntu 22.04)",
    promptColor: "#4ade80",
    bgColor: "#0a1a0f",
    prompt: "dgx-node-a:~$",
    commands: [
      { cmd: "ibstat", models: "Per-NIC port state — State, Rate, LID, GUID. Matches real DGX OS output." },
      { cmd: "rdma link show", models: "Per-rail RDMA state with WARNING flags. Matches rdma-core tool output." },
      { cmd: "show topology", models: "Rail-to-NIC mapping with switch port state — the view from the node." },
      { cmd: "show rdma links", models: "All 8 rails with ACTIVE/DOWN state and any anomaly warnings." },
      { cmd: "ethtool -S eth0", models: "NIC hardware counters — rx/tx pause frames, drops, ECN marks." },
    ],
  },
  leaf: {
    label: "Leaf Switch",
    os: "Cumulus Linux / Spectrum-X",
    promptColor: "#60a5fa",
    bgColor: "#0a0f1a",
    prompt: "leaf-rail3 #",
    commands: [
      { cmd: "show dcb pfc", models: "PFC enabled/disabled, priority, pause quanta, watchdog. Cumulus NVUE format." },
      { cmd: "show dcb ets", models: "ETS traffic class allocation, ECN marking state, DCQCN active/inactive." },
      { cmd: "show interface counters", models: "Per-port drops, pauses, buffer utilisation %. Changes with lab state." },
      { cmd: "show roce", models: "RoCEv2 config summary — PFC, ECN, DSCP, MTU, GID." },
      { cmd: "show switch port rail<N>", models: "Switch-side port state — oper, err reason, last flap time." },
      { cmd: "disable pfc / enable ecn", models: "State mutations — output of subsequent show commands reflects the change." },
    ],
  },
  spine: {
    label: "Spine Switch",
    os: "ONYX 3.11",
    promptColor: "#a78bfa",
    bgColor: "#0d0a1a",
    prompt: "spine-sw #",
    commands: [
      { cmd: "show interfaces ib status", models: "IB port states across the spine — Active/Down/Polling." },
      { cmd: "show ib counters", models: "Symbol errors, link errors, XmtDiscards per port." },
      { cmd: "show ib sm", models: "Subnet manager state — master, standby, last sweep time." },
    ],
  },
}

export function SimulatorExplainerViz() {
  const [tab, setTab] = useState<Tab>("how_it_works")
  const [deviceCtx, setDeviceCtx] = useState<DeviceContext>("dgx")

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        FabricLab simulator — one terminal per device
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              backgroundColor: tab === t.id ? "#1e3a5f" : "#0f172a",
              border: `1px solid ${tab === t.id ? "#60a5fa" : "#1e293b"}`,
              color: tab === t.id ? "#bfdbfe" : "#64748b",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "how_it_works" && (
        <div className="space-y-4 text-xs">
          <p className="text-slate-300 leading-7">
            In a real cluster investigation you have multiple SSH sessions open simultaneously — one per device. FabricLab mirrors this exactly. The topology diagram is your map. <strong className="text-white">Click a device to open a terminal session for that device.</strong> The prompt, colour scheme, and available commands all change to match the device you clicked.
          </p>

          {/* Visual demo of three terminal prompts */}
          <div className="space-y-2">
            {(Object.entries(deviceContexts) as [DeviceContext, typeof deviceContexts[DeviceContext]][]).map(([id, ctx]) => (
              <div key={id} className="rounded-xl p-3 font-mono flex items-center gap-3"
                style={{ backgroundColor: ctx.bgColor, border: `1px solid ${ctx.promptColor}33` }}>
                <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: ctx.promptColor }} />
                <span style={{ color: ctx.promptColor }}>{ctx.prompt}</span>
                <span className="text-slate-600">_</span>
                <span className="ml-auto text-[9px] rounded-full px-2 py-0.5"
                  style={{ backgroundColor: ctx.promptColor + "22", color: ctx.promptColor }}>
                  {ctx.label} · {ctx.os}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-2">
            <p className="text-cyan-200 font-semibold">Device context enforcement</p>
            <p className="text-slate-300 leading-6">
              Typing <code className="text-cyan-300">show dcb pfc</code> in a DGX terminal returns: <span className="text-amber-300">"Command not available on this device. Try: Leaf switch."</span> This is intentional — it reinforces which device owns which commands, exactly as real hardware does.
            </p>
          </div>
        </div>
      )}

      {tab === "device_contexts" && (
        <div>
          <div className="flex gap-2 mb-4">
            {(Object.entries(deviceContexts) as [DeviceContext, typeof deviceContexts[DeviceContext]][]).map(([id, ctx]) => (
              <button key={id} onClick={() => setDeviceCtx(id)}
                className="flex-1 rounded-xl px-3 py-2 text-xs transition-all text-center"
                style={{
                  backgroundColor: deviceCtx === id ? ctx.bgColor : "#0f172a",
                  border: `1px solid ${deviceCtx === id ? ctx.promptColor : "#1e293b"}`,
                  color: deviceCtx === id ? ctx.promptColor : "#64748b",
                }}>
                <div className="font-semibold">{ctx.label}</div>
                <div className="text-[9px] opacity-70 mt-0.5">{ctx.os}</div>
              </button>
            ))}
          </div>

          {(() => {
            const ctx = deviceContexts[deviceCtx]
            return (
              <div className="space-y-2">
                <div className="rounded-xl p-3 font-mono text-xs mb-3"
                  style={{ backgroundColor: ctx.bgColor, border: `1px solid ${ctx.promptColor}33` }}>
                  <span style={{ color: ctx.promptColor }}>{ctx.prompt}</span>
                  <span className="text-slate-500 ml-2">help</span>
                </div>
                {ctx.commands.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl px-3 py-2 bg-slate-800/50 text-xs">
                    <code className="font-mono flex-shrink-0 mt-0.5" style={{ color: ctx.promptColor }}>{c.cmd}</code>
                    <span className="text-slate-400 leading-5">{c.models}</span>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {tab === "does_not_model" && (
        <div className="space-y-2 text-xs">
          <p className="text-slate-400 mb-3 leading-6">The simulator is a teaching tool, not a full emulator. These are out of scope by design:</p>
          {[
            ["Packet-level RDMA behaviour", "Actual IB/RoCEv2 frame formats, queue pair state machines, transport protocol internals"],
            ["Real-time dynamics", "Actual PFC storms develop in milliseconds. The simulator state is instantaneous."],
            ["UFM management plane", "No subnet manager simulation, no LID assignment, no topology discovery protocol"],
            ["NCCL communication pattern", "AllReduce ring topology, gradient tensor exchange, NCCL timeout behaviour"],
            ["Multi-node training traffic", "The simulator represents a single cluster segment — not a full 32-node pod"],
            ["Firmware and driver versions", "Command output does not vary with driver version as real hardware does"],
            ["Hardware failure modes", "Only the fault scenarios explicitly built into each lab are modelled"],
          ].map(([what, detail]) => (
            <div key={what} className="rounded-xl bg-slate-800/50 px-4 py-3">
              <div className="font-semibold text-white">{what}</div>
              <div className="text-slate-500 mt-0.5 leading-5">{detail}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "workflow" && (
        <div className="space-y-3 text-xs">
          {[
            {
              title: "Use the topology as your map",
              desc: "The topology diagram shows the devices in the lab. Click the device you want to investigate. A terminal session opens for it. Click a different device to open a second session alongside it.",
              color: "#1e3a5f",
            },
            {
              title: "Follow the diagnostic workflow across device tabs",
              desc: "Physical layer check (DGX tab: ibstat) → Traffic check (Switch tab: show interface counters) → Config check (Switch tab: show dcb pfc) → Switch-side detail (Switch tab: show switch port rail<N>). The workflow from the chapter maps directly to which tab you open.",
              color: "#065f46",
            },
            {
              title: "The prompt tells you where you are",
              desc: "Green prompt = DGX host. Blue prompt = leaf switch. Purple prompt = spine switch. If you are confused about which commands to use, look at the prompt colour. It tells you which device owns your current session.",
              color: "#4c1d95",
            },
            {
              title: "Wrong-device errors are teaching moments",
              desc: "If the simulator tells you a command is not available on the current device, it is telling you exactly what a real SSH session would tell you. Use it as a cue to switch to the correct device tab.",
              color: "#78350f",
            },
            {
              title: "After the lab, reflect on the device switches",
              desc: "Count how many times you switched between device tabs. In a real investigation, each switch is an SSH session. Understanding why you needed each device — and in what order — is the core skill this lab builds.",
              color: "#374151",
            },
          ].map(item => (
            <div key={item.title} className="rounded-xl px-4 py-3"
              style={{ backgroundColor: item.color + "33", border: `1px solid ${item.color}55` }}>
              <div className="font-semibold text-white mb-1">{item.title}</div>
              <p className="text-slate-300 leading-6">{item.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SimulatorExplainerViz

