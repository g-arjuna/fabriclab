import type { LabDevice, RailState, TopologyState } from "@/types";

type UfmOperatingMode = "roce" | "infiniband";

export interface UfmFabricNode {
  id: string;
  label: string;
  typeLabel: "Host" | "Switch";
  portName: string;
  operatingMode: UfmOperatingMode;
  status: "up" | "down" | "error-disabled" | "degraded" | "admin-down";
  railId?: number;
  guid: string;
  systemIp: string;
  x: number;
  y: number;
}

export interface UfmFabricLink {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromPort: string;
  toPort: string;
  fromGuid: string;
  toGuid: string;
  status: "Active" | "Down";
  physicalState: "Link Up" | "Polling";
  severity: "Info" | "Warning";
}

export interface UfmFabricModel {
  nodes: UfmFabricNode[];
  links: UfmFabricLink[];
}

export interface UfmApiExample {
  endpoint: string;
  note: string;
  payload: unknown;
}

function inferPortName(device: LabDevice): string {
  return (
    device.allowedCommands
      .map((command) => /\b(swp\d+|eth\d+|mlx5_\d+)\b/.exec(command)?.[1])
      .find((portName): portName is string => Boolean(portName)) ??
    device.sublabel?.match(/\b(swp\d+|eth\d+|mlx5_\d+)\b/)?.[1] ??
    "1"
  );
}

function inferOperatingMode(device: LabDevice): UfmOperatingMode {
  const profile = [
    device.label,
    device.sublabel ?? "",
    device.osLabel,
    ...device.allowedCommands,
  ]
    .join(" ")
    .toLowerCase();

  if (
    profile.includes("cumulus") ||
    profile.includes("spectrum") ||
    profile.includes("roce") ||
    /\b(swp\d+|eth\d+)\b/.test(profile) ||
    profile.includes("ethtool") ||
    profile.includes("ecn") ||
    profile.includes("pfc")
  ) {
    return "roce";
  }

  if (
    profile.includes("infiniband") ||
    profile.includes("pkey") ||
    profile.includes("ipoib") ||
    profile.includes("opensm") ||
    profile.includes("ibv_")
  ) {
    return "infiniband";
  }

  return "roce";
}

function buildNodes(devices: LabDevice[], topologyState: TopologyState, rails: RailState[]): UfmFabricNode[] {
  const fabricDevices = devices.filter(
    (device) => device.type !== "ufm-server" && !device.label.startsWith("[SIM ONLY]"),
  );
  const hosts = fabricDevices.filter((device) => device.type === "dgx");
  const switches = fabricDevices.filter((device) => device.type !== "dgx");
  const hostCount = Math.max(hosts.length, 1);
  const switchCount = Math.max(switches.length, 1);

  return [
    ...switches.map((device, index) => {
      const rail = rails.find((entry) => entry.id === device.railId);

      return {
        id: device.id,
        label: device.label,
        typeLabel: "Switch" as const,
        portName: inferPortName(device),
        operatingMode: inferOperatingMode(device),
        status:
          rail?.switchPort ??
          (topologyState.opticReplaced === true && device.id === "leaf-rail5"
            ? "up"
            : device.status),
        railId: device.railId,
        guid: `0x9c0591030085ab${String(device.railId ?? index).padStart(2, "0")}`,
        systemIp: `10.209.36.${20 + index}`,
        x: 110 + (index * 500) / switchCount,
        y: 135 + (index % 2) * 32,
      };
    }),
    ...hosts.map((device, index) => {
      const rail = rails.find((entry) => entry.nicName === inferPortName(device));

      return {
        id: device.id,
        label: device.label,
        typeLabel: "Host" as const,
        portName: inferPortName(device),
        operatingMode: inferOperatingMode(device),
        status: rail?.nicState ?? device.status,
        railId: device.railId,
        guid: rail?.guid ?? `0x506b4b0300a1b2${String(index).padStart(2, "0")}`,
        systemIp: `10.209.36.${100 + index}`,
        x: 80 + (index * 560) / hostCount,
        y: 315,
      };
    }),
  ];
}

