"use client";

import { useState } from "react";

// BMCArchitectureViz -- Shows AST2600 BMC SoC internals and how it connects to the host
// Clickable components explain each bus/connection

type Component = {
  id: string;
  label: string;
  sub: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  detail: string;
  cmd?: string;
};

const BMC_INTERNALS: Component[] = [
  {
    id: "arm",
    label: "Dual ARM A7",
    sub: "1.2 GHz, BMC CPU",
    color: "#6366f1",
    x: 20, y: 20, w: 120, h: 50,
    detail: "Two ARM Cortex-A7 cores running the BMC OS (Yocto Linux). These are completely independent from the host Intel Xeon CPUs. Powered by standby rail -- alive even when host is off.",
  },
  {
    id: "ddr",
    label: "DDR4 RAM",
    sub: "512 MB - 1 GB",
    color: "#0ea5e9",
    x: 160, y: 20, w: 100, h: 50,
    detail: "Dedicated DRAM for the BMC OS. Holds the running BMC firmware image, OS processes, and sensor data buffers. Separate from host DRAM -- not accessible by the host CPU.",
  },
  {
    id: "flash",
    label: "SPI NOR Flash",
    sub: "128 MB firmware",
    color: "#22c55e",
    x: 280, y: 20, w: 110, h: 50,
    detail: "SPI NOR flash holds the BMC firmware image. Reflashing this (via Redfish UpdateService or IPMI firmware update) replaces the entire BMC OS. A bad flash can brick the BMC -- always verify the image checksum first.",
  },
  {
    id: "nic",
    label: "1GbE PHY",
    sub: "OOB NIC",
    color: "#f59e0b",
    x: 20, y: 110, w: 100, h: 50,
    detail: "Dedicated 1GbE PHY built into the AST2600. This is the physical port labelled iDRAC or BMC on the rear of the DGX chassis. Connects ONLY to the OOB management switch. Never to the compute or storage fabric.",
  },
  {
    id: "vga",
    label: "2D VGA Ctrl",
    sub: "KVM-over-IP",
    color: "#a78bfa",
    x: 140, y: 110, w: 100, h: 50,
    detail: "Built-in 2D graphics controller that intercepts the host server video output. Streams it over the network as the KVM console. The host never knows it is being captured. This is how you see POST errors and OS boot output remotely.",
  },
  {
    id: "usb",
    label: "USB 2.0 Ctrl",
    sub: "Virtual media",
    color: "#f87171",
    x: 260, y: 110, w: 100, h: 50,
    detail: "USB controller that presents itself as a virtual USB drive or optical drive to the host. Mount an ISO from your management workstation here and the DGX sees it as a physical USB device. This is how OS provisioning (PXE alternative) works without physical access.",
  },
];

const BUSES: Component[] = [
  {
    id: "i2c",
    label: "I2C / SMBus",
    sub: "Sensor polling",
    color: "#22c55e",
    x: 420, y: 30, w: 110, h: 40,
    detail: "I2C/SMBus connects the BMC to every power regulator, temperature sensor, fan controller, and voltage monitor on the motherboard. The BMC polls these at 1-second intervals and logs readings. This is the source of all IPMI sensor data (sdr elist output). Each sensor has an SDR record describing its type, location, and alarm thresholds.",
    cmd: "ipmitool -I lanplus -H 10.0.1.10 -U admin -P pass sdr elist",
  },
  {
    id: "lpc",
    label: "LPC Bus",
    sub: "POST capture",
    color: "#f59e0b",
    x: 420, y: 90, w: 110, h: 40,
    detail: "Low Pin Count bus -- the legacy path between the BMC and the host chipset. This is how the BMC intercepts host POST (Power-On Self-Test) output and presents it on the Serial-Over-LAN (SOL) console. If a DGX fails to boot, ipmitool sol activate shows you exactly what the BIOS/UEFI printed before hanging.",
    cmd: "ipmitool -I lanplus -H 10.0.1.10 -U admin -P pass sol activate",
  },
  {
    id: "pcie",
    label: "PCIe vNIC",
    sub: "In-band path",
    color: "#6366f1",
    x: 420, y: 150, w: 110, h: 40,
    detail: "In newer platforms, the BMC exposes a virtual NIC to the host over PCIe. This allows in-band management commands (ipmitool without -H) from the host OS to reach the local BMC without going over the network. The kernel ipmi_si module provides this interface via the KCS register-mapped I/O port at 0xCA0/0xCA2.",
    cmd: "lsmod | grep ipmi_si  # confirm in-band IPMI driver",
  },
];

