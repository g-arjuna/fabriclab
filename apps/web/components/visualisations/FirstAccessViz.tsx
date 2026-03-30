// FirstAccessViz.tsx
"use client"

import { useState } from "react"

type Device = "onyx" | "dgx" | "ufm" | "bluefield"

interface AccessInfo {
  device: string
  physicalAccess: string
  terminalSettings: string
  loginCredentials: string
  firstThingsToCheck: string[]
  whatBadLooksLike: string
  color: string
  border: string
}

const accessInfo: Record<Device, AccessInfo> = {
  onyx: {
    device: "QM9700 / Q3400 ONYX switch",
    physicalAccess: "Micro-USB console cable (front panel) or RJ45 console port. Connect to your laptop's USB-A port with a USB-to-serial adapter if needed.",
    terminalSettings: "115200 baud · 8 data bits · No parity · 1 stop bit (8N1) · No hardware flow control\nTerminal apps: PuTTY (Windows), screen /dev/ttyUSB0 115200 (Linux/Mac)",
    loginCredentials: "Username: admin\nPassword: admin (change immediately)\nThen: switch > enable\n       switch # (privileged mode)",
    firstThingsToCheck: [
      "show version — confirms ONYX version, build date",
      "show interfaces ib status — all ports should show Active after nodes boot",
      "show ib sm — confirms Subnet Manager is running (or which host is running it)",
      "show ib counters — baseline error counts (should be near zero on fresh bring-up)",
      "show system resources — CPU, memory usage of ONYX process",
    ],
    whatBadLooksLike: "Ports stuck in 'Polling' state means the DGX nodes have not connected yet or the cable is bad. 'Down' with no recovery means a link-layer problem — check the cable and the NIC state on the DGX side.",
    color: "#1e3a5f",
    border: "#60a5fa",
  },
  dgx: {
    device: "DGX H100 compute node",
    physicalAccess: "iDRAC web GUI (browser to BMC IP) for virtual console. Or direct SSH to management IP after OS boot. No physical console cable typically needed.",
    terminalSettings: "iDRAC web: https://[bmc-ip] (accept self-signed cert)\nOr SSH: ssh ubuntu@[mgmt-ip] after OS boot",
    loginCredentials: "iDRAC: root / calvin (default, from service tag label)\nOS: ubuntu / [set during provisioning] or ubuntu with SSH key",
    firstThingsToCheck: [
      "nvidia-smi — must show all 8 GPUs with correct memory (80 GB each for H100)",
      "ibstat — must show all 8 mlx5_N devices in Active state",
      "systemctl status nvsm — NVIDIA System Management daemon",
      "systemctl status nvidia-fabricmanager — NVLink/fabric initialisation daemon",
      "cat /proc/driver/nvidia/gpus/*/information — low-level GPU details",
    ],
    whatBadLooksLike: "nvidia-smi shows fewer than 8 GPUs: hardware fault or driver issue. ibstat shows 'Polling' instead of 'Active': the NIC has not connected to the fabric — check switch port state. nvidia-fabricmanager shows failed: NVLink not initialised — training will fail.",
    color: "#14532d",
    border: "#22c55e",
  },
  ufm: {
    device: "UFM management server",
    physicalAccess: "Web browser from management workstation. UFM runs as a containerised service on the management server.",
    terminalSettings: "Browser: https://[ufm-server-ip]:443\nCLI: SSH to UFM server, then: docker exec -it ufm bash",
    loginCredentials: "Default web login: ufmsystem / 123456\nChange immediately. Create read-only monitoring accounts separately from admin accounts.",
    firstThingsToCheck: [
      "Dashboard: all switches green, all compute nodes appearing as fabric endpoints",
      "Routing → Algorithm: confirm FTREE or MINHOP is set correctly for your topology",
      "Events: no critical events (unresolved port errors, SM restarts)",
      "Topology: confirm node count matches expected (32 DGX nodes for a BasePOD)",
      "Performance → Ports: baseline bandwidth utilisation (should be near zero on idle cluster)",
    ],
    whatBadLooksLike: "Nodes appear as 'Unknown' or do not appear at all: FM daemon not running on that node, or the ConnectX-7 cable is disconnected. Multiple SM warnings: two hosts are both trying to be the Subnet Manager — only one should be primary.",
    color: "#78350f",
    border: "#fbbf24",
  },
  bluefield: {
    device: "BlueField-3 adapter (B200-class)",
    physicalAccess: "On later platforms such as DGX B200, SSH to the adapter management IP (separate from the host IP). Or from the host: ssh ubuntu@192.168.100.2 via the rshim virtual network interface.",
    terminalSettings: "SSH: ssh ubuntu@[dpu-mgmt-ip]\nFrom DGX host: ssh ubuntu@192.168.100.2 (rshim0 virtual interface)\nConsole via rshim: minicom -D /dev/rshim0/console",
    loginCredentials: "Default: ubuntu / ubuntu or ubuntu with SSH key set during provisioning\nThe adapter has its own user accounts, completely independent of the host. DGX H100/H200 do not use this BlueField path.",
    firstThingsToCheck: [
      "uname -a — confirms BF-Bundle OS version (Arm architecture)",
      "mlxconfig -d /dev/mst/mt41692_pciconf0 q — shows DPU configuration",
      "bf-release show — BF-Bundle release information",
      "mst status — shows ConnectX device status",
      "ip link show — network interfaces on the DPU side",
    ],
    whatBadLooksLike: "Cannot SSH to DPU: rshim service not running on DGX host (systemctl start rshim). DPU shows wrong firmware version: needs BFB (BlueField Boot image) upgrade via bfb-install. DPU OVS bridge not up: infrastructure services not started.",
    color: "#4c1d95",
    border: "#a78bfa",
  },
}

