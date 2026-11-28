"use client"

import { useState } from "react"
import { ringAllReduceSentGBPerRank } from "@/lib/ch0Math"

type Mode = "memory" | "data" | "tensor" | "pipeline" | "expert"

const modes: { id: Mode; label: string; subtitle: string }[] = [
  { id: "memory", label: "Memory first", subtitle: "Why one GPU may not be enough" },
  { id: "data", label: "Data parallelism", subtitle: "Replicated or sharded model, different batches" },
  { id: "tensor", label: "Tensor parallelism", subtitle: "Operations partitioned across GPUs" },
  { id: "pipeline", label: "Pipeline parallelism", subtitle: "Layer stages and microbatches" },
  { id: "expert", label: "Expert parallelism", subtitle: "MoE token routing" },
]

const modeText: Record<Mode, { what: string; communication: string; placement: string }> = {
  memory: {
    what: "A model is a collection of numerical parameters. At BF16 precision, 70 billion parameters require 70 × 10^9 × 2 bytes = 140 GB for weights alone. That exceeds an 80 GB H100 at BF16, but it is not a universal statement about every precision or every GPU. Lower-precision inference weights can be smaller, while training can require substantially more memory than weights alone.",
    communication: "Training may additionally need gradients, optimizer state, master weights depending on the precision strategy, activations, temporary buffers, and framework overhead. The exact total depends on the optimizer, activation checkpointing, sharding, batch size, sequence length, and implementation.",
    placement: "A replicated training scheme keeps a full copy of model state on each participating GPU. Sharded schemes such as FSDP or ZeRO partition some or all of that state. Inference memory and training memory are different questions.",
  },
  data: {
    what: "In conventional data parallelism, each GPU holds a replica of the model and processes a different batch. After backward computation, gradients must be reduced across the data-parallel group so the replicas remain consistent. FSDP and ZeRO are sharded variants that reduce memory replication while still using collectives.",
    communication: "The semantic result of a sum AllReduce is that every participating rank receives the reduced result. Implementations may use ring, tree, hierarchical, or hardware-assisted algorithms. AllReduce is not literally every rank blindly transmitting the full tensor to every other rank.",
    placement: "Data-parallel groups often span nodes because replicas are independent during forward/backward computation. Communication can overlap backward computation through gradient bucketing. A collective applies to its defined communication group, not automatically to every GPU in a job.",
  },
  tensor: {
    what: "Tensor parallelism partitions individual operators or tensors. For example, different GPUs may hold different slices of a large matrix multiplication and must combine partial results. “Model parallelism” is an umbrella term that includes tensor and pipeline parallelism, not a fourth independent category.",
    communication: "Tensor-parallel implementations use collectives such as AllReduce, all-gather, and reduce-scatter. Because communication can be frequent and latency-sensitive, it is commonly placed inside a high-bandwidth scale-up domain such as NVLink.",
    placement: "It is not impossible for tensor parallelism to span nodes; feasibility depends on interconnect bandwidth, latency, model architecture, and implementation. It is simply common to keep it inside the fastest scale-up domain.",
  },
  pipeline: {
    what: "Pipeline parallelism assigns different layers to different stages. Microbatches move through the stages so multiple stages can work on different microbatches. Startup and drain periods create pipeline bubbles.",
    communication: "Stages exchange forward activations and backward gradients point-to-point. Traffic volume and criticality depend on tensor sizes, microbatch count, stage placement, and schedule. It is not universally lower or higher than data-parallel traffic.",
    placement: "Pipeline stages can reside within one node or span nodes. Cross-node stages use the external fabric for stage-to-stage transfers.",
  },
  expert: {
    what: "Mixture-of-experts models route tokens to selected expert subnetworks. Expert parallelism places different experts on different GPUs.",
    communication: "Token dispatch sends tokens to the GPUs hosting their selected experts; token combine returns the expert outputs. These operations commonly use All-to-All or related irregular collectives, which are distinct from AllReduce.",
    placement: "Expert parallelism may be combined with data, tensor, and pipeline parallelism. Its external-network demand depends heavily on routing topology, expert placement, token counts, and implementation.",
  },
}

const ringExamples = [
  { n: 4, s: 8, label: "N=4, S=8 GB" },
  { n: 8, s: 14, label: "N=8, S=14 GB" },
  { n: 256, s: 14, label: "N=256, S=14 GB" },
]

function gpuCard(label: string, sublabel: string, color: string, wide = false) {
  return (
    <div className={`rounded-xl px-3 py-2 text-center ${wide ? "min-w-28" : "min-w-20"}`}
      style={{ backgroundColor: color, border: "1px solid rgba(255,255,255,0.12)" }}>
      <div className="text-[10px] font-bold text-white">{label}</div>
      <div className="text-[9px] leading-4 text-white/75">{sublabel}</div>
    </div>
  )
}

