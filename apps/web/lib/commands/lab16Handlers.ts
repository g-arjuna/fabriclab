// lab16Handlers.ts
// Lab 16 — Spectrum-X Platform Bring-Up Audit
// Devices: leaf-01 (SN5600), leaf-02 (SN5600), storage-01 (SN4600C)
// All handlers are STATE-AWARE: output differs before/after condition is met.

import type { CommandResult } from "@/types"
import { useLabStore } from "@/store/labStore"

// ─── Task 1: nv --version ────────────────────────────────────────────────────

export function handleNvVersion(): CommandResult {
  const { setCondition, markVerified, topology } = useLabStore.getState()
  const t = topology as any
  setCondition("clVersionVerified", true)
  markVerified("clVersionVerified")
  return {
    output: `NVUE version 1.4.0
Cumulus Linux 5.4.0
Build: Cumulus Linux 5.4.0 2024-01-15T08:22:14+00:00
git commit: a8f31c2e`,
    conceptId: "nvue-version",
    type: "success",
  }
}

// ─── Task 1: cl-platform-info ────────────────────────────────────────────────

export function handleClPlatformInfo(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const t = topology as any
  const alreadyVerified = t.clVersionVerified ?? false
  if (!alreadyVerified) {
    setCondition("clVersionVerified", true)
  }
  markVerified("clVersionVerified")
  return {
    output: `Platform: x86_64-mlnx_msn5600-r0
NOS: Cumulus Linux 5.4.0
Kernel: 5.10.0-18-2-amd64
ONIE version: 2022.05.00.10
CPU: Intel Atom C3758 @ 2.2GHz (8 cores)
RAM: 16384 MB
SSD: 59 GB
ASIC: Mellanox Spectrum-4 (MT3700)
Port configuration: 64x400GbE QSFP112
Serial number: MT2219T15280
Manufacture date: 2022-08-04`,
    conceptId: "cumulus-platform",
    type: "success",
  }
}

// ─── Task 2: nv show interface (leaf-01) ─────────────────────────────────────

export function handleNvShowInterfaceLeaf01(): CommandResult {
  const { setCondition, markVerified, topology } = useLabStore.getState()
  const t = topology as any
  const prevAudited = t.portsAudited ?? false
  // Mark ports audited once all three devices are checked — checked via flag
  useLabStore.getState().setTopology({
    ...(topology as object),
    leaf01PortsChecked: true,
  } as any)
  const leaf02Checked = t.leaf02PortsChecked ?? false
  const storageChecked = t.storagePortsChecked ?? false
  if (leaf02Checked && storageChecked) {
    setCondition("portsAudited", true)
    markVerified("portsAudited")
  }
  return {
    output: `Interface  State  Speed   MTU   Mode      RemoteHost          RemotePort
---------  -----  ------  ----  --------  ------------------  ----------
swp1       up     400G    1500  Default   dgx-01              mlx5_0
swp2       up     400G    1500  Default   dgx-02              mlx5_0
swp3       up     400G    1500  Default   dgx-03              mlx5_0
swp4       up     400G    1500  Default   dgx-04              mlx5_0
swp5       up     400G    1500  Default   dgx-05              mlx5_0
swp6       up     400G    1500  Default   dgx-06              mlx5_0
swp7       up     400G    1500  Default   dgx-07              mlx5_0
swp8       up     400G    1500  Default   dgx-08              mlx5_0
swp9       up     400G    1500  Default   dgx-01              mlx5_1
swp10      up     400G    1500  Default   dgx-02              mlx5_1
swp11      up     400G    1500  Default   dgx-03              mlx5_1
swp12      up     400G    1500  Default   dgx-04              mlx5_1
swp13      up     400G    1500  Default   dgx-05              mlx5_1
swp14      up     400G    1500  Default   dgx-06              mlx5_1
swp15      up     400G    1500  Default   dgx-07              mlx5_1
swp16      up     400G    1500  Default   dgx-08              mlx5_1
swp17      up     400G    1500  Default   dgx-01              mlx5_4
swp18      up     400G    1500  Default   dgx-02              mlx5_4
swp19      up     400G    1500  Default   dgx-03              mlx5_4
swp20      up     400G    1500  Default   dgx-04              mlx5_4
swp21      up     400G    1500  Default   dgx-05              mlx5_4
swp22      up     400G    1500  Default   dgx-06              mlx5_4
swp23      up     400G    1500  Default   dgx-07              mlx5_4
swp24      up     400G    1500  Default   dgx-08              mlx5_4
swp25      up     400G    1500  Default   dgx-01              mlx5_5
swp26      up     400G    1500  Default   dgx-02              mlx5_5
swp27      up     400G    1500  Default   dgx-03              mlx5_5
swp28      up     400G    1500  Default   dgx-04              mlx5_5
swp29      up     400G    1500  Default   dgx-05              mlx5_5
swp30      up     400G    1500  Default   dgx-06              mlx5_5
swp31      up     400G    1500  Default   dgx-07              mlx5_5
swp32      up     400G    1500  Default   dgx-08              mlx5_5
eth0       up     1G      1500  Mgmt      oob-mgmt-switch     swp5

Ports up: 32/32 (server-facing) ✓  MTU: ALL at 1500 (action required: set to 9216)`,
    conceptId: "port-audit",
    type: "success",
  }
}

