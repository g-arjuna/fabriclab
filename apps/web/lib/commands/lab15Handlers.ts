// lab15Handlers.ts
// Command handlers for lab15-rdma-rkey-exposure.
//
// ─── WIRING MAP ───────────────────────────────────────────────────────────────
// EXACT_HANDLERS (add to commandHandler.ts):
//   "show mr info":                    showMrInfo,
//   "ibv_devinfo -d mlx5_0 -i 1":     ibvDevInfoGid,
//   "show gid filter":                 showGidFilter,
//   "show mr info after":              showMrInfoAfter,
//   "ibv_devinfo -d mlx5_0":          ibvDevInfoTenantB,
//   "ibv_rc_pingpong -d mlx5_0 -g 1": ibvRcPingpong,
//   "show qos trust dscp-map":        showQosTrustDscpMap,
//   "nv show interface swp1 qos":     nvShowInterfaceSwp1Qos,
//   "show gvmi table":                showGvmiTable,
//   "show ufm pkey table":            showUfmPkeyTable,
//   "show ufm events":                showUfmEvents,
//   "set pkey tenanta 0x8001":        setPkeyTenantA,
//   "set pkey tenantb 0x8002":        setPkeyTenantB,
//
// runMutation() cases (add to mutations.ts):
//   case "enable gid filter":         return enableGidFilter()
//   case "ibv_reg_mr rotate":         return ibvRegMrRotate()
//   case "rkey scan":                 return rkeyScan()
//   (rkey scan is mutation because it sets rkeyVulnerabilityReproduced
//    the first time and attackBlocked after fixes applied)
//
// New KNOWN_COMMANDS to add to commandCatalog.ts:
//   "show mr info",
//   "ibv_devinfo -d mlx5_0 -i 1",
//   "show gid filter",
//   "enable gid filter",
//   "ibv_reg_mr rotate",
//   "show mr info after",
//   "rkey scan",
//   "ibv_devinfo -d mlx5_0",
//   "ibv_rc_pingpong -d mlx5_0 -g 1",
//   "show gvmi table",
//   "show ufm pkey table",
//   "show ufm events",
//   "set pkey tenanta 0x8001",
//   "set pkey tenantb 0x8002",
//
// New KNOWN_VERBS to add to commandCatalog.ts (if not present):
//   "ibv_devinfo", "ibv_rc_pingpong", "ibv_reg_mr"
//
// New TopologyState fields to add to types/index.ts:
//   gidFilterEnabled?: boolean
//   rkeyRotated?: boolean
//
// New lab in mutations.ts LAB_CONFIGS map:
//   import { lab15 } from "@/data/labs/lab15-rdma-rkey-exposure"
//   [lab15.id]: lab15,

import type { CommandResult } from "@/types"
import { useLabStore } from "@/store/labStore"

// ─── tenanta-node: show mr info ───────────────────────────────────────────────

export function showMrInfo(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const rkeyRotated = (topology as any).rkeyRotated ?? false

  setCondition("mrInspected", true)
  markVerified("mrInspected")

  if (rkeyRotated) {
    return {
      output: `[SIM ONLY] Memory Region info (tenanta-node, post-rotation):

  MR handle:    0x55a3b2c10000
  Address:      0x7f8b44000000
  Length:       67108864 (64 MB)
  lkey:         0xA7F3C20900     ← local key
  rkey:         0xA7F3C209       ← remote key (HIGH ENTROPY ✓)
  Access flags: LOCAL_WRITE | REMOTE_READ | REMOTE_WRITE

NOTE: RKEY 0xA7F3C209 — high entropy value.
  A sequential scan from 0x00000001 would need to try ~1.4 billion values
  on average before hitting this RKEY. Practically unguessable.

MR was re-registered at 2026-03-15 14:31:07 (rotation applied).`,
      conceptId: "rdma-security",
      type: "success",
    }
  }

  return {
    output: `[SIM ONLY] Memory Region info (tenanta-node):

  MR handle:    0x55a3b2c10000
  Address:      0x7f8b44000000
  Length:       67108864 (64 MB)
  lkey:         0x0000002700     ← local key
  rkey:         0x00000027       ← remote key (WARNING: LOW ENTROPY)
  Access flags: LOCAL_WRITE | REMOTE_READ | REMOTE_WRITE

WARNING: RKEY 0x00000027 is suspiciously low.
  This indicates the kernel RKEY counter was initialised from a low-entropy seed.
  An attacker scanning from 0x00000001 would reach this value in only 39 attempts.
  At 400GbE RDMA link speeds, 39 attempts complete in under 100 microseconds.

  Fix: run 'ibv_reg_mr rotate' to force a new RKEY from a higher-entropy pool.
  Also check: cat /proc/sys/kernel/randomize_va_space (should be 2)`,
    conceptId: "rdma-security",
    type: "error",
  }
}

