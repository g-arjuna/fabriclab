'use client'
import { useState } from 'react'

const STORAGE_OPTIONS = [
  {
    id: 'nvme_local',
    label: 'Local NVMe',
    bw: 14, latency: 0.1, color: '#4a5568',
    desc: 'Boot drive only (~3.84TB per DGX). PCIe Gen5 NVMe: ~14 GB/s read. Not for training datasets — does not scale past single-node. OS, Docker images, binaries only.',
    protocol: 'PCIe Direct',
    use: 'Boot / scratch',
    rdma: false,
  },
  {
    id: 'nvmeof',
    label: 'NVMe-oF / GPUDirect',
    bw: 50, latency: 0.15, color: '#60a5fa',
    desc: 'NVMe-oF over RDMA with GPUDirect Storage. Eliminates CPU copy: GPU reads directly from storage NVMe namespace via RDMA. CX7 port 7 (dedicated storage NIC). DSCP 10 (0x0A).',
    protocol: 'RoCEv2 / RDMA',
    use: 'High-speed dataset access',
    rdma: true,
  },
  {
    id: 'lustre',
    label: 'Lustre',
    bw: 400, latency: 1.5, color: '#76e5b5',
    desc: 'Most common parallel FS in AI clusters. Stripe data across multiple OSTs (object storage targets). POSIX-compatible. Lustre over LNet with RDMA transport. Scales to tens of GB/s aggregate.',
    protocol: 'POSIX / LNet RDMA',
    use: 'Training datasets, checkpoints',
    rdma: true,
  },
  {
    id: 'gpfs',
    label: 'IBM Spectrum Scale',
    bw: 350, latency: 2.0, color: '#a78bfa',
    desc: 'Enterprise parallel FS (GPFS). Strong metadata performance and snapshots. Common in hybrid cloud and regulated environments. RDMA transport via RDMA-over-RoCE.',
    protocol: 'POSIX / RDMA',
    use: 'Enterprise / regulated clusters',
    rdma: true,
  },
  {
    id: 'weka',
    label: 'WekaIO',
    bw: 600, latency: 0.5, color: '#fbbf24',
    desc: 'NVMe-all-flash parallel FS. POSIX + S3 dual-protocol. Popular for clusters that serve inference directly from training storage. WekaFS over RDMA. Sub-millisecond metadata latency.',
    protocol: 'POSIX + S3 / RDMA',
    use: 'Training + inference serving',
    rdma: true,
  },
  {
    id: 'vast',
    label: 'VAST Data',
    bw: 500, latency: 0.8, color: '#f97316',
    desc: 'All-NVMe, disaggregated architecture. Shared-everything storage with no RAID overhead. NFS v3/v4 and S3 APIs. Strong random-read performance for transformer model checkpoint restoration.',
    protocol: 'NFS / S3 / RDMA',
    use: 'Checkpoint restore, random read',
    rdma: true,
  },
]

// Map data coords to SVG coords
const BW_MIN = 0, BW_MAX = 700
const LAT_MIN = 0.05, LAT_MAX = 3.5
const PLOT_X = 60, PLOT_Y = 20, PLOT_W = 540, PLOT_H = 200

const mapX = (bw: number) => PLOT_X + ((bw - BW_MIN) / (BW_MAX - BW_MIN)) * PLOT_W
const mapY = (lat: number) => PLOT_Y + PLOT_H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * PLOT_H