export function FirstAccessViz() {
  const [device, setDevice] = useState<Device>("onyx")
  const info = accessInfo[device]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        First access — what you expect to see
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-5">
        {(Object.keys(accessInfo) as Device[]).map(d => (
          <button
            key={d}
            onClick={() => setDevice(d)}
            className="rounded-xl px-3 py-2 text-xs transition-all text-center"
            style={{
              backgroundColor: device === d ? accessInfo[d].color + "44" : "#0f172a",
              border: `1px solid ${device === d ? accessInfo[d].border : "#1e293b"}`,
              color: device === d ? "#fff" : "#64748b",
            }}
          >
            {accessInfo[d].device.split(" ")[0]}
          </button>
        ))}
      </div>

      <div className="space-y-3" style={{ borderLeft: `3px solid ${info.border}`, paddingLeft: 16 }}>
        <h3 className="text-sm font-semibold text-white">{info.device}</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-800/50 p-3 text-xs">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Physical access</div>
            <p className="text-slate-300 leading-5">{info.physicalAccess}</p>
          </div>
          <div className="rounded-xl bg-slate-800/50 p-3 text-xs">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Terminal settings</div>
            <pre className="text-cyan-300 font-mono text-[10px] leading-5 whitespace-pre-wrap">{info.terminalSettings}</pre>
          </div>
        </div>

        <div className="rounded-xl bg-slate-800/50 p-3 text-xs">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Default credentials</div>
          <pre className="text-amber-300 font-mono text-[10px] leading-5">{info.loginCredentials}</pre>
        </div>

        <div className="rounded-xl bg-slate-800/50 p-3 text-xs">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">First things to check</div>
          <ul className="space-y-1.5">
            {info.firstThingsToCheck.map((check, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-300 leading-5">
                <span className="text-cyan-400 flex-shrink-0 mt-0.5">→</span>
                <span className="font-mono text-[10px]">{check}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Improved contrast: text-red-100 (up from text-red-200), border-red-400/30 (up from border-red-500/20) */}
        <div className="rounded-xl border border-red-400/30 bg-red-500/8 p-3 text-xs text-red-100">
          <span className="font-semibold text-red-200">What bad looks like: </span>{info.whatBadLooksLike}
        </div>
      </div>
    </div>
  )
}

export default FirstAccessViz
