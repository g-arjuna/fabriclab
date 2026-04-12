'use client'

import { useEffect, useRef, useState } from 'react'

interface Flow {
  id: number
  srcIp: string
  dstIp: string
  spineIndex: number
  packets: number
  color: string
}

interface SpineLoad {
  id: number
  name: string
  utilPct: number
  packets: number
}

const FLOW_COLORS = [
  '#60a5fa',
  '#76e5b5',
  '#a78bfa',
  '#fbbf24',
  '#f97316',
  '#f87171',
  '#34d399',
  '#fb923c',
]

function computeEcmpHash(srcIp: string, dstIp: string): number {
  let hash = 0
  const input = srcIp + dstIp
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function generateFlows(count: number): Flow[] {
  const flows: Flow[] = []
  for (let index = 0; index < count; index += 1) {
    const srcIp = `10.100.0.${index + 1}`
    const dstIp = `10.100.1.${(index % 16) + 1}`
    const hash = computeEcmpHash(srcIp, dstIp)
    flows.push({
      id: index,
      srcIp,
      dstIp,
      spineIndex: hash % 4,
      packets: Math.floor(Math.random() * 40) + 20,
      color: FLOW_COLORS[index % FLOW_COLORS.length],
    })
  }
  return flows
}

function computeAdaptiveRoutingFlows(flows: Flow[]): Flow[] {
  const spineLoads = [0, 0, 0, 0]
  return flows.map((flow) => {
    const bestIndex = spineLoads.indexOf(Math.min(...spineLoads))
    spineLoads[bestIndex] += flow.packets
    return { ...flow, spineIndex: bestIndex }
  })
}

export default function ECMPCollisionViz() {
  const [mode, setMode] = useState<'ecmp' | 'ar'>('ecmp')
  const [flowCount, setFlowCount] = useState(8)
  const [baseFlows] = useState(() => generateFlows(16))
  const [animationStep, setAnimationStep] = useState(0)
  const animationRef = useRef<number>(0)
  const lastTickRef = useRef<number>(0)

  const ecmpFlows = baseFlows.slice(0, flowCount)
  const arFlows = computeAdaptiveRoutingFlows(baseFlows.slice(0, flowCount))
  const displayFlows = mode === 'ecmp' ? ecmpFlows : arFlows

  const spineLoads: SpineLoad[] = [0, 1, 2, 3].map((index) => {
    const relevantFlows = displayFlows.filter((flow) => flow.spineIndex === index)
    const packets = relevantFlows.reduce((sum, flow) => sum + flow.packets, 0)
    const totalPackets = displayFlows.reduce((sum, flow) => sum + flow.packets, 0)
    return {
      id: index,
      name: `spine-0${index + 1}`,
      utilPct: totalPackets > 0 ? Math.round((packets / totalPackets) * 100) : 25,
      packets,
    }
  })

  const maxUtil = Math.max(...spineLoads.map((spine) => spine.utilPct))
  const minUtil = Math.min(...spineLoads.map((spine) => spine.utilPct))
  const variance = maxUtil - minUtil

  useEffect(() => {
    const tick = (timestamp: number) => {
      if (timestamp - lastTickRef.current > 80) {
        setAnimationStep((current) => (current + 1) % 60)
        lastTickRef.current = timestamp
      }
      animationRef.current = requestAnimationFrame(tick)
    }

    animationRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationRef.current)
  }, [])

  const getBarColor = (utilPct: number) => {
    if (utilPct > 75) return '#f87171'
    if (utilPct > 50) return '#fbbf24'
    return '#76e5b5'
  }

  return (
    <div
      style={{
        background: '#0f1117',
        border: '1px solid #2a2d3e',
        borderRadius: 12,
        padding: '20px 24px',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: '#e2e8f0',
        maxWidth: 680,
        margin: '24px auto',
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: '#7c8db5',
          marginBottom: 4,
          letterSpacing: '0.08em',
        }}
      >
        ANIMATED SIMULATION
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#60a5fa', marginBottom: 16 }}>
        ECMP Hash Collision vs Adaptive Routing Load Distribution
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setMode('ecmp')}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: '1px solid',
            borderColor: mode === 'ecmp' ? '#f87171' : '#2a2d3e',
            background: mode === 'ecmp' ? 'rgba(248,113,113,0.15)' : '#161928',
            color: mode === 'ecmp' ? '#f87171' : '#7c8db5',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'inherit',
          }}
        >
          Hash ECMP (broken)
        </button>
        <button
          onClick={() => setMode('ar')}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: '1px solid',
            borderColor: mode === 'ar' ? '#76e5b5' : '#2a2d3e',
            background: mode === 'ar' ? 'rgba(118,229,181,0.15)' : '#161928',
            color: mode === 'ar' ? '#76e5b5' : '#7c8db5',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'inherit',
          }}
        >
          Adaptive Routing (fixed)
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#7c8db5' }}>Flows:</span>
          <input
            type="range"
            min={4}
            max={16}
            value={flowCount}
            onChange={(event) => setFlowCount(Number(event.target.value))}
            style={{ width: 80, accentColor: '#60a5fa' }}
          />
          <span style={{ fontSize: 11, color: '#e2e8f0' }}>{flowCount}</span>
        </div>
      </div>

      <svg
        viewBox="0 0 640 220"
        style={{ width: '100%', maxWidth: 640, display: 'block', marginBottom: 16 }}
      >
        <rect x={270} y={10} width={100} height={36} rx={6} fill="#161928" stroke="#2a2d3e" />
        <text x={320} y={33} textAnchor="middle" fill="#e2e8f0" fontSize={11} fontFamily="monospace">
          leaf-01
        </text>

        {[0, 1, 2, 3].map((index) => {
          const x = 50 + index * 145
          const load = spineLoads[index]
          const isOverloaded = load.utilPct > 65 && mode === 'ecmp'
          return (
            <g key={index}>
              <rect
                x={x + 5}
                y={160}
                width={90}
                height={36}
                rx={6}
                fill={isOverloaded ? 'rgba(248,113,113,0.12)' : '#161928'}
                stroke={isOverloaded ? '#f87171' : '#2a2d3e'}
                strokeWidth={isOverloaded ? 2 : 1}
              />
              <text x={x + 50} y={177} textAnchor="middle" fill={isOverloaded ? '#f87171' : '#e2e8f0'} fontSize={10} fontFamily="monospace">
                {load.name}
              </text>
              <text x={x + 50} y={190} textAnchor="middle" fill={isOverloaded ? '#f87171' : '#76e5b5'} fontSize={10} fontFamily="monospace">
                {load.utilPct}%
              </text>
            </g>
          )
        })}

        {displayFlows.map((flow, index) => {
          const spineX = 50 + flow.spineIndex * 145 + 50
          const progress = ((animationStep + index * 8) % 60) / 60
          const midX = 320 + (spineX - 320) * progress
          const midY = 46 + (160 - 46) * progress
          const opacity =
            progress < 0.2
              ? progress / 0.2
              : progress > 0.8
                ? (1 - progress) / 0.2
                : 1
          return (
            <circle
              key={flow.id}
              cx={midX}
              cy={midY}
              r={3}
              fill={flow.color}
              opacity={opacity * 0.9}
            />
          )
        })}

        {[0, 1, 2, 3].map((index) => {
          const spineX = 50 + index * 145 + 50
          const flowsOnSpine = displayFlows.filter((flow) => flow.spineIndex === index).length
          const lineColor =
            mode === 'ecmp' && flowsOnSpine > flowCount / 4 + 1 ? '#f87171' : '#2a2d3e'
          return (
            <line
              key={index}
              x1={320}
              y1={46}
              x2={spineX}
              y2={160}
              stroke={lineColor}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )
        })}
      </svg>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {spineLoads.map((spine) => (
          <div
            key={spine.id}
            style={{
              background: '#161928',
              borderRadius: 8,
              padding: '8px 10px',
              border: '1px solid #2a2d3e',
            }}
          >
            <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 4 }}>{spine.name}</div>
            <div style={{ height: 6, background: '#0d0f18', borderRadius: 3, marginBottom: 4 }}>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: getBarColor(spine.utilPct),
                  width: `${spine.utilPct}%`,
                  transition: 'width 0.3s, background 0.3s',
                }}
              />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: getBarColor(spine.utilPct) }}>
              {spine.utilPct}%
            </div>
            <div style={{ fontSize: 10, color: '#4a5568' }}>{spine.packets} pkts</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          background: '#161928',
          borderRadius: 8,
          padding: '10px 14px',
          border: '1px solid #2a2d3e',
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 2 }}>LOAD VARIANCE</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: variance > 20 ? '#f87171' : variance > 8 ? '#fbbf24' : '#76e5b5' }}>
            {variance}%
          </div>
        </div>
        <div style={{ width: 1, background: '#2a2d3e' }} />
        <div>
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 2 }}>MODE</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: mode === 'ar' ? '#76e5b5' : '#f87171' }}>
            {mode === 'ecmp' ? 'Hash ECMP' : 'Adaptive Routing'}
          </div>
        </div>
        <div style={{ width: 1, background: '#2a2d3e' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 2 }}>ASSESSMENT</div>
          <div style={{ fontSize: 11, color: variance > 20 ? '#f87171' : variance > 8 ? '#fbbf24' : '#76e5b5' }}>
            {mode === 'ecmp'
              ? variance > 20
                ? `Warning: severe imbalance from hash collisions on ${flowCount} synchronized flows`
                : 'Warning: hash ECMP is acceptable at low scale but degrades on collectives'
              : `OK: adaptive routing distributes load evenly with ${variance}% variance`}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#4a5568', marginTop: 10 }}>
        Drag the flow slider to simulate scale, then toggle Hash ECMP vs AR to compare load distribution.
      </div>
    </div>
  )
}
