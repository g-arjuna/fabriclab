"use client"
import { useState } from "react"

// -- NCCLEnvVarViz ----------------------------------------------------------------
// Interactive env var explorer -- shows each variable, what it does,
// what happens when wrong, and the diagnostic signature

type EnvVar = {
  name: string
  defaultValue: string
  correctExample: string
  wrongExample: string
  wrongSymptom: string
  whatItDoes: string
  priority: "critical" | "high" | "medium"
}

const ENV_VARS: EnvVar[] = [
  {
    name: "NCCL_IB_HCA",
    defaultValue: "(scan all)",
    correctExample: "mlx5_0:1,mlx5_1:1,mlx5_2:1,mlx5_3:1,mlx5_4:1,mlx5_5:1,mlx5_6:1,mlx5_7:1",
    wrongExample: "mlx5_bond_0  <- IB bonded name on RoCEv2 system",
    wrongSymptom: "NCCL falls back to TCP socket transport. busbw drops to 2-4 GB/s. No error -- only visible in NCCL_DEBUG=INFO log: 'transport selected: socket'",
    whatItDoes: "Specifies which RDMA HCA devices NCCL should use. On a DGX H100 in RoCEv2 mode, NICs present as mlx5_0 through mlx5_7. On IB mode, naming may differ.",
    priority: "critical",
  },
  {
    name: "NCCL_SOCKET_IFNAME",
    defaultValue: "(auto-detect)",
    correctExample: "eno1  <- management ethernet, not training NIC",
    wrongExample: "eth0  <- RDMA training interface",
    wrongSymptom: "Control messages compete with RDMA data traffic. QP establishment can fail under load. Training hangs or produces intermittent timeout errors mid-job.",
    whatItDoes: "Specifies which ethernet interface NCCL uses for TCP out-of-band control messages (QP info exchange, barrier sync). Must be the management ethernet, not the RDMA training interface.",
    priority: "critical",
  },
  {
    name: "NCCL_DEBUG",
    defaultValue: "WARN",
    correctExample: "INFO  <- for debugging. WARN in production.",
    wrongExample: "TRACE  <- extremely verbose, log files fill in seconds",
    wrongSymptom: "At WARN (default), NCCL does not log the transport selected. You cannot tell if NCCL is using RDMA or TCP fallback without INFO level.",
    whatItDoes: "Controls NCCL logging verbosity. INFO shows transport selection, NIC assignment, algorithm selection, QP creation. Always set to INFO when diagnosing performance issues.",
    priority: "high",
  },
  {
    name: "NCCL_IB_QPS_PER_CONNECTION",
    defaultValue: "1",
    correctExample: "4  <- on Spectrum-X with RSHP enabled",
    wrongExample: "1  <- creates only 1 ECMP flow per GPU pair",
    wrongSymptom: "With 1 QP per connection, all traffic from GPU pair A->B uses the same src port -> same ECMP hash -> same spine path. Better than nothing, but wastes fabric path diversity.",
    whatItDoes: "Number of Queue Pairs NCCL creates per GPU-to-GPU connection. Each QP gets a different UDP source port -> different ECMP hash -> potentially different spine link. More QPs = better load distribution with RSHP.",
    priority: "high",
  },
  {
    name: "NCCL_IB_GID_INDEX",
    defaultValue: "3",
    correctExample: "3  <- standard for RoCEv2 on ConnectX-7 in Ethernet mode",
    wrongExample: "0  <- selects IPv4-mapped GID, may not be routable",
    wrongSymptom: "Connection establishment fails or traffic takes wrong path. Verify with: ibv_devinfo -d mlx5_0 | grep GID",
    whatItDoes: "Index of the GID (Global Interface Identifier) NCCL uses for RoCEv2 connections. ConnectX-7 in Ethernet mode has multiple GIDs. Index 3 is the RoCEv2-compatible GID on most MLNX-OFED configurations.",
    priority: "medium",
  },
  {
    name: "NCCL_P2P_DISABLE",
    defaultValue: "0",
    correctExample: "0  <- NVLink P2P enabled (default, correct)",
    wrongExample: "1  <- disables NVLink, forces host-mediated copies",
    wrongSymptom: "Intra-node bandwidth drops from 900 GB/s (NVLink) to ~30 GB/s (PCIe). Training throughput degrades drastically even with a healthy external fabric.",
    whatItDoes: "Disables direct NVLink peer-to-peer between GPUs. Set to 1 only when debugging NVLink failures. Never set in production -- it negates the primary benefit of the DGX's NVSwitch fabric.",
    priority: "medium",
  },
]

const PRIORITY_COLORS = {
  critical: { bg: "#7f1d1d", border: "#ef4444", label: "CRITICAL" },
  high: { bg: "#78350f", border: "#f59e0b", label: "HIGH" },
  medium: { bg: "#1e3a5f", border: "#60a5fa", label: "MEDIUM" },
}

export function NCCLEnvVarViz() {
  const [active, setActive] = useState<string | null>("NCCL_IB_HCA")

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        NCCL environment variables -- what each one does and how it fails
      </p>
      <p className="mb-4 text-xs text-slate-600">Click any variable to see the diagnostic signature when it is misconfigured</p>

      <div className="space-y-2">
        {ENV_VARS.map((v) => {
          const pc = PRIORITY_COLORS[v.priority]
          const isOpen = active === v.name
          return (
            <div key={v.name} className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${isOpen ? pc.border + "66" : "#1e293b"}` }}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                style={{ backgroundColor: isOpen ? pc.bg + "22" : "#0f172a" }}
                onClick={() => setActive(isOpen ? null : v.name)}
              >
                <span className="text-[9px] font-bold rounded px-1.5 py-0.5 flex-shrink-0"
                  style={{ backgroundColor: pc.bg, color: pc.border }}>
                  {pc.label}
                </span>
                <code className="text-sm font-mono font-bold text-white flex-1 text-left">
                  {v.name}
                </code>
                <span className="text-xs text-slate-600 font-mono hidden sm:block">
                  default: {v.defaultValue}
                </span>
                <span className="text-slate-600 text-xs ml-2">{isOpen ? "v" : ">"}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3 text-xs border-t border-white/8 pt-3">
                  <p className="text-slate-300 leading-5">{v.whatItDoes}</p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg bg-green-900/20 border border-green-500/20 p-3">
                      <div className="text-[10px] text-green-400 mb-1">Correct</div>
                      <code className="text-green-300 font-mono text-[10px] leading-5 whitespace-pre-wrap">
                        {v.name}={v.correctExample}
                      </code>
                    </div>
                    <div className="rounded-lg bg-red-900/20 border border-red-500/20 p-3">
                      <div className="text-[10px] text-red-400 mb-1">Wrong (common mistake)</div>
                      <code className="text-red-300 font-mono text-[10px] leading-5 whitespace-pre-wrap">
                        {v.name}={v.wrongExample}
                      </code>
                    </div>
                  </div>

                  <div className="rounded-lg bg-amber-900/10 border border-amber-500/20 p-3">
                    <div className="text-[10px] text-amber-400 mb-1">Diagnostic signature when wrong</div>
                    <p className="text-slate-400 leading-5">{v.wrongSymptom}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
export default NCCLEnvVarViz
