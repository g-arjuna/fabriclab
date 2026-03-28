"use client"
import { useState } from "react"

// -- AlternativeNICStackViz -------------------------
// Compares ConnectX-7, Gaudi 3 (integrated), MI300X/Pensando, Slingshot

type Stack = "cx7" | "gaudi3" | "mi300x" | "slingshot"

const stacks = [
  {
    id: "cx7" as Stack,
    name: "ConnectX-7 (NVIDIA)",
    accel: "H100 / H200 / B200",
    color: "#185FA5",
    border: "#378ADD",
    realworld: "NVIDIA DGX H100/H200, most cloud GPU instances (A100/H100)",
    fabric: "RoCEv2 (Spectrum-X) or InfiniBand NDR (QM9700)",
    nicType: "Separate PCIe NIC (full offload)",
    packetPath: "GPU HBM -> NVSwitch -> PCIe -> CX7 ASIC -> OSFP",
    kernelBypass: "Full kernel bypass via libibverbs/GPUDirect RDMA",
    srIov: "Yes -- up to 128 VFs for multi-tenant MIG",
    adaptive: "RSHP per-packet spray + IB per-packet adaptive routing",
    l2Header: "Ethernet II (RoCEv2) or LRH (IB)",
    congestion: "PFC+ECN+DCQCN (RoCEv2) or credit-based (IB)",
    latency: "~0.6us (IB) / ~1.4us (RoCEv2)",
    wiresharkDiff: "Standard Wireshark decodes all headers. RoCEv2 has UDP/IP visible. IB requires ibdump + MFT.",
    change: "Nothing changes in packet format vs reference (this IS the reference)",
  },
  {
    id: "gaudi3" as Stack,
    name: "Gaudi 3 (Intel/Habana)",
    accel: "Gaudi 3 accelerator",
    color: "#0F6E56",
    border: "#1D9E75",
    realworld: "Intel Gaudi clusters, AWS DL2q instances, some EU cloud providers",
    fabric: "100GbE RoCEv2 (standard Ethernet switches: Arista, Juniper)",
    nicType: "Integrated NIC -- 24x 100GbE ports ON the accelerator die",
    packetPath: "Gaudi HBM -> on-die network engine -> 100GbE QSFP28 (no PCIe to separate NIC)",
    kernelBypass: "Partial -- HCCL uses custom verbs-like API, not standard libibverbs",
    srIov: "No SR-IOV (no separate PF/VF model -- NIC is integral to accelerator)",
    adaptive: "Limited -- standard Ethernet ECMP, no RSHP equivalent (different silicon)",
    l2Header: "Ethernet II (identical format to CX7 RoCEv2 packet)",
    congestion: "PFC+ECN (same as CX7 RoCEv2) -- switch-side identical",
    latency: "~2.0-2.5us (100GbE limit, no Spectrum-X optimisations)",
    wiresharkDiff: "Wireshark decode IDENTICAL to CX7 RoCEv2 -- same BTH, same UDP/IP structure. Undetectable at packet level.",
    change: "No GPUDirect Async. No SR-IOV. Each port is 100G vs 400G (24x 100G = 2.4Tbps vs 8x 400G = 3.2Tbps). Different NCCL equivalent (HCCL). Fabric is standard Ethernet -- no Spectrum-X features.",
  },
  {
    id: "mi300x" as Stack,
    name: "MI300X + Pensando Elba",
    accel: "AMD Instinct MI300X",
    color: "#712B13",
    border: "#D85A30",
    realworld: "Microsoft Azure ND MI300X v5, some on-prem AMD AI clusters",
    fabric: "RoCEv2 over standard Ethernet or Spectrum-X",
    nicType: "Separate PCIe NIC (Pensando Elba DPU/SmartNIC)",
    packetPath: "GPU HBM -> ROCm HMM -> PCIe -> Pensando Elba DPDK pipeline -> OSFP",
    kernelBypass: "DPDK-based RDMA (Elba P4 dataplane) -- different path than ConnectX-7",
    srIov: "Yes -- Elba supports SR-IOV but with different VF capacity than CX7",
    adaptive: "Per-packet spray supported but with different MTU/reorder characteristics",
    l2Header: "Ethernet II (identical format -- RoCEv2 is same BTH structure)",
    congestion: "PFC+ECN+DCQCN -- same mechanism, different firmware tuning",
    latency: "~1.8-2.2us (Elba P4 dataplane adds ~400ns vs CX7 ASIC)",
    wiresharkDiff: "Wireshark decode IDENTICAL to CX7 RoCEv2 at packet level. Internal DPDK pipeline differs but not visible on wire.",
    change: "RCCL instead of NCCL. Elba driver `ionic` instead of `mlx5_core`. Different QP capacity limits. Different maximum MR sizes. P4 programmable dataplane -- can be updated in field without new silicon.",
  },
  {
    id: "slingshot" as Stack,
    name: "HPE Slingshot 11",
    accel: "AMD Instinct MI250X (Frontier), Cray Shasta",
    color: "#854F0B",
    border: "#BA7517",
    realworld: "Frontier (Oak Ridge NL -- #1 supercomputer 2022), LUMI, Perlmutter",
    fabric: "Slingshot 11 (proprietary -- NOT standard Ethernet, NOT InfiniBand)",
    nicType: "Cassini NIC (HPE Cray) -- PCIe, integrated Slingshot protocol stack",
    packetPath: "GPU HBM -> PCIe -> Cassini NIC -> Slingshot fabric -> Rosetta ASIC switch",
    kernelBypass: "Full kernel bypass via Cassini driver + libfabric",
    srIov: "Yes -- Cassini supports SR-IOV",
    adaptive: "Adaptive routing per-flow in Rosetta ASIC, credit-based at HW level",
    l2Header: "Ethernet frame + Slingshot extension header (EtherType 0x0801 -- DIFFERENT from standard)",
    congestion: "HRP (Hardware Retry Protocol) credit-based -- NO PFC frames, NO ECN marks",
    latency: "~1.1-1.3us (200G links -- Frontier uses 200G Slingshot, not 400G)",
    wiresharkDiff: "Wireshark CANNOT decode Slingshot frames -- EtherType 0x0801 is unknown. Requires Cray-specific Wireshark plugin. The Slingshot extension header before the IP header is invisible to standard tools.",
    change: "COMPLETELY DIFFERENT: no PFC (credit-based instead), no ECN marks (HRP handles), no DCQCN. Standard Ethernet switch CANNOT forward Slingshot -- requires Rosetta ASIC. Packet format unreadable to standard Wireshark. Uses libfabric not libibverbs.",
  },
]

