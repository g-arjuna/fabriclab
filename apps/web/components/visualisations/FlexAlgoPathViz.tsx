'use client'
import { useState } from 'react'

/**
 * FlexAlgoPathViz
 * Interactive IS-IS Flex-Algo visualization showing two algorithm overlays
 * on the same physical fabric.
 *
 * Physical topology: 4 leaves, 4 spines (8-node fabric)
 * Algorithm 0 (default IGP):   shortest path by hop count
 * Algorithm 128 (min latency): avoids high-delay links, prefers direct paths
 * Algorithm 129 (max BW):      prefers high-bandwidth links, avoids congested links
 *
 * Link properties shown: latency (µs), bandwidth (Gbps), admin-group
 * User can: click src/dst leaf pair, toggle algorithm, see which path is chosen
 */

interface Node {
  id: string
  label: string
  x: number
  y: number
  type: 'leaf' | 'spine'
}

interface Link {
  a: string
  b: string
  latencyUs: number
  bwGbps: number
  adminGroup?: string
}

const NODES: Node[] = [
  // Leaves (left)
  { id: 'L1', label: 'Leaf-01', x: 70,  y: 80,  type: 'leaf' },
  { id: 'L2', label: 'Leaf-02', x: 70,  y: 180, type: 'leaf' },
  { id: 'L3', label: 'Leaf-03', x: 70,  y: 280, type: 'leaf' },
  // Leaves (right)
  { id: 'L4', label: 'Leaf-04', x: 550, y: 80,  type: 'leaf' },
  { id: 'L5', label: 'Leaf-05', x: 550, y: 180, type: 'leaf' },
  { id: 'L6', label: 'Leaf-06', x: 550, y: 280, type: 'leaf' },
  // Spines
  { id: 'S1', label: 'Spine-01', x: 230, y: 100, type: 'spine' },
  { id: 'S2', label: 'Spine-02', x: 230, y: 220, type: 'spine' },
  { id: 'S3', label: 'Spine-03', x: 390, y: 100, type: 'spine' },
  { id: 'S4', label: 'Spine-04', x: 390, y: 220, type: 'spine' },
]

const LINKS: Link[] = [
  // Left leaves to left spines
  { a: 'L1', b: 'S1', latencyUs: 0.8, bwGbps: 400 },
  { a: 'L1', b: 'S2', latencyUs: 4.2, bwGbps: 400 },  // high latency link
  { a: 'L2', b: 'S1', latencyUs: 0.9, bwGbps: 400 },
  { a: 'L2', b: 'S2', latencyUs: 0.9, bwGbps: 400 },
  { a: 'L3', b: 'S1', latencyUs: 1.0, bwGbps: 400 },
  { a: 'L3', b: 'S2', latencyUs: 0.8, bwGbps: 200, adminGroup: 'slow' }, // low BW
  // Spine-to-spine
  { a: 'S1', b: 'S3', latencyUs: 0.5, bwGbps: 800 },  // high BW express
  { a: 'S1', b: 'S4', latencyUs: 0.5, bwGbps: 400 },
  { a: 'S2', b: 'S3', latencyUs: 0.5, bwGbps: 400 },
  { a: 'S2', b: 'S4', latencyUs: 3.8, bwGbps: 400 },  // high latency
  // Right spines to right leaves
  { a: 'S3', b: 'L4', latencyUs: 0.8, bwGbps: 400 },
  { a: 'S3', b: 'L5', latencyUs: 0.9, bwGbps: 400 },
  { a: 'S3', b: 'L6', latencyUs: 0.8, bwGbps: 400 },
  { a: 'S4', b: 'L4', latencyUs: 1.0, bwGbps: 400 },
  { a: 'S4', b: 'L5', latencyUs: 0.9, bwGbps: 200, adminGroup: 'slow' },
  { a: 'S4', b: 'L6', latencyUs: 0.8, bwGbps: 400 },
]

type AlgoId = 0 | 128 | 129

// Simplified path computation per algorithm
// Returns the chosen link sequence for src→dst
function computePath(src: string, dst: string, algo: AlgoId): string[] {
  // For this visual, we hard-code which path each algo picks for L1→L5 example
  // Real impl would run Dijkstra on the algo-specific metric

  // Generic: algo 0 picks first valid path (hops)
  // Algo 128: avoids high-latency links (>2µs)
  // Algo 129: avoids low-BW links (<300 Gbps) or adminGroup=slow

  // All paths go: src → left-spine → right-spine → dst
  const PATH_MATRIX: Record<string, Record<AlgoId, string[]>> = {
    'L1-L5': {
      0:   ['L1', 'S1', 'S3', 'L5'],  // ECMP chooses shortest hops = any path
      128: ['L1', 'S1', 'S3', 'L5'],  // latency: avoids L1-S2 (4.2µs) and S2-S4 (3.8µs)
      129: ['L1', 'S1', 'S3', 'L5'],  // BW: avoids slow adminGroup links
    },
    'L2-L6': {
      0:   ['L2', 'S1', 'S3', 'L6'],
      128: ['L2', 'S1', 'S3', 'L6'],
      129: ['L2', 'S2', 'S4', 'L6'],  // BW algo may go different way
    },
    'L3-L4': {
      0:   ['L3', 'S1', 'S3', 'L4'],
      128: ['L3', 'S2', 'S3', 'L4'],  // latency: S2 has 0.8µs from L3
      129: ['L3', 'S1', 'S3', 'L4'],  // BW: avoids L3-S2 which has 200G (slow)
    },
  }

  const key = `${src}-${dst}`
  return PATH_MATRIX[key]?.[algo] ?? []
}

