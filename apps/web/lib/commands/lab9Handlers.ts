import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

function markCondition(key: string): void {
  const store = useLabStore.getState();
  store.setCondition(key, true);
  store.verifyCondition(key);
}

function getRail2State() {
  const store = useLabStore.getState();
  const rails = store.topology.rails ?? [];
  const rail2 = rails.find((rail) => rail.id === 2);
  const opticReplaced = (store.topology as any).opticReplaced === true;
  const protodownReasonCleared =
    (store.topology as any).protodownReasonCleared === true;
  const isProtodown = rail2?.switchPort === "error-disabled";

  return {
    store,
    rails,
    rail2,
    opticReplaced,
    protodownReasonCleared,
    isProtodown,
  };
}

export function showUfmTopologyLab9(): CommandResult {
  const { isProtodown } = getRail2State();

  markCondition("railIdentified");

  return {
    output: `Rail  Leaf Port        DGX HCA   DGX Netdev  Switch Port State
----  ---------------  --------  ---------  ------------------
0     leaf-rail0.swp2  mlx5_0    eth0       up
1     leaf-rail1.swp2  mlx5_1    eth1       up
2     leaf-rail2.swp3  mlx5_2    eth2       ${isProtodown ? "protodown/linkflap" : "up"}
3     leaf-rail3.swp5  mlx5_3    eth3       up
4     leaf-rail4.swp6  mlx5_4    eth4       up
5     leaf-rail5.swp7  mlx5_5    eth5       up
6     leaf-rail6.swp8  mlx5_6    eth6       up
7     leaf-rail7.swp9  mlx5_7    eth7       up

[SIM ONLY] This rail-to-port mapping summary is tutorial scaffolding.
It is not literal UFM CLI output from a production system.

Next checks:
  dgx-node-a:   ibstat
  leaf-rail2:   nv show interface swp3 link`,
    conceptId: "rocev2",
    type: "success",
  };
}

export function handleLab9NvShowInterfaceSwp3Link(): CommandResult {
  const { isProtodown } = getRail2State();

  if (isProtodown) {
    markCondition("errDisabledConfirmed");
    markCondition("railIdentified");
  } else {
    markCondition("railVerified");
  }

  return {
    output: `                         operational              applied
-----------------------  -----------------------  -------
admin-status             up                       up
oper-status              ${isProtodown ? "down" : "up"}                     up
protodown                ${isProtodown ? "enabled" : "disabled"}                  disabled
protodown-reason         ${isProtodown ? "linkflap" : ""}
auto-negotiate           off                      off
duplex                   full                     full
speed                    400G                     400G
carrier-transitions      ${isProtodown ? "6" : "0"}
oper-status-last-change  ${isProtodown ? "2026/04/03 09:47:43.219" : "2026/04/03 10:21:18.004"}
state                    ${isProtodown ? "down" : "up"}                      up`,
    conceptId: "rocev2",
    type: isProtodown ? "error" : "success",
  };
}

export function replaceOpticRail2(): CommandResult {
  const { store, opticReplaced } = getRail2State();

  if (opticReplaced) {
    return {
      output: `[SITE RUNBOOK]
OSFP on leaf-rail2 swp3 has already been replaced.
Clear the linkflap protodown state from the Cumulus shell next.`,
      conceptId: "rocev2",
      type: "info",
    };
  }

  store.setTopology({
    ...(store.topology as object),
    opticReplaced: true,
  } as typeof store.topology);
  markCondition("opticReplaced");

  return {
    output: `[SITE RUNBOOK]
This is a site-local maintenance script, not a stock Cumulus or UFM CLI command.

Opening maintenance window for leaf-rail2 swp3...
Replacing OSFP module on leaf-rail2 swp3...
Cleaning connector and re-seating the new module...
Physical signal restored.

Next on leaf-rail2:
  sudo ip link set swp3 protodown_reason linkflap off
  sudo ip link set swp3 protodown off`,
    conceptId: "rocev2",
    type: "success",
  };
}

export function clearProtodownReasonSwp3(): CommandResult {
  const { store, opticReplaced } = getRail2State();

  if (!opticReplaced) {
    return {
      output:
        "swp3 is still flapping because the optic has not been replaced. Run the site runbook first from the UFM server.",
      conceptId: "rocev2",
      type: "error",
    };
  }

  store.setTopology({
    ...(store.topology as object),
    protodownReasonCleared: true,
  } as typeof store.topology);

  return {
    output: "",
    conceptId: "rocev2",
    type: "success",
  };
}

export function clearProtodownSwp3(): CommandResult {
  const { store, rails, opticReplaced, protodownReasonCleared } =
    getRail2State();

  if (!opticReplaced) {
    return {
      output:
        "swp3 is still flapping because the optic has not been replaced. Run the site runbook first from the UFM server.",
      conceptId: "rocev2",
      type: "error",
    };
  }

  if (!protodownReasonCleared) {
    return {
      output:
        "swp3 protodown reason is still set to linkflap. Run 'sudo ip link set swp3 protodown_reason linkflap off' first.",
      conceptId: "rocev2",
      type: "error",
    };
  }

  store.setTopology({
    ...(store.topology as object),
    rails: rails.map((rail) =>
      rail.id === 2 ? { ...rail, switchPort: "up" as const } : rail,
    ),
  } as typeof store.topology);
  markCondition("portReenabled");

  return {
    output: "",
    conceptId: "rocev2",
    type: "success",
  };
}

export function noShutdown(): CommandResult {
  return clearProtodownSwp3();
}

export function ethtoolStatsEth2(): CommandResult {
  const { isProtodown } = getRail2State();

  return {
    output: `NIC statistics:
     rx_packets: ${isProtodown ? "0" : "5982014431"}
     tx_packets: ${isProtodown ? "0" : "6012231088"}
     rx_prio3_pause: 0
     tx_prio3_pause: 0
     rx_ecn_marked_pkts: 0
     tx_discards_phy: 0
     link_down_events_phy: 0`,
    conceptId: "rocev2",
    type: "info",
  };
}
