"use client"

import { useState } from "react"

type Mode = "single" | "data" | "tensor" | "pipeline"

const modes: { id: Mode; label: string; subtitle: string }[] = [
  { id: "single", label: "Single GPU", subtitle: "Model fits in one GPU" },
  { id: "data", label: "Data parallel", subtitle: "Same model, different data" },
  { id: "tensor", label: "Tensor parallel", subtitle: "One layer split across GPUs" },
  { id: "pipeline", label: "Pipeline parallel", subtitle: "Different layers on different GPUs" },
]

const descriptions: Record<Mode, { problem: string; communication: string; networkNeed: string }> = {
  single: {
    problem: "The entire model fits in one GPU's memory. No inter-GPU communication needed. Training is simple. This was possible for smaller models — GPT-2 (1.5B parameters) fit on one GPU. GPT-3 (175B parameters) requires roughly 700 GB of GPU memory at full precision. That does not fit on one GPU.",
    communication: "None required.",
    networkNeed: "No network needed for training. A single GPU just needs PCIe bandwidth to load data from system RAM.",
  },
  data: {
    problem: "The full model is replicated on every GPU. Each GPU processes a different batch of training data simultaneously. After each step, all GPUs must exchange gradient updates — every GPU needs to know what every other GPU learned. This is the AllReduce operation. Note: this strategy requires the full model to fit on a single GPU — a 7B parameter model at BF16 needs ~14 GB, which fits. A 70B model needs ~140 GB for weights alone plus ~840 GB for optimizer states during training — it cannot use standard data parallelism and requires FSDP or tensor parallelism instead.",
    communication: "AllReduce: every GPU sends its gradients to every other GPU, they are summed, and the result goes back to all. Modern AllReduce uses Ring-AllReduce, which keeps per-GPU network load roughly constant at 2 × model_size regardless of cluster size — this is why training scales to thousands of GPUs. For a 7B model at BF16: each GPU moves approximately 28 GB of gradient data per step. For a 70B model with sharding, the per-GPU load depends on the sharding strategy.",
    networkNeed: "HIGH bandwidth, zero loss. The AllReduce must complete before the next step can begin. If any GPU is waiting on the network, every GPU is waiting. A single dropped packet causes RDMA queue pair error and full retransmission — potentially hundreds of milliseconds of stall across the entire cluster. This is why lossless networking is non-negotiable.",
  },
  tensor: {
    problem: "A single model layer (e.g. a transformer attention head) is split across multiple GPUs. Each GPU holds a shard of the weight matrix. Every forward pass requires communication between the GPUs holding different shards. This runs at the speed of NVLink — within a single DGX chassis. You would not tensor-parallelise across nodes via InfiniBand.",
    communication: "All-to-all within a small group (typically 4 or 8 GPUs). Very frequent — happens every forward and backward pass for every layer. Must be low latency, not just high bandwidth. This is why NVLink at 900 GB/s exists — the latency of InfiniBand would make tensor parallelism across nodes impractical.",
    networkNeed: "Extremely low latency, very high bandwidth. Solved by NVLink within a chassis. Not solved by any external network.",
  },
  pipeline: {
    problem: "The model is split into stages. GPUs holding early layers process the first micro-batch, then pass activations to the next stage while processing the second micro-batch. This creates a pipeline. It requires less communication volume than data parallelism, but introduces 'pipeline bubbles' — periods where GPUs are idle waiting for the pipeline to fill.",
    communication: "Point-to-point: each GPU sends activations to the next stage in the pipeline. Communication volume equals activation size × micro-batch size — much less than AllReduce. But it requires low latency for the pipeline to stay efficient.",
    networkNeed: "MODERATE. Lower bandwidth than data parallelism but still requires lossless delivery. Pipeline bubbles grow when the network is slow.",
  },
}

export function TrainingParallelismViz() {
  const [mode, setMode] = useState<Mode>("single")
  const desc = descriptions[mode]

  const gpuCount = mode === "single" ? 1 : mode === "tensor" ? 4 : 8
  const gpuColors: Record<Mode, string[]> = {
    single: ["#166534"],
    data: ["#166534", "#166534", "#166534", "#166534", "#166534", "#166534", "#166534", "#166534"],
    tensor: ["#1e40af", "#1e40af", "#7c3aed", "#7c3aed"],
    pipeline: ["#1e40af", "#065f46", "#92400e", "#7c2d12"],
  }
  const gpuLabels: Record<Mode, string[]> = {
    single: ["Full model"],
    data: ["7B model copy", "7B model copy", "7B model copy", "7B model copy", "7B model copy", "7B model copy", "7B model copy", "7B model copy"],
    tensor: ["Layer shard A", "Layer shard B", "Layer shard C", "Layer shard D"],
    pipeline: ["Stage 1\nLayers 1–8", "Stage 2\nLayers 9–16", "Stage 3\nLayers 17–24", "Stage 4\nLayers 25–32"],
  }

  const showArrow = mode !== "single"
  const arrowColor = mode === "data" ? "#22c55e" : mode === "tensor" ? "#818cf8" : "#f59e0b"

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        Why GPUs must communicate — parallelism strategies
      </p>

      {/* Mode selector */}
      <div className="flex flex-wrap gap-2 mb-5">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className="rounded-xl px-3 py-2 text-xs transition-all"
            style={{
              backgroundColor: mode === m.id ? "#1e3a5f" : "#0f172a",
              border: `1px solid ${mode === m.id ? "#60a5fa" : "#1e293b"}`,
              color: mode === m.id ? "#bfdbfe" : "#64748b",
            }}
          >
            <div className="font-semibold">{m.label}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{m.subtitle}</div>
          </button>
        ))}
      </div>

      {/* GPU grid */}
      <div className="mb-5 flex flex-wrap gap-2">
        {gpuLabels[mode].map((label, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center rounded-xl px-3 py-2 text-center"
            style={{
              backgroundColor: gpuColors[mode][i] ?? "#166534",
              border: "1px solid rgba(255,255,255,0.1)",
              minWidth: 68,
              height: 60,
            }}
          >
            <div className="text-[9px] font-bold text-white">GPU {i}</div>
            {label.split("\n").map((l, j) => (
              <div key={j} className="text-[8px] text-white/70">{l}</div>
            ))}
          </div>
        ))}

        {showArrow && (
          <div className="flex w-full justify-center pt-1 sm:w-auto sm:justify-start sm:pt-0">
            <div className="flex flex-col items-center gap-1">
              <svg width="40" height="40" viewBox="0 0 40 40">
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill={arrowColor} />
                  </marker>
                </defs>
                <path d="M5,20 C15,5 25,35 35,20" stroke={arrowColor} strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                <path d="M35,20 C25,35 15,5 5,20" stroke={arrowColor} strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
              </svg>
              <span className="text-[8px]" style={{ color: arrowColor }}>
                {mode === "data" ? "AllReduce" : mode === "tensor" ? "All-to-all" : "Activations →"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-3 rounded-xl bg-slate-800/50 p-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">What happens</div>
          <p className="text-sm leading-7 text-slate-300">{desc.problem}</p>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Communication pattern</div>
          <p className="text-sm leading-7 text-slate-300">{desc.communication}</p>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Network requirement</div>
          <p className="text-sm leading-7 text-slate-300">{desc.networkNeed}</p>
        </div>
      </div>
    </div>
  )
}

export default TrainingParallelismViz
