"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { CompletionSummary, WorkRequestSummary } from "./operationVisuals";
import { cx, EvidenceNote, exactValue, FactGrid, SourceExcerpt } from "./visuals";
import { exact, rdmaEvidence, type Experiment, type PacketRecord } from "@/lib/practical/rdmaEvidence";

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
    if (selection === "payload") return <p>The payload bytes were captured on the wire. They prove what this packet contained, but they do not by themselves prove when application memory was inspected or which completion an application observed.</p>;
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
              <h4 className="text-sm font-semibold text-violet-100">Operation-specific memory and payload fields</h4>
              {packet.reth ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <FieldButton selected={selection === "remote-address"} onClick={() => setSelection("remote-address")} label="Remote virtual address" value={exact(packet.reth!.virtualAddress)} />
                  <FieldButton selected={selection === "rkey"} onClick={() => setSelection("rkey")} label="RKEY" value={exact(packet.reth!.rkey)} />
                  <FieldButton selected={selection === "dma-length"} onClick={() => setSelection("dma-length")} label="DMA length" value={exact(packet.reth!.dmaLength, "decimal")} />
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-white/10 bg-slate-950/45 p-3 text-sm leading-6 text-slate-300">This {packet.opcodeName} packet has no RETH. Only the WRITE and READ request packets in these captures carry remote address, RKEY and DMA length fields.</p>
              )}
              {packet.payloadText ? (
                <div className="mt-3">
                  <FieldButton selected={selection === "payload"} onClick={() => setSelection("payload")} label="Payload" value={packet.payloadText} />
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

function FinalInvestigation() {
  const cases = useMemo(() => investigationCases(), []);
  const [caseId, setCaseId] = useState(cases[0].id);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const selectedCase = cases.find((item) => item.id === caseId) || cases[0];
  const { experiment, packet } = selectedCase;
  const correlatedWr = experiment.workRequests.find((item) => packet.correlations.workRequestIds.includes(item.id));
  const destinationEndpoint = endpointForQpn(experiment, packet);
  const correct = {
    role: packet.role,
    transmitter: packet.sourceHost || "unknown",
    target: packet.destinationHost || "unknown",
    initiator: correlatedWr?.host || "unknown",
    payload: packet.payloadText ? "yes" : "no",
    reth: packet.reth ? "yes" : "no",
    evidence: "application-correlation",
  } as const;

  const groups = [
    { id: "role", label: "Is this a request, response or acknowledgement?", options: [["request", "Operation request"], ["response", "Data-carrying response"], ["acknowledgement", "Transport acknowledgement"]] },
    { id: "transmitter", label: "Which host transmitted this packet?", options: [["hosta", "Server A"], ["hostb", "Server B"]] },
    { id: "target", label: "Which endpoint host does this packet target?", options: [["hosta", "Server A endpoint"], ["hostb", "Server B endpoint"]] },
    { id: "initiator", label: "Which application initiated the associated operation?", options: [["hosta", "Server A application"], ["hostb", "Server B application"]] },
    { id: "payload", label: "Is application payload present in this packet?", options: [["yes", "Yes"], ["no", "No"]] },
    { id: "reth", label: "Does this packet contain remote memory fields in RETH?", options: [["yes", "Yes"], ["no", "No"]] },
    { id: "evidence", label: "What is needed to establish completion or verified memory?", options: [["application-correlation", "Correlated application completion/memory evidence"], ["packet-alone", "This packet alone proves both"], ["peer-assumption", "Assume the peer application noticed"]] },
  ] as const;

  function explanation(groupId: string, selected: string) {
    const expected = correct[groupId as keyof typeof correct];
    const right = selected === expected;
    const prefix = right ? "Correct. " : "Not correct. ";
    if (groupId === "role") {
      return `${prefix}The decoded opcode is ${packet.opcodeName}. Interpret its consequence: operation requests initiate transport work, a READ response returns requested data, and an Acknowledge packet is reliable-transport evidence rather than a new application-issued operation.`;
    }
    if (groupId === "transmitter") {
      return `${prefix}The source IP is ${packet.sourceIp}, which the validated topology maps to ${hostLabel(packet.sourceHost)}. Wire direction is determined by the actual source and destination, not by which application originally posted the Work Request.`;
    }
    if (groupId === "target") {
      return `${prefix}The packet travels to ${packet.destinationIp} and destination QPN ${exact(packet.destinationQpn)}. That QPN correlates with the ${destinationEndpoint?.label || "recorded endpoint"} on ${hostLabel(packet.destinationHost)}. Reverse-direction responses and ACKs therefore target a different endpoint from the forward request.`;
    }
    if (groupId === "initiator") {
      return `${prefix}The correlated Work Request is ${correlatedWr ? correlatedWr.id : "not available"} on ${hostLabel(correlatedWr?.host)}. A response or ACK travels backward as a consequence of that original work; it is not a new operation initiated by the responding application.`;
    }
    if (groupId === "payload") {
      return `${prefix}${packet.payloadText ? `This packet carries captured payload bytes beginning with “${packet.payloadText.slice(0, 42)}”.` : "This packet carries no application payload bytes."} A READ request asks for memory but does not carry the memory contents; the response carries them instead.`;
    }
    if (groupId === "reth") {
      return `${prefix}${packet.reth ? `This packet contains RETH: remote address ${exact(packet.reth.virtualAddress)}, RKEY ${exact(packet.reth.rkey)}, DMA length ${exact(packet.reth.dmaLength, "decimal")}.` : "This packet has no RETH."} In these captures, only WRITE and READ request packets carry those remote-memory fields; SEND, ACK and READ-response packets do not.`;
    }
    return `${prefix}The capture proves wire direction, headers and carried bytes. Completion ownership, completion timing and application memory verification require correlated application event and memory evidence.`;
  }

  const answered = groups.every((group) => answers[group.id]);
  const correctCount = groups.filter((group) => answers[group.id] === correct[group.id as keyof typeof correct]).length;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-4" data-testid="final-packet-investigation">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-100">Packet interpretation exercise</h3>
          <p className="mt-1 text-sm text-slate-400">Cases are neutrally labelled. Interpret the decoded fields and direction instead of relying on the case selector.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choose packet case">
          {cases.map((item) => (
            <button key={item.id} type="button" onClick={() => { setCaseId(item.id); setAnswers({}); }} aria-pressed={item.id === caseId} className={cx("rounded-full border px-3 py-1.5 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300", item.id === caseId ? "border-cyan-300/60 bg-cyan-300/12 text-cyan-100" : "border-white/10 text-slate-400 hover:text-slate-200")}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-orange-300/20 bg-orange-300/6" data-testid="decoded-investigation-packet">
        <header className="border-b border-orange-300/15 px-3 py-2 text-sm font-semibold text-orange-100">Wireshark-style decoded packet · frame {packet.frameNumber}</header>
        <dl className="grid gap-2 p-3 font-mono text-xs text-orange-50 sm:grid-cols-2">
          <div><dt className="text-orange-200/70">capture</dt><dd>{packet.captureFile}</dd></div>
          <div><dt className="text-orange-200/70">Ethernet/IP direction</dt><dd>{packet.sourceIp} → {packet.destinationIp}</dd></div>
          <div><dt className="text-orange-200/70">UDP destination port</dt><dd>{packet.udp.destinationPort}</dd></div>
          <div><dt className="text-orange-200/70">BTH opcode</dt><dd>{packet.opcodeName}</dd></div>
          <div><dt className="text-orange-200/70">Destination QPN</dt><dd>{exact(packet.destinationQpn)}</dd></div>
          <div><dt className="text-orange-200/70">PSN</dt><dd>{exact(packet.psn)}</dd></div>
          <div className="sm:col-span-2"><dt className="text-orange-200/70">Operation-specific fields</dt><dd>{packet.reth ? `RETH remote address ${exact(packet.reth.virtualAddress)} · RKEY ${exact(packet.reth.rkey)} · DMA length ${exact(packet.reth.dmaLength, "decimal")}` : "no RETH"}{packet.payloadText ? ` · payload “${packet.payloadText}”` : " · no application payload"}</dd></div>
        </dl>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {groups.map((group) => {
          const selected = answers[group.id];
          return (
            <fieldset key={group.id} className="rounded-xl border border-white/10 bg-slate-900/40 p-3" data-testid={`investigation-${group.id}`}>
              <legend className="px-1 text-sm font-medium text-slate-200">{group.label}</legend>
              <div className="mt-2 grid gap-2">
                {group.options.map(([value, label]) => {
                  const selectedAnswer = selected === value;
                  const isCorrect = correct[group.id as keyof typeof correct] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAnswers((current) => ({ ...current, [group.id]: value }))}
                      aria-pressed={selectedAnswer}
                      className={cx(
                        "rounded-lg border px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                        selectedAnswer ? isCorrect ? "border-emerald-300/45 bg-emerald-300/10 text-emerald-100" : "border-amber-300/45 bg-amber-300/10 text-amber-100" : "border-white/10 text-slate-300 hover:border-white/25",
                      )}
                    >
                      {label}{selectedAnswer ? <span className="ml-2 text-xs">{isCorrect ? "correct" : "incorrect"}</span> : null}
                    </button>
                  );
                })}
              </div>
              {selected ? <p className="mt-3 rounded-lg border border-white/10 bg-slate-950/55 p-2.5 text-xs leading-5 text-slate-300" data-testid={`feedback-${group.id}`}>{explanation(group.id, selected)}</p> : null}
            </fieldset>
          );
        })}
      </div>
      {answered ? (
        <p className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/8 p-3 text-sm leading-6 text-cyan-100" data-testid="final-investigation-result">
          You answered {correctCount} of {groups.length} correctly. The important skill is not naming the displayed opcode; it is interpreting direction, endpoint targeting, payload presence, RETH presence and the boundary between wire evidence and application evidence.
        </p>
      ) : null}
    </section>
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
      visual: <PacketInvestigator stage={0} />,
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
      actionLabel: "Expose operation-specific memory fields",
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
