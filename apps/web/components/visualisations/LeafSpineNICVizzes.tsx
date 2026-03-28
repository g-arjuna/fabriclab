"use client"
import { useState } from "react"

// -- LeafSwitchProcessingViz -------------------------
// Shows what a leaf switch does: L2 access port -> L3 IP lookup -> ECMP hash -> MAC rewrite

export function LeafSwitchProcessingViz() {
  const [ecmpField, setEcmpField] = useState<"5tuple" | "bthroque">("bthroque")

  const hashFields = {
    "5tuple": {
      label: "5-tuple only",
      fields: ["src_ip: 10.1.1.1", "dst_ip: 10.2.1.1", "proto: UDP(17)", "src_port: 49512", "dst_port: 4791"],
      problem: "Two AllReduce QPs between same GPU pair have IDENTICAL src_port (both derived from similar QPNs) -> both hash to same spine -> 50% link idle",
      result: "Hash: CRC32(10.1.1.1 | 10.2.1.1 | 17 | 49512 | 4791) = 0x8B42 -> mod 4 = Spine 2",
    },
    "bthroque": {
      label: "5-tuple + BTH QPair",
      fields: ["src_ip: 10.1.1.1", "dst_ip: 10.2.1.1", "proto: UDP(17)", "src_port: 49512", "dst_port: 4791", "BTH.DstQPN: 0x000042 <- extra entropy"],
      problem: "Two AllReduce QPs between same GPU pair: QPN 0x42 -> Spine 1, QPN 0x43 -> Spine 3 -> perfect distribution",
      result: "Hash: CRC32(10.1.1.1 | 10.2.1.1 | 17 | 49512 | 4791 | 0x42) = 0x3F91 -> mod 4 = Spine 0",
    },
  }

  const hc = hashFields[ecmpField]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">{"Leaf switch processing -- L2 access -> L3 route -> ECMP -> MAC rewrite"}</div>
      <div className="mb-5 text-xs text-slate-600">Toggle ECMP hash mode to see how BTH QPair hashing changes spine selection.</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { title: "1. Frame arrives on swp1", desc: "Server-facing L2 access port. Switch reads dst MAC.", detail: "dst MAC = aa:bb:cc:11:22:33 = my own gateway MAC -> this is a routed packet, not switched", color: "#185FA5" },
          { title: "2. IP route lookup", desc: "Strip Ethernet, look up dst IP 10.2.1.1 in route table.", detail: "Route: 10.2.1.0/24 via 10.0.0.X (spine loopbacks), 4 ECMP paths. TTL decremented.", color: "#0F6E56" },
          { title: "3. ECMP hash + MAC rewrite", desc: "Hash selects uplink. New Ethernet header written.", detail: "New src MAC = swp36 port MAC. New dst MAC = selected spine's port MAC. Old MACs gone.", color: "#712B13" },
        ].map((c) => (
          <div key={c.title} style={{ background: "#1e293b", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: c.color, marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>{c.desc}</div>
            <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", lineHeight: 1.5 }}>{c.detail}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#1e293b", borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>ECMP hash configuration</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {(["5tuple", "bthroque"] as const).map((m) => (
            <button key={m} onClick={() => setEcmpField(m)} style={{ flex: 1, padding: "7px 0", background: ecmpField === m ? "#185FA5" : "transparent", border: `1px solid ${ecmpField === m ? "#378ADD" : "#334155"}`, borderRadius: 8, color: ecmpField === m ? "#fff" : "#64748b", fontSize: 11, cursor: "pointer" }}>
              {hashFields[m].label}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>Hash input fields</div>
          {hc.fields.map((f) => (
            <div key={f} style={{ fontSize: 11, fontFamily: "monospace", color: f.includes("BTH") ? "#f59e0b" : "#64748b", marginBottom: 3 }}>  {f}</div>
          ))}
        </div>
        <div style={{ background: "#111827", borderRadius: 6, padding: "8px 12px", marginBottom: 8, fontSize: 11, fontFamily: "monospace", color: "#94a3b8" }}>{hc.result}</div>
        <div style={{ fontSize: 11, color: ecmpField === "5tuple" ? "#f87171" : "#4ade80", lineHeight: 1.5 }}>{hc.problem}</div>
        {ecmpField === "bthroque" && (
          <div style={{ marginTop: 8, fontSize: 10, color: "#475569", fontFamily: "monospace" }}>
            Enable: nv set system forwarding ecmp-hash roce enable
          </div>
        )}
      </div>
    </div>
  )
}

// -- SpineForwardingViz -------------------------
// Shows spine as pure L3: routing table, second ECMP hash, MAC rewrite, DLB operation

export function SpineForwardingViz() {
  const [proto, setProto] = useState<"bgp" | "isis">("bgp")

  const routes = {
    bgp: {
      label: "eBGP routing table",
      entry: `# show ip route 10.2.1.1
B  10.2.1.0/24 [20/0] via 10.0.2.1 (Leaf4 loopback)
   ECMP:
     * swp1 (via Leaf4 downlink-1)
     * swp2 (via Leaf4 downlink-2)
     * swp3 (via Leaf4 downlink-3)
     * swp4 (via Leaf4 downlink-4)`,
      note: "BGP distance 20. Next-hop = Leaf4 loopback (BGP next-hop). Spine only knows Leaf4's subnet -- not individual GPU /32s (in most configs).",
    },
    isis: {
      label: "IS-IS Flex Algo 128 routing table",
      entry: `# show isis route 10.2.1.1 algo 128
I  10.2.1.0/24 [115/delay:3us]
   Metric type: min-delay
   Constraint: max-delay 5us
   Via: swp1 (delay 2us, INCLUDED)
        swp2 (delay 3us, INCLUDED)
        swp3 (delay 8us, EXCLUDED > threshold)
        swp4 (delay 4us, INCLUDED)`,
      note: "IS-IS Flex Algo 128 (low-latency plane). swp3 excluded because its delay measurement (8us) exceeds the 5us constraint. Traffic uses only 3 of 4 downlinks.",
    },
  }

  const r = routes[proto]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">Spine switch -- pure L3 transit forwarding</div>
      <div className="mb-5 text-xs text-slate-600">The spine has no MAC table entries for GPU servers. Every port is a routed interface. Toggle protocol to see how the routing table differs.</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {(["bgp", "isis"] as const).map((p) => (
          <button key={p} onClick={() => setProto(p)} style={{ flex: 1, padding: "8px 0", background: proto === p ? (p === "bgp" ? "#185FA5" : "#712B13") : "transparent", border: `1px solid ${proto === p ? (p === "bgp" ? "#378ADD" : "#D85A30") : "#334155"}`, borderRadius: 8, color: proto === p ? "#fff" : "#64748b", fontSize: 12, cursor: "pointer" }}>
            {p === "bgp" ? "eBGP" : "IS-IS Flex Algo 128"}
          </button>
        ))}
      </div>

      <div style={{ background: "#111827", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>{r.label}</div>
        <pre style={{ fontSize: 11, fontFamily: "monospace", color: "#94a3b8", margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{r.entry}</pre>
      </div>

      <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>{r.note}</div>

      <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "#e2e8f0", marginBottom: 6 }}>Ethernet rewrite at spine egress</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, fontFamily: "monospace" }}>
          <div>
            <div style={{ color: "#64748b", marginBottom: 4 }}>Ingress frame (from Leaf1)</div>
            <div style={{ color: "#94a3b8" }}>dst MAC: SpineC swp12</div>
            <div style={{ color: "#94a3b8" }}>src MAC: Leaf1 swp36</div>
            <div style={{ color: "#4ade80" }}>{"IP: 10.1.1.1 -> 10.2.1.1"}</div>
            <div style={{ color: "#4ade80" }}>TTL: 63</div>
          </div>
          <div>
            <div style={{ color: "#64748b", marginBottom: 4 }}>Egress frame (toward Leaf4)</div>
            <div style={{ color: "#f59e0b" }}>{"dst MAC: Leaf4 swp36 <- rewritten"}</div>
            <div style={{ color: "#f59e0b" }}>{"src MAC: SpineC swp8 <- rewritten"}</div>
            <div style={{ color: "#4ade80" }}>{"IP: 10.1.1.1 -> 10.2.1.1 (unchanged)"}</div>
            <div style={{ color: "#f59e0b" }}>{"TTL: 62 <- decremented"}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// -- DestinationNICDeliveryViz -------------------------
// Shows last-mile delivery: Leaf4 rewrite -> NIC receive pipeline -> DMA -> GPU HBM

export function DestinationNICDeliveryViz() {
  const [stage, setStage] = useState(0)
  const rxStages = [
    { title: "FCS + dst MAC check", detail: "HCA validates FCS (CRC32). Checks dst MAC matches local port MAC (94:6d:ae:cc:dd:ee). Match -> proceed. Mismatch -> silent drop." },
    { title: "Protocol decode", detail: "EtherType 0x0800 -> IPv4. dst IP = 10.2.1.1 = local IP OK. Proto = 17 (UDP). dst UDP port = 4791 -> RoCEv2 OK. Route to RDMA engine." },
    { title: "QP lookup", detail: "Read BTH.DstQPN = 0x000042. Look up in local QP table: QPN 0x42 -> connected QP state (RTS), associated with NCCL's receive buffer. PSN check: expected 0x001F3A, received 0x001F3A -> in-order OK." },
    { title: "RKEY + VA validation", detail: "For RDMA Write: read RETH header. RKEY 0x00000001 -> look up in MR (Memory Region) table. MR 0x01 covers VA range 0x7f3a00000000 -> 0x7f3a07ffffff. Write address is within MR OK. Proceed to DMA." },
    { title: "DMA to GPU HBM", detail: "HCA DMA-writes 4172B payload to physical page corresponding to VA 0x7f3a00000000. Uses IOMMU/SMMU page table registered by NCCL. Data lands in destination GPU HBM. CPU never wakes up. Same DMA engine, same PCIe peer-to-peer path." },
    { title: "Completion posted", detail: "Last packet (opcode RDMA_WRITE_LAST) received. DMA complete. HCA writes Completion Queue Entry (CQE) to CQ ring buffer. NCCL background thread polls CQ, reads CQE, signals GPU kernel: 'receive complete'. GPU AllReduce continues." },
  ]
  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">Destination NIC receive pipeline</div>
      <div className="mb-5 text-xs text-slate-600">6 stages from frame arrival to GPU kernel continuation. Click each stage.</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {rxStages.map((s, i) => (
          <button key={i} onClick={() => setStage(i)} style={{ padding: "6px 10px", background: stage === i ? "#185FA5" : "#1e293b", border: `1px solid ${stage === i ? "#378ADD" : "#334155"}`, borderRadius: 6, color: stage === i ? "#fff" : "#64748b", fontSize: 10, cursor: "pointer" }}>
            {i + 1}. {s.title.split(" ")[0]}
          </button>
        ))}
      </div>
      <div style={{ background: "#1e293b", borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#e2e8f0", marginBottom: 8 }}>Stage {stage + 1}: {rxStages[stage].title}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, fontFamily: "monospace" }}>{rxStages[stage].detail}</div>
      </div>
      <div style={{ marginTop: 12, background: "#0c3260", border: "1px solid #378ADD", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "#93c5fd" }}>
        Full path latency: NIC RX pipeline ~400ns + DMA ~200ns + completion ~100ns = ~700ns at destination (plus ~2-2.5us in-flight time).
      </div>
    </div>
  )
}

// -- IBvsRoCEPacketViz -------------------------
// Side-by-side annotated comparison of IB frame vs RoCEv2 frame

export function IBvsRoCEPacketViz() {
  const [highlight, setHighlight] = useState<string | null>(null)
  const rows = [
    { layer: "Physical", ib: "400G OSFP PAM-4 (NDR)", roce: "400G OSFP PAM-4", diff: false, key: "phy" },
    { layer: "L2 header", ib: "LRH: 8 bytes (LID-based)", roce: "Ethernet II: 14 bytes (MAC-based)", diff: true, key: "l2" },
    { layer: "L2 addressing", ib: "16-bit LID (assigned by SM)", roce: "48-bit MAC (burned-in, ARPed)", diff: true, key: "addr" },
    { layer: "Hop-by-hop rewrite?", ib: "NO -- LID unchanged end-to-end", roce: "YES -- MAC rewritten at every L3 hop", diff: true, key: "rewrite" },
    { layer: "L3 header", ib: "GRH: 40 bytes (optional, SGID/DGID)", roce: "IPv4: 20B + UDP: 8B = 28 bytes", diff: true, key: "l3" },
    { layer: "Switch lookup", ib: "LFT[DLID] = port (O(1) array)", roce: "IP route table (longest-prefix match)", diff: true, key: "lookup" },
    { layer: "Address assignment", ib: "SM assigns LIDs automatically", roce: "Admin configures IPs; ARP discovers MACs", diff: true, key: "assignment" },
    { layer: "Congestion control", ib: "Credit-based (per VL, no PFC frames)", roce: "PFC pause + ECN + DCQCN", diff: true, key: "cc" },
    { layer: "Load balancing", ib: "Per-packet adaptive (congestion-aware)", roce: "ECMP hash (5-tuple + optional QPair)", diff: true, key: "lb" },
    { layer: "OOO handling", ib: "Native IB transport (built-in)", roce: "RSHP reorder buffer (NIC firmware)", diff: true, key: "ooo" },
    { layer: "BTH header", ib: "IDENTICAL -- same QPN, PSN, opcode", roce: "IDENTICAL -- same QPN, PSN, opcode", diff: false, key: "bth" },
    { layer: "RETH header", ib: "IDENTICAL -- same remote VA, RKEY", roce: "IDENTICAL -- same remote VA, RKEY", diff: false, key: "reth" },
    { layer: "Latency (2-hop)", ib: "~0.6-0.8 us", roce: "~1.4-1.8 us", diff: true, key: "lat" },
  ]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">InfiniBand vs RoCEv2 -- field-by-field comparison</div>
      <div className="mb-5 text-xs text-slate-600">Hover a row to highlight. Green rows are identical. Orange rows differ.</div>
      <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #334155" }}>
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr", background: "#1e293b", borderBottom: "1px solid #334155" }}>
          <div style={{ padding: "8px 10px", fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Layer</div>
          <div style={{ padding: "8px 10px", fontSize: 10, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.1em" }}>InfiniBand NDR</div>
          <div style={{ padding: "8px 10px", fontSize: 10, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.1em" }}>RoCEv2 over Ethernet</div>
        </div>
        {rows.map((row) => (
          <div
            key={row.key}
            onMouseEnter={() => setHighlight(row.key)}
            onMouseLeave={() => setHighlight(null)}
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr 1fr",
              borderBottom: "1px solid #1e293b",
              background: highlight === row.key ? "#1e293b" : row.diff ? "transparent" : "#0a2e22",
              transition: "background 0.15s",
            }}
          >
            <div style={{ padding: "7px 10px", fontSize: 11, color: "#64748b" }}>{row.layer}</div>
            <div style={{ padding: "7px 10px", fontSize: 11, color: row.diff ? "#93c5fd" : "#86efac", fontFamily: row.diff ? "inherit" : "monospace" }}>{row.ib}</div>
            <div style={{ padding: "7px 10px", fontSize: 11, color: row.diff ? "#fbbf24" : "#86efac", fontFamily: row.diff ? "inherit" : "monospace" }}>{row.roce}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 10, height: 10, background: "#0a2e22", border: "1px solid #166534", borderRadius: 2 }} />
          <span style={{ fontSize: 10, color: "#64748b" }}>Identical -- BTH and RETH unchanged</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 10, height: 10, background: "transparent", border: "1px solid #334155", borderRadius: 2 }} />
          <span style={{ fontSize: 10, color: "#64748b" }}>Different -- fabric protocol changes this layer</span>
        </div>
      </div>
    </div>
  )
}