export function AlternativeNICStackViz() {
  const [sel, setSel] = useState<Stack>("cx7")
  const s = stacks.find((x) => x.id === sel)!

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">Alternative NIC stacks -- what changes in the packet</div>
      <div className="mb-5 text-xs text-slate-600">Select a NIC stack to compare against the CX7 reference.</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
        {stacks.map((st) => (
          <button key={st.id} onClick={() => setSel(st.id)} style={{ background: sel === st.id ? st.color : "#1e293b", border: `1px solid ${sel === st.id ? st.border : "#334155"}`, borderRadius: 10, padding: "10px 12px", textAlign: "left", cursor: "pointer", transition: "all 0.15s" }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: sel === st.id ? "#e2e8f0" : "#94a3b8" }}>{st.name}</div>
            <div style={{ fontSize: 10, color: sel === st.id ? "rgba(255,255,255,0.6)" : "#475569", marginTop: 2 }}>{st.accel}</div>
          </button>
        ))}
      </div>

      <div style={{ background: "#1e293b", borderRadius: 10, padding: "16px" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0", marginBottom: 12 }}>{s.name}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Real-world deployments", value: s.realworld },
            { label: "Fabric", value: s.fabric },
            { label: "NIC type", value: s.nicType },
            { label: "Packet path", value: s.packetPath },
            { label: "Kernel bypass", value: s.kernelBypass },
            { label: "SR-IOV", value: s.srIov },
            { label: "L2 header", value: s.l2Header },
            { label: "Congestion control", value: s.congestion },
            { label: "Latency", value: s.latency },
          ].map((row) => (
            <div key={row.label}>
              <div style={{ fontSize: 10, color: "#64748b" }}>{row.label}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{row.value}</div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #334155", paddingTop: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>Wireshark visibility</div>
          <div style={{ fontSize: 11, color: s.id === "slingshot" ? "#f87171" : "#86efac" }}>{s.wiresharkDiff}</div>
        </div>
        <div style={{ background: "#111827", borderRadius: 8, padding: "10px 14px", borderLeft: `3px solid ${s.border}` }}>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>What changes vs CX7 reference</div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>{s.change}</div>
        </div>
      </div>
    </div>
  )
}

// -- FabricComparisonMatrixViz -------------------------
// Interactive matrix comparing RoCEv2, IB, Slingshot, Gaudi across all dimensions

