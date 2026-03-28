import type { CommandResult } from '@/types'
import { useLabStore } from '@/store/labStore'

export function showSwitchPort(railArg: string): CommandResult {
  const store = useLabStore.getState()
  const { topology, setCondition, markVerified } = store
  const activeLabId = store.lab.labId
  const rails = topology.rails ?? []

  if (rails.length === 0) {
    return {
      output: 'No rail topology configured for this lab.',
      type: 'info',
    }
  }

  const match = railArg.trim().match(/(\d)$/)
  if (!match) {
    return {
      output: 'Usage: show switch port rail<N>  (e.g. show switch port rail3)\nAvailable rails: 0-7',
      type: 'error',
    }
  }

  const railId = parseInt(match[1], 10)
  const rail = rails.find((r) => r.id === railId)

  if (!rail) {
    return {
      output: `Rail ${railId} not found. Available rails: 0-7`,
      type: 'error',
    }
  }

  const linkAlreadyConfirmed = store.lab.conditions['linkConfirmed'] === true
  if (rail.switchPort === 'error-disabled' && linkAlreadyConfirmed) {
    setCondition('faultIsolated', true)
    markVerified('faultIsolated')
  }
  if (rail.switchPort === 'error-disabled') {
    setCondition('errDisabledConfirmed', true)
    markVerified('errDisabledConfirmed')
    setCondition('railIdentified', true)
    markVerified('railIdentified')
  }

  const switchName = `leaf-rail${railId}`
  const isHealthy = rail.switchPort === 'up'
  const isLab9Rail2 = activeLabId === 'lab9-errdisable-recovery' && railId === 2
  const switchPortName = isLab9Rail2 ? 'swp3' : 'swp5'
  const dgxLabel = isLab9Rail2 ? 'DGX-Node-A' : 'DGX-Node-01'
  const dgxDesc = isLab9Rail2 ? 'dgx-node-a' : 'dgx-node-01'
  const dgxEth = isLab9Rail2 ? 'eth2' : 'eth3'
  const mediaType = isLab9Rail2 ? 'OSFP-400G-SR4 optic' : 'SFP28-DAC-0.5m'
  const mediaLabel = isLab9Rail2 ? 'optic' : 'DAC cable'
  const faultStatusRows = isLab9Rail2
    ? [
        `swp1       dgx-node-02-rail${railId}  Up            400G   <- Node-02: OK`,
        `swp2       dgx-node-03-rail${railId}  Up            400G   <- Node-03: OK`,
        `swp3       ${dgxDesc}-rail${railId}  Err-Disabled  400G   <- ${dgxLabel}: FAULT`,
        `swp4       dgx-node-05-rail${railId}  Up            400G   <- Node-05: OK`,
        `swp5       dgx-node-01-rail${railId}  Up            400G   <- Node-01: OK`,
      ]
    : [
        `swp1       dgx-node-02-rail${railId}  Up            400G   <- Node-02: OK`,
        `swp2       dgx-node-03-rail${railId}  Up            400G   <- Node-03: OK`,
        `swp3       dgx-node-04-rail${railId}  Up            400G   <- Node-04: OK`,
        `swp4       dgx-node-05-rail${railId}  Up            400G   <- Node-05: OK`,
        `swp5       ${dgxDesc}-rail${railId}  Err-Disabled  400G   <- ${dgxLabel}: FAULT`,
      ]
  const healthyStatusRows = isLab9Rail2
    ? [
        `swp1       dgx-node-02-rail${railId}  Up     400G`,
        `swp2       dgx-node-03-rail${railId}  Up     400G`,
        `swp3       ${dgxDesc}-rail${railId}  Up     400G   <- this node`,
        `swp4       dgx-node-05-rail${railId}  Up     400G`,
        `swp5       dgx-node-01-rail${railId}  Up     400G`,
      ]
    : [
        `swp1       dgx-node-02-rail${railId}  Up     400G`,
        `swp2       dgx-node-03-rail${railId}  Up     400G`,
        `swp3       dgx-node-04-rail${railId}  Up     400G`,
        `swp4       dgx-node-05-rail${railId}  Up     400G`,
        `swp5       ${dgxDesc}-rail${railId}  Up     400G   <- this node`,
      ]

  if (!isHealthy) {
    return {
      output: `${switchName} # show interface ${switchPortName}
=======================================================
Interface ${switchPortName}  (${dgxLabel} -> mlx5_${railId} -> Rail ${railId})
  Description:   ${dgxDesc}-rail${railId}
  Admin state:   Up
  Oper state:    Err-Disabled                    <- FAULT HERE
  Err reason:    link-flap                       <- port auto-disabled
  Err detail:    6 flaps detected in 30 seconds
  Link flaps:    6 (last 10 min)
  Last flap:     00:07:43 ago
  Recovery:      Manual (requires: no shutdown after physical fix)
  Speed:         400G (last negotiated before disable)
  Type:          ${mediaType}                  <- check ${mediaLabel}

Next steps:
  1. Inspect ${mediaLabel}: ${dgxLabel} port ${dgxEth} <-> ${switchName} port ${switchPortName}
  2. Replace ${mediaLabel} if defective, then: interface ${switchPortName} / no shutdown
  3. Verify link re-establishes: show interface ${switchPortName}

${switchName} # show interface status | grep swp | head -20
Interface  Description                State         Speed
---------  -------------------------  ------------  -----
${faultStatusRows.join('\n')}
swp6       dgx-node-06-rail${railId}  Up            400G   <- Node-06: OK
swp7       dgx-node-07-rail${railId}  Up            400G   <- Node-07: OK
swp8       dgx-node-08-rail${railId}  Up            400G   <- Node-08: OK
swp9       dgx-node-09-rail${railId}  Up            400G   <- Node-09: OK
swp10      dgx-node-10-rail${railId}  Up            400G   <- Node-10: OK
swp11      dgx-node-11-rail${railId}  Up            400G   <- Node-11: OK
swp12      dgx-node-12-rail${railId}  Up            400G   <- Node-12: OK
swp13      dgx-node-13-rail${railId}  Up            400G   <- Node-13: OK
swp14      dgx-node-14-rail${railId}  Up            400G   <- Node-14: OK
swp15      dgx-node-15-rail${railId}  Up            400G   <- Node-15: OK
swp16      dgx-node-16-rail${railId}  Up            400G   <- Node-16: OK
swp33      spine-sw-01                Up            400G   <- Spine uplink
...
swp64      spine-sw-32                Up            400G   <- Spine uplink

Summary:
  Downlinks Up:           15 / 16  (15 DGX nodes fully operational on Rail ${railId})
  Downlinks Err-Disabled: 1 / 16   (${dgxLabel} GPU ${railId} only)
  Uplinks Up:             32 / 32  (all spine paths intact)

CONCLUSION: Single port failure. 15 other DGX nodes on Rail ${railId} unaffected.
Fault is physical: ${mediaLabel} on ${switchPortName} <-> ${dgxLabel}/${dgxEth}.`,
      conceptId: 'rocev2',
      type: 'error',
    }
  }

  return {
    output: `${switchName} # show interface ${switchPortName}
=======================================================
Interface ${switchPortName}  (${dgxLabel} -> mlx5_${railId} -> Rail ${railId})
  Description:   ${dgxDesc}-rail${railId}
  Admin state:   Up
  Oper state:    Up
  Speed:         400G
  Type:          ${mediaType}
  Link flaps:    0 (last 24h)
  RX packets:    6,234,918,441    RX errors: 0
  TX packets:    6,198,441,223    TX errors: 0
  Output drops:  0

${switchName} # show interface status | grep swp | head -8
Interface  Description                State  Speed
---------  -------------------------  -----  -----
${healthyStatusRows.join('\n')}
swp6       dgx-node-06-rail${railId}  Up     400G
...
swp16      dgx-node-16-rail${railId}  Up     400G

All 16 downlinks Up. All 32 spine uplinks Up. Rail ${railId}: HEALTHY`,
    conceptId: 'rocev2',
    type: 'success',
  }
}
