"use client";

import { useState } from "react";

// OOBSecurityViz -- OOB security: segmentation, authentication hardening, and VLAN separation

type CheckItem = { id: string; label: string; category: string; risk: string; cmd?: string; done: boolean };

const CHECKLIST: CheckItem[] = [
  {
    id: "phy_sep", label: "Physical separation: OOB switch has no uplinks to compute/storage fabric",
    category: "Physical", risk: "Without this, a compute switch fault can propagate to OOB network",
    done: false,
  },
  {
    id: "ip_sep", label: "OOB uses entirely separate RFC 1918 range (no overlap with compute 10.10.x or storage 10.20.x)",
    category: "Routing", risk: "Overlapping ranges cause routing ambiguity and potential misdirection of OOB traffic",
    cmd: "ip route show | grep 10.0.  # on BMC -- should only see OOB range",
    done: false,
  },
  {
    id: "no_route", label: "No route from DGX compute NICs (mlx5_0-7) to OOB BMC subnet 10.0.1.0/24",
    category: "Routing", risk: "A compromised DGX host OS must not be able to reach BMC power controls",
    cmd: "ip route get 10.0.1.10  # on DGX host -- should fail: unreachable",
    done: false,
  },
  {
    id: "change_creds", label: "Default BMC credentials changed on ALL nodes before production",
    category: "Authentication", risk: "Default creds are printed on service tag labels -- trivially enumerable",
    cmd: "ipmitool -I lanplus -H 10.0.1.10 -U admin -P oldpass user set password 2 newpass",
    done: false,
  },
  {
    id: "disable_cipher0", label: "IPMI cipher suite 0 disabled (unauthenticated IPMI)",
    category: "Authentication", risk: "Cipher suite 0 allows IPMI commands without authentication (known CVE)",
    cmd: "ipmitool -I lanplus -H 10.0.1.10 -U admin -P pass lan set 1 cipher_privs .xxxxxxxxxxxxxxx",
    done: false,
  },
  {
    id: "readonly_user", label: "Read-only monitoring user created for Prometheus IPMI exporter",
    category: "Authentication", risk: "Using admin account for monitoring scraping violates least-privilege",
    cmd: "ipmitool ... user priv 3 2  # privilege level 2 = USER (read-only)",
    done: false,
  },
  {
    id: "ssh_mgmtvrf", label: "Switch SSH restricted to mgmt VRF only (not listening on data ports)",
    category: "Switch Hardening", risk: "If SSH listens on data port IPs, a compute network attacker could reach switch config",
    cmd: "nv set service ssh-server default vrf mgmt  # Cumulus NVUE",
    done: false,
  },
  {
    id: "telnet_off", label: "Telnet disabled on all switches",
    category: "Switch Hardening", risk: "Telnet sends credentials in plaintext",
    cmd: "nv set system telnet state disabled  # Cumulus NVUE",
    done: false,
  },
  {
    id: "vlan_sep", label: "BMC VLAN (10) separated from switch management VLAN (20) on OOB switch",
    category: "VLAN", risk: "Without separation, a misconfigured DGX host could reach switch management interfaces",
    cmd: "nv set interface swp1-8 bridge domain br_default access 10  # BMC VLAN",
    done: false,
  },
  {
    id: "jumpserver", label: "Jump server / bastion is only host with access to OOB subnet",
    category: "Access Control", risk: "Direct engineer laptop access to OOB range bypasses logging and MFA",
    done: false,
  },
  {
    id: "redfish_tls", label: "Redfish interface uses valid TLS certificate (not self-signed in production)",
    category: "Authentication", risk: "Self-signed certs enable MITM attacks against firmware update operations",
    done: false,
  },
];

const CATEGORIES = [...new Set(CHECKLIST.map((c) => c.category))];
const CAT_COLORS: Record<string, string> = {
  Physical: "#f59e0b",
  Routing: "#0ea5e9",
  Authentication: "#6366f1",
  "Switch Hardening": "#22c55e",
  VLAN: "#a78bfa",
  "Access Control": "#f87171",
};

