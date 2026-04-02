"use client"
import { useState } from "react"

// ONYXNavigationViz
type ONYXMode = "user" | "enable" | "configure" | "interface"

const modeInfo: Record<ONYXMode, {
  prompt: string
  description: string
  exampleCommands: string[]
  howToEnter: string
  howToExit: string
  color: string
}> = {
  user: {
    prompt: "switch >",
    description: "User mode. Limited view-only commands. Cannot run diagnostic commands.",
    exampleCommands: ["show version (limited)", "ping", "help"],
    howToEnter: "Default after login",
    howToExit: "Type: enable",
    color: "#374151",
  },
  enable: {
    prompt: "switch #",
    description: "Privileged mode. Full access to all show commands, clear commands, and diagnostic tools. This is where you spend 95% of your time on ONYX.",
    exampleCommands: ["show interfaces ib status", "show ib counters", "show ib sm", "show version", "clear counters ib 1/3", "show interface ib 1/1"],
    howToEnter: "Type: enable (from user mode)",
    howToExit: "Type: disable (back to user) or exit",
    color: "#1e3a5f",
  },
  configure: {
    prompt: "switch (config) #",
    description: "Configuration mode. Used for switch-local settings: hostname, management IP, NTP, SNMP. NOT used for InfiniBand routing configuration — that is UFM's domain.",
    exampleCommands: ["hostname my-switch", "interface mgmt0 ip address 10.0.1.1/24", "ntp server 10.0.0.1", "interface ib 1/5 description 'dgx-node-02-rail-5'"],
    howToEnter: "Type: configure terminal (from enable mode)",
    howToExit: "Type: exit or Ctrl+Z",
    color: "#065f46",
  },
  interface: {
    prompt: "switch (config-if) #",
    description: "Interface configuration mode. Configure per-port settings like description, admin state. You can shut down and re-enable ports here.",
    exampleCommands: ["description 'dgx-node-01-rail-0'", "shutdown", "no shutdown", "exit"],
    howToEnter: "Type: interface ib 1/1 (from configure mode)",
    howToExit: "Type: exit (back to configure)",
    color: "#4c1d95",
  },
}

export function ONYXNavigationViz() {
  const [mode, setMode] = useState<ONYXMode>("enable")
  const info = modeInfo[mode]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">ONYX CLI mode structure</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {(Object.keys(modeInfo) as ONYXMode[]).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className="rounded-lg px-3 py-2 text-xs transition-all text-left"
            style={{
              backgroundColor: mode === m ? modeInfo[m].color : "#0f172a",
              border: `1px solid ${mode === m ? modeInfo[m].color : "#1e293b"}`,
              color: mode === m ? "#fff" : "#64748b",
            }}>
            <div className="font-mono">{modeInfo[m].prompt}</div>
            <div className="text-[9px] opacity-70 mt-0.5 capitalize">{m} mode</div>
          </button>
        ))}
      </div>
      <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: info.color + "22", border: `1px solid ${info.color}44` }}>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
          <code className="font-mono text-sm text-cyan-300 bg-[#0a0f1a] px-3 py-1.5 rounded-lg">{info.prompt} _</code>
          <span className="text-xs text-slate-500">{mode} mode</span>
        </div>
        <p className="text-sm leading-7 text-slate-300">{info.description}</p>
        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-lg bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">How to enter</div>
            <code className="text-cyan-300 font-mono">{info.howToEnter}</code>
          </div>
          <div className="rounded-lg bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">How to exit</div>
            <code className="text-cyan-300 font-mono">{info.howToExit}</code>
          </div>
        </div>
        <div className="rounded-lg bg-black/20 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Example commands in this mode</div>
          <div className="space-y-1">
            {info.exampleCommands.map(cmd => (
              <div key={cmd} className="font-mono text-xs text-slate-300 break-all">{cmd}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
export default ONYXNavigationViz
