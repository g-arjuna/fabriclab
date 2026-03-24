"use client"
import { useState } from "react"

// ── SignalChainViz ───────────────────────────────────────────────────────────
// Step-through of the full RX signal path: fiber → module → demux → DSP →
// SerDes → ASIC/PFE. Click each stage to learn what it does and what fails.

type Stage =
  | "fiber"
  | "module"
  | "demux"
  | "dsp_demod"
  | "dsp_fec"
  | "dsp_cdr"
  | "dsp_eq"
  | "serdes"
  | "pfe"

const stages: {
  id: Stage
  short: string
  label: string
  location: "cable" | "module" | "module_dsp" | "asic"
  description: string
  failureMode: string
  diagnostic: string
  color: string
  border: string
}[] = [
  {
    id: "fiber",
    short: "Fiber/DAC",
    label: "Cable",
    location: "cable",
    description:
      "The physical transmission medium. Optical fiber carries light pulses; copper DAC carries electrical signals. At 400G with PAM-4, signal integrity is highly sensitive to cable quality, bend radius, and connector cleanliness.",
    failureMode:
      "Broken fiber strand, excessive bend, dirty connector, damaged DAC wire. Switch port goes Err-Disabled; NIC still reports Active.",
    diagnostic:
      "ibstat shows Err-Disabled. ethtool -S eth3 may show NIC Active (it cannot see the break). Clean connectors with IEC-approved fiber cleaner.",
    color: "#1e3a5f",
    border: "#38bdf8",
  },
  {
    id: "module",
    short: "Pluggable module",
    label: "OSFP / QSFP-DD transceiver",
    location: "module",
    description:
      "The pluggable transceiver converts between optical signals (photons) and electrical signals (electrons). For incoming traffic, the laser photodetector converts photons to an electrical PAM-4 signal. Contains laser, photodetector, and the DSP on a single module.",
    failureMode:
      "Laser failure (TX side), photodetector degradation (RX side), overheating. Typically causes link down or high symbol error rate.",
    diagnostic:
      "show interface counters shows symbol errors climbing. Replace transceiver (hot-swap). Check if module is seated fully — a partially-seated OSFP is a common failure.",
    color: "#4c1d95",
    border: "#a78bfa",
  },
  {
    id: "demux",
    short: "Demux",
    label: "Demultiplexer",
    location: "module",
    description:
      "Splits the aggregated signal into individual lanes. A 400G OSFP arriving over 4 fibers is split into 4 × 100G electrical lanes. An 800G OSFP is split into 8 × 100G lanes. Each lane feeds a dedicated DSP channel.",
    failureMode:
      "Lane imbalance or partial demux failure causes one or more lanes to show elevated error rates. The link may stay up but operate at degraded speed.",
    diagnostic:
      "ethtool -S eth0 shows per-lane error counters (if driver exposes them). Physical layer PMD counters in UFM can identify which lane is degrading.",
    color: "#14532d",
    border: "#22c55e",
  },
  {
    id: "dsp_demod",
    short: "DSP: Demodulation",
    label: "DSP — Demodulation",
    location: "module_dsp",
    description:
      "Interprets the PAM-4 signal levels on each lane. A PAM-4 signal uses 4 voltage levels (00 / 01 / 10 / 11). The DSP samples the incoming waveform and maps each sample to 2 bits. The eye diagram — the opening between voltage levels — must be clear enough to decode reliably. At 800G, the eye is only picoseconds wide.",
    failureMode:
      "Marginal eye opening due to cable quality or temperature causes increased raw bit error rate before FEC correction.",
    diagnostic:
      "Pre-FEC BER counters in switch (if accessible via vendor CLI) show raw error rate. If pre-FEC BER > 10⁻⁴ on any lane, investigate cable and transceiver.",
    color: "#78350f",
    border: "#f59e0b",
  },
  {
    id: "dsp_fec",
    short: "DSP: FEC",
    label: "DSP — Forward Error Correction",
    location: "module_dsp",
    description:
      "Mandatory at 400G+. The DSP applies RS-FEC (Reed-Solomon) or LDPC codes to correct bit errors before they reach the ASIC. FEC can correct a raw BER of ~10⁻⁴ down to <10⁻¹². Cost: ~100 ns of latency added per hop. On a 4-hop AllReduce path, FEC contributes ~400 ns — small but real.",
    failureMode:
      "FEC correctable errors are normal and expected. Uncorrectable FEC errors (FEC_UNCORR counter) are serious — indicate a link near the point of failure.",
    diagnostic:
      "Monitor FEC_UNCORR counter on switch ports. A non-zero and growing FEC_UNCORR means the link will fail soon. Replace cable or transceiver before it drops.",
    color: "#7f1d1d",
    border: "#ef4444",
  },
  {
    id: "dsp_cdr",
    short: "DSP: CDR",
    label: "DSP — Clock Data Recovery",
    location: "module_dsp",
    description:
      "Extracts timing information from the incoming data stream. At 800G, each bit occupies about 1.25 picoseconds. The CDR circuit must lock to the transmitter's clock (which is slightly different from the receiver's clock) and maintain sample timing with femtosecond precision.",
    failureMode:
      "CDR loss of lock causes burst errors as timing drifts. Can be triggered by extreme temperature changes, power fluctuations, or damaged cable causing phase noise.",
    diagnostic:
      "CDR lock/unlock events appear as link flap events in UFM logs. A port that repeatedly loses CDR lock needs cable or transceiver replacement.",
    color: "#1e3a5f",
    border: "#60a5fa",
  },
  {
    id: "dsp_eq",
    short: "DSP: EQ",
    label: "DSP — Equalization (FFE + DFE)",
    location: "module_dsp",
    description:
      "Compensates for cable-induced signal distortion. Cables attenuate high frequencies more than low frequencies — the signal arrives smeared. FFE (feed-forward equalization) applies a pre-emphasis filter. DFE (decision-feedback equalization) uses past decoded symbols to cancel inter-symbol interference. Together they reopen the eye for clean sampling.",
    failureMode:
      "EQ cannot fully compensate for very long cable runs, excessive bends, or marginal cable specifications. Results in residual ISI and elevated pre-FEC BER.",
    diagnostic:
      "No direct 'EQ failed' counter. Inferred from pre-FEC BER and FEC error rate — if above baseline for the expected cable type and length, suspect EQ margin.",
    color: "#4c1d95",
    border: "#818cf8",
  },
  {
    id: "serdes",
    short: "SerDes",
    label: "SerDes on switch ASIC",
    location: "asic",
    description:
      "Serializer/Deserializer — the boundary between the transceiver and the switch ASIC's internal datapath. Deserializes the DSP output (serial bits) into parallel words that the ASIC can process. The ASIC processes data in 512-bit or 1024-bit words internally; SerDes performs the serial-to-parallel conversion.",
    failureMode:
      "SerDes errors are rare and typically indicate ASIC-level fault or misconfigured speed/FEC settings. Usually results in link training failure (port stays Down).",
    diagnostic:
      "show interface counters: link in training/polling state. Verify FEC mode match between both ends of link (RS-FEC on both sides, or none on both).",
    color: "#14532d",
    border: "#4ade80",
  },
  {
    id: "pfe",
    short: "PFE / ASIC",
    label: "Packet Forwarding Engine",
    location: "asic",
    description:
      "The switch ASIC. Receives clean parallel data from SerDes and processes it as Ethernet or InfiniBand packets: parse headers, look up destination, apply QoS (PFC priorities, ECN marking), and forward to the output port. This is the layer that all chapters above the physical layer assume is receiving clean input.",
    failureMode:
      "By the time data reaches the PFE, physical layer errors should be corrected. If drops occur at the PFE, the cause is typically buffer overflow (congestion) not physical layer issues.",
    diagnostic:
      "show interface counters: output drops > 0 → congestion at PFE. ethtool -S: tx_dropped > 0 → NIC PFE is dropping due to lack of PFC headroom.",
    color: "#1e293b",
    border: "#94a3b8",
  },
]

