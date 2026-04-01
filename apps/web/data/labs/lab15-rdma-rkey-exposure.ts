import type { LabConfig, LabDevice } from "@/types"

// ─── Devices ──────────────────────────────────────────────────────────────────
// Topology:
//   tenanta-node  — victim node: MR owner, GID filter disabled initially
//   tenantb-node  — attacker perspective: runs rkey_scan
//   leaf-switch   — SN5600, Spectrum-X
//   ufm-server    — UFM Enterprise PKey management
//
// Starting state:
//   tenanta-node: GID filtering DISABLED, MR with low-entropy RKEY 0x00000027
//   tenantb-node: rkey_scan pre-installed
//   UFM: PKey partitions already configured (TenantA=0x8001, TenantB=0x8002)
//
// Topology extensions used (add to types/index.ts TopologyState):
//   gidFilterEnabled?: boolean
//   rkeyRotated?: boolean

export const lab15Devices: LabDevice[] = [
  {
    id: "tenanta-node",
    type: "dgx",
    label: "TenantA Node",
    sublabel: "victim · MR owner · GID filter disabled",
    prompt: "tenanta-node:~$",
    osLabel: "DGX OS / libibverbs",
    allowedCommands: [
      "show mr info",
      "ibv_devinfo -d mlx5_0 -i 1",
      "show gid filter",
      "enable gid filter",
      "ibv_reg_mr rotate",
      "show mr info after",
      "help",
      "hint",
    ],
    position: { x: 70, y: 100 },
    status: "up",
  },
  {
    id: "tenantb-node",
    type: "dgx",
    label: "TenantB Node",
    sublabel: "attacker perspective · rkey scanner",
    prompt: "tenantb-node:~$",
    osLabel: "DGX OS / libibverbs",
    allowedCommands: [
      "ibv_devinfo -d mlx5_0",
      "rkey scan",
      "ibv_rc_pingpong -d mlx5_0 -g 1",
      "help",
      "hint",
    ],
    position: { x: 70, y: 240 },
    status: "up",
  },
  {
    id: "leaf-switch",
    type: "leaf-switch",
    label: "Leaf Switch",
    sublabel: "SN5600 · Spectrum-X · GBP enforcement",
    prompt: "leaf-sw#",
    osLabel: "Cumulus Linux 5.x",
    allowedCommands: [
      "show qos trust dscp-map",
      "nv show interface swp1 qos",
      "show gvmi table",
      "help",
      "hint",
    ],
    position: { x: 340, y: 170 },
    status: "up",
  },
  {
    id: "ufm-server",
    type: "ufm-server",
    label: "UFM Server",
    sublabel: "PKey management · fabric policy",
    prompt: "ufm-admin@ufm:~$",
    osLabel: "UFM Enterprise",
    allowedCommands: [
      "show ufm pkey table",
      "show ufm events",
      "set pkey tenanta 0x8001",
      "set pkey tenantb 0x8002",
      "help",
      "hint",
    ],
    position: { x: 560, y: 170 },
    status: "up",
  },
]

export const lab15: LabConfig = {
  id: "lab15-rdma-rkey-exposure",
  title: "RDMA RKEY Exposure and Isolation",
  difficulty: "advanced",
  expectedMinutes: 40,
  scenario:
    "A security audit on a multi-tenant GPU cluster has flagged a critical finding:\n"
    + "TenantB was able to read memory from a TenantA GPU node using a guessed RKEY.\n\n"
    + "The cluster runs DGX H100 nodes (ConnectX-7 NICs). GID filtering is disabled\n"
    + "on TenantA's NIC — the default state on many deployments. TenantA's Memory\n"
    + "Region was registered with a low-entropy RKEY (predictable kernel seed).\n\n"
    + "Your task:\n"
    + "  1. Inspect the pre-allocated MR on tenanta-node (note the low RKEY value)\n"
    + "  2. Reproduce the RKEY scan attack from tenantb-node\n"
    + "  3. Identify both misconfigurations: GID filter disabled + low-entropy RKEY\n"
    + "  4. Enable GID filtering on tenanta-node's ConnectX-7 NIC\n"
    + "  5. Rotate the RKEY by re-registering the Memory Region\n"
    + "  6. Confirm the attack fails with both fixes applied\n"
    + "  7. Verify PKey isolation at the fabric level via UFM",
  initialTopology: {
    nic: { name: "eth0", speed: 400, state: "up" },
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: false,
    silentCongestion: false,
    bufferUtilPct: 10,
  } as any,
  requiredConditions: [
    "mrInspected",
    "rkeyVulnerabilityReproduced",
    "gidFilteringIdentified",
    "gidFilteringEnabled",
    "rkeyRotated",
    "attackBlocked",
    "pkeyIsolationVerified",
  ],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 120,
      text: "Start on tenanta-node. Run 'show mr info' to see the pre-allocated Memory Region and its RKEY. Notice how low the RKEY value is — this is the entropy problem. Then run 'show gid filter' to confirm GID filtering is off. Then switch to tenantb-node and run 'rkey scan' to reproduce the attack.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text: "Two misconfigurations, two fixes — both required. Fix 1: on tenanta-node, run 'enable gid filter' to enable ROCE_ADDR_FILTER. Fix 2: run 'ibv_reg_mr rotate' to force a new high-entropy RKEY. Apply both, then re-run 'rkey scan' from tenantb-node to verify.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 400,
      text: "Full sequence: tenanta-node 'show mr info' → tenantb-node 'rkey scan' (attack succeeds) → tenanta-node 'show gid filter' (identifies disabled filter) → tenanta-node 'enable gid filter' → tenanta-node 'ibv_reg_mr rotate' → tenantb-node 'rkey scan' (fails — attack blocked) → ufm-server 'show ufm pkey table' (confirms fabric isolation).",
    },
  ],
}
