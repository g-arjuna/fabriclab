import { useLabStore } from "@/store/labStore";
import type { CommandResult } from "@/types";

function markCondition(conditionKey: string) {
  const store = useLabStore.getState();
  store.setCondition(conditionKey, true);
  store.markVerified(conditionKey);
}

function hasTrafficRun() {
  return useLabStore.getState().topology.lab0bTrafficGenerated === true;
}

export function handleLab0bShowRoceStatus(): CommandResult {
  markCondition("roceCounterProfileChecked");

  return {
    output: `                operational  applied
--------------  -----------  -------
mode            lossless     lossless
pfc
  pfc-priority  3            3
  rx-enabled    yes          yes
  tx-enabled    yes          yes
trust
  trust-mode    dscp         dscp

RoCE PCP/DSCP->SP mapping
=========================
profile  pcp  dscp  switch-priority
-------  ---  ----  ---------------
cnp      6    48    6
roce     3    26    3

RoCE traffic is mapped to switch priority 3, and CNP is mapped to priority 6.
That means PFC protects the RoCE queue, while ECN/CNP is available for rate feedback.`,
    type: "success",
    conceptId: "pfc",
  };
}

export function handleLab0bIbWriteBw(): CommandResult {
  markCondition("roceTrafficProbeRun");
  useLabStore.getState().setTopology({
    lab0bTrafficGenerated: true,
    congestionDetected: false,
    silentCongestion: true,
    bufferUtilPct: 38,
  });

  return {
    output: `---------------------------------------------------------------------------------------
                    RDMA_Write BW Test
 Dual-port       : OFF              Device         : mlx5_0
 Number of qps   : 1                Transport type : IB
 Connection type : RC               Using SRQ      : OFF
 TX depth        : 128              CQ Moderation  : 100
 Mtu             : 4096[B]          Link type      : Ethernet
 Max inline data : 0[B]             Data ex. method: Ethernet
---------------------------------------------------------------------------------------
 local address:  LID 0x0000  QPN 0x0412  PSN 0x8bc92d  RKey 0x14f0216a  VAddr 0x007f8fd1000000
 remote address: LID 0x0000  QPN 0x0481  PSN 0x6a20f4  RKey 0x19a8c042  VAddr 0x007fe511000000
---------------------------------------------------------------------------------------
 #bytes     #iterations    BW peak[MB/sec]    BW average[MB/sec]   MsgRate[Mpps]
 65536      5000           48941.18           47684.77             0.727
---------------------------------------------------------------------------------------

Operator read:
  The probe is running near 400 Gb/s line-rate for 64 KiB writes.
  That is a healthy performance baseline. Now inspect switch and NIC counters
  to see how ECN marks and a small number of PFC pauses appear under load
  without turning into packet drops.`,
    type: "success",
    conceptId: "rocev2",
  };
}

export function handleLab0bShowPfcStats(): CommandResult {
  markCondition("switchPfcCountersRead");

  const rxPauseFrames = hasTrafficRun() ? "184" : "0";
  const rxPauseDuration = hasTrafficRun() ? "3728" : "0";

  return {
    output: `switch-priority  rx-pause-frames  rx-pause-duration  tx-pause-frames  tx-pause-duration
-------------  ---------------  -----------------  ---------------  -----------------
0              0                0                  0                0
1              0                0                  0                0
2              0                0                  0                0
3              ${rxPauseFrames.padEnd(15)}  ${rxPauseDuration.padEnd(17)}  0                0
4              0                0                  0                0
5              0                0                  0                0
6              0                0                  0                0
7              0                0                  0                0

Interpretation:
  A small number of received PFC pauses on switch priority 3 means the lossless
  queue is applying backpressure under load. That is acceptable as a backstop.
  If these counters were exploding while ECN marks stayed at zero, that would be
  a hint of PFC-only congestion.`,
    type: "info",
    conceptId: "pfc",
  };
}

export function handleLab0bShowRoceCounters(): CommandResult {
  markCondition("switchRoceCountersRead");

  const roceBytes = hasTrafficRun() ? "238.42 GB" : "0 Bytes";
  const rocePackets = hasTrafficRun() ? "3903744" : "0";
  const ecnMarkedPackets = hasTrafficRun() ? "2814" : "0";
  const bufferUsage = hasTrafficRun() ? "3.62 MB" : "0 Bytes";
  const bufferMaxUsage = hasTrafficRun() ? "7.81 MB" : "0 Bytes";

  return {
    output: `rx-stats
  rx-pfc-stats
    pause-duration       ${hasTrafficRun() ? "3728" : "0"}
    pause-packets        ${hasTrafficRun() ? "184" : "0"}
  rx-roce-stats
    buffer-usage         ${bufferUsage}
    buffer-max-usage     ${bufferMaxUsage}
    no-buffer-discard    0
    roce-packets         ${rocePackets}
    roce-bytes           ${roceBytes}
    ecn-marked-packets   ${ecnMarkedPackets}

Interpretation:
  no-buffer-discard = 0 means the queue is not dropping RoCE packets.
  Non-zero ECN marks plus modest PFC pauses is the healthy ordering:
  ECN should provide rate feedback first, and PFC should remain a backstop.`,
    type: "success",
    conceptId: "ecn",
  };
}

export function handleLab0bEthtoolEth0(): CommandResult {
  markCondition("hostNicCountersRead");

  return {
    output: `NIC statistics (ConnectX-7 | eth0 / mlx5_0)
  rx_prio3_pause:       ${hasTrafficRun() ? "184" : "0"}
  tx_prio3_pause:       0
  rx_ecn_marked_pkts:   ${hasTrafficRun() ? "2814" : "0"}
  tx_discards_phy:      0
  rx_out_of_buffer:     0
  tx_cnp_sent:          ${hasTrafficRun() ? "621" : "0"}
  link_speed:           400Gb/s
  link_state:           up

Host-side read:
  ECN-marked packets were received and no physical drops occurred.
  That matches the switch-side picture: the fabric stayed lossless while
  rate feedback kicked in under a controlled probe.`,
    type: "info",
    conceptId: "ecn",
  };
}