const locationColors: Record<string, { bg: string; label: string }> = {
  cable: { bg: "#38bdf8", label: "Cable" },
  module: { bg: "#a78bfa", label: "Pluggable module" },
  module_dsp: { bg: "#f59e0b", label: "DSP (inside module)" },
  asic: { bg: "#4ade80", label: "Switch ASIC" },
}

export function SignalChainViz() {
  const [selected, setSelected] = useState<Stage>("dsp_fec")
  const [tab, setTab] = useState<"what" | "fail" | "diag">("what")
  const sel = stages.find(s => s.id === selected)!

  const dspStages = stages.filter(s => s.location === "module_dsp")

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        Signal path — RX: fiber to packet forwarding engine
      </p>
      <p className="mb-5 text-xs text-slate-600">
        Click any stage to explore what it does, how it fails, and how to diagnose it
      </p>

      {/* Location legend */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {Object.entries(locationColors).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: v.bg + "66", border: `1px solid ${v.bg}` }} />
            <span className="text-[9px] text-slate-500">{v.label}</span>
          </div>
        ))}
      </div>

      {/* Flow diagram */}
      <div className="rounded-xl bg-[#060d18] border border-white/8 p-4 mb-5 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {stages.map((stage, i) => {
            const isSelected = stage.id === selected
            const locColor = locationColors[stage.location]

            // Group DSP stages visually
            const isDSP = stage.location === "module_dsp"
            const isFirstDSP = isDSP && stages[i - 1]?.location !== "module_dsp"
            const isLastDSP = isDSP && stages[i + 1]?.location !== "module_dsp"

            return (
              <div key={stage.id} className="flex items-center gap-1">
                {/* DSP bracket start */}
                {isFirstDSP && (
                  <div className="flex flex-col items-center mr-0.5">
                    <span className="text-[8px] text-amber-500 mb-1">DSP functions</span>
                    <div className="h-px w-4 bg-amber-500/40" />
                  </div>
                )}

                <button
                  onClick={() => setSelected(stage.id)}
                  className="flex flex-col items-center gap-1 transition-all"
                >
                  <div
                    className="px-2.5 py-2 rounded-lg text-[10px] font-semibold text-center leading-3 transition-all"
                    style={{
                      backgroundColor: isSelected ? locColor.bg + "33" : "#0f172a",
                      border: `1px solid ${isSelected ? locColor.bg : locColor.bg + "33"}`,
                      color: isSelected ? "#fff" : "#64748b",
                      minWidth: "52px",
                      transform: isSelected ? "scale(1.1)" : "scale(1)",
                      boxShadow: isSelected ? `0 0 12px ${locColor.bg}44` : "none",
                    }}
                  >
                    {stage.short}
                  </div>
                  <div
                    className="h-1 w-full rounded-full"
                    style={{ backgroundColor: isSelected ? locColor.bg : locColor.bg + "22" }}
                  />
                </button>

                {/* Arrow between stages */}
                {i < stages.length - 1 && (
                  <svg width="16" height="12" viewBox="0 0 16 12" className="flex-shrink-0">
                    <path d="M1 6 L12 6 M9 2 L13 6 L9 10" stroke="#334155" strokeWidth="1.5" fill="none" />
                  </svg>
                )}
              </div>
            )
          })}
        </div>

        {/* TX path note */}
        <div className="mt-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-[9px] text-slate-600">TX path is the reverse: PFE → SerDes → DSP (modulate+FEC+EQ) → Mux → module → cable</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>
      </div>

      {/* Detail panel */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: locationColors[sel.location].bg + "11", border: `1px solid ${locationColors[sel.location].bg}33` }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="px-3 py-1 rounded-lg text-xs font-bold"
            style={{ backgroundColor: locationColors[sel.location].bg + "22", color: locationColors[sel.location].bg }}
          >
            {locationColors[sel.location].label}
          </div>
          <span className="text-white font-semibold text-sm">{sel.label}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3">
          {([
            { k: "what" as const, l: "What it does" },
            { k: "fail" as const, l: "How it fails" },
            { k: "diag" as const, l: "Diagnostic" },
          ]).map(t => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className="px-3 py-1 rounded-lg text-[10px] font-medium transition-all"
              style={{
                backgroundColor: tab === t.k ? locationColors[sel.location].bg + "33" : "#0f172a",
                color: tab === t.k ? locationColors[sel.location].bg : "#475569",
                border: `1px solid ${tab === t.k ? locationColors[sel.location].bg + "66" : "#1e293b"}`,
              }}
            >
              {t.l}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-300 leading-5">
          {tab === "what" && sel.description}
          {tab === "fail" && sel.failureMode}
          {tab === "diag" && sel.diagnostic}
        </div>
      </div>

      {/* DSP cost callout */}
      <div className="mt-4 rounded-xl bg-amber-950/30 border border-amber-500/20 p-3">
        <div className="flex items-start gap-3">
          <span className="text-amber-400 text-sm mt-0.5">⚡</span>
          <div>
            <div className="text-xs font-semibold text-amber-400 mb-1">Why the DSP is the cost centre</div>
            <div className="text-[10px] text-slate-400 leading-4">
              DSP silicon = ~20–40% of module bill of materials and ~50% of module power.
              A 64-port 800G switch: 64 × ~7W DSP = ~450W in DSP logic alone.
              This is why CPO and LPO exist — both move DSP out of the pluggable module into the switch ASIC.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignalChainViz
