"use client"

import { useState } from "react"

type PathId = "cpu" | "nic" | "gdr" | "nvlink"

type ComponentId = "cpu" | "ram" | "gpu" | "pcie" | "nic" | "network"

const paths: Record<PathId, {
  label: string
  short: string
  title: string
  body: string
  cpuRole: string
  active: ComponentId[]
}> = {
  cpu: {
    label: "CPU-orchestrated copy",
    short: "Storage/network → RAM → GPU",
    title: "The conventional host-mediated data path",
    body: "In a conventional server, the CPU and operating system orchestrate I/O. The NIC or storage controller can use DMA to move bytes into system RAM without the CPU copying each byte, but the CPU still programs the transfer, handles interrupts and protocol state, and may copy data between kernel and application buffers. For a GPU workload, data may then be copied from system RAM across PCIe into GPU HBM.",
    cpuRole: "CPU role: setup, protocol processing, scheduling, error handling, and often intermediate copies. DMA removes per-byte copying; it does not remove orchestration.",
    active: ["cpu", "ram", "pcie", "gpu"],
  },
  nic: {
    label: "NIC DMA to host memory",
    short: "Network → NIC → registered RAM",
    title: "Modern NICs already perform DMA",
    body: "A modern Ethernet NIC writes received packet data into host memory using DMA and reads transmit data from host memory the same way. Features such as checksum offload, segmentation offload, receive-side scaling, and interrupt moderation reduce CPU work further. High-speed TCP/IP is possible with appropriate hardware, drivers, buffers, congestion control, and tuning. RDMA is not the first appearance of NIC intelligence.",
    cpuRole: "CPU role: creates sockets/queues, manages memory and protocol state, and runs the application. The NIC accelerates movement and selected packet operations.",
    active: ["network", "nic", "pcie", "ram", "cpu"],
  },
  gdr: {
    label: "GPUDirect RDMA",
    short: "Network → NIC → GPU HBM",
    title: "A supported direct path into GPU memory",
    body: "With GPUDirect RDMA, a compatible NIC can DMA directly between the network and memory exposed by the GPU, avoiding an intermediate staging copy through system RAM on the data path. This requires supported hardware, drivers, memory registration, and software. It is a data-placement optimization, not the disappearance of the CPU.",
    cpuRole: "CPU role: initializes the RDMA device, protection domain, memory regions, queue pairs, collective library, and error handling. The NIC handles the transport data path after setup.",
    active: ["network", "nic", "pcie", "gpu", "cpu"],
  },
  nvlink: {
    label: "GPU-to-GPU in node",
    short: "GPU HBM ↔ NVLink/NVSwitch ↔ GPU HBM",
    title: "Scale-up communication is a different resource",
    body: "Inside a GPU server, GPUs can communicate through NVLink and NVSwitch rather than through the external NIC. This scale-up interconnect is separate from PCIe host I/O and separate from the scale-out network. Memory bandwidth, NVLink bandwidth, PCIe bandwidth, and external network bandwidth describe different resources and must not be compared without direction normalization.",
    cpuRole: "CPU role: launches kernels and initializes communication. NVLink carries GPU-to-GPU data inside the supported scale-up domain.",
    active: ["gpu"],
  },
}

const componentInfo: Record<ComponentId, { label: string; detail: string }> = {
  cpu: { label: "CPU", detail: "Runs the operating system, application control logic, data loaders, preprocessing, communication setup, and error handling." },
  ram: { label: "System RAM", detail: "CPU-attached memory used by applications, file systems, network buffers, and sometimes staging copies." },
  gpu: { label: "GPU + HBM", detail: "Executes kernels. HBM is the GPU's local high-bandwidth memory and is separate from system RAM." },
  pcie: { label: "PCIe", detail: "Connects GPUs, NICs, storage controllers, and CPUs. PCIe bandwidth is not the same resource as NVLink or external network bandwidth." },
  nic: { label: "NIC / HCA", detail: "Moves network data using DMA. RDMA-capable adapters can implement transport processing in hardware when configured and supported." },
  network: { label: "External fabric", detail: "The scale-out network connecting multiple servers. It is distinct from PCIe and from intra-node NVLink." },
}

function box(active: boolean, x: number, y: number, w: number, h: number, title: string, subtitle: string, color = "#22c55e") {
  return (
    <g key={`${title}-${x}-${y}`}>
      <rect x={x} y={y} width={w} height={h} rx={9}
        fill={active ? "#123423" : "#0f172a"}
        stroke={active ? color : "#334155"}
        strokeWidth={active ? 2 : 1}
      />
      <text x={x + w / 2} y={y + h / 2 - 3} textAnchor="middle" fill={active ? "#dcfce7" : "#94a3b8"} fontSize={10} fontWeight="700">{title}</text>
      <text x={x + w / 2} y={y + h / 2 + 11} textAnchor="middle" fill={active ? "#86efac" : "#64748b"} fontSize={7}>{subtitle}</text>
    </g>
  )
}

