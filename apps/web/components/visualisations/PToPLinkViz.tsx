"use client";

import { useState } from "react";

// PToPLinkViz -- P2P link addressing: unnumbered BGP vs numbered /31
// Shows IPv6 link-local EUI-64 generation, BGP session mechanics, and when to use numbered

type LinkMode = "unnumbered" | "numbered";

const EUI64_EXAMPLE = {
  mac: "a0:88:c2:01:02:03",
  step1: "Split: a0:88:c2 | 01:02:03",
  step2: "Insert ff:fe: a0:88:c2:ff:fe:01:02:03",
  step3: "Flip bit 7 of a0: 10100000 -> 10100010 = a2",
  result: "fe80::a288:c2ff:fe01:203",
};

const BGP_UNNUMBERED_FLOW = [
  { step: "1", actor: "leaf-01", action: "Sends ICMPv6 Neighbor Solicitation on swp33", color: "#6366f1" },
  { step: "2", actor: "spine-01", action: "Replies with ICMPv6 Neighbor Advertisement (learns fe80:: address of leaf-01)", color: "#0ea5e9" },
  { step: "3", actor: "spine-01", action: "Sends Router Advertisement with its own fe80:: link-local address", color: "#0ea5e9" },
  { step: "4", actor: "leaf-01", action: "Learns spine-01's fe80:: address -- uses it as BGP neighbor address", color: "#6366f1" },
  { step: "5", actor: "leaf-01", action: "Opens BGP TCP session to spine-01's fe80:: address (RFC 5549)", color: "#22c55e" },
  { step: "6", actor: "both", action: "Exchange BGP OPEN, KEEPALIVE. BGP session established over link-local.", color: "#22c55e" },
  { step: "7", actor: "leaf-01", action: "Advertises IPv4 /32 NLRI (10.10.1.1/32) with IPv6 next-hop (RFC 5549 extension)", color: "#f59e0b" },
  { step: "8", actor: "spine-01", action: "Installs route: 10.10.1.1/32 via fe80::a288... dev swp1 (ECMP-able)", color: "#f59e0b" },
];

