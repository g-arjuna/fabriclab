'use client'
import { useState } from 'react'

/**
 * PKeyMembershipViz
 * Interactive PKey partition table with communication matrix.
 * Click any node to see its PKey table and highlight matrix row/col.
 * Click any cell to see why communication is permitted or denied.
 * Toggle: full vs limited membership effect.
 */

interface Node {
  id: string
  label: string
  guid: string
  partitions: { pkey: string; name: string; type: 'full' | 'limited' }[]
  color: string
}

const NODES: Node[] = [
  {
    id: 'sm',
    label: 'SM Node',
    guid: '0x506b4b0300a1b000',
    color: '#7c8db5',
    partitions: [{ pkey: '0xFFFF', name: 'mgmt', type: 'full' }],
  },
  {
    id: 'ufm',
    label: 'UFM Server',
    guid: '0x506b4b0300a1b001',
    color: '#7c8db5',
    partitions: [{ pkey: '0xFFFF', name: 'mgmt', type: 'full' }],
  },
  {
    id: 'ta01',
    label: 'TenantA-01',
    guid: '0x506b4b0300a1b200',
    color: '#60a5fa',
    partitions: [{ pkey: '0x8001', name: 'TenantA', type: 'full' }],
  },
  {
    id: 'ta02',
    label: 'TenantA-02',
    guid: '0x506b4b0300a1b201',
    color: '#60a5fa',
    partitions: [{ pkey: '0x8001', name: 'TenantA', type: 'full' }],
  },
  {
    id: 'tb01',
    label: 'TenantB-01',
    guid: '0x506b4b0300a1b202',
    color: '#f97316',
    partitions: [{ pkey: '0x8002', name: 'TenantB', type: 'full' }],
  },
  {
    id: 'tb02',
    label: 'TenantB-02',
    guid: '0x506b4b0300a1b203',
    color: '#f97316',
    partitions: [{ pkey: '0x8002', name: 'TenantB', type: 'full' }],
  },
  {
    id: 'storage',
    label: 'Storage Node',
    guid: '0x506b4b0300a1b210',
    color: '#76e5b5',
    partitions: [
      { pkey: '0x0001', name: 'TenantA', type: 'limited' },
      { pkey: '0x0002', name: 'TenantB', type: 'limited' },
    ],
  },
]

// Check if two nodes can communicate
// Rule: share a partition where AT LEAST ONE is full member
function canCommunicate(a: Node, b: Node): { ok: boolean; reason: string; pkey?: string } {
  for (const pa of a.partitions) {
    for (const pb of b.partitions) {
      // Same partition number (ignoring MSB for comparison)
      const aBase = parseInt(pa.pkey, 16) & 0x7FFF
      const bBase = parseInt(pb.pkey, 16) & 0x7FFF
      if (aBase === bBase) {
        if (pa.type === 'full' || pb.type === 'full') {
          return {
            ok: true,
            reason: `Shared partition ${pa.name} (${pa.pkey}/${pb.pkey}). ${
              pa.type === 'full' && pb.type === 'full'
                ? 'Both full members — unrestricted RDMA.'
                : pa.type === 'limited'
                ? `${a.label} is limited member — can receive but the full member ${b.label} can initiate.`
                : `${b.label} is limited member — ${a.label} (full) can initiate RDMA.`
            }`,
            pkey: pa.pkey,
          }
        } else {
          return {
            ok: false,
            reason: `Both nodes have limited membership in ${pa.name}. Limited members cannot communicate peer-to-peer.`,
          }
        }
      }
    }
  }
  return {
    ok: false,
    reason: `No shared partition. ${a.label} is in [${a.partitions.map(p => p.name).join(', ')}]; ${b.label} is in [${b.partitions.map(p => p.name).join(', ')}].`,
  }
}