function buildLinks(nodes: UfmFabricNode[], rails: RailState[]): UfmFabricLink[] {
  const hosts = nodes.filter((node) => node.typeLabel === "Host");
  const switches = nodes.filter((node) => node.typeLabel === "Switch");
  const primaryHost = hosts[0];

  if (!primaryHost || switches.length === 0) {
    return [];
  }

  if (rails.length > 0) {
    return rails
      .map((rail) => {
        const switchNode =
          switches.find((node) => node.railId === rail.id) ??
          switches.find((node) => node.id === `leaf-rail${rail.id}`);

        if (!switchNode) {
          return null;
        }

        const isUp = rail.switchPort === "up";

        return {
          id: `${switchNode.id}-${primaryHost.id}`,
          fromNodeId: switchNode.id,
          toNodeId: primaryHost.id,
          fromPort: switchNode.portName,
          toPort: rail.nicName,
          fromGuid: switchNode.guid,
          toGuid: rail.guid,
          status: isUp ? "Active" : "Down",
          physicalState: isUp ? "Link Up" : "Polling",
          severity: isUp ? "Info" : "Warning",
        } satisfies UfmFabricLink;
      })
      .filter((link): link is UfmFabricLink => Boolean(link));
  }

  return switches.map((switchNode, index) => {
    const hostNode = hosts[Math.min(index, hosts.length - 1)];
    const isUp = switchNode.status === "up" && hostNode.status === "up";

    return {
      id: `${switchNode.id}-${hostNode.id}`,
      fromNodeId: switchNode.id,
      toNodeId: hostNode.id,
      fromPort: switchNode.portName,
      toPort: hostNode.portName,
      fromGuid: switchNode.guid,
      toGuid: hostNode.guid,
      status: isUp ? "Active" : "Down",
      physicalState: isUp ? "Link Up" : "Polling",
      severity: isUp ? "Info" : "Warning",
    };
  });
}

function formatPortRecord(node: UfmFabricNode, link?: UfmFabricLink) {
  const isRoce = node.operatingMode === "roce";
  const portNumber = Number.parseInt(node.portName.replace(/\D/g, ""), 10) || 1;
  const peerNodeId =
    link?.fromNodeId === node.id
      ? link.toNodeId
      : link?.toNodeId === node.id
        ? link.fromNodeId
        : "N/A";
  const peerPort =
    link?.fromNodeId === node.id
      ? link.toPort
      : link?.toNodeId === node.id
        ? link.fromPort
        : "N/A";
  const peerGuid =
    link?.fromNodeId === node.id
      ? link.toGuid
      : link?.toNodeId === node.id
        ? link.fromGuid
        : "N/A";

  return {
    description:
      node.typeLabel === "Host"
        ? isRoce
          ? "Computer Ethernet Port"
          : "Computer IB Port"
        : isRoce
          ? "Switch Ethernet Port"
          : "Switch IB Port",
    number: portNumber,
    external_number: portNumber,
    physical_state: link?.physicalState ?? "Polling",
    path: `default(1) / ${node.typeLabel}: ${node.id} / ${node.portName}`,
    tier: node.typeLabel === "Host" ? 1 : 3,
    high_ber_severity: node.status === "degraded" ? "Warning" : "N/A",
    lid: 100 + (node.railId ?? portNumber),
    mirror: "disable",
    logical_state: link?.status ?? "Down",
    capabilities:
      node.typeLabel === "Switch"
        ? ["reset", "healthy_operations", "disable", "get_cables_info"]
        : ["reset", "healthy_operations", "disable"],
    mtu: isRoce ? 9216 : 4096,
    peer_port_dname: peerPort,
    severity: link?.severity ?? (node.status === "up" ? "Info" : "Warning"),
    active_speed: (link?.status ?? "Down") === "Active" ? (isRoce ? "400GbE" : "NDR") : null,
    enabled_speed: (link?.status ?? "Down") === "Active"
      ? isRoce
        ? ["100GbE", "200GbE", "400GbE"]
        : ["SDR", "DDR", "QDR", "FDR", "EDR", "HDR", "NDR"]
      : [],
    supported_speed: isRoce
      ? ["100GbE", "200GbE", "400GbE"]
      : ["SDR", "DDR", "QDR", "FDR", "EDR", "HDR", "NDR"],
    active_width: (link?.status ?? "Down") === "Active" ? (isRoce ? "1x" : "4x") : null,
    enabled_width: (link?.status ?? "Down") === "Active"
      ? isRoce
        ? ["1x"]
        : ["1x", "4x"]
      : [],
    supported_width: isRoce ? ["1x"] : ["1x", "4x"],
    dname: node.portName,
    peer_node_name: peerNodeId,
    peer: peerGuid === "N/A" ? "N/A" : `${peerGuid.replace(/^0x/, "")}_${Number.parseInt(peerPort.replace(/\D/g, ""), 10) || 1}`,
    peer_node_guid: peerGuid,
    systemID: node.guid.replace(/^0x/, ""),
    node_description: `${node.id}:${node.portName}`,
    label: node.portName,
    name: `${node.guid.replace(/^0x/, "")}_${portNumber}`,
    module: "N/A",
    peer_lid: peerGuid === "N/A" ? "N/A" : String(200 + (node.railId ?? portNumber)),
    peer_guid: peerGuid,
    peer_node_description: peerNodeId === "N/A" ? "N/A" : `${peerNodeId}:${peerPort}`,
    guid: node.guid,
    system_name: node.id,
    system_ip: node.systemIp,
    peer_ip: peerNodeId === "N/A" ? "N/A" : "10.209.36.20",
    system_capabilities:
      node.typeLabel === "Switch"
        ? ["ssh", "sysinfo", "reboot", "mark_device_unhealthy", "collect_system_dump", "sw_upgrade"]
        : ["mark_device_unhealthy"],
    system_mirroring_template: false,
    hw_technology: isRoce ? "Ethernet" : "InfiniBand",
    operating_mode: node.operatingMode === "roce" ? "RoCE" : "InfiniBand",
  };
}

