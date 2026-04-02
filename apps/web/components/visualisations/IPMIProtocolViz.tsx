"use client";

import { useState } from "react";

// IPMIProtocolViz -- IPMI message anatomy and common command reference
// Shows the NetFn/Command structure, transport options, and SDR concept

type Transport = "lan" | "kcs";

const NETFNS = [
  {
    code: "0x00", name: "Chassis", color: "#6366f1",
    commands: [
      { code: "0x01", name: "Get Chassis Status", desc: "Power state, fault indicators, restore policy" },
      { code: "0x02", name: "Chassis Control", desc: "Data: 0x00=off, 0x01=on, 0x02=cycle, 0x03=reset" },
      { code: "0x08", name: "Set System Boot Options", desc: "Override next boot device (PXE, USB, disk)" },
      { code: "0x09", name: "Get System Boot Options", desc: "Read current boot order" },
    ],
  },
  {
    code: "0x04", name: "Sensor/Event", color: "#0ea5e9",
    commands: [
      { code: "0x01", name: "Get Sensor Reading", desc: "Raw reading for one sensor by Sensor Number" },
      { code: "0x27", name: "Get Sensor Threshold", desc: "Upper/lower non-critical, critical, non-recoverable thresholds" },
      { code: "0x25", name: "Get Sensor Event Status", desc: "Which thresholds have been crossed" },
    ],
  },
  {
    code: "0x06", name: "Application", color: "#22c55e",
    commands: [
      { code: "0x01", name: "Get Device ID", desc: "BMC firmware version, manufacturer ID, product ID" },
      { code: "0x02", name: "Cold Reset", desc: "Resets the BMC itself (not the host). Use carefully." },
      { code: "0x04", name: "Get Self Test Results", desc: "BMC internal self-test pass/fail" },
    ],
  },
  {
    code: "0x0A", name: "Storage", color: "#f59e0b",
    commands: [
      { code: "0x20", name: "Get SDR Repository Info", desc: "Number of SDR records, free space, last add timestamp" },
      { code: "0x23", name: "Get SDR", desc: "Fetch one SDR record (sensor definition) by Record ID" },
      { code: "0x40", name: "Get SEL Info", desc: "System Event Log: number of entries, overflow status" },
      { code: "0x43", name: "Get SEL Entry", desc: "Fetch one SEL event record (timestamp + sensor + event type)" },
      { code: "0x47", name: "Clear SEL", desc: "Delete all entries from the event log" },
    ],
  },
  {
    code: "0x2C", name: "DCMI", color: "#a78bfa",
    commands: [
      { code: "0x01", name: "Get DCMI Capabilities", desc: "Data Center Manageability Interface -- platform capabilities" },
      { code: "0x02", name: "Get Power Reading", desc: "Current, min, max, average power draw in watts" },
      { code: "0x06", name: "Get Thermal Limit", desc: "Inlet temperature limit configuration" },
    ],
  },
];

const TRANSPORT_INFO: Record<Transport, { title: string; color: string; port: string; auth: string; desc: string; cmd: string }> = {
  lan: {
    title: "IPMI over LAN (IPMI 2.0)",
    color: "#6366f1",
    port: "UDP 623",
    auth: "RAKP / HMAC-SHA256",
    desc: "Network path from management workstation to BMC 1GbE port. Use -I lanplus for IPMI 2.0 (RAKP auth). Never use -I lan (IPMI 1.5) -- it has known auth bypass vulnerabilities. The BMC decapsulates UDP, processes the IPMI message, and sends a response.",
    cmd: "ipmitool -I lanplus -H 10.0.1.10 -U admin -P pass chassis status",
  },
  kcs: {
    title: "KCS (In-Band, Kernel Interface)",
    color: "#22c55e",
    port: "I/O port 0xCA0",
    auth: "None (local root access required)",
    desc: "The Keyboard Controller Style interface: a small set of x86 I/O ports (0xCA0, 0xCA2) that provide a byte-level channel between the host CPU and the BMC. The kernel ipmi_si driver maps these ports. Used when running ipmitool locally on the DGX host without -H. Fast and does not require network access to the BMC -- useful for scripted health checks in DGX management software.",
    cmd: "ipmitool chassis status  # no -H: uses KCS path automatically",
  },
};

