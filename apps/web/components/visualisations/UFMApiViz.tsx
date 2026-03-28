"use client"
import { useState } from "react"

// ── UFMApiViz ──────────────────────────────────────────────────────────────
// Interactive UFM REST API explorer. Click an endpoint to see its JSON
// response shape, key fields, recommended poll interval, and use case.

type Endpoint = {
  id: string
  method: "GET"
  path: string
  label: string
  interval: string
  purpose: string
  fields: { name: string; type: string; meaning: string }[]
  sampleJson: string
}

const ENDPOINTS: Endpoint[] = [
  {
    id: "version",
    method: "GET",
    path: "/ufmRest/app/ufmVersion",
    label: "Health check",
    interval: "5 min",
    purpose: "Verify UFM is running and get fabric summary. If this call fails, UFM itself has a problem — check the UFM service before investigating any fabric issue.",
    fields: [
      { name: "ufm_release_version", type: "string", meaning: "UFM software version (e.g. 6.15.0)" },
      { name: "number_of_managed_switches", type: "integer", meaning: "Total switches visible to UFM" },
      { name: "number_of_hosts", type: "integer", meaning: "Total HCA endpoints — should match node count × HCAs/node" },
      { name: "sm_state", type: "string", meaning: "Subnet Manager state: Master | Standby | Disabled" },
    ],
    sampleJson: `{
  "ufm_release_version": "6.15.0-16",
  "sm_state": "Master",
  "number_of_managed_switches": 40,
  "number_of_hosts": 256,
  "fabric_health": "Healthy"
}`,
  },
  {
    id: "ports",
    method: "GET",
    path: "/ufmRest/resources/ports",
    label: "Port counters",
    interval: "60–120 s",
    purpose: "All fabric ports with current state and error counters. One call returns the entire fabric. Filter by logical_state != Active to find any non-healthy port instantly.",
    fields: [
      { name: "guid", type: "string", meaning: "Port GUID — unique identifier for one side of a link" },
      { name: "peer_guid", type: "string", meaning: "GUID of the port at the other end of the link" },
      { name: "logical_state", type: "string", meaning: "Active | Down | Init | Armed" },
      { name: "symbol_error", type: "integer", meaning: "Cumulative symbol errors — monitor as rate-of-change, not absolute" },
      { name: "link_error_recovery", type: "integer", meaning: "Link recovery events — non-zero means link is self-healing under stress" },
      { name: "port_rcv_errors", type: "integer", meaning: "Received packets with errors — rising rate indicates physical layer degradation" },
    ],
    sampleJson: `[
  {
    "guid": "0x506b4b0300a1c2d4",
    "peer_guid": "0x248a0703006f1100",
    "logical_state": "Active",
    "physical_state": "LinkUp",
    "speed": "NDR 400Gb/s",
    "symbol_error": 142,
    "link_error_recovery": 0,
    "port_rcv_errors": 0
  },
  ...
]`,
  },
  {
    id: "alarms",
    method: "GET",
    path: "/ufmRest/resources/alarms",
    label: "Active alarms",
    interval: "30 s",
    purpose: "All currently active alarms in the fabric. Empty list = no known issues. Non-empty list tells you what UFM has already detected — always check this before starting a manual investigation.",
    fields: [
      { name: "alarm_type", type: "string", meaning: "E.g. PortDown, BERAlarm, SMFailover — categorises the fault" },
      { name: "severity", type: "string", meaning: "Critical | Major | Minor | Warning" },
      { name: "affected_object", type: "string", meaning: "GUID of the affected port, switch, or host" },
      { name: "description", type: "string", meaning: "Human-readable fault description" },
      { name: "timestamp", type: "string", meaning: "ISO 8601 — when the alarm was raised (NTP-sync essential)" },
    ],
    sampleJson: `[
  {
    "alarm_type": "BERAlarm",
    "severity": "Warning",
    "affected_object": "0x506b4b0300a1c2d4",
    "description": "Bit error rate threshold exceeded on port",
    "timestamp": "2025-11-14T03:47:22Z",
    "alarm_id": 10042
  }
]`,
  },
  {
    id: "events",
    method: "GET",
    path: "/ufmRest/events",
    label: "Event stream",
    interval: "60 s incremental",
    purpose: "Ordered event log — use ?from_event_id= to poll incrementally and avoid re-processing. Feed this into Prometheus via a custom exporter or into a SIEM for audit and correlation.",
    fields: [
      { name: "event_id", type: "integer", meaning: "Monotonically increasing — use as cursor for incremental polling" },
      { name: "type", type: "string", meaning: "Event category: PortStateChange, LinkDown, SMActivation, etc." },
      { name: "object_id", type: "string", meaning: "GUID of the affected object" },
      { name: "description", type: "string", meaning: "Detailed event description" },
      { name: "timestamp", type: "string", meaning: "Event occurrence time — align with Prometheus timestamps for correlation" },
    ],
    sampleJson: `[
  {
    "event_id": 88321,
    "type": "PortStateChange",
    "object_id": "0x506b4b0300a1c2d4",
    "description": "Port changed state from Active to Down",
    "timestamp": "2025-11-14T03:47:18Z"
  },
  {
    "event_id": 88322,
    "type": "PortStateChange",
    "object_id": "0x506b4b0300a1c2d4",
    "description": "Port changed state from Down to Active",
    "timestamp": "2025-11-14T03:47:31Z"
  }
]`,
  },
]

