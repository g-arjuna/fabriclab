"use client"
import { useState } from "react"

// ── ScaleDecisionViz ───────────────────────────────────────────────────────
// Interactive decision tool: select job size, parallelism strategy,
// and workload type → get a fabric recommendation with rationale.

type JobSize   = "small" | "medium" | "large" | "xlarge"
type Parallel  = "tensor" | "pipeline" | "data" | "moe"
type Workload  = "llm" | "cnn" | "moe" | "inference"

type Recommendation = {
  fabric: string
  color: string
  bg: string
  rationale: string
  warning?: string
}

function recommend(size: JobSize, parallel: Parallel, workload: Workload): Recommendation {
  // >256 GPUs → must use IB
  if (size === "xlarge") return {
    fabric: "InfiniBand / RoCEv2 (Scale-out)",
    color: "#7dd3fc",
    bg: "#0c2340",
    rationale: `Jobs exceeding 256 GPUs cannot use NVLink Switch System (maximum is 32 DGX H100 nodes / 256 GPUs). IB scale-out fabric is the only option at this scale.`,
    warning: "NVLink Switch is still present intra-node (the 4 NVSwitch chips inside each DGX node) — it handles GPU-to-GPU traffic within the node. But inter-node traffic goes over IB.",
  }

  // Small jobs — either works, NVLink Switch costs more
  if (size === "small") {
    if (workload === "inference") return {
      fabric: "IB / RoCEv2 preferred",
      color: "#7dd3fc",
      bg: "#0c2340",
      rationale: "Inference workloads have no AllReduce barrier and value per-request latency over aggregate bandwidth. IB fabric is well-suited and more cost-effective than NVLink Switch at small scale.",
    }
    return {
      fabric: "Either — NVLink Switch overkill at this scale",
      color: "#94a3b8",
      bg: "#1e293b",
      rationale: "For 8–32 GPU jobs, IB fabric is sufficient and significantly more cost-effective. NVLink Switch is still present intra-node (always). External NVLink Switch adds cost without proportional benefit at this scale.",
    }
  }

  // Tensor parallel → strongly favours NVLink Switch
  if (parallel === "tensor") return {
    fabric: "NVLink Switch System (Scale-up)",
    color: "#fbbf24",
    bg: "#1c1200",
    rationale: "Tensor parallelism requires all-to-all communication across all participating GPUs on every forward and backward pass. This is the workload NVLink Switch was designed for — 18× more bandwidth than IB means tensor parallel operations complete in microseconds instead of milliseconds.",
    warning: size === "large" ? "At 128–256 GPUs this is the optimal configuration." : undefined,
  }

  // MoE → strongly favours NVLink Switch
  if (parallel === "moe" || workload === "moe") return {
    fabric: "NVLink Switch System (Scale-up)",
    color: "#fbbf24",
    bg: "#1c1200",
    rationale: "Mixture-of-Experts (MoE) architectures require expert-parallel all-to-all communication on every token dispatch. These patterns are disproportionately expensive on IB fabrics. NVLink Switch's high all-to-all bandwidth makes MoE training viable at scale.",
  }

  // Pipeline parallel → IB is fine
  if (parallel === "pipeline") return {
    fabric: "IB / RoCEv2 sufficient",
    color: "#7dd3fc",
    bg: "#0c2340",
    rationale: "Pipeline parallelism sends activations stage-to-stage in a unicast pattern along a fixed pipeline. This is not an all-to-all workload. IB handles point-to-point communication at 400 Gbps per HCA — sufficient for typical activation sizes. NVLink Switch's advantage is wasted on this communication pattern.",
  }

  // Data parallel → depends on model size
  if (parallel === "data") {
    if (workload === "llm" && (size === "medium" || size === "large")) return {
      fabric: "NVLink Switch preferred",
      color: "#fbbf24",
      bg: "#1c1200",
      rationale: "Large language models with data parallelism require AllReduce of large gradient tensors at every step. The higher NVLink Switch bandwidth reduces the AllReduce time, which is often the critical path for large LLMs. If the model fits within the 20.5 TB unified HBM pool, it also eliminates the need for tensor parallelism.",
    }
    return {
      fabric: "IB / RoCEv2 sufficient",
      color: "#7dd3fc",
      bg: "#0c2340",
      rationale: "Data parallelism with smaller models or CNN architectures produces manageable gradient sizes. IB fabric provides adequate AllReduce bandwidth. NVLink Switch offers improvement but the cost-benefit ratio is less compelling than for tensor-parallel LLMs.",
    }
  }

  return {
    fabric: "Depends on model size",
    color: "#94a3b8",
    bg: "#1e293b",
    rationale: "Run both configurations on a representative workload and compare training samples/second. The decision often comes down to whether the model requires tensor parallelism — if yes, NVLink Switch wins clearly.",
  }
}

