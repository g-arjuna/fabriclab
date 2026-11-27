"use client";

import { useMemo, useState } from "react";

import { tcpEvidence, tcpFlagNames, type TcpCaseEvidence, type TcpDetailedPacket } from "@/lib/practical/tcpEvidence";

import { cx } from "./visuals";
import { useGuidedVisualStage } from "./guidedVisualState";
import { ActionRow, ByteCells, FoundationAction, FoundationBox, LinkLine, RangeBar, SmallNote } from "./foundationVisualPrimitives";

const hello = ["48", "45", "4c", "4c", "4f"];
const zeros5 = ["00", "00", "00", "00", "00"];
const small = tcpEvidence.cases["small-late"];
const large = tcpEvidence.cases.large;

function fdLink(label: string, target: string, active = true) {
  return <LinkLine label={`${label} references ${target}`} kind="reference" direction="right" active={active} />;
}

export function SocketObjectsVisual({ sectionId }: { sectionId: string }) {
  const connectable = sectionId === "2.2";
  const stage = useGuidedVisualStage();
  const created = connectable || stage >= 1;
  const connected = connectable && stage >= 2;
  const ep = small.endpoints;
  const fourTuple = `${ep.senderLocal[0]}:${ep.senderLocal[1]} ↔ ${ep.senderPeer[0]}:${ep.senderPeer[1]}`;
  if (!connectable) {
    return (
      <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="foundation-socket-objects">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem]">
          <div className="grid gap-2 sm:grid-cols-3">
            {["web browser", "SSH session", "Python sender"].map((name) => <FoundationBox key={name} title={`${name} process`} tone="neutral" active={name === "Python sender" && created}><div className="font-mono text-xs">Python socket wrapper<br />fd table entry</div>{name === "Python sender" ? fdLink("process-local handle", "kernel socket object", created) : fdLink("existing handle", "its own kernel socket", true)}</FoundationBox>)}
          </div>
          <FoundationBox title="Linux kernel-managed networking objects" tone="kernel" testId="kernel-socket-object"><div className="grid gap-2 text-xs"><span className="rounded-lg border border-white/10 px-2 py-1.5">browser socket state</span><span className="rounded-lg border border-white/10 px-2 py-1.5">SSH socket state</span><span className={cx("rounded-lg border px-2 py-1.5", created ? "border-violet-300/40 bg-violet-300/10" : "border-dashed border-white/10 text-slate-500")}>Python TCP socket object {created ? "· created, no packet" : "· not yet created"}</span></div></FoundationBox>
          <FoundationBox title="shared physical NIC" tone="device">one NIC port shared through controlled kernel/driver access</FoundationBox>
        </div>
        <SmallNote>Legend: physical NIC port ≠ TCP port ≠ process-local file descriptor. A Python socket wrapper and fd are handles; the socket object and connection state are kernel-managed.</SmallNote>
      </div>
    );
  }
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="foundation-socket-endpoints">
      <div className="grid gap-3 xl:grid-cols-2">
        <FoundationBox title="Server A · client process" tone="neutral" active={connected}><div className="font-mono text-xs">wrapper s<br />process-local fd {ep.senderFd}</div>{fdLink(`fd ${ep.senderFd}`, "kernel connected socket", connected)}<FoundationBox title="kernel connected socket" tone="kernel" active={connected}><div className="font-mono text-xs">{connected ? fourTuple : "unconnected · local ephemeral port chosen on connect"}</div><div className="mt-1 text-[11px]">connection-specific send/receive storage appears only with a connection</div></FoundationBox></FoundationBox>
        <FoundationBox title="Server B · receiving process" tone="neutral" active><div className="grid gap-2"><div><div className="font-mono text-xs">listener wrapper<br />process-local fd {ep.listenerFd}</div>{fdLink(`fd ${ep.listenerFd}`, "kernel listening socket", true)}<FoundationBox title="kernel listening socket" tone="kernel"><div className="font-mono text-xs">10.10.10.2:{ep.senderPeer[1]} · listener</div></FoundationBox></div><div><div className="font-mono text-xs">conn wrapper<br />process-local fd {connected ? ep.receiverFd : "not yet returned"}</div>{fdLink(`fd ${ep.receiverFd}`, "accepted connected socket", connected)}<FoundationBox title="accepted kernel socket" tone="kernel" active={connected}><div className="font-mono text-xs">{connected ? fourTuple : "not created by accept() yet"}</div><div className="mt-1 text-[11px]">distinct from the listener; owns this connection's receive/send state</div></FoundationBox></div></div></FoundationBox>
      </div>
      <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 p-3" data-testid="connection-four-tuple"><div className="text-[10px] uppercase tracking-[0.15em] text-slate-500">recorded connection four-tuple</div><div className="mt-1 font-mono text-sm text-cyan-100">{fourTuple}</div><div className="mt-2 text-[11px] text-slate-400">Recorded client port {ep.senderLocal[1]}; an illustrative explanation may simply say “ephemeral port”. A second conceptual client can use the same server port because its source address/port differs.</div></div>
    </div>
  );
}