export function TrainingParallelismViz() {
  const [mode, setMode] = useState<Mode>("memory")
  const [example, setExample] = useState(0)
  const selected = modeText[mode]
  const ring = ringExamples[example]
  const sent = ringAllReduceSentGBPerRank(ring.n, ring.s)

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">Training memory, parallelism, and collective communication</p>
      <p className="mb-4 text-xs leading-5 text-slate-500">
        Parallelism choices are architectural tools, not fixed traffic-volume rankings. Actual traffic depends on model, placement, collective algorithm, batching, and implementation.
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        {modes.map((item) => {
          const isActive = item.id === mode
          return (
            <button key={item.id} type="button" onClick={() => setMode(item.id)}
              className="rounded-xl px-3 py-2 text-left text-xs transition"
              style={{
                backgroundColor: isActive ? "#1e3a5f" : "#0f172a",
                border: `1px solid ${isActive ? "#60a5fa" : "#1e293b"}`,
                color: isActive ? "#bfdbfe" : "#94a3b8",
              }}>
              <div className="font-semibold">{item.label}</div>
              <div className="mt-0.5 max-w-44 text-[10px] opacity-75">{item.subtitle}</div>
            </button>
          )
        })}
      </div>

      <div className="mb-5 rounded-2xl border border-white/8 bg-slate-950/70 p-4">
        {mode === "memory" && (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <div className="text-xs font-semibold text-red-300">BF16 weights only</div>
              <div className="mt-2 font-mono text-lg text-white">70B × 2 B = 140 GB</div>
              <p className="mt-2 text-xs leading-5 text-slate-400">Weights alone. This does not include gradients, optimizer state, activations, or framework overhead.</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="text-xs font-semibold text-amber-300">Inference ≠ training</div>
              <p className="mt-2 text-xs leading-5 text-slate-300">Inference memory is dominated by weights plus runtime buffers/kv-cache depending on serving. Training adds backward and optimizer state. Precision changes both.</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="text-xs font-semibold text-emerald-300">Replicated ≠ sharded</div>
              <p className="mt-2 text-xs leading-5 text-slate-300">Data parallelism conventionally replicates state. FSDP/ZeRO shard model state across GPUs, trading memory capacity for additional collective communication.</p>
            </div>
          </div>
        )}

        {mode === "data" && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {gpuCard("GPU 0", "replica / shard\nbatch A", "#166534")}
              {gpuCard("GPU 1", "replica / shard\nbatch B", "#166534")}
              {gpuCard("GPU 2", "replica / shard\nbatch C", "#166534")}
              {gpuCard("GPU 3", "replica / shard\nbatch D", "#166534")}
              <div className="px-2 text-xl text-cyan-300">⟲</div>
              {gpuCard("All ranks", "same reduced result", "#0e7490", true)}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">AllReduce semantic example: inputs 1, 2, 3, and 4 produce the sum 10 at every participant. The implementation determines how bytes move.</p>
          </div>
        )}

        {mode === "tensor" && (
          <div className="flex flex-wrap items-center gap-2">
            {gpuCard("GPU 0", "matrix slice A", "#1d4ed8")}
            {gpuCard("GPU 1", "matrix slice B", "#1d4ed8")}
            {gpuCard("GPU 2", "matrix slice C", "#1d4ed8")}
            {gpuCard("GPU 3", "matrix slice D", "#1d4ed8")}
            <div className="px-2 text-xl text-indigo-300">⇄</div>
            {gpuCard("partial results", "all-gather / reduce-scatter", "#4c1d95", true)}
          </div>
        )}

        {mode === "pipeline" && (
          <div className="flex flex-wrap items-center gap-2">
            {gpuCard("Stage 1", "layers 1–8", "#0f766e")}
            <div className="text-xl text-amber-300">→</div>
            {gpuCard("Stage 2", "layers 9–16", "#0f766e")}
            <div className="text-xl text-amber-300">→</div>
            {gpuCard("Stage 3", "layers 17–24", "#0f766e")}
            <div className="text-xl text-amber-300">→</div>
            {gpuCard("Stage 4", "layers 25–32", "#0f766e")}
          </div>
        )}

        {mode === "expert" && (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="flex flex-wrap gap-2">
              {gpuCard("tokens", "router selects experts", "#92400e", true)}
            </div>
            <div className="text-center text-xl text-cyan-300">⇄</div>
            <div className="flex flex-wrap gap-2">
              {gpuCard("GPU 0", "experts 0–1", "#7c3aed")}
              {gpuCard("GPU 1", "experts 2–3", "#7c3aed")}
              {gpuCard("GPU 2", "experts 4–5", "#7c3aed")}
              {gpuCard("GPU 3", "experts 6–7", "#7c3aed")}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_0.95fr]">
        <div className="space-y-3">
          {[
            ["What happens", selected.what],
            ["Communication", selected.communication],
            ["Placement and limitation", selected.placement],
          ].map(([title, body]) => (
            <div key={title} className="rounded-xl bg-slate-800/50 p-4">
              <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">{title}</div>
              <p className="text-sm leading-7 text-slate-300">{body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-300">Ring AllReduce traffic — sent bytes, not send+receive</div>
          <p className="text-sm leading-6 text-slate-300">
            For N participants and input size S per participant, a conventional ring implemented as reduce-scatter plus all-gather sends:
          </p>
          <div className="my-3 rounded-lg bg-slate-950/80 p-3 text-center font-mono text-sm text-cyan-100">
            bytes sent per rank = 2 × (N − 1) / N × S
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {ringExamples.map((item, index) => (
              <button key={item.label} type="button" onClick={() => setExample(index)}
                className="rounded-lg px-2 py-1 text-[11px]"
                style={{
                  backgroundColor: example === index ? "#155e75" : "#0f172a",
                  border: `1px solid ${example === index ? "#22d3ee" : "#1e293b"}`,
                  color: example === index ? "#cffafe" : "#94a3b8",
                }}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="rounded-lg bg-slate-950/70 p-3">
            <div className="font-mono text-lg text-white">{sent} GB sent per rank</div>
            <div className="mt-1 text-xs text-slate-400">The same {sent} GB is received per rank. Do not add sent and received bytes together when comparing against one-direction link rate.</div>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            Ring is one implementation example. Tree, hierarchical, and hardware-assisted algorithms have different byte movement and latency behavior. Computation and communication can overlap through gradient bucketing.
          </p>
        </div>
      </div>
    </div>
  )
}

export default TrainingParallelismViz
