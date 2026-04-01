'use client'
import { useState, useMemo } from 'react'

/**
 * TIMELYGradientViz
 * Compares TIMELY (RTT gradient) vs Swift (absolute RTT) vs DCQCN (ECN threshold)
 * under a simulated queue build-up. Shows which algorithm detects congestion first.
 * Key educational point: TIMELY reacts to dRTT/dt > 0 before RTT exceeds any threshold.
 */

function buildComparison(
  burstIntensity: number,  // 0-100, controls how fast queue builds
  noiseFloorNs: number,    // TIMELY software timestamp noise
) {
  const DT = 0.5  // µs steps
  const TOTAL = 100
  const BASE_RTT_US = 1.0  // 800ns base
  const ECN_MIN_US = 3.0   // ECN marks when RTT corresponds to 500KB queue
  const SWIFT_TARGET_US = 5.8

  let rtt = BASE_RTT_US
  const points = []

  let timelyReacted = -1
  let swiftReacted = -1
  let dcqcnReacted = -1

  for (let t = 0; t <= TOTAL; t += DT) {
    const burstOn = t >= 20 && t < 50
    // RTT model: burst causes linear queue build
    if (burstOn) {
      rtt = Math.min(BASE_RTT_US + (burstIntensity / 100) * 20, rtt + (burstIntensity / 100) * 0.3 * DT)
    } else {
      rtt = Math.max(BASE_RTT_US, rtt - 0.4 * DT)
    }

    // RTT gradient (with noise floor)
    const noise = (Math.random() - 0.5) * 2 * noiseFloorNs / 1000
    const rttWithNoise = rtt + noise
    const prevRTT: number = points.length > 0 ? (points[points.length - 1] as { rtt: number }).rtt : BASE_RTT_US
    const gradient: number = (rttWithNoise - prevRTT) / DT  // µs / µs per step

    // Reaction detection
    if (timelyReacted < 0 && gradient > 0.05 && burstOn) timelyReacted = t
    if (swiftReacted < 0 && rtt > SWIFT_TARGET_US) swiftReacted = t
    if (dcqcnReacted < 0 && rtt > ECN_MIN_US) dcqcnReacted = t  // +2RTT
    const dcqcnEffective = dcqcnReacted >= 0 ? dcqcnReacted + 2 * BASE_RTT_US : -1

    points.push({
      t,
      rtt: rttWithNoise,
      rttClean: rtt,
      gradient,
      burstOn,
      timelyActive: timelyReacted >= 0 && t >= timelyReacted,
      swiftActive: swiftReacted >= 0 && t >= swiftReacted,
      dcqcnActive: dcqcnEffective >= 0 && t >= dcqcnEffective,
    })
  }

  return {
    points,
    timelyReacted,
    swiftReacted,
    dcqcnReacted: dcqcnReacted >= 0 ? dcqcnReacted + 2 * BASE_RTT_US : -1,
  }
}

