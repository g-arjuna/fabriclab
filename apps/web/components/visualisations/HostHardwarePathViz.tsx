"use client"

import { useState } from "react"

type PathId = "cpu" | "nic" | "gdr" | "nvlink"
type ComponentId = "cpu" | "ram" | "gpu0" | "gpu1" | "pcie" | "nic" | "network" | "nvlink"
type EdgeId = "network-nic" | "nic-pcie" | "pcie-ram" | "pcie-cpu" | "pcie-gpu0" | "ram-cpu" | "cpu-nic" | "cpu-gpu0" | "cpu-gpu1" | "gpu0-nvlink" | "nvlink-gpu1"

const edgeNames: Record<EdgeId, [ComponentId, ComponentId]> = {
  "network-nic": ["network", "nic"],
  "nic-pcie": ["nic", "pcie"],
  "pcie-ram": ["pcie", "ram"],
  "pcie-cpu": ["pcie", "cpu"],
  "pcie-gpu0": ["pcie", "gpu0"],
  "ram-cpu": ["ram", "cpu"],
  "cpu-nic": ["cpu", "nic"],
  "cpu-gpu0": ["cpu", "gpu0"],
  "cpu-gpu1": ["cpu", "gpu1"],
  "gpu0-nvlink": ["gpu0", "nvlink"],
  "nvlink-gpu1": ["nvlink", "gpu1"],
}

const paths: Record<PathId, {
  label: string
  short: string
  title: string
  body: string
  payload: EdgeId[]
  control: EdgeId[]
}> = {
  cpu: {
    label: "Host-memory staging",
    short: "Network → NIC → RAM → PCIe → GPU HBM",
    title: "Conventional host-memory staging path",
    body: "The NIC DMAs received network data into host RAM. A subsequent copy or DMA operation moves the staged bytes across the PCIe/I/O topology into GPU HBM. Host software configures buffers, performs protocol and application processing, and orchestrates the transfer. DMA avoids per-byte CPU copying for the stages where DMA is used; it does not remove control software.",
    payload: ["network-nic", "nic-pcie", "pcie-ram", "pcie-gpu0"],
    control: ["cpu-nic", "ram-cpu", "cpu-gpu0"],
  },
  nic: {
    label: "Ordinary NIC DMA",
    short: "Network → NIC → PCIe/I/O → host RAM",
    title: "NIC DMA into driver-managed host memory",
    body: "A modern NIC writes received packet data into host memory using DMA and reads transmit data from host memory the same way. These buffers are allocated and DMA-mapped by the driver/kernel. That is not the same mechanism as application-level RDMA memory registration with protection domains and access keys. Offloads reduce CPU work, but TCP/IP protocol processing and application logic remain host software responsibilities.",
    payload: ["network-nic", "nic-pcie", "pcie-ram"],
    control: ["cpu-nic", "ram-cpu"],
  },
  gdr: {
    label: "GPUDirect RDMA",
    short: "Network → RDMA NIC → PCIe peer-access path → GPU HBM",
    title: "Supported peer-memory access without host-RAM staging",
    body: "With GPUDirect RDMA, a compatible NIC can DMA directly to or from memory exposed by the GPU over a supported PCIe peer-access path. The highlighted path uses the PCIe/I/O topology; it is not a separate physical wire bypassing PCIe. Platform routing, PCIe topology, ACS/settings, drivers, memory registration, and software support determine whether this path is available.",
    payload: ["network-nic", "nic-pcie", "pcie-gpu0"],
    control: ["cpu-nic", "cpu-gpu0"],
  },
  nvlink: {
    label: "GPU-to-GPU NVLink",
    short: "GPU 0 HBM → NVLink/NVSwitch → GPU 1 HBM",
    title: "Scale-up communication between two distinct GPUs",
    body: "NVLink/NVSwitch communication moves data between GPU memory inside the scale-up domain. It is separate from PCIe host I/O and separate from the external scale-out network. The CPUs and host software still exist: they launch kernels, initialize communication libraries, and handle errors, but the illustrated payload does not traverse host RAM or the external NIC.",
    payload: ["gpu0-nvlink", "nvlink-gpu1"],
    control: ["cpu-gpu0", "cpu-gpu1"],
  },
}

