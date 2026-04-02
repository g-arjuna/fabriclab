"use client";

import { useState } from "react";

// RedfishAPIViz -- Interactive Redfish resource tree
// Shows the URI hierarchy and sample JSON responses for key operations

type Node = {
  id: string;
  uri: string;
  label: string;
  method?: "GET" | "POST";
  color: string;
  children?: string[];
  response: string;
  note: string;
};

const NODES: Record<string, Node> = {
  root: {
    id: "root", uri: "GET /redfish/v1/", label: "ServiceRoot", color: "#6366f1",
    children: ["systems", "managers", "chassis"],
    response: `{
  "@odata.type": "#ServiceRoot.v1_15_0.ServiceRoot",
  "Id": "RootService",
  "Name": "Root Service",
  "RedfishVersion": "1.15.0",
  "Systems": { "@odata.id": "/redfish/v1/Systems" },
  "Managers": { "@odata.id": "/redfish/v1/Managers" },
  "Chassis": { "@odata.id": "/redfish/v1/Chassis" },
  "UpdateService": { "@odata.id": "/redfish/v1/UpdateService" }
}`,
    note: "The API root. Self-describing -- you can discover everything from here without reading documentation.",
  },
  systems: {
    id: "systems", uri: "GET /redfish/v1/Systems/1", label: "ComputerSystem", color: "#0ea5e9",
    children: ["processors", "reset", "bios"],
    response: `{
  "Id": "1",
  "Name": "DGX H100",
  "SystemType": "Physical",
  "Status": {
    "State": "Enabled",
    "Health": "OK"
  },
  "PowerState": "On",
  "ProcessorSummary": {
    "Count": 2,
    "Model": "Intel(R) Xeon(R) Platinum 8480+"
  },
  "MemorySummary": {
    "TotalSystemMemoryGiB": 2048
  },
  "Actions": {
    "#ComputerSystem.Reset": {
      "target": "/redfish/v1/Systems/1/Actions/ComputerSystem.Reset",
      "ResetType@Redfish.AllowableValues": [
        "On", "ForceOff", "GracefulShutdown",
        "ForceRestart", "PowerCycle"
      ]
    }
  }
}`,
    note: "The host computer system resource. This is where you find inventory and power control actions.",
  },
  processors: {
    id: "processors", uri: "GET /redfish/v1/Systems/1/Processors/0", label: "CPU Detail", color: "#0ea5e9",
    children: [],
    response: `{
  "Id": "0",
  "Name": "CPU 0",
  "Model": "Intel(R) Xeon(R) Platinum 8480+",
  "TotalCores": 60,
  "TotalThreads": 120,
  "MaxSpeedMHz": 3800,
  "Status": { "State": "Enabled", "Health": "OK" }
}`,
    note: "Per-CPU detail. Useful for verifying NUMA topology and checking for thermal throttling (check MaxSpeedMHz vs current).",
  },
  reset: {
    id: "reset", uri: "POST /redfish/v1/Systems/1/Actions/ComputerSystem.Reset", label: "Power Control", color: "#ef4444",
    method: "POST",
    children: [],
    response: `# GracefulShutdown -- asks OS to shut down cleanly
curl -sk -u admin:pass -X POST \\
  https://10.0.1.10/redfish/v1/Systems/1/Actions/ComputerSystem.Reset \\
  -H 'Content-Type: application/json' \\
  -d '{"ResetType": "GracefulShutdown"}'

# PowerCycle -- hard cycle, no OS involvement
curl -sk -u admin:pass -X POST \\
  https://10.0.1.10/redfish/v1/Systems/1/Actions/ComputerSystem.Reset \\
  -H 'Content-Type: application/json' \\
  -d '{"ResetType": "PowerCycle"}'

# Returns HTTP 204 No Content on success`,
    note: "The most frequently used Redfish action. GracefulShutdown triggers ACPI shutdown. PowerCycle cuts power immediately -- use when host is hung.",
  },
  bios: {
    id: "bios", uri: "GET /redfish/v1/Systems/1/Bios", label: "BIOS Settings", color: "#a78bfa",
    children: [],
    response: `{
  "Id": "Bios",
  "Name": "BIOS Configuration",
  "Attributes": {
    "BootMode": "UEFI",
    "SRIOVGlobalEnable": "Enabled",
    "IntelVirtualizationTechnology": "Enabled",
    "NumaNodesPerSocket": "2",
    "PcieAriSupport": "Enabled",
    "MemoryPatrolScrub": "Enabled"
  }
}`,
    note: "BIOS attribute store. Key attributes for DGX: SR-IOV must be Enabled for MIG/vGPU, PCIe ARI needed for BlueField-3 function-level enumeration.",
  },
  managers: {
    id: "managers", uri: "GET /redfish/v1/Managers/1", label: "BMC Manager", color: "#22c55e",
    children: ["eth_bmc", "logs", "update"],
    response: `{
  "Id": "1",
  "Name": "Manager",
  "ManagerType": "BMC",
  "FirmwareVersion": "24.01.02",
  "Status": { "State": "Enabled", "Health": "OK" },
  "EthernetInterfaces": {
    "@odata.id": "/redfish/v1/Managers/1/EthernetInterfaces"
  },
  "LogServices": {
    "@odata.id": "/redfish/v1/Managers/1/LogServices"
  },
  "VirtualMedia": {
    "@odata.id": "/redfish/v1/Managers/1/VirtualMedia"
  }
}`,
    note: "The BMC itself as a Redfish resource. Firmware version here is the BMC firmware (NVSM), not the DGX host OS or NIC firmware.",
  },
  eth_bmc: {
    id: "eth_bmc", uri: "GET /redfish/v1/Managers/1/EthernetInterfaces/eth0", label: "BMC NIC Config", color: "#22c55e",
    children: [],
    response: `{
  "Id": "eth0",
  "Name": "Manager Ethernet Interface",
  "MACAddress": "a0:88:c2:01:02:03",
  "LinkStatus": "LinkUp",
  "SpeedMbps": 1000,
  "IPv4Addresses": [{
    "Address": "10.0.1.10",
    "SubnetMask": "255.255.255.0",
    "Gateway": "10.0.1.1",
    "AddressOrigin": "Static"
  }]
}`,
    note: "The BMC's own 1GbE interface configuration. This is how you read or change the BMC IP address without ipmitool. Use PATCH to change the IP if needed (check Redfish spec for update pattern).",
  },
  logs: {
    id: "logs", uri: "GET /redfish/v1/Managers/1/LogServices/Log/Entries", label: "Event Log", color: "#f87171",
    children: [],
    response: `{
  "Members": [
    {
      "Id": "1",
      "EntryType": "Event",
      "Severity": "Critical",
      "Created": "2026-03-30T04:22:11Z",
      "Message": "CPU 0 temperature exceeded upper critical threshold. Reading: 98C, Threshold: 95C",
      "SensorType": "Temperature",
      "SensorNumber": 12
    },
    {
      "Id": "2",
      "EntryType": "Event",
      "Severity": "Warning",
      "Created": "2026-03-30T04:20:05Z",
      "Message": "Fan 3 speed below lower critical threshold"
    }
  ]
}`,
    note: "The Redfish event log (equivalent to IPMI SEL). More readable than raw ipmitool sel output. Filter by Severity:Critical for automated alerting.",
  },
  update: {
    id: "update", uri: "POST UpdateService.SimpleUpdate", label: "Firmware Update", color: "#f59e0b",
    method: "POST",
    children: [],
    response: `# Update BMC firmware via HTTP (server must be reachable by BMC)
curl -sk -u admin:pass -X POST \\
  https://10.0.1.10/redfish/v1/UpdateService/Actions/UpdateService.SimpleUpdate \\
  -H 'Content-Type: application/json' \\
  -d '{
    "ImageURI": "http://10.0.0.1/firmware/dgx-bmc-24.1.bin",
    "TransferProtocol": "HTTP",
    "Targets": ["/redfish/v1/Managers/1"]
  }'

# Monitor update task
curl -sk -u admin:pass \\
  https://10.0.1.10/redfish/v1/TaskService/Tasks/1 | jq .PercentComplete`,
    note: "Firmware update via Redfish is more reliable than IPMI firmware update for large images. The BMC fetches the image from the URI rather than the client pushing it, which avoids IPMI session timeouts during large transfers.",
  },
  chassis: {
    id: "chassis", uri: "GET /redfish/v1/Chassis/1", label: "Physical Chassis", color: "#f59e0b",
    children: ["thermal", "power"],
    response: `{
  "Id": "1",
  "Name": "DGX H100 Chassis",
  "ChassisType": "RackMount",
  "PowerState": "On",
  "Thermal": { "@odata.id": "/redfish/v1/Chassis/1/Thermal" },
  "Power": { "@odata.id": "/redfish/v1/Chassis/1/Power" }
}`,
    note: "The physical chassis resource. Links to Thermal (temperatures and fans) and Power (PSU readings, watt consumption).",
  },
  thermal: {
    id: "thermal", uri: "GET /redfish/v1/Chassis/1/Thermal", label: "Temperatures/Fans", color: "#f59e0b",
    children: [],
    response: `{
  "Temperatures": [
    { "Name": "CPU 0 Temp", "ReadingCelsius": 62,
      "UpperThresholdCritical": 95, "Status": {"Health": "OK"} },
    { "Name": "GPU 0 Temp", "ReadingCelsius": 74,
      "UpperThresholdCritical": 90, "Status": {"Health": "OK"} },
    { "Name": "Inlet Temp", "ReadingCelsius": 23 }
  ],
  "Fans": [
    { "Name": "Fan 1", "Reading": 8400, "ReadingUnits": "RPM",
      "LowerThresholdCritical": 1200, "Status": {"Health": "OK"} }
  ]
}`,
    note: "All temperature sensors and fan speeds in one call. Parse Temperatures array for GPU temps -- these are independent of DCGM (which reads GPU temps directly via driver). Useful when DGX is powered off and you need thermal history from BMC.",
  },
  power: {
    id: "power", uri: "GET /redfish/v1/Chassis/1/Power", label: "Power Draw", color: "#f59e0b",
    children: [],
    response: `{
  "PowerControl": [{
    "Name": "System Power Control",
    "PowerConsumedWatts": 5840,
    "PowerCapacityWatts": 10200,
    "PowerMetrics": {
      "MinConsumedWatts": 4200,
      "MaxConsumedWatts": 9800,
      "AverageConsumedWatts": 6100
    }
  }],
  "PowerSupplies": [
    { "Name": "PSU 0", "PowerInputWatts": 2950,
      "PowerOutputWatts": 2800, "Status": {"Health":"OK"} },
    { "Name": "PSU 1", "PowerInputWatts": 2890, "Status": {"Health":"OK"} }
  ]
}`,
    note: "Real-time power draw. A DGX H100 under full GPU load draws up to 10.2 kW. PowerConsumedWatts here is the BMC's instantaneous reading from the power telemetry chip, independent of any GPU-side tools.",
  },
};