export function PToPLinkViz() {
  const [mode, setMode] = useState<LinkMode>("unnumbered");
  const [showEUI64, setShowEUI64] = useState(false);
  const [bgpStep, setBgpStep] = useState<number | null>(null);

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 820 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          P2P Link Addressing
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          BGP Unnumbered vs Numbered /31
        </div>
      </div>

      {/* Mode selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(["unnumbered", "numbered"] as LinkMode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: "7px 18px", borderRadius: 6,
            border: `1px solid ${mode === m ? "#6366f1" : "#334155"}`,
            background: mode === m ? "#6366f122" : "transparent",
            color: mode === m ? "#818cf8" : "#64748b",
            cursor: "pointer", fontSize: 12, fontFamily: "monospace", fontWeight: mode === m ? 700 : 400,
          }}>
            {m === "unnumbered" ? "BGP Unnumbered (RFC 5549)" : "Numbered /31"}
          </button>
        ))}
      </div>

      {mode === "unnumbered" && (
        <>
          {/* Link diagram */}
          <div style={{ background: "#1e293b", borderRadius: 10, padding: 14, marginBottom: 16, overflowX: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: 620 }}>
              <div style={{ background: "#312e81", border: "2px solid #6366f1", borderRadius: 8, padding: "10px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#a5b4fc", fontWeight: 700 }}>leaf-01</div>
                <div style={{ fontSize: 9, color: "#475569" }}>BGP ASN 4200000001</div>
                <div style={{ fontSize: 9, color: "#6366f1", marginTop: 4 }}>swp33</div>
                <div style={{ fontSize: 8, color: "#334155" }}>NO IPv4 address</div>
                <div style={{ fontSize: 8, color: "#6366f1" }}>fe80::a288:c2ff:fe01:203</div>
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 12px" }}>
                <div style={{ height: 3, width: "100%", background: "linear-gradient(90deg, #6366f1, #0ea5e9)", borderRadius: 2 }} />
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 4, textAlign: "center" }}>
                  Physical link -- NO IPv4
                </div>
                <div style={{ fontSize: 9, color: "#22c55e" }}>BGP over fe80:: link-local</div>
                <div style={{ fontSize: 9, color: "#f59e0b" }}>NLRI = IPv4 /32 routes</div>
              </div>

              <div style={{ background: "#0c4a6e", border: "2px solid #0ea5e9", borderRadius: 8, padding: "10px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#7dd3fc", fontWeight: 700 }}>spine-01</div>
                <div style={{ fontSize: 9, color: "#475569" }}>BGP ASN 4200000010</div>
                <div style={{ fontSize: 9, color: "#0ea5e9", marginTop: 4 }}>swp1</div>
                <div style={{ fontSize: 8, color: "#334155" }}>NO IPv4 address</div>
                <div style={{ fontSize: 8, color: "#0ea5e9" }}>fe80::b0d5:e8ff:fe01:405</div>
              </div>
            </div>
          </div>

          {/* EUI-64 explainer */}
          <button onClick={() => setShowEUI64(!showEUI64)} style={{
            padding: "6px 14px", borderRadius: 5, marginBottom: 12,
            border: `1px solid ${showEUI64 ? "#a78bfa" : "#334155"}`,
            background: showEUI64 ? "#a78bfa22" : "transparent",
            color: showEUI64 ? "#c4b5fd" : "#64748b",
            cursor: "pointer", fontSize: 11, fontFamily: "monospace",
          }}>
            {showEUI64 ? "Hide" : "Show"} EUI-64: how fe80:: is generated from MAC
          </button>

          {showEUI64 && (
            <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 14px", marginBottom: 16, borderLeft: "3px solid #a78bfa" }}>
              <div style={{ fontSize: 11, color: "#c4b5fd", fontWeight: 700, marginBottom: 8 }}>EUI-64 MAC to Link-Local Derivation</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Input MAC", value: EUI64_EXAMPLE.mac, color: "#94a3b8" },
                  { label: "Step 1: Split", value: EUI64_EXAMPLE.step1, color: "#94a3b8" },
                  { label: "Step 2: Insert ff:fe", value: EUI64_EXAMPLE.step2, color: "#a78bfa" },
                  { label: "Step 3: Flip bit 7", value: EUI64_EXAMPLE.step3, color: "#f59e0b" },
                  { label: "Result link-local", value: EUI64_EXAMPLE.result, color: "#22c55e" },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                    <div style={{ fontSize: 10, color: "#475569", minWidth: 130 }}>{row.label}</div>
                    <div style={{ fontSize: 11, color: row.color, fontFamily: "monospace", wordBreak: "break-word" }}>{row.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "#475569" }}>
                This fe80:: address is link-scoped -- not routable. BGP uses it only for the peering session.
                The IPv4 prefixes (10.10.x.x/32) are what gets advertised and installed in the routing table.
              </div>
            </div>
          )}

          {/* BGP session flow */}
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 8, textTransform: "uppercase" }}>BGP Unnumbered Session Establishment -- click each step</div>
          {BGP_UNNUMBERED_FLOW.map((step, i) => (
            <div key={i} onClick={() => setBgpStep(bgpStep === i ? null : i)}
              style={{
                display: "flex", gap: 10, padding: "7px 10px", borderRadius: 5, cursor: "pointer",
                background: bgpStep === i ? step.color + "18" : "transparent",
                border: `1px solid ${bgpStep === i ? step.color + "44" : "transparent"}`,
                marginBottom: 3, alignItems: "flex-start",
              }}>
              <div style={{
                minWidth: 20, height: 20, borderRadius: "50%", background: step.color + "33",
                border: `1px solid ${step.color}`, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 9, color: step.color, flexShrink: 0,
              }}>{step.step}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                  <span style={{ fontSize: 10, color: step.color, fontWeight: 700 }}>{step.actor}</span>
                  <span style={{ fontSize: 11, color: bgpStep === i ? "#e2e8f0" : "#94a3b8" }}>{step.action}</span>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {mode === "numbered" && (
        <div>
          {/* /30 vs /31 comparison */}
          <div style={{ background: "#1e293b", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10, textTransform: "uppercase" }}>
              /30 vs /31 for P2P links
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {[
                {
                  label: "/30 (avoid)", color: "#f87171",
                  addrs: ["10.10.5.0  -- network address (UNUSABLE)", "10.10.5.1  -- leaf-01 swp33", "10.10.5.2  -- spine-01 swp1", "10.10.5.3  -- broadcast (UNUSABLE)"],
                  note: "25% address waste. Every /30 loses 2 addresses.",
                },
                {
                  label: "/31 (use this)", color: "#22c55e",
                  addrs: ["10.10.5.0  -- leaf-01 swp33", "10.10.5.1  -- spine-01 swp1"],
                  note: "Zero waste. RFC 3021 standard. All modern equipment supports it.",
                },
              ].map((opt) => (
                <div key={opt.label} style={{ background: "#0f172a", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: opt.color, fontWeight: 700, marginBottom: 8 }}>{opt.label}</div>
                  {opt.addrs.map((a, i) => (
                    <div key={i} style={{ fontSize: 11, color: a.includes("UNUSABLE") ? "#ef444455" : "#94a3b8", marginBottom: 3, fontFamily: "monospace" }}>
                      {a}
                    </div>
                  ))}
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>{opt.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* When to use numbered */}
          <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, marginBottom: 8 }}>When numbered P2P links make sense</div>
            {[
              { trigger: "Troubleshooting", detail: "With a /31 on each link, you can 'ping 10.10.5.1' to test a specific switch-to-switch segment. With unnumbered you must rely on interface counters alone." },
              { trigger: "External BGP peering", detail: "Peering to a corporate border router or upstream transit provider almost always requires a numbered /30 or /31. The external router may not support RFC 5549." },
              { trigger: "Third-party switch compatibility", detail: "Some non-Mellanox or non-Cumulus switches in a mixed-vendor environment may not support BGP unnumbered. Numbered /31 is the safe fallback." },
              { trigger: "Management network links", detail: "The OOB switch never runs BGP unnumbered. All OOB links use standard numbered IPv4 addressing." },
            ].map((item) => (
              <div key={item.trigger} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, minWidth: 160, flexShrink: 0 }}>{item.trigger}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.detail}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Numbered link config (Cumulus NVUE)</div>
              <pre style={{ margin: 0, fontSize: 11, color: "#22c55e", lineHeight: 1.7, overflowX: "auto" }}>{`# On leaf-01: assign /31 to uplink interface
nv set interface swp33 ip address 10.10.5.0/31

# On spine-01: assign far end of same /31
nv set interface swp1 ip address 10.10.5.1/31

# BGP neighbor using numbered address
nv set vrf default router bgp peer 10.10.5.1 remote-as 4200000010
nv config apply`}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default PToPLinkViz;
