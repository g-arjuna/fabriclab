"use client"
import { useMemo, useState } from "react"
import { gbpsToGBps, transferDurationSeconds, gpuHoursLost } from "@/lib/ch0Math"

function money(n: number) {
  if (!Number.isFinite(n)) return "—"
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

export function CheckpointCostViz() {
  const [paramsB, setParamsB] = useState(70)
  const [precisionBytes, setPrecisionBytes] = useState(2)
  const [stateMultiplier, setStateMultiplier] = useState(1)
  const [bandwidthGbps, setBandwidthGbps] = useState(800)
  const [gpus, setGpus] = useState(32000)
  const [intervalMin, setIntervalMin] = useState(30)
  const [gpuHourCost, setGpuHourCost] = useState(500)

  const out = useMemo(() => {
    const weightsGB = paramsB * precisionBytes
    const checkpointGB = weightsGB * stateMultiplier
    const writeSec = transferDurationSeconds(checkpointGB, gbpsToGBps(bandwidthGbps))
    const worstGpuHours = gpuHoursLost(gpus, intervalMin * 60)
    const expectedGpuHours = gpuHoursLost(gpus, (intervalMin * 60) / 2)
    const blockingGpuHours = gpuHoursLost(gpus, writeSec)
    return { weightsGB, checkpointGB, writeSec, worstGpuHours, expectedGpuHours, blockingGpuHours,
      worstCost: worstGpuHours * gpuHourCost, blockingCost: blockingGpuHours * gpuHourCost }
  }, [paramsB, precisionBytes, stateMultiplier, bandwidthGbps, gpus, intervalMin, gpuHourCost])

  const controls = [
    { label: "Model parameters", value: paramsB, set: setParamsB, min: 7, max: 400, step: 1, unit: "billion" },
    { label: "Checkpoint state multiplier", value: stateMultiplier, set: setStateMultiplier, min: 1, max: 8, step: 0.5, unit: "× weights" },
    { label: "Effective write bandwidth", value: bandwidthGbps, set: setBandwidthGbps, min: 100, max: 1600, step: 100, unit: "Gb/s" },
    { label: "GPUs in job", value: gpus, set: setGpus, min: 256, max: 65536, step: 256, unit: "GPUs" },
    { label: "Checkpoint interval", value: intervalMin, set: setIntervalMin, min: 5, max: 120, step: 5, unit: "minutes" },
    { label: "Hypothetical cost", value: gpuHourCost, set: setGpuHourCost, min: 1, max: 2000, step: 1, unit: "$/GPU-hour" },
  ]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Checkpoint calculator — explicit assumptions, visible units</p>
      <p className="mb-4 text-xs leading-5 text-slate-500">
        Illustrative arithmetic only. Effective bandwidth means measured end-to-end checkpoint write throughput, not nominal compute-fabric capacity. The cost input is hypothetical and configurable.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {[2, 4].map((bytes) => (
          <button key={bytes} type="button" onClick={() => setPrecisionBytes(bytes)}
            className="rounded-lg px-3 py-2 text-xs"
            style={{ border: `1px solid ${precisionBytes === bytes ? "#38bdf8" : "#1e293b"}`, backgroundColor: precisionBytes === bytes ? "#082f49" : "#0f172a", color: precisionBytes === bytes ? "#bae6fd" : "#94a3b8" }}>
            {bytes === 2 ? "BF16/FP16 · 2 bytes/param" : "FP32 · 4 bytes/param"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {controls.map((c) => (
          <label key={c.label} className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-xs">
            <span className="mb-1 flex justify-between gap-3"><span className="text-slate-400">{c.label}</span><strong className="font-mono text-slate-100">{c.value} {c.unit}</strong></span>
            <input className="w-full accent-cyan-400" type="range" min={c.min} max={c.max} step={c.step} value={c.value} onChange={(e) => c.set(Number(e.target.value))} />
          </label>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ["Weights only", `${out.weightsGB.toFixed(1)} GB`, `${paramsB}B × ${precisionBytes} bytes`],
          ["Checkpoint size", `${out.checkpointGB.toFixed(1)} GB`, "weights × state multiplier"],
          ["Ideal write time", `${out.writeSec.toFixed(2)} seconds`, `at ${(bandwidthGbps / 8).toFixed(1)} GB/s`],
          ["Worst lost work", `${out.worstGpuHours.toLocaleString(undefined, { maximumFractionDigits: 1 })} GPU-hours`, `${gpus} GPUs × ${intervalMin} min`],
          ["Approx. expected lost work", `${out.expectedGpuHours.toLocaleString(undefined, { maximumFractionDigits: 1 })} GPU-hours`, "uniform-failure approximation"],
          ["Blocking cost per checkpoint", money(out.blockingCost), `${out.blockingGpuHours.toFixed(3)} GPU-hours if all GPUs block`],
        ].map(([label, value, sub]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
            <div className="mt-1 font-mono text-lg font-bold text-cyan-200">{value}</div>
            <div className="mt-1 text-xs text-slate-500">{sub}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-6 text-slate-400">
        Formulas: ideal seconds = checkpoint GB / effective GB/s. Lost GPU-hours = GPUs × blocked-or-lost seconds / 3600. The “expected lost work” output assumes failures uniformly distributed within the checkpoint interval; production failure modes can invalidate that approximation.
      </p>
    </div>
  )
}

export default CheckpointCostViz
