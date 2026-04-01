'use client'
import { useState } from 'react'

/**
 * EVPNSRv6Viz
 * Side-by-side comparison of EVPN-VXLAN and EVPN+SRv6.
 * Shows: route announcement format, encapsulation overhead, control plane complexity.
 * User can step through the control plane events and see the data plane packet for each.
 */

type Mode = 'vxlan' | 'srv6'
type Step = 'announce' | 'forward' | 'deliver'

const STEPS: { id: Step; label: string }[] = [
  { id: 'announce', label: '1. Route Announcement' },
  { id: 'forward', label: '2. Packet Forwarding' },
  { id: 'deliver', label: '3. Egress Delivery' },
]

const VXLAN_CONTENT: Record<Step, { title: string; code: string; note: string; packetBytes: number }> = {
  announce: {
    title: 'BGP EVPN RT-5 route with VTEP next-hop',
    code: `BGP UPDATE:
  Route Type: 5 (IP Prefix)
  Route Distinguisher: 65001:100
  Prefix: 10.100.1.0/24
  Next-hop: 192.168.1.5       ← VTEP IP of remote leaf
  VXLAN VNI: 1000             ← Separate attribute
  ESI: 0 (single-homed)
  
# Each leaf must maintain:
# - VTEP table for 63 remote leaves
# - VNI-to-VRF mapping table
# - MAC/ARP table per VNI`,
    note: 'Control plane carries VTEP IP + VNI separately. Receiver must maintain VTEP state and correlate VNI at packet arrival.',
    packetBytes: 0,
  },
  forward: {
    title: 'VXLAN encapsulated frame (36-byte outer overhead)',
    code: `Outer Ethernet  14 bytes  (ToR-to-ToR MAC)
Outer IPv4      20 bytes  (VTEP src → VTEP dst)
UDP (port 4789)  8 bytes
VXLAN header     8 bytes  (VNI = 1000)
─────────────────────────
Overhead:       50 bytes  per frame

Inner Ethernet  14 bytes
Inner IPv4      20 bytes
TCP/UDP payload  N bytes

Total outer:    50 bytes on top of inner frame
MTU impact:     Jumbo frame budget reduced by 50 bytes`,
    note: 'VXLAN adds 50 bytes per frame (Ethernet-to-VTEP + UDP + VXLAN header). Inner frame carries the original tenant packet.',
    packetBytes: 50,
  },
  deliver: {
    title: 'Egress VTEP processing at leaf-08',
    code: `Incoming packet:
  Outer dst IP = 192.168.1.8  ← This leaf's VTEP IP
  UDP port = 4789
  VXLAN VNI = 1000

Processing:
  1. Match dst IP = local VTEP → enter VXLAN processing
  2. Strip outer Ethernet + IPv4 + UDP + VXLAN (50 bytes)
  3. Look up VNI 1000 → maps to VRF RED
  4. Perform IPv4 FIB lookup in VRF RED
  5. Forward inner packet

  State consumed: VTEP table + VNI-VRF mapping table`,
    note: 'Two-step lookup: VTEP match (hardware) → VNI-to-VRF table → VRF FIB. Two separate hardware tables per packet.',
    packetBytes: 0,
  },
}

const SRV6_CONTENT: Record<Step, { title: string; code: string; note: string; packetBytes: number }> = {
  announce: {
    title: 'BGP EVPN RT-5 route with SRv6 VPN SID',
    code: `BGP UPDATE:
  Route Type: 5 (IP Prefix)
  Route Distinguisher: 65001:100
  Prefix: 10.100.1.0/24
  Next-hop: 2001:db8:0:leaf08::100  ← SID encodes BOTH
                                       destination AND VRF
  # No separate VNI attribute needed
  # No VTEP table needed
  # SID = End.DT4 (decap + VRF RED lookup)

# Each leaf only needs:
# - Normal IPv6 route to the SID prefix (via IS-IS)
# - Local SID table (own SIDs only)`,
    note: 'The SRv6 VPN SID encodes both where to go (leaf-08) and what to do there (VRF RED lookup). No VTEP state, no VNI correlation.',
    packetBytes: 0,
  },
  forward: {
    title: 'SRv6 encapsulated packet (40-byte outer, optional SRH)',
    code: `Outer IPv6      40 bytes  (src=leaf01, dst=SID)
SRH (optional)  0 bytes   (not needed for direct path)
────────────────────────
Overhead:       40 bytes  (vs 50 for VXLAN)

Inner IPv4 packet (tenant payload)

Note: The outer IPv6 dst IS the SID:
  2001:db8:0:leaf08::100
  └── Locator: reaches leaf-08 via IS-IS route
  └── Function: ::100 = End.DT4 for VRF RED
  
With uSID (if path traversal needed):
  Overhead: still 40 bytes (packed in DA)`,
    note: 'SRv6 encapsulation adds only 40 bytes (IPv6 header). No UDP, no VXLAN header. The destination address IS the SID — no extra lookup.',
    packetBytes: 40,
  },
  deliver: {
    title: 'SID endpoint processing at leaf-08',
    code: `Incoming packet:
  Outer IPv6 dst = 2001:db8:0:leaf08::100

Processing:
  1. Match dst IPv6 = local End.DT4 SID
  2. Strip outer IPv6 header (40 bytes)
     ↑ SID encodes the VRF — no separate VNI table
  3. Perform IPv4 FIB lookup in VRF RED
  4. Forward inner packet

  State consumed: local SID table ONLY (one lookup)
  
  Compare VXLAN: 3 lookups (VTEP + VNI-VRF + FIB)
  SRv6: 2 lookups (SID table + VRF FIB)`,
    note: 'Single SID lookup replaces both the VTEP match and VNI-to-VRF table lookup. Simpler hardware pipeline, fewer table entries.',
    packetBytes: 0,
  },
}

