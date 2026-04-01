'use client'
import { useState } from 'react'

/**
 * SRv6SIDViz
 * Two-panel viz:
 * LEFT:  SID address anatomy - Locator prefix decomposition with adjustable block/node/func lengths
 * RIGHT: Endpoint behavior explorer - click a behavior to see what the switch does with the packet
 */

const BEHAVIORS = [
  {
    name: 'End',
    full: 'Endpoint',
    color: '#76e5b5',
    description: 'Transit node processing. Switch accepts the packet, pops the active segment, and routes the packet to the next SID.',
    action: [
      '1. Verify SID matches local locator',
      '2. Decrement Segments Left',
      '3. Update IPv6 DA = next SID in list',
      '4. Forward normally via FIB lookup on new DA',
    ],
    useCase: 'Spine waypoints: "traverse spine-02"',
    example: '2001:db8:0:spine02::1',
  },
  {
    name: 'End.X',
    full: 'Endpoint with cross-connect',
    color: '#60a5fa',
    description: 'Like End, but forwards out a specific adjacency (next-hop link) rather than doing a full FIB lookup. Used for explicit link selection.',
    action: [
      '1. Verify SID matches local End.X SID',
      '2. Decrement Segments Left',
      '3. Update IPv6 DA = next SID',
      '4. Forward out the pre-programmed adjacency (specific port)',
    ],
    useCase: 'Explicit link selection: "exit via swp3 toward spine"',
    example: '2001:db8:0:leaf01::2  (swp3)',
  },
  {
    name: 'End.DT4',
    full: 'Endpoint + Decap + IPv4 table lookup',
    color: '#fbbf24',
    description: 'Decapsulate the SRv6 outer IPv6 header, then perform an IPv4 route lookup in the specified VRF table. Used as the egress function for IPv4 tenant traffic.',
    action: [
      '1. Verify SID matches local End.DT4 SID',
      '2. Remove outer IPv6 header (and SRH if present)',
      '3. Perform IPv4 FIB lookup in VRF associated with SID',
      '4. Forward inner IPv4 packet to destination',
    ],
    useCase: 'Tenant egress: deliver IPv4 packet into VRF RED on this leaf',
    example: '2001:db8:0:leaf08::100  (VRF RED)',
  },
  {
    name: 'End.DT6',
    full: 'Endpoint + Decap + IPv6 table lookup',
    color: '#a78bfa',
    description: 'Same as End.DT4 but performs the inner table lookup in an IPv6 VRF. Used for IPv6-native tenant traffic.',
    action: [
      '1. Verify SID matches local End.DT6 SID',
      '2. Remove outer IPv6 + SRH',
      '3. IPv6 FIB lookup in VRF associated with SID',
      '4. Forward inner IPv6 packet',
    ],
    useCase: 'IPv6 tenant egress: VRF BLUE on egress leaf',
    example: '2001:db8:0:leaf08::200  (VRF BLUE)',
  },
  {
    name: 'End.DX4',
    full: 'Endpoint + Decap + L3 cross-connect IPv4',
    color: '#f97316',
    description: 'Decapsulate and forward the inner IPv4 packet to a specific adjacent IPv4 next-hop. Used at the last hop to deliver to a host without a full VRF table lookup.',
    action: [
      '1. Verify SID matches local End.DX4 SID',
      '2. Remove outer IPv6 + SRH',
      '3. Forward inner IPv4 directly to pre-programmed next-hop',
      '   (no table lookup — direct L3 adjacency)',
    ],
    useCase: 'Direct host delivery: "send to 10.1.1.5 without a VRF lookup"',
    example: '2001:db8:0:leaf08::300  (→ 10.1.1.5)',
  },
]

