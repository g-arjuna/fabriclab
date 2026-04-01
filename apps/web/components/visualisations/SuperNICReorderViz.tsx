'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

type Packet = {
  id: number
  seq: number
  x: number
  y: number
  phase: 'inflight' | 'reorder' | 'delivered' | 'nack'
  color: string
  lane: number
}

const COLORS = ['#60a5fa', '#76e5b5', '#f97316', '#a78bfa', '#fbbf24']
const MODE_LABELS: Record<string, string> = {
  cx7: 'ConnectX-7 (no reorder buffer)',
  bf3: 'BlueField-3 SuperNIC (reorder buffer)',
}

export default function SuperNICReorderViz() {
  const [mode, setMode] = useState<'cx7' | 'bf3'>('cx7')
  const [packets, setPackets] = useState<Packet[]>([])
  const [reorderBuf, setReorderBuf] = useState<number[]>([])
  const [delivered, setDelivered] = useState<number[]>([])
  const [nacks, setNacks] = useState<number>(0)
  const [retransmits, setRetransmits] = useState<number>(0)
  const [running, setRunning] = useState(false)
  const frameRef = useRef<number | null>(null)
  const tickRef = useRef(0)
  const stateRef = useRef({ packets: [] as Packet[], delivered: [] as number[], nacks: 0, retransmits: 0, reorderBuf: [] as number[] })

  const reset = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    setPackets([])
    setReorderBuf([])
    setDelivered([])
    setNacks(0)
    setRetransmits(0)
    setRunning(false)
    tickRef.current = 0
    stateRef.current = { packets: [], delivered: [], nacks: 0, retransmits: 0, reorderBuf: [] }
  }, [])

  const launch = useCallback(() => {
    reset()
    setTimeout(() => {
      setRunning(true)
    }, 50)
  }, [reset, mode])

  useEffect(() => {
    if (!running) return
    // Spawn packets with out-of-order arrival (sprayed across different spine paths)
    const TOTAL = 5
    const spawnOrder = [0, 2, 4, 1, 3] // seq 0,2,4 arrive first (different paths), then 1,3
    let spawnIdx = 0
    let nextSeq = 0
    let expectedSeq = 0
    let lastDelivered = -1
    let localPackets: Packet[] = []
    let localDelivered: number[] = []
    let localNacks = 0
    let localRetransmits = 0
    let localReorderBuf: number[] = []

    const tick = () => {
      tickRef.current++
      const t = tickRef.current

      // Every 30 frames, spawn next packet
      if (spawnIdx < TOTAL && t % 30 === 0) {
        const seq = spawnOrder[spawnIdx]
        spawnIdx++
        const p: Packet = {
          id: t,
          seq,
          x: 80,
          y: 80 + seq * 28,
          phase: 'inflight',
          color: COLORS[seq % COLORS.length],
          lane: seq % 3,
        }
        localPackets = [...localPackets, p]
      }

      // Move inflight packets right
      localPackets = localPackets.map(p => {
        if (p.phase === 'inflight') {
          const newX = p.x + 3
          if (newX >= 340) {
            // Arrives at NIC
            const seq = p.seq
            if (mode === 'bf3') {
              // Buffer it; deliver in order
              if (!localReorderBuf.includes(seq)) {
                localReorderBuf = [...localReorderBuf, seq].sort((a, b) => a - b)
              }
              // Try to drain in-order
              while (localReorderBuf.length > 0 && localReorderBuf[0] === expectedSeq) {
                localDelivered = [...localDelivered, localReorderBuf[0]]
                localReorderBuf = localReorderBuf.slice(1)
                expectedSeq++
              }
              return { ...p, x: newX, phase: 'delivered' as const }
            } else {
              // CX7 mode: if out of order, NACK
              if (seq !== expectedSeq) {
                localNacks++
                localRetransmits += (seq - expectedSeq)
                return { ...p, x: newX, phase: 'nack' as const }
              } else {
                localDelivered = [...localDelivered, seq]
                expectedSeq++
                // Drain any buffered (none in CX7 — but just in case)
                return { ...p, x: newX, phase: 'delivered' as const }
              }
            }
          }
          return { ...p, x: newX }
        }
        return p
      })

      setPackets([...localPackets])
      setReorderBuf([...localReorderBuf])
      setDelivered([...localDelivered])
      setNacks(localNacks)
      setRetransmits(localRetransmits)

      const done = localPackets.every(p => p.phase === 'delivered' || p.phase === 'nack')
      if (done && localPackets.length === TOTAL) {
        setRunning(false)
        return
      }

      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [running, mode])

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
        SuperNIC Reorder Buffer vs ConnectX-7
      </div>

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['cx7', 'bf3'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); reset() }} style={{
            padding: '5px 14px', borderRadius: 6, border: '1px solid #2a2d3e',
            background: mode === m ? (m === 'cx7' ? '#f8717140' : '#76e5b540') : '#161928',
            color: mode === m ? (m === 'cx7' ? '#f87171' : '#76e5b5') : '#7c8db5',
            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            fontWeight: mode === m ? 700 : 400,
          }}>
            {m === 'cx7' ? 'ConnectX-7' : 'BF3 SuperNIC'}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <svg viewBox="0 0 660 200" style={{ width: '100%', maxWidth: 660, display: 'block', background: '#0d0f18', borderRadius: 8 }}>
        {/* Labels */}
        <text x={40} y={20} fill="#7c8db5" fontSize={9} fontFamily="'JetBrains Mono',monospace">SENDER (GPU)</text>
        <text x={300} y={20} fill="#7c8db5" fontSize={9} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">NETWORK (AR sprayed)</text>
        {mode === 'bf3' && <text x={390} y={20} fill="#76e5b5" fontSize={9} fontFamily="'JetBrains Mono',monospace">REORDER BUF</text>}
        <text x={580} y={20} fill="#7c8db5" fontSize={9} fontFamily="'JetBrains Mono',monospace">QP DELIVERY</text>

        {/* Sender box */}
        <rect x={10} y={30} width={70} height={150} rx={6} fill="#161928" stroke="#2a2d3e" strokeWidth={1} />

        {/* NIC / reorder buffer box */}
        {mode === 'bf3' && (
          <rect x={340} y={30} width={100} height={150} rx={6} fill="#76e5b518" stroke="#76e5b5" strokeWidth={1} strokeDasharray="4,2" />
        )}
        {mode === 'cx7' && (
          <rect x={340} y={30} width={60} height={150} rx={6} fill="#f8717118" stroke="#f87171" strokeWidth={1} strokeDasharray="4,2" />
        )}

        {/* QP delivery box */}
        <rect x={560} y={30} width={90} height={150} rx={6} fill="#161928" stroke="#2a2d3e" strokeWidth={1} />

        {/* Sequence labels */}
        {[0, 1, 2, 3, 4].map(seq => (
          <text key={seq} x={45} y={85 + seq * 28} fill={COLORS[seq % COLORS.length]}
            fontSize={10} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
            SEQ {seq}
          </text>
        ))}

        {/* Reorder buffer contents */}
        {mode === 'bf3' && reorderBuf.map((seq, i) => (
          <rect key={`rb-${seq}`} x={350} y={40 + i * 28} width={80} height={22} rx={4}
            fill={`${COLORS[seq % COLORS.length]}30`} stroke={COLORS[seq % COLORS.length]} strokeWidth={1} />
        ))}
        {mode === 'bf3' && reorderBuf.map((seq, i) => (
          <text key={`rbt-${seq}`} x={390} y={55 + i * 28} fill={COLORS[seq % COLORS.length]}
            fontSize={9} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
            SEQ {seq}
          </text>
        ))}

        {/* Delivered packets */}
        {delivered.map((seq, i) => (
          <g key={`del-${seq}`}>
            <rect x={566} y={40 + i * 26} width={72} height={20} rx={4}
              fill={`${COLORS[seq % COLORS.length]}25`} stroke={COLORS[seq % COLORS.length]} strokeWidth={1} />
            <text x={602} y={54 + i * 26} fill={COLORS[seq % COLORS.length]}
              fontSize={9} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
              ✓ SEQ {seq}
            </text>
          </g>
        ))}

        {/* Inflight packets */}
        {packets.filter(p => p.phase === 'inflight').map(p => (
          <g key={p.id}>
            <rect x={p.x - 18} y={p.y - 10} width={36} height={20} rx={4}
              fill={`${p.color}30`} stroke={p.color} strokeWidth={1} />
            <text x={p.x} y={p.y + 4} fill={p.color} fontSize={9}
              fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
              S{p.seq}
            </text>
          </g>
        ))}

        {/* NACKs (CX7 mode) */}
        {mode === 'cx7' && packets.filter(p => p.phase === 'nack').map(p => (
          <g key={`nack-${p.id}`}>
            <text x={400} y={p.y + 4} fill="#f87171" fontSize={9}
              fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
              NACK!
            </text>
          </g>
        ))}
      </svg>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Delivered', value: delivered.length, color: '#76e5b5' },
          { label: 'NACKs', value: nacks, color: '#f87171' },
          { label: 'Retransmit pkts', value: retransmits, color: '#fbbf24' },
          { label: 'Reorder buf', value: reorderBuf.length, color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#161928', border: '1px solid #2a2d3e', borderRadius: 8,
            padding: '8px 14px', flex: 1, minWidth: 80,
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#7c8db5', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={launch} disabled={running} style={{
          padding: '6px 18px', borderRadius: 6, border: '1px solid #76e5b5',
          background: running ? '#161928' : '#76e5b520', color: running ? '#4a5568' : '#76e5b5',
          fontSize: 12, cursor: running ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        }}>
          {running ? 'Running…' : '▶ Run Simulation'}
        </button>
        <button onClick={reset} style={{
          padding: '6px 18px', borderRadius: 6, border: '1px solid #2a2d3e',
          background: '#161928', color: '#7c8db5', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          ↺ Reset
        </button>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: '#7c8db5', lineHeight: 1.6 }}>
        Packets arrive out-of-order (per-packet adaptive routing sprays across different spine paths).
        BF3 holds them in the reorder buffer; CX7 sends NACKs and triggers retransmission.
      </div>
    </div>
  )
}
