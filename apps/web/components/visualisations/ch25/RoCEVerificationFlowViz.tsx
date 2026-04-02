'use client'
import { useState } from 'react'

interface TestStep {
  id: number
  tool: string
  command: string
  passOutput: string
  failOutput: string
  passNote: string
  failNote: string
  metric: string
  passThreshold: string
}

const STEPS: TestStep[] = [
  {
    id: 1, tool: 'ibv_devinfo', command: 'ibv_devinfo -d mlx5_0',
    passOutput: `hca_id: mlx5_0\n  state:       PORT_ACTIVE (4)\n  active_mtu:  4096 (5)\n  link_layer:  Ethernet\n  active_speed: 400 Gb/sec`,
    failOutput: `hca_id: mlx5_0\n  state:       PORT_DOWN (1)\n  active_mtu:  512 (3)\n  link_layer:  Ethernet\n  active_speed: 400 Gb/sec`,
    passNote: 'PORT_ACTIVE + active_mtu=4096 confirms jumbo MTU negotiated. MTU 5 = 4096 bytes in IB encoding.',
    failNote: 'PORT_DOWN = physical or logical link issue. active_mtu=512 (3) = 1024 bytes, confirms 1500 MTU on Ethernet side.',
    metric: 'Port state + MTU', passThreshold: 'PORT_ACTIVE, mtu=4096',
  },
  {
    id: 2, tool: 'ibv_rc_pingpong', command: 'ibv_rc_pingpong -d mlx5_0 -g 0 192.168.100.2',
    passOutput: `8192000 bytes in 0.003 seconds = 24530.27 Mbit/sec`,
    failOutput: `ibv_rc_pingpong: failed to modify QP to RTR\nConnection timeout after 30 seconds`,
    passNote: 'QP state machine completed RESETâ†’INITâ†’RTRâ†’RTS. Basic RDMA connectivity confirmed.',
    failNote: 'RTR transition failed. Check: remote server started? MTU mismatch? Firewall on RoCE ports?',
    metric: 'RDMA connectivity', passThreshold: 'QP reaches RTS, data transfers',
  },
  {
    id: 3, tool: 'ib_write_bw', command: 'ib_write_bw -d mlx5_0 --iters 5000 --size 65536 192.168.100.2',
    passOutput: `-------------------------------------------------------------------\n #bytes  #iterations  BW peak[GB/sec]  BW average[GB/sec]\n 65536   5000           46.92            46.81\n-------------------------------------------------------------------`,
    failOutput: `-------------------------------------------------------------------\n #bytes  #iterations  BW peak[GB/sec]  BW average[GB/sec]\n 65536   5000           12.34            12.21\n-------------------------------------------------------------------`,
    passNote: '46.81 GB/s = 99.5% of 400GbE line rate. Confirms MTU=9000, lossless queue, no retransmissions.',
    failNote: '12.21 GB/s â‰ˆ 26% of line rate. Classic MTU mismatch signature. Check ip link show eth0 | grep mtu.',
    metric: 'Bandwidth', passThreshold: 'â‰¥ 46.5 GB/s',
  },
  {
    id: 4, tool: 'ib_write_lat', command: 'ib_write_lat -d mlx5_0 --iters 10000 192.168.100.2',
    passOutput: `-------------------------------------------------------------------\n #bytes #iters  t_min    t_max    t_typical  t_99p    t_99.9p\n 2      10000   0.81     4.23     0.87       1.19     2.84\n-------------------------------------------------------------------\n [all values in Âµs]`,
    failOutput: `-------------------------------------------------------------------\n #bytes #iters  t_min    t_max    t_typical  t_99p    t_99.9p\n 2      10000   0.82     84.21    0.91       38.47    81.22\n-------------------------------------------------------------------\n [all values in Âµs]`,
    passNote: 'p99=1.19Âµs confirms lossless operation with ECN/DCQCN preventing PFC storms.',
    failNote: 'p99=38Âµs indicates PFC pause events or NACK retransmissions. Check ECN config and CNP on TC6.',
    metric: 'Latency', passThreshold: 'p99 â‰¤ 1.2Âµs, p999 â‰¤ 5Âµs',
  },
  {
    id: 5, tool: 'ethtool counters', command: "ethtool -S mlx5_0 | grep -E 'ecn|pfc|retry'",
    passOutput: `  tx_ecn_marked_pkts:              2847392\n  rx_pfc_xoff_frames_priority_3:       142\n  rx_pfc_xon_frames_priority_3:        142\n  tx_retry_exceeded:                     0`,
    failOutput: `  tx_ecn_marked_pkts:                    0\n  rx_pfc_xoff_frames_priority_3:   284739\n  rx_pfc_xon_frames_priority_3:    284716\n  tx_retry_exceeded:                  8821`,
    passNote: 'ECN marking active (2.8M marks = DCQCN engaged). PFC fires rarely (142). Zero retransmit exceed = no loss.',
    failNote: 'Zero ECN marks + high PFC rate = ECN misconfigured. 8821 tx_retry_exceeded = packet drops confirmed.',
    metric: 'Counter health', passThreshold: 'ecn_marked > 0, pfc_xoff low, retry_exceeded = 0',
  },
]