// ─── Task 2: nv show interface (leaf-02) ─────────────────────────────────────

export function handleNvShowInterfaceLeaf02(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const t = topology as any
  useLabStore.getState().setTopology({
    ...(topology as object),
    leaf02PortsChecked: true,
  } as any)
  const leaf01Checked = t.leaf01PortsChecked ?? false
  const storageChecked = t.storagePortsChecked ?? false
  if (leaf01Checked && storageChecked) {
    setCondition("portsAudited", true)
    markVerified("portsAudited")
  }
  return {
    output: `Interface  State  Speed   MTU   Mode      RemoteHost          RemotePort
---------  -----  ------  ----  --------  ------------------  ----------
swp1       up     400G    1500  Default   dgx-01              mlx5_2
swp2       up     400G    1500  Default   dgx-02              mlx5_2
swp3       up     400G    1500  Default   dgx-03              mlx5_2
swp4       up     400G    1500  Default   dgx-04              mlx5_2
swp5       up     400G    1500  Default   dgx-05              mlx5_2
swp6       up     400G    1500  Default   dgx-06              mlx5_2
swp7       up     400G    1500  Default   dgx-07              mlx5_2
swp8       up     400G    1500  Default   dgx-08              mlx5_2
swp9       up     400G    1500  Default   dgx-01              mlx5_3
swp10      up     400G    1500  Default   dgx-02              mlx5_3
swp11      up     400G    1500  Default   dgx-03              mlx5_3
swp12      up     400G    1500  Default   dgx-04              mlx5_3
swp13      up     400G    1500  Default   dgx-05              mlx5_3
swp14      up     400G    1500  Default   dgx-06              mlx5_3
swp15      up     400G    1500  Default   dgx-07              mlx5_3
swp16      up     400G    1500  Default   dgx-08              mlx5_3
swp17      up     400G    1500  Default   dgx-01              mlx5_6
swp18      up     400G    1500  Default   dgx-02              mlx5_6
swp19      up     400G    1500  Default   dgx-03              mlx5_6
swp20      up     400G    1500  Default   dgx-04              mlx5_6
swp21      up     400G    1500  Default   dgx-05              mlx5_6
swp22      up     400G    1500  Default   dgx-06              mlx5_6
swp23      up     400G    1500  Default   dgx-07              mlx5_6
swp24      up     400G    1500  Default   dgx-08              mlx5_6
swp25      up     400G    1500  Default   dgx-01              mlx5_7
swp26      up     400G    1500  Default   dgx-02              mlx5_7
swp27      up     400G    1500  Default   dgx-03              mlx5_7
swp28      up     400G    1500  Default   dgx-04              mlx5_7
swp29      up     400G    1500  Default   dgx-05              mlx5_7
swp30      up     400G    1500  Default   dgx-06              mlx5_7
swp31      up     400G    1500  Default   dgx-07              mlx5_7
swp32      up     400G    1500  Default   dgx-08              mlx5_7

Ports up: 32/32 (server-facing) ✓  MTU: ALL at 1500 (action required: set to 9216)`,
    conceptId: "port-audit",
    type: "success",
  }
}