export default function StorageOptionComparisonViz() {
  const [active, setActive] = useState<string | null>(null)
  const [showRdmaOnly, setShowRdmaOnly] = useState(false)

  const filtered = showRdmaOnly ? STORAGE_OPTIONS.filter(s => s.rdma) : STORAGE_OPTIONS
  const activeOpt = STORAGE_OPTIONS.find(s => s.id === active)

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 12,
      padding: '20px 24px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0', maxWidth: 680, margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>
        COMPARISON
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#60a5fa', marginBottom: 16 }}>
        AI Factory Storage Options — Bandwidth vs Latency
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setShowRdmaOnly(!showRdmaOnly)} style={{
          padding: '4px 12px', borderRadius: 6, fontSize: 11,
          border: `1px solid ${showRdmaOnly ? '#60a5fa' : '#2a2d3e'}`,
          background: showRdmaOnly ? '#60a5fa20' : '#161928',
          color: showRdmaOnly ? '#60a5fa' : '#7c8db5',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {showRdmaOnly ? '✓ ' : ''}RDMA-capable only
        </button>
        {active && (
          <button onClick={() => setActive(null)} style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 11,
            border: '1px solid #f87171', background: 'transparent',
            color: '#f87171', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Clear
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 8 }}>
      <svg viewBox="0 0 640 260" style={{ width: '100%', minWidth: 640, maxWidth: 640, display: 'block', background: '#0d0f18', borderRadius: 8 }}>
        {/* Grid lines */}
        {[0, 100, 200, 300, 400, 500, 600, 700].map(bw => (
          <g key={bw}>
            <line x1={mapX(bw)} y1={PLOT_Y} x2={mapX(bw)} y2={PLOT_Y + PLOT_H}
              stroke="#2a2d3e" strokeWidth={0.5} strokeDasharray="2,4" />
            <text x={mapX(bw)} y={PLOT_Y + PLOT_H + 14} fill="#4a5568"
              fontSize={8} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
              {bw > 0 ? `${bw}` : '0'}
            </text>
          </g>
        ))}
        {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map(lat => (
          <g key={lat}>
            <line x1={PLOT_X} y1={mapY(lat)} x2={PLOT_X + PLOT_W} y2={mapY(lat)}
              stroke="#2a2d3e" strokeWidth={0.5} strokeDasharray="2,4" />
            <text x={PLOT_X - 6} y={mapY(lat) + 3} fill="#4a5568"
              fontSize={8} fontFamily="'JetBrains Mono',monospace" textAnchor="end">
              {lat}ms
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={PLOT_X + PLOT_W / 2} y={250} fill="#7c8db5"
          fontSize={9} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
          Aggregate Bandwidth (GB/s) →
        </text>
        <text x={12} y={PLOT_Y + PLOT_H / 2} fill="#7c8db5"
          fontSize={9} fontFamily="'JetBrains Mono',monospace" textAnchor="middle"
          transform={`rotate(-90, 12, ${PLOT_Y + PLOT_H / 2})`}>
          Latency →
        </text>

        {/* Ideal zone */}
        <rect x={mapX(300)} y={mapY(1.0)} width={mapX(700) - mapX(300)} height={mapY(0.1) - mapY(1.0)}
          fill="#76e5b508" stroke="#76e5b520" strokeWidth={0.5} rx={4} />
        <text x={mapX(480)} y={mapY(0.25)} fill="#76e5b530"
          fontSize={8} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
          IDEAL ZONE
        </text>

        {/* Data points */}
        {STORAGE_OPTIONS.map(opt => {
          const hidden = showRdmaOnly && !opt.rdma
          const isActive = active === opt.id
          const x = mapX(opt.bw)
          const y = mapY(opt.latency)
          return (
            <g key={opt.id} onClick={() => setActive(isActive ? null : opt.id)}
              style={{ cursor: 'pointer' }} opacity={hidden ? 0.1 : 1}>
              <circle cx={x} cy={y} r={isActive ? 14 : 10}
                fill={`${opt.color}30`} stroke={opt.color}
                strokeWidth={isActive ? 2.5 : 1.5} />
              <text x={x} y={y + 3} fill={opt.color}
                fontSize={7} fontFamily="'JetBrains Mono',monospace" textAnchor="middle" fontWeight={700}>
                {opt.label.split(' ')[0]}
              </text>
              {isActive && (
                <circle cx={x} cy={y} r={20}
                  fill="transparent" stroke={opt.color} strokeWidth={1} opacity={0.3}
                  strokeDasharray="3,3" />
              )}
            </g>
          )
        })}
      </svg>
      </div>

      {activeOpt && (
        <div style={{
          marginTop: 12, background: '#161928',
          border: `1px solid ${activeOpt.color}40`, borderRadius: 8, padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: activeOpt.color }}>{activeOpt.label}</div>
              <div style={{ fontSize: 11, color: '#7c8db5', marginTop: 2 }}>{activeOpt.protocol}</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: '#76e5b5', fontWeight: 700 }}>{activeOpt.bw} GB/s</div>
              <div style={{ fontSize: 11, color: '#7c8db5' }}>{activeOpt.latency} ms · {activeOpt.use}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.7 }}>{activeOpt.desc}</div>
        </div>
      )}

      {!active && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#4a5568' }}>
          Click a point to see storage technology details · Top-right = high bandwidth, low latency
        </div>
      )}
    </div>
  )
}
