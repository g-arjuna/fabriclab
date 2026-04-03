import { useLabStore } from "@/store/labStore";
import type { CommandResult } from "@/types";

function getLab0LeafContext() {
  const store = useLabStore.getState();
  const activeDeviceId = store.activeDeviceId ?? "leaf-rail3";
  const railId = Number.parseInt(activeDeviceId.replace("leaf-rail", ""), 10);
  const swpId = Number.isFinite(railId) ? railId + 2 : 5;
  const rail = (store.topology.rails ?? []).find((item) => item.id === railId);

  return {
    store,
    railId,
    swpName: `swp${swpId}`,
    rail,
    isFailedRail: rail?.switchPort === "error-disabled",
  };
}

export function showUfmTopologyLab0(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState();
  const rails = topology.rails ?? [];
  const failedRail = rails.find((rail) => rail.switchPort === "error-disabled");

  if (rails.length === 0) {
    return {
      output: "No UFM topology snapshot is available for this lab.",
      type: "info",
    };
  }

  if (failedRail) {
    setCondition("railIdentified", true);
    markVerified("railIdentified");
  }

  const rows = rails
    .map((rail) => {
      const switchPortState =
        rail.switchPort === "error-disabled" ? "protodown/linkflap" : "up";
      return `${String(rail.id).padEnd(5)} leaf-rail${rail.id}.swp${String(rail.id + 2).padEnd(3)} ${rail.nicName.padEnd(8)} eth${String(rail.id).padEnd(4)} ${switchPortState}`;
    })
    .join("\n");

  return {
    output: `Rail  Leaf Port        DGX HCA   DGX Netdev  Switch Port State
----  ---------------  --------  ---------  ------------------
${rows}

Summary:
  Failed rail: Rail ${failedRail?.id ?? "none"}
  Mapping: Rail 3 -> leaf-rail3 swp5 -> mlx5_3 / eth3

[SIM ONLY] The mapping summary and next-step hint below are tutorial scaffolding.
They are not literal UFM CLI output you should expect on a production system.
Next checks: run 'rdma link show' and 'ethtool -S eth3' on the DGX host,
then inspect 'nv show interface swp5 link' on leaf-rail3.`,
    conceptId: "rocev2",
    type: "success",
  };
}

export function nvShowInterfaceStatusLab0(): CommandResult {
  const { store, railId, swpName, isFailedRail } = getLab0LeafContext();

  if (isFailedRail) {
    store.setCondition("errDisabledConfirmed", true);
    store.markVerified("errDisabledConfirmed");
  }

  return {
    output: `Interface  Admin Status  Oper Status  Protodown  Protodown Reason  Speed  Description
---------  ------------  -----------  ---------  ----------------  -----  -----------
${swpName.padEnd(9)} up            ${isFailedRail ? "down" : "up"}         ${isFailedRail ? "enabled" : "disabled"}   ${isFailedRail ? "linkflap" : ""}${isFailedRail ? " ".repeat(8) : " ".repeat(16)} 400G   dgx-node-a-rail${railId}`,
    type: isFailedRail ? "error" : "success",
    conceptId: "rocev2",
  };
}

export function nvShowInterfaceLinkLab0(expectedPort: string): CommandResult {
  const { store, railId, swpName, isFailedRail } = getLab0LeafContext();

  if (swpName !== expectedPort) {
    return {
      output: `nv show interface ${expectedPort} link

No fault on ${expectedPort} from this leaf tab.
[SIM ONLY] Use the rail mapping from 'show ufm topology' to pick the swp port on this leaf.`,
      type: "info",
    };
  }

  if (isFailedRail && store.lab.conditions.linkConfirmed === true) {
    store.setCondition("faultIsolated", true);
    store.markVerified("faultIsolated");
  }

  return {
    output: `                         operational              applied
-----------------------  -----------------------  -------
admin-status             up                       up
oper-status              ${isFailedRail ? "down" : "up"}                     up
protodown                ${isFailedRail ? "enabled" : "disabled"}                  disabled
protodown-reason         ${isFailedRail ? "linkflap" : ""}
auto-negotiate           off                      off
duplex                   full                     full
speed                    400G                     400G
carrier-transitions      ${isFailedRail ? "6" : "0"}
oper-status-last-change  ${isFailedRail ? "2026/04/03 10:07:43.219" : "2026/04/03 09:52:18.004"}
state                    ${isFailedRail ? "down" : "up"}                      up`,
    type: isFailedRail ? "error" : "success",
    conceptId: "rocev2",
  };
}

export function nvShowInterfaceLinkFlapProtectionLab0(
  expectedPort: string,
): CommandResult {
  const { swpName, isFailedRail } = getLab0LeafContext();

  if (swpName !== expectedPort) {
    return {
      output: `nv show interface ${expectedPort} link flap-protection

No flap-protection event on ${expectedPort} from this leaf tab.`,
      type: "info",
    };
  }

  return {
    output: `           operational  applied
---------  -----------  -------
state                   enabled`,
    type: isFailedRail ? "error" : "success",
    conceptId: "rocev2",
  };
}
