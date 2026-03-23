"use client"

import { useState } from "react"

type LayerId = "load_balancing" | "ecn" | "pfc"

const layers = [
  {
    id: "load_balancing" as const,
    title: "Load balancing — Proactive",
    description: "Distributes traffic before buffers fill",
    fires: "Always — every packet decision",
    fails: "Congestion forms -> ECN must intervene",
    counter: "show interface counters -> uneven link utilisation",
    tooMuch: "N/A — proactive, more is better up to line rate",
    command: "show interface counters (compare links)",
    color: "#3b82f6",
    bg: "#1d4ed833",
  },
  {
    id: "ecn" as const,
    title: "ECN — Early reactive",
    description: "Marks packets when buffers start filling",
    fires: "Buffer > ECN min-threshold",
    fails: "Buffer keeps filling -> PFC must intervene",
    counter: "ethtool -S eth0 -> rx_ecn_marked growing",
    tooMuch: "Constant ECN suggests load balancing is failing",
    command: "show dcb ets",
    color: "#f59e0b",
    bg: "#f59e0b22",
  },
  {
    id: "pfc" as const,
    title: "PFC — Late reactive",
    description: "Pauses senders when buffers approach overflow",
    fires: "Buffer > PFC headroom threshold",
    fails: "Drops occur despite PFC (oversubscription or deadlock)",
    counter: "ethtool -S eth0 -> rx_pfc_pause_frames growing",
    tooMuch: "Sustained PFC suggests ECN threshold too high or LB failing",
    command: "show dcb pfc",
    color: "#ef4444",
    bg: "#ef444422",
  },
]

export function ProactiveReactiveViz() {
  const [activeLayer, setActiveLayer] = useState<LayerId>("load_balancing")

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-lg shadow-slate-950/30">
      <p className="mb-4 text-xs uppercase tracking-[0.28em] text-slate-500">
        Congestion management stack
      </p>

      <div className="space-y-3">
        {layers.map((layer, index) => {
          const isActive = layer.id === activeLayer
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => setActiveLayer(layer.id)}
              className="w-full rounded-2xl border p-4 text-left transition"
              style={{
                backgroundColor: isActive ? layer.bg : "#0f172a",
                borderColor: isActive ? `${layer.color}66` : "#1e293b",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: layer.color }}>
                    Layer {index + 1}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-white">{layer.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{layer.description}</p>
                </div>
                <span className="mt-1 text-xs text-slate-500">{isActive ? "▲" : "▼"}</span>
              </div>

              <div className="mt-3 grid gap-3 text-xs text-slate-400 md:grid-cols-2">
                <div className="rounded-xl border border-white/8 bg-slate-950/60 p-3">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">When it fires</p>
                  <p className="mt-2 leading-6">{layer.fires}</p>
                </div>
                <div className="rounded-xl border border-white/8 bg-slate-950/60 p-3">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">If it fails</p>
                  <p className="mt-2 leading-6">{layer.fails}</p>
                </div>
              </div>

              {isActive ? (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-white/8 bg-slate-950/70 p-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                      Diagnostic counter
                    </p>
                    <p className="mt-2 font-mono text-[11px] leading-6 text-slate-300">{layer.counter}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-slate-950/70 p-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                      Too much activity means
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{layer.tooMuch}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-slate-950/70 p-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                      Command to check
                    </p>
                    <p className="mt-2 font-mono text-[11px] leading-6 text-slate-300">{layer.command}</p>
                  </div>
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ProactiveReactiveViz
