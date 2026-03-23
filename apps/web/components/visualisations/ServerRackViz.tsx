"use client"

import { useState } from "react"

interface RackItem {
  id: string
  label: string
  sublabel: string
  units: number
  color: string
  textColor: string
  description: string
  specs: string[]
}

const RACK_ITEMS: RackItem[] = [
  {
    id: "patch",
    label: "Patch panel",
    sublabel: "Cable management",
    units: 1,
    color: "#1e293b",
    textColor: "#94a3b8",
    description: "Organises the cables connecting servers to switches. In AI clusters, cable density is extreme — a single DGX node has 8 HCA ports plus storage and management connections.",
    specs: ["1U", "24–48 ports", "Passive — no electronics"],
  },
  {
    id: "switch-spine",
    label: "Quantum-X800 Q3400",
    sublabel: "Spine switch",
    units: 4,
    color: "#312e81",
    textColor: "#a5b4fc",
    description: "The spine-layer InfiniBand switch. 144 ports at 800 Gb/s each. Connects leaf switches together to form the full fat-tree fabric. In a SuperPOD deployment there are typically 2 spine switches per pod.",
    specs: ["4U", "144 × 800G ports", "115.2 Tb/s capacity", "Sub-100ns latency"],
  },
  {
    id: "dgx1",
    label: "DGX H100",
    sublabel: "GPU server (8× H100)",
    units: 8,
    color: "#1d4ed8",
    textColor: "#bfdbfe",
    description: "One DGX H100 compute node. 8 H100 GPUs, 8 ConnectX-7 NICs, 640 GB GPU memory, 2 TB system RAM. Each unit like this costs roughly $300,000 and consumes ~10 kW of power.",
    specs: ["8U", "8× H100 SXM5", "8× ConnectX-7 400G", "3.2 Tb/s fabric BW"],
  },
  {
    id: "switch-leaf",
    label: "QM9700 NDR",
    sublabel: "Leaf switch",
    units: 1,
    color: "#065f46",
    textColor: "#6ee7b7",
    description: "The leaf-layer InfiniBand switch. Connects directly to DGX node NICs on downlinks, and to spine switches on uplinks. One leaf switch per GPU rail — so an 8-GPU DGX has 8 leaf switches in the fabric.",
    specs: ["1U", "40 × 400G OSFP", "16 Tb/s capacity", "SHARP v3 in-network compute"],
  },
  {
    id: "dgx2",
    label: "DGX H100",
    sublabel: "GPU server (8× H100)",
    units: 8,
    color: "#1d4ed8",
    textColor: "#bfdbfe",
    description: "Second DGX H100 node. Identical to the first. In a BasePOD there are 20 of these. In a SuperPOD, 32. Each node's 8 NICs connect to 8 different leaf switches — one per GPU rail.",
    specs: ["8U", "8× H100 SXM5", "8× ConnectX-7 400G", "3.2 Tb/s fabric BW"],
  },
  {
    id: "pdu",
    label: "PDU",
    sublabel: "Power distribution",
    units: 1,
    color: "#1e293b",
    textColor: "#64748b",
    description: "Power Distribution Unit. A DGX H100 draws ~10 kW at full load. A fully populated rack with 4 DGX nodes draws 40+ kW — requiring specialised high-density power infrastructure.",
    specs: ["1U", "208–240V", "30–60A per outlet", "Metered/switched variants"],
  },
]

const UNIT_HEIGHT = 18
const RACK_WIDTH = 260
const RACK_UNITS = 42

export function ServerRackViz() {
  const [selected, setSelected] = useState<RackItem | null>(null)

  const totalUsedUnits = RACK_ITEMS.reduce((sum, item) => sum + item.units, 0)
  const emptyUnits = RACK_UNITS - totalUsedUnits

  let currentUnit = 1

  return (
    <div className="my-8 flex flex-col gap-6 lg:flex-row">
      {/* Rack diagram */}
      <div className="flex-shrink-0">
        <p className="mb-3 text-xs uppercase tracking-widest text-slate-500">
          42U compute rack — click any component
        </p>
        <div
          className="relative rounded-lg border-2 border-slate-600 bg-slate-900 p-2"
          style={{ width: RACK_WIDTH + 24 }}
        >
          {/* U markers */}
          <div className="absolute left-1 top-2 bottom-2 flex flex-col justify-between">
            {[1, 10, 20, 30, 42].map(u => (
              <span key={u} className="text-[9px] text-slate-600">{u}U</span>
            ))}
          </div>

          <div className="ml-6">
            {RACK_ITEMS.map((item) => {
              const top = (currentUnit - 1) * UNIT_HEIGHT
              currentUnit += item.units
              const height = item.units * UNIT_HEIGHT
              const isSelected = selected?.id === item.id

              return (
                <div
                  key={item.id}
                  onClick={() => setSelected(isSelected ? null : item)}
                  style={{
                    height,
                    backgroundColor: item.color,
                    border: isSelected ? "2px solid #22d3ee" : "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    marginBottom: 1,
                  }}
                  className="flex flex-col justify-center rounded px-2 transition-all hover:brightness-110"
                >
                  <span style={{ color: item.textColor, fontSize: 11, fontWeight: 600, lineHeight: 1.2 }}>
                    {item.label}
                  </span>
                  {item.units > 1 && (
                    <span style={{ color: item.textColor, fontSize: 9, opacity: 0.7 }}>
                      {item.sublabel}
                    </span>
                  )}
                </div>
              )
            })}

            {/* Empty space */}
            <div
              style={{
                height: emptyUnits * UNIT_HEIGHT,
                border: "1px dashed rgba(255,255,255,0.05)",
                marginBottom: 1,
              }}
              className="flex items-center justify-center rounded"
            >
              <span className="text-[9px] text-slate-700">{emptyUnits}U empty</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1">
        {selected ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <div className="flex items-start gap-3">
              <div
                className="mt-1 h-3 w-3 flex-shrink-0 rounded-sm"
                style={{ backgroundColor: selected.color, border: "1px solid rgba(255,255,255,0.2)" }}
              />
              <div>
                <h3 className="text-base font-semibold text-white">{selected.label}</h3>
                <p className="text-xs text-slate-400">{selected.sublabel} · {selected.units}U</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-300">{selected.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {selected.specs.map(spec => (
                <span
                  key={spec}
                  className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/50 p-5 text-sm text-slate-500">
            Click any component in the rack to see details
          </div>
        )}
      </div>
    </div>
  )
}

export default ServerRackViz