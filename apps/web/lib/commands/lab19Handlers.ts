import type { CommandResult } from "@/types"
import { useLabStore } from "@/store/labStore"

function toRecord(topology: unknown): Record<string, unknown> {
  return topology as Record<string, unknown>
}

function getFlowletDisplay(flowletTimerMs: number, mode: string): string {
  if (mode === "per-packet") {
    return "N/A"
  }
  return flowletTimerMs >= 1000 ? `${flowletTimerMs / 1000}s` : `${flowletTimerMs}us`
}

function getReorderState(topology: Record<string, unknown>, iface: "eth0" | "eth1"): boolean {
  return iface === "eth0"
    ? Boolean(topology.supernicReorderEth0Enabled)
    : Boolean(topology.supernicReorderEth1Enabled)
}

function getOverallReorderState(topology: Record<string, unknown>): boolean {
  return Boolean(topology.supernicReorderEnabled)
}

export function handleShowAdaptiveRouting(): CommandResult {
  const { topology, setCondition } = useLabStore.getState()
  const t = toRecord(topology)
  setCondition("arStatusChecked", true)

  const mode = String(t.arMode ?? "per-flowlet")
  const configured = String(t.arModeConfigured ?? "per-packet")
  const flowletTimerMs = Number(t.flowletTimerMs ?? 1000)
  const stdDev = Number(t.arLoadStdDev ?? 28)
  const isFallback = mode !== configured

  return {
    output: `Adaptive Routing
================
Enable:        on
Mode:          ${mode}${isFallback ? `  FALLBACK (configured: ${configured})` : ""}
Flowlet Timer: ${getFlowletDisplay(flowletTimerMs, mode)}${mode !== "per-packet" && flowletTimerMs >= 1000 ? "  WARNING: timer too long for AI workloads" : ""}
Load Std Dev:  ${stdDev}%${stdDev > 10 ? "  CRITICAL: target <5%" : "  OK"}

${isFallback
    ? "Note: AR reverted from per-packet to per-flowlet automatically.\nCheck host-side SuperNIC reorder buffer configuration."
    : "Note: AR is running in the intended mode. Continue with detail and benchmark checks to confirm balance."}`,
    conceptId: "adaptive-routing-mode-fallback",
    type: "info",
  }
}

export function handleShowAdaptiveRoutingDetail(): CommandResult {
  const { topology, setCondition } = useLabStore.getState()
  const t = toRecord(topology)
  setCondition("imbalanceIdentified", true)

  const mode = String(t.arMode ?? "per-flowlet")
  const flowletTimerMs = Number(t.flowletTimerMs ?? 1000)
  const stdDev = Number(t.arLoadStdDev ?? 28)
  const decisions = Number(t.arDecisions ?? 4821033)
  const redirects = Number(t.arRedirects ?? 12)
  const isHealthy = mode === "per-packet" && getOverallReorderState(t) && stdDev < 5

  return {
    output: `Adaptive Routing Detail
=======================
Global Enable:        on
Mode:                 ${mode}
Flowlet Timer:        ${getFlowletDisplay(flowletTimerMs, mode)}
ECMP Groups with AR:  8
Active ECMP Paths:    32
AR Decisions (total): ${decisions.toLocaleString()}
AR Redirects (total): ${redirects.toLocaleString()}
Redirect Rate:        ${redirects > 1000 ? "5.71" : "0.003"}%
Load Std Deviation:   ${stdDev}%   ${stdDev > 10 ? "CRITICAL (target: <5%)" : "OK"}

Spine utilization snapshot:
  spine-01: ${Number(t.spine01UtilPct ?? 22)}%
  spine-02: ${Number(t.spine02UtilPct ?? 91)}%${Number(t.spine02UtilPct ?? 91) > 80 ? "  OVERLOADED" : ""}
  spine-03: ${Number(t.spine03UtilPct ?? 20)}%
  spine-04: ${Number(t.spine04UtilPct ?? 19)}%

${isHealthy
    ? "Diagnosis: per-packet AR is active with BF3 reorder enabled. Traffic is distributing evenly across the spine layer."
    : `Diagnosis: flowlet timer ${getFlowletDisplay(flowletTimerMs, mode)} is excessive. AI training flows are
continuous - they never idle long enough to trigger a flowlet boundary.
Nearly all flows remain pinned to their initial spine.`}`,
    conceptId: "flowlet-timer-misconfiguration",
    type: stdDev > 10 ? "error" : "success",
  }
}

