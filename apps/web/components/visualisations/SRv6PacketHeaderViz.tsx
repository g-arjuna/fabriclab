'use client'
import { useState } from 'react'

/**
 * SRv6PacketHeaderViz
 * Interactive SRH (Segment Routing Header) anatomy.
 * Shows a full SRv6 packet with IPv6 header + SRH + payload.
 * User can:
 *  - Toggle between standard SRv6 and uSID compression
 *  - Click "Next Hop" to advance the Segments Left pointer and see how the DA changes
 *  - Add/remove SIDs to see overhead grow
 */

const BASE_SIDS = [
  { id: 0, label: 'leaf08::End.DT4', sid: '2001:db8:0:leaf08::100', role: 'Destination (VRF decap)', color: '#76e5b5' },
  { id: 1, label: 'spine03::End',    sid: '2001:db8:0:spine03::1',  role: 'Waypoint 2',             color: '#60a5fa' },
  { id: 2, label: 'spine02::End',    sid: '2001:db8:0:spine02::1',  role: 'Waypoint 1',             color: '#a78bfa' },
  { id: 3, label: 'leaf01::End.X',   sid: '2001:db8:0:leaf01::2',   role: 'Egress adjacency',       color: '#fbbf24' },
]

const USID_PACKED = 'FC00:0002:0003:0008:0000:0000:0000:0000'