const SIZE_LABELS: [JobSize, string, string][] = [
  ["small",  "≤32 GPUs",    "4 DGX nodes"],
  ["medium", "64–128 GPUs", "8–16 nodes"],
  ["large",  "128–256 GPUs","16–32 nodes"],
  ["xlarge", ">256 GPUs",   ">32 nodes"],
]

const PARALLEL_LABELS: [Parallel, string, string][] = [
  ["tensor",   "Tensor parallel",   "Weight matrix sharding"],
  ["pipeline", "Pipeline parallel", "Stage-to-stage activation"],
  ["data",     "Data parallel",     "Gradient AllReduce"],
  ["moe",      "Mixture-of-Experts","Expert dispatch all-to-all"],
]

const WORKLOAD_LABELS: [Workload, string][] = [
  ["llm",       "Large Language Model (Transformer)"],
  ["cnn",       "CNN / Vision model"],
  ["moe",       "Mixture-of-Experts (MoE)"],
  ["inference", "Inference serving"],
]

export function ScaleDecisionViz() {
  const [size,     setSize]     = useState<JobSize>("large")
  const [parallel, setParallel] = useState<Parallel>("tensor")
  const [workload, setWorkload] = useState<Workload>("llm")

  const rec = recommend(size, parallel, workload)

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Scale-up vs Scale-out Decision</p>
      <p className="mb-5 text-xs text-slate-600">
        Select your job parameters to get a fabric recommendation with rationale.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Job size */}
        <div>
          <p style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Job size
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {SIZE_LABELS.map(([v, label, sub]) => (
              <button key={v}
                onClick={() => setSize(v)}
                style={{
                  background: size === v ? "#1d4ed8" : "#1e293b",
                  color: size === v ? "#fff" : "#94a3b8",
                  border: `1px solid ${size === v ? "#3b82f6" : "#334155"}`,
                  borderRadius: 6, padding: "6px 10px",
                  fontSize: 11, cursor: "pointer", textAlign: "left",
                }}
              >
                <div style={{ fontWeight: size === v ? 600 : 400 }}>{label}</div>
                <div style={{ fontSize: 9, color: size === v ? "#bfdbfe" : "#475569" }}>{sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Parallelism */}
        <div>
          <p style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Parallelism strategy
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {PARALLEL_LABELS.map(([v, label, sub]) => (
              <button key={v}
                onClick={() => setParallel(v)}
                style={{
                  background: parallel === v ? "#1d4ed8" : "#1e293b",
                  color: parallel === v ? "#fff" : "#94a3b8",
                  border: `1px solid ${parallel === v ? "#3b82f6" : "#334155"}`,
                  borderRadius: 6, padding: "6px 10px",
                  fontSize: 11, cursor: "pointer", textAlign: "left",
                }}
              >
                <div style={{ fontWeight: parallel === v ? 600 : 400 }}>{label}</div>
                <div style={{ fontSize: 9, color: parallel === v ? "#bfdbfe" : "#475569" }}>{sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Workload */}
        <div>
          <p style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Workload type
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {WORKLOAD_LABELS.map(([v, label]) => (
              <button key={v}
                onClick={() => setWorkload(v)}
                style={{
                  background: workload === v ? "#1d4ed8" : "#1e293b",
                  color: workload === v ? "#fff" : "#94a3b8",
                  border: `1px solid ${workload === v ? "#3b82f6" : "#334155"}`,
                  borderRadius: 6, padding: "6px 10px",
                  fontSize: 11, cursor: "pointer", textAlign: "left",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div style={{
        background: rec.bg,
        border: `1px solid ${rec.color}40`,
        borderRadius: 12,
        padding: 14,
        borderLeft: `3px solid ${rec.color}`,
      }}>
        <p style={{ fontSize: 10, color: rec.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
          Recommendation
        </p>
        <p style={{ fontSize: 15, fontWeight: 700, color: rec.color, marginBottom: 8 }}>
          {rec.fabric}
        </p>
        <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
          {rec.rationale}
        </p>
        {rec.warning && (
          <p style={{ fontSize: 11, color: "#fbbf24", lineHeight: 1.5, marginTop: 8, marginBottom: 0 }}>
            ⚠ {rec.warning}
          </p>
        )}
      </div>
    </div>
  )
}

export default ScaleDecisionViz
