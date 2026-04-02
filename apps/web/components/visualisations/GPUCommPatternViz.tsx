'use client'
import { useState, useEffect, useRef } from 'react'

const N_GPUS = 8
const GPU_RADIUS = 18
const CX = 300
const CY = 150
const RING_R = 100

const gpuAngle = (i: number) => (i / N_GPUS) * 2 * Math.PI - Math.PI / 2
const gpuPos = (i: number) => ({
  x: CX + RING_R * Math.cos(gpuAngle(i)),
  y: CY + RING_R * Math.sin(gpuAngle(i)),
})

const COLLECTIVE_OPTIONS = [
  { id: 'allreduce', label: 'Ring All-Reduce', color: '#60a5fa' },
  { id: 'alltoall', label: 'All-to-All', color: '#a78bfa' },
  { id: 'incast', label: 'Incast (barrier)', color: '#f87171' },
]

type FlowLine = {
  id: number
  from: number
  to: number
  progress: number
  color: string
}

export default function GPUCommPatternViz() {
  const [collective, setCollective] = useState<'allreduce' | 'alltoall' | 'incast'>('allreduce')
  const [step, setStep] = useState(0)
  const [arEnabled, setArEnabled] = useState(true)
  const [flows, setFlows] = useState<FlowLine[]>([])
  const [congestionLevel, setCongestionLevel] = useState(0)
  const [throughput, setThroughput] = useState(0)
  const animRef = useRef<number | null>(null)
  const tickRef = useRef(0)
  const runningRef = useRef(false)

  const stop = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    runningRef.current = false
    setFlows([])
    setCongestionLevel(0)
    setThroughput(0)
  }

  const runAnimation = () => {
    stop()
    tickRef.current = 0
    runningRef.current = true
    let localFlows: FlowLine[] = []
    let localStep = 0
    let flowId = 0

    const tick = () => {
      if (!runningRef.current) return
      tickRef.current++
      const t = tickRef.current

      // Spawn flows based on collective type
      if (collective === 'allreduce') {
        // Ring: each GPU sends to next GPU, one step at a time
        if (t % 40 === 0 && localStep < N_GPUS - 1) {
          localStep++
          setStep(localStep)
          for (let i = 0; i < N_GPUS; i++) {
            const next = (i + localStep) % N_GPUS
            localFlows.push({ id: flowId++, from: i, to: next, progress: 0, color: '#60a5fa' })
          }
        }
      } else if (collective === 'alltoall') {
        if (t === 1) {
          for (let i = 0; i < N_GPUS; i++) {
            for (let j = 0; j < N_GPUS; j++) {
              if (i !== j) {
                localFlows.push({ id: flowId++, from: i, to: j, progress: 0, color: '#a78bfa' })
              }
            }
          }
        }
      } else if (collective === 'incast') {
        // All GPUs send to GPU 0 simultaneously
        if (t === 1) {
          for (let i = 1; i < N_GPUS; i++) {
            localFlows.push({ id: flowId++, from: i, to: 0, progress: 0, color: '#f87171' })
          }
        }
      }

      // Move flows
      localFlows = localFlows.map(f => ({
        ...f,
        progress: Math.min(1, f.progress + (arEnabled ? 0.025 : 0.015)),
      })).filter(f => f.progress < 1)

      // Calculate congestion (incast = high)
      const destCounts: Record<number, number> = {}
      localFlows.forEach(f => {
        destCounts[f.to] = (destCounts[f.to] || 0) + 1
      })
      const maxDest = Math.max(0, ...Object.values(destCounts))
      const rawCongestion = collective === 'incast' ? Math.min(100, maxDest * 14) : Math.min(40, maxDest * 5)
      const congestion = arEnabled ? rawCongestion * 0.35 : rawCongestion
      const tp = arEnabled
        ? Math.min(95, 60 + (collective === 'allreduce' ? 30 : collective === 'alltoall' ? 20 : 5))
        : Math.min(70, 40 + (collective === 'allreduce' ? 20 : collective === 'alltoall' ? 10 : 2))

      setCongestionLevel(congestion)
      setThroughput(tp)
      setFlows([...localFlows])

      if ((collective === 'allreduce' && localStep >= N_GPUS - 1 && localFlows.length === 0) ||
          ((collective === 'alltoall' || collective === 'incast') && t > 200)) {
        runningRef.current = false
        return
      }

      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => stop(), [])

  const getLineXY = (from: number, to: number, progress: number) => {
    const fp = gpuPos(from)
    const tp = gpuPos(to)
    return {
      x: fp.x + (tp.x - fp.x) * progress,
      y: fp.y + (tp.y - fp.y) * progress,
    }
  }

  const congColor = congestionLevel > 60 ? '#f87171' : congestionLevel > 30 ? '#fbbf24' : '#76e5b5'

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 12,
      padding: '20px 24px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0', maxWidth: 680, margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>
        ANIMATED SIMULATION
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#60a5fa', marginBottom: 16 }}>
        GPU Collective Communication Patterns
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {COLLECTIVE_OPTIONS.map(opt => (
          <button key={opt.id} onClick={() => { setCollective(opt.id as any); stop(); setStep(0) }} style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 11,
            border: `1px solid ${collective === opt.id ? opt.color : '#2a2d3e'}`,
            background: collective === opt.id ? `${opt.color}20` : '#161928',
            color: collective === opt.id ? opt.color : '#7c8db5',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: collective === opt.id ? 700 : 400,
          }}>
            {opt.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setArEnabled(!arEnabled)} style={{
          padding: '4px 12px', borderRadius: 6, fontSize: 11,
          border: `1px solid ${arEnabled ? '#76e5b5' : '#f87171'}`,
          background: arEnabled ? '#76e5b520' : '#f8717120',
          color: arEnabled ? '#76e5b5' : '#f87171',
          cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
        }}>
          AR: {arEnabled ? 'ON (Spectrum-X)' : 'OFF (ECMP)'}
        </button>
        <button onClick={runAnimation} style={{
          padding: '4px 12px', borderRadius: 6, fontSize: 11,
          border: '1px solid #60a5fa', background: '#60a5fa20',
          color: '#60a5fa', cursor: 'pointer', fontFamily: 'inherit',
        }}>
          ▶ Animate
        </button>
        <button onClick={stop} style={{
          padding: '4px 12px', borderRadius: 6, fontSize: 11,
          border: '1px solid #2a2d3e', background: '#161928',
          color: '#7c8db5', cursor: 'pointer', fontFamily: 'inherit',
        }}>
          ■ Stop
        </button>
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <svg viewBox="0 0 600 300" style={{ width: '100%', minWidth: 600, maxWidth: 600, display: 'block', background: '#0d0f18', borderRadius: 8 }}>
        {/* Ring lines */}
        {Array.from({ length: N_GPUS }, (_, i) => {
          const p1 = gpuPos(i)
          const p2 = gpuPos((i + 1) % N_GPUS)
          return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#2a2d3e" strokeWidth={0.5} />
        })}

        {/* Leaf switch (center) */}
        <circle cx={CX} cy={CY} r={22} fill="#16192880" stroke="#2a2d3e" strokeWidth={1} />
        <text x={CX} y={CY - 5} fill="#4a5568" fontSize={8}
          fontFamily="'JetBrains Mono',monospace" textAnchor="middle">LEAF</text>
        <text x={CX} y={CY + 7} fill="#4a5568" fontSize={7}
          fontFamily="'JetBrains Mono',monospace" textAnchor="middle">SN5600</text>

        {/* Congestion indicator on leaf */}
        <circle cx={CX} cy={CY} r={22}
          fill="transparent"
          stroke={congColor}
          strokeWidth={congestionLevel / 20}
          opacity={congestionLevel / 100} />

        {/* Flow particles */}
        {flows.map(f => {
          const pos = getLineXY(f.from, f.to, f.progress)
          return (
            <circle key={f.id} cx={pos.x} cy={pos.y} r={3}
              fill={f.color} opacity={0.8} />
          )
        })}

        {/* Flow lines (static) */}
        {flows.filter((_, i) => i % 3 === 0).map(f => {
          const fp = gpuPos(f.from)
          const tp = gpuPos(f.to)
          return (
            <line key={`line-${f.id}`}
              x1={fp.x} y1={fp.y} x2={tp.x} y2={tp.y}
              stroke={f.color} strokeWidth={0.5} opacity={0.2} />
          )
        })}

        {/* GPU nodes */}
        {Array.from({ length: N_GPUS }, (_, i) => {
          const pos = gpuPos(i)
          const isSink = collective === 'incast' && i === 0
          return (
            <g key={i}>
              <circle cx={pos.x} cy={pos.y} r={GPU_RADIUS}
                fill={isSink ? '#f8717120' : '#161928'}
                stroke={isSink ? '#f87171' : '#a78bfa'}
                strokeWidth={isSink ? 2 : 1} />
              <text x={pos.x} y={pos.y - 3} fill="#a78bfa" fontSize={9}
                fontFamily="'JetBrains Mono',monospace" textAnchor="middle" fontWeight={700}>
                GPU
              </text>
              <text x={pos.x} y={pos.y + 8} fill="#7c8db5" fontSize={8}
                fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
                {i}
              </text>
            </g>
          )
        })}

        {/* Collective label */}
        <text x={CX} y={270} fill="#7c8db5" fontSize={9}
          fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
          {collective === 'allreduce' && `Ring All-Reduce · Step ${step}/${N_GPUS - 1} · 2×(N-1) total steps`}
          {collective === 'alltoall' && `All-to-All · ${N_GPUS * (N_GPUS - 1)} simultaneous flows`}
          {collective === 'incast' && `Incast barrier · all GPUs → GPU 0 · congestion risk`}
        </text>
        </svg>
      </div>

      {/* Metrics */}
      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <div style={{ background: '#161928', border: '1px solid #2a2d3e', borderRadius: 8, padding: '8px 14px', flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: congColor }}>{congestionLevel.toFixed(0)}%</div>
          <div style={{ fontSize: 10, color: '#7c8db5' }}>Leaf buffer pressure</div>
        </div>
        <div style={{ background: '#161928', border: '1px solid #2a2d3e', borderRadius: 8, padding: '8px 14px', flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#76e5b5' }}>{throughput.toFixed(0)}%</div>
          <div style={{ fontSize: 10, color: '#7c8db5' }}>Effective BW utilisation</div>
        </div>
        <div style={{ background: '#161928', border: `1px solid ${arEnabled ? '#76e5b5' : '#f87171'}40`, borderRadius: 8, padding: '8px 14px', flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: arEnabled ? '#76e5b5' : '#f87171' }}>
            {arEnabled ? 'Spectrum-X AR' : 'Standard ECMP'}
          </div>
          <div style={{ fontSize: 10, color: '#7c8db5' }}>Routing mode</div>
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: '#7c8db5', lineHeight: 1.6 }}>
        Incast at synchronisation barriers: all GPUs transmit simultaneously to one destination.
        AR spreads flows across spines; deep buffer absorbs bursts before tail-drop threshold.
      </div>
    </div>
  )
}
