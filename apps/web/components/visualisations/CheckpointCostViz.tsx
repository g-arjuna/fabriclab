"use client"
import { useMemo, useState } from "react"
import { financialCost, gbpsToGBps, gpuHoursLost, modelWeightsGB, transferDurationSeconds } from "@/lib/ch0Math"

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
  const [gpuHourCost, setGpuHourCost] = useState(5)

  const out = useMemo(() => {
    const weightsGB = modelWeightsGB(paramsB, precisionBytes)
    const checkpointGB = weightsGB * stateMultiplier
    const effectiveBandwidthGBps = gbpsToGBps(bandwidthGbps)
    const writeSec = transferDurationSeconds(checkpointGB, effectiveBandwidthGBps)
    const worstGpuHours = gpuHoursLost(gpus, intervalMin * 60)
    const expectedGpuHours = gpuHoursLost(gpus, (intervalMin * 60) / 2)
    const blockingGpuHours = gpuHoursLost(gpus, writeSec)
    return {
      weightsGB,
      checkpointGB,
      effectiveBandwidthGBps,
      writeSec,
      worstGpuHours,
      expectedGpuHours,
      blockingGpuHours,
      worstCost: financialCost(worstGpuHours, gpuHourCost),
      expectedCost: financialCost(expectedGpuHours, gpuHourCost),
      blockingCost: financialCost(blockingGpuHours, gpuHourCost),
    }
  }, [paramsB, precisionBytes, stateMultiplier, bandwidthGbps, gpus, intervalMin, gpuHourCost])

  const controls = [
    { label: "Model parameters", value: paramsB, set: setParamsB, min: 7, max: 400, step: 1, unit: "billion", testid: "checkpoint-params" },
    { label: "Checkpoint state multiplier", value: stateMultiplier, set: setStateMultiplier, min: 1, max: 8, step: 0.5, unit: "× weights", testid: "checkpoint-multiplier" },
    { label: "Aggregate checkpoint write bandwidth", value: bandwidthGbps, set: setBandwidthGbps, min: 100, max: 1600, step: 100, unit: "Gb/s", testid: "checkpoint-bandwidth" },
    { label: "GPUs in job", value: gpus, set: setGpus, min: 256, max: 65536, step: 256, unit: "GPUs", testid: "checkpoint-gpus" },
    { label: "Checkpoint interval", value: intervalMin, set: setIntervalMin, min: 5, max: 120, step: 5, unit: "minutes", testid: "checkpoint-interval" },
    { label: "Illustrative cost", value: gpuHourCost, set: setGpuHourCost, min: 1, max: 2000, step: 1, unit: "$/GPU-hour", testid: "checkpoint-cost" },
  ]

  return (
    <div data-testid="checkpoint-cost-viz" className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Checkpoint calculator — aggregate checkpoint / aggregate bandwidth scope</p>
      <p className="mb-4 text-xs leading-5 text-slate-500">
        The bandwidth input means aggregate effective end-to-end write bandwidth for the entire checkpoint after implementation overheads, not nominal compute-fabric capacity and not per-node bandwidth. A sharded implementation must still respect storage-system aggregate capacity and a critical-path shard; linear scaling is not assumed here. The cost input is an explicit teaching value, not a market price.
      </p>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Checkpoint precision">
        {[2, 4].map((bytes) => (
          <button key={bytes} type="button" aria-pressed={precisionBytes === bytes} onClick={() => setPrecisionBytes(bytes)}
            className="rounded-lg px-3 py-2 text-xs"
            style={{ border: `1px solid ${precisionBytes === bytes ? "#38bdf8" : "#1e293b"}`, backgroundColor: precisionBytes === bytes ? "#082f49" : "#0f172a", color: precisionBytes === bytes ? "#bae6fd" : "#94a3b8" }}>
            {bytes === 2 ? "BF16/FP16 · 2 bytes/param" : "FP32 · 4 bytes/param"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {controls.map((c) => (
          <label key={c.label} className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-xs">
            <span className="mb-1 flex justify-between gap-3"><span className="text-slate-400">{c.label}</span><strong className="font-mono text-slate-100" data-testid={`${c.testid}-value`}>{c.value} {c.unit}</strong></span>
            <input data-testid={c.testid} aria-label={c.label} className="w-full accent-cyan-400" type="range" min={c.min} max={c.max} step={c.step} value={c.value} onChange={(e) => c.set(Number(e.target.value))} />
          </label>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="checkpoint-results">
        {[
          ["Weights only", `${out.weightsGB.toFixed(1)} GB`, `${paramsB}B × ${precisionBytes} bytes`],
          ["Estimated checkpoint size", `${out.checkpointGB.toFixed(1)} GB`, "weights × state multiplier"],
          ["Idealized transfer duration", `${out.writeSec.toFixed(2)} seconds`, `at ${out.effectiveBandwidthGBps.toFixed(1)} GB/s aggregate`],
          ["Blocking GPU-hours", `${out.blockingGpuHours.toFixed(3)} GPU-hours`, "if all GPUs block for the whole write"],
          ["Blocking financial cost", money(out.blockingCost), "checkpoint overhead, not lost progress"],
          ["Worst-case lost useful work", `${out.worstGpuHours.toLocaleString(undefined, { maximumFractionDigits: 1 })} GPU-hours`, `${gpus} GPUs × ${intervalMin} min`],
          ["Worst-case financial cost", money(out.worstCost), "useful progress lost; excludes recovery cost"],
          ["Approx. expected lost work", `${out.expectedGpuHours.toLocaleString(undefined, { maximumFractionDigits: 1 })} GPU-hours`, "uniform failure-time approximation"],
          ["Approx. expected financial cost", money(out.expectedCost), "same separate approximation"],
        ].map(([label, value, sub]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-slate-950/70 p-3" data-testid={`checkpoint-result-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
            <div className="mt-1 font-mono text-lg font-bold text-cyan-200">{value}</div>
            <div className="mt-1 text-xs text-slate-500">{sub}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-6 text-slate-400">
        Formulas: ideal seconds = checkpoint GB / aggregate effective GB/s. GPU-hours = GPUs × affected seconds / 3600. Checkpoint blocking overhead, useful work lost after a failure, expected lost progress under a failure-time model, and restart/recovery overhead are separate quantities. The expected value shown assumes failures uniformly distributed within the checkpoint interval. Optimal checkpoint frequency depends on failure rate, recovery time, checkpoint implementation, and overlap behavior.
      </p>
    </div>
  )
}

export default CheckpointCostViz