export function IPMIProtocolViz() {
  const [activeNetFn, setActiveNetFn] = useState<string | null>("0x00");
  const [activeCmd, setActiveCmd] = useState<string | null>(null);
  const [transport, setTransport] = useState<Transport>("lan");

  const netfn = NETFNS.find((n) => n.code === activeNetFn);
  const cmd = netfn?.commands.find((c) => c.code === activeCmd);

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 800 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          IPMI Protocol
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          Message Structure and Command Reference
        </div>
      </div>

      {/* Message structure diagram */}
      <div style={{ background: "#1e293b", borderRadius: 10, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10, textTransform: "uppercase" }}>
          IPMI Message Format (over UDP/LAN)
        </div>
        <div style={{ overflowX: "auto", paddingBottom: 4 }}>
          <div style={{ display: "flex", gap: 2, height: 36, borderRadius: 4, overflow: "hidden", minWidth: 520 }}>
            {[
              { label: "Session Hdr", bytes: "10 B", color: "#334155" },
              { label: "Auth Code", bytes: "16 B", color: "#374151" },
              { label: "NetFn (6b) + LUN (2b)", bytes: "1 B", color: "#6366f1" },
              { label: "Checksum 1", bytes: "1 B", color: "#334155" },
              { label: "Command", bytes: "1 B", color: "#0ea5e9" },
              { label: "Data", bytes: "0-N B", color: "#22c55e" },
              { label: "Checksum 2", bytes: "1 B", color: "#334155" },
            ].map((f, i) => (
              <div key={i} style={{
                flex: f.label.includes("Data") ? 3 : f.label.includes("Auth") ? 2 : 1,
                background: f.color,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRight: "1px solid #0f172a",
              }}>
                <div style={{ fontSize: 9, color: "#e2e8f0", fontWeight: 600, textAlign: "center", padding: "0 2px" }}>{f.label}</div>
                <div style={{ fontSize: 8, color: "#94a3b8" }}>{f.bytes}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transport selector */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8, textTransform: "uppercase" }}>Transport</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {(["lan", "kcs"] as Transport[]).map((t) => (
            <button key={t} onClick={() => setTransport(t)} style={{
              padding: "6px 14px", borderRadius: 6,
              border: `1px solid ${transport === t ? TRANSPORT_INFO[t].color : "#334155"}`,
              background: transport === t ? TRANSPORT_INFO[t].color + "22" : "transparent",
              color: transport === t ? TRANSPORT_INFO[t].color : "#64748b",
              cursor: "pointer", fontSize: 11, fontFamily: "monospace", fontWeight: transport === t ? 700 : 400,
            }}>
              {TRANSPORT_INFO[t].title}
            </button>
          ))}
        </div>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px", borderLeft: `3px solid ${TRANSPORT_INFO[transport].color}` }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
            <div style={{ fontSize: 11 }}>
              <span style={{ color: "#475569" }}>Port: </span>
              <span style={{ color: TRANSPORT_INFO[transport].color }}>{TRANSPORT_INFO[transport].port}</span>
            </div>
            <div style={{ fontSize: 11 }}>
              <span style={{ color: "#475569" }}>Auth: </span>
              <span style={{ color: "#94a3b8" }}>{TRANSPORT_INFO[transport].auth}</span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, marginBottom: 8 }}>
            {TRANSPORT_INFO[transport].desc}
          </div>
          <div style={{ background: "#0f172a", borderRadius: 4, padding: "6px 10px", fontSize: 11, color: "#22c55e" }}>
            $ {TRANSPORT_INFO[transport].cmd}
          </div>
        </div>
      </div>

      {/* NetFn / Command explorer */}
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8, textTransform: "uppercase" }}>
        NetFn Categories (click to explore commands)
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {NETFNS.map((n) => (
          <button key={n.code} onClick={() => { setActiveNetFn(n.code); setActiveCmd(null); }} style={{
            padding: "5px 10px", borderRadius: 5,
            border: `1px solid ${activeNetFn === n.code ? n.color : "#334155"}`,
            background: activeNetFn === n.code ? n.color + "22" : "transparent",
            color: activeNetFn === n.code ? n.color : "#64748b",
            cursor: "pointer", fontSize: 11, fontFamily: "monospace", fontWeight: activeNetFn === n.code ? 700 : 400,
          }}>
            {n.code} {n.name}
          </button>
        ))}
      </div>

      {netfn && (
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: netfn.color, fontWeight: 700, marginBottom: 8 }}>
            NetFn {netfn.code} -- {netfn.name} commands
          </div>
          {netfn.commands.map((c) => (
            <div key={c.code} onClick={() => setActiveCmd(activeCmd === c.code ? null : c.code)}
              style={{
                display: "flex", gap: 10, alignItems: "baseline", padding: "6px 8px", borderRadius: 4,
                cursor: "pointer", background: activeCmd === c.code ? "#0f172a" : "transparent",
                marginBottom: 2, borderLeft: `2px solid ${activeCmd === c.code ? netfn.color : "transparent"}`,
              }}>
              <div style={{ fontSize: 11, color: netfn.color, minWidth: 42 }}>{c.code}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "#e2e8f0" }}>{c.name}</div>
                {activeCmd === c.code && (
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{c.desc}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default IPMIProtocolViz;