export default function EVPNSRv6Viz() {
  const [step, setStep] = useState<Step>('announce')

  const vContent = VXLAN_CONTENT[step]
  const sContent = SRV6_CONTENT[step]

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 12,
      padding: '20px 24px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0', maxWidth: 720, margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>COMPARISON</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
        EVPN-VXLAN vs EVPN+SRv6: Control and Data Plane
      </div>
      <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 16 }}>
        Step through control plane events and data plane encapsulation for both approaches.
      </div>

      {/* Step selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {STEPS.map(s => (
          <button key={s.id} onClick={() => setStep(s.id)}
            style={{
              flex: 1, background: step === s.id ? '#1e3a5f' : '#161928',
              border: `1px solid ${step === s.id ? '#60a5fa' : '#2a2d3e'}`,
              borderRadius: 6, color: step === s.id ? '#60a5fa' : '#7c8db5',
              padding: '8px 4px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
              fontWeight: step === s.id ? 700 : 400,
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Side-by-side comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* VXLAN panel */}
        <div style={{ background: '#161928', border: '1px solid #7c3aed44', borderRadius: 10, padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>EVPN-VXLAN</span>
            {vContent.packetBytes > 0 && (
              <span style={{ fontSize: 10, background: '#4a1d96', color: '#c4b5fd', borderRadius: 4, padding: '2px 7px' }}>
                +{vContent.packetBytes}B overhead
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 8 }}>{vContent.title}</div>
          <pre style={{
            background: '#0d0f18', borderRadius: 6, padding: '10px', fontSize: 9.5,
            color: '#94a3b8', overflowX: 'auto', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap',
          }}>
            {vContent.code}
          </pre>
          <div style={{ marginTop: 8, fontSize: 10, color: '#7c3aed', background: '#1e1b4b', borderRadius: 5, padding: '6px 8px', lineHeight: 1.5 }}>
            {vContent.note}
          </div>
        </div>

        {/* SRv6 panel */}
        <div style={{ background: '#121e12', border: '1px solid #34d39944', borderRadius: 10, padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>EVPN+SRv6</span>
            {sContent.packetBytes > 0 && (
              <span style={{ fontSize: 10, background: '#064e3b', color: '#6ee7b7', borderRadius: 4, padding: '2px 7px' }}>
                +{sContent.packetBytes}B overhead
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 8 }}>{sContent.title}</div>
          <pre style={{
            background: '#0d0f18', borderRadius: 6, padding: '10px', fontSize: 9.5,
            color: '#94a3b8', overflowX: 'auto', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap',
          }}>
            {sContent.code}
          </pre>
          <div style={{ marginTop: 8, fontSize: 10, color: '#34d399', background: '#0f2a1a', borderRadius: 5, padding: '6px 8px', lineHeight: 1.5 }}>
            {sContent.note}
          </div>
        </div>
      </div>

      {/* Summary comparison table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2d3e' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left', color: '#7c8db5', fontWeight: 400 }}>Property</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', color: '#a78bfa', fontWeight: 700 }}>EVPN-VXLAN</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', color: '#34d399', fontWeight: 700 }}>EVPN+SRv6</th>
            </tr>
          </thead>
          <tbody>
            {[
              { prop: 'Outer encap overhead', vxlan: '50 bytes (Eth+IP+UDP+VXLAN)', srv6: '40 bytes (IPv6 only)' },
              { prop: 'VTEP state per leaf', vxlan: 'N-1 VTEP entries', srv6: 'None' },
              { prop: 'Tenant ID mechanism', vxlan: 'VNI (separate attribute)', srv6: 'Embedded in SID function' },
              { prop: 'Control plane lookups (egress)', vxlan: 'VTEP → VNI-VRF → FIB (3)', srv6: 'SID → VRF FIB (2)' },
              { prop: 'MTU headroom', vxlan: '−50 bytes', srv6: '−40 bytes (or 0 w/ uSID)' },
              { prop: 'SR-TE path steering', vxlan: 'Not native', srv6: 'Native (SID list in header)' },
            ].map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #1a1f2e', background: i % 2 === 0 ? 'transparent' : '#0d0f18' }}>
                <td style={{ padding: '6px 8px', color: '#7c8db5' }}>{row.prop}</td>
                <td style={{ padding: '6px 8px', textAlign: 'center', color: '#c4b5fd' }}>{row.vxlan}</td>
                <td style={{ padding: '6px 8px', textAlign: 'center', color: '#6ee7b7' }}>{row.srv6}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