export function handleShowLeafInterfaceAdaptiveRouting(iface: "swp49" | "swp50" | "swp51" | "swp52"): CommandResult {
  const { topology } = useLabStore.getState()
  const t = toRecord(topology)
  const mode = String(t.arMode ?? "per-flowlet")
  const flowletTimerMs = Number(t.flowletTimerMs ?? 1000)
  const isFixed = mode === "per-packet" && getOverallReorderState(t)

  const spineMap = {
    swp49: { spine: "spine-01", utilPct: Number(t.spine01UtilPct ?? 22), peerPort: "12" },
    swp50: { spine: "spine-02", utilPct: Number(t.spine02UtilPct ?? 91), peerPort: "11" },
    swp51: { spine: "spine-03", utilPct: Number(t.spine03UtilPct ?? 20), peerPort: "13" },
    swp52: { spine: "spine-04", utilPct: Number(t.spine04UtilPct ?? 19), peerPort: "14" },
  }[iface]

  return {
    output: `Interface ${iface} Adaptive Routing
=====================================
Enable:              on
Mode:                ${mode}
Flowlet Timer:       ${getFlowletDisplay(flowletTimerMs, mode)}
Current Queue Depth: ${spineMap.utilPct > 50 ? Math.floor(spineMap.utilPct * 0.6) : Math.floor(spineMap.utilPct * 0.2)} KB
AR Decisions Today:  ${isFixed ? "4,821,033" : "1,204"}
Last AR Redirect:    ${isFixed ? "0.2ms ago" : "47.3s ago (near zero - flows not migrating)"}
Peer:                ${spineMap.spine} swp${spineMap.peerPort}
Port Utilization:    ${spineMap.utilPct}%`,
    type: spineMap.utilPct > 80 ? "error" : "info",
  }
}

export function handleShowResilientHash(): CommandResult {
  const { topology } = useLabStore.getState()
  const t = toRecord(topology)
  const isFixed = String(t.arMode ?? "per-flowlet") === "per-packet"

  return {
    output: `Resilient Hash
==============
Enable:   on
Buckets:  512
Current Utilization:
  spine-01: ${isFixed ? "127 buckets (24.8%)" : "42 buckets (8.2%)"}
  spine-02: ${isFixed ? "128 buckets (25.0%)" : "310 buckets (60.7%)  OVERLOADED"}
  spine-03: ${isFixed ? "129 buckets (25.2%)" : "88 buckets (17.2%)"}
  spine-04: ${isFixed ? "128 buckets (25.0%)" : "72 buckets (14.1%)"}`,
    type: isFixed ? "success" : "error",
  }
}

export function handleSetARModePerPacket(): CommandResult {
  const { topology, setCondition, setTopology } = useLabStore.getState()
  const t = toRecord(topology)

  if (!getOverallReorderState(t)) {
    return {
      output: `Error: cannot set AR mode to per-packet.

Pre-requisite check failed:
  BF3 SuperNIC reorder buffer: NOT ENABLED on cluster hosts

Spectrum-X requires all host NICs to have hardware reorder buffers
before per-packet AR can be activated. If per-packet AR is forced
without reorder buffers, OOO packet delivery will trigger RoCEv2
Go-Back-N NAK storms and collapse RDMA throughput.

Action required: enable BF3 SuperNIC reorder buffer on all DGX B200
hosts before switching to per-packet AR mode.

  On each DGX B200 host:
    nv set interface eth0 reorder-buffer enable
    nv set interface eth1 reorder-buffer enable
    nv config apply`,
      type: "error",
    }
  }

  setTopology({
    ...(topology as object),
    arMode: "per-packet",
    arModeConfigured: "per-packet",
    flowletTimerMs: 0,
    arLoadStdDev: 2,
    spine01UtilPct: 24,
    spine02UtilPct: 25,
    spine03UtilPct: 23,
    spine04UtilPct: 24,
    arDecisions: 4821033,
    arRedirects: 7332018,
  } as any)
  setCondition("flowletTimerFixed", true)

  return {
    output: `Setting adaptive-routing mode to per-packet...

Pre-requisite check:
  BF3 SuperNIC reorder buffer: ENABLED
  All hosts validated: 256/256 nodes responsive

adaptive-routing mode: per-packet
Applied.

Note: per-packet AR is now active. Each packet is independently
forwarded to the lowest-depth egress queue. Monitor Load Std Deviation
with: nv show router adaptive-routing detail`,
    conceptId: "ar-per-packet-mode",
    type: "success",
  }
}