export default function RoCEVerificationFlowViz() {
  const [activeStep, setActiveStep] = useState(1)
  const [showPass, setShowPass] = useState(true)
  const step = STEPS.find(s => s.id === activeStep)!

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 12,
      padding: '20px 24px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0', maxWidth: 680, margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>INTERACTIVE</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#60a5fa', marginBottom: 16 }}>RoCE Verification Test Sequence</div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {STEPS.map(s => (
          <button key={s.id} onClick={() => setActiveStep(s.id)} style={{ flex: 1, padding: '6px 4px', borderRadius: 6, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', background: activeStep === s.id ? '#60a5fa' : '#161928', border: `1px solid ${activeStep === s.id ? '#60a5fa' : '#2a2d3e'}`, color: activeStep === s.id ? '#0f1117' : '#7c8db5', fontWeight: activeStep === s.id ? 700 : 400, textAlign: 'center' }}>
            {s.id}. {s.tool}
          </button>
        ))}
      </div>

      <div style={{ background: '#161928', border: '1px solid #2a2d3e', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 4 }}>COMMAND</div>
        <div style={{ fontSize: 12, color: '#76e5b5' }}><span style={{ color: '#7c8db5' }}>dgx-01:~$ </span>{step.command}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setShowPass(true)} style={{ flex: 1, padding: '6px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', background: showPass ? '#0d2a1f' : '#161928', border: `1px solid ${showPass ? '#76e5b5' : '#2a2d3e'}`, color: showPass ? '#76e5b5' : '#7c8db5' }}>âœ“ Pass Output</button>
        <button onClick={() => setShowPass(false)} style={{ flex: 1, padding: '6px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', background: !showPass ? '#2a0f0f' : '#161928', border: `1px solid ${!showPass ? '#f87171' : '#2a2d3e'}`, color: !showPass ? '#f87171' : '#7c8db5' }}>âœ— Fail Output</button>
      </div>

      <div style={{ background: '#0d0f18', border: `1px solid ${showPass ? '#76e5b5' : '#f87171'}`, borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
        <pre style={{ margin: 0, fontSize: 11, color: showPass ? '#76e5b5' : '#f87171', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{showPass ? step.passOutput : step.failOutput}</pre>
      </div>

      <div style={{ background: '#161928', border: `1px solid ${showPass ? '#76e5b5' : '#f87171'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 4 }}>{showPass ? 'âœ“ INTERPRETATION' : 'âœ— ROOT CAUSE'}</div>
        <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>{showPass ? step.passNote : step.failNote}</div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ fontSize: 11, color: '#7c8db5' }}>Metric: <span style={{ color: '#e2e8f0' }}>{step.metric}</span></div>
        <div style={{ fontSize: 11, color: '#7c8db5' }}>Pass: <span style={{ color: '#76e5b5' }}>{step.passThreshold}</span></div>
      </div>
    </div>
  )
}
