import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

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
  const { topology } = useLabStore.getState()
  const rails = topology.rails ?? []
  const rail3 = rails.find(r => r.id === 3)

  if (!rail3) {
    return {
      output: `ethtool: Cannot get stats: No such device eth3`,
      type: 'error',
    }
  }

  const isPortFailed = rail3.switchPort === 'error-disabled'

  return {
    output: `NIC statistics (ConnectX-7 · eth3 / mlx5_3 — Rail 3):
  rx_prio3_pause:       0
  tx_prio3_pause:       0
  rx_ecn_marked_pkts:   0
  tx_discards_phy:      ${isPortFailed ? '0' : '0'}
  link_speed:           400Gb/s
  link_state:           ${isPortFailed ? 'up' : 'up'}

${isPortFailed
  ? `NOTE: NIC reports link UP — physical signal is present on the cable.
  tx_discards_phy: 0 — the NIC is not dropping; it is not receiving traffic.
  This is consistent with the switch port being Err-Disabled:
  the cable carries signal but the switch is not forwarding frames.
  
  The NIC cannot detect the switch-side fault. Check the switch:
  → Switch to leaf-rail3 terminal and run: show switch port rail3`
  : `Rail 3 NIC healthy. No errors. Link active and forwarding.`}`,
    conceptId: 'rocev2',
    type: 'info',
  }
}
