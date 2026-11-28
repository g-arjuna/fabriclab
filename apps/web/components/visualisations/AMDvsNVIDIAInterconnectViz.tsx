"use client"

import { useState } from "react"

type PlatformId = "h100" | "mi325x" | "mi350x" | "b200"

const platforms = [
  {
    id: "h100" as const,
    label: "DGX/HGX H100",
    vendor: "NVIDIA",
    color: "#76b900",
    scaleUp: 900,
    scaleMetric: "NVLink 4 endpoint bandwidth per GPU, aggregate bidirectional",
    memory: "80 GB HBM3 per GPU in DGX H100",
    memBw: "Up to 3.35 TB/s HBM bandwidth per GPU",
    topology: "8 GPUs connected through 4 third-generation NVSwitch chips",
    detail: "The 900 GB/s figure is the GPU endpoint aggregate across both directions. The system bisection metric is different and should not be substituted for endpoint bandwidth.",
    scaleOut: "ConnectX-7 adapters; native InfiniBand or Ethernet depending on SKU/configuration",
  },
  {
    id: "mi325x" as const,
    label: "Instinct MI325X platform",
    vendor: "AMD",
    color: "#f97316",
    scaleUp: 896,
    scaleMetric: "P2P ring aggregate bandwidth per GPU, aggregate bidirectional",
    memory: "256 GB HBM3E per OAM",
    memBw: "6 TB/s peak memory bandwidth per OAM",
    topology: "8 OAM GPUs connected in a direct Infinity Fabric/xGMI mesh",
    detail: "AMD documents 896 GB/s as P2P ring aggregate bandwidth. This is a peak architectural figure, not a guaranteed RCCL algorithm or bus-bandwidth measurement.",
    scaleOut: "Platform-dependent compatible NICs; Pollara is one AMD option, not a universal requirement",
  },
  {
    id: "mi350x" as const,
    label: "Instinct MI350X platform",
    vendor: "AMD",
    color: "#ef4444",
    scaleUp: 1075.2,
    scaleMetric: "P2P ring aggregate bandwidth per GPU, aggregate bidirectional",
    memory: "288 GB HBM3E per OAM",
    memBw: "8 TB/s peak memory bandwidth per OAM",
    topology: "CDNA 4 GPU mesh using redesigned Infinity Fabric links",
    detail: "AMD ROCm documentation lists 1,075.2 GB/s for MI350X/MI355X P2P ring aggregate bandwidth. AMD product pages can use broader total-I/O metrics; compare only matching scopes.",
    scaleOut: "Platform-dependent compatible NICs and fabric design",
  },
  {
    id: "b200" as const,
    label: "DGX B200",
    vendor: "NVIDIA",
    color: "#60a5fa",
    scaleUp: 1800,
    scaleMetric: "NVLink 5 endpoint bandwidth per GPU, aggregate bidirectional",
    memory: "180 GB HBM3E per GPU; 1,440 GB system total",
    memBw: "8 TB/s class HBM bandwidth per GPU",
    topology: "8 GPUs connected through 2 fifth-generation NVLink switch chips",
    detail: "DGX B200 is an eight-GPU system. It is not the same architecture as rack-scale GB200 NVL72, even though both use Blackwell-generation NVLink.",
    scaleOut: "ConnectX-7 compute cards plus BlueField-3 storage/in-band cards in the documented DGX B200 configuration",
  },
]

