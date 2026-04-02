'use client'
import { useState, useMemo } from 'react'

/**
 * SwiftRTTViz
 * Visualises the Swift congestion control algorithm:
 *   - Shows RTT target vs measured RTT over a simulated burst event
 *   - Shows TX rate over the same time window
 *   - Compares with DCQCN 2-RTT reaction delay
 */

interface DataPoint {
  t: number       // time in µs
  rttMeasured: number  // µs
  rttTarget: number    // µs
  swiftRate: number    // % of line rate
  dcqcnRate: number    // % of line rate (delayed reaction)
}

function buildSimulation(
  targetDelayUs: number,
  beta: number,
  burstStartUs: number,
  burstDurationUs: number
): DataPoint[] {
  const points: DataPoint[] = []
  const rttBase = 0.8  // 800ns baseline (single rack, 400GbE)
  const TOTAL = 200    // µs simulation window
  const DT = 1.0       // µs step

  let swiftRate = 100
  let dcqcnRate = 100
  let dcqcnCnpDelay = 0  // ticks until DCQCN reacts (2 RTTs)

  for (let t = 0; t <= TOTAL; t += DT) {
    const inBurst = t >= burstStartUs && t < burstStartUs + burstDurationUs

    // RTT model: burst adds queuing delay
    const queueingDelay = inBurst ? Math.min(20, (t - burstStartUs) * 0.5) : Math.max(0, (t - burstStartUs - burstDurationUs) * -0.3 + (burstDurationUs * 0.5 > 20 ? 20 : burstDurationUs * 0.5))
    const rttMeasured = rttBase + Math.max(0, queueingDelay)

    // Swift: react to RTT vs target_delay
    if (rttMeasured > targetDelayUs) {
      const excess = (rttMeasured - targetDelayUs) / rttMeasured
      swiftRate = Math.max(5, swiftRate * (1 - beta * excess))
    } else {
      swiftRate = Math.min(100, swiftRate + 2)
    }

    // DCQCN: ECN marks when queue > 0.5µs queuing delay (500KB at 400G)
    // React 2 RTTs later
    dcqcnCnpDelay = Math.max(0, dcqcnCnpDelay - DT)
    if (queueingDelay > 1.25 && dcqcnCnpDelay <= 0) {
      // ECN marks → CNP → 2 RTTs until reaction
      dcqcnCnpDelay = 2 * rttBase
    }
    if (dcqcnCnpDelay <= 0 && queueingDelay > 1.25) {
      dcqcnRate = Math.max(5, dcqcnRate * 0.875)  // alpha~0.25 → rate * (1 - 0.125)
      dcqcnCnpDelay = 2 * rttBase
    } else if (queueingDelay < 0.5) {
      dcqcnRate = Math.min(100, dcqcnRate + 2.5)
    }

    points.push({
      t,
      rttMeasured,
      rttTarget: targetDelayUs,
      swiftRate,
      dcqcnRate,
    })
  }
  return points
}

