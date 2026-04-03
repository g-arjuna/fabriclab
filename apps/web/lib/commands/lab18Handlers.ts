import type { CommandResult } from "@/types"
import { useLabStore } from "@/store/labStore"

const DEFAULT_ROCE_EGRESS_POOL_BYTES = 6291456

function getThresholds(): { minThreshold: number; maxThreshold: number } {
  const topology = useLabStore.getState().topology as any
  return {
    minThreshold: topology.ecnMinThreshold ?? 10485760,
    maxThreshold: topology.ecnMaxThreshold ?? 31457280,
  }
}

function getRoceEgressPoolBytes(): number {
  const topology = useLabStore.getState().topology as any
  return topology.losslessBufferBytes ?? DEFAULT_ROCE_EGRESS_POOL_BYTES
}

function formatBytes(value: number): string {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MB`
  }
  return `${(value / 1024).toFixed(2)} KB`
}

export function handleLab18ShowEcnProfile(): CommandResult {
  const { setCondition, markVerified } = useLabStore.getState()
  const { minThreshold, maxThreshold } = getThresholds()
  const rocePoolBytes = getRoceEgressPoolBytes()
  const exceedsPool = minThreshold > rocePoolBytes

  setCondition("thresholdInspected", true)
  markVerified("thresholdInspected")

  return {
    output: `Interface swp1
  congestion-control
    operational  applied
    -----------  -------
    ecn          enabled      enabled
    min-threshold ${minThreshold} bytes (${formatBytes(minThreshold)})
    max-threshold ${maxThreshold} bytes (${formatBytes(maxThreshold)})
    probability   100

${exceedsPool ? "Warning: TC3 ECN min-threshold is above the swp1 RoCE egress pool size." : "ECN thresholds are inside the swp1 RoCE egress pool budget."}`,
    type: exceedsPool ? "error" : "success",
  }
}

export function handleLab18ShowPoolMap(): CommandResult {
  const { setCondition, markVerified } = useLabStore.getState()
  const { minThreshold } = getThresholds()
  const rocePoolBytes = getRoceEgressPoolBytes()
  const problemVisible = minThreshold > rocePoolBytes

  if (problemVisible) {
    setCondition("problemIdentified", true)
    markVerified("problemIdentified")
  }

  return {
    output: `Interface: swp1
---------------------------------------------------------------------
name                   mode      pool-id  traffic-class  size
---------------------  --------  -------  -------------  --------
lossy-default-ingress  DYNAMIC   2        -              40.00 MB
roce-reserved-ingress  DYNAMIC   3        -              ${formatBytes(rocePoolBytes)}
lossy-default-egress   DYNAMIC   13       0,6            40.00 MB
roce-reserved-egress   DYNAMIC   14       3              ${formatBytes(rocePoolBytes)}

${problemVisible ? `Problem: ECN min-threshold ${minThreshold} bytes is larger than the TC3 RoCE egress pool ${rocePoolBytes} bytes.` : "RoCE TC3 ECN thresholds now fit within the egress pool."}`,
    type: problemVisible ? "error" : "success",
  }
}

export function handleLab18ClResourceQuery(): CommandResult {
  return {
    output:
      "Use `nv show interface swp1 qos roce status pool-map` for RoCE pool sizing in this lab. `cl-resource-query` reports ASIC resource usage, not per-queue ECN thresholds.",
    type: "info",
  }
}

export function handleLab18SetEcnMin(): CommandResult {
  const { topology, setTopology } = useLabStore.getState()

  setTopology({
    ...(topology as object),
    ecnMinThreshold: 500000,
  } as any)

  return {
    output:
      "Staged: nv set qos congestion-control default-global traffic-class 3 min-threshold 500000\nRun `nv config apply` to commit.",
    type: "success",
  }
}

export function handleLab18SetEcnMax(): CommandResult {
  const { topology, setTopology } = useLabStore.getState()

  setTopology({
    ...(topology as object),
    ecnMaxThreshold: 1500000,
  } as any)

  return {
    output:
      "Staged: nv set qos congestion-control default-global traffic-class 3 max-threshold 1500000\nRun `nv config apply` to commit.",
    type: "success",
  }
}

export function handleLab18ConfigApply(): CommandResult {
  const { topology, setTopology, setCondition, markVerified } = useLabStore.getState()
  const { minThreshold, maxThreshold } = getThresholds()
  const rocePoolBytes = getRoceEgressPoolBytes()
  const thresholdFixed = minThreshold <= 500000 && maxThreshold >= 1500000

  setTopology({
    ...(topology as object),
    thresholdFixed,
    ecnMarkingActive: thresholdFixed,
    configApplied: true,
  } as any)

  if (thresholdFixed) {
    setCondition("thresholdFixed", true)
    markVerified("thresholdFixed")
  }

  return {
    output: `Applying configuration...
  Validating ECN thresholds for TC3... ${minThreshold <= rocePoolBytes ? "OK" : "WARNING: min-threshold still exceeds the RoCE egress pool"}
  Programming Spectrum-4 congestion-control profile... OK
Configuration applied successfully.`,
    type: thresholdFixed ? "success" : "error",
  }
}

export function handleLab18ShowRoceCounters(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const t = topology as any
  const startedFlows = new Set<string>(t.lab18StartedFlows ?? [])
  const markingActive = Boolean(t.ecnMarkingActive && t.thresholdFixed && startedFlows.size > 0)
  const ecnMarkedPackets = markingActive ? 4829384 : 0
  const pausePackets = markingActive ? 184 : 92144

  if (markingActive) {
    setCondition("ecnMarkingVerified", true)
    markVerified("ecnMarkingVerified")
  }

  return {
    output: `Interface: swp1
-----------------------------
rx-stats
  rx-pfc-stats
    pause-packets      0
  rx-roce-stats
    roce-packets       18429384
    no-buffer-discard  0
tx-stats
  tx-pfc-stats
    pause-packets      ${pausePackets}
  tx-ecn-stats
    ecn-marked-packets ${ecnMarkedPackets}

${markingActive ? "ECN marks are rising and PFC pause pressure is dropping." : "ECN marks are still zero. Recheck TC3 thresholds and make sure at least one ib_write_bw stream is running."}`,
    type: markingActive ? "success" : "error",
  }
}

export function handleLab18EthtoolSwp1Ecn(): CommandResult {
  return handleLab18ShowRoceCounters()
}

export function handleLab18ShowPfcCounters(): CommandResult {
  const thresholdFixed = Boolean((useLabStore.getState().topology as any).thresholdFixed)

  return {
    output: `switch-priority  rx-pause-frames  rx-pause-duration  tx-pause-frames  tx-pause-duration
---------------  ---------------  -----------------  ---------------  -----------------
0                0                0 Bytes            0                0 Bytes
1                0                0 Bytes            0                0 Bytes
2                0                0 Bytes            0                0 Bytes
3                0                0 Bytes            ${thresholdFixed ? "184" : "92144"}           ${thresholdFixed ? "36.0 KB" : "219.8 MB"}
4                0                0 Bytes            0                0 Bytes
5                0                0 Bytes            0                0 Bytes
6                0                0 Bytes            0                0 Bytes
7                0                0 Bytes            0                0 Bytes`,
    type: thresholdFixed ? "success" : "error",
  }
}

export function handleLab18ShowInterfaceCounters(): CommandResult {
  return {
    output: `Interface swp1 counters:
  tx_unicast_packets:  14829384
  rx_unicast_packets:  14827291
  tx_bytes:            9748392931
  rx_bytes:            9746841827
  tx_errors:           0
  rx_errors:           0`,
    type: "success",
  }
}

export function handleLab18IbWriteBwMulti(adapterName = "mlx5_0"): CommandResult {
  const { topology, setTopology } = useLabStore.getState()
  const t = topology as any
  const startedFlows = Array.from(new Set([...(t.lab18StartedFlows ?? []), adapterName])).sort()
  const bw = t.thresholdFixed ? 46.81 : 12.34

  setTopology({
    ...(topology as object),
    lab18StartedFlows: startedFlows,
  } as any)

  return {
    output: `[${startedFlows.length}] ib_write_bw started on ${adapterName}
Command running in the background: ib_write_bw -d ${adapterName} --iters 10000 --size 65536 192.168.100.2

Per-flow BW estimate:
  ${adapterName}: ${bw} GB/s

Active load generators: ${startedFlows.join(", ")}
Switch check: nv show interface swp1 qos roce counters`,
    type: t.thresholdFixed ? "success" : "info",
  }
}
