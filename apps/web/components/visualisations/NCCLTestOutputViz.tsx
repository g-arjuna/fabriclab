"use client"
import { useState } from "react"

type Field = "size" | "time" | "algbw" | "busbw" | "wrong"

const FIELD_EXPLANATIONS: Record<Field, { label: string; detail: string; color: string; example: string }> = {
  size: {
    label: "Message size (bytes)",
    detail: "The size of each GPU's contribution. One GPU sends this many bytes. The total data moved across the fabric is N × size (where N is the number of GPUs). Small sizes are latency-dominated; large sizes are bandwidth-dominated.",
    color: "#60a5fa",
    example: "536870912 = 512 MB per GPU. On a 32-GPU cluster, total data: 32 × 512 MB = 16 GB exchanged.",
  },
  time: {
    label: "Elapsed time (microseconds)",
    detail: "How long the entire AllReduce took — from the first GPU starting to send until every GPU has the complete reduced result. Includes algorithm overhead, network latency, and serialisation.",
    color: "#a78bfa",
    example: "9814 µs = 9.8ms for a 512MB AllReduce on 32 GPUs.",
  },
  algbw: {
    label: "Algorithm bandwidth (GB/s)",
    detail: "Raw throughput = size / time. This is the naive bandwidth number — it does not account for the fact that ring AllReduce sends 2× the data (reduce-scatter then allgather). Do not compare algbw to NIC line rate. Use busbw for that.",
    color: "#f59e0b",
    example: "54.7 GB/s algbw from 512MB in 9.8ms. But each NIC actually sent ~2× more data than this suggests.",
  },
  busbw: {
    label: "Bus bandwidth (GB/s) — THE number that matters",
    detail: "algbw × 2(N-1)/N. This corrects for the ring algorithm's communication volume. Each DGX H100 node has 8 × 400G NICs (~400 GB/s aggregate per node). The busbw in a 32-node / 256-GPU test reflects per-node aggregate throughput across all 8 NICs. Compare busbw to 8 × 50 GB/s = 400 GB/s per node max. A healthy 32-node cluster shows 130–160 GB/s busbw at large tensor sizes (33–40% of theoretical max, expected due to ring overhead and fabric hops).",
    color: "#22c55e",
    example: "102.6 GB/s busbw on a 32-node BasePOD ≈ 26% of 400 GB/s per-node NIC capacity. At 512 MB messages, fabric is the limit. At 8 GB messages, 146 GB/s busbw approaches ~37% — healthy for this cluster size.",
  },
  wrong: {
    label: "#wrong — correctness check",
    detail: "Number of gradient values that did not match the expected result after the AllReduce. Must ALWAYS be zero. A non-zero value means data corruption — training would produce silently wrong model weights. This is a severity-1 incident. Causes: ECC error, RDMA memory corruption, fabric bit-flip.",
    color: "#ef4444",
    example: "#wrong: 0 ← clean. #wrong: 1 ← immediate investigation required before any training runs.",
  },
}

const OUTPUT_ROWS = [
  { size: "8388608", count: "2097152", time: "412.5", algbw: "20.3", busbw: "38.1", wrong: "0" },
  { size: "16777216", count: "4194304", time: "743.7", algbw: "22.6", busbw: "42.4", wrong: "0" },
  { size: "134217728", count: "33554432", time: "4891.2", algbw: "27.4", busbw: "51.4", wrong: "0" },
  { size: "536870912", count: "134217728", time: "9814.2", algbw: "54.7", busbw: "102.6", wrong: "0" },
  { size: "1073741824", count: "268435456", time: "17234.8", algbw: "62.3", busbw: "116.8", wrong: "0" },
  { size: "8589934592", count: "2147483648", time: "109842.1", algbw: "78.2", busbw: "146.6", wrong: "0" },
]

const COLUMNS: { key: Field; header: string }[] = [
  { key: "size", header: "size (B)" },
  { key: "time", header: "time (µs)" },
  { key: "algbw", header: "algbw (GB/s)" },
  { key: "busbw", header: "busbw (GB/s)" },
  { key: "wrong", header: "#wrong" },
]

export function NCCLTestOutputViz() {
  const [selectedField, setSelectedField] = useState<Field | null>("busbw")

  const exp = selectedField ? FIELD_EXPLANATIONS[selectedField] : null

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        Reading nccl-tests output — click any column header to understand it
      </p>
      <p className="mb-4 text-xs text-slate-600">
        This is allreduce_perf output for a 32-node (256 GPU) BasePOD cluster at 400G
      </p>

      <div className="rounded-xl bg-[#060d18] border border-white/8 p-3 mb-4 overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key}
                  className="pb-2 pr-4 text-left cursor-pointer transition-colors"
                  style={{ color: selectedField === col.key ? FIELD_EXPLANATIONS[col.key].color : "#475569" }}
                  onClick={() => setSelectedField(col.key === selectedField ? null : col.key)}
                >
                  {col.header}
                  {selectedField === col.key && " ◀"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {OUTPUT_ROWS.map((row, i) => (
              <tr key={i} className="border-t border-white/5">
                {COLUMNS.map((col) => {
                  const val = row[col.key]
                  const isSelected = selectedField === col.key
                  const isBad = col.key === "wrong" && val !== "0"
                  return (
                    <td key={col.key}
                      className="py-1.5 pr-4"
                      style={{
                        color: isBad ? "#ef4444" : isSelected ? FIELD_EXPLANATIONS[col.key].color : "#94a3b8",
                        fontWeight: isSelected ? "700" : "400",
                      }}
                    >
                      {val}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {exp && (
        <div className="rounded-xl p-4 space-y-2"
          style={{ backgroundColor: "#0f172a", border: `1px solid ${exp.color}33` }}>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: exp.color }}/>
            <span className="text-sm font-semibold" style={{ color: exp.color }}>{exp.label}</span>
          </div>
          <p className="text-slate-300 text-xs leading-6">{exp.detail}</p>
          <div className="rounded-lg bg-[#0a0f1a] p-2 text-[10px] text-slate-400 font-mono">
            {exp.example}
          </div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        {[
          { label: "Small tensors (<1MB)", note: "Latency-dominated. Low busbw is normal.", color: "#60a5fa" },
          { label: "Large tensors (>128MB)", note: "Bandwidth-dominated. Compare busbw to NIC line rate.", color: "#22c55e" },
          { label: "#wrong > 0", note: "STOP. Data corruption. Do not run training.", color: "#ef4444" },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2"
            style={{ backgroundColor: s.color + "11", border: `1px solid ${s.color}22` }}>
            <div className="font-semibold mb-0.5" style={{ color: s.color }}>{s.label}</div>
            <p className="text-slate-500 text-[10px]">{s.note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
export default NCCLTestOutputViz




