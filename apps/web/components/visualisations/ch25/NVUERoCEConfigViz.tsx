'use client'
import { useState } from 'react'

type Mode = 'shorthand' | 'manual'

interface ConfigStep {
  id: number
  command: string
  annotation: string
  detail: string
  color: string
}

const SHORTHAND_STEPS: ConfigStep[] = [
  {
    id: 1,
    command: 'nv set interface swp1-32 qos roce',
    annotation: 'â† One command applies all RoCE defaults',
    detail: 'Sets DSCP trust, maps DSCP 26â†’TC3 and DSCP 48â†’TC6, enables PFC on priority 3, sets ECN thresholds to 1.5MB/3MB, configures TC3 and TC6 as Strict Priority. NVIDIA-validated defaults for DGX deployments.',
    color: '#76e5b5',
  },
  {
    id: 2,
    command: 'nv config apply',
    annotation: 'â† Atomically commits to running config',
    detail: 'NVUE performs a two-phase commit: validates the configuration against hardware constraints, then atomically pushes all changes to the Spectrum-4 ASIC. If validation fails, no partial config is applied.',
    color: '#60a5fa',
  },
  {
    id: 3,
    command: 'nv config save',
    annotation: 'â† Persists to startup config',
    detail: 'Writes the validated running config to /etc/nvue.d/startup.yaml. Without this, a reboot restores the previous config. Always save after apply in production.',
    color: '#a78bfa',
  },
  {
    id: 4,
    command: 'nv show qos roce',
    annotation: 'â† Verify shorthand was applied',
    detail: 'Shows the global RoCE mode and enable state. Expected output: enable=on, roce-mode=lossy. If "off", shorthand did not apply â€” check interface range syntax.',
    color: '#fbbf24',
  },
  {
    id: 5,
    command: 'nv show interface swp1 qos',
    annotation: 'â† Verify per-port QoS state',
    detail: 'Shows trust mode, per-TC DSCP map, PFC enable state, ECN enable state, and scheduling discipline for a specific port. Verify Trust=dscp, TC3 PFC=on ECN=on, TC6 SP.',
    color: '#f97316',
  },
]

const MANUAL_STEPS: ConfigStep[] = [
  {
    id: 1,
    command: 'nv set interface swp1-32 qos trust dscp',
    annotation: 'â† Enable DSCP trust on all RoCE ports',
    detail: 'By default, Spectrum-X switches overwrite DSCP. This command trusts the DSCP value set by the DGX H100 ConnectX-7 NIC. Required before any DSCP-to-TC mapping takes effect.',
    color: '#76e5b5',
  },
  {
    id: 2,
    command: 'nv set qos map dscp 26 traffic-class 3\nnv set qos map dscp 48 traffic-class 6\nnv set qos map dscp 46 traffic-class 5\nnv set qos map dscp 10 traffic-class 1',
    annotation: 'â† Map all traffic classes',
    detail: 'DSCP 26 = RoCEv2 training â†’ TC3 lossless. DSCP 48 = CNP â†’ TC6 strict priority. DSCP 46 = NCCL collectives â†’ TC5 DWRR. DSCP 10 = checkpoint-to-storage â†’ TC1. The shorthand only maps DSCP 26 and 48.',
    color: '#60a5fa',
  },
  {
    id: 3,
    command: 'nv set interface swp1-32 qos pfc priority 3\nnv set interface swp1-32 qos pfc enable on',
    annotation: 'â† PFC on priority 3 only',
    detail: 'Enables IEEE 802.1Qbb pause frames on priority 3 (TC3) exclusively. Verify with nv show qos pfc â€” all other priorities must show PFC disabled.',
    color: '#a78bfa',
  },
  {
    id: 4,
    command: 'nv set qos ecn profile roce min-threshold 500000\nnv set qos ecn profile roce max-threshold 1500000\nnv set interface swp1-32 qos egress-queue-mapping traffic-class 3 ecn on',
    annotation: 'â† ECN thresholds: 500KB min / 1.5MB max',
    detail: 'min-threshold=500KB is the queue depth at which ECN marking begins. max-threshold=1.5MB is where marking probability reaches 100%. Sized for 400GbE fabric with multiple concurrent DGX flows.',
    color: '#fbbf24',
  },
  {
    id: 5,
    command: 'nv config apply && nv config save',
    annotation: 'â† Apply and persist',
    detail: 'Atomic apply followed by persistence. The && ensures save only runs if apply succeeds.',
    color: '#f97316',
  },
]

export default function NVUERoCEConfigViz() {
  const [mode, setMode] = useState<Mode>('shorthand')
  const [activeStep, setActiveStep] = useState<number | null>(null)

  const steps = mode === 'shorthand' ? SHORTHAND_STEPS : MANUAL_STEPS

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 12,
      padding: '20px 24px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0', maxWidth: 680, margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>INTERACTIVE</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#60a5fa', marginBottom: 16 }}>NVUE RoCE Configuration Walkthrough</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {(['shorthand', 'manual'] as Mode[]).map(m => (
          <button key={m} onClick={() => { setMode(m); setActiveStep(null) }}
            style={{
              padding: '6px 16px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              background: mode === m ? '#60a5fa' : '#161928',
              border: `1px solid ${mode === m ? '#60a5fa' : '#2a2d3e'}`,
              color: mode === m ? '#0f1117' : '#7c8db5',
              fontFamily: 'inherit', fontWeight: mode === m ? 700 : 400,
            }}>
            {m === 'shorthand' ? 'Shorthand (qos roce)' : 'Manual Path'}
          </button>
        ))}
      </div>

      {mode === 'shorthand' && (
        <div style={{ background: '#0d2a1f', border: '1px solid #76e5b5', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: '#76e5b5' }}>
          Shorthand applies all NVIDIA-recommended defaults. Use for Day 0 bring-up. Does not set DSCP 46 (NCCL) or DSCP 10 (checkpoint).
        </div>
      )}
      {mode === 'manual' && (
        <div style={{ background: '#1a1400', border: '1px solid #fbbf24', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: '#fbbf24' }}>
          Manual path: full control over DSCP map, ECN thresholds, and per-TC scheduling. Required for NCCL DSCP 46 and multi-tenant deployments.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {steps.map((step, idx) => {
          const isActive = activeStep === step.id
          return (
            <div key={step.id}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 10, background: step.color,
                  color: '#0f1117', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 10,
                }}>{idx + 1}</div>
                <div onClick={() => setActiveStep(isActive ? null : step.id)}
                  style={{
                    flex: 1, background: '#161928',
                    border: `1px solid ${isActive ? step.color : '#2a2d3e'}`,
                    borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}>
                  <pre style={{ margin: 0, fontSize: 12, color: step.color, whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.7 }}>
                    {step.command.split('\n').map((line, i) => (
                      <span key={i}>
                        <span style={{ color: '#7c8db5' }}>leaf-01# </span>
                        {line}{i < step.command.split('\n').length - 1 ? '\n' : ''}
                      </span>
                    ))}
                  </pre>
                  <div style={{ fontSize: 11, color: '#7c8db5', marginTop: 4 }}>{step.annotation}</div>
                </div>
              </div>
              {isActive && (
                <div style={{
                  marginLeft: 28, background: '#0d0f18',
                  border: `1px solid ${step.color}`, borderRadius: 8, padding: '10px 14px', marginBottom: 4,
                }}>
                  <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.7 }}>{step.detail}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: '#4a5568', textAlign: 'center' }}>
        Click any command block to expand explanation
      </div>
    </div>
  )
}
