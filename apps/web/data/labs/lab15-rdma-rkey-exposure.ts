import type { LabConfig, LabDevice } from "@/types"

export const lab15Devices: LabDevice[] = [
  {
    id: "tenanta-node",
    type: "dgx",
    label: "TenantA Node",
    sublabel: "Victim node - ConnectX-7 GID view",
    prompt: "tenanta-node:~$",
    osLabel: "DGX OS / libibverbs",
    allowedCommands: [
      "ibv_devinfo -d mlx5_0 -i 1",
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
    sublabel: "Attacker perspective - QP probe",
    prompt: "tenantb-node:~$",
    osLabel: "DGX OS / libibverbs",
    allowedCommands: [
      "ibv_devinfo -d mlx5_0",
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
    sublabel: "SN5600 - QoS/GVMI inventory",
    prompt: "cumulus@leaf-sw:~$",
    osLabel: "Cumulus Linux 5.x",
    allowedCommands: [
      "nv show qos trust dscp-map",
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
    sublabel: "UFM REST - PKey policy",
    prompt: "ufm-admin@ufm:~$",
    osLabel: "UFM Enterprise",
    allowedCommands: [
      "curl -ks 'https://ufm-server/ufmRest/resources/pkeys/0x8001'",
      "curl -ks 'https://ufm-server/ufmRest/resources/pkeys/0x8002'",
      "curl -ks -X PUT 'https://ufm-server/ufmRest/resources/pkeys/0x8001/guids/506b4b0300a1b200'",
      "curl -ks -X PUT 'https://ufm-server/ufmRest/resources/pkeys/0x8002/guids/506b4b0300a1b202'",
      "help",
      "hint",
    ],
    position: { x: 560, y: 170 },
    status: "up",
  },
  {
    id: "security-harness",
    type: "ufm-server",
    label: "[SIM ONLY] Security Harness",
    sublabel: "Teaches MR state, RKEY rotation, and GID-filter outcomes",
    prompt: "lab-harness@security:~$",
    osLabel: "FabricLab simulation harness",
    allowedCommands: [
      "show mr info",
      "show gid filter",
      "enable gid filter",
      "ibv_reg_mr rotate",
      "show mr info after",
      "rkey scan",
      "help",
      "hint",
    ],
    position: { x: 330, y: 310 },
    status: "up",
  },
]

export const lab15: LabConfig = {
  id: "lab15-rdma-rkey-exposure",
  title: "RDMA RKEY Exposure and Isolation",
  difficulty: "advanced",
  expectedMinutes: 40,
  scenario:
    "A security audit on a multi-tenant GPU cluster has flagged a critical finding: "
    + "TenantB can establish an RC QP toward a TenantA host and a low-entropy RKEY makes "
    + "remote-read guessing practical in this lab scenario.\n\n"
    + "Use real host and fabric commands where they exist (`ibv_devinfo`, `ibv_rc_pingpong`, "
    + "NVUE QoS/GVMI views, and UFM PKey REST APIs). The [SIM ONLY] Security Harness tab "
    + "exposes lab-specific commands for MR inspection, RKEY rotation, and GID-filter state "
    + "so the vulnerability mechanics remain inspectable without pretending those are "
    + "standard DGX shell commands.\n\n"
    + "Your task:\n"
    + "  1. Inspect TenantA's GID view and current MR security state\n"
    + "  2. Reproduce the cross-tenant QP/RKEY exposure from TenantB\n"
    + "  3. Enable host-side GID filtering and rotate the MR RKEY in the security harness\n"
    + "  4. Confirm the attack fails after those host-side controls\n"
    + "  5. Verify TenantA/TenantB are isolated into separate UFM PKeys",
  initialTopology: {
    nic: { name: "eth0", speed: 400, state: "up" },
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: false,
    silentCongestion: false,
    bufferUtilPct: 10,
  },
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
      text: "Start with `ibv_devinfo` on TenantA and TenantB, then use the [SIM ONLY] Security Harness to inspect MR state and run the first `rkey scan`.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text: "On the Security Harness, both `enable gid filter` and `ibv_reg_mr rotate` are required before the second `rkey scan` should fail.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 400,
      text: "Use UFM REST reads for 0x8001 and 0x8002 after the host-side fix to confirm TenantA and TenantB do not share a PKey.",
    },
  ],
}
