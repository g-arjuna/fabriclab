"use client"
import { useState } from "react"

// -- WiresharkCaptureViz -------------------------
// Renders a fake-but-accurate Wireshark decode tree for GPU packet captures
// Used 6x in Ch16 (captures A-F) -- data-driven via captureId prop

type Field = {
  name: string
  value: string
  bytes?: string
  highlight?: "changed" | "same" | "key" | "warn"
  children?: Field[]
}

type CaptureData = {
  label: string
  location: string
  description: string
  layers: {
    proto: string
    color: string
    summary: string
    fields: Field[]
  }[]
  notes?: string
}

const hexStyle = { fontFamily: "monospace", fontSize: 11 }

const CAPTURES: Record<string, CaptureData> = {
  A: {
    label: "Capture A -- NIC egress (source ConnectX-7)",
    location: "DAC cable between Node A HCA0 and Leaf1 swp1",
    description: "Frame as it leaves the source GPU's NIC. This is the packet as constructed by the ConnectX-7 firmware -- no Ethernet rewrites have occurred yet.",
    layers: [
      {
        proto: "Ethernet II",
        color: "#1e3a5f",
        summary: "Src: Node_A_CX7 -> Dst: Leaf1_swp1_gateway",
        fields: [
          { name: "Destination", value: "aa:bb:cc:11:22:33", bytes: "aa bb cc 11 22 33", highlight: "key", children: [
            { name: "->", value: "Leaf1 swp1 gateway MAC (from ARP cache on HCA0)" }
          ]},
          { name: "Source", value: "94:6d:ae:aa:bb:cc", bytes: "94 6d ae aa bb cc", highlight: "same", children: [
            { name: "->", value: "ConnectX-7 port MAC -- burned-in hardware address" }
          ]},
          { name: "EtherType", value: "0x0800 (IPv4)", bytes: "08 00" },
          { name: "Frame length", value: "~4220 bytes (Ethernet 14 + IPv4 20 + UDP 8 + BTH 12 + RETH 16 + payload + FCS 4; exact payload size depends on MTU configuration -- typically 4096 or 9000 jumbo)" },
        ],
      },
      {
        proto: "Internet Protocol Version 4",
        color: "#14532d",
        summary: "Src: 10.1.1.1 -> Dst: 10.2.1.1  DSCP: 46 (EF)  TTL: 64",
        fields: [
          { name: "Version", value: "4", bytes: "45" },
          { name: "DSCP", value: "46 (Expedited Forwarding)", bytes: "b8", highlight: "key", children: [
            { name: "->", value: "Maps to PFC priority 3 (lossless queue) at both NIC and switch" }
          ]},
          { name: "TTL", value: "64", bytes: "40", highlight: "same" },
          { name: "Protocol", value: "17 (UDP)", bytes: "11" },
          { name: "Source IP", value: "10.1.1.1", bytes: "0a 01 01 01", highlight: "same", children: [
            { name: "->", value: "HCA0 on DGX Node A -- mlx5_0 interface IP" }
          ]},
          { name: "Destination IP", value: "10.2.1.1", bytes: "0a 02 01 01", highlight: "same", children: [
            { name: "->", value: "HCA0 on DGX Node B -- remote GPU's NIC IP" }
          ]},
        ],
      },
      {
        proto: "User Datagram Protocol",
        color: "#3b1f08",
        summary: "Src Port: 49512 -> Dst Port: 4791 (RoCEv2)",
        fields: [
          { name: "Source Port", value: "49512 (0xC168)", bytes: "c1 68", highlight: "key", children: [
            { name: "->", value: "Derived from hash of local QPN -- provides flow entropy for ECMP" }
          ]},
          { name: "Destination Port", value: "4791 (0x12B7)", bytes: "12 b7", highlight: "same", children: [
            { name: "->", value: "Fixed IANA-assigned port for RoCEv2 -- always 4791" }
          ]},
          { name: "Length", value: "4208 bytes", bytes: "10 70" },
          { name: "Checksum", value: "0x0000 (disabled for performance)", bytes: "00 00" },
        ],
      },
      {
        proto: "InfiniBand Base Transport Header (BTH)",
        color: "#4a1b0c",
        summary: "Opcode: RDMA Write First  DstQPN: 0x000042  PSN: 0x001F3A",
        fields: [
          { name: "Opcode", value: "0x06 (RDMA Write First)", bytes: "06", highlight: "key", children: [
            { name: "->", value: "First segment of a multi-packet RDMA Write. Followed by Middle (0x07) and Last (0x08)." }
          ]},
          { name: "Partition Key", value: "0xFFFF (default partition)", bytes: "ff ff" },
          { name: "Destination QPN", value: "0x000042 (66 decimal)", bytes: "00 00 42", highlight: "key", children: [
            { name: "->", value: "Identifies the remote Receive Queue. ECMP hash includes this field when 'show ecmp hash roce' is enabled." }
          ]},
          { name: "Ack Request", value: "0 (not requested on middle packets)", bytes: "00" },
          { name: "Packet Seq Num", value: "0x001F3A (8,506 decimal)", bytes: "00 1f 3a", highlight: "same", children: [
            { name: "->", value: "Monotonically increasing per-QP counter. OOO detection at destination HCA." }
          ]},
        ],
      },
      {
        proto: "RDMA Extended Transport Header (RETH)",
        color: "#26215C",
        summary: "Addr: 0x7f3a00000000  RKEY: 0x00000001  DMALen: 134217728 (128 MB)",
        fields: [
          { name: "Virtual Address", value: "0x7f3a00000000", bytes: "7f 3a 00 00 00 00 00 00", highlight: "key", children: [
            { name: "->", value: "Remote GPU HBM virtual address where payload will be DMA-written" }
          ]},
          { name: "R_Key", value: "0x00000001", bytes: "00 00 00 01", highlight: "key", children: [
            { name: "->", value: "Remote Memory Region capability token -- authorises the write" }
          ]},
          { name: "DMA Length", value: "134217728 (128 MiB total transfer)", bytes: "08 00 00 00" },
        ],
      },
    ],
    notes: "This capture is taken at the optical transceiver output of HCA0 on Node A -- before the frame enters the DAC cable. The Ethernet destination MAC is the leaf switch gateway MAC (learned via ARP on interface bring-up). The source MAC is the HCA's hardware-burned MAC. TTL = 64 -- no hops yet.",
  },
  B: {
    label: "Capture B -- Leaf1 ingress (swp1, server-facing port)",
    location: "Leaf1 mirror port -- server-facing side of swp1",
    description: "Frame arriving at the first leaf switch. Identical to Capture A -- no changes have been made yet. The leaf switch is about to perform an IP route lookup and MAC rewrite.",
    layers: [
      {
        proto: "Ethernet II",
        color: "#1e3a5f",
        summary: "Src: Node_A_CX7 -> Dst: Leaf1_swp1_gateway  [UNCHANGED from A]",
        fields: [
          { name: "Destination", value: "aa:bb:cc:11:22:33", bytes: "aa bb cc 11 22 33", highlight: "same", children: [
            { name: "->", value: "Still Leaf1 swp1 MAC -- frame has just arrived, not yet processed" }
          ]},
          { name: "Source", value: "94:6d:ae:aa:bb:cc", bytes: "94 6d ae aa bb cc", highlight: "same" },
          { name: "EtherType", value: "0x0800 (IPv4)", bytes: "08 00" },
        ],
      },
      {
        proto: "Internet Protocol Version 4",
        color: "#14532d",
        summary: "TTL: 64  DSCP: 46  [UNCHANGED -- lookup not yet performed]",
        fields: [
          { name: "TTL", value: "64 (not yet decremented)", bytes: "40", highlight: "same" },
          { name: "DSCP", value: "46 (EF)", bytes: "b8", highlight: "same" },
          { name: "Source IP", value: "10.1.1.1", bytes: "0a 01 01 01", highlight: "same" },
          { name: "Destination IP", value: "10.2.1.1", bytes: "0a 02 01 01", highlight: "same" },
        ],
      },
      {
        proto: "UDP + BTH (unchanged from A)",
        color: "#3b1f08",
        summary: "Port 49512 -> 4791  QPN: 0x000042  PSN: 0x001F3A",
        fields: [
          { name: "Dst QPN", value: "0x000042 -- ECMP hash computed from this field + 5-tuple", bytes: "00 00 42", highlight: "key" },
          { name: "PSN", value: "0x001F3A", bytes: "00 1f 3a", highlight: "same" },
        ],
      },
    ],
    notes: "Compare to Capture C (leaf egress) to see exactly what the leaf switch rewrites. The IP header and BTH are byte-for-byte identical in both captures. Only the Ethernet header changes.",
  },
  C: {
    label: "Capture C -- Leaf1 egress (swp36, spine-facing uplink)",
    location: "Leaf1 mirror port -- spine-facing side of swp36 (uplink to SpineC)",
    description: "Same frame after Leaf1's L3 lookup and MAC rewrite. The ECMP hash selected uplink swp36 -> SpineC. The Ethernet header has been completely rewritten. The IP header has TTL decremented by 1. Everything above IP is unchanged.",
    layers: [
      {
        proto: "Ethernet II",
        color: "#1e3a5f",
        summary: "Src: Leaf1_swp36 -> Dst: SpineC_swp12  [REWRITTEN by leaf]",
        fields: [
          { name: "Destination", value: "aa:bb:cc:77:88:99", bytes: "aa bb cc 77 88 99", highlight: "changed", children: [
            { name: "->", value: "SpineC swp12 MAC -- next-hop MAC learned from BGP next-hop ARP resolution" },
            { name: "Was:", value: "aa:bb:cc:11:22:33 (Leaf1 gateway MAC in Capture A/B)" },
          ]},
          { name: "Source", value: "aa:bb:cc:44:55:66", bytes: "aa bb cc 44 55 66", highlight: "changed", children: [
            { name: "->", value: "Leaf1 swp36 port MAC" },
            { name: "Was:", value: "94:6d:ae:aa:bb:cc (ConnectX-7 MAC in Capture A/B)" },
          ]},
          { name: "EtherType", value: "0x0800 (IPv4) -- unchanged" },
        ],
      },
      {
        proto: "Internet Protocol Version 4",
        color: "#14532d",
        summary: "TTL: 63  DSCP: 46  [TTL decremented, all else unchanged]",
        fields: [
          { name: "TTL", value: "63 (decremented from 64)", bytes: "3f", highlight: "changed", children: [
            { name: "Was:", value: "64 in Capture A/B" }
          ]},
          { name: "DSCP", value: "46 (EF) -- unchanged", bytes: "b8", highlight: "same" },
          { name: "Source IP", value: "10.1.1.1 -- unchanged", bytes: "0a 01 01 01", highlight: "same" },
          { name: "Destination IP", value: "10.2.1.1 -- unchanged", bytes: "0a 02 01 01", highlight: "same" },
        ],
      },
      {
        proto: "UDP + BTH + RETH",
        color: "#3b1f08",
        summary: "Completely unchanged from Capture A -- all transport headers preserved",
        fields: [
          { name: "Source Port", value: "49512 -- unchanged", bytes: "c1 68", highlight: "same" },
          { name: "Dst QPN", value: "0x000042 -- unchanged", bytes: "00 00 42", highlight: "same" },
          { name: "PSN", value: "0x001F3A -- unchanged", bytes: "00 1f 3a", highlight: "same" },
          { name: "Remote VA", value: "0x7f3a00000000 -- unchanged", bytes: "7f 3a 00 00 00 00 00 00", highlight: "same" },
        ],
      },
    ],
    notes: "KEY INSIGHT: The only fields that changed between Capture B (leaf ingress) and Capture C (leaf egress) are: both Ethernet MAC addresses (complete rewrite) and TTL (decremented by 1). The IP addresses, DSCP, UDP ports, BTH QPair, PSN, and RDMA virtual address are all preserved. This is standard L3 routing -- the leaf behaves exactly like any IP router.",
  },
  D: {
    label: "Capture D -- SpineC transit (ingress from Leaf1)",
    location: "SpineC mirror port -- downlink side of swp12 (facing Leaf1)",
    description: "Frame arriving at the spine transit switch. Two MAC rewrites have occurred (at source NIC, at Leaf1). TTL is 63. The spine will perform another IP lookup and MAC rewrite before forwarding to Leaf4.",
    layers: [
      {
        proto: "Ethernet II",
        color: "#1e3a5f",
        summary: "Src: Leaf1_swp36 -> Dst: SpineC_swp12  [set by Leaf1]",
        fields: [
          { name: "Destination", value: "aa:bb:cc:77:88:99", bytes: "aa bb cc 77 88 99", highlight: "same", children: [
            { name: "->", value: "SpineC swp12 MAC -- this is the switch receiving the frame" }
          ]},
          { name: "Source", value: "aa:bb:cc:44:55:66", bytes: "aa bb cc 44 55 66", highlight: "same", children: [
            { name: "->", value: "Leaf1 swp36 -- the uplink that sent this frame" }
          ]},
        ],
      },
      {
        proto: "Internet Protocol Version 4",
        color: "#14532d",
        summary: "TTL: 63  Src: 10.1.1.1  Dst: 10.2.1.1  [unchanged since Leaf1 egress]",
        fields: [
          { name: "TTL", value: "63", bytes: "3f", highlight: "same" },
          { name: "DSCP", value: "46 (EF)", bytes: "b8", highlight: "same" },
          { name: "Source IP", value: "10.1.1.1", bytes: "0a 01 01 01", highlight: "same" },
          { name: "Destination IP", value: "10.2.1.1", bytes: "0a 02 01 01", highlight: "same" },
        ],
      },
      {
        proto: "UDP + BTH",
        color: "#3b1f08",
        summary: "All transport headers identical to Capture A",
        fields: [
          { name: "Dst QPN", value: "0x000042", bytes: "00 00 42", highlight: "same" },
          { name: "PSN", value: "0x001F3A", bytes: "00 1f 3a", highlight: "same" },
        ],
      },
    ],
    notes: "The spine sees: DSCP 46 -> enqueue in PFC-protected priority 3 queue. IP route lookup on 10.2.1.1 -> next-hop = Leaf4 loopback -> ECMP selects downlink swp8. New MAC rewrite: SpineC swp8 as source, Leaf4 swp36 (spine-facing uplink) as destination. TTL decremented from 63 to 62.",
  },
  E: {
    label: "Capture E -- Destination NIC ingress (Node B ConnectX-7)",
    location: "Mirror on Leaf4 swp1 -- server-facing port of destination DGX Node B",
    description: "Final frame delivery. Three Ethernet rewrites have occurred (source NIC, Leaf1, SpineC). One more rewrite by Leaf4 sets the destination MAC to Node B's ConnectX-7 MAC. TTL = 61. IP/UDP/BTH/RETH completely unchanged from Capture A.",
    layers: [
      {
        proto: "Ethernet II",
        color: "#1e3a5f",
        summary: "Src: Leaf4_swp1_gateway -> Dst: Node_B_CX7  [final delivery]",
        fields: [
          { name: "Destination", value: "94:6d:ae:cc:dd:ee", bytes: "94 6d ae cc dd ee", highlight: "key", children: [
            { name: "->", value: "Destination ConnectX-7 MAC (Node B HCA0) -- the NIC that will process this frame" }
          ]},
          { name: "Source", value: "aa:bb:cc:bb:cc:dd", bytes: "aa bb cc bb cc dd", highlight: "changed", children: [
            { name: "->", value: "Leaf4 swp1 gateway MAC -- the last router in the path" }
          ]},
        ],
      },
      {
        proto: "Internet Protocol Version 4",
        color: "#14532d",
        summary: "TTL: 61 (decremented twice at Leaf1 and SpineC)",
        fields: [
          { name: "TTL", value: "61", bytes: "3d", highlight: "changed", children: [
            { name: "Started:", value: "64 at source NIC. Decremented at Leaf1 (->63), SpineC (->62), Leaf4 (->61)" }
          ]},
          { name: "DSCP", value: "46 (EF) -- unchanged throughout entire path", bytes: "b8", highlight: "same" },
          { name: "Source IP", value: "10.1.1.1 -- unchanged from Capture A", bytes: "0a 01 01 01", highlight: "same" },
          { name: "Destination IP", value: "10.2.1.1 -- unchanged from Capture A", bytes: "0a 02 01 01", highlight: "same" },
        ],
      },
      {
        proto: "UDP + BTH + RETH",
        color: "#3b1f08",
        summary: "Byte-for-byte identical to Capture A -- zero changes across 3 hops",
        fields: [
          { name: "Dst Port", value: "4791 -- unchanged", bytes: "12 b7", highlight: "same" },
          { name: "Dst QPN", value: "0x000042 -- unchanged", bytes: "00 00 42", highlight: "same" },
          { name: "PSN", value: "0x001F3A -- unchanged", bytes: "00 1f 3a", highlight: "same" },
          { name: "Remote VA", value: "0x7f3a00000000 -- unchanged", bytes: "7f 3a 00 00 00 00 00 00", highlight: "same", children: [
            { name: "->", value: "Destination HCA will DMA the payload to this GPU HBM virtual address -- no CPU involvement" }
          ]},
          { name: "R_Key", value: "0x00000001 -- unchanged", bytes: "00 00 00 01", highlight: "same" },
        ],
      },
    ],
    notes: "SUMMARY: Across 5 capture points (A->E), the Ethernet header was rewritten 3 times (Leaf1, SpineC, Leaf4). TTL decremented 3 times (64->61). Everything above the Ethernet header -- IP src/dst, DSCP, UDP ports, BTH QPair, PSN, RDMA virtual address, RKEY -- is byte-for-byte identical from NIC egress to NIC ingress. This is textbook L3 routing applied to RDMA traffic.",
  },
  F: {
    label: "Capture F -- IB frame vs RoCEv2 frame (same RDMA Write)",
    location: "Side-by-side: IB NDR (left) vs RoCEv2 over Ethernet (right)",
    description: "The same 128 MB RDMA Write First packet, over two different fabrics. Left: InfiniBand NDR (ConnectX-7 in IB mode, QM9700 switch). Right: RoCEv2 (ConnectX-7 in Ethernet mode, SN5600 Spectrum-X switch). Fields highlighted in yellow differ between the two.",
    layers: [
      {
        proto: "FABRIC HEADER COMPARISON",
        color: "#26215C",
        summary: "Left = InfiniBand LRH+GRH  vs  Right = Ethernet II + IPv4 + UDP",
        fields: [
          { name: "IB: Local Routing Header (LRH) -- 8 bytes", value: "", highlight: "changed", children: [
            { name: "Destination LID", value: "0x0042 (assigned by Subnet Manager, replaces IP)", bytes: "00 42", highlight: "changed" },
            { name: "Source LID", value: "0x0001 (source port LID)", bytes: "00 01", highlight: "changed" },
            { name: "Virtual Lane", value: "VL3 (lossless, replaces DSCP)", bytes: "03", highlight: "changed" },
            { name: "-> RoCEv2 equivalent", value: "Ethernet II header (14B) + IPv4 header (20B) + UDP (8B) = 42B total overhead vs LRH's 8B" },
          ]},
          { name: "IB: Global Routing Header (GRH) -- 40 bytes", value: "", highlight: "changed", children: [
            { name: "SGID", value: "fe80::1 (source port GID = subnet prefix + GUID)", bytes: "fe 80 ... 00 01", highlight: "changed" },
            { name: "DGID", value: "fe80::42 (destination port GID)", bytes: "fe 80 ... 00 42", highlight: "changed" },
            { name: "-> RoCEv2 equivalent", value: "IPv4 src: 10.1.1.1 / dst: 10.2.1.1 encoded as GID 0::ffff:0a01:0101" },
          ]},
          { name: "BOTH: Base Transport Header (BTH) -- identical", value: "", highlight: "same", children: [
            { name: "Opcode", value: "0x06 (RDMA Write First) -- IDENTICAL", bytes: "06", highlight: "same" },
            { name: "Dst QPN", value: "0x000042 -- IDENTICAL", bytes: "00 00 42", highlight: "same" },
            { name: "PSN", value: "0x001F3A -- IDENTICAL", bytes: "00 1f 3a", highlight: "same" },
          ]},
          { name: "BOTH: RETH header -- identical", value: "", highlight: "same", children: [
            { name: "Remote VA + RKEY + DMA Length -- IDENTICAL in both transports", value: "", highlight: "same" },
          ]},
          { name: "IB: Switch lookup", value: "LFT[DLID=0x0042] = port 8 -> O(1) array lookup, no IP, no ARP", highlight: "changed" },
          { name: "RoCEv2: Switch lookup", value: "IP route 10.2.1.1/32 -> next-hop -> longest-prefix match", highlight: "changed" },
          { name: "IB: MAC rewrite at each hop?", value: "NO -- LRH/GRH preserved end-to-end, no hop-by-hop rewrite", highlight: "changed" },
          { name: "RoCEv2: MAC rewrite at each hop?", value: "YES -- full Ethernet header rewrite at every L3 router", highlight: "changed" },
          { name: "IB: Congestion control", value: "Credit-based per VL/port -- no PFC, no PAUSE frames", highlight: "changed" },
          { name: "RoCEv2: Congestion control", value: "PFC pause frames + ECN marks + DCQCN rate reduction", highlight: "changed" },
        ],
      },
    ],
    notes: "The BTH and RETH are byte-for-byte identical in both captures. The difference is entirely in the headers below the BTH: IB uses 48 bytes of LRH+GRH (with LID addressing, no hop-by-hop rewrite, credit-based FC), while RoCEv2 uses 42 bytes of Ethernet+IP+UDP (with MAC addressing, MAC rewrite at every hop, PFC+ECN congestion control). Same GPU memory semantics, different network plumbing.",
  },
}

