"use client"
import { useState } from "react"

type Symptom = "socket" | "partial" | "timeout" | "clean_degraded"

const SYMPTOMS: { id: Symptom; label: string; metric: string; severity: string; color: string; border: string }[] = [
  { id: "socket", label: "busbw < 5% of expected", metric: "~2–4 GB/s instead of ~380 GB/s", severity: "CRITICAL", color: "#7f1d1d", border: "#ef4444" },
  { id: "partial", label: "busbw 40–70% of expected", metric: "~150–280 GB/s on 32-node BasePOD", severity: "HIGH", color: "#78350f", border: "#f59e0b" },
  { id: "timeout", label: "NCCL timeout errors mid-training", metric: "Job crashes, QP error in log", severity: "CRITICAL", color: "#4c1d95", border: "#a78bfa" },
  { id: "clean_degraded", label: "busbw good on tests, slow in training", metric: "15–25% below test results", severity: "MEDIUM", color: "#1e3a5f", border: "#60a5fa" },
]

const DIAGNOSIS: Record<Symptom, {
  rootCause: string
  steps: { step: number; device: string; prompt: string; command: string; lookFor: string; ifFound: string }[]
  fix: string
}> = {
  socket: {
    rootCause: "NCCL selected socket (TCP) transport — RDMA devices not found",
    steps: [
      { step: 1, device: "DGX", prompt: "dgx-node-a:~$", command: "NCCL_DEBUG=INFO training_script.py 2>&1 | grep transport", lookFor: "'transport selected: socket'", ifFound: "Confirmed — NCCL fell back to TCP. Proceed to step 2." },
      { step: 2, device: "DGX", prompt: "dgx-node-a:~$", command: "rdma link show", lookFor: "mlx5_0/1 state ACTIVE ... type RoCE", ifFound: "NICs are up and visible. NCCL just has the wrong name. Proceed to step 3." },
      { step: 3, device: "DGX", prompt: "dgx-node-a:~$", command: "echo $NCCL_IB_HCA", lookFor: "mlx5_bond_0 or empty or wrong device name", ifFound: "Root cause found. Fix NCCL_IB_HCA." },
    ],
    fix: "Set NCCL_IB_HCA to the correct device names from rdma link show output. Also verify NCCL_SOCKET_IFNAME points to management ethernet (eno1), not training NIC (eth0).",
  },
  partial: {
    rootCause: "RDMA active but fabric has congestion or load balancing failure",
    steps: [
      { step: 1, device: "Spine switch", prompt: "spine-sw #", command: "show interface counters", lookFor: "Some uplinks at 80–90%, others at 5–10%", ifFound: "Load balancing failure (Chapter 6). Fix per-packet LB first, then retest." },
      { step: 2, device: "Leaf switch", prompt: "leaf-sw #", command: "show interface counters", lookFor: "Output drops > 0, or PFC pause frames growing rapidly", ifFound: "Drops → PFC/ECN misconfiguration (Chapter 5). Sustained pauses + even spine → congestion, check ECN." },
      { step: 3, device: "DGX", prompt: "dgx-node-a:~$", command: "ethtool -S eth0", lookFor: "rx_pfc_pause_frames growing, rx_ecn_marked = 0", ifFound: "ECN not configured (Chapter 5). Enable ECN and DCQCN." },
      { step: 4, device: "Leaf switch", prompt: "leaf-sw #", command: "show dcb pfc", lookFor: "PFC enabled priorities: 3", ifFound: "PFC correct. If ECN also correct and spine even → check topology oversubscription (Chapter 7)." },
    ],
    fix: "Based on which step identifies the issue: fix load balancing (Ch6), fix ECN/PFC configuration (Ch5), or recalculate topology oversubscription (Ch7).",
  },
  timeout: {
    rootCause: "Packet drop caused PSN gap → QP error state → AllReduce stalls",
    steps: [
      { step: 1, device: "DGX", prompt: "dgx-node-a:~$", command: "ibstat | grep -A 3 'Port 1'", lookFor: "State: Error on any port", ifFound: "Identifies which rail suffered the drop. Note the mlx5_N number." },
      { step: 2, device: "DGX", prompt: "dgx-node-a:~$", command: "ethtool -S eth0", lookFor: "tx_dropped > 0 or rx_pfc_pause_frames very high", ifFound: "If tx_dropped > 0 → drops occurring despite PFC. Check PFC priority match (Ch5). If pauses very high → pause storm (Ch5 Act 3)." },
      { step: 3, device: "UFM server", prompt: "ufm-server:~$", command: "show ufm events --severity ERROR", lookFor: "Link flap or SymbolError spike at time of NCCL timeout", ifFound: "Physical layer issue. Check the cable and transceiver on the identified rail." },
      { step: 4, device: "IB switch (ONYX)", prompt: "spine-switch #", command: "show ib counters", lookFor: "SymbolErrors growing on specific port", ifFound: "Bad cable or transceiver. Replace it on the identified rail." },
    ],
    fix: "Replace faulty cable/transceiver on identified rail (if physical). Fix PFC misconfiguration if drops occurring. Restart training job to re-establish QPs after physical fix.",
  },
  clean_degraded: {
    rootCause: "Test vs training difference: tensor sizes, mixed parallelism traffic, or DCQCN over-reaction",
    steps: [
      { step: 1, device: "DGX", prompt: "dgx-node-a:~$", command: "NCCL_DEBUG=INFO training_script.py 2>&1 | grep 'AllReduce size'", lookFor: "Actual tensor sizes being transferred", ifFound: "Run nccl-tests at those exact sizes — if they show low busbw too, this is a real fabric issue." },
      { step: 2, device: "DGX", prompt: "dgx-node-a:~$", command: "ethtool -S eth0", lookFor: "rx_ecn_marked growing rapidly during training", ifFound: "DCQCN is over-reacting. Reduce rp_time_reset from 300ms to 100ms via mlxconfig." },
      { step: 3, device: "Leaf switch", prompt: "leaf-sw #", command: "show interface counters", lookFor: "Uplink utilisation during actual training (not nccl-tests)", ifFound: "If uneven → load balancing failing under real mixed traffic (pipeline + AllReduce). Check DLB/RSHP config." },
    ],
    fix: "Tune DCQCN rp_time_reset if ECN over-reaction confirmed. Enable RSHP if load balancing fails under mixed traffic. Verify NCCL_IB_QPS_PER_CONNECTION=4 for better path diversity.",
  },
}