function packetFlags(packet: TcpDetailedPacket) {
  return [packet.tcp.syn && "SYN", packet.tcp.ack && "ACK", packet.tcp.psh && "PSH", packet.tcp.fin && "FIN"].filter(Boolean).join("+") || "none";
}

export function PacketInspector({ item = small, testId = "fabriclab-packet-inspector", largeDefault = false, selectedFrame: controlledFrame, onSelectFrame }: { item?: TcpCaseEvidence; testId?: string; largeDefault?: boolean; selectedFrame?: number | null; onSelectFrame?: (frame: number) => void }) {
  const initial = (largeDefault ? large.payloadSegments[0]?.frameNumber : item.payloadSegments[0]?.frameNumber) ?? item.packets[0]?.frameNumber;
  const [uncontrolledFrame, setUncontrolledFrame] = useState(initial);
  const selectedFrame = controlledFrame ?? uncontrolledFrame;
  const chooseFrame = (frame: number) => {
    if (onSelectFrame) onSelectFrame(frame);
    else setUncontrolledFrame(frame);
  };
  const [details, setDetails] = useState(false);
  const packet = item.packets.find((row) => row.frameNumber === selectedFrame) || item.packets[0];
  const base = item.browserValidation.baseSequence;
  const applicationBytes = item.browserValidation.bytes;
  const forward = packet.ip.source === item.endpoints.senderLocal[0]
    && packet.tcp.sourcePort === item.endpoints.senderLocal[1]
    && packet.ip.destination === item.endpoints.senderPeer[0]
    && packet.tcp.destinationPort === item.endpoints.senderPeer[1];
  const reverse = packet.ip.source === item.endpoints.senderPeer[0]
    && packet.tcp.sourcePort === item.endpoints.senderPeer[1]
    && packet.ip.destination === item.endpoints.senderLocal[0]
    && packet.tcp.destinationPort === item.endpoints.senderLocal[1];
  const appRange = forward && packet.tcp.payloadLength > 0 ? { start: packet.tcp.relativeSequence - base, endExclusive: packet.tcp.relativeSequence - base + packet.tcp.payloadLength } : null;
  const ackSequenceEnd = reverse && packet.tcp.ack ? Math.max(0, packet.tcp.relativeAcknowledgement - base) : 0;
  const ackedApplicationEnd = Math.min(applicationBytes, ackSequenceEnd);
  const ackedApplicationBytes = reverse && packet.tcp.ack && ackedApplicationEnd > 0 ? { start: 0, endExclusive: ackedApplicationEnd } : null;
  const finAcknowledged = reverse && packet.tcp.ack && packet.tcp.relativeAcknowledgement > base + applicationBytes;
  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3" data-testid={testId}>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-200">FabricLab packet inspection · actual TShark decode</div><div className="mt-1 text-[11px] text-slate-500">Not Wireshark GUI; backed by the committed PCAP and deterministic TShark output. <a className="text-cyan-200 underline underline-offset-4" href={item.capture.downloadPath}>Download the original PCAP</a>.</div></div><FoundationAction testId="toggle-packet-details" active={details} onClick={() => setDetails((value) => !value)}>Checksums and optional detail</FoundationAction></div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="space-y-1" data-testid="selectable-packet-rows">
          {item.packets.map((row) => {
            const className = cx("grid w-full grid-cols-[3rem_minmax(0,1fr)_5rem_4rem] gap-2 rounded-lg border px-2 py-1.5 text-left font-mono text-[11px]", selectedFrame === row.frameNumber ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-50" : "border-white/10 bg-white/4 text-slate-300", controlledFrame === undefined && "hover:border-cyan-300/25");
            const content = <><span>frame {row.frameNumber}</span><span className="truncate">{row.ip.source}:{row.tcp.sourcePort} → {row.ip.destination}:{row.tcp.destinationPort}</span><span>{packetFlags(row)}</span><span>{row.tcp.payloadLength || "—"}</span></>;
            return controlledFrame === undefined
              ? <button type="button" key={row.frameNumber} onClick={() => chooseFrame(row.frameNumber)} className={className} data-testid={`packet-row-${row.frameNumber}`} data-payload={row.tcp.payloadLength > 0 ? "true" : "false"}>{content}</button>
              : <div key={row.frameNumber} className={className} data-testid={`packet-row-${row.frameNumber}`} data-payload={row.tcp.payloadLength > 0 ? "true" : "false"}>{content}</div>;
          })}
        </div>
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 p-3" data-testid="selected-packet-fields">
          <div className="font-semibold text-sm text-cyan-50">Frame {packet.frameNumber} decoded fields</div>
          <div className="mt-1 text-[11px] text-slate-400" data-testid="packet-direction-classification">{forward ? "forward data-connection tuple: sender endpoint → peer endpoint" : reverse ? "reverse data-connection tuple: peer endpoint → sender endpoint" : "not part of the recorded connection tuple"} · complete IP address and port tuple used, so loopback endpoints remain distinguishable.</div>
          <div className="mt-2 grid gap-2 text-[11px] lg:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-slate-950/40 p-2"><div className="font-semibold text-slate-200">Ethernet</div><div className="mt-1 font-mono">src {packet.ethernet.source}<br />dst {packet.ethernet.destination}<br />type {packet.ethernet.type}</div></div>
            <div className="rounded-lg border border-white/10 bg-slate-950/40 p-2"><div className="font-semibold text-slate-200">IPv4</div><div className="mt-1 font-mono">{packet.ip.source} → {packet.ip.destination}<br />len {packet.ip.totalLength} · ttl {packet.ip.ttl}<br />proto {packet.ip.protocol} · hdr {packet.ip.headerLength}</div></div>
            <div className="rounded-lg border border-white/10 bg-slate-950/40 p-2"><div className="font-semibold text-slate-200">TCP</div><div className="mt-1 font-mono">{packet.tcp.sourcePort} → {packet.tcp.destinationPort}<br />seq {packet.tcp.relativeSequence} · ack {packet.tcp.relativeAcknowledgement}<br />flags {packetFlags(packet)} · hdr {packet.tcp.headerLength}</div></div>
          </div>
          <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/35 p-2 text-[11px] text-slate-300" data-testid="sequence-space-interpretation">TCP sequence numbers and application byte offsets are related but different coordinate spaces. In this connection the first payload sequence number is {base}; application payload offsets are 0–{applicationBytes - 1}. SYN and FIN consume TCP sequence-number positions but are not application payload bytes.</div>
          {packet.payloadHex && appRange ? <div className="mt-3 rounded-lg border border-sky-300/25 bg-sky-300/8 p-2"><div className="text-[10px] uppercase tracking-[0.14em] text-sky-100">captured payload · {packet.tcp.payloadLength} bytes</div><div className="mt-1 text-[11px] text-sky-100/80" data-testid="selected-payload-application-range">application byte offsets {appRange.start}–{appRange.endExclusive - 1}; corresponding TCP sequence range {packet.tcp.relativeSequence}–{packet.tcp.relativeSequence + packet.tcp.payloadLength - 1}; SHA-256 {packet.payloadSha256?.slice(0, 16)}…</div><details className="mt-2 rounded-lg border border-white/10 bg-slate-950/35 px-2 py-1.5" data-testid="selected-packet-payload-details"><summary className="cursor-pointer text-[11px] font-semibold text-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Inspect raw captured payload bytes</summary><div className="mt-2 break-all font-mono text-[11px] text-sky-50" data-testid="selected-packet-payload">{packet.payloadHex}</div></details></div> : null}
          {packet.tcp.fin ? <div className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/8 p-2 text-[11px] text-amber-50" data-testid="fin-sequence-space-note">FIN consumes one TCP sequence-number position. It carries no application payload byte at offset {applicationBytes} or any other offset.</div> : null}
          {reverse && packet.tcp.ack ? <div className="mt-3 rounded-lg border border-emerald-300/25 bg-emerald-300/8 p-2 text-[11px] text-emerald-50" data-testid="ack-interpretation">ACK {packet.tcp.relativeAcknowledgement} names the next expected TCP sequence number for the sender's stream. {ackedApplicationBytes ? <>It covers application payload offsets {ackedApplicationBytes.start}–{ackedApplicationBytes.endExclusive - 1}.</> : <>It acknowledges no application payload bytes.</>} {finAcknowledged ? <>It additionally acknowledges FIN sequence space; it does <span className="font-semibold">not</span> imply an application byte at offset {applicationBytes}.</> : null}</div> : null}
          {details ? <div className="mt-3 grid gap-2 font-mono text-[11px] text-slate-300 sm:grid-cols-2"><span>TCP checksum {packet.tcp.checksum} · status {packet.tcp.checksumStatus}</span><span>window {packet.tcp.windowSize} · MSS {packet.tcp.advertisedMss ?? "not present"}</span><span>frame {packet.frameLength} bytes · captured {packet.capturedLength}</span><span>captured on {item.capture.host}/{item.capture.interface}</span></div> : null}
        </div>
      </div>
    </section>
  );
}

export function HandshakeVisual() {
  const stage = useGuidedVisualStage();
  const selected = small.handshake[Math.max(0, Math.min(small.handshake.length - 1, stage - 1))] || small.handshake[0];
  return (
    <div className="space-y-4" data-testid="tcp-handshake-mechanism" data-guided-stage={stage}>
      <SocketObjectsVisual sectionId="2.2" />
      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3" data-testid="tcp-handshake-evidence"><div className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-200">Recorded handshake rows · local observations, not a global clock</div><div className="mt-3 grid gap-2 sm:grid-cols-3">{small.handshake.map((row) => <div key={row.frameNumber} className={cx("rounded-xl border p-3 text-left", selected.frameNumber === row.frameNumber && stage >= 1 ? "border-cyan-300/45 bg-cyan-300/12" : "border-white/10 bg-white/4")}><div className="font-mono text-xs text-cyan-100">frame {row.frameNumber} · {tcpFlagNames(row.flags)}</div><div className="mt-1 font-mono text-[11px] text-slate-300">{row.sourceIp}:{row.sourcePort} → {row.destinationIp}:{row.destinationPort}<br />seq {row.relativeSequence} · ack {row.relativeAcknowledgement}</div></div>)}</div><SmallNote testId="handshake-row-detail">{stage >= 1 ? <>Frame {selected.frameNumber}: {tcpFlagNames(selected.flags)}. </> : null}connect() completion on A and accept() return on B are separate local application observations; the listener remains distinct from the accepted connected socket.</SmallNote></div>
    </div>
  );
}

export function ByteStreamVisual() {
  const stage = useGuidedVisualStage();
  const pattern = stage >= 3 ? 1 : 0;
  const patterns = [["H", "EL", "LO"], ["HE", "LL", "O"]] as const;
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="foundation-byte-stream" data-guided-stage={stage}><div className="grid gap-3 lg:grid-cols-3"><FoundationBox title="application writes" tone="memory" active={stage >= 0}><span className="font-mono">HE | LLO</span></FoundationBox><FoundationBox title="continuous stream positions" tone="memory" active={stage >= 1}><div className="flex gap-1 font-mono">{["H", "E", "L", "L", "O"].map((x, i) => <span key={i} className="rounded border border-sky-300/30 px-1.5 py-1"><small>{i}</small> {x}</span>)}</div></FoundationBox><FoundationBox title="illustrative alternative packet grouping" tone="metadata" dashed><span className="font-mono">HEL | LO</span><div className="text-[11px]">not captured evidence</div></FoundationBox></div><div className="flex flex-wrap gap-2 font-mono text-xs" data-testid="selected-read-chunking">{stage >= 2 ? patterns[pattern].map((chunk) => <span key={chunk} className="rounded-lg border border-violet-300/25 bg-violet-300/10 px-2 py-1 text-violet-100">read {chunk}</span>) : <span className="text-slate-500">receive chunking appears next</span>}</div><SmallNote>Both valid receive chunkings yield HELLO. Write, segment and receive boundaries use different visual patterns because they are not the same kind of boundary.</SmallNote></div>;
}

export function TcpSendPathVisual() {
  const stage = useGuidedVisualStage();
  const submitted = stage >= 1;
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="tcp-send-path-visual" data-guided-stage={stage}><div className="grid gap-2 sm:grid-cols-4">{["CPU user mode · Python sendall()", "system-call entry", "CPU kernel mode · copy from user memory", "return to user mode · TCP state remains"].map((x, i) => <div key={x} className={cx("rounded-xl border px-2 py-2 text-center text-xs", submitted ? "border-amber-300/35 bg-amber-300/10 text-amber-50" : "border-white/10 text-slate-500")}>{x}</div>)}</div><div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] xl:items-center"><FoundationBox title="RAM · mapped user buffer" tone="memory" testId="send-user-memory"><ByteCells compact bytes={hello} /><div className="mt-1 font-mono text-[11px]">source remains HELLO</div></FoundationBox><div><LinkLine label="CPU-mediated copy path · control syscall separate" kind="payload" direction="right" active={submitted} /><LinkLine label="system call control" kind="instruction" direction="right" active={submitted} /></div><FoundationBox title="RAM · kernel-managed socket send storage" tone="kernel" active={submitted} testId="kernel-send-storage">{submitted ? <ByteCells compact bytes={hello} /> : <div className="text-xs text-slate-500">no submitted bytes yet</div>}<div className="mt-1 font-mono text-[11px]">ordered range 0–4 + TCP metadata · not necessarily contiguous</div></FoundationBox></div><SmallNote>The CPU executes both application and kernel instructions. The copy is between memory locations through CPU/cache; the kernel is not a hardware box in the payload path. Exact send-queue occupancy after return is not claimed without evidence.</SmallNote></div>;
}

export function TcpSegmentationVisual({ selectedFrame, onSelectFrame, guidedStage }: { selectedFrame?: number | null; onSelectFrame?: (frame: number) => void; guidedStage?: number }) {
  const contextStage = useGuidedVisualStage();
  const stage = guidedStage ?? contextStage;
  const frame = selectedFrame ?? large.payloadSegments[0]?.frameNumber ?? null;
  const appRanges = large.browserValidation.applicationRanges;
  const segments = appRanges.map((range) => ({ id: `segment-${range.frameNumber}`, frameNumber: range.frameNumber, label: `frame ${range.frameNumber}`, start: range.start, endExclusive: range.endExclusive }));
  const reads = large.receiveEvents.map((event, index) => ({ id: `read-${index}`, label: `read ${index + 1}`, start: event.offset, endExclusive: event.offset + event.count }));
  const stageSegment = stage >= 1 && stage <= 3 ? segments[stage - 1] : undefined;
  const selectedSegment = stageSegment || (stage < 4 ? segments.find((x) => x.frameNumber === frame) : undefined);
  const comparingBoundaries = stage >= 4;
  const intersectingReads = selectedSegment ? reads.filter((read) => read.start < selectedSegment.endExclusive && selectedSegment.start < read.endExclusive).map((read) => read.id) : [];
  const visibleReadHighlights = comparingBoundaries ? reads.map((read) => read.id) : intersectingReads;
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="foundation-tcp-segmentation" data-guided-stage={stage}>
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">One application send · application offsets 0–4095</div>
          <RangeBar ranges={[{ id: "sendall", label: "sendall(buffer) · 4096 bytes", start: 0, endExclusive: 4096 }]} total={4096} selected={stage === 0 ? "sendall" : null} testId="application-send-range" />
        </div>
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">Captured TCP segment boundaries · same application-byte coordinate system</div>
          <RangeBar ranges={segments} total={4096} selected={stageSegment?.id ?? null} testId="captured-segment-ranges" />
        </div>
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">Actual application read boundaries · receive sizes need not match segment sizes</div>
          <RangeBar ranges={reads} total={4096} highlighted={visibleReadHighlights} testId="application-read-ranges" />
        </div>
        <SmallNote testId="selected-byte-range">
          {stageSegment ? `Captured frame ${stageSegment.frameNumber} contains application byte positions ${stageSegment.start}–${stageSegment.endExclusive - 1}. Its TCP sequence number names the first byte in TCP sequence space; ACKs name next expected TCP sequence numbers.` : comparingBoundaries ? "Segment boundaries and application-read boundaries are different descriptions of the same ordered byte stream. All recorded segment and read boundaries are shown together here." : "The original application byte range is one contiguous sendall buffer before transport segmentation is examined."} The rows describe the same application byte stream but their boundaries differ.
        </SmallNote>
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 p-2 text-[11px] text-cyan-50" data-testid="synchronized-selection-state">
          {stageSegment ? `payload frame ${stageSegment.frameNumber} is synchronized with the compact packet evidence; intersecting receive ranges: ${intersectingReads.length ? intersectingReads.map((id) => reads.find((read) => read.id === id)?.label ?? id).join(", ") : "none"}` : comparingBoundaries ? "comparison mode · no single payload frame is selected" : "the complete application send range is selected before packet inspection"}
        </div>
      </div>
    </div>
  );
}

function SelectedTcpSegmentEvidence({ frameNumber }: { frameNumber: number }) {
  const segment = large.payloadSegments.find((item) => item.frameNumber === frameNumber);
  const range = large.browserValidation.applicationRanges.find((item) => item.frameNumber === frameNumber);
  if (!segment || !range) return null;
  return (
    <div className="grid gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/7 p-3 text-sm text-cyan-50 sm:grid-cols-4" data-testid="selected-packet-essential-fields">
      <div><div className="text-[10px] uppercase tracking-[0.14em] text-cyan-100/70">Captured frame</div><div className="mt-1 font-mono font-semibold">Frame {frameNumber}</div></div>
      <div><div className="text-[10px] uppercase tracking-[0.14em] text-cyan-100/70">TCP payload</div><div className="mt-1 font-mono">{segment.tcpPayloadLength} bytes</div></div>
      <div><div className="text-[10px] uppercase tracking-[0.14em] text-cyan-100/70">Application offsets</div><div className="mt-1 font-mono">{range.start}–{range.endExclusive - 1}</div></div>
      <div><div className="text-[10px] uppercase tracking-[0.14em] text-cyan-100/70">TCP sequence start</div><div className="mt-1 font-mono">{segment.relativeSequenceStart}</div></div>
    </div>
  );
}

export function NicTransmitVisual() {
  const stage = useGuidedVisualStage();
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="nic-transmit-visual" data-guided-stage={stage}><div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"><FoundationBox title="CPU kernel mode · TCP/IP + driver" tone="cpu" active={stage>=1}>protocol processing; driver arranges metadata</FoundationBox><FoundationBox title="descriptor metadata" tone="metadata" active={stage>=1}><div className="font-mono text-xs">pointer → prepared memory<br />length · flags<br />descriptor contains no payload bytes</div></FoundationBox><FoundationBox title="NIC / device" tone="device" active={stage>=2}>{stage>=2?"reads prepared memory through interconnect":"waiting for prepared work"}</FoundationBox></div><div className="grid gap-2 lg:grid-cols-2"><LinkLine label="control metadata: stack/driver → descriptor → NIC" kind="metadata" active={stage>=1}/><LinkLine label="payload: RAM → interconnect → NIC → Ethernet" kind="payload" active={stage>=2} testId="nic-payload-route"/></div><FoundationBox title="network transmission" tone="network" active={stage>=3}>{stage>=3?"Ethernet frame leaves the NIC":"no frame transmitted yet"}</FoundationBox><SmallNote>Representative physical NIC. The packet capture proves packet content, not exact virtual-device/hypervisor or physical hardware activity. Implementations and offload boundaries vary.</SmallNote></div>;
}

export function NicReceiveVisual() {
  const stage = useGuidedVisualStage();
  const received = stage >= 1;
  const inspect = stage >= 2;
  const outOfOrder = stage >= 3;
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="nic-receive-visual" data-guided-stage={stage}><div className="grid gap-2 lg:grid-cols-5">{["wire → NIC","NIC → kernel RX storage (representative DMA)","CPU driver/IP/TCP processing","four-tuple demultiplexing","socket ordered receive ranges"].map((x,i)=><div key={x} className={cx("rounded-xl border px-2 py-2 text-center text-xs",received?"border-cyan-300/30 bg-cyan-300/8 text-cyan-50":"border-white/10 text-slate-500")}>{x}</div>)}</div><div className="grid gap-3 xl:grid-cols-3"><FoundationBox title="correct connected socket" tone="kernel" active={received}>{small.endpoints.senderLocal[0]}:{small.endpoints.senderLocal[1]} ↔ {small.endpoints.senderPeer[0]}:{small.endpoints.senderPeer[1]}</FoundationBox><FoundationBox title="another socket" tone="neutral" dashed>same host, different four-tuple; not selected</FoundationBox><FoundationBox title="receiver application buffer" tone="memory">{<ByteCells compact bytes={zeros5}/>}<div className="text-[11px]">still zeros before recv()</div></FoundationBox></div>{outOfOrder?<div className="rounded-xl border border-fuchsia-300/25 bg-fuchsia-300/8 p-3" data-testid="conceptual-out-of-order-example"><div className="text-[10px] uppercase tracking-[0.14em] text-fuchsia-100">conceptual teaching example · not recorded capture evidence</div><div className="mt-2 grid gap-2 lg:grid-cols-3"><div className="rounded-lg border border-white/10 bg-slate-950/35 p-2"><div className="font-mono text-xs text-slate-100">arrival order</div><div className="mt-1 font-mono text-[11px] text-fuchsia-100">later bytes 3–4 arrive first → held<br />missing earlier bytes 0–2 arrive later</div></div><div className="rounded-lg border border-white/10 bg-slate-950/35 p-2"><div className="font-mono text-xs text-slate-100">TCP receive reassembly</div><div className="mt-1 font-mono text-[11px]">held: 3–4<br />gap filled: 0–2<br />contiguous stream now 0–4</div></div><div className="rounded-lg border border-white/10 bg-slate-950/35 p-2"><div className="font-mono text-xs text-slate-100">application observation</div><div className="mt-1 font-mono text-[11px] text-emerald-100">recv returns ordered bytes 0–4 only after the missing range is available</div></div></div></div>:null}{inspect?<pre className="max-h-44 overflow-auto rounded-xl bg-slate-950/80 p-3 font-mono text-[11px] text-slate-300" data-testid="socket-ss-evidence">{small.ssSnapshots["after-send-before-read"]}</pre>:null}<SmallNote>No claim that one interrupt equals one packet or that every internal move copies bytes. The out-of-order panel is a compact conceptual TCP behavior illustration; the recorded HELLO capture rows remain the evidence for this lesson.</SmallNote></div>;
}

export function ReceiveBytesVisual() {
  const stage = useGuidedVisualStage();
  const index = Math.max(0, Math.min(3, stage));
  const events = small.receiveEvents;
  const filled = events.slice(0,index).flatMap((event)=>Array.from({length:event.count},(_,i)=>hello[event.offset+i]));
  const cells = Array.from({length:5},(_,i)=>filled[i] ?? "00");
  const event = events[index];
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="receive-bytes-visual"><div className="grid gap-2 sm:grid-cols-4">{["CPU user mode recv_into","kernel-managed receive storage","CPU kernel copy","return count + user buffer update"].map(x=><div key={x} className={cx("rounded-xl border px-2 py-2 text-center text-xs",index?"border-amber-300/30 bg-amber-300/8 text-amber-50":"border-white/10 text-slate-500")}>{x}</div>)}</div><div className="grid gap-3 xl:grid-cols-2"><FoundationBox title="kernel receive storage" tone="kernel"><ByteCells compact bytes={hello}/></FoundationBox><FoundationBox title="application destination buffer" tone="memory" testId="receive-destination-buffer"><ByteCells compact bytes={cells}/><div className="mt-1 font-mono text-[11px]">{index}/3 recorded reads complete</div></FoundationBox></div><SmallNote testId="receive-event-result">{index?`Recorded read ${index}: offset ${events[index-1].offset}, requested ${events[index-1].requested}, returned ${events[index-1].count}.`:`Next actual read requests ${event?.requested ?? 0} bytes; the --chunk cap is a deliberate application choice.`} Read sizes are application observations, not packet boundaries.</SmallNote></div>;
}

export function ReceiveOrderingVisual() {
  const early = tcpEvidence.cases["small-early"];
  const stage = useGuidedVisualStage();
  const selected = stage >= 2 ? "late" as const : "early" as const;
  const released = stage === 1 || stage >= 3;
  const item = selected==="early"?early:small;
  const lanes = ["sender app","sender TCP","receiver TCP","receiver app"];
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="tcp-read-order-evidence"><div className="grid gap-2 sm:grid-cols-4">{lanes.map((lane)=><div key={lane} className="rounded-xl border border-white/10 bg-white/4 p-2"><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{lane}</div><div className="mt-2 text-xs text-slate-200">{selected==="early"?lane==="receiver app"?"recv_enter recorded, blocked before data":lane==="sender app"?(released?"gate released; sendall returns":"sender gated before send"):"connection established":lane==="sender app"?"sendall before receiver reads":lane==="receiver TCP"?"capture shows arrival/ACK":lane==="receiver app"?(released?"gate released; recv returns":"receiver gate blocks first read"):"kernel receive storage holds bytes"}</div></div>)}</div><div className="grid gap-3 xl:grid-cols-2"><FoundationBox title="kernel-managed receive storage" tone="kernel" active={selected==="late"}>{selected==="late"?<ByteCells compact bytes={hello}/>:(released?<ByteCells compact bytes={hello}/>:<div className="text-xs">empty while receiver waits</div>)}<div className="text-[11px]">{selected==="late"?"five unread bytes before application consumption":"early-read case has no unread bytes until sender release"}</div></FoundationBox><FoundationBox title="recorded local evidence" tone="neutral"><div className="font-mono text-[11px]">port {item.port} · reads {item.receiveEvents.map(e=>`${e.count}/${e.requested}`).join(", ")}</div>{item.ssSnapshots["after-send-before-read"]?<pre className="mt-2 max-h-28 overflow-auto rounded bg-slate-950 p-2 font-mono text-[10px]">{item.ssSnapshots["after-send-before-read"]}</pre>:<div className="mt-2 text-[11px]">receiver-waiting gate observation recorded; no fabricated cross-host clock</div>}</FoundationBox></div><SmallNote>Ordering is based on explicit operator gates and per-host logs, not a synchronized cross-host timeline. Both cases deliver the same ordered stream.</SmallNote></div>;
}

export function LoopbackComparisonVisual() {
  const stage = useGuidedVisualStage();
  const mode = stage >= 1 ? "remote" as const : "loopback" as const;
  const loop=tcpEvidence.cases.loopback;
  const item=mode==="loopback"?loop:small;
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="tcp-loopback-evidence">{mode==="loopback"?<div className="rounded-xl border border-white/10 p-3"><div className="grid gap-2 lg:grid-cols-3"><FoundationBox title="process A address space" tone="memory">sender</FoundationBox><FoundationBox title="one Linux kernel + one physical RAM" tone="kernel" active>software loopback path on lo<br />no physical Ethernet traversal</FoundationBox><FoundationBox title="process B address space" tone="memory">receiver</FoundationBox></div><LinkLine label="socket/TCP/IP software loopback route inside one host" kind="network" direction="both"/></div>:<div className="grid gap-2 lg:grid-cols-3"><FoundationBox title="Server A process + RAM + NIC" tone="memory">sender</FoundationBox><FoundationBox title="Ethernet data0" tone="network" active>physical network path</FoundationBox><FoundationBox title="Server B process + RAM + NIC" tone="memory">receiver</FoundationBox></div>}<SmallNote>{item.endpoints.senderLocal[0]}:{item.endpoints.senderLocal[1]} → {item.endpoints.senderPeer[0]}:{item.endpoints.senderPeer[1]} · capture {item.capture.host}/{item.capture.interface}. Loopback link-layer details may differ; no physical frame traversal is claimed.</SmallNote></div>;
}

function SynchronizedTcpSegmentationInspection() {
  const stage = useGuidedVisualStage();
  const payloadFrame = stage >= 1 && stage <= 3 ? large.payloadSegments[stage - 1]?.frameNumber : null;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] xl:items-start">
        <TcpSegmentationVisual guidedStage={stage} selectedFrame={payloadFrame} />
        {payloadFrame ? <SelectedTcpSegmentEvidence frameNumber={payloadFrame} /> : <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3 text-sm leading-6 text-slate-300" data-testid="segmentation-primary-guidance">The aligned rows are the primary evidence. Open technical inspection only when the relationship among the ranges is clear.</div>}
      </div>
      <details className="rounded-xl border border-white/10 bg-white/4 p-3" data-testid="optional-tcp-technical-inspection">
        <summary className="cursor-pointer text-sm font-semibold text-cyan-100">Inspect complete packet table, decoded fields, checksums and raw bytes</summary>
        <div className="mt-3"><PacketInspector item={large} testId="tcp-segmentation-inspector" largeDefault selectedFrame={payloadFrame ?? undefined} /></div>
      </details>
    </div>
  );
}

