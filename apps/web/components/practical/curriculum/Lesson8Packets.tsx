"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { CompletionSummary, PacketSummary, PayloadMemory, WorkRequestSummary } from "./operationVisuals";
import { cx, EvidenceNote, exactValue, FactGrid, SourceExcerpt } from "./visuals";
import { exact, packetLengthBreakdown, rdmaEvidence, type Experiment, type PacketRecord } from "@/lib/practical/rdmaEvidence";

type FieldSelection =
  | "ethernet"
  | "ip"
  | "udp"
  | "opcode"
  | "destination-qpn"
  | "psn"
  | "remote-address"
  | "rkey"
  | "dma-length"
  | "payload"
  | null;

function treeField(packet: PacketRecord, protocol: string, name: string) {
  return packet.protocolTree.find((item) => item.protocol === protocol)?.fields.find((item) => item.name === name)?.value || "—";
}

function endpointForQpn(experiment: Experiment, packet: PacketRecord) {
  const decimal = packet.destinationQpn.decimal;
  if (experiment.endpoints.initiator.qpn.decimal === decimal) return { label: "initiator endpoint", endpoint: experiment.endpoints.initiator };
  if (experiment.endpoints.responder.qpn.decimal === decimal) return { label: "responder endpoint", endpoint: experiment.endpoints.responder };
  return null;
}

function memoryForExact(experiment: Experiment, decimal: string | undefined, key: "rkey" | "address") {
  if (!decimal) return undefined;
  return experiment.memoryRegions.find((region) => key === "rkey" ? region.rkey.decimal === decimal : region.address.decimal === decimal);
}

function experimentLabel(id: Experiment["id"]) {
  if (id === "send-recv") return "SEND/RECEIVE";
  if (id === "write") return "WRITE";
  return "READ";
}

function FieldButton({ selected, onClick, label, value, disabled = false }: { selected: boolean; onClick: () => void; label: string; value: string | number; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "rounded-xl border px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40",
        selected ? "border-cyan-300/60 bg-cyan-300/15" : "border-white/10 bg-slate-950/50 hover:border-white/25",
      )}
    >
      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className="mt-1 block break-all font-mono text-sm text-slate-100">{value}</span>
    </button>
  );
}