export function handleSetARModePerFlowlet(): CommandResult {
  const { topology, setTopology } = useLabStore.getState()
  setTopology({
    ...(topology as object),
    arMode: "per-flowlet",
    arModeConfigured: "per-flowlet",
  } as any)

  return {
    output: `Setting adaptive-routing mode to per-flowlet...

adaptive-routing mode: per-flowlet
Applied.

Note: per-flowlet AR is compatible with ConnectX-7 HCAs (DGX H100/H200).
Ensure flowlet-timer is set to 100us for AI training workloads:
  nv set router adaptive-routing flowlet-timer 100us`,
    type: "info",
  }
}

export function handleSetFlowletTimer(timer: "100us" | "1s"): CommandResult {
  const { topology, setTopology } = useLabStore.getState()
  const t = toRecord(topology)
  const isShort = timer === "100us"

  setTopology({
    ...(topology as object),
    flowletTimerMs: isShort ? 100 : 1000,
    arLoadStdDev: isShort ? (getOverallReorderState(t) ? 2 : 4) : 28,
    arRedirects: isShort ? 7332018 : 12,
  } as any)

  return {
    output: `Setting adaptive-routing flowlet-timer to ${timer}...

adaptive-routing flowlet-timer: ${timer}
Applied.

${isShort
    ? "100us flowlet timer is correct for AI training collectives.\nFlows will re-evaluate spine assignment after short idle gaps."
    : "WARNING: 1s flowlet timer is too long for AI collective flows.\nTraining flows rarely idle for 1 second, so most flows never re-evaluate path selection."}`,
    type: isShort ? "success" : "error",
  }
}

export function handleLab19NvConfigApply(): CommandResult {
  return {
    output: `Applying configuration...

  Verification:  OK
  Commit:        OK
  Activate:      OK

Configuration applied successfully.`,
    type: "success",
  }
}

export function handleShowQosRoce(): CommandResult {
  return {
    output: `RoCE QoS Profile
=================
Profile:           roce-lossless
DSCP 26 -> TC3:    PFC enabled, ECN enabled
DSCP 48 -> TC6:    strict priority, no PFC (CNP)
ECN Min Threshold: 150KB
ECN Max Threshold: 1500KB
PFC Watchdog:      200ms, drop mode

Status: RoCE QoS profile is unchanged - AR does not modify QoS config.`,
    type: "success",
  }
}

export function handleShowSpineInterfaceAdaptiveRouting(iface: "swp1" | "swp2" | "swp3" | "swp4"): CommandResult {
  const { topology } = useLabStore.getState()
  const t = toRecord(topology)
  const isFixed = String(t.arMode ?? "per-flowlet") === "per-packet" && getOverallReorderState(t)
  const ifaceNum = Number(iface.replace("swp", ""))
  const fixedQueueDepths: Record<number, number> = { 1: 18, 2: 17, 3: 19, 4: 16 }
  const brokenQueueDepths: Record<number, number> = { 1: 78, 2: 74, 3: 12, 4: 10 }

  return {
    output: `Interface ${iface} Adaptive Routing
=====================================
Enable:              on
Mode:                ${String(t.arMode ?? "per-flowlet")}
Current Queue Depth: ${isFixed ? fixedQueueDepths[ifaceNum] : brokenQueueDepths[ifaceNum]} KB
AR Decisions Today:  ${isFixed ? "2,410,518" : "3"}
Last AR Redirect:    ${isFixed ? "0.1ms ago" : "N/A - no redirects (all flows on this spine)"}
Peer:                leaf-0${ifaceNum} swp${50 + ifaceNum - 1}`,
    type: isFixed ? "success" : "info",
  }
}