type Props = { captureId: string }

function HighlightBadge({ h }: { h?: Field["highlight"] }) {
  if (!h) return null
  const styles: Record<string, React.CSSProperties> = {
    changed: { background: "#3b1f08", color: "#fb923c", border: "1px solid #92400e" },
    same:    { background: "#14532d", color: "#86efac", border: "1px solid #166534" },
    key:     { background: "#0c3260", color: "#93c5fd", border: "1px solid #1e40af" },
    warn:    { background: "#422006", color: "#fbbf24", border: "1px solid #92400e" },
  }
  const labels = { changed: "CHANGED", same: "PRESERVED", key: "KEY FIELD", warn: "CAUTION" }
  return (
    <span style={{ ...styles[h], fontSize: 9, padding: "1px 5px", borderRadius: 3, marginLeft: 6, flexShrink: 0 }}>
      {labels[h]}
    </span>
  )
}

function FieldRow({ f, depth = 0 }: { f: Field; depth?: number }) {
  const [open, setOpen] = useState(false)
  const hasChildren = f.children && f.children.length > 0
  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div
        onClick={() => hasChildren && setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 6px",
          borderRadius: 4,
          cursor: hasChildren ? "pointer" : "default",
          background: hasChildren && open ? "#1e293b" : "transparent",
        }}
      >
        {hasChildren && (
          <span style={{ color: "#475569", fontSize: 10, width: 10, flexShrink: 0 }}>{open ? "v" : ">"}</span>
        )}
        {!hasChildren && <span style={{ width: 10, flexShrink: 0 }} />}
        <span style={{ fontSize: 11, color: "#94a3b8", minWidth: 200, flexShrink: 0 }}>{f.name}</span>
        {f.value && <span style={{ ...hexStyle, color: "#e2e8f0", flex: 1 }}>{f.value}</span>}
        {f.bytes && <span style={{ ...hexStyle, color: "#475569", fontSize: 10 }}>{f.bytes}</span>}
        <HighlightBadge h={f.highlight} />
      </div>
      {open && f.children?.map((c, i) => (
        <FieldRow key={i} f={c} depth={depth + 1} />
      ))}
    </div>
  )
}

