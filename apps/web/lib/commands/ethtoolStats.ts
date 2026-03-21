import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

export function ethtoolStats(): CommandResult {
  const {
    topology: { congestionDetected, ecnEnabled, nic, pfcEnabled },
  } = useLabStore.getState();

  return {
    output: `NIC statistics:
  rx_pfc_pause_frames:  ${pfcEnabled ? "12847" : "0"}
  tx_pfc_pause_frames:  ${pfcEnabled ? "8293" : "0"}
  rx_ecn_marked:        ${ecnEnabled ? "2947" : "0"}
  tx_dropped:           ${congestionDetected ? "47291" : "0"}
  link_speed:           ${nic.speed}Gb/s
  link_state:           ${nic.state}`,
    conceptId: "pfc",
    type: "info",
  };
}