export function handleSpineNetShowCounters(): CommandResult {
  const { topology } = useLabStore.getState()
  const t = toRecord(topology)
  const isFixed = String(t.arMode ?? "per-flowlet") === "per-packet"

  return {
    output: `Interface   RX-Pkts        TX-Pkts        RX-Bytes       TX-Bytes       Util
---------------------------------------------------------------------------
swp1       ${isFixed ? "48,221,003" : "192,884,012"}     ${isFixed ? "47,994,221" : "191,334,009"}     ${isFixed ? "19.2 GB" : "76.8 GB"}        ${isFixed ? "19.1 GB" : "76.2 GB"}        ${isFixed ? "62%" : "91%  OVERLOADED"}
swp2       ${isFixed ? "47,103,441" : "8,441,220"}       ${isFixed ? "47,002,118" : "8,201,118"}       ${isFixed ? "18.8 GB" : "3.4 GB"}         ${isFixed ? "18.7 GB" : "3.3 GB"}         ${isFixed ? "60%" : "22%"}
swp3       ${isFixed ? "49,001,228" : "8,998,003"}       ${isFixed ? "48,882,003" : "8,771,004"}       ${isFixed ? "19.5 GB" : "3.6 GB"}         ${isFixed ? "19.4 GB" : "3.5 GB"}         ${isFixed ? "62%" : "24%"}
swp4       ${isFixed ? "46,772,009" : "7,220,110"}       ${isFixed ? "46,551,220" : "7,008,991"}       ${isFixed ? "18.6 GB" : "2.9 GB"}         ${isFixed ? "18.5 GB" : "2.8 GB"}         ${isFixed ? "59%" : "19%"}`,
    type: isFixed ? "success" : "error",
  }
}

export function handleMlxlinkShowReorder(): CommandResult {
  const { topology, setCondition } = useLabStore.getState()
  const t = toRecord(topology)
  setCondition("supernicReorderChecked", true)

  return {
    output: `Device /dev/mst/mt41692_pciconf0
Device Type:          BlueField-3
Part Number:          MBF3H516A-EEEOT
Reorder Buffer:       ${getOverallReorderState(t) ? "Enabled" : "Disabled"}
Reorder Buffer Depth: ${getOverallReorderState(t) ? "256 KB" : "N/A"}
SuperNIC Mode:        ${getOverallReorderState(t) ? "Active" : "Active (reorder disabled)"}
Firmware Version:     32.38.1002

${getOverallReorderState(t) ? "Status: host-side reorder is ready for per-packet AR." : "Warning: BF3 reorder buffer is not enabled. Per-packet AR requires reorder on all host interfaces."}`,
    type: getOverallReorderState(t) ? "success" : "error",
  }
}

export function handleMlxconfigQueryReorderSize(): CommandResult {
  const { topology } = useLabStore.getState()
  const t = toRecord(topology)

  return {
    output: `Device #1:
-----------
Device type:    BlueField-3
Device:         /dev/mst/mt41692_pciconf0
Configurations:
  ROCE_REORDER_BUFFER_SIZE    ${getOverallReorderState(t) ? "256" : "0"}${getOverallReorderState(t) ? "" : "  disabled (0 = not configured)"}`,
    type: getOverallReorderState(t) ? "success" : "info",
  }
}

export function handleShowReorderBuffer(iface: "eth0" | "eth1"): CommandResult {
  const { topology, setCondition } = useLabStore.getState()
  const t = toRecord(topology)
  const enabled = getReorderState(t, iface)
  setCondition("supernicReorderChecked", true)

  return {
    output: `Interface ${iface} Reorder Buffer
================================
Enable:   ${enabled ? "on" : "off"}${enabled ? "" : "  NOT ENABLED - blocks per-packet AR"}
Depth:    ${enabled ? "256 KB" : "N/A"}
Status:   ${enabled ? "Active" : "Inactive"}`,
    type: enabled ? "success" : "error",
  }
}

