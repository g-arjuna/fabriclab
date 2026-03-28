import type { LabConfig, LabDevice } from '@/types'

export const lab0Devices: LabDevice[] = [
  {
    id: 'dgx-node-a',
    type: 'dgx',
    label: 'DGX H100 Node A',
    sublabel: 'mlx5_0–7 · 8× 400G',
    prompt: 'dgx-node-a:~$',
    osLabel: 'DGX OS',
    allowedCommands: ['ibstat', 'rdma link show', 'show topology', 'show rdma links', 'ethtool -S eth0', 'ethtool -S eth3', 'help', 'hint'],
    position: { x: 240, y: 30 },
    status: 'up',
  },
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `leaf-rail${i}`,
    type: 'leaf-switch' as const,
    label: `Leaf Switch Rail ${i}`,
    sublabel: `SN5600 · Rail ${i}`,
    prompt: `leaf-rail${i} #`,
    osLabel: 'Cumulus Linux',
    allowedCommands: [
      'show interface counters',
      `show switch port rail${i}`,
      `show interface swp${i + 2}`,
      'show dcb pfc',
      'help',
      'hint',
    ],
    position: { x: 30 + i * 68, y: 220 },
    status: i === 3 ? 'error-disabled' as const : 'up' as const,
    railId: i,
  })),
]

export const lab0: LabConfig = {
  id: 'lab0-failed-rail',
  title: 'Identify the failed rail',
  difficulty: 'beginner',
  expectedMinutes: 12,
  scenario: `A 16-node DGX H100 cluster is running distributed
training across all 128 GPUs. Throughput has dropped
to 87.5% of baseline — exactly 7/8 of expected.

GPU 3 (mlx5_3) on DGX-Node-01 is no longer contributing
to AllReduce. The other 15 nodes are unaffected.

Cluster topology:
  16 DGX nodes × 8 GPUs = 128 GPUs
  8 leaf switches (one per GPU rail, Rail 0–7)
  Each leaf (SN5600 64-port): 16 active DGX downlinks
    + 16 active spine uplinks (32 ports unused —
    cluster is sized for 16 nodes today)

Your task:
  1. Identify which rail failed (show topology)
  2. Confirm RDMA link state (show rdma links)
  3. Determine NIC side vs switch side fault
  4. Find the exact fault type on the switch port`,
  initialTopology: {
    nic: { name: 'eth0', speed: 400, state: 'up' },
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: false,
    bufferUtilPct: 15,
    rails: [
      { id: 0, nicName: 'mlx5_0', nicState: 'up', switchPort: 'up', guid: '0x506b4b0300a1b200' },
      { id: 1, nicName: 'mlx5_1', nicState: 'up', switchPort: 'up', guid: '0x506b4b0300a1b201' },
      { id: 2, nicName: 'mlx5_2', nicState: 'up', switchPort: 'up', guid: '0x506b4b0300a1b202' },
      { id: 3, nicName: 'mlx5_3', nicState: 'up', switchPort: 'error-disabled', guid: '0x506b4b0300a1b203' },
      { id: 4, nicName: 'mlx5_4', nicState: 'up', switchPort: 'up', guid: '0x506b4b0300a1b204' },
      { id: 5, nicName: 'mlx5_5', nicState: 'up', switchPort: 'up', guid: '0x506b4b0300a1b205' },
      { id: 6, nicName: 'mlx5_6', nicState: 'up', switchPort: 'up', guid: '0x506b4b0300a1b206' },
      { id: 7, nicName: 'mlx5_7', nicState: 'up', switchPort: 'up', guid: '0x506b4b0300a1b207' },
    ],
  },
  requiredConditions: [
    'railIdentified',
    'linkConfirmed',
    'faultIsolated',
  ],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 120,
      text: "Start on the DGX host. Run 'show topology' to get the full rail map. Look for the rail with ERR-DISABLED on the switch port column.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text: "After 'show topology' identifies Rail 3, run 'show rdma links'. Notice mlx5_3 reports Active — the NIC cannot see the switch has disabled its port. Then open the leaf-rail3 terminal and check the switch's view.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 360,
      text: "Sequence: 'show topology' (Rail 3 = fault) → 'show rdma links' (NIC says Active) → leaf-rail3 terminal → 'show switch port rail3' (swp5 Err-Disabled, link-flap). The NIC and switch disagree. That disagreement IS the finding.",
    },
  ],
}
