import type { CommandResult } from "@/types"
import { useLabStore } from "@/store/labStore"

const LAB17_LEAF_IDS = ["leaf-01", "leaf-02"]

function getActiveLeafId(): string {
  const activeDeviceId = useLabStore.getState().activeDeviceId
  return activeDeviceId === "leaf-02" ? "leaf-02" : "leaf-01"
}

function getConfiguredLeafSet(): Set<string> {
  const topology = useLabStore.getState().topology as any
  return new Set(topology.lab17RoceConfiguredDevices ?? [])
}

function getAppliedLeafSet(): Set<string> {
  const topology = useLabStore.getState().topology as any
  return new Set(topology.lab17ConfigAppliedDevices ?? [])
}

function isCurrentLeafApplied(): boolean {
  return getAppliedLeafSet().has(getActiveLeafId())
}

function areBothLeavesApplied(): boolean {
  const applied = getAppliedLeafSet()
  return LAB17_LEAF_IDS.every((leafId) => applied.has(leafId))
}

function getThresholds(): { minThreshold: number; maxThreshold: number } {
  const topology = useLabStore.getState().topology as any
  return {
    minThreshold: topology.ecnMinThreshold ?? 500000,
    maxThreshold: topology.ecnMaxThreshold ?? 1500000,
  }
}

export function handleNvSetRoce(): CommandResult {
  const { topology, setTopology } = useLabStore.getState()
  const configuredLeaves = Array.from(new Set([...(topology.lab17RoceConfiguredDevices ?? []), getActiveLeafId()])).sort()

  setTopology({
    ...(topology as object),
    lab17RoceConfiguredDevices: configuredLeaves,
    pfcEnabled: true,
    ecnEnabled: true,
    ecnMinThreshold: 500000,
    ecnMaxThreshold: 1500000,
  } as any)

  return {
    output: `Staged global RoCE QoS profile on ${getActiveLeafId()}:
  enable            on
  mode              lossless
  trust-mode        pcp,dscp
  switch-priority   3
  pfc               enabled
  ecn min-threshold 500000
  ecn max-threshold 1500000

Run \`nv config apply\` on this leaf to program the ASIC.`,
    type: "success",
  }
}

export function handleNvConfigApply(): CommandResult {
  const { topology, setTopology, setCondition, markVerified } = useLabStore.getState()
  const activeLeafId = getActiveLeafId()

  if (!getConfiguredLeafSet().has(activeLeafId)) {
    return {
      output: `No staged RoCE configuration on ${activeLeafId}. Run \`nv set qos roce\` first.`,
      type: "error",
    }
  }

  const appliedLeaves = Array.from(new Set([...(topology.lab17ConfigAppliedDevices ?? []), activeLeafId])).sort()
  const bothApplied = LAB17_LEAF_IDS.every((leafId) => appliedLeaves.includes(leafId))

  setTopology({
    ...(topology as object),
    lab17ConfigAppliedDevices: appliedLeaves,
    configApplied: bothApplied,
    roceShorthandApplied: bothApplied,
  } as any)

  if (bothApplied) {
    setCondition("roceShorthandApplied", true)
    markVerified("roceShorthandApplied")
  }

  return {
    output: `Applying configuration on ${activeLeafId}...
  Validating QoS profile and queue resources... OK
  Programming Spectrum ASIC QoS and PFC state... OK
Configuration applied successfully.`,
    type: "success",
  }
}

export function handleNvConfigSave(): CommandResult {
  if (!isCurrentLeafApplied()) {
    return {
      output: `Warning: no applied configuration on ${getActiveLeafId()} to save. Run \`nv config apply\` first.`,
      type: "error",
    }
  }

  return {
    output: "Configuration saved to /etc/nvue.d/startup.yaml",
    type: "success",
  }
}

export function handleNvShowQosRoce(): CommandResult {
  if (!isCurrentLeafApplied()) {
    return {
      output: `                    operational  applied
------------------  -----------  -------
enable              off          off
mode                -            -
trust-mode          -            -

RoCE is not active on ${getActiveLeafId()}. Stage it with \`nv set qos roce\`, then run \`nv config apply\`.`,
      type: "info",
    }
  }

  return {
    output: `                    operational  applied
------------------  -----------  -------
enable              on           on
mode                lossless     lossless
trust-mode          pcp,dscp     pcp,dscp
pfc
  switch-priority   3            3`,
    type: "success",
  }
}