export function handleSetReorderBufferEnable(iface: "eth0" | "eth1"): CommandResult {
  const { topology, setTopology } = useLabStore.getState()
  const t = toRecord(topology)
  const eth0Enabled = iface === "eth0" ? true : Boolean(t.supernicReorderEth0Enabled)
  const eth1Enabled = iface === "eth1" ? true : Boolean(t.supernicReorderEth1Enabled)

  setTopology({
    ...(topology as object),
    supernicReorderEth0Enabled: eth0Enabled,
    supernicReorderEth1Enabled: eth1Enabled,
    supernicReorderEnabled: eth0Enabled && eth1Enabled,
  } as any)

  return {
    output: `Setting interface ${iface} reorder-buffer enable...
OK`,
    type: "success",
  }
}

export function handleDgxNvConfigApply(): CommandResult {
  const { topology, setCondition, setTopology } = useLabStore.getState()
  const t = toRecord(topology)
  const eth0Enabled = Boolean(t.supernicReorderEth0Enabled)
  const eth1Enabled = Boolean(t.supernicReorderEth1Enabled)

  if (eth0Enabled && eth1Enabled) {
    setTopology({
      ...(topology as object),
      supernicReorderEnabled: true,
    } as any)
    setCondition("supernicReorderEnabled", true)

    return {
      output: `Applying configuration...

  Verification:  OK
  Commit:        OK
  Activate:      OK

BF3 reorder buffer activated on eth0 and eth1.
ROCE_REORDER_BUFFER_SIZE set to 256 KB on both ports.
Configuration applied successfully.

Next step: set AR mode to per-packet on the fabric.`,
      type: "success",
    }
  }

  return {
    output: `Applying configuration...

  Verification:  OK
  Commit:        OK
  Activate:      OK

Configuration applied.

Warning: both BF3 uplinks must have reorder enabled before per-packet AR can be activated.`,
    type: "info",
  }
}

export function handleIbWriteBw(): CommandResult {
  const { topology, setCondition } = useLabStore.getState()
  const t = toRecord(topology)
  const isFixed = String(t.arMode ?? "per-flowlet") === "per-packet" && getOverallReorderState(t)
  const bandwidth = isFixed ? 48.3 : 34.7

  if (isFixed) {
    setCondition("balanceVerified", true)
  }

  return {
    output: `------------------------------------------------------------------
                    RDMA_Write BW Test
 Dual-port       : OFF    Device         : mlx5_0
 Number of qps   : 16     Transport type : IB
 Connection type : RC     Using SRQ      : OFF
 TX depth        : 128
 CQ Moderation   : 1
 Mtu             : 4096[B]
 Link type       : Ethernet
 GID index       : 3
 Max inline data : 0[B]
 rdma_cm QPs     : OFF
 Data ex. method : Ethernet
------------------------------------------------------------------
 local address: LID 0000 QPN 0x00e0 PSN 0x7bcc8d
 GID: 00:00:00:00:00:00:00:00:00:00:ff:ff:0a:64:00:01
 remote address: LID 0000 QPN 0x00e2 PSN 0x3b44a1
 GID: 00:00:00:00:00:00:00:00:00:00:ff:ff:0a:64:01:02
------------------------------------------------------------------
 #bytes     #iterations    BW peak[GB/sec]    BW average[GB/sec]
 65536      1000            ${bandwidth.toFixed(2)}              ${(bandwidth - 0.4).toFixed(2)}
------------------------------------------------------------------

CloudAI all-reduce benchmark: ${bandwidth.toFixed(1)} GB/s - ${isFixed ? "PASS (>= 46.5 GB/s)" : "FAIL (< 46.5 GB/s)"}
${isFixed ? "\nOK: AR per-packet mode active. Spine utilization equalized." : "\nWarning: AR is not functioning correctly. Fix SuperNIC reorder plus AR mode first."}`,
    type: isFixed ? "success" : "error",
  }
}