export function UFMApiViz() {
  const [selected, setSelected] = useState<string>("alarms")
  const ep = ENDPOINTS.find(e => e.id === selected)!

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">UFM REST API</p>
      <p className="mb-5 text-xs text-slate-600">
        Click an endpoint to see its response shape, key fields, and recommended polling strategy.
      </p>

      {/* Endpoint selector */}
      <div className="mb-5 flex flex-wrap gap-2">
        {ENDPOINTS.map(e => (
          <button
            key={e.id}
            onClick={() => setSelected(e.id)}
            style={{
              background: selected === e.id ? "#3b82f6" : "transparent",
              color: selected === e.id ? "#fff" : "#94a3b8",
              border: `1px solid ${selected === e.id ? "#3b82f6" : "#334155"}`,
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {e.path.split("/").pop()}
          </button>
        ))}
      </div>

      {/* Main panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left: endpoint info */}
        <div style={{ background: "#0f172a", borderRadius: 12, padding: 16 }}>
          {/* Method + path */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{
              background: "#1d4ed8",
              color: "#bfdbfe",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 4,
              letterSpacing: "0.08em",
            }}>
              {ep.method}
            </span>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#7dd3fc" }}>
              {ep.path}
            </span>
          </div>

          {/* Badge row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ background: "#1e293b", color: "#94a3b8", fontSize: 11, padding: "2px 8px", borderRadius: 4 }}>
              Poll: {ep.interval}
            </span>
            <span style={{ background: "#1e293b", color: "#94a3b8", fontSize: 11, padding: "2px 8px", borderRadius: 4 }}>
              {ep.label}
            </span>
          </div>

          {/* Purpose */}
          <p style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6, marginBottom: 16 }}>
            {ep.purpose}
          </p>

          {/* Fields */}
          <p style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Key response fields
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ep.fields.map(f => (
              <div key={f.name} style={{ background: "#1e293b", borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 2 }}>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#7dd3fc" }}>
                    {f.name}
                  </span>
                  <span style={{ fontSize: 10, color: "#475569" }}>{f.type}</span>
                </div>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{f.meaning}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: sample JSON */}
        <div style={{ background: "#0f172a", borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            Sample response
          </p>
          <pre style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 11,
            color: "#86efac",
            background: "#020617",
            borderRadius: 8,
            padding: 12,
            overflowX: "auto",
            lineHeight: 1.6,
            margin: 0,
          }}>
            {ep.sampleJson}
          </pre>

          {/* Quick reference box */}
          <div style={{ marginTop: 12, background: "#1e293b", borderRadius: 8, padding: 10 }}>
            <p style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              curl example
            </p>
            <pre style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 10,
              color: "#fcd34d",
              margin: 0,
              whiteSpace: "pre-wrap",
            }}>
              {`curl -sk -u admin:pass \\\n  https://ufm-host${ep.path}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UFMApiViz
