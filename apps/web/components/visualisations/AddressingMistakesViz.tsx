"use client";

import { useState } from "react";

// AddressingMistakesViz -- The 7 common addressing mistakes
// Each mistake shows: what was configured wrong, what symptom appears, how to diagnose, fix

type Severity = "critical" | "high" | "medium";

type Mistake = {
  id: string;
  num: number;
  label: string;
  severity: Severity;
  config: string;
  symptom: string;
  diagnose: string;
  fix: string;
  color: string;
};

const MISTAKES: Mistake[] = [
  {
    id: "overlap",
    num: 1,
    label: "OOB/Compute Range Overlap",
    severity: "critical",
    config: "OOB BMC: 10.0.1.0/24\nCompute fabric: 10.0.0.0/8 (includes 10.0.1.0/24)",
    symptom: "ipmitool hangs. Can SSH to server. Cannot reach BMC. Server has a route to 10.0.1.0 via compute fabric.",
    diagnose: "On DGX host: ip route get 10.0.1.10\nIf it shows 'via [compute switch]' instead of 'via OOB' -- overlap confirmed.",
    fix: "Use entirely separate /16 blocks.\n10.0.x.x = OOB always\n10.10.x.x = Compute always\nNo overlap possible by construction.",
    color: "#ef4444",
  },
  {
    id: "subnet24",
    num: 2,
    label: "/24 Server Subnets Instead of /32 Host Routes",
    severity: "critical",
    config: "DGX-01: 10.10.1.1/24 on eth0\nDGX-02: 10.10.1.2/24 on eth0 (same subnet)\nLeaf-01 has directly connected 10.10.1.0/24",
    symptom: "AllReduce works within one DGX. Fails between DGX nodes. BGP shows no route to remote server IPs. 'ip route' on DGX shows only local connected route.",
    diagnose: "On leaf-01: nv show vrf default router bgp address-family ipv4-unicast route\nIf no /32 host routes appear for server IPs -- they are connected routes, not BGP.",
    fix: "Server interfaces as /32.\n10.10.1.1/32 on DGX-01 eth0.\nLeaf-01 redistributes connected /32 into BGP.\nRemote leaf installs /32 as BGP route.",
    color: "#ef4444",
  },
  {
    id: "vlan_reuse",
    num: 3,
    label: "VLAN ID Reuse Across Fabrics",
    severity: "high",
    config: "Compute leaf: VLAN 10 = GPU traffic\nStorage switch: VLAN 10 = storage management\n(Shared VLAN 10 ID on different physical networks)",
    symptom: "Random cable mistake connects leaf trunk to storage switch. VLAN 10 merges. NVMe-oF connections reset under AllReduce multicast flood. Very hard to diagnose.",
    diagnose: "Check VLAN allocation spreadsheet for VLAN ID conflicts across fabrics.\ncapture on storage switch: tcpdump -i swp1 -nn | grep 'RDMA\\|NCCL'",
    fix: "VLAN 1-99: reserved/infra\nVLAN 100-199: storage fabric\nVLAN 1000-4094: compute/tenants\nNever share a VLAN ID across physically separate switches.",
    color: "#f59e0b",
  },
  {
    id: "no_headroom",
    num: 4,
    label: "Insufficient Headroom in /24",
    severity: "medium",
    config: "BasePOD 1 compute: 10.10.1.0/24 (254 addresses)\n8 DGX x 8 NICs = 64 used\nCluster expanded to 32 DGX: need 256 addresses\n10.10.1.0/24 cannot hold 256 hosts",
    symptom: "30th DGX gets 10.10.2.1 (different /24). BGP aggregate breaks. Monitoring shows split subnet. On-call engineer renumbers half the cluster during a training run.",
    diagnose: "Check address plan: how many DGX nodes can the current /24 hold?\n32 DGX x 8 NICs = 256 addresses = requires /23 minimum (not /24)",
    fix: "Pre-allocate /23 (512 addresses) for server compute IPs per pod.\n10.10.0.0/23 = 512 addresses for pod 1 server IPs\nHalf used at 32 DGX, room to grow to 64 DGX.",
    color: "#f59e0b",
  },
  {
    id: "loopback_dup",
    num: 5,
    label: "Duplicate Loopback (Router-ID Collision)",
    severity: "critical",
    config: "leaf-01 loopback: 10.10.0.1/32\nleaf-02 loopback: 10.10.0.1/32  (copy-paste error)\nBoth advertise 10.10.0.1/32 into BGP",
    symptom: "ECMP table installs two paths to 10.10.0.1/32. UFM topology shows leaf flickering. SNMP polling for leaf-01 sometimes returns leaf-02's counters. Very hard to debug without checking BGP origins.",
    diagnose: "On any spine: nv show vrf default router bgp address-family ipv4-unicast route 10.10.0.1/32\nIf 2 different next-hops both claim the same /32 -- collision confirmed.",
    fix: "Generate loopback assignments from a spreadsheet, never by hand.\nnv show interface lo  # on each switch to confirm uniqueness\nAutomate via Ansible with a pre-flight check before deployment.",
    color: "#ef4444",
  },
  {
    id: "vni_no_convention",
    num: 6,
    label: "VNI Assignment Without Convention",
    severity: "high",
    config: "Tenant 1: VNI 100 (assigned ad-hoc)\nTemp debug: VNI 150 (forgotten)\nPod 2 expansion: VNI 100 assigned again for Tenant 1 Pod 2\nEVPN distributes conflicting MAC-IP bindings",
    symptom: "Tenant 1 traffic randomly arrives in wrong VRF. GPU servers in Tenant 1 get ARP responses from Tenant 2 IPs. Training jobs produce garbage results (cross-tenant data contamination).",
    diagnose: "nv show evpn vni\nLook for duplicate VNI numbers with different VRF/tenant assignments.",
    fix: "VNI = (Pod * 10000) + (Tenant * 100) + Segment\nAny VNI is immediately decodable.\nVNI 10101 = Pod 1, Tenant 1, Segment 1.\nConflicts impossible by construction.",
    color: "#f59e0b",
  },
  {
    id: "no_summary",
    num: 7,
    label: "No Summary Route Plan at SuperPOD Interconnect",
    severity: "medium",
    config: "BasePOD 1: 10.5.1.0/24, 10.8.3.0/24 (ad-hoc)\nBasePOD 2: 10.12.4.0/24, 10.15.7.0/24 (ad-hoc)\nSuper-spine must carry every /32 from both pods",
    symptom: "Super-spine BGP table: 2000+ /32 routes. After super-spine reboot: 4-minute BGP reconvergence. All cross-pod GPU traffic black-holes during reconvergence. Training jobs on both pods fail.",
    diagnose: "On super-spine: nv show vrf default router bgp address-family ipv4-unicast route\nCount: if >100 routes from a single pod -- no summarisation in place.",
    fix: "Pod N compute owns 10.10.(N*10).0/23 from day one.\nSuper-spine carries 2 summaries per pod, not 256 /32s.\nRecongvergence: seconds, not minutes.\nRequires correct addressing from day one -- cannot retrofit easily.",
    color: "#f59e0b",
  },
];