function WriteCodePacketCorrelation() {
  const write = rdmaEvidence.experiments.find((item) => item.id === "write")!;
  const wr = write.workRequests.find((item) => item.kind === "rdma-write")!;
  const packet = write.packets.find((item) => item.role === "request")!;
  const source = rdmaEvidence.sources.find((item) => item.path === "python/exp_c_write.py")!;
  const [selected, setSelected] = useState("remote-address");
  const lineText = (line: number) => source.lines.find((item) => item.number === line)?.text || "";
  const rows = [
    {
      id: "operation",
      application: "Requested operation",
      sourceLines: [127, 128],
      workRequest: wr.opcode,
      wire: packet.opcodeName,
      wireFields: ["opcode"],
      relationship: "The application-selected RDMA_WRITE operation appears as the transport opcode in the genuine WRITE request.",
    },
    {
      id: "remote-address",
      application: "Remote address assigned with set_wr_rdma",
      sourceLines: [133],
      workRequest: exact(wr.remoteAddress!),
      wire: `RETH remote address ${exact(packet.reth!.virtualAddress)}`,
      wireFields: ["remote-address"],
      relationship: "The remote virtual address supplied by the application is the memory target carried in RETH.",
    },
    {
      id: "remote-rkey",
      application: "Remote RKEY assigned with set_wr_rdma",
      sourceLines: [133],
      workRequest: exact(wr.remoteRkey!),
      wire: `RETH RKEY ${exact(packet.reth!.rkey)}`,
      wireFields: ["rkey"],
      relationship: "The scoped remote-access key for the registered target region is carried in RETH.",
    },
    {
      id: "length",
      application: "Transfer length in the local memory description",
      sourceLines: [125, 126],
      workRequest: `${wr.byteLength} bytes`,
      wire: `RETH DMA length ${exact(packet.reth!.dmaLength, "decimal")}`,
      wireFields: ["dma-length"],
      relationship: "The SGE length and the WRITE DMA length both describe the amount of application payload data for this transfer. DMA length is not total frame length because headers and transport padding also exist.",
    },
    {
      id: "wr-id",
      application: "WR ID",
      sourceLines: [127],
      workRequest: exact(wr.wrId),
      wire: "No corresponding transmitted BTH/RETH field",
      wireFields: [],
      relationship: "WR ID is local application bookkeeping used to recognize completed work. It is not the Packet Sequence Number and is not transmitted as a matching BTH or RETH field.",
    },
    {
      id: "local-memory",
      application: "Local memory address + LKEY",
      sourceLines: [125, 126],
      workRequest: `${exact(wr.localAddress!)} · LKEY ${exact(wr.localLkey!)}`,
      wire: "No corresponding transmitted BTH/RETH field",
      wireFields: [],
      relationship: "The local address and LKEY tell the initiator provider where to read source bytes. They are local memory metadata, not the remote address and RKEY carried in RETH.",
    },
    {
      id: "qpn-psn",
      application: "Endpoint context",
      sourceLines: [115, 116],
      workRequest: "posted through the writer QP",
      wire: `destination QPN ${exact(packet.destinationQpn)} · PSN ${exact(packet.psn)}`,
      wireFields: ["qpn", "psn"],
      relationship: "The destination QPN identifies the packet's target endpoint. PSN is transport sequencing, not application WR ID.",
    },
  ] as const;
  const active = rows.find((row) => row.id === selected) || rows[0];
  const activeLines = active.sourceLines.map((line) => ({ number: line, text: lineText(line) }));
  const wireRow = (id: string, label: string, value: string | number) => {
    const highlighted = (active.wireFields as readonly string[]).includes(id);
    return (
      <div className={cx("flex justify-between gap-3 rounded px-1.5 py-1", highlighted && "bg-orange-300/15 text-orange-50 shadow-[inset_2px_0_0_rgba(253,186,116,0.8)]")} data-testid={`packet-field-${id}`} data-correlation-highlight={highlighted ? "true" : "false"}>
        <dt>{label}</dt><dd className="break-all text-right">{value}</dd>
      </div>
    );
  };
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-4" data-testid="write-code-packet-correlation">
      <h3 className="font-semibold text-slate-100">Correlate the real WRITE code with the real packet</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">Choose one relationship. The source instruction, runtime Work Request value and captured packet field stay together here; the complete source and packet decoding remain available below for optional inspection.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="group" aria-label="Choose a code-to-packet relationship">
        {rows.map((row) => (
          <button key={row.id} type="button" onClick={() => setSelected(row.id)} aria-pressed={selected === row.id} className={cx("rounded-xl border px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300", selected === row.id ? "border-cyan-300/50 bg-cyan-300/12" : "border-white/10 bg-slate-900/45 hover:border-white/25")} data-testid={`correlation-field-${row.id}`}>
            <span className="block text-xs font-semibold text-slate-100">{row.application}</span>
            <span className="mt-1 block break-words font-mono text-[11px] text-slate-400">WR: {row.workRequest}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-3" data-testid="selected-correlation-chain">
        <div className="mb-3 text-sm font-semibold text-cyan-50">{active.application}</div>
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)_2rem_minmax(0,1fr)] lg:items-center">
          <section className="min-w-0 rounded-xl border border-white/10 bg-slate-950/55 p-3" data-testid="correlation-source-highlight">
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Python source</div>
            <div className="mt-2 space-y-1 font-mono text-xs leading-5 text-cyan-50">
              {activeLines.map((line) => (
                <div key={line.number} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 rounded bg-cyan-300/8 px-1.5 py-1">
                  <span className="select-none text-right text-slate-500">{line.number}</span>
                  <code className="whitespace-pre-wrap break-words">{line.text}</code>
                </div>
              ))}
            </div>
          </section>
          <div className="text-center font-mono text-xl text-cyan-200" aria-hidden="true"><span className="lg:hidden">↓</span><span className="hidden lg:inline">→</span></div>
          <section className="min-w-0 rounded-xl border border-cyan-300/25 bg-cyan-300/8 p-3" data-testid="correlation-wr-highlight">
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-100/80">Application Work Request</div>
            <div className="mt-2 break-words font-mono text-sm text-cyan-50">{active.workRequest}</div>
          </section>
          <div className="text-center font-mono text-xl text-orange-200" aria-hidden="true"><span className="lg:hidden">↓</span><span className="hidden lg:inline">→</span></div>
          <section className="min-w-0 rounded-xl border border-orange-300/25 bg-orange-300/8 p-3" data-testid="correlation-packet-highlight">
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-orange-100/80">Captured packet</div>
            <div className="mt-2 break-words font-mono text-sm text-orange-50">{active.wire}</div>
          </section>
        </div>
        <aside className="mt-3 rounded-xl border border-white/10 bg-slate-950/45 p-3" data-testid="correlation-explanation">
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-100">Selected relationship</div>
          <p className="mt-2 text-sm leading-6 text-slate-300">{active.relationship}</p>
          {active.wireFields.length === 0 ? <p className="mt-2 text-xs leading-5 text-amber-100/85">There is no corresponding transmitted BTH/RETH field for this local identifier.</p> : null}
        </aside>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <details className="rounded-xl border border-white/10 bg-slate-950/40" data-testid="full-write-source-details">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Inspect the complete source excerpt</summary>
          <div className="border-t border-white/8 p-2">
            <SourceExcerpt path="python/exp_c_write.py" start={124} end={140} title="Actual verified WRITE construction and submission" emphasisLines={[...active.sourceLines]} emphasisLabel="The highlighted lines change with the selected relationship.">
              The SGE describes local source memory. <code className="font-mono text-cyan-100">set_wr_rdma</code> supplies remote memory metadata. <code className="font-mono text-cyan-100">qp.post_send(swr)</code> submits the instruction; it does not itself constitute the packet.
            </SourceExcerpt>
          </div>
        </details>
        <details className="rounded-xl border border-orange-300/20 bg-orange-300/5" data-testid="full-write-packet-details">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-orange-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">Inspect the complete captured WRITE fields</summary>
          <div className="border-t border-orange-300/15 p-3">
            <div className="rounded-xl border border-orange-300/20 bg-orange-300/6 p-3" data-testid="correlated-write-wire-fields">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-orange-100">Captured WRITE request · frame {packet.frameNumber}</div>
              <dl className="mt-2 grid gap-1 font-mono text-xs text-orange-50">
                {wireRow("opcode", "BTH opcode", packet.opcodeName)}
                {wireRow("qpn", "destination QPN", exact(packet.destinationQpn))}
                {wireRow("psn", "PSN", exact(packet.psn))}
                {wireRow("remote-address", "RETH address", exact(packet.reth!.virtualAddress))}
                {wireRow("rkey", "RETH RKEY", exact(packet.reth!.rkey))}
                {wireRow("dma-length", "RETH DMA length", exact(packet.reth!.dmaLength, "decimal"))}
              </dl>
            </div>
          </div>
        </details>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">All runtime values come from the validated WRITE evidence bundle. Source-line references are checked against the embedded verified source snapshot.</p>
    </section>
  );
}

