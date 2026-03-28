import type { LabConfig, LabDevice } from '@/types'

export const lab9Devices: LabDevice[] = [
  {
    id: 'dgx-node-a',
    type: 'dgx',
    label: 'DGX H100 Node A',
    sublabel: 'mlx5_0–7 · 8× 400G',
    prompt: 'dgx-node-a:~$',
    osLabel: 'DGX OS',
    allowedCommands: [
      'ibstat',
      'rdma link show',
      'show topology',
      'show rdma links',
      'ethtool -S eth2',
      'help',
      'hint',
    ],
    position: { x: 240, y: 30 },
    status: 'up',
  },
  {
    id: 'leaf-rail2',
    type: 'leaf-switch',
    label: 'Leaf Switch Rail 2',
    sublabel: 'SN5600 · Cumulus Linux',
    prompt: 'leaf-rail2 #',
    osLabel: 'Cumulus Linux',
    allowedCommands: [
      'show interface counters',
      'show switch port rail2',
      'show interface swp3',
      'replace optic rail2',
      'no shutdown',
      'help',
      'hint',
    ],
    position: { x: 240, y: 220 },
    status: 'error-disabled',
    railId: 2,
  },
]

export const lab9: LabConfig = {
  id: 'lab9-errdisable-recovery',
  title: 'Recover the err-disabled rail',
  difficulty: 'intermediate',
  expectedMinutes: 20,
  scenario:
    'A 16-node DGX H100 cluster is running distributed training.\n'
    + 'AllReduce throughput has dropped to 87.5% of baseline.\n'
    + 'DCGM reports GPU-2 on DGX Node A contributing zero\n'
    + 'bandwidth to AllReduce — as if it has dropped out entirely.\n\n'
    + 'The DGX node appears healthy. No hardware alerts. No OS errors.\n\n'
    + 'Your task:\n'
    + '  1. Identify which rail is affected and from which side\n'
    + '  2. Understand why the NIC and switch might disagree\n'
    + '  3. Find the root cause on the switch\n'
    + '  4. Apply the physical fix\n'
    + '  5. Re-enable the port and verify full recovery',
  initialTopology: {
    nic: { name: 'eth0', speed: 400, state: 'up' },
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: false,
    silentCongestion: false,
    bufferUtilPct: 14,
    rails: [
      { id: 0, nicName: 'mlx5_0', nicState: 'up', switchPort: 'up',             guid: '0x506b4b0300a1b200' },
      { id: 1, nicName: 'mlx5_1', nicState: 'up', switchPort: 'up',             guid: '0x506b4b0300a1b201' },
      { id: 2, nicName: 'mlx5_2', nicState: 'up', switchPort: 'error-disabled', guid: '0x506b4b0300a1b202' },
      { id: 3, nicName: 'mlx5_3', nicState: 'up', switchPort: 'up',             guid: '0x506b4b0300a1b203' },
      { id: 4, nicName: 'mlx5_4', nicState: 'up', switchPort: 'up',             guid: '0x506b4b0300a1b204' },
      { id: 5, nicName: 'mlx5_5', nicState: 'up', switchPort: 'up',             guid: '0x506b4b0300a1b205' },
      { id: 6, nicName: 'mlx5_6', nicState: 'up', switchPort: 'up',             guid: '0x506b4b0300a1b206' },
      { id: 7, nicName: 'mlx5_7', nicState: 'up', switchPort: 'up',             guid: '0x506b4b0300a1b207' },
    ],
    opticReplaced: false,
  },
  requiredConditions: [
    'railIdentified',
    'nicActiveTrapSeen',
    'errDisabledConfirmed',
    'opticReplaced',
    'portReenabled',
    'railVerified',
  ],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 100,
      text: "GPU-2 maps to mlx5_2 → Rail 2. Start on the DGX with 'show topology' and 'ibstat'. Pay close attention to what ibstat shows for mlx5_2 — and what it cannot tell you.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text: "ibstat shows mlx5_2 as Active — this is the trap. The NIC reports its own signal, not the switch port state. Switch to the leaf-rail2 terminal and run 'show switch port rail2' to see the switch perspective.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 400,
      text: "'show switch port rail2' reveals swp3 Err-Disabled (link-flap, dirty optic). Run 'replace optic rail2' to fix the physical layer, then 'no shutdown' to clear the err-disable. Verify recovery with 'show switch port rail2' and 'show rdma links' on the DGX.",
    },
  ],
}
