"use client"

import { useState } from "react"

type Network = "compute" | "storage" | "management" | null

interface NetworkInfo {
  label: string
  sublabel: string
  color: string
  borderColor: string
  description: string
  switches: string
  nic: string
  bandwidth: string
  protocol: string
  why: string
}

const networks: Record<Exclude<Network, null>, NetworkInfo> = {
  compute: {
    label: "Compute fabric",
    sublabel: "GPU training network",
    color: "#1e3a5f",
    borderColor: "#60a5fa",
    description: "The network that carries GPU-to-GPU AllReduce traffic during training. Every DGX node has 8 ConnectX-7 NICs, each on a different rail. Leaf switches aggregate to spine switches in a fat-tree topology. This network must be completely lossless — a single dropped packet stalls every GPU in the training job.",
    switches: "QM9700 NDR leaf switches + Q3400 spine switches (InfiniBand) or SN4600C leaf + SN5600 spine (Spectrum-X Ethernet)",
    nic: "ConnectX-7 HCA × 8 per DGX node",
    bandwidth: "400 Gb/s per NIC × 8 NICs = 3.2 Tb/s total per node",
    protocol: "InfiniBand NDR (lossless by design) or RoCEv2 over Ethernet (lossless via PFC + ECN)",
    why: "Physically separate from storage and management so that storage I/O bursts cannot cause congestion on the training fabric. Any cross-contamination destroys training throughput.",
  },
  storage: {
    label: "Storage fabric",
    sublabel: "GPU→storage network",
    color: "#064e3b",
    borderColor: "#34d399",
    description: "A separate Ethernet network connecting DGX nodes to parallel storage systems (Lustre, BeeGFS, WEKA). Training datasets are too large for local NVMe — a 10 TB dataset is read repeatedly across hundreds of training epochs. GPUDirect Storage (GDS) allows GPUs to read training data directly from NVMe-oF targets, bypassing host CPU and system RAM entirely.",
    switches: "NVIDIA Spectrum SN4600 or SN5600 (400GbE Ethernet)",
    nic: "Dual-port ConnectX-7 × 2 per DGX H100/H200 node (Slot1 / Slot2)",
    bandwidth: "2× 400 GbE per node = 800 Gb/s storage bandwidth",
    protocol: "NVMe-oF over RoCEv2 (storage) + Ethernet (management)",
    why: "Storage traffic patterns (large sequential reads) are completely different from training traffic patterns (many small AllReduce messages). Mixing them causes priority inversion and unpredictable latency.",
  },
  management: {
    label: "Management network",
    sublabel: "Out-of-band control plane",
    color: "#1e293b",
    borderColor: "#94a3b8",
    description: "A completely separate, low-bandwidth out-of-band network for infrastructure management. BMC access (iDRAC, iLO), OS provisioning, NVIDIA UFM (Unified Fabric Manager for InfiniBand), Base Command Manager for job scheduling, IPMI, PXE boot. This network is your lifeline when the compute and storage fabrics are misbehaving.",
    switches: "Out-of-band BMC: 1GbE dedicated switch. In-band management (UFM, Base Command Manager, OS traffic): 10GbE or 25GbE Ethernet switches",
    nic: "Dedicated BMC port (iDRAC, 1GbE) + 10GbE or 25GbE in-band management NIC per node",
    bandwidth: "BMC: 1 GbE out-of-band. In-band management: 10–25 GbE",
    protocol: "Standard Ethernet — no RDMA, no special requirements",
    why: "If the compute fabric has a subnet manager failure or the storage fabric is congested, you still need to reach the nodes to diagnose and fix the problem. The management network must be completely independent — never share switches with compute or storage.",
  },
}

