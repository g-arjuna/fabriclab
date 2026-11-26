"use client";

import { useMemo, useState } from "react";

import { tcpEvidence, tcpFlagNames, type TcpCaseEvidence, type TcpDetailedPacket } from "@/lib/practical/tcpEvidence";

import { cx } from "./visuals";
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
  const [created, setCreated] = useState(connectable);
  const [connected, setConnected] = useState(false);
  const ep = small.endpoints;
  const fourTuple = `${ep.senderLocal[0]}:${ep.senderLocal[1]} ↔ ${ep.senderPeer[0]}:${ep.senderPeer[1]}`;
  if (!connectable) {
    return (
      <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="foundation-socket-objects">
        <ActionRow><FoundationAction testId="create-tcp-socket" active={created} onClick={() => setCreated(true)}>Create a TCP socket</FoundationAction></ActionRow>
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
      <ActionRow><FoundationAction testId="connect-to-server-b" active={connected} onClick={() => setConnected(true)}>Connect to Server B</FoundationAction></ActionRow>
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

export function PacketInspector({ item = small, testId = "fabriclab-packet-inspector", largeDefault = false }: { item?: TcpCaseEvidence; testId?: string; largeDefault?: boolean }) {
  const initial = (largeDefault ? large.payloadSegments[0]?.frameNumber : item.payloadSegments[0]?.frameNumber) ?? item.packets[0]?.frameNumber;
  const [selectedFrame, setSelectedFrame] = useState(initial);
  const [details, setDetails] = useState(false);
  const packet = item.packets.find((row) => row.frameNumber === selectedFrame) || item.packets[0];
  const forwardSource = item.endpoints.senderLocal[0];
  const base = item.browserValidation.baseSequence;
  const appRange = packet.payloadHex && packet.ip.source === forwardSource ? { start: packet.tcp.relativeSequence - base, endExclusive: packet.tcp.relativeSequence - base + packet.tcp.payloadLength } : null;
  const ackedRange = !packet.payloadHex && packet.ip.source !== forwardSource && packet.tcp.relativeAcknowledgement > base ? { start: 0, endExclusive: packet.tcp.relativeAcknowledgement - base } : null;
  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3" data-testid={testId}>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-200">FabricLab packet inspection · actual TShark decode</div><div className="mt-1 text-[11px] text-slate-500">Not Wireshark GUI; backed by the committed PCAP and deterministic TShark output. <a className="text-cyan-200 underline underline-offset-4" href={item.capture.downloadPath}>Download the original PCAP</a>.</div></div><FoundationAction testId="toggle-packet-details" active={details} onClick={() => setDetails((value) => !value)}>Checksums and optional detail</FoundationAction></div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="space-y-1" data-testid="selectable-packet-rows">
          {item.packets.map((row) => <button type="button" key={row.frameNumber} onClick={() => setSelectedFrame(row.frameNumber)} className={cx("grid w-full grid-cols-[3rem_minmax(0,1fr)_5rem_4rem] gap-2 rounded-lg border px-2 py-1.5 text-left font-mono text-[11px]", selectedFrame === row.frameNumber ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-50" : "border-white/10 bg-white/4 text-slate-300 hover:border-cyan-300/25")} data-testid={`packet-row-${row.frameNumber}`}><span>frame {row.frameNumber}</span><span className="truncate">{row.ip.source}:{row.tcp.sourcePort} → {row.ip.destination}:{row.tcp.destinationPort}</span><span>{packetFlags(row)}</span><span>{row.tcp.payloadLength || "—"}</span></button>)}
        </div>
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 p-3" data-testid="selected-packet-fields">
          <div className="font-semibold text-sm text-cyan-50">Frame {packet.frameNumber} decoded fields</div>
          <div className="mt-2 grid gap-2 text-[11px] lg:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-slate-950/40 p-2"><div className="font-semibold text-slate-200">Ethernet</div><div className="mt-1 font-mono">src {packet.ethernet.source}<br />dst {packet.ethernet.destination}<br />type {packet.ethernet.type}</div></div>
            <div className="rounded-lg border border-white/10 bg-slate-950/40 p-2"><div className="font-semibold text-slate-200">IPv4</div><div className="mt-1 font-mono">{packet.ip.source} → {packet.ip.destination}<br />len {packet.ip.totalLength} · ttl {packet.ip.ttl}<br />proto {packet.ip.protocol} · hdr {packet.ip.headerLength}</div></div>
            <div className="rounded-lg border border-white/10 bg-slate-950/40 p-2"><div className="font-semibold text-slate-200">TCP</div><div className="mt-1 font-mono">{packet.tcp.sourcePort} → {packet.tcp.destinationPort}<br />seq {packet.tcp.relativeSequence} · ack {packet.tcp.relativeAcknowledgement}<br />flags {packetFlags(packet)} · hdr {packet.tcp.headerLength}</div></div>
          </div>
          {packet.payloadHex ? <div className="mt-3 rounded-lg border border-sky-300/25 bg-sky-300/8 p-2"><div className="text-[10px] uppercase tracking-[0.14em] text-sky-100">captured payload · {packet.tcp.payloadLength} bytes</div><div className="mt-1 break-all font-mono text-[11px] text-sky-50" data-testid="selected-packet-payload">{packet.payloadHex}</div><div className="mt-1 text-[11px] text-sky-100/80">application byte positions {appRange?.start}–{(appRange?.endExclusive ?? 1) - 1}; SHA-256 {packet.payloadSha256?.slice(0, 16)}…</div></div> : null}
          {ackedRange ? <div className="mt-3 rounded-lg border border-emerald-300/25 bg-emerald-300/8 p-2 text-[11px] text-emerald-50">ACK names next expected sequence byte; it covers application bytes {ackedRange.start}–{ackedRange.endExclusive - 1}.</div> : null}
          {details ? <div className="mt-3 grid gap-2 font-mono text-[11px] text-slate-300 sm:grid-cols-2"><span>TCP checksum {packet.tcp.checksum} · status {packet.tcp.checksumStatus}</span><span>window {packet.tcp.windowSize} · MSS {packet.tcp.advertisedMss ?? "not present"}</span><span>frame {packet.frameLength} bytes · captured {packet.capturedLength}</span><span>captured on {item.capture.host}/{item.capture.interface}</span></div> : null}
        </div>
      </div>
    </section>
  );
}

export function HandshakeVisual() {
  const [selected, setSelected] = useState(1);
  const packet = small.handshake.find((row) => row.frameNumber === selected) || small.handshake[0];
  return (
    <div className="space-y-4" data-testid="tcp-handshake-mechanism">
      <SocketObjectsVisual sectionId="2.2" />
      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3" data-testid="tcp-handshake-evidence"><div className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-200">Recorded handshake rows · local observations, not a global clock</div><div className="mt-3 grid gap-2 sm:grid-cols-3">{small.handshake.map((row) => <button type="button" key={row.frameNumber} onClick={() => setSelected(row.frameNumber)} className={cx("rounded-xl border p-3 text-left", selected === row.frameNumber ? "border-cyan-300/45 bg-cyan-300/12" : "border-white/10 bg-white/4")}><div className="font-mono text-xs text-cyan-100">frame {row.frameNumber} · {tcpFlagNames(row.flags)}</div><div className="mt-1 font-mono text-[11px] text-slate-300">{row.sourceIp}:{row.sourcePort} → {row.destinationIp}:{row.destinationPort}<br />seq {row.relativeSequence} · ack {row.relativeAcknowledgement}</div></button>)}</div><SmallNote testId="handshake-row-detail">Frame {packet.frameNumber}: {tcpFlagNames(packet.flags)}. connect() completion on A and accept() return on B are separate local application observations; the listener remains distinct from the accepted connected socket.</SmallNote></div>
    </div>
  );
}

export function ByteStreamVisual() {
  const [pattern, setPattern] = useState<0 | 1>(0);
  const patterns = [["H", "EL", "LO"], ["HE", "LL", "O"]] as const;
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="foundation-byte-stream"><div className="grid gap-3 lg:grid-cols-3"><FoundationBox title="application writes" tone="memory"><span className="font-mono">HE | LLO</span></FoundationBox><FoundationBox title="continuous stream positions" tone="memory"><div className="flex gap-1 font-mono">{["H", "E", "L", "L", "O"].map((x, i) => <span key={i} className="rounded border border-sky-300/30 px-1.5 py-1"><small>{i}</small> {x}</span>)}</div></FoundationBox><FoundationBox title="illustrative alternative packet grouping" tone="metadata" dashed><span className="font-mono">HEL | LO</span><div className="text-[11px]">not captured evidence</div></FoundationBox></div><ActionRow><FoundationAction testId="byte-stream-pattern-toggle" active={pattern === 1} onClick={() => setPattern(pattern === 0 ? 1 : 0)}>Choose another possible read chunking</FoundationAction></ActionRow><div className="flex flex-wrap gap-2 font-mono text-xs" data-testid="selected-read-chunking">{patterns[pattern].map((chunk) => <span key={chunk} className="rounded-lg border border-violet-300/25 bg-violet-300/10 px-2 py-1 text-violet-100">read {chunk}</span>)}</div><SmallNote>Both valid receive chunkings yield HELLO. Write, segment and receive boundaries use different visual patterns because they are not the same kind of boundary.</SmallNote></div>;
}

export function TcpSendPathVisual() {
  const [submitted, setSubmitted] = useState(false);
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="tcp-send-path-visual"><ActionRow><FoundationAction testId="submit-five-bytes" active={submitted} onClick={() => setSubmitted(true)}>Submit the five bytes</FoundationAction></ActionRow><div className="grid gap-2 sm:grid-cols-4">{["CPU user mode · Python sendall()", "system-call entry", "CPU kernel mode · copy from user memory", "return to user mode · TCP state remains"].map((x, i) => <div key={x} className={cx("rounded-xl border px-2 py-2 text-center text-xs", submitted ? "border-amber-300/35 bg-amber-300/10 text-amber-50" : "border-white/10 text-slate-500")}>{x}</div>)}</div><div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] xl:items-center"><FoundationBox title="RAM · mapped user buffer" tone="memory" testId="send-user-memory"><ByteCells compact bytes={hello} /><div className="mt-1 font-mono text-[11px]">source remains HELLO</div></FoundationBox><div><LinkLine label="CPU-mediated copy path · control syscall separate" kind="payload" direction="right" active={submitted} /><LinkLine label="system call control" kind="instruction" direction="right" active={submitted} /></div><FoundationBox title="RAM · kernel-managed socket send storage" tone="kernel" active={submitted} testId="kernel-send-storage">{submitted ? <ByteCells compact bytes={hello} /> : <div className="text-xs text-slate-500">no submitted bytes yet</div>}<div className="mt-1 font-mono text-[11px]">ordered range 0–4 + TCP metadata · not necessarily contiguous</div></FoundationBox></div><SmallNote>The CPU executes both application and kernel instructions. The copy is between memory locations through CPU/cache; the kernel is not a hardware box in the payload path. Exact send-queue occupancy after return is not claimed without evidence.</SmallNote></div>;
}

export function TcpSegmentationVisual() {
  const [selected, setSelected] = useState("segment-4");
  const [conceptual, setConceptual] = useState(false);
  const appRanges = large.browserValidation.applicationRanges;
  const segments = appRanges.map((range) => ({ id: `segment-${range.frameNumber}`, label: `frame ${range.frameNumber}`, start: range.start, endExclusive: range.endExclusive }));
  const reads = large.receiveEvents.map((event, index) => ({ id: `read-${index}`, label: `read ${index + 1}`, start: event.offset, endExclusive: event.offset + event.count }));
  const selectedSegment = segments.find((x) => x.id === selected);
  const selectedRead = reads.find((x) => x.id === selected);
  const range = selectedSegment || selectedRead;
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="foundation-tcp-segmentation"><ActionRow><FoundationAction testId="show-actual-segments" active={!conceptual} onClick={() => setConceptual(false)}>Recorded 4,096-byte transfer</FoundationAction><FoundationAction testId="show-conceptual-segments" active={conceptual} onClick={() => setConceptual(true)}>Conceptual 2500-byte example</FoundationAction></ActionRow>{conceptual ? <div className="grid gap-2 sm:grid-cols-3">{[1000,1000,500].map((x,i) => <FoundationBox key={x} title={`conceptual segment ${i+1}`} tone="network">{x} bytes · explicitly not captured</FoundationBox>)}</div> : <div className="space-y-3"><div><div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">1 · original application buffer and one sendall operation · 0–4095</div><RangeBar ranges={[{id:"sendall",label:"sendall(buffer)",start:0,endExclusive:4096}]} total={4096} selected={range ? "sendall" : null} testId="application-send-range" /></div><div><div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">2 · captured TCP segment boundaries · select one</div><RangeBar ranges={segments} total={4096} selected={selected} onSelect={setSelected} testId="captured-segment-ranges" /></div><div><div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">3 · actual application receive boundaries · select one</div><RangeBar ranges={reads} total={4096} selected={selected} onSelect={setSelected} testId="application-read-ranges" /></div><SmallNote testId="selected-byte-range">{selectedSegment ? `Captured frame ${selectedSegment.label.split(" ")[1]} contains application byte positions ${selectedSegment.start}–${selectedSegment.endExclusive - 1}. Its sequence number names the first byte in that segment; ACKs name next expected bytes.` : selectedRead ? `Application ${selectedRead.label} returned byte positions ${selectedRead.start}–${selectedRead.endExclusive - 1}.` : "Select a segment or application read."} The three rows describe the same byte stream but their boundaries differ.</SmallNote><div className="grid gap-2 lg:grid-cols-3">{large.payloadSegments.map((segment) => <div key={segment.frameNumber} className="rounded-xl border border-white/10 p-2 font-mono text-[11px] text-slate-300"><span className="text-slate-500">frame {segment.frameNumber}</span> [Ethernet 14][IP 20][TCP {large.packets.find(p=>p.frameNumber===segment.frameNumber)?.tcp.headerLength ?? "actual"}][payload {segment.tcpPayloadLength}]</div>)}</div></div>}</div>;
}

export function NicTransmitVisual() {
  const [stage, setStage] = useState(0);
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="nic-transmit-visual"><ActionRow><FoundationAction testId="prepare-descriptor" active={stage>=1} onClick={()=>setStage(1)}>Prepare transmit descriptor</FoundationAction><FoundationAction testId="nic-read-memory" active={stage>=2} disabled={stage<1} onClick={()=>setStage(2)}>NIC accesses prepared memory</FoundationAction><FoundationAction testId="transmit-frame" active={stage>=3} disabled={stage<2} onClick={()=>setStage(3)}>Transmit frame</FoundationAction></ActionRow><div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"><FoundationBox title="CPU kernel mode · TCP/IP + driver" tone="cpu" active={stage>=1}>protocol processing; driver arranges metadata</FoundationBox><FoundationBox title="descriptor metadata" tone="metadata" active={stage>=1}><div className="font-mono text-xs">pointer → prepared memory<br />length · flags<br />descriptor contains no payload bytes</div></FoundationBox><FoundationBox title="NIC / device" tone="device" active={stage>=2}>{stage>=2?"reads prepared memory through interconnect":"waiting for prepared work"}</FoundationBox></div><div className="grid gap-2 lg:grid-cols-2"><LinkLine label="control metadata: stack/driver → descriptor → NIC" kind="metadata" active={stage>=1}/><LinkLine label="payload: RAM → interconnect → NIC → Ethernet" kind="payload" active={stage>=2} testId="nic-payload-route"/></div><FoundationBox title="network transmission" tone="network" active={stage>=3}>{stage>=3?"Ethernet frame leaves the NIC":"no frame transmitted yet"}</FoundationBox><SmallNote>Representative physical NIC. The packet capture proves packet content, not exact virtual-device/hypervisor or physical hardware activity. Implementations and offload boundaries vary.</SmallNote></div>;
}

export function NicReceiveVisual() {
  const [received, setReceived] = useState(false);
  const [inspect, setInspect] = useState(false);
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="nic-receive-visual"><ActionRow><FoundationAction testId="receive-frame" active={received} onClick={()=>setReceived(true)}>Receive the recorded frame</FoundationAction><FoundationAction testId="inspect-socket-before-read" active={inspect} onClick={()=>setInspect(v=>!v)}>Inspect the socket before the application reads</FoundationAction></ActionRow><div className="grid gap-2 lg:grid-cols-5">{["wire → NIC","NIC → kernel RX storage (representative DMA)","CPU driver/IP/TCP processing","four-tuple demultiplexing","socket ordered receive ranges"].map((x,i)=><div key={x} className={cx("rounded-xl border px-2 py-2 text-center text-xs",received?"border-cyan-300/30 bg-cyan-300/8 text-cyan-50":"border-white/10 text-slate-500")}>{x}</div>)}</div><div className="grid gap-3 xl:grid-cols-3"><FoundationBox title="correct connected socket" tone="kernel" active={received}>{small.endpoints.senderLocal[0]}:{small.endpoints.senderLocal[1]} ↔ {small.endpoints.senderPeer[0]}:{small.endpoints.senderPeer[1]}</FoundationBox><FoundationBox title="another socket" tone="neutral" dashed>same host, different four-tuple; not selected</FoundationBox><FoundationBox title="receiver application buffer" tone="memory">{<ByteCells compact bytes={zeros5}/>}<div className="text-[11px]">still zeros before recv()</div></FoundationBox></div>{inspect?<pre className="max-h-44 overflow-auto rounded-xl bg-slate-950/80 p-3 font-mono text-[11px] text-slate-300" data-testid="socket-ss-evidence">{small.ssSnapshots["after-send-before-read"]}</pre>:null}<SmallNote>No claim that one interrupt equals one packet or that every internal move copies bytes. Out-of-order retention is a conceptual TCP behavior unless tied to capture rows.</SmallNote></div>;
}

export function ReceiveBytesVisual() {
  const [index, setIndex] = useState(0);
  const events = small.receiveEvents;
  const filled = events.slice(0,index).flatMap((event)=>Array.from({length:event.count},(_,i)=>hello[event.offset+i]));
  const cells = Array.from({length:5},(_,i)=>filled[i] ?? "00");
  const event = events[index];
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="receive-bytes-visual"><ActionRow><FoundationAction testId="read-next-available-bytes" disabled={!event} onClick={()=>setIndex(v=>v+1)}>Read the next available bytes</FoundationAction><FoundationAction testId="reset-reads" onClick={()=>setIndex(0)}>Reset reads</FoundationAction></ActionRow><div className="grid gap-2 sm:grid-cols-4">{["CPU user mode recv_into","kernel-managed receive storage","CPU kernel copy","return count + user buffer update"].map(x=><div key={x} className={cx("rounded-xl border px-2 py-2 text-center text-xs",index?"border-amber-300/30 bg-amber-300/8 text-amber-50":"border-white/10 text-slate-500")}>{x}</div>)}</div><div className="grid gap-3 xl:grid-cols-2"><FoundationBox title="kernel receive storage" tone="kernel"><ByteCells compact bytes={hello}/></FoundationBox><FoundationBox title="application destination buffer" tone="memory" testId="receive-destination-buffer"><ByteCells compact bytes={cells}/><div className="mt-1 font-mono text-[11px]">{index}/3 recorded reads complete</div></FoundationBox></div><SmallNote testId="receive-event-result">{index?`Recorded read ${index}: offset ${events[index-1].offset}, requested ${events[index-1].requested}, returned ${events[index-1].count}.`:`Next actual read requests ${event?.requested ?? 0} bytes; the --chunk cap is a deliberate application choice.`} Read sizes are application observations, not packet boundaries.</SmallNote></div>;
}

export function ReceiveOrderingVisual() {
  const early = tcpEvidence.cases["small-early"];
  const [selected, setSelected] = useState<"early"|"late">("early");
  const [released, setReleased] = useState(false);
  const item = selected==="early"?early:small;
  const lanes = ["sender app","sender TCP","receiver TCP","receiver app"];
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="tcp-read-order-evidence"><ActionRow><FoundationAction testId="receiver-reads-first-case" active={selected==="early"} onClick={()=>{setSelected("early");setReleased(false)}}>Receiver reads first</FoundationAction><FoundationAction testId="sender-sends-first-case" active={selected==="late"} onClick={()=>{setSelected("late");setReleased(false)}}>Sender sends first</FoundationAction><FoundationAction testId="release-operator-gate" active={released} onClick={()=>setReleased(true)}>Release operator gate</FoundationAction></ActionRow><div className="grid gap-2 sm:grid-cols-4">{lanes.map((lane)=><div key={lane} className="rounded-xl border border-white/10 bg-white/4 p-2"><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{lane}</div><div className="mt-2 text-xs text-slate-200">{selected==="early"?lane==="receiver app"?"recv_enter recorded, blocked before data":lane==="sender app"?(released?"gate released; sendall returns":"sender gated before send"):"connection established":lane==="sender app"?"sendall before receiver reads":lane==="receiver TCP"?"capture shows arrival/ACK":lane==="receiver app"?(released?"gate released; recv returns":"receiver gate blocks first read"):"kernel receive storage holds bytes"}</div></div>)}</div><div className="grid gap-3 xl:grid-cols-2"><FoundationBox title="kernel-managed receive storage" tone="kernel" active={selected==="late"}>{selected==="late"?<ByteCells compact bytes={hello}/>:(released?<ByteCells compact bytes={hello}/>:<div className="text-xs">empty while receiver waits</div>)}<div className="text-[11px]">{selected==="late"?"five unread bytes before application consumption":"early-read case has no unread bytes until sender release"}</div></FoundationBox><FoundationBox title="recorded local evidence" tone="neutral"><div className="font-mono text-[11px]">port {item.port} · reads {item.receiveEvents.map(e=>`${e.count}/${e.requested}`).join(", ")}</div>{item.ssSnapshots["after-send-before-read"]?<pre className="mt-2 max-h-28 overflow-auto rounded bg-slate-950 p-2 font-mono text-[10px]">{item.ssSnapshots["after-send-before-read"]}</pre>:<div className="mt-2 text-[11px]">receiver-waiting gate observation recorded; no fabricated cross-host clock</div>}</FoundationBox></div><SmallNote>Ordering is based on explicit operator gates and per-host logs, not a synchronized cross-host timeline. Both cases deliver the same ordered stream.</SmallNote></div>;
}

export function LoopbackComparisonVisual() {
  const [mode,setMode]=useState<"loopback"|"remote">("loopback");
  const loop=tcpEvidence.cases.loopback;
  const item=mode==="loopback"?loop:small;
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="tcp-loopback-evidence"><ActionRow><FoundationAction testId="same-machine-loopback" active={mode==="loopback"} onClick={()=>setMode("loopback")}>Same machine (loopback)</FoundationAction><FoundationAction testId="two-machines-ethernet" active={mode==="remote"} onClick={()=>setMode("remote")}>Two machines (Ethernet)</FoundationAction></ActionRow>{mode==="loopback"?<div className="rounded-xl border border-white/10 p-3"><div className="grid gap-2 lg:grid-cols-3"><FoundationBox title="process A address space" tone="memory">sender</FoundationBox><FoundationBox title="one Linux kernel + one physical RAM" tone="kernel" active>software loopback path on lo<br />no physical Ethernet traversal</FoundationBox><FoundationBox title="process B address space" tone="memory">receiver</FoundationBox></div><LinkLine label="socket/TCP/IP software loopback route inside one host" kind="network" direction="both"/></div>:<div className="grid gap-2 lg:grid-cols-3"><FoundationBox title="Server A process + RAM + NIC" tone="memory">sender</FoundationBox><FoundationBox title="Ethernet data0" tone="network" active>physical network path</FoundationBox><FoundationBox title="Server B process + RAM + NIC" tone="memory">receiver</FoundationBox></div>}<SmallNote>{item.endpoints.senderLocal[0]}:{item.endpoints.senderLocal[1]} → {item.endpoints.senderPeer[0]}:{item.endpoints.senderPeer[1]} · capture {item.capture.host}/{item.capture.interface}. Loopback link-layer details may differ; no physical frame traversal is claimed.</SmallNote></div>;
}

export function TcpFoundationVisual({ sectionId }: { sectionId: string }) {
  if (sectionId === "2.1" || sectionId === "2.2") return <SocketObjectsVisual sectionId={sectionId} />;
  if (sectionId === "2.3") return <HandshakeVisual />;
  if (sectionId === "2.4") return <ByteStreamVisual />;
  if (sectionId === "2.5") return <TcpSendPathVisual />;
  if (sectionId === "2.6") return <div className="space-y-4"><TcpSegmentationVisual /><PacketInspector item={large} testId="tcp-segmentation-inspector" largeDefault /></div>;
  if (sectionId === "2.7") return <NicTransmitVisual />;
  if (sectionId === "2.8") return <NicReceiveVisual />;
  if (sectionId === "2.9") return <ReceiveBytesVisual />;
  if (sectionId === "2.10") return <ReceiveOrderingVisual />;
  if (sectionId === "2.11") return <LoopbackComparisonVisual />;
  return <div className="space-y-4"><PacketInspector item={small} testId="tcp-evidence-packet-inspector" /><PacketInspector item={large} testId="tcp-large-packet-inspector" largeDefault /><SmallNote>Compare payload sequence ranges with recorded reads. The question motivated by this evidence is whether a device can perform more of the memory-placement and transport work for prepared application buffers.</SmallNote></div>;
}