// ─── tenanta-node: ibv_devinfo GID table ──────────────────────────────────────

export function ibvDevInfoGid(): CommandResult {
  const { topology } = useLabStore.getState()
  const gidFilterEnabled = (topology as any).gidFilterEnabled ?? false

  return {
    output: `ibv_devinfo -d mlx5_0 -i 1

hca_id:   mlx5_0
  transport:                  InfiniBand (0)
  fw_ver:                     22.40.1000
  node_guid:                  506b:4b03:00a1:b200
  sys_image_guid:             506b:4b03:00a1:b200
  vendor_id:                  0x02c9
  vendor_part_id:             4129       (ConnectX-7)
  
  port:   1
    state:                    PORT_ACTIVE (4)
    max_mtu:                  4096 (5)
    active_mtu:               4096 (5)
    
    GID[  0]: fe80::506b:4b03:00a1:b200    (link local)
    GID[  1]: 2001:db8:100::200             (TenantA GID ← this node)
    ${gidFilterEnabled
      ? "GID filter:  ENABLED (ROCE_ADDR_FILTER_ENABLE=1)\n    Allowed:    GID[1] 2001:db8:100::200 only\n    Blocked:    all other GIDs (including TenantB)"
      : "GID filter:  DISABLED (ROCE_ADDR_FILTER_ENABLE=0)\n    WARNING: All remote GIDs permitted — no QP restriction"}`,
    conceptId: "rdma-security",
    type: gidFilterEnabled ? "success" : "info",
  }
}

// ─── tenanta-node: show gid filter ────────────────────────────────────────────

export function showGidFilter(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const gidFilterEnabled = (topology as any).gidFilterEnabled ?? false

  setCondition("gidFilteringIdentified", true)
  markVerified("gidFilteringIdentified")

  if (gidFilterEnabled) {
    return {
      output: `[SIM ONLY] GID Filter Status (tenanta-node, mlx5_0):

  ROCE_ADDR_FILTER_ENABLE:  1 (ENABLED) ✓

  Allowed GID list:
    [0] 2001:db8:100::200   (TenantA local GID — this node)
    [1] 2001:db8:100::201   (TenantA-02 — legitimate peer)

  Blocked:
    2001:db8:200::202        (TenantB-01 GID — access denied)
    2001:db8:200::203        (TenantB-02 GID — access denied)
    (all other GIDs not in allowed list)

GID filtering is active. TenantB nodes cannot establish QP connections.`,
      conceptId: "rdma-security",
      type: "success",
    }
  }

  return {
    output: `[SIM ONLY] GID Filter Status (tenanta-node, mlx5_0):

  ROCE_ADDR_FILTER_ENABLE:  0 (DISABLED)

  SECURITY WARNING: GID filtering is OFF.
  Any remote GID may attempt to establish a QP connection to this node.
  This includes nodes in other tenants.

  Current remote GIDs with active or recent QP connections:
    2001:db8:100::200   (TenantA local — legitimate)
    2001:db8:100::201   (TenantA-02 — legitimate)
    2001:db8:200::202   (TenantB-01 — SHOULD NOT BE HERE)

  The TenantB GID should not be able to connect.
  Fix: run 'enable gid filter' to enable ROCE_ADDR_FILTER_ENABLE=1`,
    conceptId: "rdma-security",
    type: "error",
  }
}

