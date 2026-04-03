import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

function markCondition(key: string): void {
  const store = useLabStore.getState();
  store.setCondition(key, true);
  store.verifyCondition(key);
}

export function handleLab6UfmHighBerPorts(): CommandResult {
  markCondition("ufmPortsChecked");

  return {
    output: JSON.stringify(
      {
        total_resources: 1,
        filtered_resources: 1,
        data: [
          {
            description: "Switch IB Port",
            physical_state: "Link Up",
            path: "default(1) / Switch: leaf-rail5 / swp7",
            system_name: "leaf-rail5",
            dname: "swp7",
            peer_node_name: "DGX-Node-A",
            peer_port_dname: "mlx5_5",
            logical_state: "Active",
            severity: "Warning",
            high_ber_severity: "Warning",
          },
        ],
      },
      null,
      2,
    ),
    conceptId: "ufm-port-counters",
    type: "success",
  };
}

export function handleLab6UfmLeafRail5Ports(): CommandResult {
  markCondition("offendingPortIdentified");
  const peerNodeNames = [
    "DGX-Node-B",
    "DGX-Node-C",
    "DGX-Node-D",
    "DGX-Node-E",
    "DGX-Node-F",
    "DGX-Node-G",
    "DGX-Node-A",
    "DGX-Node-H",
  ];
  const ports = Array.from({ length: 8 }, (_, index) => {
    const portNumber = index + 1;
    const isFaultyPort = portNumber === 7;

    return {
      description: "Switch IB Port",
      physical_state: "Link Up",
      path: `default(1) / Switch: leaf-rail5 / swp${portNumber}`,
      system_name: "leaf-rail5",
      dname: `swp${portNumber}`,
      peer_node_name: peerNodeNames[index],
      peer_port_dname: "mlx5_5",
      logical_state: "Active",
      severity: isFaultyPort ? "Warning" : "Info",
      high_ber_severity: isFaultyPort ? "Warning" : "N/A",
    };
  });

  return {
    output: JSON.stringify(
      {
        total_resources: 8,
        filtered_resources: 8,
        data: ports,
      },
      null,
      2,
    ),
    conceptId: "ufm-port-counters",
    type: "success",
  };
}

export function handleLab6DcgmDmonGpu5(): CommandResult {
  markCondition("dcgmCorrelated");

  return {
    output: `# Entity      GRACT    TENSO    DRAMA
GPU 5          0.91     0.89     0.41

# GPU 5 graphics/SM activity is below the normal 0.96-0.97 peer baseline while DRAM activity remains moderate, which is consistent with a communication-side stall rather than a compute-side fault.`,
    conceptId: "dcgm-metrics",
    type: "success",
  };
}

export function handleLab6LeafSwp7Link(): CommandResult {
  return {
    output: `                         operational        applied
----------------------  ----------------  ----------------
admin-status            up                up
oper-status             up                up
protodown               off               off
auto-negotiate          off               off
duplex                  full              full
speed                   400G              400G
fec                     rs                rs
state                   up`,
    conceptId: "rocev2",
    type: "success",
  };
}

export function handleLab6DgxEthtoolEth5(): CommandResult {
  return {
    output: `NIC statistics:
     rx_packets: 2102948211
     tx_packets: 1897223104
     rx_bytes: 2841203944112
     tx_bytes: 2198403112009
     rx_prio3_pause: 14
     tx_prio3_pause: 0
     rx_symbol_errors_phy: 1831
     rx_corrected_bits_phy: 14648
     rx_discards_phy: 0
     rx_out_of_buffer: 0`,
    conceptId: "rocev2",
    type: "success",
  };
}

export function handleLab6LeafSwp7Ethtool(): CommandResult {
  return {
    output: `NIC statistics:
     rx_packets: 1897223104
     tx_packets: 2102948211
     rx_bytes: 2198403112009
     tx_bytes: 2841203944112
     rx_symbol_errors_phy: 1847
     rx_corrected_bits_phy: 14648
     rx_prio3_pause: 14
     tx_prio3_pause: 0
     rx_discards_phy: 0
     tx_discards_phy: 0`,
    conceptId: "rocev2",
    type: "success",
  };
}

export function handleLab6LeafSwp7PfcStats(): CommandResult {
  markCondition("timestampsCorrelated");

  return {
    output: `    rx-pause-frames  tx-pause-frames
--  ---------------  ---------------
0   0                0
1   0                0
2   0                0
3   14               0
4   0                0
5   0                0
6   0                0
7   0                0`,
    conceptId: "pfc-mechanics",
    type: "success",
  };
}

export function handleLab6ReseatConnector(): CommandResult {
  markCondition("rootCauseLayerIdentified");
  markCondition("remediationIssued");

  return {
    output: `[SITE RUNBOOK]
This is a site-local maintenance script, not a stock UFM CLI command.

Opening maintenance window for leaf-rail5 swp7...
Reseating DAC on leaf-rail5 swp7 and DGX-Node-A mlx5_5...
Waiting 60s for counters to repoll...

Post-check:
  UFM high_ber_severity: N/A
  leaf-rail5 swp7 rx_symbol_errors_phy: 0
  DGX GPU 5 SM activity: 97%

Lab complete. Root cause: marginal physical connector on Rail 5 swp7.`,
    conceptId: "ufm-port-counters",
    type: "success",
  };
}
