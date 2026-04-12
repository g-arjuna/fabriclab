'use client'

import { useEffect, useRef, useState } from 'react'

interface Packet {
  seq: number
  path: string
  latencyMs: number
  color: string
  stage: 'transit' | 'buffer'
  arrivalOrder: number
}

const PATH_COLORS: Record<string, string> = {
  'spine-01': '#60a5fa',
  'spine-02': '#76e5b5',
  'spine-03': '#a78bfa',
  'spine-04': '#fbbf24',
}

const PATH_LATENCY: Record<string, number> = {
  'spine-01': 4.0,
  'spine-02': 4.8,
  'spine-03': 4.2,
  'spine-04': 5.1,
}

const PATHS = Object.keys(PATH_COLORS)

function generatePacketBurst(startSeq: number): Packet[] {
  return Array.from({ length: 8 }, (_, index) => {
    const path = PATHS[index % PATHS.length]
    return {
      seq: startSeq + index,
      path,
      latencyMs: PATH_LATENCY[path] + Math.random() * 0.5,
      color: PATH_COLORS[path],
      stage: 'transit',
      arrivalOrder: -1,
    }
  })
}

export default function SuperNICReorderBufferViz() {
  const [mode, setMode] = useState<'bf3' | 'cx7'>('bf3')
  const [packets, setPackets] = useState<Packet[]>(() => generatePacketBurst(1))
  const [bufferQueue, setBufferQueue] = useState<Packet[]>([])
  const [deliveredQueue, setDeliveredQueue] = useState<Packet[]>([])
  const [nackCount, setNackCount] = useState(0)
  const [retransmitCount, setRetransmitCount] = useState(0)
  const [throughputPct, setThroughputPct] = useState(100)
  const animationRef = useRef<number>(0)
  const lastTickRef = useRef<number>(0)
  const burstSeqRef = useRef(1)
  const stepCounterRef = useRef(0)

  const resetSimulation = () => {
    burstSeqRef.current = 1
    stepCounterRef.current = 0
    setPackets(generatePacketBurst(1))
    setBufferQueue([])
    setDeliveredQueue([])
    setNackCount(0)
    setRetransmitCount(0)
    setThroughputPct(100)
  }

  useEffect(() => {
    resetSimulation()
  }, [mode])

  useEffect(() => {
    const tick = (timestamp: number) => {
      if (timestamp - lastTickRef.current > 250) {
        stepCounterRef.current += 1

        setPackets((current) => {
          const updated = current.map((packet) => {
            if (packet.stage !== 'transit') return packet
            const progress = (stepCounterRef.current * 0.25) / packet.latencyMs
            if (progress >= 1) {
              return {
                ...packet,
                stage: 'buffer' as const,
                arrivalOrder: stepCounterRef.current,
              }
            }
            return packet
          })

          const buffered = updated.filter((packet) => packet.stage === 'buffer')
          const inTransit = updated.filter((packet) => packet.stage === 'transit')

          if (buffered.length > 0) {
            const byArrival = [...buffered].sort((left, right) => left.arrivalOrder - right.arrivalOrder)
            const firstArrival = byArrival[0]

            if (mode === 'cx7') {
              const expectedSeq = Math.min(...buffered.map((packet) => packet.seq))
              if (firstArrival.seq !== expectedSeq) {
                setNackCount((currentCount) => currentCount + 1)
                setRetransmitCount((currentCount) => currentCount + buffered.length)
                setThroughputPct((currentPct) => Math.max(20, currentPct - 8))
                window.setTimeout(() => {
                  burstSeqRef.current += 8
                  setPackets(generatePacketBurst(burstSeqRef.current))
                  setBufferQueue([])
                  setDeliveredQueue((currentDelivered) => currentDelivered.slice(-4))
                }, 500)
              } else if (inTransit.length === 0) {
                const ordered = [...buffered].sort((left, right) => left.seq - right.seq)
                setDeliveredQueue((currentDelivered) => [...currentDelivered, ...ordered].slice(-8))
                setBufferQueue([])
                window.setTimeout(() => {
                  burstSeqRef.current += 8
                  setPackets(generatePacketBurst(burstSeqRef.current))
                }, 600)
              }
            } else if (inTransit.length === 0) {
              const ordered = [...buffered].sort((left, right) => left.seq - right.seq)
              setBufferQueue(ordered)
              window.setTimeout(() => {
                setDeliveredQueue((currentDelivered) => [...currentDelivered, ...ordered].slice(-8))
                setBufferQueue([])
                burstSeqRef.current += 8
                setPackets(generatePacketBurst(burstSeqRef.current))
              }, 400)
            } else {
              setBufferQueue([...buffered].sort((left, right) => left.seq - right.seq))
            }
          }

          return updated
        })

        lastTickRef.current = timestamp
      }

      animationRef.current = requestAnimationFrame(tick)
    }

    animationRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationRef.current)
  }, [mode])

  const inTransit = packets.filter((packet) => packet.stage === 'transit')
  const inBuffer = packets
    .filter((packet) => packet.stage === 'buffer')
    .sort((left, right) => left.arrivalOrder - right.arrivalOrder)

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
        COMPARISON
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#60a5fa', marginBottom: 16 }}>
        BF3 SuperNIC Reorder Buffer vs ConnectX-7 Go-Back-N Recovery
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setMode('bf3')}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: '1px solid',
            borderColor: mode === 'bf3' ? '#76e5b5' : '#2a2d3e',
            background: mode === 'bf3' ? 'rgba(118,229,181,0.15)' : '#161928',
            color: mode === 'bf3' ? '#76e5b5' : '#7c8db5',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'inherit',
          }}
        >
          BlueField-3 SuperNIC (DGX B200)
        </button>
        <button
          onClick={() => setMode('cx7')}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: '1px solid',
            borderColor: mode === 'cx7' ? '#f87171' : '#2a2d3e',
            background: mode === 'cx7' ? 'rgba(248,113,113,0.15)' : '#161928',
            color: mode === 'cx7' ? '#f87171' : '#7c8db5',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'inherit',
          }}
        >
          ConnectX-7 HCA (DGX H100/H200)
        </button>
      </div>

      <svg
        viewBox="0 0 640 160"
        style={{ width: '100%', maxWidth: 640, display: 'block', marginBottom: 16 }}
      >
        <rect x={10} y={60} width={80} height={40} rx={6} fill="#161928" stroke="#2a2d3e" />
        <text x={50} y={79} textAnchor="middle" fill="#e2e8f0" fontSize={10} fontFamily="monospace">
          DGX
        </text>
        <text x={50} y={92} textAnchor="middle" fill="#7c8db5" fontSize={9} fontFamily="monospace">
          sender
        </text>

        {PATHS.map((path, index) => {
          const y = 20 + index * 32
          return (
            <g key={path}>
              <line
                x1={90}
                y1={80}
                x2={310}
                y2={y + 15}
                stroke={PATH_COLORS[path]}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.5}
              />
              <rect
                x={310}
                y={y}
                width={70}
                height={28}
                rx={4}
                fill="#161928"
                stroke={PATH_COLORS[path]}
                strokeWidth={1}
              />
              <text x={345} y={y + 13} textAnchor="middle" fill={PATH_COLORS[path]} fontSize={9} fontFamily="monospace">
                {path}
              </text>
              <text x={345} y={y + 23} textAnchor="middle" fill="#4a5568" fontSize={8} fontFamily="monospace">
                +{PATH_LATENCY[path]} ms
              </text>
              <line
                x1={380}
                y1={y + 14}
                x2={490}
                y2={80}
                stroke={PATH_COLORS[path]}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.5}
              />
            </g>
          )
        })}

        <rect
          x={490}
          y={55}
          width={140}
          height={50}
          rx={6}
          fill={mode === 'bf3' ? 'rgba(118,229,181,0.08)' : 'rgba(248,113,113,0.08)'}
          stroke={mode === 'bf3' ? '#76e5b5' : '#f87171'}
        />
        <text x={560} y={76} textAnchor="middle" fill={mode === 'bf3' ? '#76e5b5' : '#f87171'} fontSize={10} fontFamily="monospace">
          {mode === 'bf3' ? 'BF3 SuperNIC' : 'ConnectX-7'}
        </text>
        <text x={560} y={90} textAnchor="middle" fill={mode === 'bf3' ? '#76e5b5' : '#f87171'} fontSize={9} fontFamily="monospace">
          {mode === 'bf3' ? 'reorder-buffer: ON' : 'Go-Back-N'}
        </text>
        <text x={560} y={102} textAnchor="middle" fill="#4a5568" fontSize={9} fontFamily="monospace">
          {mode === 'bf3' ? 'B200 only' : 'H100 / H200'}
        </text>

        <text x={435} y={50} textAnchor="middle" fill="#fbbf24" fontSize={9} fontFamily="monospace">
          OOO packets
        </text>
        <text x={435} y={62} textAnchor="middle" fill="#4a5568" fontSize={8} fontFamily="monospace">
          different path delays
        </text>
      </svg>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            background: '#161928',
            borderRadius: 8,
            padding: '8px 10px',
            border: '1px solid #2a2d3e',
          }}
        >
          <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 6 }}>IN TRANSIT</div>
          {inTransit.length === 0 ? (
            <div style={{ fontSize: 10, color: '#4a5568' }}>-</div>
          ) : (
            inTransit.map((packet) => (
              <div key={packet.seq} style={{ fontSize: 11, color: packet.color, marginBottom: 2 }}>
                PKT#{packet.seq} via {packet.path.replace('spine-', 's')}
              </div>
            ))
          )}
        </div>

        <div
          style={{
            background: mode === 'bf3' ? 'rgba(118,229,181,0.05)' : '#161928',
            borderRadius: 8,
            padding: '8px 10px',
            border: `1px solid ${mode === 'bf3' ? '#76e5b5' : '#2a2d3e'}`,
          }}
        >
          <div style={{ fontSize: 11, color: mode === 'bf3' ? '#76e5b5' : '#7c8db5', marginBottom: 6 }}>
            {mode === 'bf3' ? 'REORDER BUFFER' : 'ARRIVAL ORDER'}
          </div>
          {(mode === 'bf3' ? bufferQueue : inBuffer).length === 0 ? (
            <div style={{ fontSize: 10, color: '#4a5568' }}>-</div>
          ) : (
            (mode === 'bf3' ? bufferQueue : inBuffer).map((packet) => (
              <div
                key={packet.seq}
                style={{
                  fontSize: 11,
                  color: packet.color,
                  marginBottom: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>PKT#{packet.seq}</span>
                <span style={{ color: '#4a5568', fontSize: 10 }}>
                  {packet.path.replace('spine-0', 's')}
                </span>
              </div>
            ))
          )}
        </div>

        <div
          style={{
            background: '#161928',
            borderRadius: 8,
            padding: '8px 10px',
            border: `1px solid ${nackCount > 0 && mode === 'cx7' ? '#f87171' : '#2a2d3e'}`,
          }}
        >
          <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 6 }}>DELIVERED (QP)</div>
          {deliveredQueue.length === 0 ? (
            <div style={{ fontSize: 10, color: '#4a5568' }}>-</div>
          ) : (
            deliveredQueue.slice(-6).map((packet) => (
              <div key={`${packet.seq}-delivered`} style={{ fontSize: 11, color: '#76e5b5', marginBottom: 2 }}>
                PKT#{packet.seq} OK
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
        <div
          style={{
            background: '#161928',
            borderRadius: 8,
            padding: '8px 10px',
            border: '1px solid #2a2d3e',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 2 }}>NAKs SENT</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: nackCount > 0 ? '#f87171' : '#76e5b5' }}>
            {nackCount}
          </div>
        </div>
        <div
          style={{
            background: '#161928',
            borderRadius: 8,
            padding: '8px 10px',
            border: '1px solid #2a2d3e',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 2 }}>RETRANSMITS</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: retransmitCount > 0 ? '#f87171' : '#76e5b5' }}>
            {retransmitCount}
          </div>
        </div>
        <div
          style={{
            background: '#161928',
            borderRadius: 8,
            padding: '8px 10px',
            border: '1px solid #2a2d3e',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 2 }}>THROUGHPUT</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: throughputPct > 80 ? '#76e5b5' : throughputPct > 50 ? '#fbbf24' : '#f87171' }}>
            {throughputPct}%
          </div>
        </div>
        <div
          style={{
            background: '#161928',
            borderRadius: 8,
            padding: '8px 10px',
            border: '1px solid #2a2d3e',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 2 }}>OOO HANDLED</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: mode === 'bf3' ? '#76e5b5' : '#f87171' }}>
            {mode === 'bf3' ? 'REORDERED' : 'NAK STORM'}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: '8px 10px',
          background: '#161928',
          borderRadius: 6,
          border: '1px solid #2a2d3e',
          fontSize: 11,
        }}
      >
        {mode === 'bf3' ? (
          <span style={{ color: '#76e5b5' }}>
            OK: BF3 holds out-of-order packets, rebuilds sequence, and delivers an in-order stream to the QP. Per-packet AR is safe.
          </span>
        ) : (
          <span style={{ color: '#f87171' }}>
            Warning: CX7 sees out-of-order delivery, triggers Go-Back-N NAKs, and retransmits the whole window. Per-packet AR is unsafe here.
          </span>
        )}
      </div>

      <div style={{ fontSize: 11, color: '#4a5568', marginTop: 8 }}>
        Toggle between BF3 SuperNIC and ConnectX-7 to observe why B200 can use per-packet AR and H100/H200 cannot.
      </div>
    </div>
  )
}