// ─── tenanta-node: enable gid filter (MUTATION) ───────────────────────────────

export function enableGidFilter(): CommandResult {
  const { setCondition, markVerified, setTopology, topology } = useLabStore.getState()

  setTopology({ ...(topology as object), gidFilterEnabled: true } as any)
  setCondition("gidFilteringEnabled", true)
  markVerified("gidFilteringEnabled")

  return {
    output: `[SIM ONLY] Enabling GID filter on mlx5_0 (tenanta-node)...

  Applying: mlxconfig -d /dev/mst/mt4129_pciconf0 s ROCE_ADDR_FILTER_ENABLE=1

  -I- Applying... Done.
  -I- Please reboot machine to load new configurations.

  NOTE: In this lab environment, the filter takes effect immediately.
  In production, a driver reload or reboot is required:
    /etc/init.d/openibd restart   (reloads MLNX_OFED drivers, brief link-down)

GID filtering enabled. ✓

Allowed GIDs (from GUID-to-GID mapping, auto-populated):
  2001:db8:100::200  (this node — always permitted)
  2001:db8:100::201  (TenantA-02 — auto-discovered via SM)

TenantB GIDs are no longer permitted to establish QP connections.
Verify: show gid filter`,
    conceptId: "rdma-security",
    type: "success",
  }
}

// ─── tenanta-node: ibv_reg_mr rotate (MUTATION) ───────────────────────────────

export function ibvRegMrRotate(): CommandResult {
  const { topology, setCondition, markVerified, setTopology } = useLabStore.getState()
  const gidFilterEnabled = (topology as any).gidFilterEnabled ?? false

  setTopology({ ...(topology as object), rkeyRotated: true } as any)
  setCondition("rkeyRotated", true)
  markVerified("rkeyRotated")

  return {
    output: `[SIM ONLY] Rotating Memory Region RKEY (tenanta-node)...

Step 1: ibv_dereg_mr(mr=0x55a3b2c10000)
  Old rkey: 0x00000027  (low entropy — now INVALIDATED)
  Result: success

  Any in-flight RDMA operations using rkey=0x00000027 will receive
  IBV_WC_REM_ACCESS_ERR at completion. Legitimate peers must be
  given the new rkey through your connection setup protocol.

Step 2: ibv_reg_mr(pd, 0x7f8b44000000, 67108864, flags)
  New rkey: 0xA7F3C209  (high entropy ✓)
  New lkey: 0xA7F3C20900
  Result: success

RKEY rotation complete. ✓

  Old RKEY: 0x00000027  (39 guesses to find — INSECURE)
  New RKEY: 0xA7F3C209  (~1.4 billion guesses to find on average — SECURE)

Note: update legitimate TenantA peers with the new rkey value.
Verify the new RKEY: show mr info after`,
    conceptId: "rdma-security",
    type: "success",
  }
}

// ─── tenanta-node: show mr info after ────────────────────────────────────────

export function showMrInfoAfter(): CommandResult {
  return {
    output: `[SIM ONLY] Memory Region info (tenanta-node, post-rotation):

  MR handle:    0x55a3b2c10000
  Address:      0x7f8b44000000
  Length:       67108864 (64 MB)
  lkey:         0xA7F3C20900
  rkey:         0xA7F3C209       ← remote key (HIGH ENTROPY ✓)
  Access flags: LOCAL_WRITE | REMOTE_READ | REMOTE_WRITE

RKEY 0xA7F3C209 — high entropy.
An attacker scanning sequentially would need ~1.4 billion attempts.`,
    conceptId: "rdma-security",
    type: "success",
  }
}

// ─── tenantb-node: rkey scan (MUTATION — state changes) ──────────────────────

