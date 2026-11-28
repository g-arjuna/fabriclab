import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";
import { normalizeRails } from "@/lib/lab0State";

export function ethtoolStats(): CommandResult {
  const {
    lab,
    markVerified,
    setCondition,
    topology: { congestionDetected, ecnEnabled, nic, pfcEnabled, silentCongestion },
  } = useLabStore.getState();

  const hasSilentCongestion = silentCongestion ?? false;

  // tx_dropped: only when congestionDetected (drops occurring), not silent congestion
  const txDropped = congestionDetected ? "47291" : "0";

  // rx_pfc_pause_frames: active when PFC is enabled AND there is any congestion
  const rxPfcPause = pfcEnabled && (congestionDetected || hasSilentCongestion)
    ? "12847" : pfcEnabled ? "847" : "0";

  // tx_pfc_pause_frames: NIC sending pauses back (congestion in receive direction)
  const txPfcPause = pfcEnabled && (congestionDetected || hasSilentCongestion)
    ? "8293" : "0";

  // rx_ecn_marked: only when ECN is enabled AND there is congestion
  const rxEcnMarked = ecnEnabled && (congestionDetected || hasSilentCongestion)
    ? "2947" : "0";

  if (lab.labId === "lab1-pfc-fix" && congestionDetected && !pfcEnabled) {
    setCondition("nicDropsChecked", true);
    markVerified("nicDropsChecked");
  }

  return {
    output: `NIC statistics (ConnectX-7 · ${nic.name}):
  rx_prio3_pause:       ${rxPfcPause}
  tx_prio3_pause:       ${txPfcPause}
  rx_ecn_marked_pkts:   ${rxEcnMarked}
  tx_discards_phy:      ${txDropped}
  link_speed:           ${nic.speed}Gb/s
  link_state:           ${nic.state}`,
    conceptId: "pfc",
    type: "info",
  };
}

export function ethtoolStatsEth3(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const rails = normalizeRails(topology.rails)
  const rail3 = rails.find(r => r.id === 3)

  if (!rail3) {
    return {
      output: `ethtool: Cannot get stats: No such device eth3`,
      type: 'error',
    }
  }

  const isPortFailed = rail3.switchPort !== 'up' || rail3.carrierState !== 'up' || rail3.rdmaPortState !== 'active'
  if (isPortFailed) {
    setCondition('nicEvidence', true)
    markVerified('nicEvidence')
  }

  return {
    output: `[SIMULATED ABRIDGED DRIVER STATISTICS — ethtool -S style]
NIC statistics for ${rail3.netdevName} (${rail3.nicName}, Rail 3):
  rx_packets:             ${isPortFailed ? '1842104' : '1842388'}
  tx_packets:             ${isPortFailed ? '1931129' : '1934820'}
  rx_bytes:               ${isPortFailed ? '274887364608' : '274903420928'}
  tx_bytes:               ${isPortFailed ? '287220105216' : '287511347200'}
  rx_prio3_pause:         0
  tx_prio3_pause:         0
  rx_ecn_marked_pkts:     0
  tx_discards_phy:        0
  link_down_events:       ${isPortFailed ? '3' : '0'}

[SIMULATION INTERPRETATION — not ethtool output]
ethtool -S is a driver-statistics interface; it is not the authoritative command for negotiated link state. In this fixture the counter set is deliberately abridged. ${isPortFailed
  ? `The link-down events agree with the carrier loss reported by rdma link show. Zero physical discards do not prove connectivity; use the RDMA port state and the switch-side NVUE evidence together.`
  : `No abnormal carrier or discard evidence is present for Rail 3 in this fixture.`}`,
    conceptId: 'rocev2',
    type: 'info',
  }
}