export function BMCArchitectureViz() {
  const [selected, setSelected] = useState<string | null>(null);

  const allComponents = [...BMC_INTERNALS, ...BUSES];
  const selectedComp = allComponents.find((c) => c.id === selected);

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 800 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          BMC Architecture
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          ASPEED AST2600 -- Inside the Baseboard Management Controller
        </div>
      </div>

      {/* SVG diagram */}
      <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, marginBottom: 20, overflowX: "auto" }}>
        <svg viewBox="0 0 560 230" style={{ width: "100%", height: "auto", minWidth: 560 }}>
          {/* BMC SoC boundary */}
          <rect x={10} y={8} width={390} height={175} rx={8}
            fill="#1e293b" stroke="#334155" strokeWidth={1.5} strokeDasharray="5 3" />
          <text x={205} y={25} textAnchor="middle" fill="#475569" fontSize={10} fontStyle="italic">
            ASPEED AST2600 SoC
          </text>

          {/* BMC internals */}
          {BMC_INTERNALS.map((c) => (
            <g key={c.id} onClick={() => setSelected(selected === c.id ? null : c.id)} style={{ cursor: "pointer" }}>
              <rect x={c.x} y={c.y + 10} width={c.w} height={c.h} rx={6}
                fill={selected === c.id ? c.color + "33" : "#0f172a"}
                stroke={selected === c.id ? c.color : c.color + "55"}
                strokeWidth={selected === c.id ? 2 : 1}
              />
              <text x={c.x + c.w / 2} y={c.y + 33} textAnchor="middle" fill={c.color} fontSize={10} fontWeight="bold">{c.label}</text>
              <text x={c.x + c.w / 2} y={c.y + 47} textAnchor="middle" fill="#475569" fontSize={9}>{c.sub}</text>
            </g>
          ))}

          {/* Internal connections (simplified) */}
          <line x1={140} y1={45} x2={160} y2={45} stroke="#334155" strokeWidth={1} />
          <line x1={260} y1={45} x2={280} y2={45} stroke="#334155" strokeWidth={1} />

          {/* Host server boundary */}
          <rect x={415} y={8} width={135} height={175} rx={8}
            fill="#1e293b" stroke="#475569" strokeWidth={1.5} strokeDasharray="5 3" />
          <text x={482} y={25} textAnchor="middle" fill="#475569" fontSize={10} fontStyle="italic">
            Host Server
          </text>

          {/* Bus components */}
          {BUSES.map((c) => (
            <g key={c.id} onClick={() => setSelected(selected === c.id ? null : c.id)} style={{ cursor: "pointer" }}>
              <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={5}
                fill={selected === c.id ? c.color + "22" : "#0f172a"}
                stroke={selected === c.id ? c.color : c.color + "55"}
                strokeWidth={selected === c.id ? 2 : 1}
              />
              <text x={c.x + c.w / 2} y={c.y + 16} textAnchor="middle" fill={c.color} fontSize={10} fontWeight="bold">{c.label}</text>
              <text x={c.x + c.w / 2} y={c.y + 28} textAnchor="middle" fill="#475569" fontSize={9}>{c.sub}</text>
            </g>
          ))}

          {/* Bus connection lines from AST2600 to host */}
          <line x1={390} y1={50} x2={420} y2={50} stroke="#22c55e" strokeWidth={1.5} markerEnd="url(#arr)" />
          <line x1={390} y1={110} x2={420} y2={110} stroke="#f59e0b" strokeWidth={1.5} markerEnd="url(#arr)" />
          <line x1={390} y1={170} x2={420} y2={170} stroke="#6366f1" strokeWidth={1.5} markerEnd="url(#arr)" />

          {/* OOB network connection from 1GbE PHY */}
          <line x1={70} y1={160} x2={70} y2={200} stroke="#f59e0b" strokeWidth={2} />
          <rect x={30} y={200} width={80} height={22} rx={4} fill="#451a03" stroke="#f59e0b" strokeWidth={1} />
          <text x={70} y={215} textAnchor="middle" fill="#fbbf24" fontSize={9} fontWeight="bold">OOB Switch (SN2201)</text>

          {/* Standby power note */}
          <rect x={290} y={168} width={100} height={20} rx={4} fill="#14532d22" stroke="#22c55e44" />
          <text x={340} y={181} textAnchor="middle" fill="#4ade80" fontSize={9}>Standby power -- always on</text>

          <defs>
            <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#475569" />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Selected component detail */}
      {selectedComp ? (
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 16px", borderLeft: `3px solid ${selectedComp.color}` }}>
          <div style={{ fontSize: 13, color: selectedComp.color, fontWeight: 700, marginBottom: 6 }}>{selectedComp.label}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.65, marginBottom: selectedComp.cmd ? 8 : 0 }}>
            {selectedComp.detail}
          </div>
          {selectedComp.cmd && (
            <div style={{ background: "#0f172a", borderRadius: 4, padding: "6px 10px", fontSize: 11, color: "#22c55e", overflowX: "auto" }}>
              $ {selectedComp.cmd}
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "#334155", textAlign: "center" }}>click any component to learn what it does</div>
      )}
    </div>
  );
}

export default BMCArchitectureViz;