export function rkeyScan(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const gidFilterEnabled = (topology as any).gidFilterEnabled ?? false
  const rkeyRotated = (topology as any).rkeyRotated ?? false

  // Both fixes applied — attack blocked
  if (gidFilterEnabled || rkeyRotated) {
    setCondition("attackBlocked", true)
    markVerified("attackBlocked")

    return {
      output: `[SIM ONLY] rkey_scan v1.2 - RDMA RKEY scanner
Target: tenanta-node (10.0.1.5), port=mlx5_0

${gidFilterEnabled
  ? `Attempting QP connection to tenanta-node...
  QP connection refused: IBV_WC_REM_INV_REQ_ERR
  Reason: GID filtering active on remote NIC.
  Remote NIC rejected connection request — our GID is not in the allowed list.

Scan aborted: cannot establish QP without GID being permitted.
GID 2001:db8:200::202 (tenantb-node) is blocked by ROCE_ADDR_FILTER.`
  : `QP connection established.
Scanning RKEY range 0x00000001 to 0xFFFFFFFF...
  RKEY 0x00000001: IBV_WC_REM_ACCESS_ERR
  RKEY 0x00000002: IBV_WC_REM_ACCESS_ERR
  [scanning...]
  RKEY 0xA7F3C209: IBV_WC_REM_ACCESS_ERR
  [... all attempts fail ...]

Scan complete: 0 successful reads out of 65535 attempts (sampled range).
RKEY appears to be high-entropy — sequential scan not feasible.`}

Attack mitigated. ✓
${gidFilterEnabled && rkeyRotated
  ? "Both fixes applied: GID filter blocks the QP + high-entropy RKEY makes scanning impractical."
  : gidFilterEnabled
  ? "GID filter is the active defence. RKEY rotation is also recommended for defence-in-depth."
  : "RKEY rotation makes scanning impractical, but GID filtering is the stronger primary control."}`,
      conceptId: "rdma-security",
      type: "success",
    }
  }

  // Neither fix applied — attack succeeds
  setCondition("rkeyVulnerabilityReproduced", true)
  markVerified("rkeyVulnerabilityReproduced")

  return {
    output: `[SIM ONLY] rkey_scan v1.2 - RDMA RKEY scanner
Target: tenanta-node (10.0.1.5), port=mlx5_0

Establishing QP connection to tenanta-node...
  QP connection accepted (GID filter: DISABLED on remote)
  QP state: RTR → RTS

Scanning RKEY range 0x00000001 to 0x000000FF...
  RKEY 0x00000001: IBV_WC_REM_ACCESS_ERR
  RKEY 0x00000002: IBV_WC_REM_ACCESS_ERR
  RKEY 0x00000003: IBV_WC_REM_ACCESS_ERR
  ...
  RKEY 0x00000026: IBV_WC_REM_ACCESS_ERR
  RKEY 0x00000027: SUCCESS -- RDMA read of 64 bytes completed

  MEMORY DUMP (tenanta-node, rkey=0x00000027, offset=0x000000):
  0000: de ad be ef 00 00 00 00 ff ff ff ff 00 00 00 00
  0010: 48 65 6c 6c 6f 20 47 50 55 20 57 6f 72 6c 64 00
  0020: 00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f
  0030: 10 11 12 13 14 15 16 17 18 19 1a 1b 1c 1d 1e 1f

CRITICAL SECURITY VIOLATION:
  TenantA GPU memory is accessible from TenantB node.
  RKEY guessed after only 39 attempts (0.00001% of keyspace).
  This attack completed in under 1 millisecond at 400GbE speeds.

  Root cause 1: GID filtering DISABLED — QP connection was not blocked.
  Root cause 2: Low-entropy RKEY (0x00000027) — trivially guessable.

  Proceed to tenanta-node to apply both fixes.`,
    conceptId: "rdma-security",
    type: "error",
  }
}

// ─── tenantb-node: ibv_devinfo ────────────────────────────────────────────────

export function ibvDevInfoTenantB(): CommandResult {
  return {
    output: `ibv_devinfo -d mlx5_0

hca_id:   mlx5_0
  transport:          InfiniBand (0)
  fw_ver:             22.40.1000
  node_guid:          506b:4b03:00a1:b202
  vendor_part_id:     4129      (ConnectX-7)

  port:  1
    state:            PORT_ACTIVE (4)
    GID[  0]:         fe80::506b:4b03:00a1:b202  (link local)
    GID[  1]:         2001:db8:200::202           (TenantB GID)

This is tenantb-node's GID: 2001:db8:200::202
The prefix 2001:db8:200:: identifies this as a TenantB address.
tenanta-node uses prefix 2001:db8:100:: — different tenant.`,
    type: "info",
  }
}