export function buildUfmFabricModel(
  devices: LabDevice[],
  topologyState: TopologyState,
): UfmFabricModel {
  const rails = topologyState.rails ?? [];
  const nodes = buildNodes(devices, topologyState, rails);
  const links = buildLinks(nodes, rails);

  return { nodes, links };
}

export function buildUfmApiExampleFromModel({
  activeLabId,
  fabricModel,
  labConditions,
}: {
  activeLabId: string;
  fabricModel: UfmFabricModel;
  labConditions: Record<string, boolean>;
}): UfmApiExample {
  if (activeLabId === "lab15-rdma-rkey-exposure") {
    const isolationVerified = labConditions.pkeyIsolationVerified === true;

    return {
      endpoint: "GET /ufmRest/resources/pkeys/{pkey}",
      note:
        "Documented /ufmRest/resources/pkeys/<pkey>?guids_data=true shape, rendered from the lab's current PKey isolation state.",
      payload: isolationVerified
        ? {
            pkeys: [
              {
                partition: "TenantA_0x8001",
                ip_over_ib: true,
                guids: [
                  { membership: "full", guid: "506b4b0300a1b200", index0: false },
                  { membership: "limited", guid: "506b4b0300a1b210", index0: false },
                ],
              },
              {
                partition: "TenantB_0x8002",
                ip_over_ib: true,
                guids: [
                  { membership: "full", guid: "506b4b0300a1b202", index0: false },
                  { membership: "limited", guid: "506b4b0300a1b210", index0: false },
                ],
              },
            ],
          }
        : {
            warning: "Pre-verification state in this lab. Run the UFM PKey curl reads after hardening.",
            pkeys: [
              {
                partition: "TenantA_0x8001",
                ip_over_ib: true,
                guids: [
                  { membership: "full", guid: "506b4b0300a1b200", index0: false },
                  { membership: "full", guid: "506b4b0300a1b202", index0: false },
                ],
              },
            ],
          },
    };
  }

  const portRows = fabricModel.links.map((link) => {
    const node = fabricModel.nodes.find((entry) => entry.id === link.fromNodeId);
    if (!node) return null;
    return formatPortRecord(node, link);
  }).filter((row): row is ReturnType<typeof formatPortRecord> => Boolean(row));

  return {
    endpoint:
      activeLabId === "lab6-alert-triage"
        ? "GET /ufmRest/resources/ports?system=leaf-rail5&active=true"
        : "GET /ufmRest/resources/ports?active=true",
    note:
      "Documented UFM ports-resource response shape, generated from the same FabricLab fabric model as the topology view so link status, endpoint mapping, and RoCE-vs-InfiniBand port mode stay in sync.",
    payload: {
      total_resources: portRows.length,
      filtered_resources: portRows.length,
      num_of_pages: 1,
      first_index: portRows.length > 0 ? 1 : 0,
      last_index: portRows.length,
      data: portRows,
    },
  };
}
