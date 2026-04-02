import type { CommandResult } from "@/types"
import { useLabStore } from "@/store/labStore"

export function handleNvSetRoce(): CommandResult {
  const { topology, setTopology, setCondition } = useLabStore.getState()
  setTopology({
    ...(topology as object),
    roceShorthandApplied: true,
    pfcEnabled: true,
    ecnEnabled: true,
    ecnMinThreshold: 500000,
    ecnMaxThreshold: 1500000,
  } as any)
  setCondition("roceShorthandApplied", true)
  return {
    output: `Applied qos roce profile to swp1-32:
  DSCP trust: enabled
  DSCP 26 -> TC3 (lossless, PFC priority 3, ECN enabled)
  DSCP 48 -> TC6 (SP, PFC disabled)
  ECN min-threshold: 500000 bytes
  ECN max-threshold: 1500000 bytes
  PFC priority 3: enabled
  PFC watchdog: 200ms, drop mode
Configuration staged. Run 'nv config apply' to commit.`,
    type: "success",
  }
}

export function handleNvConfigApply(): CommandResult {
  const { topology, setTopology } = useLabStore.getState()
  const t = topology as any
  if (!t.roceShorthandApplied) {
    return { output: `No staged configuration to apply.`, type: "error" }
  }
  setTopology({ ...(topology as object), configApplied: true } as any)
  return {
    output: `Applying configuration...
  Validating against hardware constraints... OK
  Pushing to Spectrum-4 ASIC... OK
  TC3 lossless queue armed with PFC headroom... OK
  ECN profile 'roce' applied to TC3 egress... OK
Configuration applied successfully.`,
    type: "success",
  }
}

export function handleNvConfigSave(): CommandResult {
  const { topology } = useLabStore.getState()
  if (!(topology as any).configApplied) {
    return { output: `Warning: No applied configuration to save. Run 'nv config apply' first.`, type: "error" }
  }
  return {
    output: `Configuration saved to /etc/nvue.d/startup.yaml
  Startup config updated at: Thu Jan 15 09:42:17 UTC 2024
  Config will persist across reboots.`,
    type: "success",
  }
}

export function handleNvShowQosRoce(): CommandResult {
  if (!(useLabStore.getState().topology as any).roceShorthandApplied) {
    return {
      output: `                    operational  applied
------------------  -----------  -------
enable              off          off
roce-mode           -            -

RoCE not configured. Run: nv set interface swp1-32 qos roce`,
      type: "info",
    }
  }
  return {
    output: `                    operational  applied
------------------  -----------  -------
enable              on           on
roce-mode           lossy        lossy`,
    type: "success",
  }
}

export function handleNvShowInterfaceQos(): CommandResult {
  if (!(useLabStore.getState().topology as any).roceShorthandApplied) {
    return {
      output: `QoS Interface swp1
  Trust:  none (default â€” all traffic lands in TC0)
  TC0  DSCP:all  Mode: DWRR  Weight:16  PFC:off  ECN:off

Warning: DSCP trust not configured.`,
      type: "info",
    }
  }
  return {
    output: `QoS Interface swp1
  Trust:  dscp
  Traffic Class Summary:
    TC0  DSCP:0-25,27-47,49-63  Mode: DWRR  Weight:16  PFC:off  ECN:off  Lossless:no
    TC3  DSCP:26               Mode: SP     PFC:on    ECN:on   Lossless:yes
    TC6  DSCP:48               Mode: SP     PFC:off   ECN:off  Lossless:no`,
    type: "success",
  }
}

export function handleNvShowQosTrustDscpMap(): CommandResult {
  const { setCondition, markVerified } = useLabStore.getState()
  if (!(useLabStore.getState().topology as any).roceShorthandApplied) {
    return {
      output: `DSCP  TC   Description
----  ---  -----------
0-63  0    Default (DSCP trust not enabled)

Run: nv set interface swp1-32 qos roce`,
      type: "info",
    }
  }
  setCondition("dscpTrustVerified", true)
  markVerified("dscpTrustVerified")
  return {
    output: `DSCP  TC   Description
----  ---  -----------
26    3    RoCEv2 training traffic (lossless)
48    6    Congestion Notification Packet (SP)
46    5    NCCL high-priority collectives
10    1    Checkpoint-to-storage
0-9   0    Default lossy`,
    conceptId: "dscp-trust-map",
    type: "success",
  }
}

