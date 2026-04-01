'use client'
import { useState } from 'react'

const BLOCKS = [
  {
    id: 'ports',
    label: 'Port Block',
    x: 30, y: 100, w: 120, h: 60,
    color: '#60a5fa',
    detail: '128×400GbE (QSFP112) or 64×800GbE (OSFP). Cut-through forwarding: <300ns. Store-and-forward for 9KB jumbo would be 1–5µs.',
    stat: '128×400G',
  },
  {
    id: 'ar',
    label: 'Adaptive\nRouting Engine',
    x: 200, y: 60, w: 130, h: 70,
    color: '#76e5b5',
    detail: 'Per-packet egress queue depth polling. Selects least-loaded next-hop at line rate — no CPU involvement. Eliminates ECMP hash collisions for AI collective traffic.',
    stat: 'Per-packet',
  },
  {
    id: 'buffer',
    label: 'Shared Buffer\n48 MB',
    x: 200, y: 170, w: 130, h: 60,
    color: '#f97316',
    detail: '48 MB shared buffer per chip — 4× Broadcom Tomahawk 4 (12 MB). Absorbs All-Reduce incast bursts before ECN threshold, giving DCQCN time to reduce sender rates.',
    stat: '48 MB',
  },
  {
    id: 'ecn',
    label: 'ECN Engine',
    x: 390, y: 80, w: 110, h: 55,
    color: '#fbbf24',
    detail: 'ECN marking at wire speed across all 128 ports simultaneously. Marks CE bits in IP header when queue depth exceeds RED min threshold. Feeds DCQCN congestion control.',
    stat: 'Wire speed',
  },
  {
    id: 'wjh',
    label: 'WJH Engine',
    x: 390, y: 165, w: 110, h: 55,
    color: '#a78bfa',
    detail: 'What Just Happened: captures every hardware drop event with nanosecond timestamp, source/dest MAC+IP, DSCP, drop reason code. Written to ASIC ring buffer. Exported via DOCA or NetQ agent.',
    stat: 'ns precision',
  },
  {
    id: 'fwd',
    label: 'Forwarding\nPipeline',
    x: 560, y: 100, w: 110, h: 60,
    color: '#f87171',
    detail: 'IPv4/IPv6 L3 forwarding, VXLAN encap/decap, ACL processing, QoS queuing (8 traffic classes). All processed in a single-pass pipeline without traffic class demotion.',
    stat: 'Single-pass',
  },
]

const COMPARISONS = [
  { label: 'Bandwidth', s4: '51.2 Tbps', th4: '12.8 Tbps', winner: 's4' },
  { label: 'Shared Buffer', s4: '48 MB', th4: '12 MB', winner: 's4' },
  { label: 'Cut-through latency', s4: '<300 ns', th4: '~400 ns', winner: 's4' },
  { label: 'Adaptive Routing', s4: 'Hardware AR', th4: 'ECMP only', winner: 's4' },
  { label: 'WJH telemetry', s4: 'Yes (ns)', th4: 'No', winner: 's4' },
  { label: 'Port density 400G', s4: '128 ports', th4: '128 ports', winner: 'tie' },
]