function TcpEvidenceComparisonVisual() {
  const stage = useGuidedVisualStage();
  const smallPayloadFrame = small.payloadSegments[0]?.frameNumber ?? small.packets[0].frameNumber;
  const largePayloadFrame = large.payloadSegments[0]?.frameNumber ?? large.packets[0].frameNumber;
  const finAckFrame = small.packets.find((row) => row.tcp.fin
    && row.tcp.ack
    && row.ip.source === small.endpoints.senderPeer[0]
    && row.tcp.sourcePort === small.endpoints.senderPeer[1]
    && row.ip.destination === small.endpoints.senderLocal[0]
    && row.tcp.destinationPort === small.endpoints.senderLocal[1]
    && row.tcp.relativeAcknowledgement > small.browserValidation.baseSequence + small.browserValidation.bytes)?.frameNumber ?? small.packets[small.packets.length - 1].frameNumber;
  if (stage === 0) {
    return <div className="space-y-4" data-testid="tcp-small-evidence-stage"><PacketInspector item={small} testId="tcp-evidence-packet-inspector" selectedFrame={smallPayloadFrame} /><SmallNote>The small captured transfer establishes the ordered HELLO payload before it is compared with the large transfer.</SmallNote></div>;
  }
  if (stage === 1) {
    return <div className="space-y-4" data-testid="tcp-large-evidence-stage"><PacketInspector item={large} testId="tcp-large-packet-inspector" largeDefault selectedFrame={largePayloadFrame} /><SmallNote>The large capture shows how one application buffer can cross several recorded TCP segment boundaries.</SmallNote></div>;
  }
  if (stage === 2) {
    return (
      <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="tcp-packet-application-range-correlation">
        <div className="grid gap-3 xl:grid-cols-2">
          <FoundationBox title="small capture · one payload packet" tone="metadata"><div className="font-mono text-xs">frame {smallPayloadFrame} · {small.browserValidation.bytes} application bytes<br />reads {small.receiveEvents.map((event) => `${event.count}/${event.requested}`).join(", ")}</div></FoundationBox>
          <FoundationBox title="large capture · multiple payload segments" tone="metadata"><div className="font-mono text-xs">frames {large.payloadSegments.map((segment) => segment.frameNumber).join(", ")} · {large.browserValidation.bytes} application bytes<br />reads {large.receiveEvents.map((event) => `${event.count}/${event.requested}`).join(", ")}</div></FoundationBox>
        </div>
        <RangeBar ranges={large.browserValidation.applicationRanges.map((range) => ({ id: `frame-${range.frameNumber}`, label: `frame ${range.frameNumber}`, start: range.start, endExclusive: range.endExclusive }))} total={large.browserValidation.bytes} testId="evidence-large-packet-byte-ranges" />
        <RangeBar ranges={large.receiveEvents.map((event, index) => ({ id: `read-${index}`, label: `read ${index + 1}`, start: event.offset, endExclusive: event.offset + event.count }))} total={large.browserValidation.bytes} testId="evidence-large-read-byte-ranges" />
        <SmallNote>Packet ranges and application-read ranges are different evidence-derived descriptions of the same ordered byte stream.</SmallNote>
      </div>
    );
  }
  return (
    <div className="space-y-4" data-testid="tcp-evidence-boundary-stage">
      <PacketInspector item={small} testId="tcp-fin-ack-inspector" selectedFrame={finAckFrame} />
      <div className="rounded-xl border border-amber-300/25 bg-amber-300/8 p-3 text-sm leading-6 text-amber-50" data-testid="tcp-evidence-conclusion-boundary">The captures establish packet structure, sequence/acknowledgement positions and local application observations. TCP acknowledgements identify the next expected sequence number. SYN and FIN each consume one sequence-number position, while an ACK flag by itself does not. In our recorded FIN-only packets, no additional application payload bytes are present; the evidence does not by itself prove every internal kernel, device or hypervisor mechanism.</div>
    </div>
  );
}

export function TcpFoundationVisual({ sectionId }: { sectionId: string }) {
  if (sectionId === "2.1" || sectionId === "2.2") return <SocketObjectsVisual sectionId={sectionId} />;
  if (sectionId === "2.3") return <HandshakeVisual />;
  if (sectionId === "2.4") return <ByteStreamVisual />;
  if (sectionId === "2.5") return <TcpSendPathVisual />;
  if (sectionId === "2.6") return <SynchronizedTcpSegmentationInspection />;
  if (sectionId === "2.7") return <NicTransmitVisual />;
  if (sectionId === "2.8") return <NicReceiveVisual />;
  if (sectionId === "2.9") return <ReceiveBytesVisual />;
  if (sectionId === "2.10") return <ReceiveOrderingVisual />;
  if (sectionId === "2.11") return <LoopbackComparisonVisual />;
  return <TcpEvidenceComparisonVisual />;
}