export function handleNvShowQosEcnProfile(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const t = topology as any
  const minT = t.ecnMinThreshold ?? 500000
  const maxT = t.ecnMaxThreshold ?? 1500000
  setCondition("ecnThresholdsVerified", true)
  markVerified("ecnThresholdsVerified")
  return {
    output: `Profile: roce
  Min Threshold:  ${minT} bytes (${Math.round(minT / 1024)} KB)
  Max Threshold:  ${maxT} bytes (${Math.round(maxT / 1024)} KB)
  Mark Probability: linear
  Mode: ECN only (no drops)
  Applied to:     TC3 egress on all RoCE interfaces`,
    conceptId: "ecn-thresholds",
    type: "success",
  }
}

export function handleNvShowQosPfc(): CommandResult {
  const { setCondition, markVerified } = useLabStore.getState()
  if (!(useLabStore.getState().topology as any).pfcEnabled) {
    return { output: `PFC Configuration:\n  Priority 0-7:  all disabled (default)\n\nPFC not configured. Run: nv set interface swp1-32 qos roce`, type: "info" }
  }
  setCondition("pfcConfigVerified", true)
  markVerified("pfcConfigVerified")
  return {
    output: `PFC Configuration:
  Priority 0:  disabled
  Priority 1:  disabled
  Priority 2:  disabled
  Priority 3:  ENABLED  (lossless â€” RoCEv2 training traffic)
  Priority 4:  disabled
  Priority 5:  disabled
  Priority 6:  disabled  (TC6 is SP, but NOT PFC-paused â€” CNP must flow freely)
  Priority 7:  disabled
  Watchdog:    200ms, drop mode`,
    conceptId: "pfc-priority-3",
    type: "success",
  }
}

export function handleNvShowQosScheduler(): CommandResult {
  if (!(useLabStore.getState().topology as any).roceShorthandApplied) {
    return { output: `TC   Discipline  Weight  Priority\n---  ----------  ------  --------\n0    DWRR        16      -\n(All other TCs using default lossy scheduling)`, type: "info" }
  }
  return {
    output: `TC   Discipline  Weight  Priority
---  ----------  ------  --------
0    DWRR        16      -
1    DWRR        8       -
3    SP          -       2  (lossless, PFC-protected)
5    DWRR        32      -
6    SP          -       3  (highest â€” CNP, never paused)`,
    type: "success",
  }
}

export function handleClResourceQuery(): CommandResult {
  return {
    output: `TCAM Resource Usage:
  ACL entries:     1024 / 16384 (6.25%)
  QoS entries:     48   / 512   (9.37%)
  DSCP map:        8    / 64    (12.5%)
  Forwarding:      2048 / 32768 (6.25%)

Per-port buffer headroom (TC3, lossless):
  swp1:  headroom=98304 bytes  xoff=81920  xon=32768
  [swp2-swp32: same as swp1]

Total lossless buffer carved: 6291456 bytes (6 MB)
Lossy buffer remaining: 41943040 bytes (40 MB)
Total Spectrum-4 buffer: 50331648 bytes (48 MB)

ECN Profile: roce
  min-threshold: 500000 bytes (488 KB)  <- within lossless budget v
  max-threshold: 1500000 bytes (1.46 MB)  <- within lossless budget v`,
    type: "success",
  }
}

export function handleNvShowInterfaceCountersPfc(): CommandResult {
  const t = useLabStore.getState().topology as any
  const watchdogFires = t.ecnEnabled ? 0 : 3
  const pfcTx = t.ecnEnabled ? 142 : 84291
  return {
    output: `Interface swp1 PFC Counters:
  Priority 3:
    TX pause frames:       ${pfcTx}
    RX pause frames:       0
    Pause duration (ms):   ${t.ecnEnabled ? '12.4 avg / 38.1 max' : '198.1 avg / 200.0 max'}
    Watchdog fires:        ${watchdogFires}
  Priority 0,1,2,4,5,6,7: not enabled`,
    type: watchdogFires > 0 ? "error" : "success",
  }
}

export function handleEthtoolSwp1Ecn(): CommandResult {
  const t = useLabStore.getState().topology as any
  const marked = t.ecnEnabled && t.configApplied ? 2847392 : 0
  return {
    output: `  tx_ecn_marked_pkts:     ${marked}${marked === 0 ? '  <- WARNING: ECN not marking. Check thresholds and DSCP trust.' : '  <- ECN active, DCQCN engaged v'}
  rx_ecn_ce_pkts:         0`,
    type: marked === 0 ? "error" : "success",
  }
}

export function handleIbWriteBw(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const t = topology as any
  const bw = (t.mtu ?? 1500) >= 9000 && (t.pfcEnabled ?? false) ? 46.81 : 12.21
  if (bw >= 46) {
    setCondition("bwVerified", true)
    markVerified("bwVerified")
  }
  return {
    output: `-------------------------------------------------------------------
                    RDMA_Write BW Test
-------------------------------------------------------------------
 #bytes     #iterations    BW peak[GB/sec]    BW average[GB/sec]
 65536      5000           ${bw === 46.81 ? '46.92' : '12.34'}              ${bw}
-------------------------------------------------------------------${bw < 40 ? '\n\nWARNING: BW well below expected 46.8 GB/s.\nLikely cause: MTU mismatch.\nCheck: ip link show eth0 | grep mtu  (expect: mtu 9000)' : ''}`,
    conceptId: "ib-write-bw",
    type: bw >= 46 ? "success" : "error",
  }
}