function topologyDiagram(type: "mesh" | "switch", color: string) {
  const points = [
    [52, 42], [132, 42], [212, 42], [292, 42],
    [52, 134], [132, 134], [212, 134], [292, 134],
  ]
  if (type === "mesh") {
    return (
      <svg viewBox="0 0 344 178" className="h-auto w-full" role="img" aria-label="Simplified direct GPU mesh">
        {points.map((a, i) => points.slice(i + 1).map((b, j) => (
          <line key={`${i}-${j}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeOpacity="0.18" />
        )))}
        {points.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="17" fill="#0f172a" stroke={color} strokeWidth="1.6" />
            <text x={x} y={y + 3} textAnchor="middle" fill={color} fontSize="9" fontFamily="monospace">G{i}</text>
          </g>
        ))}
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 344 178" className="h-auto w-full" role="img" aria-label="Simplified switch-centered GPU topology">
      <rect x="132" y="67" width="80" height="42" rx="10" fill="#111827" stroke={color} strokeWidth="1.7" />
      <text x="172" y="84" textAnchor="middle" fill={color} fontSize="9" fontWeight="700">NVSwitch</text>
      <text x="172" y="98" textAnchor="middle" fill={color} fontSize="8">system chips</text>
      {points.map(([x, y], i) => (
        <g key={i}>
          <line x1="172" y1="88" x2={x} y2={y} stroke={color} strokeOpacity="0.35" strokeWidth="1.3" />
          <circle cx={x} cy={y} r="17" fill="#0f172a" stroke={color} strokeWidth="1.6" />
          <text x={x} y={y + 3} textAnchor="middle" fill={color} fontSize="9" fontFamily="monospace">G{i}</text>
        </g>
      ))}
    </svg>
  )
}

export function AMDvsNVIDIAInterconnectViz() {
  const [selected, setSelected] = useState<PlatformId>("h100")
  const current = platforms.find((item) => item.id === selected) ?? platforms[0]
  const max = 1800

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-[#0a0f1a] p-5 text-slate-100">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Scale-up interconnect comparison — consistently scoped peak metrics</p>
      <p className="mb-4 text-xs leading-5 text-slate-500">
        All values in the bar chart are aggregate bidirectional per-GPU scale-up bandwidth using the vendor-documented metric named in each card. They are not measured collective-library throughput.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {platforms.map((item) => (
          <button key={item.id} type="button" onClick={() => setSelected(item.id)}
            className="rounded-full px-3 py-2 text-xs transition"
            style={{
              border: `1px solid ${selected === item.id ? item.color : "#1e293b"}`,
              backgroundColor: selected === item.id ? `${item.color}18` : "#0f172a",
              color: selected === item.id ? item.color : "#94a3b8",
            }}>
            {item.vendor} · {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">Simplified topology shape</div>
          {topologyDiagram(current.vendor === "AMD" ? "mesh" : "switch", current.color)}
          <p className="mt-2 text-xs leading-5 text-slate-400">{current.topology}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
          <div className="mb-3 text-[10px] uppercase tracking-widest text-slate-500">Per-GPU scale-up bandwidth — GB/s aggregate bidirectional</div>
          {platforms.map((item) => (
            <div key={item.id} className="mb-3">
              <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs">
                <span style={{ color: item.id === selected ? item.color : "#94a3b8" }}>{item.label}</span>
                <span className="font-mono font-semibold" style={{ color: item.id === selected ? item.color : "#94a3b8" }}>{item.scaleUp} GB/s</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full" style={{ width: `${(item.scaleUp / max) * 100}%`, backgroundColor: item.id === selected ? item.color : "#475569" }} />
              </div>
            </div>
          ))}
          <p className="mt-3 text-xs leading-5 text-slate-500">
            These peak figures do not predict that one platform's tensor parallelism is universally faster. Achieved collective performance depends on algorithm, message sizes, topology use, software, memory behavior, and workload.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">Selected platform</div>
          <dl className="space-y-2 text-xs">
            {[
              ["Metric scope", current.scaleMetric],
              ["Memory", current.memory],
              ["Memory bandwidth", current.memBw],
              ["Scale-out networking", current.scaleOut],
            ].map(([term, value]) => (
              <div key={term} className="grid gap-1 sm:grid-cols-[130px_1fr]">
                <dt className="text-slate-500">{term}</dt>
                <dd className="text-slate-200">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-5 text-slate-400">{current.detail}</p>
        </div>

        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-cyan-300">Network-engineer takeaway</div>
          <p className="text-sm leading-7 text-slate-300">
            Scale-up interconnect and scale-out Ethernet are separate resources. AMD nodes do not require one mandatory AMD NIC model; platform vendors choose compatible NICs, drivers, transports, switches, QoS, congestion-control behavior, and telemetry. RoCEv2 and Ultra Ethernet are not interchangeable names. UALink is a scale-up accelerator interconnect initiative; UEC is a scale-out networking initiative.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AMDvsNVIDIAInterconnectViz