// ─── Task 2: nv show interface (storage-01) ──────────────────────────────────

export function handleNvShowInterfaceStorage(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const t = topology as any
  useLabStore.getState().setTopology({
    ...(topology as object),
    storagePortsChecked: true,
  } as any)
  const leaf01Checked = t.leaf01PortsChecked ?? false
  const leaf02Checked = t.leaf02PortsChecked ?? false
  if (leaf01Checked && leaf02Checked) {
    setCondition("portsAudited", true)
    markVerified("portsAudited")
  }
  return {
    output: `Interface  State  Speed   MTU   Mode      RemoteHost          RemotePort
---------  -----  ------  ----  --------  ------------------  ----------
swp1       up     400G    1500  Default   dgx-01              mlx5_7
swp2       up     400G    1500  Default   dgx-02              mlx5_7
swp3       up     400G    1500  Default   dgx-03              mlx5_7
swp4       up     400G    1500  Default   dgx-04              mlx5_7
swp5       up     400G    1500  Default   dgx-05              mlx5_7
swp6       up     400G    1500  Default   dgx-06              mlx5_7
swp7       up     400G    1500  Default   dgx-07              mlx5_7
swp8       up     400G    1500  Default   dgx-08              mlx5_7
swp9       up     400G    1500  Default   storage-array-01    eth0
swp10      up     400G    1500  Default   storage-array-01    eth1
swp11      up     400G    1500  Default   storage-array-02    eth0
swp12      up     400G    1500  Default   storage-array-02    eth1
swp13      down   --      1500  Default   (no link)
swp14      down   --      1500  Default   (no link)
swp15      down   --      1500  Default   (no link)
swp16      down   --      1500  Default   (no link)

Ports up: 12/16 (expected: 12 with 4 spare) ✓  MTU: ALL at 1500 (action required)`,
    conceptId: "port-audit",
    type: "success",
  }
}

// ─── Task 3: decode-syseeprom (leaf-01) ──────────────────────────────────────

export function handleDecodeSyseepromLeaf01(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const t = topology as any
  useLabStore.getState().setTopology({
    ...(topology as object),
    leaf01EepromChecked: true,
  } as any)
  const storageEepromChecked = t.storageEepromChecked ?? false
  const netstatChecked = t.netstatChecked ?? false
  if (storageEepromChecked && netstatChecked) {
    setCondition("asicHealthChecked", true)
    markVerified("asicHealthChecked")
  }
  return {
    output: `TlvInfo Header:
  Id String:    TlvInfo
  Version:      1
  Total Length: 395

TLV Name             Code    Len    Value
-------------------  ------  -----  ------------------------------------
Product Name         0x21    14     MSN5600-CS2FO
Part Number          0x22    20     920-9N110-00R7-0N0
Serial Number        0x23    24     MT2219T15280
Base MAC Address     0x24    6      04:3F:72:AF:81:20
Manufacture Date     0x25    19     2022-08-04 00:00:00
Device Version       0x26    1      4
Label Revision       0x27    4      A1
Platform Name        0x28    28     x86_64-mlnx_msn5600-r0
Vendor Name          0x2D    7      Mellanox
ONIE Version         0x29    15     2022.05.00.10
CRC-32               0xFE    4      0x73CB6A19

# Confirmed: MSN5600 = SN5600 = Spectrum-4 ASIC ✓`,
    conceptId: "decode-syseeprom",
    type: "success",
  }
}

// ─── Task 3: decode-syseeprom (storage-01) ───────────────────────────────────

export function handleDecodeSyseepromStorage(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const t = topology as any
  useLabStore.getState().setTopology({
    ...(topology as object),
    storageEepromChecked: true,
  } as any)
  const leaf01EepromChecked = t.leaf01EepromChecked ?? false
  const netstatChecked = t.netstatChecked ?? false
  if (leaf01EepromChecked && netstatChecked) {
    setCondition("asicHealthChecked", true)
    markVerified("asicHealthChecked")
  }
  return {
    output: `TlvInfo Header:
  Id String:    TlvInfo
  Version:      1
  Total Length: 381

TLV Name             Code    Len    Value
-------------------  ------  -----  ------------------------------------
Product Name         0x21    14     MSN4600C-DQBN
Part Number          0x22    20     920-9N122-00R7-0N0
Serial Number        0x23    24     MT2220T09841
Base MAC Address     0x24    6      04:3F:72:B2:44:10
Manufacture Date     0x25    19     2022-09-01 00:00:00
Device Version       0x26    1      2
Platform Name        0x28    29     x86_64-mlnx_msn4600c-r0
Vendor Name          0x2D    7      Mellanox

# Confirmed: MSN4600C = SN4600C = Storage leaf switch ✓
# NOTE: This is NOT an SN5600. Correct — storage leaf role requires SN4600C.`,
    conceptId: "decode-syseeprom",
    type: "success",
  }
}

