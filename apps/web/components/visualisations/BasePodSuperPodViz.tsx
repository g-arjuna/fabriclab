"use client"
import { useState } from "react"

type PodView = "basepod" | "superpod"

export function BasePodSuperPodViz() {
  const [view, setView] = useState<PodView>("basepod")
  const [detail, setDetail] = useState<string | null>(null)

  const configs = {
    basepod: {
      label: "DGX BasePOD",
      nodes: 32, gpus: 256, nics: 256,
      stages: 2, leafSwitches: 8, spineSwitches: 32, coreSwitches: 0,
      portsPerSwitch: 64, hops: 4, bisection: "Full (1:1)",
      color: "#1e3a5f", border: "#60a5fa",
      items: [
        { label: "DGX H100 nodes", value: "32", detail: "32 nodes × 8 GPUs = 256 GPUs. Each node has 8 ConnectX-7 NICs, one per GPU, each running at 400G." },
        { label: "Leaf switches", value: "8 × SN5600", detail: "One per GPU rail (Rail 0–7). Each leaf has 32 downlinks to DGX NICs + 32 uplinks to spine. 64-port switch, split evenly." },
        { label: "Spine switches", value: "32 × SN5600", detail: "Each spine switch has 8 ports — one connecting to each of the 8 leaf switches. All 8 ports are used as downlinks. 32 spine switches × 8 ports = 256 uplink connections, matching 8 leaf × 32 uplinks = 256." },
        { label: "Core switches", value: "None", detail: "2-stage design has no core layer. Leaf switches connect directly to spine switches. Maximum simplicity." },
        { label: "AllReduce hop count", value: "4 total traversals", detail: "DGX → Leaf → Spine → Leaf → DGX. 2 hops up, 2 hops down = 4 total link traversals per round trip. Minimum possible for multi-node AllReduce." },
        { label: "Bisection bandwidth", value: "Full (1:1)", detail: "32 leaf uplinks × 32 uplinks × 400G = 409.6 Tb/s total uplink bandwidth = 32 nodes × 8 × 400G = 409.6 Tb/s downlink bandwidth. Exactly matched — no oversubscription." },
      ]
    },
    superpod: {
      label: "DGX SuperPOD",
      nodes: 256, gpus: 2048, nics: 2048,
      stages: 3, leafSwitches: 64, spineSwitches: 64, coreSwitches: 64,
      portsPerSwitch: 64, hops: 8, bisection: "Full (1:1 with core layer)",
      color: "#4c1d95", border: "#a78bfa",
      items: [
        { label: "DGX H100 nodes", value: "256", detail: "256 nodes × 8 GPUs = 2,048 GPUs. The SuperPOD is composed of 8 BasePOD-sized groups, each connected to a core layer." },
        { label: "Leaf switches", value: "64 × SN5600", detail: "64 leaf switches — 8 rails × 8 leaf switches per rail group. Each leaf: 32 downlinks to DGX nodes + 32 uplinks split across spine and core." },
        { label: "Spine switches", value: "64 × SN5600", detail: "Aggregate layer between leaf and core. Each spine switch connects to multiple leaf switches within a pod and multiple core switches above." },
        { label: "Core switches", value: "64 × SN5600", detail: "The core layer enables inter-pod AllReduce. Without core switches, a 256-node cluster would have oversubscription at the spine-to-spine boundary." },
        { label: "AllReduce hop count", value: "8 total traversals", detail: "DGX → Leaf → Spine → Core → Spine → Leaf → DGX = 3 hops up + 3 hops down = 8 total traversals. Double the BasePOD hop count. Each hop adds ~100–200ns → significant at scale." },
        { label: "Bisection bandwidth", value: "Full with core layer", detail: "The core layer provides full bisection bandwidth across the complete 256-node cluster. Without the core layer, inter-pod AllReduce would be bottlenecked at the spine layer." },
      ]
    }
  }

  const c = configs[view]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        NVIDIA reference designs — BasePOD vs SuperPOD
      </p>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        {(["basepod", "superpod"] as PodView[]).map(v => (
          <button key={v} onClick={() => { setView(v); setDetail(null) }}
            className="flex-1 rounded-xl p-4 text-left transition-all"
            style={{
              backgroundColor: view === v ? configs[v].color + "44" : "#0f172a",
              border: `1px solid ${view === v ? configs[v].border : "#1e293b"}`,
            }}>
            <div className="font-bold" style={{ color: view === v ? configs[v].border : "#64748b" }}>
              {configs[v].label}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {configs[v].nodes} nodes · {configs[v].gpus} GPUs · {configs[v].stages} stages
            </div>
          </button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        {[
          { l: "Nodes", v: c.nodes },
          { l: "Total GPUs", v: c.gpus.toLocaleString() },
          { l: "Fabric stages", v: c.stages },
          { l: "Leaf switches", v: c.leafSwitches },
          { l: "Spine switches", v: c.spineSwitches },
          { l: "Core switches", v: c.coreSwitches || "—" },
        ].map(s => (
          <div key={s.l} className="rounded-lg bg-slate-800/50 p-2 text-center">
            <div className="text-slate-500 text-[10px]">{s.l}</div>
            <div className="font-bold text-white mt-0.5">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-slate-600 mb-2">Click any row to expand detail</div>
      <div className="space-y-1.5">
        {c.items.map(item => (
          <button key={item.label}
            onClick={() => setDetail(detail === item.label ? null : item.label)}
            className="w-full rounded-xl px-4 py-2.5 text-left text-xs transition-all"
            style={{
              backgroundColor: detail === item.label ? c.color + "33" : "#0f172a",
              border: `1px solid ${detail === item.label ? c.border + "66" : "#1e293b"}`,
            }}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-slate-400">{item.label}</span>
              <span className="font-semibold sm:text-right" style={{ color: c.border }}>{item.value}</span>
            </div>
            {detail === item.label && (
              <p className="mt-2 text-slate-400 leading-5 border-t border-white/8 pt-2">
                {item.detail}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default BasePodSuperPodViz