const TREE_ORDER = ["root", "systems", "processors", "reset", "bios", "managers", "eth_bmc", "logs", "update", "chassis", "thermal", "power"];

const INDENT: Record<string, number> = {
  root: 0, systems: 1, processors: 2, reset: 2, bios: 2,
  managers: 1, eth_bmc: 2, logs: 2, update: 2,
  chassis: 1, thermal: 2, power: 2,
};

export function RedfishAPIViz() {
  const [selected, setSelected] = useState<string>("root");
  const node = NODES[selected];

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 820 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Redfish API</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>Resource Tree Explorer</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {/* Tree sidebar */}
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 0", overflowY: "auto", maxHeight: 480 }}>
          {TREE_ORDER.map((id) => {
            const n = NODES[id];
            const indent = INDENT[id];
            return (
              <div
                key={id}
                onClick={() => setSelected(id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: `5px ${10 + indent * 16}px`,
                  cursor: "pointer",
                  background: selected === id ? n.color + "22" : "transparent",
                  borderLeft: `2px solid ${selected === id ? n.color : "transparent"}`,
                  transition: "all 0.1s",
                }}
              >
                {indent > 0 && (
                  <div style={{ width: 12, height: 1, background: "#334155", flexShrink: 0 }} />
                )}
                <div style={{ width: 6, height: 6, borderRadius: 1, background: n.color, flexShrink: 0 }} />
                <div style={{ fontSize: 11, color: selected === id ? n.color : "#94a3b8", lineHeight: 1.3 }}>
                  <div style={{ fontWeight: selected === id ? 700 : 400 }}>{n.label}</div>
                  <div style={{ fontSize: 9, color: "#475569" }}>
                    {n.method && <span style={{ color: n.method === "POST" ? "#ef4444" : "#22c55e", marginRight: 4 }}>{n.method}</span>}
                    {n.uri.replace("GET ", "").replace("POST ", "").split(" ")[0].slice(0, 28)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        <div>
          <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px", marginBottom: 10, borderLeft: `3px solid ${node.color}` }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
              {node.method && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                  background: node.method === "POST" ? "#7f1d1d" : "#14532d",
                  color: node.method === "POST" ? "#fca5a5" : "#4ade80",
                }}>
                  {node.method}
                </span>
              )}
              <div style={{ fontSize: 12, color: node.color, fontWeight: 700 }}>{node.label}</div>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>{node.note}</div>
          </div>

          <div style={{ background: "#1e293b", borderRadius: 8, overflow: "hidden", maxHeight: 340, overflowY: "auto" }}>
            <div style={{ padding: "6px 12px", background: "#334155", fontSize: 10, color: "#94a3b8" }}>
              {node.uri}
            </div>
            <pre style={{ margin: 0, padding: "10px 12px", fontSize: 10, color: "#22c55e", lineHeight: 1.6, overflowX: "auto" }}>
              {node.response}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RedfishAPIViz;