// ─── tenantb-node: ibv_rc_pingpong ───────────────────────────────────────────

export function ibvRcPingpong(): CommandResult {
  const { topology } = useLabStore.getState()
  const gidFilterEnabled = (topology as any).gidFilterEnabled ?? false

  if (gidFilterEnabled) {
    return {
      output: `ibv_rc_pingpong -d mlx5_0 -g 1 10.0.1.5

Connecting to 10.0.1.5:18515...
  Error: Connection refused (errno: ECONNREFUSED)
  Remote returned: IBV_WC_REM_INV_REQ_ERR

The remote NIC (tenanta-node) rejected the QP connection request.
GID filtering (ROCE_ADDR_FILTER) is active — our GID 2001:db8:200::202
is not in tenanta-node's allowed GID list.

This is the expected result after GID filter hardening. ✓`,
      conceptId: "rdma-security",
      type: "success",
    }
  }

  return {
    output: `ibv_rc_pingpong -d mlx5_0 -g 1 10.0.1.5

Connecting to 10.0.1.5:18515...
  Connected (GID filter: disabled on remote — connection accepted)

  local address:   LID 0x0000, QPN 0x000400, PSN 0x7a3f21
  remote address:  LID 0x0000, QPN 0x000401, PSN 0x3b21a4

8 bytes in 0.00 seconds = 0.00 Mbit/sec
1000 iters in 0.00889 seconds = 112.5 usec/iter

QP connection succeeded from TenantB to TenantA.
(GID filtering is disabled — this connection should not be possible in a
 hardened multi-tenant environment.)`,
    conceptId: "rdma-security",
    type: "error",
  }
}

// ─── leaf-switch handlers ─────────────────────────────────────────────────────

export function showQosTrustDscpMap(): CommandResult {
  return {
    output: `DSCP trust map (leaf-sw):

  DSCP  TC  Queue type  Description
  ----  --  ----------  -----------
  26    3   Lossless    RoCEv2 training traffic
  48    6   High-prio   CNP (Congestion Notification Packet)
  46    5   Lossless    NCCL high-priority
  10    0   Lossy       Checkpoint-to-storage
  0     0   Lossy       Default (unclassified)

DSCP trust is configured correctly.
RoCE traffic (DSCP 26) is on TC3 (lossless, PFC-protected).`,
    type: "success",
  }
}

export function nvShowInterfaceSwp1Qos(): CommandResult {
  return {
    output: `nv show interface swp1 qos

interface swp1:
  trust:           dscp
  pfc:
    enabled:       true
    priority:      3
    tx-enable:     true
    rx-enable:     true
  ecn:
    profile:       roce
    min-threshold: 500KB
    max-threshold: 1500KB
  scheduler:
    profile:       default-ai-fabric
  counters:
    ecn_marked_pkts:   2,847
    pfc_rx_pkts_p3:    0

QoS configuration on swp1 is healthy.`,
    type: "success",
  }
}

export function showGvmiTable(): CommandResult {
  return {
    output: `GVMI (Global Virtual Machine Interface) table — leaf-sw:

GVMI  GID                    Node      VRF      State
----  ----------------------  --------  -------  -----
0     2001:db8:100::200       tenantA   VRF_A    active
1     2001:db8:100::201       tenantA-2 VRF_A    active
2     2001:db8:200::202       tenantB   VRF_B    active
3     2001:db8:200::203       tenantB-2 VRF_B    active

Both tenant GIDs are registered at the switch ASIC level.
VRF assignment is correct: TenantA GIDs → VRF_A, TenantB GIDs → VRF_B.

Note: GVMI provides L2 visibility at the switch. The GID filter enforcement
is at the NIC ASIC level (ConnectX-7), not the switch.`,
    type: "info",
  }
}

// ─── ufm-server handlers ─────────────────────────────────────────────────────