export function HostHardwarePathViz() {
  const [pathId, setPathId] = useState<PathId>("cpu")
  const [component, setComponent] = useState<ComponentId>("gpu")
  const selected = paths[pathId]
  const active = (id: ComponentId) => selected.active.includes(id)

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">Host hardware mental model — what computes, stores, moves, and orchestrates</p>
      <p className="mb-4 text-xs leading-5 text-slate-500">
        Select a data path. DMA means a device can move bytes without the CPU copying every byte; it does not mean the CPU or host software disappears.
      </p>

      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(paths) as PathId[]).map((id) => {
          const item = paths[id]
          const selectedPath = id === pathId
          return (
            <button key={id} type="button" onClick={() => setPathId(id)}
              className="rounded-xl px-3 py-2 text-left transition"
              style={{
                backgroundColor: selectedPath ? "#123a2a" : "#0f172a",
                border: `1px solid ${selectedPath ? "#22c55e" : "#1e293b"}`,
                color: selectedPath ? "#bbf7d0" : "#94a3b8",
              }}>
              <div className="text-xs font-semibold">{item.label}</div>
              <div className="mt-1 text-[10px] opacity-75">{item.short}</div>
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
          <svg viewBox="0 0 560 280" className="w-full" role="img" aria-label="Representative host hardware path diagram">
            <text x="280" y="20" textAnchor="middle" fill="#64748b" fontSize="9">Representative server architecture — simplified</text>

            {/* external network */}
            {box(active("network"), 24, 112, 86, 52, "External", "fabric", "#38bdf8")}
            {/* NIC */}
            {box(active("nic"), 140, 112, 92, 52, "NIC / HCA", "DMA engine", "#38bdf8")}
            {/* PCIe fabric */}
            {box(active("pcie"), 262, 112, 92, 52, "PCIe", "host I/O", "#a78bfa")}
            {/* RAM */}
            {box(active("ram"), 384, 54, 120, 52, "System RAM", "CPU memory", "#f59e0b")}
            {/* CPU */}
            {box(active("cpu"), 384, 174, 120, 52, "CPU", "orchestration", "#f97316")}
            {/* GPU */}
            {box(active("gpu"), 150, 206, 150, 52, "GPU + HBM", "kernels + memory", "#22c55e")}

            {/* connections */}
            <line x1="110" y1="138" x2="140" y2="138" stroke={active("network") && active("nic") ? "#38bdf8" : "#334155"} strokeWidth="3" />
            <line x1="232" y1="138" x2="262" y2="138" stroke={active("nic") && active("pcie") ? "#38bdf8" : "#334155"} strokeWidth="3" />
            <line x1="354" y1="125" x2="384" y2="88" stroke={active("pcie") && active("ram") ? "#a78bfa" : "#334155"} strokeWidth="3" />
            <line x1="354" y1="151" x2="384" y2="194" stroke={active("pcie") && active("cpu") ? "#a78bfa" : "#334155"} strokeWidth="3" />
            <line x1="285" y1="164" x2="240" y2="206" stroke={active("pcie") && active("gpu") ? "#22c55e" : "#334155"} strokeWidth="3" />
            <path d="M164 232 C90 250 84 196 140 162" fill="none" stroke={pathId === "gdr" ? "#22c55e" : "#334155"} strokeWidth={pathId === "gdr" ? 3 : 1.5} strokeDasharray={pathId === "gdr" ? undefined : "5 5"} />
            {pathId === "gdr" && <text x="61" y="219" fill="#86efac" fontSize="8">GPUDirect RDMA</text>}
            {pathId === "nvlink" && (
              <g>
                <path d="M226 206 C230 178 268 180 276 206" fill="none" stroke="#22c55e" strokeWidth="3" />
                <text x="252" y="176" textAnchor="middle" fill="#86efac" fontSize="8">NVLink domain (to peer GPUs)</text>
              </g>
            )}
          </svg>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {(["cpu", "ram", "gpu", "pcie", "nic", "network"] as ComponentId[]).map((id) => (
              <button key={id} type="button" onClick={() => setComponent(id)}
                className="rounded-lg px-2 py-1.5 text-[11px] transition"
                style={{
                  backgroundColor: component === id ? "#1e3a5f" : "#0f172a",
                  border: `1px solid ${component === id ? "#60a5fa" : "#1e293b"}`,
                  color: component === id ? "#bfdbfe" : "#94a3b8",
                }}>
                {componentInfo[id].label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl bg-slate-800/60 p-4">
            <h3 className="text-sm font-semibold text-white">{selected.title}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-300">{selected.body}</p>
          </div>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <p className="text-sm leading-7 text-cyan-100">{selected.cpuRole}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Component role</p>
            <h4 className="mt-1 text-sm font-semibold text-white">{componentInfo[component].label}</h4>
            <p className="mt-2 text-sm leading-7 text-slate-300">{componentInfo[component].detail}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HostHardwarePathViz