// ─── Task 3: cl-netstat ──────────────────────────────────────────────────────

export function handleClNetstat(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const t = topology as any
  useLabStore.getState().setTopology({
    ...(topology as object),
    netstatChecked: true,
  } as any)
  const leaf01EepromChecked = t.leaf01EepromChecked ?? false
  const storageEepromChecked = t.storageEepromChecked ?? false
  if (leaf01EepromChecked && storageEepromChecked) {
    setCondition("asicHealthChecked", true)
    markVerified("asicHealthChecked")
  }
  return {
    output: `Kernel Interface table
Iface      MTU    Met  RX-OK     RX-ERR  RX-DRP  RX-OVR  TX-OK     TX-ERR  TX-DRP  TX-OVR  Flags
swp1       1500   0    0         0       0       0       0         0       0       0       BMRU
swp2       1500   0    0         0       0       0       0         0       0       0       BMRU
swp3       1500   0    0         0       0       0       0         0       0       0       BMRU
swp4       1500   0    0         0       0       0       0         0       0       0       BMRU
swp5       1500   0    0         0       0       0       0         0       0       0       BMRU
swp6       1500   0    0         0       0       0       0         0       0       0       BMRU
swp7       1500   0    0         0       0       0       0         0       0       0       BMRU
swp8       1500   0    0         0       0       0       0         0       0       0       BMRU

ASIC forwarding counters (via switchd):
  Total packets forwarded:  0
  L3 IPv4 packets:          0
  L3 IPv6 packets:          0
  FCS errors:               0    ← CLEAN
  Alignment errors:         0    ← CLEAN
  Symbol errors:            0    ← CLEAN
  Ingress drops:            0    ← CLEAN
  Egress drops:             0    ← CLEAN

ASIC health: PASS ✓ (all error counters zero at factory default)`,
    conceptId: "cl-netstat",
    type: "success",
  }
}

// ─── Task 4: ip link show | grep mtu (leaf-01) ───────────────────────────────

export function handleIpLinkShowMtuLeaf01(): CommandResult {
  const { setCondition, markVerified } = useLabStore.getState()
  setCondition("mtuVerified", true)
  markVerified("mtuVerified")
  return {
    output: `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 ...
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 ...
4: swp1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 ...   ← ACTION REQUIRED
5: swp2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 ...   ← ACTION REQUIRED
6: swp3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 ...   ← ACTION REQUIRED
7: swp4: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 ...   ← ACTION REQUIRED
8: swp5: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 ...   ← ACTION REQUIRED
9: swp6: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 ...   ← ACTION REQUIRED
10: swp7: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 ...  ← ACTION REQUIRED
11: swp8: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 ...  ← ACTION REQUIRED
[... swp9–swp32 all mtu 1500 ...]

AUDIT RESULT: All server-facing ports at MTU 1500.
Required: MTU 9216 on swp1-32 before RoCE configuration.
Action: Will be set via NVUE in Lab 17:
  nv set interface swp1-32 link mtu 9216
  nv config apply`,
    conceptId: "mtu-jumbo",
    type: "info",
  }
}

// ─── Task 5: nv show router bgp ──────────────────────────────────────────────

export function handleNvShowRouterBgp(): CommandResult {
  const { setCondition, markVerified } = useLabStore.getState()
  setCondition("bgpClean", true)
  markVerified("bgpClean")
  return {
    output: `No BGP configuration found.

nv show router bgp
No output — BGP is not configured.

FRR BGP daemon status:
  bgpd is not running (no config file present)

AUDIT RESULT: BGP baseline CLEAN ✓
No peers, no ASN, no policy configured.
Ready for Spectrum-X BGP unnumbered configuration in Lab 17.`,
    conceptId: "bgp-baseline",
    type: "success",
  }
}