function pathToEdges(path: string[]): Set<string> {
  const edges = new Set<string>()
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]; const b = path[i + 1]
    edges.add(`${a}-${b}`)
    edges.add(`${b}-${a}`)
  }
  return edges
}

const NODE_MAP = new Map(NODES.map(n => [n.id, n]))

const ALGO_CONFIG: Record<AlgoId, { label: string; color: string; metric: string; avoids: string }> = {
  0:   { label: 'Algo 0 (Default IGP)', color: '#7c8db5', metric: 'Hop count / IGP metric', avoids: 'Nothing excluded' },
  128: { label: 'Algo 128 (Min Latency)', color: '#34d399', metric: 'TE delay metric', avoids: 'Links with latency > 2µs' },
  129: { label: 'Algo 129 (Max BW)',      color: '#60a5fa', metric: 'TE bandwidth metric', avoids: 'Links with BW < 300 Gbps (admin-group: slow)' },
}

const FLOWS: { id: string; src: string; dst: string; label: string }[] = [
  { id: 'L1-L5', src: 'L1', dst: 'L5', label: 'L1 → L5' },
  { id: 'L2-L6', src: 'L2', dst: 'L6', label: 'L2 → L6' },
  { id: 'L3-L4', src: 'L3', dst: 'L4', label: 'L3 → L4' },
]

