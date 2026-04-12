import type { LabConfig, LabDevice } from "@/types"

export const lab19Devices: LabDevice[] = [
  {
    id: "leaf-01",
    type: "leaf-switch",
    label: "leaf-01",
    sublabel: "Spectrum-X SN5600",
    prompt: "cumulus@leaf-01:~$",
    osLabel: "Cumulus Linux 5.9",
    allowedCommands: [
      "nv show router adaptive-routing",
      "nv show router adaptive-routing detail",
      "nv show router adaptive-routing resilient-hash",
      "nv show interface swp49 adaptive-routing",
      "nv show interface swp50 adaptive-routing",
      "nv show interface swp51 adaptive-routing",
      "nv show interface swp52 adaptive-routing",
      "nv set router adaptive-routing mode per-packet",
      "nv set router adaptive-routing mode per-flowlet",
      "nv set router adaptive-routing flowlet-timer 100us",
      "nv set router adaptive-routing flowlet-timer 1s",
      "nv config apply",
      "nv show qos roce",
      "net show interface",
    ],
    position: { x: 200, y: 120 },
    status: "up",
  },
  {
    id: "spine-02",
    type: "spine-switch",
    label: "spine-02",
    sublabel: "Spectrum-X SN5600",
    prompt: "cumulus@spine-02:~$",
    osLabel: "Cumulus Linux 5.9",
    allowedCommands: [
      "nv show interface swp1 adaptive-routing",
      "nv show interface swp2 adaptive-routing",
      "nv show interface swp3 adaptive-routing",
      "nv show interface swp4 adaptive-routing",
      "nv show router adaptive-routing",
      "net show counters",
      "nv show interface swp1 link stats",
      "nv show interface swp2 link stats",
    ],
    position: { x: 420, y: 60 },
    status: "up",
  },
  {
    id: "dgx-node-01",
    type: "dgx",
    label: "dgx-node-01",
    sublabel: "DGX B200 / BF3 SuperNIC",
    prompt: "root@dgx-node-01:~#",
    osLabel: "Ubuntu 22.04 + MLNX OFED 23.10",
    allowedCommands: [
      "mlxlink -d /dev/mst/mt41692_pciconf0 --show_module | grep -i reorder",
      "mlxconfig -d /dev/mst/mt41692_pciconf0 q ROCE_REORDER_BUFFER_SIZE",
      "nv show interface eth0 reorder-buffer",
      "nv show interface eth1 reorder-buffer",
      "nv set interface eth0 reorder-buffer enable",
      "nv set interface eth1 reorder-buffer enable",
      "nv config apply",
      "ib_write_bw -d mlx5_0 -x 3 --report_gbits -D 30 -q 16 10.100.1.2",
      "ibstat",
      "rdma link show",
    ],
    position: { x: 200, y: 300 },
    status: "up",
  },
]

export const lab19: LabConfig = {
  id: "lab19-adaptive-routing-imbalance",
  title: "Lab 19 - Adaptive Routing Imbalance",
  difficulty: "advanced",
  scenario:
    "A 256-GPU training job ran at 72% of expected all-reduce throughput. "
    + "Grafana shows spine-02 at 91% utilization while spine-01/03/04 sit at 19-24%. "
    + "Adaptive Routing is configured but not functioning correctly. "
    + "AR was set to per-packet mode at the switch level, but the BF3 SuperNIC reorder buffer "
    + "was never enabled on the DGX B200 hosts. Spectrum-X detected this and automatically "
    + "fell back to per-flowlet AR. The flowlet timer also defaulted to 1 second - far too "
    + "long for continuous AI collective flows - causing nearly all flows to remain pinned "
    + "to their initial spine. Fix the root cause: enable SuperNIC reorder on the hosts, "
    + "then switch AR back to per-packet mode.",
  expectedMinutes: 40,
  initialTopology: {
    lbMode: "hash",
    unevenSpine: true,
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: false,
    silentCongestion: false,
    bufferUtilPct: 34,
    arEnabled: true,
    arMode: "per-flowlet",
    arModeConfigured: "per-packet",
    flowletTimerMs: 1000,
    supernicReorderEnabled: false,
    supernicReorderEth0Enabled: false,
    supernicReorderEth1Enabled: false,
    arLoadStdDev: 28,
    spine02UtilPct: 91,
    spine01UtilPct: 22,
    spine03UtilPct: 20,
    spine04UtilPct: 19,
  },
  requiredConditions: [
    "arStatusChecked",
    "imbalanceIdentified",
    "supernicReorderChecked",
    "supernicReorderEnabled",
    "flowletTimerFixed",
    "balanceVerified",
  ],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 120,
      text: "Run 'nv show router adaptive-routing' on leaf-01 first. Pay close attention to the Mode field - it may not match what was configured.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text: "The AR mode shows 'per-flowlet' even though the intent was 'per-packet'. This is an automatic safety fallback. Check the BF3 SuperNIC reorder buffer state on dgx-node-01 using 'nv show interface eth0 reorder-buffer' and 'mlxlink --show_module | grep -i reorder'.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 400,
      text: "The BF3 SuperNIC reorder buffer is disabled on the DGX B200 host. Fix order: (1) on dgx-node-01 run 'nv set interface eth0 reorder-buffer enable', 'nv set interface eth1 reorder-buffer enable', then 'nv config apply'. (2) on leaf-01 run 'nv set router adaptive-routing mode per-packet' then 'nv config apply'. Then verify with 'nv show router adaptive-routing detail' - Load Std Deviation should drop below 5%.",
    },
  ],
}