export default function PKeyMembershipViz() {
  const [selectedNode, setSelectedNode] = useState<string>('ta01')
  const [selectedCell, setSelectedCell] = useState<{ a: string; b: string } | null>(null)

  const selNode = NODES.find(n => n.id === selectedNode)!

  const cellResult = selectedCell
    ? canCommunicate(
        NODES.find(n => n.id === selectedCell.a)!,
        NODES.find(n => n.id === selectedCell.b)!,
      )
    : null

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 12,
      padding: '20px 24px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0', maxWidth: 680, margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>INTERACTIVE</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>
        InfiniBand PKey Partition Table and Communication Matrix
      </div>
      <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 16 }}>
        Click any node (left) to see its PKey table. Click any cell (right) to see why
        communication is permitted or denied.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Node list */}
        <div>
          <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 8 }}>Nodes</div>
          {NODES.map(node => (
            <div key={node.id}
              onClick={() => setSelectedNode(node.id)}
              style={{
                background: selectedNode === node.id ? node.color + '18' : '#161928',
                border: `1px solid ${selectedNode === node.id ? node.color : '#2a2d3e'}`,
                borderRadius: 6, padding: '7px 10px', cursor: 'pointer', marginBottom: 4,
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: selectedNode === node.id ? 700 : 400, color: node.color }}>
                  {node.label}
                </span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {node.partitions.map(p => (
                    <span key={p.pkey} style={{
                      fontSize: 8, color: p.type === 'full' ? '#76e5b5' : '#fbbf24',
                      background: p.type === 'full' ? '#064e3b' : '#451a03',
                      borderRadius: 3, padding: '1px 4px',
                    }}>
                      {p.pkey} {p.type === 'full' ? 'F' : 'L'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Communication matrix */}
        <div>
          <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 8 }}>Communication Matrix</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 9 }}>
              <thead>
                <tr>
                  <td style={{ width: 28 }} />
                  {NODES.map(n => (
                    <td key={n.id} style={{ padding: '2px 3px', textAlign: 'center', width: 32 }}>
                      <span style={{
                        fontSize: 8, color: n.id === selectedNode ? n.color : '#4a5568',
                        fontWeight: n.id === selectedNode ? 700 : 400,
                      }}>
                        {n.label.replace(' ', '\n').split(' ')[0]}
                      </span>
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NODES.map(rowNode => (
                  <tr key={rowNode.id}>
                    <td style={{ padding: '2px 4px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontSize: 8,
                        color: rowNode.id === selectedNode ? rowNode.color : '#4a5568',
                        fontWeight: rowNode.id === selectedNode ? 700 : 400,
                      }}>
                        {rowNode.label.split('-')[0]}
                      </span>
                    </td>
                    {NODES.map(colNode => {
                      if (rowNode.id === colNode.id) {
                        return (
                          <td key={colNode.id} style={{ textAlign: 'center', padding: 2 }}>
                            <span style={{ fontSize: 9, color: '#2a2d3e' }}>—</span>
                          </td>
                        )
                      }
                      const result = canCommunicate(rowNode, colNode)
                      const isHighlighted = rowNode.id === selectedNode || colNode.id === selectedNode
                      const isSelected = selectedCell?.a === rowNode.id && selectedCell?.b === colNode.id
                      return (
                        <td key={colNode.id}
                          onClick={() => setSelectedCell({ a: rowNode.id, b: colNode.id })}
                          style={{
                            textAlign: 'center', padding: 2, cursor: 'pointer',
                            background: isSelected ? (result.ok ? '#76e5b522' : '#f8717122') : 'transparent',
                            borderRadius: 3,
                          }}>
                          <span style={{
                            fontSize: 12,
                            color: result.ok
                              ? (isHighlighted ? '#76e5b5' : '#4a5568')
                              : (isHighlighted ? '#f87171' : '#2a2d3e'),
                            fontWeight: isHighlighted ? 700 : 400,
                          }}>
                            {result.ok ? '✓' : '✗'}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Selected node PKey table */}
      <div style={{ background: '#161928', border: '1px solid #2a2d3e', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: selNode.color, marginBottom: 8 }}>
          {selNode.label} — smpquery pkeys output
        </div>
        <pre style={{ fontSize: 10, color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>
{`PKeys table for ${selNode.label} (GUID ${selNode.guid}):
${selNode.partitions.map((p, i) =>
  `Pkey[${i}] ${p.pkey}    ← ${p.name} partition, ${p.type} membership`
).join('\n')}
${Array.from({ length: 4 - selNode.partitions.length }).map((_, i) =>
  `Pkey[${selNode.partitions.length + i}] 0x0000    ← empty slot`
).join('\n')}`}
        </pre>
      </div>

      {/* Cell detail */}
      {selectedCell && cellResult && (
        <div style={{
          background: cellResult.ok ? '#0a2a1a' : '#1a0a0a',
          border: `1px solid ${cellResult.ok ? '#76e5b5' : '#f87171'}`,
          borderRadius: 8, padding: '10px 14px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: cellResult.ok ? '#76e5b5' : '#f87171', marginBottom: 6 }}>
            {NODES.find(n => n.id === selectedCell.a)!.label} ↔ {NODES.find(n => n.id === selectedCell.b)!.label}
            {' '}— {cellResult.ok ? 'COMMUNICATION PERMITTED ✓' : 'COMMUNICATION BLOCKED ✗'}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
            {cellResult.reason}
          </div>
          {cellResult.pkey && (
            <div style={{ marginTop: 6, fontSize: 10, color: '#4a5568' }}>
              Shared PKey: {cellResult.pkey}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 10, color: '#4a5568', lineHeight: 1.6 }}>
        F = Full membership (MSB=1) · L = Limited membership (MSB=0) ·
        Two limited members in the same partition CANNOT communicate peer-to-peer.
        The Storage Node uses limited membership in both TenantA and TenantB so
        it can serve both without enabling cross-tenant communication.
      </div>
    </div>
  )
}
