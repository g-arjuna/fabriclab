"use client"
import { useState } from "react"

// SubnetManagerViz
type SMScenario = "healthy" | "standby_takeover" | "sm_storm" | "no_sm"

const smScenarios: { id: SMScenario; label: string; color: string }[] = [
  { id: "healthy", label: "Healthy — UFM master", color: "#14532d" },
  { id: "standby_takeover", label: "Standby takeover in progress", color: "#78350f" },
  { id: "sm_storm", label: "SM storm — two masters", color: "#7f1d1d" },
  { id: "no_sm", label: "No SM running", color: "#374151" },
]

const smDetails: Record<SMScenario, { output: string; diagnosis: string; action: string }> = {
  healthy: {
    output: `Subnet Manager:
  Master SM:
    Node GUID:  0x506b4b0300000001
    LID:        1
    Priority:   14
    SM type:    UFM
    SM state:   Master
  
  Standby SM:
    Node GUID:  0x506b4b0300000003
    LID:        2
    Priority:   12
    SM type:    OpenSM
    SM state:   Standby

Last sweep:     00:01:23 ago
Subnet size:    256 nodes`,
    diagnosis: "Healthy configuration. UFM is master, OpenSM standby. Failover available within 30–60 seconds if UFM fails.",
    action: "No action. This is the correct production state.",
  },
  standby_takeover: {
    output: `Subnet Manager:
  Master SM:
    Node GUID:  0x506b4b0300000003
    LID:        1
    Priority:   12
    SM type:    OpenSM
    SM state:   Master  ← OpenSM took over

  Previous Master:
    Node GUID:  0x506b4b0300000001
    SM type:    UFM
    SM state:   UNREACHABLE  ← UFM failed

Last sweep:     00:00:47 ago
Subnet size:    256 nodes (re-sweeping)`,
    diagnosis: "UFM has failed and OpenSM took over. Fabric is routing but without UFM's advanced features (analytics, alerts, routing optimisation). Training jobs may have experienced a brief disruption during SM handover.",
    action: "Investigate why UFM failed (check UFM server logs). Restore UFM service. When UFM comes back online, it will win the SM election (higher priority) and resume control.",
  },
  sm_storm: {
    output: `Subnet Manager:
  Master SM:
    Node GUID:  0x506b4b0300000001
    SM type:    UFM
    SM state:   Master

  Master SM (CONFLICT):
    Node GUID:  0x506b4b0300000003
    SM type:    OpenSM
    SM state:   Master  ← two masters!

Warning: Multiple SM masters detected
  LID conflicts: 47
  Routing table updates: in progress (CONFLICTING)`,
    diagnosis: "CRITICAL: Two SMs believe they are master. They are sending conflicting LID assignments and routing table updates. Training jobs will see random connection failures. Fabric is unstable.",
    action: "URGENT: Stop one SM immediately. Verify which SM should be master (UFM). Stop OpenSM: systemctl stop opensm on the node running it. Wait for single SM to complete a clean sweep. Do not start jobs until single SM shows stable with full subnet size.",
  },
  no_sm: {
    output: `Subnet Manager:
  No subnet manager detected

  SM LID:     0 (unassigned)
  Last sweep: never

Note: Without a Subnet Manager, new IB connections
cannot be established. Existing connections using
cached path records may continue briefly.`,
    diagnosis: "No SM is running. New RDMA connections cannot be established. Any node that reboots cannot rejoin the fabric. Existing training jobs may continue briefly on cached path records but will fail on any topology change.",
    action: "Start UFM immediately. If UFM server is unreachable, start OpenSM as emergency backup: systemctl start opensm on any management host with IB connectivity.",
  },
}

export function SubnetManagerViz() {
  const [scenario, setScenario] = useState<SMScenario>("healthy")
  const detail = smDetails[scenario]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">show ib sm — subnet manager states</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {smScenarios.map(s => (
          <button key={s.id} onClick={() => setScenario(s.id)}
            className="rounded-lg px-3 py-1.5 text-xs transition-all"
            style={{
              backgroundColor: scenario === s.id ? s.color : "#0f172a",
              border: `1px solid ${scenario === s.id ? s.color : "#1e293b"}`,
              color: scenario === s.id ? "#fff" : "#64748b",
            }}>
            {s.label}
          </button>
        ))}
      </div>
      <pre className="rounded-xl bg-[#0a0f1a] border border-white/10 p-4 font-mono text-[10px] leading-6 text-slate-300 mb-4 overflow-x-auto whitespace-pre-wrap">{detail.output}</pre>
      <div className="space-y-2 text-xs">
        <div className="rounded-xl bg-slate-800/50 p-3"><span className="font-semibold text-white">Diagnosis: </span><span className="text-slate-300">{detail.diagnosis}</span></div>
        <div className="rounded-xl bg-slate-800/50 p-3"><span className="font-semibold text-cyan-400">Action: </span><span className="text-slate-300">{detail.action}</span></div>
      </div>
    </div>
  )
}
export default SubnetManagerViz
