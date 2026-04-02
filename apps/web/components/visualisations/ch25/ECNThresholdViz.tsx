'use client'
import { useMemo, useState } from 'react'

export default function ECNThresholdViz() {
  const [minThresh, setMinThresh] = useState(500)
  const [maxThresh, setMaxThresh] = useState(1500)
  const [bwGbps, setBwGbps] = useState(400)
  const [rttUs, setRttUs] = useState(1.6)
  const [queueDepthKb, setQueueDepthKb] = useState(600)

  const bdpKb = useMemo(() => {
    const bwBytesPerSec = (bwGbps * 1e9) / 8
    const rttSec = rttUs * 1e-6
    return Math.round((bwBytesPerSec * rttSec) / 1024)
  }, [bwGbps, rttUs])

  const bdpOver4 = Math.round(bdpKb / 4)

  const getMarkingProb = (depthKb: number): number => {
    if (depthKb <= minThresh) return 0
    if (depthKb >= maxThresh) return 100
    return Math.round(((depthKb - minThresh) / (maxThresh - minThresh)) * 100)
  }

  const currentProb = getMarkingProb(queueDepthKb)
  const bufferCapKb = 6 * 1024
  const minTooHigh = minThresh > bufferCapKb
  const minTooLow = minThresh < 50

  const points = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const maxX = Math.max(maxThresh * 1.5, 3000)
    for (let d = 0; d <= maxX; d += maxX / 200) {
      pts.push({ x: d, y: getMarkingProb(d) })
    }
    return pts
  }, [maxThresh, minThresh])

  const W = 620
  const H = 180
  const maxX = Math.max(maxThresh * 1.5, 3000)
  const toSvgX = (kb: number) => (kb / maxX) * (W - 40) + 20
  const toSvgY = (pct: number) => H - 20 - (pct / 100) * (H - 40)
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x).toFixed(1)} ${toSvgY(p.y).toFixed(1)}`).join(' ')

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 12,
      padding: '20px 24px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0', maxWidth: 680, margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>INTERACTIVE</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#60a5fa', marginBottom: 16 }}>ECN Threshold Tuning â€” Marking Probability vs Queue Depth</div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 4 }}>Link BW: <span style={{ color: '#e2e8f0' }}>{bwGbps} Gbps</span></div>
          <input type="range" min={100} max={400} step={100} value={bwGbps} onChange={e => setBwGbps(Number(e.target.value))} style={{ width: '100%', accentColor: '#60a5fa' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 4 }}>Fabric RTT: <span style={{ color: '#e2e8f0' }}>{rttUs} Âµs</span></div>
          <input type="range" min={0.5} max={5} step={0.1} value={rttUs} onChange={e => setRttUs(Number(e.target.value))} style={{ width: '100%', accentColor: '#60a5fa' }} />
        </div>
      </div>

      <div style={{ background: '#161928', border: '1px solid #2a2d3e', borderRadius: 8, padding: '8px 14px', marginBottom: 14, fontSize: 12, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>BDP = <span style={{ color: '#fbbf24' }}>{bdpKb} KB</span></div>
        <div>BDP/4 = <span style={{ color: '#76e5b5' }}>{bdpOver4} KB</span> <span style={{ color: '#7c8db5' }}>(recommended min_threshold base)</span></div>
      </div>

      <div style={{ marginBottom: 14, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: W, maxWidth: W, display: 'block' }}>
          {[0, 25, 50, 75, 100].map(pct => (
            <g key={pct}>
              <line x1={20} y1={toSvgY(pct)} x2={W - 20} y2={toSvgY(pct)} stroke="#2a2d3e" strokeWidth={0.5} />
              <text x={12} y={toSvgY(pct) + 4} fontSize={9} fill="#4a5568" textAnchor="end">{pct}%</text>
            </g>
          ))}
          <line x1={toSvgX(bdpOver4)} y1={20} x2={toSvgX(bdpOver4)} y2={H - 20} stroke="#76e5b5" strokeWidth={1} strokeDasharray="4,3" opacity={0.7} />
          <text x={toSvgX(bdpOver4) + 3} y={30} fontSize={9} fill="#76e5b5">BDP/4</text>
          <line x1={toSvgX(minThresh)} y1={20} x2={toSvgX(minThresh)} y2={H - 20} stroke="#fbbf24" strokeWidth={1.5} />
          <text x={toSvgX(minThresh)} y={H - 6} fontSize={9} fill="#fbbf24" textAnchor="middle">min</text>
          <line x1={toSvgX(maxThresh)} y1={20} x2={toSvgX(maxThresh)} y2={H - 20} stroke="#f97316" strokeWidth={1.5} />
          <text x={toSvgX(maxThresh)} y={H - 6} fontSize={9} fill="#f97316" textAnchor="middle">max</text>
          <line x1={toSvgX(queueDepthKb)} y1={20} x2={toSvgX(queueDepthKb)} y2={H - 20} stroke="#a78bfa" strokeWidth={2} strokeDasharray="3,2" />
          <path d={pathD} fill="none" stroke="#60a5fa" strokeWidth={2.5} />
          <circle cx={toSvgX(queueDepthKb)} cy={toSvgY(currentProb)} r={5} fill={currentProb > 0 ? '#60a5fa' : '#4a5568'} stroke="#0f1117" strokeWidth={1.5} />
        </svg>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#fbbf24', marginBottom: 4 }}>min_threshold: <span style={{ color: '#e2e8f0' }}>{minThresh} KB</span></div>
          <input type="range" min={50} max={4096} step={50} value={minThresh} onChange={e => { const v = Number(e.target.value); setMinThresh(v); if (v >= maxThresh) setMaxThresh(v + 200) }} style={{ width: '100%', accentColor: '#fbbf24' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#f97316', marginBottom: 4 }}>max_threshold: <span style={{ color: '#e2e8f0' }}>{maxThresh} KB</span></div>
          <input type="range" min={200} max={6000} step={100} value={maxThresh} onChange={e => setMaxThresh(Math.max(Number(e.target.value), minThresh + 100))} style={{ width: '100%', accentColor: '#f97316' }} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: '#a78bfa', marginBottom: 4 }}>
          Queue depth now: <span style={{ color: '#e2e8f0' }}>{queueDepthKb} KB</span> {' â†’ '}
          <span style={{ color: currentProb === 0 ? '#4a5568' : currentProb === 100 ? '#f87171' : '#60a5fa', fontWeight: 700 }}>{currentProb}% marking probability</span>
        </div>
        <input type="range" min={0} max={Math.max(maxThresh * 1.5, 3000)} step={50} value={queueDepthKb} onChange={e => setQueueDepthKb(Number(e.target.value))} style={{ width: '100%', accentColor: '#a78bfa' }} />
      </div>

      {minTooHigh && <div style={{ background: '#2a0f0f', border: '1px solid #f87171', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#f87171', marginBottom: 8 }}>âš  min_threshold ({minThresh} KB) exceeds TC3 buffer capacity ({bufferCapKb} KB). ECN will NEVER mark. (Scenario A)</div>}
      {minTooLow && !minTooHigh && <div style={{ background: '#2a0f0f', border: '1px solid #fbbf24', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#fbbf24', marginBottom: 8 }}>âš  min_threshold very low. Marks on every micro-burst. DCQCN over-reacts â†’ BW sawtooth. (Scenario D)</div>}
      {!minTooHigh && !minTooLow && <div style={{ background: '#0d1a2a', border: '1px solid #60a5fa', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#60a5fa', marginBottom: 8 }}>âœ“ Thresholds valid. nv set qos ecn profile roce min-threshold {minThresh * 1024} max-threshold {maxThresh * 1024}</div>}
      <div style={{ fontSize: 11, color: '#4a5568', textAlign: 'center' }}>Purple line = current queue depth Â· Blue curve = ECN marking probability</div>
    </div>
  )
}