export function handleIbWriteLat(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const t = topology as any
  const p99 = (t.pfcEnabled ?? false) && (t.ecnEnabled ?? false) ? 1.19 : 38.47
  if (p99 <= 2) {
    setCondition("latencyVerified", true)
    markVerified("latencyVerified")
  }
  return {
    output: `-------------------------------------------------------------------
                    RDMA_Write Latency Test
-------------------------------------------------------------------
 #bytes #iters  t_min[usec]  t_max[usec]  t_typical[usec]  t_99p[usec]
 2       10000   0.81         ${p99 <= 2 ? '4.23' : '84.21'}         0.87             ${p99}
-------------------------------------------------------------------${p99 > 2 ? '\n\nWARNING: p99 latency far exceeds 2us target.\nCheck: nv show interface swp1 counters pfc (on leaf switch)' : ''}`,
    conceptId: "ib-write-lat",
    type: p99 <= 2 ? "success" : "error",
  }
}

export function handleIbvDevinfo(): CommandResult {
  const mtu = (useLabStore.getState().topology as any).mtu ?? 1500
  const mtuCode = mtu >= 9000 ? 4096 : 512
  return {
    output: `hca_id: mlx5_0
  fw_ver:                 28.39.1002
  node_guid:              0c42:a103:0004:3e80
  vendor_id:              0x02c9
  vendor_part_id:         4129
  phys_port_cnt:          1
  port:   1
    state:              PORT_ACTIVE (4)
    max_mtu:            4096 (5)
    active_mtu:         ${mtuCode} ${mtu >= 9000 ? '(5)' : '(3)'}${mtuCode < 4096 ? '  <- MTU mismatch! Fix: ip link set eth0 mtu 9000' : '  v'}
    link_layer:         Ethernet
    active_speed:       400 Gb/sec
    active_width:       4X`,
    type: mtuCode >= 4096 ? "success" : "error",
  }
}

export function handleIbvRcPingpong(): CommandResult {
  if (!(useLabStore.getState().topology as any).pfcEnabled) {
    return { output: `ibv_rc_pingpong: failed to modify QP to RTR\n  Hint: Check MTU negotiation.`, type: "error" }
  }
  return { output: `  local address:  LID 0x0000, QPN 0x000087, PSN 0xac3e8c\n  remote address: LID 0x0000, QPN 0x000087, PSN 0x9f2a41\n8192000 bytes in 0.003 seconds = 24530.27 Mbit/sec`, type: "success" }
}

export function handleIpLinkShow(): CommandResult {
  const mtu = (useLabStore.getState().topology as any).mtu ?? 1500
  return {
    output: `2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu ${mtu} qdisc mq state UP mode DEFAULT group default qlen 1000\n    link/ether 0c:42:a1:03:3e:80 brd ff:ff:ff:ff:ff:ff${mtu < 9000 ? '\n\nWARNING: MTU is ' + mtu + '. RoCEv2 requires MTU 9000. Fix: ip link set eth0 mtu 9000' : ''}`,
    type: mtu >= 9000 ? "success" : "error",
  }
}

export function handleEthtoolMlx5Grep(): CommandResult {
  const t = useLabStore.getState().topology as any
  const ecnMarked = t.ecnEnabled && t.configApplied ? 2847392 : 0
  const pfcXoff = t.ecnEnabled ? 142 : 284739
  const pfcXon = t.ecnEnabled ? 142 : 284716
  const retry = t.ecnEnabled ? 0 : 8821
  return {
    output: `  tx_ecn_marked_pkts:              ${ecnMarked}${ecnMarked === 0 ? '  <- PROBLEM: ECN not marking under load' : '  <- DCQCN engaged v'}
  rx_pfc_xon_frames_priority_3:   ${pfcXon}${pfcXon > 1000 ? '  <- HIGH: PFC firing frequently' : ''}
  rx_pfc_xoff_frames_priority_3:  ${pfcXoff}${pfcXoff > 1000 ? '  <- HIGH: PFC firing frequently' : ''}
  tx_retry_exceeded:               ${retry}${retry > 0 ? '  <- PACKET LOSS detected' : '  <- No loss v'}`,
    type: ecnMarked === 0 || retry > 0 ? "error" : "success",
  }
}