function PacketInvestigator({ stage }: { stage: number }) {
  const experiments = rdmaEvidence.experiments.filter((experiment) => experiment.id !== "resources");
  const [experimentId, setExperimentId] = useState<Experiment["id"]>("write");
  const experiment = experiments.find((item) => item.id === experimentId) || experiments[0];
  const [packetId, setPacketId] = useState(experiment.packets[0]?.id || "");
  const [selection, setSelection] = useState<FieldSelection>(null);
  const packet = experiment.packets.find((item) => item.id === packetId) || experiment.packets[0];
  const destinationEndpoint = endpointForQpn(experiment, packet);
  const correlatedWr = experiment.workRequests.find((item) => packet.correlations.workRequestIds.includes(item.id));
  const correlatedCompletion = experiment.completions.find((item) => packet.correlations.completionIds.includes(item.id));
  const rkeyMemory = memoryForExact(experiment, packet.reth?.rkey.decimal, "rkey");
  const addressMemory = memoryForExact(experiment, packet.reth?.virtualAddress.decimal, "address");

  function chooseExperiment(id: Experiment["id"]) {
    const next = experiments.find((item) => item.id === id)!;
    setExperimentId(id);
    setPacketId(next.packets[0]?.id || "");
    setSelection(null);
  }

  const correlationExplanation = useMemo(() => {
    if (!selection) return <p>Select a packet field to connect it to the application and memory evidence it represents.</p>;
    if (selection === "ethernet") return <p>The Ethernet source and destination identify the two data-network interfaces in the reference topology. This is familiar underlay evidence; it does not by itself identify an RDMA operation.</p>;
    if (selection === "ip") return <p>The source and destination IP addresses show which host direction this frame took. Reverse-direction ACK and READ-response packets therefore have different destination endpoint meaning even when the PSN matches the forward request.</p>;
    if (selection === "udp") return <p>RoCEv2 is carried in UDP/IP with destination port 4791. UDP is the transport encapsulation; it is not what supplies RDMA endpoint, memory or completion semantics.</p>;
    if (selection === "psn") return <p>The Packet Sequence Number belongs to reliable RDMA transport sequencing. It is not the application WR ID. Matching PSNs can correlate request and acknowledgement/response behavior, but they are not application completion records.</p>;
    if (selection === "opcode") {
      return (
        <div className="space-y-4">
          <p>The opcode identifies the RDMA transport operation in this packet. The exporter validates its relationship to the application Work Request rather than treating every packet as an independent unexplained artifact.</p>
          {packet.role !== "request" ? <p><strong className="text-slate-100">This is not a new application-issued operation.</strong> It is a reverse-direction transport consequence correlated with the originating Work Request shown below.</p> : null}
          {correlatedWr ? <WorkRequestSummary request={correlatedWr} title={packet.role === "request" ? "Correlated application Work Request" : "Originating application Work Request"} /> : <p>No application Work Request correlation exists for this packet.</p>}
          {experiment.id === "send-recv" ? <SourceExcerpt path="python/exp_b_send_recv.py" start={135} end={143} title="Relevant SEND source" /> : null}
          {experiment.id === "write" ? <SourceExcerpt path="python/exp_c_write.py" start={126} end={139} title="Relevant WRITE source" /> : null}
          {experiment.id === "read" ? <SourceExcerpt path="python/exp_d_read.py" start={113} end={124} title="Relevant READ source" /> : null}
        </div>
      );
    }
    if (selection === "destination-qpn") {
      if (!destinationEndpoint) return <p>The exporter could not correlate this destination QPN with an endpoint in the selected experiment.</p>;
      return (
        <div>
          <p>This packet targets the {destinationEndpoint.label} on {destinationEndpoint.endpoint.host === "hosta" ? "Server A" : "Server B"}. The destination QPN is a wire field; the endpoint resource is application-created state. The correlation is validated because the values match in the reference evidence.</p>
          <dl className="mt-3 grid gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-3 font-mono text-xs text-slate-200">
            <div className="flex justify-between gap-3"><dt>endpoint QPN</dt><dd>{exactValue(destinationEndpoint.endpoint.qpn)}</dd></div>
            <div className="flex justify-between gap-3"><dt>programmed peer QPN</dt><dd>{exactValue(destinationEndpoint.endpoint.destinationQpn)}</dd></div>
            <div className="flex justify-between gap-3"><dt>role</dt><dd>{destinationEndpoint.endpoint.roleName || destinationEndpoint.endpoint.role}</dd></div>
          </dl>
        </div>
      );
    }
    if (selection === "remote-address") {
      return (
        <div className="space-y-4">
          <p>The remote virtual address identifies the registered target memory region{addressMemory ? ` on ${addressMemory.host === "hosta" ? "Server A" : "Server B"}` : ""}. It is meaningful only because the memory was registered and shared beforehand. This field exists in WRITE and READ request packets, not in SEND, ACK or READ-response packets.</p>
          {addressMemory ? (
            <FactGrid facts={[
              { label: "Correlated memory resource", value: addressMemory.id },
              { label: "Host", value: addressMemory.host === "hosta" ? "Server A" : "Server B" },
              { label: "Registered address", value: exactValue(addressMemory.address) },
              { label: "Registered length", value: `${addressMemory.length} bytes` },
            ]} />
          ) : <p>The exporter could not correlate this address with a memory region in the selected experiment.</p>}
        </div>
      );
    }
    if (selection === "rkey") {
      return (
        <div className="space-y-4">
          <p>The RKEY identifies authorized access to the registered remote memory region{rkeyMemory ? ` recorded as ${rkeyMemory.id}` : ""}. It is scoped region authorization, not encryption or general server authentication.</p>
          {rkeyMemory ? (
            <FactGrid facts={[
              { label: "Correlated memory resource", value: rkeyMemory.id },
              { label: "Recorded RKEY", value: exactValue(rkeyMemory.rkey) },
              { label: "Registered address", value: exactValue(rkeyMemory.address) },
              { label: "Registered length", value: `${rkeyMemory.length} bytes` },
            ]} />
          ) : <p>The exporter could not correlate this RKEY with a memory region in the selected experiment.</p>}
        </div>
      );
    }
    if (selection === "dma-length") return <p>The DMA length tells the transport how many bytes of the named memory region the operation concerns. It is not the captured frame length; padding and headers can make those values differ.</p>;
    if (selection === "payload") {
      const lengths = packetLengthBreakdown(packet);
      return <p>The application payload is {lengths.applicationPayloadBytes} bytes. The captured data portion is {lengths.capturedDataBytes} bytes because the Base Transport Header also records {lengths.transportPaddingBytes} padding {lengths.transportPaddingBytes === 1 ? "byte" : "bytes"}. These payload bytes prove what the packet contained; they do not by themselves prove when application memory was inspected or which completion an application observed.</p>;
    }
    return null;
  }, [addressMemory, correlatedWr, destinationEndpoint, experiment.id, packet, rkeyMemory, selection]);

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-slate-950/35 p-4" data-testid="packet-investigator">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-100">Genuine packet investigation</h3>
          <p className="mt-1 text-xs text-slate-500">Select an operation capture, then select packet fields. Values are exported evidence, not hardcoded teaching constants.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choose operation capture">
          {experiments.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => chooseExperiment(item.id)}
              aria-pressed={item.id === experimentId}
              className={cx(
                "rounded-full border px-3 py-1.5 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                item.id === experimentId ? "border-cyan-300/60 bg-cyan-300/12 text-cyan-100" : "border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200",
              )}
            >
              {experimentLabel(item.id)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Captured packets">
        {experiment.packets.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={packet.id === item.id}
            onClick={() => { setPacketId(item.id); setSelection(null); }}
            className={cx(
              "rounded-xl border px-3 py-2 text-left text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
              packet.id === item.id ? "border-orange-300/55 bg-orange-300/12 text-orange-100" : "border-white/10 bg-slate-950/45 text-slate-400 hover:border-white/25 hover:text-slate-200",
            )}
          >
            frame {item.frameNumber} · {item.opcodeName}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-5">
        <div className="space-y-4">
          {stage >= 1 ? (
          <section className="rounded-2xl border border-white/10 bg-slate-900/45 p-4">
            <h4 className="text-sm font-semibold text-slate-200">Familiar Ethernet, IP and UDP headers</h4>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="md:col-span-2"><FieldButton selected={selection === "ethernet"} onClick={() => setSelection("ethernet")} label="Ethernet source → destination" value={`${treeField(packet, "Ethernet II", "Source")} → ${treeField(packet, "Ethernet II", "Destination")}`} /></div>
              <FieldButton selected={selection === "ip"} onClick={() => setSelection("ip")} label="IP source → destination" value={`${packet.sourceIp} → ${packet.destinationIp}`} />
              <FieldButton selected={selection === "udp"} onClick={() => setSelection("udp")} label="UDP destination port" value={packet.udp.destinationPort} />
            </div>
          </section>
          ) : null}

          {stage >= 2 ? (
            <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/6 p-4">
              <h4 className="text-sm font-semibold text-cyan-100">Base Transport Header</h4>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <FieldButton selected={selection === "opcode"} onClick={() => setSelection("opcode")} label="Operation opcode" value={packet.opcodeName} />
                <FieldButton selected={selection === "destination-qpn"} onClick={() => setSelection("destination-qpn")} label="Destination QPN" value={exact(packet.destinationQpn)} />
                <FieldButton selected={selection === "psn"} onClick={() => setSelection("psn")} label="Packet Sequence Number" value={exact(packet.psn)} />
              </div>
            </section>
          ) : null}

          {stage >= 3 ? (
            <section className="rounded-2xl border border-violet-300/20 bg-violet-300/6 p-4">
              <h4 className="text-sm font-semibold text-violet-100">Memory and payload fields for this operation</h4>
              {packet.reth ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <FieldButton selected={selection === "remote-address"} onClick={() => setSelection("remote-address")} label="Remote virtual address" value={exact(packet.reth!.virtualAddress)} />
                  <FieldButton selected={selection === "rkey"} onClick={() => setSelection("rkey")} label="RKEY" value={exact(packet.reth!.rkey)} />
                  <FieldButton selected={selection === "dma-length"} onClick={() => setSelection("dma-length")} label="DMA length" value={exact(packet.reth!.dmaLength, "decimal")} />
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-white/10 bg-slate-950/45 p-3 text-sm leading-6 text-slate-300">This {packet.opcodeName} packet has no RETH. Only the WRITE and READ request packets in these captures carry remote address, RKEY and DMA length fields.</p>
              )}
              {packet.payloadHex ? (
                <div className="mt-3">
                  <FieldButton selected={selection === "payload"} onClick={() => setSelection("payload")} label="Payload" value={packet.payloadText || (packet.payloadHex ? `${packetLengthBreakdown(packet).applicationPayloadBytes} binary bytes` : "no application payload")} />
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="rounded-2xl border border-white/10 bg-slate-900/45 p-4" data-testid="field-correlation">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Selected field correlation</div>
          <div className="mt-3 text-sm leading-6 text-slate-300">{correlationExplanation}</div>
          {stage >= 4 && correlatedCompletion ? <div className="mt-4"><CompletionSummary completion={correlatedCompletion} title="Completion correlated with this packet" /></div> : null}
        </aside>
      </div>
    </section>
  );
}

type InvestigationCase = {
  id: string;
  label: string;
  experiment: Experiment;
  packet: PacketRecord;
};

function investigationCases(): InvestigationCase[] {
  const send = rdmaEvidence.experiments.find((item) => item.id === "send-recv")!;
  const write = rdmaEvidence.experiments.find((item) => item.id === "write")!;
  const read = rdmaEvidence.experiments.find((item) => item.id === "read")!;
  const specs = [
    ["case-1", "Case 1", send, "request"],
    ["case-2", "Case 2", write, "request"],
    ["case-3", "Case 3", read, "request"],
    ["case-4", "Case 4", read, "response"],
    ["case-5", "Case 5", write, "acknowledgement"],
  ] as const;
  return specs.map(([id, label, experiment, role]) => ({
    id,
    label,
    experiment,
    packet: experiment.packets.find((packet) => packet.role === role)!,
  }));
}

function hostLabel(host: string | null | undefined) {
  return host === "hosta" ? "Server A" : host === "hostb" ? "Server B" : "unknown host";
}

type OperationalQuestion = {
  id: string;
  prompt: string;
  options: Array<[string, string]>;
  correct: string;
  explanation: string;
};

type OperationalCase = {
  id: string;
  label: string;
  title: string;
  experiment: Experiment;
  packet: PacketRecord;
  questions: OperationalQuestion[];
  evidence: React.ReactNode;
};

function operationalCases(): OperationalCase[] {
  const sendExperiment = rdmaEvidence.experiments.find((item) => item.id === "send-recv")!;
  const writeExperiment = rdmaEvidence.experiments.find((item) => item.id === "write")!;
  const readExperiment = rdmaEvidence.experiments.find((item) => item.id === "read")!;
  const sendRequest = sendExperiment.packets.find((item) => item.role === "request")!;
  const sendReceiveWr = sendExperiment.workRequests.find((item) => item.kind === "receive")!;
  const sendCompletion = sendExperiment.completions.find((item) => item.host === "hostb")!;
  const writeRequest = writeExperiment.packets.find((item) => item.role === "request")!;
  const writeCompletion = writeExperiment.completions[0];
  const writeMemory = writeExperiment.memoryRegions.find((item) => item.host === "hostb")!;
  const writeAfter = writeMemory.snapshots.find((item) => item.id.includes("after"))?.text;
  const readRequest = readExperiment.packets.find((item) => item.role === "request")!;
  const readResponse = readExperiment.packets.find((item) => item.role === "response")!;
  const readWr = readExperiment.workRequests.find((item) => item.kind === "rdma-read")!;
  const readCompletion = readExperiment.completions[0];
  return [
    {
      id: "send-landing",
      label: "Investigation A",
      title: "Where did this SEND land?",
      experiment: sendExperiment,
      packet: sendRequest,
      questions: [
        {
          id: "destination-in-packet",
          prompt: "Can the destination virtual address be determined from this SEND packet alone?",
          options: [["yes", "Yes — the packet names it"], ["no", "No — the packet does not name it"]],
          correct: "no",
          explanation: "This SEND packet has no RETH remote-memory fields. In SEND/RECEIVE the sender does not choose the destination virtual address; the receiving endpoint uses its posted receive work locally.",
        },
        {
          id: "landing-resource",
          prompt: "What application resource determines where the bytes are placed?",
          options: [["receive-wr", "The target's posted Receive Work Request"], ["writer-cq", "The sender Completion Queue"], ["udp", "The UDP destination port"]],
          correct: "receive-wr",
          explanation: "The posted Receive Work Request supplies the local memory description consumed by the incoming SEND. UDP 4791 only identifies RoCEv2 encapsulation, and the sender CQ reports sender-local completion.",
        },
        {
          id: "success-evidence",
          prompt: "What evidence establishes that the receiving application obtained the expected data?",
          options: [["capture-only", "The captured SEND packet alone"], ["ack-only", "The reverse transport ACK alone"], ["completion-memory", "Correlated receive completion plus application memory verification"]],
          correct: "completion-memory",
          explanation: "The packet proves payload was on the wire; the ACK is transport evidence. Application success requires the receiver-local completion and the recorded memory comparison.",
        },
      ],
      evidence: (
        <div className="grid gap-3 lg:grid-cols-2">
          <WorkRequestSummary request={sendReceiveWr} title="Revealed correlated Receive Work Request" />
          <CompletionSummary completion={sendCompletion} title="Revealed receiver-local completion" />
        </div>
      ),
    },
    {
      id: "write-notification",
      label: "Investigation B",
      title: "Did the target application receive a notification?",
      experiment: writeExperiment,
      packet: writeRequest,
      questions: [
        {
          id: "write-established",
          prompt: "What can be established directly from the captured WRITE request?",
          options: [["wire-memory", "Target memory named by RETH and payload carried on the wire"], ["target-consumed", "The target application consumed the data"], ["target-completion", "A target receive completion already exists"]],
          correct: "wire-memory",
          explanation: "The RETH fields and payload are genuine wire evidence. They do not encode application consumption or prove that a target receive CQE exists.",
        },
        {
          id: "ack-meaning",
          prompt: "Does the reverse ACK prove that the target application consumed the data?",
          options: [["yes", "Yes"], ["no", "No"]],
          correct: "no",
          explanation: "The ACK is reliable-transport evidence flowing toward the initiator endpoint. It is not a target application memory inspection and not a Completion Queue Entry.",
        },
        {
          id: "target-cqe",
          prompt: "Does ordinary WRITE produce a normal target receive completion?",
          options: [["yes", "Yes"], ["no", "No"]],
          correct: "no",
          explanation: "Ordinary WRITE consumes no target Receive Work Request. The reference target's post-synchronization CQ poll recorded zero completions.",
        },
        {
          id: "required-evidence",
          prompt: "What evidence is required before saying the target verified its buffer?",
          options: [["memory-verification", "Application memory verification after meaningful synchronization/observation"], ["wireshark-only", "The WRITE packet alone"], ["link-state", "The Ethernet link being up"]],
          correct: "memory-verification",
          explanation: "Wire evidence and link state do not establish application interpretation. The reference evidence uses explicit synchronization, target CQ observation and then memory verification.",
        },
      ],
      evidence: (
        <div className="grid gap-3 lg:grid-cols-2">
          <CompletionSummary completion={writeCompletion} title="Revealed initiator-local WRITE completion" />
          <PayloadMemory label="Revealed verified target memory after synchronization" value={writeAfter} />
        </div>
      ),
    },
    {
      id: "read-ownership",
      label: "Investigation C",
      title: "Who requested the data in this response?",
      experiment: readExperiment,
      packet: readResponse,
      questions: [
        {
          id: "transmitter",
          prompt: "Which host transmitted this response?",
          options: [["hosta", "Server A"], ["hostb", "Server B"]],
          correct: "hostb",
          explanation: "The response source IP belongs to Server B. Payload data returns from the memory source toward the reader.",
        },
        {
          id: "initiator",
          prompt: "Which application originally initiated the READ?",
          options: [["hosta", "Server A"], ["hostb", "Server B"]],
          correct: "hosta",
          explanation: "The correlated READ Work Request was posted by Server A. The response is a consequence of that request, not a new operation initiated by Server B.",
        },
        {
          id: "direction-reason",
          prompt: "Why are request direction and payload direction different?",
          options: [["read-pull", "The reader asks the source to return memory, so the request goes A→B and payload returns B→A"], ["send-queue", "Send Queue means payload always travels outward"], ["capture-error", "The capture reversed the addresses"]],
          correct: "read-pull",
          explanation: "READ is initiated by the requester, but its payload is sourced from remote memory. “Send Queue” names where work is posted, not the direction payload data must travel.",
        },
        {
          id: "response-target",
          prompt: "Which endpoint does this response target?",
          options: [["reader", "The reader endpoint on Server A"], ["source", "The source endpoint on Server B"]],
          correct: "reader",
          explanation: `The response destination QPN ${exact(readResponse.destinationQpn)} correlates with Server A's endpoint for this reference run. Reverse-direction packets must be interpreted by their own destination fields.`,
        },
        {
          id: "completion-owner",
          prompt: "Which application should observe the READ completion?",
          options: [["hosta", "Server A — the initiating reader"], ["hostb", "Server B — the memory source"]],
          correct: "hosta",
          explanation: "Completion ownership follows the application that posted the signalled READ work. The source application posted no data Work Request and later recorded zero completions after synchronization.",
        },
      ],
      evidence: (
        <div className="grid gap-3 lg:grid-cols-2">
          <PacketSummary packet={readRequest}>Revealed earlier READ request. Compare its direction and RETH fields with the response you started from.</PacketSummary>
          <div className="space-y-3">
            <WorkRequestSummary request={readWr} title="Revealed originating READ Work Request" />
            <CompletionSummary completion={readCompletion} title="Revealed reader-local completion" />
          </div>
        </div>
      ),
    },
  ];
}

function FinalInvestigation() {
  const cases = useMemo(() => operationalCases(), []);
  const [caseId, setCaseId] = useState(cases[0].id);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const activeCase = cases.find((item) => item.id === caseId) || cases[0];
  const { packet } = activeCase;
  const answeredCount = activeCase.questions.filter((question) => answers[question.id]).length;

  function chooseCase(id: string) {
    setCaseId(id);
    setAnswers({});
    setRevealed(false);
    setSkipped(false);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-4" data-testid="final-packet-investigation">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-100">Operational packet investigations</h3>
          <p className="mt-1 text-sm text-slate-400">Start from observable wire evidence and reconstruct the application behaviour. Exercises are learning aids, not a mastery score.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choose investigation">
          {cases.map((item) => (
            <button key={item.id} type="button" onClick={() => chooseCase(item.id)} aria-pressed={item.id === caseId} className={cx("rounded-full border px-3 py-1.5 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300", item.id === caseId ? "border-cyan-300/60 bg-cyan-300/12 text-cyan-100" : "border-white/10 text-slate-400 hover:text-slate-200")}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <h4 className="mt-4 text-lg font-semibold text-slate-100">{activeCase.title}</h4>
      <div className="mt-3 overflow-hidden rounded-xl border border-orange-300/20 bg-orange-300/6" data-testid="decoded-investigation-packet">
        <header className="border-b border-orange-300/15 px-3 py-2 text-sm font-semibold text-orange-100">Initial artifact · frame {packet.frameNumber} · {packet.captureFile}</header>
        <dl className="grid gap-2 p-3 font-mono text-xs text-orange-50 sm:grid-cols-2">
          <div><dt className="text-orange-200/70">IP direction</dt><dd>{packet.sourceIp} → {packet.destinationIp}</dd></div>
          <div><dt className="text-orange-200/70">UDP destination port</dt><dd>{packet.udp.destinationPort}</dd></div>
          <div><dt className="text-orange-200/70">BTH opcode</dt><dd>{packet.opcodeName}</dd></div>
          <div><dt className="text-orange-200/70">Destination QPN</dt><dd>{exact(packet.destinationQpn)}</dd></div>
          <div><dt className="text-orange-200/70">PSN</dt><dd>{exact(packet.psn)}</dd></div>
          <div><dt className="text-orange-200/70">Application payload</dt><dd>{packet.payloadHex ? `${packetLengthBreakdown(packet).applicationPayloadBytes} bytes` : "none"}</dd></div>
          <div><dt className="text-orange-200/70">BTH padding</dt><dd>{packetLengthBreakdown(packet).transportPaddingBytes} bytes</dd></div>
          <div><dt className="text-orange-200/70">Captured data incl. padding</dt><dd>{packetLengthBreakdown(packet).capturedDataBytes} bytes</dd></div>
          <div><dt className="text-orange-200/70">Total frame length</dt><dd>{packetLengthBreakdown(packet).totalFrameBytes} bytes</dd></div>
          <div className="sm:col-span-2"><dt className="text-orange-200/70">Memory fields for this operation</dt><dd>{packet.reth ? `RETH remote address ${exact(packet.reth.virtualAddress)} · RKEY ${exact(packet.reth.rkey)} · DMA length ${exact(packet.reth.dmaLength, "decimal")}` : "no RETH"}</dd></div>
        </dl>
        {packet.id === "b:packet:3" ? (
          <p className="border-t border-orange-300/15 px-3 py-2 text-xs leading-5 text-orange-50/90" data-testid="send-padding-observation">
            The application requested a transfer of {packetLengthBreakdown(packet).applicationPayloadBytes} bytes. The captured data portion includes {packetLengthBreakdown(packet).transportPaddingBytes === 1 ? "one" : packetLengthBreakdown(packet).transportPaddingBytes === 2 ? "two" : packetLengthBreakdown(packet).transportPaddingBytes === 3 ? "three" : packetLengthBreakdown(packet).transportPaddingBytes} additional padding bytes. Those padding bytes are not part of the application message.
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {activeCase.questions.map((question) => {
          const selected = answers[question.id];
          const isCorrect = selected === question.correct;
          return (
            <fieldset key={question.id} className="rounded-xl border border-white/10 bg-slate-900/40 p-3" data-testid={`investigation-${question.id}`}>
              <legend className="px-1 text-sm font-medium text-slate-200">{question.prompt}</legend>
              <div className="mt-2 grid gap-2">
                {question.options.map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setAnswers((current) => ({ ...current, [question.id]: value }))} aria-pressed={selected === value} className={cx("rounded-lg border px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300", selected === value ? isCorrect ? "border-emerald-300/45 bg-emerald-300/10 text-emerald-100" : "border-amber-300/45 bg-amber-300/10 text-amber-100" : "border-white/10 text-slate-300 hover:border-white/25")}>
                    {label}{selected === value ? <span className="ml-2 text-xs">{isCorrect ? "correct" : "incorrect"}</span> : null}
                  </button>
                ))}
              </div>
              {selected ? <p className="mt-3 rounded-lg border border-white/10 bg-slate-950/55 p-2.5 text-xs leading-5 text-slate-300" data-testid={`feedback-${question.id}`}>{isCorrect ? "Correct. " : "Not correct. "}{question.explanation}</p> : null}
            </fieldset>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => { setRevealed(true); setSkipped(false); }} className="rounded-full border border-cyan-300/30 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" data-testid="reveal-investigation-evidence">Reveal correlated evidence</button>
        <button type="button" onClick={() => { setSkipped(true); setRevealed(true); }} className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" data-testid="skip-investigation">Skip and inspect explanation</button>
        <span className="text-xs text-slate-500" data-testid="investigation-status">{skipped ? "skipped · evidence reviewed" : revealed ? "evidence reviewed" : answeredCount ? `${answeredCount} question${answeredCount === 1 ? "" : "s"} attempted` : "not attempted"}</span>
      </div>
      {revealed ? <div className="mt-4" data-testid="revealed-investigation-evidence">{activeCase.evidence}</div> : null}
    </section>
  );
}

function AiNetworkingBridge() {
  return (
    <section className="mt-5 rounded-2xl border border-cyan-300/18 bg-cyan-300/6 p-4" data-testid="ai-networking-bridge">
      <h4 className="font-semibold text-cyan-100">One concrete AI-cluster transfer example</h4>
      <p className="mt-2 text-sm leading-7 text-slate-300">Imagine that the buffer is no longer a small Python message. It contains a portion of the data that an AI application needs to exchange with another server. The same causal questions apply: which memory is registered, which endpoint resources exist, what work was posted, which packets appear, and which completion or synchronization evidence establishes the outcome?</p>
      <div className="mt-3 grid gap-1 rounded-xl border border-white/10 bg-slate-950/55 p-3 text-center font-mono text-xs leading-6 text-slate-200 sm:grid-cols-7 sm:items-center">
        <span>AI application /<br />communication library</span><span aria-hidden="true">→</span><span>RDMA-capable<br />transport</span><span aria-hidden="true">→</span><span>registered memory<br />+ QP/CQ resources</span><span aria-hidden="true">→</span><span>RDMA NIC → RoCEv2 fabric → remote NIC/memory</span>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-300">Hardware-supported GPUDirect RDMA can extend this memory-transfer model to suitable GPU memory. That is a conceptual hardware/GPU path: it is not what our host-memory Soft-RoCE experiments demonstrate, and this practical does not claim that every NCCL transport uses one fixed operation sequence or always uses ordinary RDMA WRITE.</p>
      <details className="mt-3 rounded-xl border border-white/10 bg-slate-900/45 p-3">
        <summary className="cursor-pointer text-sm font-medium text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">If an RDMA-dependent application is waiting for completion, why is an Ethernet link in the UP state insufficient?</summary>
        <p className="mt-2 text-sm leading-7 text-slate-300">Link UP only means the physical/link layer is operational. Communication can still fail because endpoints are not ready, memory is not registered with the required permission, work was not submitted correctly, transport progress is impaired by loss or congestion, a completion contains an error status, or application synchronization never occurs. The deeper fabric mechanisms are covered in the linked FabricLab chapters.</p>
      </details>
    </section>
  );
}

function LearningSummary() {
  const rows = [
    ["DMA", "why a device can transfer memory without the CPU performing each data copy"],
    ["RDMA", "what changes compared with representative socket networking"],
    ["MR", "why memory must be registered and what access is permitted"],
    ["PD", "why related RDMA resources must be associated correctly"],
    ["WR", "how an application describes work"],
    ["QP", "how application work reaches a communication endpoint"],
    ["CQ", "how the application observes completed work"],
    ["SEND", "why the receiver prepares destination memory"],
    ["WRITE", "why remote memory can change without a normal target receive CQE"],
    ["READ", "why request direction and payload direction differ"],
    ["RoCEv2", "how application operations appear as network packets"],
    ["Evidence", "what a packet capture proves and what requires application observation"],
  ] as const;
  return (
    <details className="mt-5 rounded-2xl border border-white/10 bg-slate-900/40 p-4" data-testid="learning-summary">
      <summary className="cursor-pointer font-semibold text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Optional learning summary — explain the mechanism, not the definition</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {rows.map(([concept, outcome]) => (
          <div key={concept} className="rounded-lg border border-white/8 bg-slate-950/45 p-2.5 text-sm leading-6 text-slate-300"><strong className="text-cyan-100">{concept}:</strong> {outcome}</div>
        ))}
      </div>
    </details>
  );
}

function CurriculumLinks() {
  const links = [
    ["/learn/ch16-gpu-compute-network-packet-anatomy", "Chapter 16 · GPU compute network packet anatomy"],
    ["/learn/ch8-nccl-performance", "NCCL communication and performance"],
    ["/learn/ch5-pfc-ecn-congestion", "PFC, ECN and congestion behavior"],
    ["/learn/ch15-ip-routing-ai-fabrics", "RoCEv2 leaf-spine IP fabrics"],
    ["/learn/ch21-congestion-control-deep-dive", "Congestion control in depth"],
    ["/learn/ch25-roce-configuration-operations", "RoCE configuration and operations"],
  ] as const;
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5" data-testid="curriculum-links">
      <h3 className="font-semibold text-slate-100">Why this matters in AI data-centre networking</h3>
      <p className="mt-3 text-sm leading-7 text-slate-300">
        The model you have just learned is the application-facing end of a much larger system. Hardware RDMA NICs such as ConnectX implement these semantics in hardware. NCCL uses RDMA-capable transports for collective AI communication, and GPUDirect RDMA extends the data path toward accelerator memory. In a leaf-spine RoCEv2 fabric, loss, congestion or misconfigured PFC/ECN can stall the very queue-pair operations whose packet anatomy you can now recognize.
      </p>
      <AiNetworkingBridge />
      <LearningSummary />
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-xl border border-white/10 bg-slate-900/45 px-3 py-2.5 text-sm text-cyan-200 transition hover:border-cyan-300/30 hover:text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            {label} →
          </Link>
        ))}
      </div>
      <div className="mt-5 border-t border-white/8 pt-4">
        <h4 className="text-sm font-semibold text-slate-200">Reproduce and inspect the original evidence</h4>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4" href="/practical/rdma/explorer">Advanced execution explorer</Link>
          <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4" href="/practical/rdma/send-recv.pcap" download>send-recv.pcap</a>
          <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4" href="/practical/rdma/rdma-write.pcap" download>rdma-write.pcap</a>
          <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4" href="/practical/rdma/rdma-read.pcap" download>rdma-read.pcap</a>
          <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4" href="https://github.com/g-arjuna/fabriclab/tree/a208af6ecf4e838d6d2c475ede366494de81a706/labs/rdma-basics">lab source</a>
        </div>
      </div>
    </section>
  );
}

export function Lesson8Packets({ onComplete }: { onComplete: () => void }) {
  const steps: GuidedStep[] = [
    {
      id: "orientation",
      title: "Now reverse the perspective: recognize application behavior in packets",
      actionLabel: "Start with familiar Ethernet, IP and UDP headers",
      body: (
        <>
          <p>By now you understand what the applications are trying to accomplish. The final skill is operational: given real packets on the wire, recognize which RDMA behavior they represent and what they do — and do not — prove.</p>
          <p>Use the same verified SEND, WRITE and READ captures from the previous lessons. The packet values are exported evidence and remain correlated with the application objects you have already seen.</p>
        </>
      ),
      visual: <WriteCodePacketCorrelation />,
      evidence: <EvidenceNote kind="Captured evidence">Every packet shown here is a decoded record from the committed validated captures. The browser does not generate or fabricate packets.</EvidenceNote>,
    },
    {
      id: "familiar-headers",
      title: "RoCEv2 still rides on Ethernet, IP and UDP",
      actionLabel: "Expose the Base Transport Header",
      body: (
        <>
          <p>Start with what you already know. Ethernet identifies the adjacent data-network interfaces. IP identifies the host direction. UDP destination port 4791 is the RoCEv2 encapsulation used in these captures.</p>
          <p>Those facts explain how the traffic crosses the network, but not yet which RDMA operation is occurring or which endpoint resource it targets.</p>
        </>
      ),
      visual: <PacketInvestigator stage={1} />,
    },
    {
      id: "bth",
      title: "The Base Transport Header identifies operation, endpoint and sequence",
      actionLabel: "Inspect memory fields for each operation",
      body: (
        <>
          <p>The Base Transport Header, or BTH, carries the RDMA operation opcode, destination Queue Pair Number and Packet Sequence Number. These are transport fields, not application Python objects.</p>
          <p>Select the destination QPN. The investigator highlights the actual endpoint resource from the validated run. Select the opcode. It connects the packet back to the correlated Work Request and relevant source lines.</p>
        </>
      ),
      visual: <PacketInvestigator stage={2} />,
      evidence: <EvidenceNote kind="Directionality matters">Reverse-direction ACK and READ-response destination QPNs are accurate for their direction. A response returning to Server A targets Server A’s endpoint; it is not labelled with Server B merely because the forward request targeted Server B.</EvidenceNote>,
    },
    {
      id: "reth",
      title: "WRITE and READ requests can name remote memory in RETH",
      actionLabel: "Connect fields to memory and completions",
      body: (
        <>
          <p>The RDMA Extended Transport Header, or RETH, carries remote virtual address, RKEY and DMA length where the operation requires them. In these captures, WRITE and READ request packets contain RETH. SEND, ACK and READ-response packets do not.</p>
          <p>Select an RKEY or remote address to identify the registered memory resource associated with the captured request. Do not treat those values as permanent; they are evidence for this reference execution.</p>
        </>
      ),
      visual: <PacketInvestigator stage={3} />,
    },
    {
      id: "correlations",
      title: "Packet fields become useful when correlated with application state",
      actionLabel: "Begin the final guided investigation",
      body: (
        <>
          <p>A packet capture proves what was on the wire. It does not by itself prove when an application inspected memory, what a Completion Queue contained, or whether application-level verification succeeded. Those facts come from correlated application event and memory evidence.</p>
          <p>This is the disciplined way to use Wireshark in RDMA networks: correlate packet fields with endpoint, memory, work-request and completion evidence instead of treating packet metadata as the whole system.</p>
        </>
      ),
      visual: <PacketInvestigator stage={4} />,
    },
    {
      id: "final-investigation",
      title: "Determine what one genuine packet proves",
      actionLabel: "Connect the model to AI data-centre networking",
      body: (
        <>
          <p>Examine genuine forward and reverse-direction packets and answer the operational questions. The point is not test performance; it is to practice interpreting direction, endpoint targeting and the boundary between wire evidence and application evidence.</p>
        </>
      ),
      visual: <FinalInvestigation />,
    },
    {
      id: "curriculum-connection",
      title: "You can now connect the programming model to the fabric",
      actionLabel: "Finish the RDMA practical",
      body: (
        <>
          <p>You started with five conceptual bytes in application memory and finished by interpreting genuine RoCEv2 packets in terms of endpoints, registered memory, work requests and completions. That is the mental model needed to reason about AI and HPC networking incidents rather than memorizing isolated acronyms.</p>
          <p>The advanced execution explorer remains available when you want the complete synchronized replay, full source snapshots, event logs, validation evidence and packet details.</p>
        </>
      ),
      visual: <CurriculumLinks />,
    },
  ];

  return <GuidedLesson lessonId="packets" steps={steps} onComplete={onComplete} finalActionLabel="Finish the RDMA practical" />;
}