export function OOBSecurityViz() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string | null>(null);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = filterCat ? CHECKLIST.filter((c) => c.category === filterCat) : CHECKLIST;
  const pct = Math.round((checked.size / CHECKLIST.length) * 100);

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 800 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>OOB Security</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>Management Network Hardening Checklist</div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontSize: 11, color: "#64748b" }}>Hardening progress</div>
          <div style={{ fontSize: 11, color: pct === 100 ? "#22c55e" : pct > 50 ? "#f59e0b" : "#ef4444" }}>
            {checked.size}/{CHECKLIST.length} ({pct}%)
          </div>
        </div>
        <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 3,
            background: pct === 100 ? "#22c55e" : pct > 50 ? "#f59e0b" : "#ef4444",
            width: `${pct}%`, transition: "width 0.3s",
          }} />
        </div>
      </div>

      {/* Category filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={() => setFilterCat(null)} style={{
          padding: "4px 10px", borderRadius: 4,
          border: `1px solid ${filterCat === null ? "#94a3b8" : "#334155"}`,
          background: filterCat === null ? "#94a3b822" : "transparent",
          color: filterCat === null ? "#94a3b8" : "#475569",
          cursor: "pointer", fontSize: 10, fontFamily: "monospace",
        }}>All</button>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setFilterCat(filterCat === cat ? null : cat)} style={{
            padding: "4px 10px", borderRadius: 4,
            border: `1px solid ${filterCat === cat ? CAT_COLORS[cat] : "#334155"}`,
            background: filterCat === cat ? CAT_COLORS[cat] + "22" : "transparent",
            color: filterCat === cat ? CAT_COLORS[cat] : "#475569",
            cursor: "pointer", fontSize: 10, fontFamily: "monospace",
          }}>{cat}</button>
        ))}
      </div>

      {/* Checklist items */}
      {filtered.map((item) => {
        const isDone = checked.has(item.id);
        const color = CAT_COLORS[item.category];
        return (
          <div key={item.id} style={{
            background: "#1e293b", borderRadius: 7, marginBottom: 6, overflow: "hidden",
            border: `1px solid ${isDone ? color + "44" : "transparent"}`,
          }}>
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px", cursor: "pointer" }}
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}
            >
              {/* Checkbox */}
              <div
                onClick={(e) => { e.stopPropagation(); toggle(item.id); }}
                style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                  border: `2px solid ${isDone ? color : "#334155"}`,
                  background: isDone ? color : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}
              >
                {isDone && <span style={{ color: "#0f172a", fontSize: 12, fontWeight: 900 }}>v</span>}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 9, color: color, fontWeight: 700, padding: "1px 5px", background: color + "22", borderRadius: 3 }}>
                    {item.category}
                  </span>
                  <span style={{ fontSize: 11, color: isDone ? "#475569" : "#94a3b8", textDecoration: isDone ? "line-through" : "none" }}>
                    {item.label}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: 12, color: "#334155" }}>{expanded === item.id ? "v" : ">"}</div>
            </div>

            {expanded === item.id && (
              <div style={{ padding: "0 12px 10px 40px", borderTop: "1px solid #334155" }}>
                <div style={{ marginTop: 8, background: "#7f1d1d22", borderRadius: 5, padding: "6px 10px", borderLeft: `2px solid #ef4444`, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: "#f87171", fontWeight: 700, marginBottom: 2 }}>RISK IF SKIPPED</div>
                  <div style={{ fontSize: 11, color: "#fca5a5" }}>{item.risk}</div>
                </div>
                {item.cmd && (
                  <div style={{ background: "#0f172a", borderRadius: 4, padding: "6px 10px", fontSize: 10, color: "#22c55e" }}>
                    $ {item.cmd}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {pct === 100 && (
        <div style={{ marginTop: 14, background: "#14532d22", borderRadius: 8, padding: "10px 14px", borderLeft: "3px solid #22c55e", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#22c55e", fontWeight: 700 }}>OOB network hardened</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Management plane is segmented, authenticated, and access-controlled.</div>
        </div>
      )}
    </div>
  );
}

export default OOBSecurityViz;
