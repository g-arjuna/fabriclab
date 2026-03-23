import type { CommandResult } from '@/types'
import { useLabStore } from '@/store/labStore'

export function showSwitchPort(railArg: string): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()

  const rails = topology.rails ?? []

  if (rails.length === 0) {
    return {
      output: 'No rail topology configured for this lab.',
      type: 'info',
    }
  }

  // Parse rail number from argument -- accepts 'rail3', 'rail 3', '3'
  const match = railArg.trim().match(/(\d)$/)
  if (!match) {
    return {
      output: `Usage: show switch port rail<N>  (e.g. show switch port rail3)\nAvailable rails: 0-7`,
      type: 'error',
    }
  }

  const railId = parseInt(match[1], 10)
  const rail = rails.find(r => r.id === railId)

  if (!rail) {
    return {
      output: `Rail ${railId} not found. Available rails: 0-7`,
      type: 'error',
    }
  }

  // Only mark faultIsolated after linkConfirmed has been set
  const linkAlreadyConfirmed = useLabStore.getState().lab.conditions['linkConfirmed'] === true
  if (rail.switchPort === 'error-disabled' && linkAlreadyConfirmed) {
    setCondition('faultIsolated', true)
    markVerified('faultIsolated')
  }

  const isHealthy = rail.switchPort === 'up'
  const switchName = `leaf-rail${railId}`

  if (!isHealthy) {
    return {
      output: `${switchName} # show interface swp5
=======================================================
Interface swp5  (DGX-Node-01 → mlx5_${railId} → Rail ${railId})
  Description:   dgx-node-01-rail${railId}
  Admin state:   Up
  Oper state:    Err-Disabled                    ← FAULT HERE
  Err reason:    link-flap                       ← port auto-disabled
  Err detail:    6 flaps detected in 30 seconds
  Link flaps:    6 (last 10 min)
  Last flap:     00:07:43 ago
  Recovery:      Manual (requires: no shutdown after physical fix)
  Speed:         400G (last negotiated before disable)
  Type:          SFP28-DAC-0.5m                  ← check DAC cable

Next steps:
  1. Inspect DAC cable: DGX-Node-01 port eth3 ↔ leaf-rail3 port swp5
  2. Replace cable if defective, then: interface swp5 / no shutdown
  3. Verify link re-establishes: show interface swp5

${switchName} # show interface status | grep swp | head -20
Interface  Description                State         Speed
---------  -------------------------  ------------  -----
swp1       dgx-node-02-rail${railId}  Up            400G   ← Node-02: OK
swp2       dgx-node-03-rail${railId}  Up            400G   ← Node-03: OK
swp3       dgx-node-04-rail${railId}  Up            400G   ← Node-04: OK
swp4       dgx-node-05-rail${railId}  Up            400G   ← Node-05: OK
swp5       dgx-node-01-rail${railId}  Err-Disabled  400G   ← Node-01: FAULT
swp6       dgx-node-06-rail${railId}  Up            400G   ← Node-06: OK
swp7       dgx-node-07-rail${railId}  Up            400G   ← Node-07: OK
swp8       dgx-node-08-rail${railId}  Up            400G   ← Node-08: OK
swp9       dgx-node-09-rail${railId}  Up            400G   ← Node-09: OK
swp10      dgx-node-10-rail${railId}  Up            400G   ← Node-10: OK
swp11      dgx-node-11-rail${railId}  Up            400G   ← Node-11: OK
swp12      dgx-node-12-rail${railId}  Up            400G   ← Node-12: OK
swp13      dgx-node-13-rail${railId}  Up            400G   ← Node-13: OK
swp14      dgx-node-14-rail${railId}  Up            400G   ← Node-14: OK
swp15      dgx-node-15-rail${railId}  Up            400G   ← Node-15: OK
swp16      dgx-node-16-rail${railId}  Up            400G   ← Node-16: OK
swp33      spine-sw-01                Up            400G   ← Spine uplink
...
swp64      spine-sw-32                Up            400G   ← Spine uplink

Summary:
  Downlinks Up:          15 / 16  (15 DGX nodes fully operational on Rail ${railId})
  Downlinks Err-Disabled: 1 / 16  (DGX-Node-01 GPU ${railId} only)
  Uplinks Up:            32 / 32  (all spine paths intact)

CONCLUSION: Single port failure. 15 other DGX nodes on Rail ${railId} unaffected.
Fault is physical: DAC cable on swp5 ↔ DGX-Node-01/eth3.`,
      conceptId: 'rocev2',
      type: 'error',
    }
  }

  return {
    output: `${switchName} # show interface swp5
=======================================================
Interface swp5  (DGX-Node-01 → mlx5_${railId} → Rail ${railId})
  Description:   dgx-node-01-rail${railId}
  Admin state:   Up
  Oper state:    Up
  Speed:         400G
  Type:          SFP28-DAC-0.5m
  Link flaps:    0 (last 24h)
  RX packets:    6,234,918,441    RX errors: 0
  TX packets:    6,198,441,223    TX errors: 0
  Output drops:  0

${switchName} # show interface status | grep swp | head -8
Interface  Description                State  Speed
---------  -------------------------  -----  -----
swp1       dgx-node-02-rail${railId}  Up     400G
swp2       dgx-node-03-rail${railId}  Up     400G
swp3       dgx-node-04-rail${railId}  Up     400G
swp4       dgx-node-05-rail${railId}  Up     400G
swp5       dgx-node-01-rail${railId}  Up     400G   ← this node
swp6       dgx-node-06-rail${railId}  Up     400G
...
swp16      dgx-node-16-rail${railId}  Up     400G

All 16 downlinks Up. All 32 spine uplinks Up. Rail ${railId}: HEALTHY`,
    conceptId: 'rocev2',
    type: 'success',
  }
}
