import type { CommandResult } from "@/types"
import { useLabStore } from "@/store/labStore"

export function handleLab18ShowEcnProfile(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const t = topology as any
  const minT = t.ecnMinThreshold ?? 10485760
  const maxT = t.ecnMaxThreshold ?? 31457280
  setCondition("thresholdInspected", true)
  markVerified("thresholdInspected")
  return {
    output: `Profile: roce
  Min Threshold:  ${minT} bytes (${(minT / (1024 * 1024)).toFixed(1)} MB)  ${minT > 6291456 ? '<- EXCEEDS TC3 buffer capacity!' : 'v'}
  Max Threshold:  ${maxT} bytes (${(maxT / (1024 * 1024)).toFixed(1)} MB)  ${maxT > 6291456 ? '<- EXCEEDS TC3 buffer capacity!' : 'v'}
  Mark Probability: linear
  Mode: ECN only (no drops)
  Applied to:     TC3 egress on all RoCE interfaces`,
    type: minT > 6291456 ? "error" : "success",
  }
}

export function handleLab18ClResourceQuery(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const t = topology as any
  const minT = t.ecnMinThreshold ?? 10485760
  const losslessBuffer = t.losslessBufferBytes ?? 6291456
  const problemVisible = minT > losslessBuffer
  if (problemVisible) {
    setCondition("problemIdentified", true)
    markVerified("problemIdentified")
  }
  return {
    output: `TCAM and Buffer Resources:
  Per-port buffer headroom (TC3, lossless):
    swp1: headroom=98304 bytes  xoff=81920  xon=32768
  Total lossless buffer carved: ${losslessBuffer} bytes (6 MB)
  Lossy buffer remaining: 41943040 bytes (40 MB)

  ECN Profile: roce
    min-threshold: ${minT} bytes (${(minT / (1024 * 1024)).toFixed(1)} MB)${problemVisible ? '  <- EXCEEDS lossless buffer (6 MB) â€” ECN will NEVER fire' : ''}
    max-threshold: ${t.ecnMaxThreshold ?? 31457280} bytes (${((t.ecnMaxThreshold ?? 31457280) / (1024 * 1024)).toFixed(1)} MB)${problemVisible ? '  <- EXCEEDS lossless buffer (6 MB)' : ''}`,
    type: problemVisible ? "error" : "success",
  }
}

export function handleLab18SetEcnMin(): CommandResult {
  const { topology, setTopology } = useLabStore.getState()
  setTopology({ ...(topology as object), ecnMinThreshold: 500000 } as any)
  return { output: `Staged: qos ecn profile roce min-threshold 500000\nRun 'nv config apply' to commit.`, type: "success" }
}

export function handleLab18SetEcnMax(): CommandResult {
  const { topology, setTopology } = useLabStore.getState()
  setTopology({ ...(topology as object), ecnMaxThreshold: 1500000 } as any)
  return { output: `Staged: qos ecn profile roce max-threshold 1500000\nRun 'nv config apply' to commit.`, type: "success" }
}

export function handleLab18ConfigApply(): CommandResult {
  const { topology, setTopology, setCondition, markVerified } = useLabStore.getState()
  const t = topology as any
  const minT = t.ecnMinThreshold ?? 10485760
  if (minT <= 500000 && (t.ecnMaxThreshold ?? 31457280) >= 1500000) {
    setTopology({ ...(topology as object), thresholdFixed: true, ecnMarkingActive: true, configApplied: true } as any)
    setCondition("thresholdFixed", true)
    markVerified("thresholdFixed")
  }
  return {
    output: `Applying configuration...
  Validating ECN thresholds... ${minT <= 6291456 ? 'OK' : 'WARNING: may exceed buffer'}
  Pushing to Spectrum-4 ASIC... OK
  ECN profile 'roce' updated on TC3 egress... OK
Configuration applied successfully.`,
    type: "success",
  }
}

export function handleLab18EthtoolSwp1Ecn(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const marking = (topology as any).ecnMarkingActive && (topology as any).thresholdFixed
  if (marking) {
    setCondition("ecnMarkingVerified", true)
    markVerified("ecnMarkingVerified")
  }
  return {
    output: `  tx_ecn_marked_pkts:   ${marking ? 4829384 : 0}${marking ? '  <- ECN active, DCQCN engaged v' : '  <- WARNING: ECN not marking. Fix thresholds first.'}
  rx_ecn_ce_pkts:       0`,
    type: marking ? "success" : "error",
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

export function handleLab18IbWriteBwMulti(): CommandResult {
  const fixed = (useLabStore.getState().topology as any).thresholdFixed ?? false
  const bw = fixed ? 46.81 : 12.34
  return {
    output: `[1] ib_write_bw started on mlx5_0
[2] ib_write_bw started on mlx5_1
[3] ib_write_bw started on mlx5_2
[4] ib_write_bw started on mlx5_3

Generating multi-flow congestion...
[Check leaf-01: ethtool -S swp1 | grep ecn]

Per-flow BW:
  mlx5_0: ${bw} GB/s
  mlx5_1: ${bw} GB/s
  mlx5_2: ${bw} GB/s
  mlx5_3: ${bw} GB/s
Total: ${(bw * 4).toFixed(1)} GB/s ${!fixed ? '<- degraded: PFC-only congestion control' : '<- DCQCN stabilizing all flows v'}`,
    type: fixed ? "success" : "error",
  }
}
