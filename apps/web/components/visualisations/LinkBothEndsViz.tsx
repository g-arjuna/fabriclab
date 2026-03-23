"use client"
import { useState } from "react"

// LinkBothEndsViz
// Shows the two-end concept for a physical link
// and what each end can / cannot see

type Deployment = "rocev2" | "infiniband"
type FaultScenario = "both_up" | "nic_up_switch_errdisable" | "nic_polling_switch_up" | "both_down"

const faultScenarios: {
  id: FaultScenario
  label: string
  dgx: { state: string; color: string; detail: string }
  sw: { state: string; color: string; detail: string }
  diagnosis: string
  canDGXAloneDetect: boolean
}[] = [
  {
    id: "both_up",
    label: "Both ends healthy",
    dgx: { state: "Active / LinkUp", color: "#22c55e", detail: "ibstat: State Active, Physical state LinkUp, Rate 400" },
    sw: { state: "Up / Active", color: "#22c55e", detail: "show interface counters: Oper Up, 400G" },
    diagnosis: "Link is healthy. Physical layer verified from both ends. Proceed to traffic counters.",
    canDGXAloneDetect: true,
  },
  {
    id: "nic_up_switch_errdisable",
    label: "NIC up, switch error-disabled",
    dgx: { state: "Active / LinkUp", color: "#22c55e", detail: "ibstat: State Active. rdma link show: ACTIVE. The NIC sees optical signal and reports up." },
    sw: { state: "Err-disabled", color: "#ef4444", detail: "Switch disabled port after 6 link flaps in 30 seconds. Admin Up, Oper Error-disabled. Reason: link-flap." },
    diagnosis: "This is the Lab 0 fault. DGX side looks completely healthy. Only checking the switch reveals the error. The NIC cannot know the switch disabled its port.",
    canDGXAloneDetect: false,
  },
  {
    id: "nic_polling_switch_up",
    label: "NIC polling, switch port up",
    dgx: { state: "Polling / LinkUp", color: "#f59e0b", detail: "ibstat: State Polling, Physical state LinkUp. NIC is sending IB polling MADs but not completing initialisation." },
    sw: { state: "Up / Active", color: "#22c55e", detail: "Switch port is up and waiting. The switch side is fine — the problem is in the RDMA initialisation handshake, not the physical link." },
    diagnosis: "Physical link is up on both ends (signal present). RDMA/IB state machine is not completing. Check: is the Fabric Manager daemon running on the DGX? Is UFM assigning LIDs?",
    canDGXAloneDetect: true,
  },
  {
    id: "both_down",
    label: "Both ends show link down",
    dgx: { state: "Down / Disabled", color: "#ef4444", detail: "ibstat: State Down, Physical state Disabled. No optical or electrical signal received by the NIC." },
    sw: { state: "Down", color: "#ef4444", detail: "Switch port shows Oper Down. No signal received on the switch end either." },
    diagnosis: "Physical link is completely absent. Both ends agree. Check: cable seated at both ends, cable not damaged, transceiver not failed.",
    canDGXAloneDetect: true,
  },
]

