'use client'

import { useEffect, useRef, useState } from 'react'

interface QueueState {
  id: number
  name: string
  depth: number
  maxDepth: number
  selected: boolean
  color: string
}

interface ForwardingEvent {
  id: number
  chosen: number
  depths: number[]
}

const SPINE_NAMES = ['spine-01', 'spine-02', 'spine-03', 'spine-04']
const SPINE_COLORS = ['#60a5fa', '#76e5b5', '#a78bfa', '#fbbf24']

function getSpineColor(depth: number, selected: boolean): string {
  if (selected) return '#76e5b5'
  if (depth > 70) return '#f87171'
  if (depth > 45) return '#fbbf24'
  return '#60a5fa'
}

export default function AdaptiveRoutingEngineViz() {
  const [queues, setQueues] = useState<QueueState[]>(
    SPINE_NAMES.map((name, index) => ({
      id: index,
      name,
      depth: Math.floor(Math.random() * 40) + 10,
      maxDepth: 100,
      selected: false,
      color: SPINE_COLORS[index],
    })),
  )
  const [events, setEvents] = useState<ForwardingEvent[]>([])
  const [packetCount, setPacketCount] = useState(0)
  const [running, setRunning] = useState(true)
  const [mode, setMode] = useState<'ar' | 'hash'>('ar')
  const animationRef = useRef<number>(0)
  const lastPacketRef = useRef<number>(0)
  const lastDriftRef = useRef<number>(0)
  const eventIdRef = useRef(0)

  useEffect(() => {
    if (!running) return

    const tick = (timestamp: number) => {
      if (timestamp - lastDriftRef.current > 200) {
        setQueues((current) =>
          current.map((queue) => ({
            ...queue,
            depth: Math.max(
              5,
              Math.min(
                95,
                queue.depth + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 6),
              ),
            ),
            selected: false,
          })),
        )
        lastDriftRef.current = timestamp
      }

      if (timestamp - lastPacketRef.current > 600) {
        setQueues((current) => {
          const depths = current.map((queue) => queue.depth)
          const chosen =
            mode === 'ar'
              ? depths.indexOf(Math.min(...depths))
              : (eventIdRef.current * 7 + 3) % current.length

          setEvents((previous) => [
            {
              id: eventIdRef.current,
              chosen,
              depths: [...depths],
            },
            ...previous,
          ].slice(0, 8))
          eventIdRef.current += 1
          setPacketCount((previous) => previous + 1)

          return current.map((queue, index) => ({
            ...queue,
            depth: index === chosen ? Math.min(95, queue.depth + 3) : Math.max(5, queue.depth - 1),
            selected: index === chosen,
          }))
        })

        lastPacketRef.current = timestamp
      }

      animationRef.current = requestAnimationFrame(tick)
    }

    animationRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationRef.current)
  }, [mode, running])

  const avgDepth = queues.reduce((sum, queue) => sum + queue.depth, 0) / queues.length
  const maxDepth = Math.max(...queues.map((queue) => queue.depth))
  const minDepth = Math.min(...queues.map((queue) => queue.depth))
  const spread = maxDepth - minDepth

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
        Adaptive Routing Engine - Real-Time Queue Depth Forwarding
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setMode('ar')}
          style={{
            padding: '6px 14px',
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
          Adaptive Routing
        </button>
        <button
          onClick={() => setMode('hash')}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: '1px solid',
            borderColor: mode === 'hash' ? '#f97316' : '#2a2d3e',
            background: mode === 'hash' ? 'rgba(249,115,22,0.15)' : '#161928',
            color: mode === 'hash' ? '#f97316' : '#7c8db5',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'inherit',
          }}
        >
          Hash ECMP
        </button>
        <button
          onClick={() => setRunning((current) => !current)}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: '1px solid #2a2d3e',
            background: '#161928',
            color: running ? '#fbbf24' : '#76e5b5',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'inherit',
          }}
        >
          {running ? 'Pause' : 'Resume'}
        </button>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#7c8db5', alignSelf: 'center' }}>
          {packetCount} packets forwarded
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {queues.map((queue) => {
          const barColor = getSpineColor(queue.depth, queue.selected)
          return (
            <div
              key={queue.id}
              style={{
                background: queue.selected ? 'rgba(118,229,181,0.08)' : '#161928',
                borderRadius: 8,
                padding: '10px',
                border: `1px solid ${queue.selected ? '#76e5b5' : '#2a2d3e'}`,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 11, color: queue.selected ? '#76e5b5' : '#7c8db5', marginBottom: 6 }}>
                {queue.name}
              </div>
              <div style={{ height: 80, background: '#0d0f18', borderRadius: 4, position: 'relative', marginBottom: 6 }}>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${queue.depth}%`,
                    background: barColor,
                    borderRadius: 4,
                    transition: 'height 0.3s, background 0.3s',
                    opacity: 0.85,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '70%',
                    left: 0,
                    right: 0,
                    height: 1,
                    background: 'rgba(248,113,113,0.3)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '45%',
                    left: 0,
                    right: 0,
                    height: 1,
                    background: 'rgba(251,191,36,0.3)',
                  }}
                />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: barColor, textAlign: 'center' }}>
                {queue.depth}%
              </div>
              {queue.selected ? (
                <div style={{ fontSize: 10, color: '#76e5b5', textAlign: 'center', marginTop: 2 }}>
                  CHOSEN
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          background: '#161928',
          borderRadius: 8,
          padding: '10px 14px',
          border: '1px solid #2a2d3e',
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 1 }}>AVG DEPTH</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#60a5fa' }}>
            {Math.round(avgDepth)}%
          </div>
        </div>
        <div style={{ width: 1, background: '#2a2d3e' }} />
        <div>
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 1 }}>SPREAD</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: spread > 30 ? '#f87171' : spread > 15 ? '#fbbf24' : '#76e5b5' }}>
            {spread}%
          </div>
        </div>
        <div style={{ width: 1, background: '#2a2d3e' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 1 }}>DECISION LOGIC</div>
          <div style={{ fontSize: 11, color: mode === 'ar' ? '#76e5b5' : '#f97316' }}>
            {mode === 'ar'
              ? `AR chooses the lowest queue depth -> ${queues.find((queue) => queue.selected)?.name ?? '...'}`
              : `Hash ECMP ignores queues -> ${SPINE_NAMES[(eventIdRef.current * 7 + 3) % 4]}`}
          </div>
        </div>
      </div>

      <div style={{ background: '#0d0f18', borderRadius: 8, padding: '10px 12px', border: '1px solid #2a2d3e' }}>
        <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 8 }}>FORWARDING DECISION LOG</div>
        {events.length === 0 ? (
          <div style={{ fontSize: 11, color: '#4a5568' }}>Waiting for packets...</div>
        ) : (
          events.map((event, index) => (
            <div
              key={event.id}
              style={{
                fontSize: 11,
                color: index === 0 ? '#e2e8f0' : '#7c8db5',
                display: 'flex',
                gap: 8,
                marginBottom: 3,
                opacity: 1 - index * 0.1,
              }}
            >
              <span style={{ color: '#4a5568' }}>PKT#{String(event.id).padStart(4, '0')}</span>
              <span style={{ color: '#60a5fa' }}>to {SPINE_NAMES[event.chosen]}</span>
              <span style={{ color: '#4a5568' }}>
                depths=[{event.depths.map((depth) => String(depth).padStart(2, ' ')).join(',')}]
              </span>
              {mode === 'ar' ? (
                <span style={{ color: '#76e5b5' }}>min={Math.min(...event.depths)}%</span>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div style={{ fontSize: 11, color: '#4a5568', marginTop: 10 }}>
        Queue depths update in real time. AR reacts to congestion; hash ECMP does not.
      </div>
    </div>
  )
}