export default function TIMELYGradientViz() {
  const [burstIntensity, setBurstIntensity] = useState(60)
  const [noiseFloorNs, setNoiseFloorNs] = useState(500)

  const { points, timelyReacted, swiftReacted, dcqcnReacted } = useMemo(
    () => buildComparison(burstIntensity, noiseFloorNs),
    [burstIntensity, noiseFloorNs]
  )

  const W = 540
  const H = 300
  const PAD = { top: 12, right: 24, bottom: 32, left: 52 }
  const cW = W - PAD.left - PAD.right
  const RTT_H = 110
  const GRAD_H = 90
  const SEP = 28

  const maxRTT = 22
  const maxGrad = 2
  const minGrad = -1

  const toX = (t: number) => PAD.left + (t / 100) * cW
  const toRttY = (v: number) => PAD.top + RTT_H - (Math.min(v, maxRTT) / maxRTT) * RTT_H
  const toGradY = (v: number) => {
    const clamped = Math.max(minGrad, Math.min(v, maxGrad))
    return PAD.top + RTT_H + SEP + GRAD_H * (1 - (clamped - minGrad) / (maxGrad - minGrad))
  }

  const rttPoly = points.map(p => `${toX(p.t)},${toRttY(p.rtt)}`).join(' ')
  const rttCleanPoly = points.map(p => `${toX(p.t)},${toRttY(p.rttClean)}`).join(' ')
  const gradPoly = points.map(p => `${toX(p.t)},${toGradY(p.gradient)}`).join(' ')
  const zeroY = toGradY(0)

  const reactionColor: Record<string, string> = {
    timely: '#a78bfa',
    swift: '#34d399',
    dcqcn: '#f87171',
  }

  const formatUs = (t: number) => t >= 0 ? `${t.toFixed(1)}µs` : 'n/a'

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
        COMPARATIVE MODEL
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#a78bfa', marginBottom: 4 }}>
        TIMELY Gradient vs Threshold-Based Algorithms
      </div>
      <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 16 }}>
        Shows which algorithm detects the onset of congestion first. Burst starts at t=20µs.
      </div>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#7c8db5' }}>BURST INTENSITY: {burstIntensity}%</span>
          <input type="range" min={10} max={100} step={5} value={burstIntensity}
            onChange={e => setBurstIntensity(Number(e.target.value))}
            style={{ accentColor: '#f97316' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#7c8db5' }}>
            SW TIMESTAMP NOISE: {noiseFloorNs}ns
          </span>
          <input type="range" min={0} max={5000} step={100} value={noiseFloorNs}
            onChange={e => setNoiseFloorNs(Number(e.target.value))}
            style={{ accentColor: '#a78bfa' }} />
        </label>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', marginBottom: 14 }}>
        {/* Burst highlight */}
        <rect x={toX(20)} y={PAD.top} width={toX(50) - toX(20)}
          height={RTT_H + SEP + GRAD_H} fill="#f97316" fillOpacity={0.06} />

        {/* === RTT panel === */}
        {[0, 5, 10, 15, 20].map(v => (
          <g key={v}>
            <line x1={PAD.left} y1={toRttY(v)} x2={PAD.left + cW} y2={toRttY(v)} stroke="#1e2130" />
            <text x={PAD.left - 6} y={toRttY(v) + 4} fontSize={9} fill="#4a5568" textAnchor="end">{v}µs</text>
          </g>
        ))}
        {/* ECN threshold */}
        <line x1={PAD.left} y1={toRttY(3)} x2={PAD.left + cW} y2={toRttY(3)}
          stroke="#f87171" strokeWidth={1} strokeDasharray="4 3" />
        <text x={PAD.left + cW + 2} y={toRttY(3) + 4} fontSize={8} fill="#f87171">ECN</text>
        {/* Swift target */}
        <line x1={PAD.left} y1={toRttY(5.8)} x2={PAD.left + cW} y2={toRttY(5.8)}
          stroke="#34d399" strokeWidth={1} strokeDasharray="4 3" />
        <text x={PAD.left + cW + 2} y={toRttY(5.8) + 4} fontSize={8} fill="#34d399">Swift</text>
        {/* RTT noisy */}
        <polyline points={rttPoly} fill="none" stroke="#fbbf24" strokeWidth={1.5} opacity={0.5} />
        {/* RTT clean */}
        <polyline points={rttCleanPoly} fill="none" stroke="#fbbf24" strokeWidth={2.5} />
        <text x={PAD.left + 6} y={PAD.top + 12} fontSize={10} fill="#fbbf24">RTT (measured)</text>
        <line x1={PAD.left} y1={PAD.top + RTT_H} x2={PAD.left + cW} y2={PAD.top + RTT_H} stroke="#2a2d3e" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + RTT_H} stroke="#2a2d3e" />

        {/* === Gradient panel === */}
        <line x1={PAD.left} y1={zeroY} x2={PAD.left + cW} y2={zeroY}
          stroke="#334155" strokeWidth={1} strokeDasharray="3 2" />
        <text x={PAD.left - 6} y={zeroY + 4} fontSize={9} fill="#4a5568" textAnchor="end">0</text>
        <text x={PAD.left - 6} y={toGradY(maxGrad) + 4} fontSize={9} fill="#4a5568" textAnchor="end">+{maxGrad}</text>
        <text x={PAD.left - 6} y={toGradY(minGrad) + 4} fontSize={9} fill="#4a5568" textAnchor="end">{minGrad}</text>
        <polyline points={gradPoly} fill="none" stroke="#a78bfa" strokeWidth={2} />
        <text x={PAD.left + 6} y={PAD.top + RTT_H + SEP + 14} fontSize={10} fill="#a78bfa">dRTT/dt (gradient)</text>
        <line x1={PAD.left} y1={PAD.top + RTT_H + SEP + GRAD_H}
          x2={PAD.left + cW} y2={PAD.top + RTT_H + SEP + GRAD_H} stroke="#2a2d3e" />
        <line x1={PAD.left} y1={PAD.top + RTT_H + SEP}
          x2={PAD.left} y2={PAD.top + RTT_H + SEP + GRAD_H} stroke="#2a2d3e" />

        {/* Reaction markers */}
        {[
          { t: timelyReacted, label: 'TIMELY', color: reactionColor.timely },
          { t: swiftReacted, label: 'Swift', color: reactionColor.swift },
          { t: dcqcnReacted, label: 'DCQCN', color: reactionColor.dcqcn },
        ].filter(m => m.t >= 0).map((m, i) => (
          <g key={m.label}>
            <line x1={toX(m.t)} y1={PAD.top} x2={toX(m.t)} y2={PAD.top + RTT_H + SEP + GRAD_H}
              stroke={m.color} strokeWidth={1.5} strokeDasharray="5 2" opacity={0.8} />
            <text x={toX(m.t)} y={PAD.top + RTT_H + SEP + GRAD_H + 14 + (i * 10)}
              fontSize={8} fill={m.color} textAnchor="middle">{m.label}</text>
          </g>
        ))}

        {/* X axis */}
        {[0, 20, 40, 60, 80, 100].map(t => (
          <text key={t} x={toX(t)} y={H - 4} fontSize={9} fill="#4a5568" textAnchor="middle">{t}µs</text>
        ))}
      </svg>

      {/* Reaction time comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'TIMELY reacts', value: formatUs(timelyReacted), color: reactionColor.timely, subtitle: 'gradient > 0' },
          { label: 'Swift reacts', value: formatUs(swiftReacted), color: reactionColor.swift, subtitle: 'RTT > target' },
          { label: 'DCQCN reacts', value: formatUs(dcqcnReacted), color: reactionColor.dcqcn, subtitle: 'ECN + 2×RTT' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#161928', border: `1px solid ${s.color}44`,
            borderRadius: 8, padding: '8px 10px',
          }}>
            <div style={{ fontSize: 9, color: '#7c8db5' }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: '#4a5568' }}>{s.subtitle}</div>
          </div>
        ))}
      </div>

      {noiseFloorNs > 2000 && (
        <div style={{
          background: '#1c0a00', border: '1px solid #f97316', borderRadius: 8,
          padding: '8px 12px', fontSize: 11, color: '#fb923c', marginBottom: 8,
        }}>
          ⚠ At {noiseFloorNs}ns noise floor, gradient signal is buried in timestamp noise.
          TIMELY requires hardware timestamps (noise &lt; 100ns) for sub-5µs RTT environments.
        </div>
      )}

      <div style={{
        background: '#0d1424', border: '1px solid #1e3a5f', borderRadius: 8,
        padding: '10px 14px', fontSize: 11, color: '#93c5fd', lineHeight: 1.6,
      }}>
        <span style={{ color: '#60a5fa', fontWeight: 700 }}>Gradient advantage:</span> TIMELY
        detects rising RTT immediately at burst onset (t=20µs). Swift waits until RTT exceeds
        5.8µs target. DCQCN waits until queue fills to ECN threshold (500KB → ~3µs extra RTT)
        then adds 2 more RTTs before the sender responds.
      </div>
    </div>
  )
}