export function LinkBothEndsViz() {
  const [deployment, setDeployment] = useState<Deployment>("rocev2")
  const [scenario, setScenario] = useState<FaultScenario>("nic_up_switch_errdisable")

  const s = faultScenarios.find(f => f.id === scenario)!

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        Every link has two ends — what each side sees
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setDeployment("rocev2")}
          className="rounded-lg px-3 py-1.5 text-xs transition-all"
          style={{
            backgroundColor: deployment === "rocev2" ? "#065f46" : "#0f172a",
            border: `1px solid ${deployment === "rocev2" ? "#34d399" : "#1e293b"}`,
            color: deployment === "rocev2" ? "#fff" : "#64748b",
          }}>
          RoCEv2 / Spectrum-X
        </button>
        <button
          onClick={() => setDeployment("infiniband")}
          className="rounded-lg px-3 py-1.5 text-xs transition-all"
          style={{
            backgroundColor: deployment === "infiniband" ? "#1e3a5f" : "#0f172a",
            border: `1px solid ${deployment === "infiniband" ? "#60a5fa" : "#1e293b"}`,
            color: deployment === "infiniband" ? "#fff" : "#64748b",
          }}>
          InfiniBand / ONYX
        </button>
      </div>

      {/* Link diagram */}
      <div className="mb-4">
        <svg viewBox="0 0 480 100" className="w-full max-h-24">
          {/* DGX NIC box */}
          <rect x="10" y="30" width="130" height="40" rx="6"
            fill="#14532d33" stroke={s.dgx.color} strokeWidth="1.5" />
          <text x="75" y="48" textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="600">
            DGX ConnectX-7
          </text>
          <text x="75" y="61" textAnchor="middle" fontSize="7" fill={s.dgx.color}>
            {deployment === "rocev2" ? "mlx5_0 / eth0" : "mlx5_0 (IB mode)"}
          </text>

          {/* Cable */}
          <line x1="140" y1="50" x2="340" y2="50" stroke="#475569" strokeWidth="3" strokeDasharray="none" />
          <text x="240" y="44" textAnchor="middle" fill="#475569" fontSize="7">
            {deployment === "rocev2" ? "400GbE optical cable" : "NDR InfiniBand cable"}
          </text>
          {/* Command labels on the cable ends */}
          <text x="155" y="72" textAnchor="start" fill="#4ade80" fontSize="6">ibstat → DGX end</text>
          <text x="325" y="72" textAnchor="end" fill="#60a5fa" fontSize="6">
            {deployment === "rocev2" ? "show interface counters" : "show interfaces ib status"} → switch end
          </text>

          {/* Switch port box */}
          <rect x="340" y="30" width="130" height="40" rx="6"
            fill="#1e3a5f33" stroke={s.sw.color} strokeWidth="1.5" />
          <text x="405" y="48" textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="600">
            {deployment === "rocev2" ? "Spectrum-X port" : "QM9700 IB port"}
          </text>
          <text x="405" y="61" textAnchor="middle" fontSize="7" fill={s.sw.color}>
            {deployment === "rocev2" ? "eth0 (switch-side)" : "IB 1/1"}
          </text>

          {/* State indicators */}
          <circle cx="135" cy="50" r="5" fill={s.dgx.color} />
          <circle cx="345" cy="50" r="5" fill={s.sw.color} />
        </svg>
      </div>

      {/* Scenario picker */}
      <div className="flex flex-wrap gap-2 mb-4">
        {faultScenarios.map(f => (
          <button key={f.id} onClick={() => setScenario(f.id)}
            className="rounded-lg px-3 py-1.5 text-xs transition-all"
            style={{
              backgroundColor: scenario === f.id ? "#1e293b" : "#0f172a",
              border: `1px solid ${scenario === f.id ? "#475569" : "#1e293b"}`,
              color: scenario === f.id ? "#e2e8f0" : "#475569",
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Detail panel */}
      <div className="grid gap-3 sm:grid-cols-2 mb-3">
        <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: s.dgx.color + "11", border: `1px solid ${s.dgx.color}33` }}>
          <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: s.dgx.color }}>DGX end — green terminal</div>
          <div className="font-mono text-sm font-bold mb-1" style={{ color: s.dgx.color }}>{s.dgx.state}</div>
          <p className="text-slate-300 leading-5">{s.dgx.detail}</p>
        </div>
        <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: s.sw.color + "11", border: `1px solid ${s.sw.color}33` }}>
          <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: s.sw.color }}>Switch end — blue terminal</div>
          <div className="font-mono text-sm font-bold mb-1" style={{ color: s.sw.color }}>{s.sw.state}</div>
          <p className="text-slate-300 leading-5">{s.sw.detail}</p>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-slate-300">
        <div className="flex items-start gap-3">
          <div>
            <span className="font-semibold text-cyan-300">Diagnosis: </span>{s.diagnosis}
          </div>
        </div>
      </div>

      {!s.canDGXAloneDetect && (
        <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
          <span className="font-semibold">⚠ DGX alone cannot detect this fault.</span> You must check the switch end. This is why the two-end check is mandatory, not optional.
        </div>
      )}
    </div>
  )
}

export default LinkBothEndsViz