export default function SRv6PacketHeaderViz() {
  const [uSIDMode, setUSIDMode] = useState(false)
  const [segmentsLeft, setSegmentsLeft] = useState(3) // starts at N-1
  const [sids, setSids] = useState(BASE_SIDS)

  const N = sids.length
  const srhFixed = 8
  const srhSIDs = N * 16
  const srhTotal = srhFixed + srhSIDs
  const uSIDTotal = 0 // uSID packs into the DA — no extra SRH needed for ≤4 hops

  // Current active SID (what the IPv6 DA is set to)
  const activeIdx = sids.length - 1 - segmentsLeft
  const activeSID = sids[Math.max(0, activeIdx)]

  const handleNextHop = () => {
    if (segmentsLeft > 0) setSegmentsLeft(s => s - 1)
  }

  const addSID = () => {
    if (sids.length >= 6) return
    setSids(prev => [{
      id: prev.length,
      label: `spine0${prev.length}::End`,
      sid: `2001:db8:0:spine0${prev.length}::1`,
      role: `Waypoint ${prev.length - 1}`,
      color: '#f97316',
    }, ...prev])
    setSegmentsLeft(s => s + 1)
  }

  const removeSID = () => {
    if (sids.length <= 2) return
    setSids(prev => prev.slice(1))
    setSegmentsLeft(s => Math.min(s, sids.length - 2))
  }

  const reset = () => {
    setSids(BASE_SIDS)
    setSegmentsLeft(3)
    setUSIDMode(false)
  }

  const overhead = uSIDMode ? uSIDTotal : srhTotal

  return (
    <div style={{
      background: '#0f1117',
      border: '1px solid #2a2d3e',
      borderRadius: 12,
      padding: '20px 24px',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0',
      maxWidth: 680,
      margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>INTERACTIVE</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#60a5fa', marginBottom: 4 }}>
        SRv6 Packet Header Anatomy
      </div>
      <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 16 }}>
        Click <strong style={{ color: '#e2e8f0' }}>Next Hop</strong> to advance the Segments Left pointer.
        Toggle uSID to see overhead compression.
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <button onClick={handleNextHop} disabled={segmentsLeft === 0}
          style={{ background: segmentsLeft === 0 ? '#1a1f2e' : '#0c2a4a', border: `1px solid ${segmentsLeft === 0 ? '#2a2d3e' : '#60a5fa'}`,
            borderRadius: 6, color: segmentsLeft === 0 ? '#4a5568' : '#60a5fa', padding: '6px 14px', cursor: segmentsLeft === 0 ? 'default' : 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
          ▶ Next Hop ({segmentsLeft} left)
        </button>
        <button onClick={addSID} disabled={sids.length >= 6}
          style={{ background: '#0a1a0a', border: '1px solid #76e5b5', borderRadius: 6, color: '#76e5b5', padding: '6px 12px', cursor: sids.length >= 6 ? 'default' : 'pointer', fontSize: 12, fontFamily: 'inherit', opacity: sids.length >= 6 ? 0.4 : 1 }}>
          + SID
        </button>
        <button onClick={removeSID} disabled={sids.length <= 2}
          style={{ background: '#1a0a0a', border: '1px solid #f87171', borderRadius: 6, color: '#f87171', padding: '6px 12px', cursor: sids.length <= 2 ? 'default' : 'pointer', fontSize: 12, fontFamily: 'inherit', opacity: sids.length <= 2 ? 0.4 : 1 }}>
          − SID
        </button>
        <button onClick={() => setUSIDMode(m => !m)}
          style={{ background: uSIDMode ? '#1e1b4b' : '#161928', border: `1px solid ${uSIDMode ? '#a78bfa' : '#2a2d3e'}`, borderRadius: 6, color: uSIDMode ? '#a78bfa' : '#7c8db5', padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
          {uSIDMode ? '✓ uSID Mode' : 'uSID Mode'}
        </button>
        <button onClick={reset}
          style={{ background: '#1e1b4b', border: '1px solid #6366f1', borderRadius: 6, color: '#818cf8', padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
          ↺ Reset
        </button>
      </div>

      {/* Packet diagram */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 18 }}>
        {/* IPv6 Header */}
        <div style={{
          background: '#0d1424', border: '1px solid #1e3a5f', borderRadius: 6,
          padding: '10px 14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa' }}>IPv6 Header</span>
            <span style={{ fontSize: 10, color: '#4a5568' }}>40 bytes</span>
          </div>
          <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11 }}>
            <div>
              <span style={{ color: '#4a5568' }}>Next Header: </span>
              <span style={{ color: '#fbbf24' }}>{uSIDMode ? '43 (no SRH)' : '43 (SRH)'}</span>
            </div>
            <div>
              <span style={{ color: '#4a5568' }}>Src: </span>
              <span style={{ color: '#94a3b8' }}>2001:db8:0:leaf01::gpu1</span>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: '#4a5568' }}>Dst: </span>
              <span style={{ color: activeSID?.color ?? '#76e5b5', fontWeight: 700 }}>
                {uSIDMode ? USID_PACKED : (activeSID?.sid ?? '—')}
              </span>
              {uSIDMode && (
                <span style={{ marginLeft: 8, fontSize: 10, color: '#a78bfa' }}>
                  [µSID-active: FC00:000{segmentsLeft > 2 ? '2' : segmentsLeft > 1 ? '3' : '8'}]
                </span>
              )}
            </div>
          </div>
        </div>

        {/* SRH — hidden in uSID mode for short paths */}
        {!uSIDMode && (
          <div style={{ background: '#12180f', border: '1px solid #2d4a1a', borderRadius: 6, padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#76e5b5' }}>
                Segment Routing Header (SRH)
              </span>
              <span style={{ fontSize: 10, color: '#4a5568' }}>{srhTotal} bytes</span>
            </div>
            {/* Fixed fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, fontSize: 10, marginBottom: 8 }}>
              {[
                { f: 'Routing Type', v: '4' },
                { f: 'Segments Left', v: segmentsLeft.toString(), highlight: true },
                { f: 'Last Entry', v: (N - 1).toString() },
                { f: 'Hdr Ext Len', v: `${(N * 2) - 1}` },
              ].map(({ f, v, highlight }) => (
                <div key={f} style={{ background: '#0d0f18', borderRadius: 4, padding: '4px 6px', border: highlight ? '1px solid #76e5b5' : '1px solid #1a2010' }}>
                  <div style={{ color: '#4a5568', marginBottom: 1 }}>{f}</div>
                  <div style={{ color: highlight ? '#76e5b5' : '#94a3b8', fontWeight: highlight ? 700 : 400 }}>{v}</div>
                </div>
              ))}
            </div>
            {/* Segment list — reversed order */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {[...sids].reverse().map((sid, i) => {
                const isActive = i === (N - 1 - segmentsLeft)
                const isVisited = i < (N - 1 - segmentsLeft)
                return (
                  <div key={sid.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 8px', borderRadius: 4,
                    background: isActive ? sid.color + '22' : isVisited ? '#0d0f18' : '#111820',
                    border: `1px solid ${isActive ? sid.color : '#1a2010'}`,
                    opacity: isVisited ? 0.45 : 1,
                  }}>
                    <span style={{ fontSize: 9, color: '#4a5568', width: 60, flexShrink: 0 }}>
                      SID[{N - 1 - i}] {i === 0 ? '(dest)' : i === N - 1 ? '(first)' : ''}
                    </span>
                    <span style={{ fontSize: 11, color: sid.color, flex: 1 }}>{sid.sid}</span>
                    <span style={{ fontSize: 9, color: '#4a5568' }}>{sid.role}</span>
                    {isActive && (
                      <span style={{ fontSize: 9, background: sid.color, color: '#000', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>
                        ACTIVE
                      </span>
                    )}
                    {isVisited && (
                      <span style={{ fontSize: 9, color: '#4a5568' }}>visited</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* uSID explanation panel */}
        {uSIDMode && (
          <div style={{ background: '#150f2a', border: '1px solid #4a1d96', borderRadius: 6, padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>uSID: No SRH Required</span>
              <span style={{ fontSize: 10, color: '#76e5b5', fontWeight: 700 }}>0 bytes overhead</span>
            </div>
            <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 8, lineHeight: 1.6 }}>
              All {N} micro-SIDs are packed into the 128-bit IPv6 Destination Address.
              Each switch reads its µSID (leftmost 16 bits after the carrier prefix) and shifts left.
            </div>
            {/* uSID breakdown visual */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
              {['FC00', '0002', '0003', '0008', '0000', '0000', '0000', '0000'].map((block, i) => {
                const labels = ['carrier', 'µSID1\n(leaf01)', 'µSID2\n(spine02)', 'µSID3\n(leaf08)', '', '', '', '']
                const colors = ['#4a5568', '#fbbf24', '#60a5fa', '#76e5b5', '#2a2d3e', '#2a2d3e', '#2a2d3e', '#2a2d3e']
                const activeBlock = 3 - segmentsLeft + 1
                const isActive = i === activeBlock && i > 0 && i < 4
                return (
                  <div key={i} style={{
                    flex: 1, background: '#0d0f18',
                    border: `1px solid ${isActive ? colors[i] : '#1a2010'}`,
                    borderRadius: 3, padding: '4px 2px', textAlign: 'center',
                    opacity: i > 0 && i < 4 && i < activeBlock ? 0.35 : 1,
                  }}>
                    <div style={{ fontSize: 9, color: colors[i], fontWeight: isActive ? 700 : 400 }}>{block}</div>
                    <div style={{ fontSize: 7, color: '#4a5568', marginTop: 2, whiteSpace: 'pre' }}>{labels[i]}</div>
                    {isActive && <div style={{ fontSize: 7, color: colors[i], fontWeight: 700 }}>▲ACTIVE</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Payload */}
        <div style={{ background: '#0d0f18', border: '1px solid #2a2d3e', borderRadius: 6, padding: '8px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#7c8db5' }}>Inner payload (RoCEv2 / RDMA Write)</span>
            <span style={{ fontSize: 10, color: '#4a5568' }}>up to {9000 - 40 - overhead} bytes</span>
          </div>
        </div>
      </div>

      {/* Overhead summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[
          { label: 'SRH Overhead', value: `${overhead} bytes`, color: overhead > 100 ? '#f87171' : '#76e5b5' },
          { label: 'Effective MTU', value: `${9000 - 40 - overhead} bytes`, color: '#60a5fa' },
          { label: 'SIDs in path', value: `${N}`, color: '#fbbf24' },
        ].map(s => (
          <div key={s.label} style={{ background: '#161928', border: '1px solid #2a2d3e', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