// ─── Task 6: help command ────────────────────────────────────────────────────

export function handleSubmitAuditReport(): CommandResult {
  const { setCondition, markVerified } = useLabStore.getState()
  setCondition("auditReportComplete", true)
  markVerified("auditReportComplete")

  return {
    output: `Audit report submitted.

Summary:
  NVUE / CL version: PASS
  Port bring-up: PASS
  ASIC identity and forwarding counters: PASS
  MTU baseline: REQUIRES DAY-ZERO UPDATE TO 9216
  BGP baseline: CLEAN

Next action:
  Proceed to the RoCE day-zero configuration workflow.`,
    conceptId: "spectrum-x",
    type: "success",
  }
}

export function handleHelp(): CommandResult {
  return {
    output: `Lab 16 — Spectrum-X Platform Bring-Up Audit
Available commands by task:

Task 1 (CL version):  nv --version · cl-platform-info
Task 2 (port audit):  nv show interface | grep -E "swp|state"
Task 3 (ASIC check):  decode-syseeprom · cl-netstat
Task 4 (MTU check):   ip link show | grep mtu
Task 5 (BGP check):   nv show router bgp
Task 6 (submit):      submit audit report

Run commands on the correct device (leaf-01, leaf-02, or storage-01).`,
    type: "info",
  }
}

// ════════════════════════════════════════════════════════════════════
// WIRING MAP — paste these additions into the integration files
// ════════════════════════════════════════════════════════════════════
//
// 1. EXACT_HANDLERS in commandHandler.ts (add inside the handlers map):
//
//   "leaf-01::nv --version": handleNvVersion,
//   "leaf-01::cl-platform-info": handleClPlatformInfo,
//   "leaf-01::nv show interface": handleNvShowInterfaceLeaf01,
//   "leaf-01::nv show interface | grep -E \"swp|state\"": handleNvShowInterfaceLeaf01,
//   "leaf-02::nv show interface": handleNvShowInterfaceLeaf02,
//   "leaf-02::nv show interface | grep -E \"swp|state\"": handleNvShowInterfaceLeaf02,
//   "storage-01::nv show interface": handleNvShowInterfaceStorage,
//   "storage-01::nv show interface | grep -E \"swp|state\"": handleNvShowInterfaceStorage,
//   "leaf-01::decode-syseeprom": handleDecodeSyseepromLeaf01,
//   "storage-01::decode-syseeprom": handleDecodeSyseepromStorage,
//   "leaf-01::cl-netstat": handleClNetstat,
//   "leaf-01::ip link show | grep mtu": handleIpLinkShowMtuLeaf01,
//   "leaf-01::ip link show": handleIpLinkShowMtuLeaf01,
//   "leaf-01::nv show router bgp": handleNvShowRouterBgp,
//   "leaf-01::help": handleHelp,
//   "leaf-02::help": handleHelp,
//   "storage-01::help": handleHelp,
//
// 2. runMutation() cases in mutations.ts:
//   (no mutation commands in this lab — all are read-only audits)
//
// 3. New KNOWN_COMMANDS in commandCatalog.ts:
//   "nv --version"
//   "cl-platform-info"
//   "decode-syseeprom"
//   "cl-netstat"
//   "ip link show | grep mtu"
//   "nv show router bgp"
//
// 4. New TopologyState fields in types/index.ts (add to interface):
//   clVersionVerified?: boolean
//   portsAudited?: boolean
//   asicHealthChecked?: boolean
//   mtuVerified?: boolean
//   bgpClean?: boolean
//   auditReportComplete?: boolean
//   leaf01PortsChecked?: boolean
//   leaf02PortsChecked?: boolean
//   storagePortsChecked?: boolean
//   leaf01EepromChecked?: boolean
//   storageEepromChecked?: boolean
//   netstatChecked?: boolean
//   leaf01ProductName?: string
//   leaf02ProductName?: string
//   storage01ProductName?: string
//   leaf01PortsUp?: number
//   leaf02PortsUp?: number
//   storage01PortsUp?: number
//   leaf01MtuCurrent?: number
//   bgpPeersConfigured?: number