export function NCCLCorrelationViz() {
  const [selected, setSelected] = useState<Symptom | null>("socket")
  const d = selected ? DIAGNOSIS[selected] : null
  const s = selected ? SYMPTOMS.find(x => x.id === selected)! : null

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        NCCL symptom → fabric diagnostic path
      </p>
      <p className="mb-4 text-xs text-slate-600">Select your symptom to see the exact diagnostic sequence</p>

      <div className="mb-5 grid gap-2 sm:grid-cols-2">
        {SYMPTOMS.map((sym) => (
          <button key={sym.id} onClick={() => setSelected(sym.id)}
            className="rounded-xl p-3 text-left transition-all"
            style={{
              backgroundColor: selected === sym.id ? sym.color + "44" : "#0f172a",
              border: `1px solid ${selected === sym.id ? sym.border : "#1e293b"}`,
            }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-bold rounded px-1" style={{ backgroundColor: sym.color, color: sym.border }}>
                {sym.severity}
              </span>
            </div>
            <div className="text-xs font-semibold text-white">{sym.label}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{sym.metric}</div>
          </button>
        ))}
      </div>

      {d && s && (
        <div className="space-y-3">
          <div className="rounded-xl p-3" style={{ backgroundColor: s.color + "22", border: `1px solid ${s.border}33` }}>
            <div className="text-[10px] text-slate-500 mb-1">Root cause</div>
            <p className="text-slate-300 text-xs">{d.rootCause}</p>
          </div>

          <div className="space-y-2">
            {d.steps.map((step) => (
              <div key={step.step} className="rounded-xl border border-white/8 overflow-hidden">
                <div className="flex items-center gap-3 bg-slate-800/50 px-3 py-2">
                  <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: s.color, color: s.border }}>
                    {step.step}
                  </div>
                  <div className="text-xs font-semibold text-white">{step.device}</div>
                </div>
                <div className="px-3 pb-3 pt-2 space-y-2">
                  <div className="rounded-lg bg-[#060d18] px-3 py-2 font-mono text-xs">
                    <span className="text-slate-600">{step.prompt} </span>
                    <span className="break-all text-cyan-300">{step.command}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 text-[10px]">
                    <div>
                      <span className="text-slate-500">Look for: </span>
                      <span className="break-all text-amber-300 font-mono">{step.lookFor}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">If found: </span>
                      <span className="text-slate-300">{step.ifFound}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-xs">
            <span className="font-semibold text-green-400">Fix: </span>
            <span className="text-slate-300">{d.fix}</span>
          </div>
        </div>
      )}
    </div>
  )
}
export default NCCLCorrelationViz