export default function Spectrum4ASICViz() {
  const [active, setActive] = useState<string | null>(null)
  const [tab, setTab] = useState<'diagram' | 'compare'>('diagram')

  const activeBlock = BLOCKS.find(b => b.id === active)

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 12,
      padding: '20px 24px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0', maxWidth: 680, margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>
        INTERACTIVE
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#60a5fa', marginBottom: 16 }}>
        Spectrum-4 ASIC Architecture
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['diagram', 'compare'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '4px 14px', borderRadius: 6, border: '1px solid #2a2d3e',
            background: tab === t ? '#60a5fa' : '#161928',
            color: tab === t ? '#0f1117' : '#7c8db5',
            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            fontWeight: tab === t ? 700 : 400, letterSpacing: '0.06em',
          }}>
            {t === 'diagram' ? 'BLOCK DIAGRAM' : 'VS TOMAHAWK 4'}
          </button>
        ))}
      </div>

      {tab === 'diagram' && (
        <>
          <svg viewBox="0 0 700 280" style={{ width: '100%', maxWidth: 700, display: 'block' }}>
            {/* Background chip outline */}
            <rect x={10} y={30} width={680} height={220} rx={16}
              fill="#161928" stroke="#2a2d3e" strokeWidth={1.5} />
            <text x={350} y={24} textAnchor="middle" fill="#4a5568" fontSize={11}
              fontFamily="'JetBrains Mono',monospace">SPECTRUM-4 ASIC</text>

            {/* Connection lines */}
            <line x1={150} y1={130} x2={200} y2={95} stroke="#2a2d3e" strokeWidth={1} />
            <line x1={150} y1={130} x2={200} y2={200} stroke="#2a2d3e" strokeWidth={1} />
            <line x1={330} y1={95} x2={390} y2={108} stroke="#2a2d3e" strokeWidth={1} />
            <line x1={330} y1={200} x2={390} y2={193} stroke="#2a2d3e" strokeWidth={1} />
            <line x1={500} y1={108} x2={560} y2={130} stroke="#2a2d3e" strokeWidth={1} />
            <line x1={500} y1={193} x2={560} y2={130} stroke="#2a2d3e" strokeWidth={1} />

            {/* Blocks */}
            {BLOCKS.map(b => {
              const isActive = active === b.id
              return (
                <g key={b.id} onClick={() => setActive(isActive ? null : b.id)}
                  style={{ cursor: 'pointer' }}>
                  <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8}
                    fill={isActive ? `${b.color}28` : '#0d0f18'}
                    stroke={isActive ? b.color : '#2a2d3e'}
                    strokeWidth={isActive ? 2 : 1} />
                  {b.label.split('\n').map((line, li) => (
                    <text key={li} x={b.x + b.w / 2} y={b.y + b.h / 2 + (li - (b.label.split('\n').length - 1) / 2) * 15}
                      textAnchor="middle" fill={isActive ? b.color : '#7c8db5'}
                      fontSize={10} fontFamily="'JetBrains Mono',monospace" fontWeight={700}>
                      {line}
                    </text>
                  ))}
                  <text x={b.x + b.w / 2} y={b.y + b.h - 6}
                    textAnchor="middle" fill={b.color} fontSize={9}
                    fontFamily="'JetBrains Mono',monospace">
                    {b.stat}
                  </text>
                </g>
              )
            })}
          </svg>

          {activeBlock && (
            <div style={{
              marginTop: 10, background: '#161928',
              border: `1px solid ${activeBlock.color}40`, borderRadius: 8, padding: '12px 16px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: activeBlock.color, marginBottom: 6 }}>
                {activeBlock.label.replace('\n', ' ')}
              </div>
              <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.7 }}>
                {activeBlock.detail}
              </div>
            </div>
          )}
          {!activeBlock && (
            <div style={{ fontSize: 11, color: '#4a5568', marginTop: 8 }}>
              Click any block to see detail
            </div>
          )}
        </>
      )}

      {tab === 'compare' && (
        <div>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr',
            gap: 1, background: '#2a2d3e', borderRadius: 8, overflow: 'hidden',
          }}>
            {['Metric', 'Spectrum-4', 'Tomahawk 4'].map(h => (
              <div key={h} style={{
                background: '#0d0f18', padding: '8px 12px',
                fontSize: 11, color: '#7c8db5', fontWeight: 700,
              }}>{h}</div>
            ))}
            {COMPARISONS.map(row => (
              <>
                <div key={`${row.label}-l`} style={{ background: '#161928', padding: '8px 12px', fontSize: 12, color: '#e2e8f0' }}>
                  {row.label}
                </div>
                <div key={`${row.label}-s4`} style={{
                  background: '#161928', padding: '8px 12px', fontSize: 12,
                  color: row.winner === 's4' ? '#76e5b5' : '#e2e8f0', fontWeight: row.winner === 's4' ? 700 : 400,
                }}>
                  {row.s4} {row.winner === 's4' && '✓'}
                </div>
                <div key={`${row.label}-th4`} style={{
                  background: '#161928', padding: '8px 12px', fontSize: 12,
                  color: row.winner === 'th4' ? '#76e5b5' : '#4a5568',
                }}>
                  {row.th4}
                </div>
              </>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: '#7c8db5', lineHeight: 1.6 }}>
            Buffer depth is the most operationally significant difference for AI workloads.
            4× more buffer = absorbs All-Reduce incast bursts before tail-drop threshold,
            giving DCQCN time to reduce sender rates.
          </div>
        </div>
      )}
    </div>
  )
}