const componentInfo: Record<ComponentId, { label: string; x: number; y: number; w: number; h: number; detail: string }> = {
  network: { label: "External fabric", x: 22, y: 105, w: 82, h: 46, detail: "Scale-out network connecting servers." },
  nic: { label: "NIC / HCA", x: 132, y: 105, w: 82, h: 46, detail: "Network adapter with DMA engines and, for RDMA adapters, transport offload resources." },
  pcie: { label: "PCIe / I/O", x: 246, y: 105, w: 92, h: 46, detail: "Host I/O topology connecting adapters, GPUs, storage, and CPU-attached memory. Peer access support is platform-dependent." },
  ram: { label: "System RAM", x: 382, y: 48, w: 116, h: 46, detail: "CPU-attached memory used by applications, file systems, drivers, and staging buffers." },
  cpu: { label: "CPU", x: 382, y: 160, w: 116, h: 46, detail: "Runs system software, application control logic, communication setup, and error handling." },
  gpu0: { label: "GPU 0 + HBM", x: 122, y: 204, w: 124, h: 48, detail: "First accelerator and its local high-bandwidth memory." },
  gpu1: { label: "GPU 1 + HBM", x: 328, y: 232, w: 124, h: 48, detail: "Peer accelerator used for the NVLink example." },
  nvlink: { label: "NVLink / NVSwitch", x: 260, y: 218, w: 92, h: 34, detail: "Scale-up interconnect domain; distinct from PCIe and external networking." },
}

function center(id: ComponentId) {
  const n = componentInfo[id]
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 }
}

function Edge({ id, activePayload, activeControl }: { id: EdgeId; activePayload: boolean; activeControl: boolean }) {
  const [from, to] = edgeNames[id]
  const a = center(from)
  const b = center(to)
  const stroke = activePayload ? "#22c55e" : activeControl ? "#f59e0b" : "#334155"
  return <line data-testid={`host-edge-${id}`} data-payload={activePayload ? "true" : "false"} data-control={activeControl ? "true" : "false"}
    x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={activePayload ? 4 : activeControl ? 2 : 1.4}
    strokeDasharray={activeControl && !activePayload ? "6 5" : undefined} opacity={activePayload || activeControl ? 1 : 0.32} strokeLinecap="round" />
}

function Box({ id, emphasized }: { id: ComponentId; emphasized: boolean }) {
  const n = componentInfo[id]
  return (
    <g data-testid={`host-node-${id}`} data-active={emphasized ? "true" : "false"}>
      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={8} fill={emphasized ? "#123423" : "#0f172a"} stroke={emphasized ? "#22c55e" : "#334155"} strokeWidth={emphasized ? 2 : 1} />
      <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 3} textAnchor="middle" fill={emphasized ? "#dcfce7" : "#94a3b8"} fontSize={id === "nvlink" ? 7 : 9} fontWeight="700">{n.label}</text>
    </g>
  )
}

export function HostHardwarePathViz() {
  const [pathId, setPathId] = useState<PathId>("cpu")
  const [component, setComponent] = useState<ComponentId>("gpu0")
  const selected = paths[pathId]
  const involvedComponents = new Set<ComponentId>()
  for (const edge of [...selected.payload, ...selected.control]) {
    involvedComponents.add(edgeNames[edge][0])
    involvedComponents.add(edgeNames[edge][1])
  }

  return (
    <div data-testid="host-hardware-path-viz" className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">Host hardware path — payload and control are different lines</p>
      <p className="mb-4 text-xs leading-5 text-slate-500">Solid green edges are current payload movement. Dashed amber edges are control/orchestration. Muted edges are available connectivity not used by the selected payload.</p>
      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="Host data path scenario">
        {(Object.keys(paths) as PathId[]).map((id) => (
          <button key={id} type="button" aria-pressed={id === pathId} onClick={() => setPathId(id)}
            className="rounded-xl px-3 py-2 text-left transition"
            style={{ backgroundColor: id === pathId ? "#123a2a" : "#0f172a", border: `1px solid ${id === pathId ? "#22c55e" : "#1e293b"}`, color: id === pathId ? "#bbf7d0" : "#94a3b8" }}>
            <div className="text-xs font-semibold">{paths[id].label}</div>
            <div className="mt-1 text-[10px] opacity-75">{paths[id].short}</div>
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
          <svg viewBox="0 0 530 292" className="w-full" role="img" aria-label={`Host hardware path: ${selected.label}`} data-testid={`host-path-${pathId}`}>
            {(Object.keys(edgeNames) as EdgeId[]).map((id) => <Edge key={id} id={id} activePayload={selected.payload.includes(id)} activeControl={selected.control.includes(id)} />)}
            {(Object.keys(componentInfo) as ComponentId[]).map((id) => <Box key={id} id={id} emphasized={involvedComponents.has(id)} />)}
            <text x="22" y="24" fill="#22c55e" fontSize="8">━━ payload</text>
            <text x="92" y="24" fill="#f59e0b" fontSize="8">┅ control/orchestration</text>
            <text x="236" y="24" fill="#64748b" fontSize="8">─ available but unused</text>
          </svg>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {(Object.keys(componentInfo) as ComponentId[]).map((id) => (
              <button key={id} type="button" onClick={() => setComponent(id)}
                className="rounded-lg px-2 py-1.5 text-[11px] transition"
                style={{ backgroundColor: component === id ? "#1e3a5f" : "#0f172a", border: `1px solid ${component === id ? "#60a5fa" : "#1e293b"}`, color: component === id ? "#bfdbfe" : "#94a3b8" }}>
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