const SEV_COLOR: Record<Severity, string> = { critical: "#ef4444", high: "#f59e0b", medium: "#6366f1" };
const SEV_LABEL: Record<Severity, string> = { critical: "CRITICAL", high: "HIGH", medium: "MEDIUM" };

export function AddressingMistakesViz() {
  const [selected, setSelected] = useState<string | null>("overlap");
  const [tab, setTab] = useState<"config" | "symptom" | "diagnose" | "fix">("symptom");

  const sel = MISTAKES.find((m) => m.id === selected);

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 820 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Common Mistakes
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          7 Addressing Errors That Break at 3am
        </div>
      </div>

      {/* Mistake cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
        {MISTAKES.map((m) => (
          <div
            key={m.id}
            onClick={() => setSelected(selected === m.id ? null : m.id)}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
              borderRadius: 8, cursor: "pointer",
              background: selected === m.id ? "#1e293b" : "#0f172a",
              border: `1px solid ${selected === m.id ? m.color + "55" : "#334155"}`,
              transition: "all 0.15s",
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: 5, background: m.color + "22",
              border: `1px solid ${m.color}`, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 12, color: m.color, fontWeight: 700, flexShrink: 0,
            }}>
              {m.num}
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, color: selected === m.id ? "#e2e8f0" : "#94a3b8" }}>{m.label}</span>
            </div>
            <div style={{
              fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
              background: SEV_COLOR[m.severity] + "22",
              color: SEV_COLOR[m.severity],
            }}>
              {SEV_LABEL[m.severity]}
            </div>
            <div style={{ fontSize: 12, color: "#334155" }}>{selected === m.id ? "v" : ">"}</div>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {sel && (
        <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, borderLeft: `4px solid ${sel.color}` }}>
          <div style={{ fontSize: 14, color: sel.color, fontWeight: 700, marginBottom: 14 }}>
            Mistake {sel.num}: {sel.label}
          </div>

          {/* Tab selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {(["config", "symptom", "diagnose", "fix"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "5px 12px", borderRadius: 5,
                border: `1px solid ${tab === t ? sel.color : "#334155"}`,
                background: tab === t ? sel.color + "22" : "transparent",
                color: tab === t ? sel.color : "#64748b",
                cursor: "pointer", fontSize: 11, fontFamily: "monospace", fontWeight: tab === t ? 700 : 400,
                textTransform: "capitalize",
              }}>
                {t === "config" ? "Bad config" : t === "symptom" ? "Symptom" : t === "diagnose" ? "Diagnose" : "Fix"}
              </button>
            ))}
          </div>

          <div style={{ background: "#0f172a", borderRadius: 7, padding: "10px 14px" }}>
            {tab === "config" && (
              <pre style={{ margin: 0, fontSize: 12, color: "#fca5a5", lineHeight: 1.65 }}>{sel.config}</pre>
            )}
            {tab === "symptom" && (
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>{sel.symptom}</div>
            )}
            {tab === "diagnose" && (
              <pre style={{ margin: 0, fontSize: 11, color: "#fbbf24", lineHeight: 1.65 }}>{sel.diagnose}</pre>
            )}
            {tab === "fix" && (
              <pre style={{ margin: 0, fontSize: 11, color: "#4ade80", lineHeight: 1.65 }}>{sel.fix}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AddressingMistakesViz;