export default function SwiftRTTViz() {
  const [targetDelayUs, setTargetDelayUs] = useState(5.8)
  const [beta, setBeta] = useState(0.5)
  const [burstStart, setBurstStart] = useState(40)
  const [burstDuration, setBurstDuration] = useState(30)

  const data = useMemo(
    () => buildSimulation(targetDelayUs, beta, burstStart, burstDuration),
    [targetDelayUs, beta, burstStart, burstDuration]
  )

  const W = 540
  const H = 340
  const PAD = { top: 12, right: 20, bottom: 28, left: 52 }
  const cW = W - PAD.left - PAD.right
  const TOP_H = 130
  const BOT_H = 120
  const GAP = 24

  const maxRTT = Math.max(...data.map(d => d.rttMeasured), targetDelayUs + 1, 10)

  const toTopY = (rtt: number) => PAD.top + TOP_H - (rtt / maxRTT) * TOP_H
  const toBotY = (rate: number) => PAD.top + TOP_H + GAP + BOT_H - (rate / 100) * BOT_H
  const toX = (t: number) => PAD.left + (t / 200) * cW

  const rttPolyline = data.map(d => `${toX(d.t)},${toTopY(d.rttMeasured)}`).join(' ')
  const swiftPolyline = data.map(d => `${toX(d.t)},${toBotY(d.swiftRate)}`).join(' ')
  const dcqcnPolyline = data.map(d => `${toX(d.t)},${toBotY(d.dcqcnRate)}`).join(' ')

  const burstX1 = toX(burstStart)
  const burstX2 = toX(burstStart + burstDuration)

  // Target RTT line
  const targetY = toTopY(targetDelayUs)

  return (
    <div
      style={{
        background: '#0f1117',
        border: '1px solid #2a2d3e',
        borderRadius: 12,
        padding: '20px 24px',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: '#e2e8f0',
        maxWidth: 620,
        margin: '24px auto',
      }}
    >
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>
        INTERACTIVE MODEL
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#a78bfa', marginBottom: 16 }}>
        Swift RTT-Based CC vs DCQCN Reaction Delay
      </div>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#7c8db5' }}>TARGET DELAY: {targetDelayUs.toFixed(1)} µs</span>
          <input type="range" min={1} max={20} step={0.5} value={targetDelayUs}
            onChange={e => setTargetDelayUs(Number(e.target.value))}
            style={{ accentColor: '#a78bfa' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#7c8db5' }}>DECREASE FACTOR β: {beta.toFixed(2)}</span>
          <input type="range" min={0.1} max={0.9} step={0.05} value={beta}
            onChange={e => setBeta(Number(e.target.value))}
            style={{ accentColor: '#a78bfa' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#7c8db5' }}>BURST START: {burstStart} µs</span>
          <input type="range" min={10} max={100} step={5} value={burstStart}
            onChange={e => setBurstStart(Number(e.target.value))}
            style={{ accentColor: '#f97316' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#7c8db5' }}>BURST DURATION: {burstDuration} µs</span>
          <input type="range" min={5} max={60} step={5} value={burstDuration}
            onChange={e => setBurstDuration(Number(e.target.value))}
            style={{ accentColor: '#f97316' }} />
        </label>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', marginBottom: 12 }}>
        {/* Burst region */}
        <rect x={burstX1} y={PAD.top} width={burstX2 - burstX1} height={TOP_H + GAP + BOT_H}
          fill="#f97316" fillOpacity={0.07} />
        <text x={(burstX1 + burstX2) / 2} y={PAD.top + TOP_H + GAP + BOT_H + 16}
          fontSize={9} fill="#f97316" textAnchor="middle">burst</text>

        {/* === RTT panel === */}
        {/* grid */}
        {[0, 5, 10, 15, 20].filter(v => v <= maxRTT).map(v => {
          const y = toTopY(v)
          return (
            <g key={v}>
              <line x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y} stroke="#1e2130" strokeWidth={1} />
              <text x={PAD.left - 6} y={y + 4} fontSize={9} fill="#4a5568" textAnchor="end">{v}µs</text>
            </g>
          )
        })}
        {/* Target delay line */}
        <line x1={PAD.left} y1={targetY} x2={PAD.left + cW} y2={targetY}
          stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6 3" />
        <text x={PAD.left + cW + 4} y={targetY + 4} fontSize={9} fill="#a78bfa">target</text>
        {/* RTT curve */}
        <polyline points={rttPolyline} fill="none" stroke="#fbbf24" strokeWidth={2} />
        {/* Label */}
        <text x={PAD.left + 6} y={PAD.top + 12} fontSize={10} fill="#fbbf24">Measured RTT</text>
        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top + TOP_H} x2={PAD.left + cW} y2={PAD.top + TOP_H} stroke="#2a2d3e" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + TOP_H} stroke="#2a2d3e" />

        {/* === Rate panel === */}
        {/* grid */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = toBotY(v)
          return (
            <g key={v}>
              <line x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y} stroke="#1e2130" strokeWidth={1} />
              <text x={PAD.left - 6} y={y + 4} fontSize={9} fill="#4a5568" textAnchor="end">{v}%</text>
            </g>
          )
        })}
        {/* Swift rate */}
        <polyline points={swiftPolyline} fill="none" stroke="#34d399" strokeWidth={2} />
        {/* DCQCN rate */}
        <polyline points={dcqcnPolyline} fill="none" stroke="#f87171" strokeWidth={2} strokeDasharray="5 3" />
        {/* Label */}
        <text x={PAD.left + 6} y={PAD.top + TOP_H + GAP + 14} fontSize={10} fill="#34d399">Swift (1-RTT)</text>
        <text x={PAD.left + 6} y={PAD.top + TOP_H + GAP + 26} fontSize={10} fill="#f87171">DCQCN (2-RTT)</text>
        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top + TOP_H + GAP + BOT_H} x2={PAD.left + cW} y2={PAD.top + TOP_H + GAP + BOT_H} stroke="#2a2d3e" />
        <line x1={PAD.left} y1={PAD.top + TOP_H + GAP} x2={PAD.left} y2={PAD.top + TOP_H + GAP + BOT_H} stroke="#2a2d3e" />

        {/* X axis labels */}
        {[0, 50, 100, 150, 200].map(t => (
          <text key={t} x={toX(t)} y={PAD.top + TOP_H + GAP + BOT_H + 14}
            fontSize={9} fill="#4a5568" textAnchor="middle">{t}µs</text>
        ))}
      </svg>

      <div style={{
        background: '#0d1424',
        border: '1px solid #1e3a5f',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 11,
        color: '#93c5fd',
        lineHeight: 1.6,
      }}>
        <span style={{ color: '#60a5fa', fontWeight: 700 }}>Key insight:</span> Swift reacts as
        soon as measured RTT exceeds target (1 RTT after congestion onset). DCQCN must wait for
        ECN mark at switch → CNP at receiver → CNP at sender = 2 RTTs. Under incast, Swift begins
        rate reduction ~{(0.8 * 2).toFixed(1)} µs earlier per burst event.
      </div>
    </div>
  )
}