export function showUfmPkeyTable(): CommandResult {
  const { setCondition, markVerified } = useLabStore.getState()

  setCondition("pkeyIsolationVerified", true)
  markVerified("pkeyIsolationVerified")

  return {
    output: `{
  "pkey": "0x8001",
  "members": [
    {
      "guid": "0x506b4b0300a1b200",
      "membership": "full",
      "name": "tenanta-node"
    },
    {
      "guid": "0x506b4b0300a1b210",
      "membership": "limited",
      "name": "storage-node"
    }
  ],
  "isolation_status": "TenantA and TenantB do not share a PKey"
}

Reference summary for this lab:

Partition    P_Key   Rate  Members
-----------  ------  ----  -------------------------------------------------------
mgmt         0xFFFF  NDR   sm-01 (full), ufm-server (full)

TenantA      0x8001  NDR   tenantA-node-01 GUID 0x506b4b0300a1b200 (full)
                           tenantA-node-02 GUID 0x506b4b0300a1b201 (full)
                           storage-node   GUID 0x506b4b0300a1b210 (limited)

TenantB      0x8002  NDR   tenantB-node-01 GUID 0x506b4b0300a1b202 (full)
                           tenantB-node-02 GUID 0x506b4b0300a1b203 (full)
                           storage-node   GUID 0x506b4b0300a1b210 (limited)

Partition isolation confirmed ✓:
  TenantA and TenantB share NO common partition (0x8001 ≠ 0x8002).
  Cross-tenant RDMA is blocked at HCA hardware level on both nodes.
  Storage node has limited membership in both — can receive from each tenant
  but the two tenants cannot communicate through the storage node.

Note: storage-node's limited membership means:
  TenantA (full) → storage-node (limited): PERMITTED ✓
  TenantB (full) → storage-node (limited): PERMITTED ✓
  storage-node (limited) ↔ storage-node (limited): N/A (same node)
  TenantA (full) → TenantB (full): BLOCKED ✗ (no shared partition)`,
    conceptId: "rdma-security",
    type: "success",
  }
}

export function showUfmEvents(): CommandResult {
  const { topology } = useLabStore.getState()
  const gidFilterEnabled = (topology as any).gidFilterEnabled ?? false

  return {
    output: `UFM Enterprise — Recent Events:

Timestamp            Severity  Category         Description
-------------------  --------  ---------------  ------------------------------------------
2026-03-15 10:00:02  INFO      PKey             TenantA partition (0x8001) assigned to 3 ports
2026-03-15 10:00:03  INFO      PKey             TenantB partition (0x8002) assigned to 3 ports
2026-03-15 10:00:05  INFO      Fabric           SM sweep completed — 8 nodes, 0 errors
${gidFilterEnabled
  ? `2026-03-15 14:31:05  INFO      NIC-Config       ROCE_ADDR_FILTER_ENABLE set on tenantA-node-01
2026-03-15 14:31:07  INFO      MR-Event         Memory Region re-registered on tenantA-node-01
2026-03-15 14:31:08  INFO      Security         GID filter hardening audit event logged`
  : `2026-03-15 14:29:41  WARN      Security         TenantB GID detected in TenantA QP connection
                                                   (ROCE_ADDR_FILTER not enabled on tenantA-node-01)`}

${gidFilterEnabled
  ? "Recent security events show hardening actions have been applied and logged."
  : "WARNING: An active cross-tenant QP connection was detected and logged.\n  Apply GID filtering on tenantA-node-01 to prevent this."}`,
    conceptId: "rdma-security",
    type: gidFilterEnabled ? "success" : "error",
  }
}

export function setPkeyTenantA(): CommandResult {
  return {
    output: `{
  "status": "ok",
  "pkey": "0x8001",
  "guid": "0x506b4b0300a1b200",
  "membership": "full",
  "message": "TenantA GUID is assigned to PKey 0x8001"
}`,
    type: "info",
  }
}

export function setPkeyTenantB(): CommandResult {
  return {
    output: `{
  "status": "ok",
  "pkey": "0x8002",
  "guid": "0x506b4b0300a1b202",
  "membership": "full",
  "message": "TenantB GUID is assigned to PKey 0x8002"
}`,
    type: "info",
  }
}