export function FullWiringViz() {
  const [selected, setSelected] = useState<Network>(null)

  const networkColors = {
    compute: "#60a5fa",
    storage: "#34d399",
    management: "#94a3b8",
  }

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        Three-network architecture — click each network
      </p>

      {/* Diagram */}
      <div className="mb-5">
        <svg viewBox="0 0 560 320" className="w-full max-w-2xl mx-auto">

          {/* DGX Node */}
          <rect x="20" y="110" width="180" height="160" rx="12" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5"/>
          <text x="110" y="130" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="600">DGX H100 NODE</text>

          {/* GPUs inside */}
          {[0,1,2,3].map(i => (
            <rect key={i} x={30 + i*36} y={140} width={28} height={28} rx={4}
              fill="#166534" stroke="#15803d" strokeWidth={1}/>
          ))}
          {[4,5,6,7].map(i => (
            <rect key={i} x={30 + (i-4)*36} y={172} width={28} height={28} rx={4}
              fill="#166534" stroke="#15803d" strokeWidth={1}/>
          ))}
          <text x="110" y="215" textAnchor="middle" fill="#4ade80" fontSize="7">8× H100 GPU</text>

          {/* ConnectX-7s */}
          {[0,1,2,3,4,5,6,7].map(i => (
            <rect key={i} x={30 + i*18} y={225} width={14} height={10} rx={2}
              fill={selected === "compute" ? "#1e40af" : "#1e293b"}
              stroke={selected === "compute" ? "#60a5fa" : "#334155"}
              strokeWidth={selected === "compute" ? 1.5 : 1}
            />
          ))}
          <text x="110" y="248" textAnchor="middle" fill="#475569" fontSize="7">ConnectX-7 × 8</text>

          {/* Storage NICs */}
          <rect x="30" y="255" width="44" height="10" rx="2"
            fill={selected === "storage" ? "#065f46" : "#1e293b"}
            stroke={selected === "storage" ? "#34d399" : "#334155"}
            strokeWidth={selected === "storage" ? 1.5 : 1}
          />
          <text x="52" y="263" textAnchor="middle" fill="#64748b" fontSize="6">Slot1/2 CX7</text>

          {/* BMC */}
          <rect x="80" y="255" width="36" height="10" rx="2"
            fill={selected === "management" ? "#1e293b" : "#0f172a"}
            stroke={selected === "management" ? "#94a3b8" : "#334155"}
            strokeWidth={selected === "management" ? 1.5 : 1}
          />
          <text x="98" y="263" textAnchor="middle" fill="#64748b" fontSize="6">BMC (iDRAC)</text>

          {/* === COMPUTE FABRIC === */}
          {/* Lines from ConnectX-7s to leaf switches */}
          {[0,1,2,3,4,5,6,7].map(i => (
            <line key={i}
              x1={37 + i*18} y1={225}
              x2={270} y2={60 + i*22}
              stroke={selected === "compute" ? "#60a5fa" : "#1e3a5f"}
              strokeWidth={selected === "compute" ? 2 : 1}
              opacity={selected === null || selected === "compute" ? 0.7 : 0.1}
            />
          ))}

          {/* Leaf switches */}
          <rect x="250" y="40" width="80" height="198" rx="6"
            fill={selected === "compute" ? "#1e3a8a" : "#0f172a"}
            stroke={selected === "compute" ? "#60a5fa" : "#1e3a5f"}
            strokeWidth={selected === "compute" ? 2 : 1}
            style={{ cursor: "pointer" }}
            onClick={() => setSelected(selected === "compute" ? null : "compute")}
          />
          <text x="290" y="58" textAnchor="middle" fill="#60a5fa" fontSize="8" fontWeight="600">LEAF SWITCHES</text>
          <text x="290" y="70" textAnchor="middle" fill="#3b82f6" fontSize="7">QM9700 × 8</text>
          <text x="290" y="82" textAnchor="middle" fill="#3b82f6" fontSize="7">(1 per GPU rail)</text>

          {/* Spine switches */}
          <line x1="330" y1="130" x2="390" y2="130"
            stroke={selected === "compute" ? "#60a5fa" : "#1e3a5f"}
            strokeWidth={selected === "compute" ? 2 : 1}
            opacity={selected === null || selected === "compute" ? 0.7 : 0.1}
          />
          <rect x="390" y="90" width="80" height="80" rx="6"
            fill={selected === "compute" ? "#1e3a8a" : "#0f172a"}
            stroke={selected === "compute" ? "#60a5fa" : "#1e3a5f"}
            strokeWidth={selected === "compute" ? 2 : 1}
            style={{ cursor: "pointer" }}
            onClick={() => setSelected(selected === "compute" ? null : "compute")}
          />
          <text x="430" y="125" textAnchor="middle" fill="#60a5fa" fontSize="8" fontWeight="600">SPINE</text>
          <text x="430" y="137" textAnchor="middle" fill="#3b82f6" fontSize="7">Q3400</text>
          <text x="430" y="149" textAnchor="middle" fill="#3b82f6" fontSize="6">InfiniBand</text>

          {/* Compute label */}
          <rect x="246" y="248" width="88" height="16" rx="4"
            fill={selected === "compute" ? "#1e3a8a" : "#0a0f1a"}
            stroke={selected === "compute" ? "#60a5fa" : "#1e3a5f"}
            strokeWidth={1}
            style={{ cursor: "pointer" }}
            onClick={() => setSelected(selected === "compute" ? null : "compute")}
          />
          <text x="290" y="259" textAnchor="middle" fill={selected === "compute" ? "#bfdbfe" : "#3b82f6"} fontSize="8" fontWeight="600">Compute fabric</text>

          {/* === STORAGE FABRIC === */}
          <line x1="52" y1="265" x2="390" y2="210"
            stroke={selected === "storage" ? "#34d399" : "#065f46"}
            strokeWidth={selected === "storage" ? 2 : 1}
            opacity={selected === null || selected === "storage" ? 0.7 : 0.1}
          />
          <rect x="390" y="190" width="80" height="60" rx="6"
            fill={selected === "storage" ? "#064e3b" : "#0f172a"}
            stroke={selected === "storage" ? "#34d399" : "#065f46"}
            strokeWidth={selected === "storage" ? 2 : 1}
            style={{ cursor: "pointer" }}
            onClick={() => setSelected(selected === "storage" ? null : "storage")}
          />
          <text x="430" y="215" textAnchor="middle" fill="#34d399" fontSize="8" fontWeight="600">STORAGE</text>
          <text x="430" y="227" textAnchor="middle" fill="#10b981" fontSize="7">SN5600</text>
          <text x="430" y="239" textAnchor="middle" fill="#10b981" fontSize="6">400GbE Ethernet</text>

          <rect x="246" y="268" width="88" height="16" rx="4"
            fill={selected === "storage" ? "#064e3b" : "#0a0f1a"}
            stroke={selected === "storage" ? "#34d399" : "#065f46"}
            strokeWidth={1}
            style={{ cursor: "pointer" }}
            onClick={() => setSelected(selected === "storage" ? null : "storage")}
          />
          <text x="290" y="279" textAnchor="middle" fill={selected === "storage" ? "#a7f3d0" : "#10b981"} fontSize="8" fontWeight="600">Storage fabric</text>

          {/* === MANAGEMENT FABRIC === */}
          <line x1="98" y1="265" x2="390" y2="280"
            stroke={selected === "management" ? "#94a3b8" : "#334155"}
            strokeWidth={selected === "management" ? 2 : 1}
            opacity={selected === null || selected === "management" ? 0.7 : 0.1}
          />
          <rect x="390" y="263" width="80" height="40" rx="6"
            fill={selected === "management" ? "#1e293b" : "#0f172a"}
            stroke={selected === "management" ? "#94a3b8" : "#334155"}
            strokeWidth={selected === "management" ? 2 : 1}
            style={{ cursor: "pointer" }}
            onClick={() => setSelected(selected === "management" ? null : "management")}
          />
          <text x="430" y="279" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600">MGMT</text>
          <text x="430" y="292" textAnchor="middle" fill="#64748b" fontSize="7">10/25GbE + BMC</text>

          <rect x="246" y="288" width="88" height="16" rx="4"
            fill={selected === "management" ? "#1e293b" : "#0a0f1a"}
            stroke={selected === "management" ? "#94a3b8" : "#334155"}
            strokeWidth={1}
            style={{ cursor: "pointer" }}
            onClick={() => setSelected(selected === "management" ? null : "management")}
          />
          <text x="290" y="299" textAnchor="middle" fill={selected === "management" ? "#e2e8f0" : "#64748b"} fontSize="8" fontWeight="600">Management</text>

        </svg>
      </div>

      {/* Detail panel */}
      {selected ? (
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: networks[selected].color + "33",
            border: `1px solid ${networks[selected].borderColor}44`,
          }}
        >
          <h3 className="text-sm font-bold text-white">{networks[selected].label}</h3>
          <p className="text-xs mt-0.5" style={{ color: networks[selected].borderColor }}>{networks[selected].sublabel}</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">{networks[selected].description}</p>
          <div className="mt-3 space-y-2 text-xs">
            {[
              { label: "Switches", value: networks[selected].switches },
              { label: "NIC/adapter", value: networks[selected].nic },
              { label: "Bandwidth", value: networks[selected].bandwidth },
              { label: "Protocol", value: networks[selected].protocol },
            ].map(row => (
              <div key={row.label} className="flex gap-3">
                <span className="w-20 text-slate-500 flex-shrink-0">{row.label}</span>
                <span className="text-slate-300">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg bg-black/20 px-3 py-2 text-xs text-slate-300">
            <span className="font-semibold text-slate-200">Why separate: </span>{networks[selected].why}
          </div>
        </div>
      ) : (
        <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-slate-600">
          Click a network in the diagram or the labels below it to learn more
        </div>
      )}
    </div>
  )
}

export default FullWiringViz