export default function SRv6SIDViz() {
  const [selectedBehavior, setSelectedBehavior] = useState(0)
  const [blockLen, setBlockLen] = useState(40)
  const [nodeLen, setNodeLen] = useState(24)
  const funcBits = 16
  const argBits = 128 - blockLen - nodeLen - funcBits

  const bh = BEHAVIORS[selectedBehavior]

  // Build the visual SID from components
  // e.g. 2001:db8:0: | leaf01 | ::1
  const locatorBits = blockLen + nodeLen

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
      <div style={{ fontSize: 17, fontWeight: 700, color: '#fbbf24', marginBottom: 16 }}>
        SRv6 SID Architecture and Endpoint Behaviors
      </div>

      {/* Panel 1: SID anatomy */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: '#7c8db5', marginBottom: 10 }}>SID Address Anatomy</div>

        {/* Visual bit map */}
        <div style={{ display: 'flex', height: 36, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
          {[
            { label: `Block (${blockLen}b)`, bits: blockLen, color: '#1e3a5f', text: '#60a5fa' },
            { label: `Node (${nodeLen}b)`, bits: nodeLen, color: '#14532d', text: '#76e5b5' },
            { label: `Function (${funcBits}b)`, bits: funcBits, color: '#451a03', text: '#fbbf24' },
            ...(argBits > 0 ? [{ label: `Args (${argBits}b)`, bits: argBits, color: '#1a1f2e', text: '#4a5568' }] : []),
          ].map((seg, i) => (
            <div key={i} style={{
              flex: seg.bits,
              background: seg.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: i < 3 ? '1px solid #0f1117' : 'none',
            }}>
              <span style={{ fontSize: 9, color: seg.text, textAlign: 'center', lineHeight: 1.2 }}>
                {seg.label}
              </span>
            </div>
          ))}
        </div>

        {/* Example SID decomposition */}
        <div style={{ background: '#0d0f18', borderRadius: 6, padding: '10px 12px', fontSize: 11, marginBottom: 12 }}>
          <div style={{ color: '#7c8db5', marginBottom: 6 }}>Example SID decomposition:</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <span style={{ color: '#60a5fa', background: '#1e3a5f', borderRadius: 3, padding: '2px 6px' }}>
              2001:db8:0
            </span>
            <span style={{ color: '#4a5568' }}>:</span>
            <span style={{ color: '#76e5b5', background: '#14532d', borderRadius: 3, padding: '2px 6px' }}>
              leaf01
            </span>
            <span style={{ color: '#4a5568' }}>::</span>
            <span style={{ color: '#fbbf24', background: '#451a03', borderRadius: 3, padding: '2px 6px' }}>
              1
            </span>
            {argBits > 0 && <span style={{ color: '#4a5568' }}>:0:0</span>}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 6, fontSize: 10 }}>
            <span style={{ color: '#60a5fa' }}>└─ Block: topology prefix</span>
            <span style={{ color: '#4a5568', margin: '0 4px' }}>·</span>
            <span style={{ color: '#76e5b5' }}>Node: this switch's ID</span>
            <span style={{ color: '#4a5568', margin: '0 4px' }}>·</span>
            <span style={{ color: '#fbbf24' }}>Function: behavior code</span>
          </div>
        </div>

        {/* Block/Node length sliders */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, color: '#60a5fa' }}>BLOCK LENGTH: {blockLen} bits</span>
            <input type="range" min={16} max={64} step={8} value={blockLen}
              onChange={e => setBlockLen(Number(e.target.value))}
              style={{ accentColor: '#60a5fa' }} />
            <span style={{ fontSize: 9, color: '#4a5568' }}>Topology prefix (typically 32–48)</span>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, color: '#76e5b5' }}>NODE LENGTH: {nodeLen} bits</span>
            <input type="range" min={8} max={48} step={8} value={nodeLen}
              onChange={e => setNodeLen(Math.min(e.target.value as unknown as number, 128 - blockLen - funcBits - 8))}
              style={{ accentColor: '#76e5b5' }} />
            <span style={{ fontSize: 9, color: '#4a5568' }}>Node identifier (typically 16–24)</span>
          </label>
        </div>

        <div style={{ marginTop: 8, fontSize: 11, color: '#4a5568' }}>
          Locator = Block + Node = {locatorBits} bits · Function = {funcBits} bits · Args = {Math.max(0, argBits)} bits
          {' '}(total = {locatorBits + funcBits + Math.max(0, argBits)} bits)
        </div>
      </div>

      {/* Panel 2: Endpoint behavior explorer */}
      <div style={{ fontSize: 12, color: '#7c8db5', marginBottom: 10 }}>Endpoint Behavior Explorer</div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {BEHAVIORS.map((b, i) => (
          <button key={b.name} onClick={() => setSelectedBehavior(i)}
            style={{
              background: selectedBehavior === i ? b.color + '22' : '#161928',
              border: `1px solid ${selectedBehavior === i ? b.color : '#2a2d3e'}`,
              borderRadius: 6, color: selectedBehavior === i ? b.color : '#7c8db5',
              padding: '5px 12px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
              fontWeight: selectedBehavior === i ? 700 : 400,
            }}>
            {b.name}
          </button>
        ))}
      </div>

      <div style={{
        background: '#161928', border: `1px solid ${bh.color}44`,
        borderRadius: 10, padding: '14px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: bh.color }}>{bh.name}</div>
            <div style={{ fontSize: 11, color: '#7c8db5' }}>{bh.full}</div>
          </div>
          <div style={{ fontSize: 10, background: '#0d0f18', borderRadius: 5, padding: '4px 10px', color: '#94a3b8', maxWidth: 240, textAlign: 'right' }}>
            {bh.example}
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6, marginBottom: 10 }}>
          {bh.description}
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 6 }}>Switch action sequence:</div>
          {bh.action.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: bh.color, background: bh.color + '22', borderRadius: 3, padding: '1px 5px', flexShrink: 0, alignSelf: 'flex-start', marginTop: 1 }}>
                {i + 1}
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{step}</span>
            </div>
          ))}
        </div>

        <div style={{ background: '#0d0f18', borderRadius: 6, padding: '8px 10px', fontSize: 11 }}>
          <span style={{ color: bh.color }}>Use case: </span>
          <span style={{ color: '#7c8db5' }}>{bh.useCase}</span>
        </div>
      </div>
    </div>
  )
}