export function FabricComparisonMatrixViz() {
  const [dim, setDim] = useState("latency")
  const fabrics = ["RoCEv2 + Spectrum-X", "InfiniBand NDR", "Slingshot 11", "Gaudi 3 (100GbE)"]
  const dimensions: Record<string, { label: string; values: { v: string; score: number }[]; note: string }> = {
    latency: { label: "End-to-end latency (2-hop)", values: [{ v: "~1.4-1.8 us", score: 3 }, { v: "~0.6-0.8 us", score: 5 }, { v: "~1.1-1.3 us", score: 4 }, { v: "~2.0-2.5 us", score: 2 }], note: "IB wins due to credit-based FC (no PFC jitter), O(1) LFT lookup, and per-packet adaptive routing eliminating collisions." },
    bandwidth: { label: "Per-node compute fabric BW", values: [{ v: "3.2 Tbps (8x400G)", score: 5 }, { v: "3.2 Tbps (8x400G)", score: 5 }, { v: "~800G (4x200G typical)", score: 3 }, { v: "2.4 Tbps (24x100G)", score: 4 }], note: "CX7 and IB both achieve 3.2Tbps per DGX node. Slingshot Frontier uses 200G links. Gaudi 3 uses 24x100G = 2.4Tbps." },
    multitenancy: { label: "Multi-tenancy support", values: [{ v: "Full EVPN-VXLAN + SR-IOV", score: 5 }, { v: "Limited (IB partitions)", score: 3 }, { v: "Yes (SR-IOV + libfabric)", score: 4 }, { v: "No SR-IOV", score: 1 }], note: "RoCEv2 + Spectrum-X provides the richest multi-tenancy model (EVPN VNIs, GBP, BGP DPF). IB uses partition keys and limited isolation." },
    congestion: { label: "Congestion control quality", values: [{ v: "PFC+ECN+DCQCN (complex)", score: 3 }, { v: "Credit-based (no drops)", score: 5 }, { v: "HRP credit-based", score: 5 }, { v: "PFC+ECN (standard)", score: 3 }], note: "Credit-based FC (IB, Slingshot) is fundamentally better: no PFC storms possible, no head-of-line blocking from paused priority class." },
    operations: { label: "Operational familiarity", values: [{ v: "BGP/Ethernet (familiar)", score: 5 }, { v: "Subnet Manager (specialised)", score: 2 }, { v: "Cray-specific tooling", score: 1 }, { v: "Standard Ethernet", score: 4 }], note: "RoCEv2 on Ethernet uses familiar BGP, Wireshark, standard monitoring. IB requires UFM/SM expertise. Slingshot requires Cray-specific training." },
    scale: { label: "Maximum cluster scale", values: [{ v: "100k+ (standard Ethernet)", score: 5 }, { v: "100k+ (IB routing)", score: 5 }, { v: "100k+ (Frontier: 9,400 nodes)", score: 5 }, { v: "~10k nodes (100G limit)", score: 3 }], note: "All three serious fabrics scale to 100k nodes. Gaudi 3 at 100GbE has bandwidth per node limits that constrain large AllReduce workloads." },
  }
  const d = dimensions[dim]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">Fabric technology comparison matrix</div>
      <div className="mb-5 text-xs text-slate-600">Select a dimension to compare all four fabric technologies.</div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {Object.entries(dimensions).map(([k, v]) => (
          <button key={k} onClick={() => setDim(k)} style={{ padding: "5px 10px", background: dim === k ? "#1e293b" : "transparent", border: `1px solid ${dim === k ? "#475569" : "#334155"}`, borderRadius: 6, color: dim === k ? "#e2e8f0" : "#64748b", fontSize: 11, cursor: "pointer" }}>
            {v.label.split(" ")[0]}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 14 }}>{d.label}</div>
      {d.values.map((val, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#64748b", minWidth: 180 }}>{fabrics[i]}</div>
          <div style={{ flex: 1, height: 20, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(val.score / 5) * 100}%`, background: ["#378ADD", "#D85A30", "#BA7517", "#1D9E75"][i], borderRadius: 4, transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", minWidth: 160, fontFamily: "monospace" }}>{val.v}</div>
        </div>
      ))}
      <div style={{ marginTop: 12, background: "#1e293b", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>{d.note}</div>
    </div>
  )
}

// -- ProductionDebugMapViz -------------------------
// Maps packet fields -> CLI commands that observe them

export function ProductionDebugMapViz() {
  const [layer, setLayer] = useState("nic")
  const map: Record<string, { label: string; items: { field: string; cmd: string; device: string; output: string }[] }> = {
    nic: {
      label: "NIC / HCA layer",
      items: [
        { field: "HCA mode (IB or Ethernet)", cmd: "ibstat mlx5_0 | grep 'Link layer'", device: "DGX host", output: "Link layer: Ethernet" },
        { field: "DSCP->PFC priority mapping", cmd: "mlnx_qos -i mlx5_0 --dscp", device: "DGX host", output: "DSCP 46 -> priority 3 (lossless)" },
        { field: "Active QPs (NCCL in progress)", cmd: "rdma res show qp dev mlx5_0 | grep -c RTS", device: "DGX host", output: "127 (128-GPU ring, 1 per peer)" },
        { field: "PFC pauses received at NIC", cmd: "ethtool -S eth3 | grep rx_prio3_pause", device: "DGX host", output: "rx_prio3_pause_duration: 142000 ns" },
        { field: "Per-priority TX bytes", cmd: "ethtool -S eth3 | grep tx_prio3", device: "DGX host", output: "tx_prio3_bytes: 847392847201" },
      ],
    },
    leaf: {
      label: "Leaf switch layer",
      items: [
        { field: "Route to destination GPU IP", cmd: "show ip route 10.2.1.1", device: "Leaf1", output: "10.2.1.1/32 via SpineA/B/C/D -- 4 ECMP paths" },
        { field: "ECMP hash config (QPair?)", cmd: "show ecmp hash", device: "Leaf1", output: "roce: enabled -- BTH QPair in hash" },
        { field: "ARP entry for destination NIC", cmd: "show arp 10.2.1.1", device: "Leaf4", output: "10.2.1.1 is-at 94:6d:ae:cc:dd:ee via swp1" },
        { field: "DSCP->queue mapping", cmd: "show qos dscp-map", device: "Leaf1", output: "DSCP 46 -> queue 3 (PFC-protected)" },
        { field: "PFC frames sent upstream", cmd: "show interface swp36 counters pfc", device: "Leaf1", output: "Priority 3 pause sent: 2841" },
      ],
    },
    spine: {
      label: "Spine switch layer",
      items: [
        { field: "Per-leaf routing entry", cmd: "show ip route 10.2.0.0/24", device: "SpineC", output: "10.2.0.0/24 via Leaf4 loopback, 4 ECMP" },
        { field: "DLB mode and timer", cmd: "show load-balance dlb", device: "SpineC", output: "Mode: flowlet, Timer: 100us, Active: yes" },
        { field: "Link utilisation balance", cmd: "show interface counters | grep swp", device: "SpineC", output: "swp1:78% swp2:79% swp3:12% <- imbalance!" },
        { field: "GLB heartbeat status", cmd: "show glb status", device: "SpineC", output: "Interval: 20ms, Last: 3ms ago, Quality: good" },
        { field: "BGP next-hop resolution", cmd: "show bgp nexthop 10.0.2.1", device: "SpineC", output: "Resolved via swp1-swp4 (4 paths to Leaf4)" },
      ],
    },
    ib: {
      label: "InfiniBand specific",
      items: [
        { field: "HCA LID (assigned by SM)", cmd: "ibstat mlx5_0 | grep LID", device: "DGX host (IB mode)", output: "LID: 0x0042" },
        { field: "Switch LFT entry", cmd: "ibswitchinfo -D 0 -d 0x0042", device: "IB switch mgmt", output: "LID 0x0042 -> port 8" },
        { field: "Port error counters", cmd: "perfquery -x 0x0042 1", device: "IB switch mgmt", output: "SymbolErrors: 0, LinkDowns: 0" },
        { field: "SM routing algorithm", cmd: "GET /ufmRest/app/network/routing", device: "UFM server", output: "{algorithm: fat_tree, lft_mode: minhop}" },
        { field: "Capture IB packet", cmd: "ibdump -d mlx5_0 -i 1 -o capture.pcap", device: "DGX host", output: "Writes IB packets to pcap (requires MFT)" },
      ],
    },
  }
  const cur = map[layer]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">{"Production CLI -> packet field map"}</div>
      <div className="mb-5 text-xs text-slate-600">Every packet field has a CLI command that exposes it. Select a device layer.</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {Object.entries(map).map(([k, v]) => (
          <button key={k} onClick={() => setLayer(k)} style={{ flex: 1, padding: "7px 6px", background: layer === k ? "#1e293b" : "transparent", border: `1px solid ${layer === k ? "#475569" : "#334155"}`, borderRadius: 8, color: layer === k ? "#e2e8f0" : "#64748b", fontSize: 11, cursor: "pointer" }}>
            {v.label.split(" ")[0]}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {cur.items.map((item) => (
          <div key={item.field} style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: "#64748b", minWidth: 220 }}>{item.field}</div>
              <div style={{ fontSize: 10, color: "#475569" }}>on {item.device}</div>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#378ADD", marginBottom: 4 }}>{item.cmd}</div>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>{"-> "}{item.output}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
