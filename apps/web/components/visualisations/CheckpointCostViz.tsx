"use client"
import { useState } from "react"

// ── CheckpointCostViz ─────────────────────────────────────────────────────────
// Interactive checkpoint cost calculator.
// Inputs: model parameters (B), GPU count, cost/GPU-hour, checkpoint frequency,
//         per-node storage BW, optimizer type.
// Outputs: checkpoint size, write time, overhead cost/hr, recovery cost/failure,
//          MTBF estimate, optimal frequency.

export function CheckpointCostViz() {
  const [params, setParams] = useState(70)       // B parameters
  const [gpus, setGpus]     = useState(32000)
  const [costPerHr, setCost] = useState(500)     // $ per GPU-hour
  const [freqMin, setFreq]   = useState(15)      // checkpoint every N minutes
  const [storageBW, setBW]   = useState(800)     // Gbps per node
  const [optimizer, setOpt]  = useState<"adam" | "sgd">("adam")
  const [nodes, setNodes]    = useState(4000)    // compute nodes

  // Derived values
  const paramBytes = params * 1e9
  const bytesPerParam = optimizer === "adam" ? 8 : 2  // adam: params+grads+opt states, sgd: params only
  const checkpointGB = (paramBytes * bytesPerParam) / 1e9
  const storageBWGBs = storageBW / 8  // Gbps → GB/s
  const writeTimeSec = checkpointGB / storageBWGBs
  const writeTimeMin = writeTimeSec / 60

  const gpuPerNode = 8
  const gpuMTBF_hr = 10000
  const clusterMTBF_hr = gpuMTBF_hr / gpus
  const clusterMTBF_min = clusterMTBF_hr * 60

  const costPerGpuMin = costPerHr / 60
  const totalCostPerMin = costPerGpuMin * gpus

  // Checkpoint overhead per checkpoint (GPUs idle during write)
  const checkpointCostPerEvent = totalCostPerMin * writeTimeMin
  const checkpointsPerHr = 60 / freqMin
  const overheadCostPerHr = checkpointCostPerEvent * checkpointsPerHr

  // Recovery cost: expected wasted compute when failure occurs
  // Expected time since last checkpoint at failure = freqMin / 2
  const expectedLossMin = freqMin / 2
  const recoveryCostPerFailure = totalCostPerMin * expectedLossMin

  // Failures per day
  const failuresPerDay = 24 / clusterMTBF_hr

  // Optimal freq: minimise (overhead + expected recovery) — approx sqrt(2 × write_time × MTBF)
  const optFreqMin = Math.sqrt(2 * writeTimeMin * clusterMTBF_min)

  const fmt = (n: number, decimals = 1) => n.toFixed(decimals)
  const fmtMoney = (n: number) =>
    n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n.toFixed(0)}`

  const sliders = [
    { label: "Model size", unit: "B params", value: params, set: setParams, min: 7, max: 400, step: 7, fmt: (v: number) => `${v}B` },
    { label: "GPU count", unit: "GPUs", value: gpus, set: setGpus, min: 256, max: 65536, step: 256, fmt: (v: number) => v.toLocaleString() },
    { label: "Cost per GPU-hour", unit: "$/GPU-hr", value: costPerHr, set: setCost, min: 100, max: 2000, step: 50, fmt: (v: number) => `$${v}` },
    { label: "Checkpoint every", unit: "min", value: freqMin, set: setFreq, min: 1, max: 60, step: 1, fmt: (v: number) => `${v} min` },
    { label: "Storage BW per node", unit: "Gbps", value: storageBW, set: setBW, min: 200, max: 1600, step: 200, fmt: (v: number) => `${v}G` },
  ]

  const results = [
    { label: "Checkpoint size", value: `${fmt(checkpointGB, 0)} GB`, sub: `${params}B params × ${bytesPerParam} bytes/param (${optimizer === "adam" ? "Adam: params+grad+opt" : "SGD: params only"})`, color: "#60a5fa" },
    { label: "Write time per checkpoint", value: `${fmt(writeTimeSec, 1)} sec`, sub: `at ${fmt(storageBWGBs, 0)} GB/s effective storage BW`, color: "#a78bfa" },
    { label: "Checkpoint overhead", value: fmtMoney(overheadCostPerHr) + "/hr", sub: `${checkpointsPerHr.toFixed(1)} checkpoints/hr × ${fmtMoney(checkpointCostPerEvent)}/checkpoint`, color: "#f59e0b" },
    { label: "Recovery cost per failure", value: fmtMoney(recoveryCostPerFailure), sub: `avg ${fmt(expectedLossMin, 0)} min lost × ${fmtMoney(totalCostPerMin)}/min cluster`, color: "#ef4444" },
    { label: "Cluster MTBF", value: `${fmt(clusterMTBF_min, 0)} min`, sub: `${gpus.toLocaleString()} GPUs × ${gpuMTBF_hr.toLocaleString()}hr/GPU MTBF`, color: "#22c55e" },
    { label: "Optimal checkpoint frequency", value: `~${fmt(optFreqMin, 0)} min`, sub: `minimises overhead + expected recovery cost`, color: "#10b981" },
  ]

  const freqWarning = freqMin < optFreqMin * 0.5
    ? "Checkpointing too frequently — overhead dominates"
    : freqMin > optFreqMin * 2
    ? "Checkpointing too infrequently — recovery cost dominates"
    : null

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        Checkpoint cost calculator
      </p>
      <p className="mb-5 text-xs text-slate-600">
        Adjust parameters to see checkpoint size, write time, overhead cost, and optimal frequency
      </p>

      {/* Optimizer selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="text-[10px] text-slate-500 self-center">Optimizer:</span>
        {(["adam", "sgd"] as const).map(o => (
          <button key={o} onClick={() => setOpt(o)}
            className="px-3 py-1 rounded-lg text-[10px] font-bold transition-all"
            style={{
              backgroundColor: optimizer === o ? "#1e3a5f" : "#0f172a",
              border: `1px solid ${optimizer === o ? "#60a5fa" : "#1e293b"}`,
              color: optimizer === o ? "#93c5fd" : "#475569",
            }}
          >
            {o === "adam" ? "Adam (P × 8 bytes)" : "SGD (P × 2 bytes)"}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="space-y-3 mb-5">
        {sliders.map(s => (
          <div key={s.label} className="rounded-xl bg-slate-800/50 p-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">{s.label}</span>
              <span className="text-white font-bold font-mono">{s.fmt(s.value)}</span>
            </div>
            <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
              onChange={e => s.set(Number(e.target.value))}
              className="w-full accent-cyan-400" />
          </div>
        ))}
      </div>

      {/* Frequency warning */}
      {freqWarning && (
        <div className="mb-4 rounded-xl bg-amber-950/30 border border-amber-500/20 p-3">
          <div className="text-[10px] text-amber-400">⚠ {freqWarning}</div>
          <div className="text-[9px] text-slate-500 mt-0.5">Optimal: ~{fmt(optFreqMin, 0)} min based on MTBF and write time</div>
        </div>
      )}

      {/* Results grid */}
      <div className="grid gap-2 sm:grid-cols-2">
        {results.map(r => (
          <div key={r.label} className="rounded-xl bg-slate-800/40 p-3">
            <div className="text-[9px] text-slate-500 mb-0.5">{r.label}</div>
            <div className="text-sm font-bold font-mono" style={{ color: r.color }}>{r.value}</div>
            <div className="text-[8px] text-slate-600 mt-0.5 leading-3">{r.sub}</div>
          </div>
        ))}
      </div>

      {/* Daily impact */}
      <div className="mt-3 rounded-xl bg-slate-800/60 border border-white/5 p-3">
        <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-2">Daily cluster impact</div>
        <div className="grid gap-2 text-center text-xs sm:grid-cols-3">
          <div>
            <div className="text-slate-500 text-[9px]">Failures/day</div>
            <div className="font-bold text-red-400">{fmt(failuresPerDay, 1)}</div>
          </div>
          <div>
            <div className="text-slate-500 text-[9px]">Recovery cost/day</div>
            <div className="font-bold text-orange-400">{fmtMoney(recoveryCostPerFailure * failuresPerDay)}</div>
          </div>
          <div>
            <div className="text-slate-500 text-[9px]">Overhead cost/day</div>
            <div className="font-bold text-yellow-400">{fmtMoney(overheadCostPerHr * 24)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckpointCostViz
