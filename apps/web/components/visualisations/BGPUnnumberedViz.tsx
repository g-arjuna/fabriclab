"use client"
import { useState } from "react"

// ── BGPUnnumberedViz ─────────────────────────
// Illustrates eBGP unnumbered (RFC 5549): ICMPv6 ND → BGP session → IPv4 prefix with IPv6 next-hop

const steps = [
  {
    id: 0,
    title: "Physical link up",
    desc: "Leaf1 and Spine1 are cabled. No IPv4 addresses configured on the inter-switch link. Both interfaces have auto-derived IPv6 link-local addresses based on MAC address (EUI-64).",
    leaf: "fe80::leaf1:1 (derived from MAC)",
    spine: "fe80::spine1:1 (derived from MAC)",
    msgType: "none",
    msg: "",
    arrow: false,
  },
  {
    id: 1,
    title: "ICMPv6 Neighbor Solicitation",
    desc: "Leaf1 sends a Neighbor Solicitation to the all-nodes multicast address. This discovers the neighbor's link-local address and MAC — no configuration required.",
    leaf: "Sending: NS to ff02::1",
    spine: "Waiting…",
    msgType: "ns",
    msg: "Neighbor Solicitation\nTarget: fe80::spine1:1\nSrc: fe80::leaf1:1",
    arrow: true,
    dir: "right",
  },
  {
    id: 2,
    title: "ICMPv6 Neighbor Advertisement",
    desc: "Spine1 responds with a Neighbor Advertisement carrying its link-local address and MAC address. Leaf1 learns exactly how to reach Spine1 without any IP configuration.",
    leaf: "Learned: Spine1 = fe80::spine1:1",
    spine: "Sending: NA with MAC + link-local",
    msgType: "na",
    msg: "Neighbor Advertisement\nTarget: fe80::spine1:1\nMAC: 00:1a:2b:3c:4d:5e",
    arrow: true,
    dir: "left",
  },
  {
    id: 3,
    title: "BGP TCP session (IPv6 transport)",
    desc: "The routing daemon on Leaf1 initiates a BGP TCP session to Spine1's link-local address. The BGP Open message includes the Extended Next Hop Encoding capability (RFC 5549) — both sides must agree before IPv4 prefixes can be advertised with an IPv6 next-hop.",
    leaf: "BGP Open → fe80::spine1:1:179",
    spine: "BGP Open ← Extended Next Hop cap",
    msgType: "open",
    msg: "BGP OPEN\nCapability: Extended Next Hop Encoding\nAFI=1 (IPv4) SAFI=1\nNext-hop AFI=2 (IPv6)\nHold time: 90s",
    arrow: true,
    dir: "both",
  },
  {
    id: 4,
    title: "BGP Update: IPv4 prefix, IPv6 next-hop",
    desc: "Spine1 advertises Server5's IPv4 prefix to Leaf1. The NLRI is IPv4 (10.5.0.1/32) but the next-hop attribute is Spine1's IPv6 link-local address. Leaf1 installs this route with the IPv6 next-hop resolved via the ND cache — no IPv4 routing needed on the inter-switch link.",
    leaf: "Installing: 10.5.0.1/32 via fe80::spine1:1",
    spine: "Advertising: 10.5.0.1/32",
    msgType: "update",
    msg: "BGP UPDATE\nNLRI: 10.5.0.1/32 (IPv4)\nNext-hop: fe80::spine1:1 (IPv6)\nAS-PATH: 65001 65004\nOrigin: IGP",
    arrow: true,
    dir: "left",
  },
]

export function BGPUnnumberedViz() {
  const [step, setStep] = useState(0)
  const s = steps[step]

  const msgColors: Record<string, { bg: string; border: string; text: string }> = {
    ns:     { bg: "#1e3a5f", border: "#378ADD", text: "#93c5fd" },
    na:     { bg: "#1e3a5f", border: "#60a5fa", text: "#bfdbfe" },
    open:   { bg: "#14532d", border: "#1D9E75", text: "#86efac" },
    update: { bg: "#3b1f08", border: "#BA7517", text: "#fcd34d" },
    none:   { bg: "#1e293b", border: "#334155", text: "#94a3b8" },
  }
  const mc = msgColors[s.msgType] || msgColors.none

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">eBGP unnumbered (RFC 5549)</div>
      <div className="mb-5 text-xs text-slate-600">Step through how a BGP session forms with no IPv4 link addressing.</div>

      <div className="overflow-x-auto pb-2">
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", marginBottom: 16, minWidth: 460 }}>
        <div style={{ background: "#1e293b", borderRadius: 10, padding: "12px 14px", border: "1px solid #334155" }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#93c5fd", marginBottom: 6 }}>Leaf1</div>
          <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", lineHeight: 1.6 }}>ASN 65001{"\n"}{s.leaf}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 80 }}>
          {s.arrow && (
            <div style={{ fontSize: 20, color: mc.border }}>
              {s.dir === "right" ? "→" : s.dir === "left" ? "←" : "⇄"}
            </div>
          )}
          {!s.arrow && <div style={{ fontSize: 20, color: "#334155" }}>—</div>}
          <div style={{ fontSize: 9, color: "#475569", textAlign: "center" }}>400G link</div>
        </div>

        <div style={{ background: "#1e293b", borderRadius: 10, padding: "12px 14px", border: "1px solid #334155" }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#f97316", marginBottom: 6 }}>Spine1</div>
          <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", lineHeight: 1.6 }}>ASN 65000{"\n"}{s.spine}</div>
        </div>
      </div>
      </div>

      {s.msg && (
        <div style={{ background: mc.bg, border: `1px solid ${mc.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: mc.border, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Message on wire</div>
          <pre style={{ fontSize: 11, color: mc.text, fontFamily: "monospace", margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap", overflowX: "auto" }}>{s.msg}</pre>
        </div>
      )}

      <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#e2e8f0", marginBottom: 4 }}>
          Step {step + 1}/{steps.length} — {s.title}
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{s.desc}</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          style={{ flex: 1, padding: "8px 0", background: "transparent", border: "1px solid #334155", borderRadius: 8, color: step === 0 ? "#334155" : "#94a3b8", fontSize: 13, cursor: step === 0 ? "not-allowed" : "pointer" }}
        >
          ← Previous
        </button>
        <button
          onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
          disabled={step === steps.length - 1}
          style={{ flex: 1, padding: "8px 0", background: "transparent", border: "1px solid #334155", borderRadius: 8, color: step === steps.length - 1 ? "#334155" : "#94a3b8", fontSize: 13, cursor: step === steps.length - 1 ? "not-allowed" : "pointer" }}
        >
          Next →
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            style={{ width: 8, height: 8, borderRadius: "50%", background: i === step ? "#378ADD" : "#334155", border: "none", cursor: "pointer", padding: 0 }}
          />
        ))}
      </div>
    </div>
  )
}

export default BGPUnnumberedViz
