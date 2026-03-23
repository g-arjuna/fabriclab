// ShowTopologyViz.tsx
"use client"
import { useState } from "react"

const rails = [
  { id: 0, nic: "mlx5_0", guid: "0x506b4b0300a1b200", nicState: "UP", switchPort: "UP" },
  { id: 1, nic: "mlx5_1", guid: "0x506b4b0300a1b201", nicState: "UP", switchPort: "UP" },
  { id: 2, nic: "mlx5_2", guid: "0x506b4b0300a1b202", nicState: "UP", switchPort: "UP" },
  { id: 3, nic: "mlx5_3", guid: "0x506b4b0300a1b203", nicState: "UP", switchPort: "ERROR-DISABLED" },
  { id: 4, nic: "mlx5_4", guid: "0x506b4b0300a1b204", nicState: "UP", switchPort: "UP" },
  { id: 5, nic: "mlx5_5", guid: "0x506b4b0300a1b205", nicState: "UP", switchPort: "UP" },
  { id: 6, nic: "mlx5_6", guid: "0x506b4b0300a1b206", nicState: "UP", switchPort: "UP" },
  { id: 7, nic: "mlx5_7", guid: "0x506b4b0300a1b207", nicState: "UP", switchPort: "UP" },
]

export function ShowTopologyViz() {
  const [selected, setSelected] = useState<number | null>(3)

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">show topology — the asymmetry revealed</p>
      <div className="rounded-xl bg-[#0a0f1a] border border-white/10 p-4 font-mono text-[10px] leading-6 mb-4 overflow-x-auto">
        <div className="text-slate-500">DGX H100 -- Rail topology map</div>
        <div className="text-slate-700">{"  "}{"─".repeat(62)}</div>
        <div className="text-slate-500">{"  Rail  NIC       GUID                  NIC state  Switch port"}</div>
        <div className="text-slate-700">{"  "}{"─".repeat(62)}</div>
        {rails.map(r => (
          <button key={r.id} onClick={() => setSelected(selected === r.id ? null : r.id)}
            className="w-full text-left rounded hover:bg-slate-800/30 transition-all"
            style={{ color: r.switchPort !== "UP" ? "#ef4444" : "#94a3b8" }}>
            <span className="text-slate-600">{"  "}</span>
            <span>{String(r.id).padEnd(6)}</span>
            <span>{r.nic.padEnd(10)}</span>
            <span className="text-slate-500">{r.guid.padEnd(22)}</span>
            <span className={r.nicState === "UP" ? "text-green-400" : "text-red-400"}>{r.nicState.padEnd(10)}</span>
            <span className={r.switchPort === "UP" ? "text-green-400" : "text-red-400 font-bold"}>
              {r.switchPort}{r.switchPort !== "UP" ? "  ← fault" : ""}
            </span>
          </button>
        ))}
        <div className="text-slate-700">{"  "}{"─".repeat(62)}</div>
        <div className="text-slate-500">{"  8 rails total  |  7/8 active"}</div>
      </div>
      {selected !== null && (
        <div className="rounded-xl p-4 text-xs space-y-2"
          style={{ backgroundColor: rails[selected].switchPort !== "UP" ? "#7f1d1d22" : "#14532d22", border: `1px solid ${rails[selected].switchPort !== "UP" ? "#ef444433" : "#22c55e33"}` }}>
          <div className="font-semibold text-white">Rail {selected} — {rails[selected].nic}</div>
          {rails[selected].switchPort !== "UP" ? (
            <>
              <p className="text-slate-300">NIC state is UP — the NIC thinks the link is fine. But the switch port is ERROR-DISABLED. This asymmetry is the key insight: <strong className="text-white">rdma link show on the DGX would show this rail as ACTIVE</strong> — you would never find this problem without also checking the switch side.</p>
              <p className="text-slate-300 mt-2">Next step: <code className="text-cyan-300">show switch port rail3</code> to see why the switch disabled this port.</p>
            </>
          ) : (
            <p className="text-slate-400">Rail {selected} is operating normally. NIC state and switch port state both show UP.</p>
          )}
        </div>
      )}
    </div>
  )
}
export default ShowTopologyViz