export default function FlexAlgoPathViz() {
  const [algo, setAlgo] = useState<AlgoId>(0)
  const [selectedFlow, setSelectedFlow] = useState('L1-L5')

  const flow = FLOWS.find(f => f.id === selectedFlow)!
  const path = computePath(flow.src, flow.dst, algo)
  const activeEdges = pathToEdges(path)
  const activeNodes = new Set(path)
  const ac = ALGO_CONFIG[algo]

  // Compute path stats
  const pathLatency = LINKS
    .filter(l => activeEdges.has(`${l.a}-${l.b}`))
    .reduce((s, l) => s + l.latencyUs, 0)
  const pathMinBW = Math.min(...LINKS.filter(l => activeEdges.has(`${l.a}-${l.b}`)).map(l => l.bwGbps))

  const getLinkColor = (link: Link) => {
    const key1 = `${link.a}-${link.b}`
    const key2 = `${link.b}-${link.a}`
    if (activeEdges.has(key1) || activeEdges.has(key2)) return ac.color
    // Dim slow/high-latency links differently
    if (link.latencyUs > 2) return '#4a1d1d'
    if (link.adminGroup === 'slow') return '#1a2a1a'
    return '#1e2130'
  }

  const getLinkWidth = (link: Link) => {
    const key1 = `${link.a}-${link.b}`
    if (activeEdges.has(key1) || activeEdges.has(`${link.b}-${link.a}`)) return 3
    return 1
  }

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 12,
      padding: '20px 24px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0', maxWidth: 680, margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>INTERACTIVE</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#60a5fa', marginBottom: 4 }}>
        IS-IS Flex-Algo: Multiple Topology Overlays on One Fabric
      </div>
      <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 14 }}>
        Same physical fabric — three algorithms compute independent SPF trees.
        {' '}<span style={{ color: '#f87171' }}>Red links</span>: high latency · <span style={{ color: '#4a8a4a' }}>Green links</span>: low BW
      </div>

      {/* Algorithm selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(Object.entries(ALGO_CONFIG) as [string, typeof ALGO_CONFIG[0]][]).map(([id, cfg]) => (
          <button key={id} onClick={() => setAlgo(Number(id) as AlgoId)}
            style={{
              flex: 1, background: algo === Number(id) ? cfg.color + '22' : '#161928',
              border: `1px solid ${algo === Number(id) ? cfg.color : '#2a2d3e'}`,
              borderRadius: 6, color: algo === Number(id) ? cfg.color : '#7c8db5',
              padding: '6px 4px', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit',
              fontWeight: algo === Number(id) ? 700 : 400,
            }}>
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Flow selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: '#7c8db5', alignSelf: 'center' }}>Flow:</span>
        {FLOWS.map(f => (
          <button key={f.id} onClick={() => setSelectedFlow(f.id)}
            style={{
              background: selectedFlow === f.id ? '#1e3a5f' : '#161928',
              border: `1px solid ${selectedFlow === f.id ? '#60a5fa' : '#2a2d3e'}`,
              borderRadius: 5, color: selectedFlow === f.id ? '#60a5fa' : '#7c8db5',
              padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* SVG fabric */}
      <svg viewBox="0 0 620 360" style={{ width: '100%', maxWidth: 620, display: 'block', marginBottom: 14, background: '#090b12', borderRadius: 8 }}>
        {/* Links */}
        {LINKS.map((link, i) => {
          const a = NODE_MAP.get(link.a)!
          const b = NODE_MAP.get(link.b)!
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2
          const color = getLinkColor(link)
          const width = getLinkWidth(link)
          const isActive = activeEdges.has(`${link.a}-${link.b}`) || activeEdges.has(`${link.b}-${link.a}`)
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={color} strokeWidth={width}
                strokeDasharray={link.adminGroup === 'slow' ? '4 3' : 'none'} />
              {/* Link label */}
              <text x={mx} y={my - 4} fontSize={7.5} fill={isActive ? ac.color : '#2a3040'} textAnchor="middle">
                {link.latencyUs}µs · {link.bwGbps}G
              </text>
            </g>
          )
        })}

        {/* Nodes */}
        {NODES.map(node => {
          const isActive = activeNodes.has(node.id)
          const isLeaf = node.type === 'leaf'
          const color = isActive ? ac.color : isLeaf ? '#2a4a2a' : '#1e2a4e'
          const textColor = isActive ? ac.color : '#4a5568'
          return (
            <g key={node.id}>
              <rect x={node.x - 28} y={node.y - 18} width={56} height={36} rx={6}
                fill={isActive ? color + '22' : '#161928'}
                stroke={isActive ? color : '#2a2d3e'} strokeWidth={isActive ? 2 : 1} />
              <text x={node.x} y={node.y - 3} fontSize={8.5} fill={isActive ? ac.color : '#7c8db5'} textAnchor="middle" fontWeight={isActive ? 700 : 400}>
                {node.label}
              </text>
              <text x={node.x} y={node.y + 10} fontSize={7} fill={textColor} textAnchor="middle">
                {node.type}
              </text>
            </g>
          )
        })}

        {/* Path direction arrows */}
        {path.length > 1 && path.map((nodeId, i) => {
          if (i === 0) return null
          const prev = NODE_MAP.get(path[i - 1])!
          const curr = NODE_MAP.get(nodeId)!
          const dx = curr.x - prev.x; const dy = curr.y - prev.y
          const dist = Math.sqrt(dx*dx + dy*dy)
          const mx = prev.x + dx * 0.6
          const my = prev.y + dy * 0.6
          const angle = Math.atan2(dy, dx) * 180 / Math.PI
          return (
            <text key={i} x={mx} y={my} fontSize={12} fill={ac.color} textAnchor="middle"
              transform={`rotate(${angle}, ${mx}, ${my})`} style={{ userSelect: 'none' }}>
              ▶
            </text>
          )
        })}
      </svg>

      {/* Algorithm info + path stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ background: '#161928', border: `1px solid ${ac.color}44`, borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 4 }}>Algorithm metric</div>
          <div style={{ fontSize: 11, color: ac.color, marginBottom: 6 }}>{ac.metric}</div>
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 2 }}>Exclusion rule</div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>{ac.avoids}</div>
        </div>
        <div style={{ background: '#161928', border: '1px solid #2a2d3e', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 6 }}>Chosen path for {flow.label}</div>
          <div style={{ fontSize: 12, color: ac.color, fontWeight: 700, marginBottom: 6 }}>
            {path.join(' → ')}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
            <span><span style={{ color: '#7c8db5' }}>Total latency: </span><span style={{ color: ac.color }}>{pathLatency.toFixed(1)}µs</span></span>
            <span><span style={{ color: '#7c8db5' }}>Min BW: </span><span style={{ color: ac.color }}>{pathMinBW}G</span></span>
          </div>
        </div>
      </div>

      <div style={{ background: '#0d1424', border: '1px solid #1e3a5f', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#93c5fd', lineHeight: 1.6 }}>
        <span style={{ color: '#60a5fa', fontWeight: 700 }}>Key insight:</span> All three algorithms run simultaneously on every switch.
        No additional hardware is required. The IS-IS SPF runs three independent computations.
        Each generates a separate forwarding table. Traffic is steered to the correct table
        via the Flex-Algo SID assigned to each algorithm.
      </div>
    </div>
  )
}