export function handleNvShowInterfaceQos(): CommandResult {
  if (!isCurrentLeafApplied()) {
    return {
      output: `                      operational  applied
--------------------  -----------  -------
egress-scheduler
  profile                          default
mapping
  profile                          default

RoCE QoS is still using default lossy queue mapping on swp1.`,
      type: "info",
    }
  }

  return {
    output: `                      operational  applied
--------------------  -----------  ---------
egress-scheduler
  profile             default      default
mapping
  profile             default      default
roce
  enable              on           on
  mode                lossless     lossless`,
    type: "success",
  }
}

export function handleNvShowQosTrustDscpMap(): CommandResult {
  const { setCondition, markVerified } = useLabStore.getState()

  if (!isCurrentLeafApplied()) {
    return {
      output: `pcp,dscp  switch-priority
--------  ---------------
default   0

Run \`nv set qos roce\` and \`nv config apply\` first.`,
      type: "info",
    }
  }

  setCondition("dscpTrustVerified", true)
  markVerified("dscpTrustVerified")

  return {
    output: `pcp,dscp  switch-priority  remark
--------  ---------------  --------------------------
26        3                RoCE data traffic
48        6                CNP
0-25      0                Default lossy traffic
27-47     0                Default lossy traffic
49-63     0                Default lossy traffic`,
    conceptId: "dscp-trust-map",
    type: "success",
  }
}

export function handleNvShowQosEcnProfile(): CommandResult {
  const { setCondition, markVerified } = useLabStore.getState()
  const { minThreshold, maxThreshold } = getThresholds()
  const applied = isCurrentLeafApplied()

  if (applied) {
    setCondition("ecnThresholdsVerified", true)
    markVerified("ecnThresholdsVerified")
  }

  return {
    output: `Interface swp1
  congestion-control
                     operational  applied
    ---------------  -----------  -------
    ecn              ${applied ? "enabled" : "disabled"}      ${applied ? "enabled" : "disabled"}
    min-threshold    ${applied ? `${minThreshold}` : "-"}      ${applied ? `${minThreshold}` : "-"}
    max-threshold    ${applied ? `${maxThreshold}` : "-"}      ${applied ? `${maxThreshold}` : "-"}
    probability      ${applied ? "100" : "-"}      ${applied ? "100" : "-"}`,
    conceptId: "ecn-thresholds",
    type: applied ? "success" : "info",
  }
}

export function handleNvShowQosPfc(): CommandResult {
  const { setCondition, markVerified } = useLabStore.getState()
  const pfcEnabled = isCurrentLeafApplied()

  if (pfcEnabled) {
    setCondition("pfcConfigVerified", true)
    markVerified("pfcConfigVerified")
  }

  return {
    output: `switch-priority  rx-enabled  tx-enabled
---------------  ----------  ----------
0                no          no
1                no          no
2                no          no
3                ${pfcEnabled ? "yes" : "no"}         ${pfcEnabled ? "yes" : "no"}
4                no          no
5                no          no
6                no          no
7                no          no`,
    conceptId: "pfc-priority-3",
    type: pfcEnabled ? "success" : "info",
  }
}

export function handleNvShowQosScheduler(): CommandResult {
  return {
    output:
      "Use `nv show interface swp1 qos` and `nv show interface swp1 qos roce status` for this lab's RoCE queue and ECN state.",
    type: "info",
  }
}

export function handleClResourceQuery(): CommandResult {
  return {
    output: `asic-resource     used    total
---------------  ------  ------
l2 entries       2048    131072
l3 host routes   512     262144
acl entries      1024    16384

Use \`nv show interface swp1 qos roce status\` and \`nv show interface swp1 qos roce counters\` for RoCE queue checks in this lab.`,
    type: "info",
  }
}

