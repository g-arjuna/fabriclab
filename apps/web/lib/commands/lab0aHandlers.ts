import { useLabStore } from "@/store/labStore";
import type { CommandResult } from "@/types";

function markCondition(conditionKey: string) {
  const store = useLabStore.getState();
  store.setCondition(conditionKey, true);
  store.markVerified(conditionKey);
}

function getRailById(railId: number) {
  return (useLabStore.getState().topology.rails ?? []).find((rail) => rail.id === railId);
}

export function handleLab0aShowUfmTopology(): CommandResult {
  markCondition("ufmRailMapChecked");

  return {
    output: `UFM Topology - rack orientation

Rail 0:
  DGX endpoint:    dgx-node-01 mlx5_0 / eth0
  Switch endpoint: leaf-rail0 swp1
  Link state:      Active / 400G

Rail 1:
  DGX endpoint:    dgx-node-01 mlx5_1 / eth1
  Switch endpoint: leaf-rail1 swp1
  Link state:      Active / 400G

[SIM ONLY] The compact two-rail summary above is a tutorial map built for this lab.
Use it to decide where each platform-native command should be run:
  UFM -> fabric-wide mapping
  DGX OS -> ibstat, rdma link show, ip link show, ethtool -S
  Cumulus leaf -> nv show interface swp1 link`,
    type: "success",
    conceptId: "rocev2",
  };
}

export function handleLab0aIbstat(): CommandResult {
  markCondition("hcaInventoryChecked");

  return {
    output: `CA 'mlx5_0'
        CA type: MT4129
        Number of ports: 1
        Firmware version: 28.38.1002
        Hardware version: 0
        Node GUID: 0x506b4b0300a1b200
        System image GUID: 0x506b4b0300a1b200
        Port 1:
                State: Active
                Physical state: LinkUp
                Rate: 400
                Base lid: 0
                SM lid:   0
                Capability mask: 0xa651e848
                Port GUID: 0x506b4b0300a1b200
                Link layer: Ethernet

CA 'mlx5_1'
        CA type: MT4129
        Number of ports: 1
        Firmware version: 28.38.1002
        Hardware version: 0
        Node GUID: 0x506b4b0300a1b201
        System image GUID: 0x506b4b0300a1b201
        Port 1:
                State: Active
                Physical state: LinkUp
                Rate: 400
                Base lid: 0
                SM lid:   0
                Capability mask: 0xa651e848
                Port GUID: 0x506b4b0300a1b201
                Link layer: Ethernet`,
    type: "success",
    conceptId: "rocev2",
  };
}

export function handleLab0aRdmaLinkShow(): CommandResult {
  markCondition("rdmaNetdevMapChecked");

  return {
    output: `link mlx5_0/1 state ACTIVE physical_state LINK_UP
  netdev eth0
  netdev state UP
  type RoCE
  roce_mode RoCE v2

link mlx5_1/1 state ACTIVE physical_state LINK_UP
  netdev eth1
  netdev state UP
  type RoCE
  roce_mode RoCE v2`,
    type: "success",
    conceptId: "rocev2",
  };
}

export function handleLab0aIpLinkShow(netdev: "eth0" | "eth1"): CommandResult {
  markCondition(netdev === "eth0" ? "eth0StateChecked" : "eth1StateChecked");

  const railId = netdev === "eth0" ? 0 : 1;
  const macSuffix = netdev === "eth0" ? "00" : "01";

  return {
    output: `7: ${netdev}: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 9216 qdisc mq state UP mode DEFAULT group default qlen 1000
    link/ether 4c:6d:58:8f:a4:${macSuffix} brd ff:ff:ff:ff:ff:ff
    altname enp170s0f${railId}np0
    altname ens${railId + 8}f0np0

Operational note:
  ${netdev} is the Linux netdev for mlx5_${railId} on Rail ${railId}.
  'ip link show' confirms kernel link/admin state, while 'rdma link show' confirms RDMA stack mapping.`,
    type: "info",
    conceptId: "rocev2",
  };
}

export function handleLab0aEthtool(netdev: "eth0" | "eth1"): CommandResult {
  const railId = netdev === "eth0" ? 0 : 1;

  return {
    output: `NIC statistics (ConnectX-7 | ${netdev} / mlx5_${railId} | Rail ${railId})
  rx_prio3_pause:       0
  tx_prio3_pause:       0
  rx_ecn_marked_pkts:   0
  tx_discards_phy:      0
  rx_out_of_buffer:     0
  rx_symbol_errors_phy: 0
  link_speed:           400Gb/s
  link_state:           up`,
    type: "info",
    conceptId: "rocev2",
  };
}

export function handleLab0aLeafSwp1Link(): CommandResult {
  const activeDeviceId = useLabStore.getState().activeDeviceId ?? "leaf-rail0";
  const railId = activeDeviceId === "leaf-rail1" ? 1 : 0;
  const rail = getRailById(railId);

  markCondition(railId === 0 ? "leafRail0PortChecked" : "leafRail1PortChecked");

  return {
    output: `                         operational              applied
-----------------------  -----------------------  -------
admin-status             up                       up
oper-status              ${rail?.switchPort === "up" ? "up" : "down"}                     up
oper-status-last-change  2026/04/04 09:12:10.218
protodown                disabled                 disabled
auto-negotiate           off                      off
duplex                   full                     full
speed                    400G                     400G
mtu                      9216                     9216
mac-address              48:b0:2d:f0:b9:${railId === 0 ? "10" : "11"}

Remote endpoint:
  dgx-node-01 ${rail?.nicName ?? `mlx5_${railId}`} / eth${railId} (Rail ${railId})`,
    type: rail?.switchPort === "up" ? "success" : "error",
    conceptId: "rocev2",
  };
}