export function WiresharkCaptureViz({ captureId }: Props) {
  const data = CAPTURES[captureId]
  const [openLayers, setOpenLayers] = useState<Record<string, boolean>>({ "0": true })
  const [showNotes, setShowNotes] = useState(false)

  if (!data) return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="text-xs text-slate-500">Capture {captureId} not found</div>
    </div>
  )

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">{data.label}</div>
      <div className="mb-1 text-xs text-slate-600">{data.location}</div>
      <div className="mb-4 text-xs text-slate-500">{data.description}</div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {[
          { color: "#3b1f08", border: "#92400e", text: "#fb923c", label: "CHANGED" },
          { color: "#14532d", border: "#166534", text: "#86efac", label: "PRESERVED" },
          { color: "#0c3260", border: "#1e40af", text: "#93c5fd", label: "KEY FIELD" },
        ].map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, background: l.color, border: `1px solid ${l.border}`, borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: "#64748b" }}>{l.label}</span>
          </div>
        ))}
      </div>

      <div style={{ background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 8, padding: "6px 10px", background: "#1e293b", borderBottom: "1px solid #334155" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ fontSize: 11, color: "#64748b", marginLeft: 6 }}>Wireshark -- Capture {captureId}</span>
        </div>

        <div style={{ padding: "8px 0" }}>
          {data.layers.map((layer, li) => (
            <div key={li} style={{ marginBottom: 4 }}>
              <button
                onClick={() => setOpenLayers(prev => ({ ...prev, [String(li)]: !prev[String(li)] }))}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 10px",
                  background: openLayers[String(li)] ? layer.color : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ color: "#94a3b8", fontSize: 10 }}>{openLayers[String(li)] ? "v" : ">"}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#e2e8f0" }}>{layer.proto}</span>
                <span style={{ fontSize: 11, color: "#64748b", flex: 1 }}>{layer.summary}</span>
              </button>
              {openLayers[String(li)] && (
                <div style={{ padding: "4px 0 4px 10px" }}>
                  {layer.fields.map((f, fi) => (
                    <FieldRow key={fi} f={f} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {data.notes && (
        <>
          <button
            onClick={() => setShowNotes(!showNotes)}
            style={{ marginTop: 10, padding: "6px 12px", background: "transparent", border: "1px solid #334155", borderRadius: 6, color: "#64748b", fontSize: 11, cursor: "pointer" }}
          >
            {showNotes ? "Hide" : "Show"} analysis notes
          </button>
          {showNotes && (
            <div style={{ marginTop: 8, background: "#1e293b", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
              {data.notes}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default WiresharkCaptureViz