export function handleNvShowInterfaceCountersPfc(): CommandResult {
  const txPauseFrames = isCurrentLeafApplied() ? 142 : 0
  const txPauseDuration = isCurrentLeafApplied() ? "36.0 KB" : "0 Bytes"

  return {
    output: `switch-priority  rx-pause-frames  rx-pause-duration  tx-pause-frames  tx-pause-duration
---------------  ---------------  -----------------  ---------------  -----------------
0                0                0 Bytes            0                0 Bytes
1                0                0 Bytes            0                0 Bytes
2                0                0 Bytes            0                0 Bytes
3                0                0 Bytes            ${txPauseFrames}              ${txPauseDuration}
4                0                0 Bytes            0                0 Bytes
5                0                0 Bytes            0                0 Bytes
6                0                0 Bytes            0                0 Bytes
7                0                0 Bytes            0                0 Bytes`,
    type: txPauseFrames > 0 ? "success" : "info",
  }
}

export function handleEthtoolSwp1Ecn(): CommandResult {
  const marked = isCurrentLeafApplied() ? 2847392 : 0

  return {
    output: `Interface: swp1
-----------------------------
tx-stats
  tx-ecn-stats
    ecn-marked-packets ${marked}`,
    type: marked > 0 ? "success" : "info",
  }
}

export function handleIbWriteBw(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const t = topology as any
  const bw = (t.mtu ?? 1500) >= 9000 && areBothLeavesApplied() ? 46.81 : 12.21

  if (bw >= 46) {
    setCondition("bwVerified", true)
    markVerified("bwVerified")
  }

  return {
    output: `-------------------------------------------------------------------
                    RDMA_Write BW Test
-------------------------------------------------------------------
 #bytes     #iterations    BW peak[GB/sec]    BW average[GB/sec]
 65536      5000           ${bw >= 46 ? "46.92" : "12.34"}              ${bw}
-------------------------------------------------------------------`,
    conceptId: "ib-write-bw",
    type: bw >= 46 ? "success" : "error",
  }
}

export function handleIbWriteLat(): CommandResult {
  const { setCondition, markVerified } = useLabStore.getState()
  const p99 = areBothLeavesApplied() ? 1.19 : 38.47

  if (p99 <= 2) {
    setCondition("latencyVerified", true)
    markVerified("latencyVerified")
  }

  return {
    output: `-------------------------------------------------------------------
                    RDMA_Write Latency Test
-------------------------------------------------------------------
 #bytes #iters  t_min[usec]  t_max[usec]  t_typical[usec]  t_99p[usec]
 2       10000   0.81         ${p99 <= 2 ? "4.23" : "84.21"}         0.87             ${p99}
-------------------------------------------------------------------`,
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
  vendor_part_id:         4129
  phys_port_cnt:          1
  port:   1
    state:              PORT_ACTIVE (4)
    max_mtu:            4096 (5)
    active_mtu:         ${mtuCode} (${mtuCode >= 4096 ? "5" : "3"})
    link_layer:         Ethernet
    active_speed:       400 Gb/sec
    active_width:       4X`,
    type: mtuCode >= 4096 ? "success" : "error",
  }
}

export function handleIbvRcPingpong(): CommandResult {
  if (!areBothLeavesApplied()) {
    return {
      output: "ibv_rc_pingpong: QP transition failed. Verify RoCE is applied on both leaf-01 and leaf-02.",
      type: "error",
    }
  }

  return {
    output: `local address:  LID 0x0000, QPN 0x000087, PSN 0xac3e8c
remote address: LID 0x0000, QPN 0x000087, PSN 0x9f2a41
8192000 bytes in 0.003 seconds = 24530.27 Mbit/sec`,
    type: "success",
  }
}

export function handleIpLinkShow(): CommandResult {
  const mtu = (useLabStore.getState().topology as any).mtu ?? 1500

  return {
    output: `2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu ${mtu} qdisc mq state UP mode DEFAULT group default qlen 1000
    link/ether 0c:42:a1:03:3e:80 brd ff:ff:ff:ff:ff:ff`,
    type: mtu >= 9000 ? "success" : "error",
  }
}

export function handleEthtoolMlx5Grep(): CommandResult {
  const profileReady = areBothLeavesApplied()
  const pauseFrames = profileReady ? 142 : 0
  const cnpPackets = profileReady ? 2847392 : 0
  const retries = profileReady ? 0 : 8821

  return {
    output: `rx_prio3_pause:      ${pauseFrames}
tx_prio3_pause:      ${pauseFrames}
roce_cnp_tx_packets: ${cnpPackets}
roce_tx_retries:     ${retries}`,
    type: profileReady ? "success" : "error",
  }
}
