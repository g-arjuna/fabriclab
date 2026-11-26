"use client";

import { useMemo, useState, type ReactNode } from "react";

import rawSections from "@/lib/practical/foundationsContent.generated.json";
import { rdmaEvidence } from "@/lib/practical/rdmaEvidence";
import { formatRanges, tcpEvidence, tcpFlagNames } from "@/lib/practical/tcpEvidence";

import { cx, EvidenceNote } from "./visuals";
import { MemoryAccessExercise, MemoryRegistrationDiagram } from "./LegacyLesson3Visuals";
import { queuesVisual } from "./LegacyLesson4Visuals";
import { DmaDiagram, HardwareRdmaConceptDiagram, TransferModelComparison } from "./rdmaDiagrams";

export type FoundationSourceSection = {
  id: string;
  lesson: "moving-data" | "why-rdma" | "memory" | "queues";
  title: string;
  learnerCopy: string;
  visualSpec: string;
  revealCopy: string;
  inspectCopy: string;
  sourceFile: string;
  componentId: string;
};

export const foundationSections = rawSections as FoundationSourceSection[];

export function sectionsForLesson(lesson: FoundationSourceSection["lesson"]) {
  return foundationSections.filter((section) => section.lesson === lesson);
}

export function replaceFoundationBindings(text: string, bindings: Record<string, string>) {
  return text.replace(/\{\{([^}]+)\}\}/g, (original, key: string) => bindings[key.trim()] ?? original);
}

function inlineCode(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={`${keyPrefix}-${index}`} className="rounded bg-white/8 px-1 py-0.5 font-mono text-[0.92em] text-cyan-100">{part.slice(1, -1)}</code>;
    }
    return <span key={`${keyPrefix}-${index}`}>{part.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((segment, segmentIndex) => segment.startsWith("**") && segment.endsWith("**") ? <strong key={segmentIndex} className="font-semibold text-slate-100">{segment.slice(2, -2)}</strong> : segment)}</span>;
  });
}

function markdownish(text: string, bindings: Record<string, string>, keyPrefix: string) {
  const resolved = replaceFoundationBindings(text, bindings).trim();
  if (!resolved) return null;
  return resolved.split(/\n\s*\n/).map((block, blockIndex) => {
    const lines = block.split("\n").filter(Boolean);
    if (/^```/.test(block)) {
      const code = block.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
      return <pre key={`${keyPrefix}-${blockIndex}`} className="overflow-x-auto rounded-xl bg-slate-950/80 p-3 font-mono text-xs leading-6 text-slate-200"><code>{code}</code></pre>;
    }
    if (lines.every((line) => /^- /.test(line.trim()))) {
      return <ul key={`${keyPrefix}-${blockIndex}`} className="list-disc space-y-2 pl-5">{lines.map((line, index) => <li key={index}>{inlineCode(line.trim().slice(2), `${keyPrefix}-${blockIndex}-${index}`)}</li>)}</ul>;
    }
    if (lines.every((line) => /^\d+\./.test(line.trim()))) {
      return <ol key={`${keyPrefix}-${blockIndex}`} className="list-decimal space-y-2 pl-5">{lines.map((line, index) => <li key={index}>{inlineCode(line.trim().replace(/^\d+\.\s*/, ""), `${keyPrefix}-${blockIndex}-${index}`)}</li>)}</ol>;
    }
    return <p key={`${keyPrefix}-${blockIndex}`}>{lines.map((line, lineIndex) => <span key={lineIndex}>{inlineCode(line, `${keyPrefix}-${blockIndex}-${lineIndex}`)}{lineIndex < lines.length - 1 ? <br /> : null}</span>)}</p>;
  });
}

export function AuthoredCopy({ text, bindings = {}, className, testId }: { text: string; bindings?: Record<string, string>; className?: string; testId?: string }) {
  return <div className={cx("space-y-4 text-sm leading-6 text-slate-300 sm:text-[15px]", className)} data-testid={testId}>{markdownish(text, bindings, testId || "copy")}</div>;
}

function Arrow({ label, reverse = false, dashed = false, dotted = false }: { label: string; reverse?: boolean; dashed?: boolean; dotted?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2" data-testid="foundation-arrow">
      <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{reverse ? "B to A" : "A to B"}</span>
      <div className="relative h-px min-w-10 flex-1 bg-cyan-300/70">
        <div className={cx("absolute inset-x-0 top-0 border-t", dashed && "border-dashed border-amber-300/70", dotted && "border-dotted border-violet-300/70")} />
        <div className={cx("absolute top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-cyan-300", reverse ? "left-0 border-b border-l" : "right-0 border-r border-t")} />
      </div>
      <span className="min-w-0 truncate text-xs text-cyan-100">{label}</span>
    </div>
  );
}

function MemoryCells({ label, bytes, tone = "cyan", active = true }: { label: string; bytes: string[]; tone?: "cyan" | "amber" | "violet" | "green"; active?: boolean }) {
  const tones = {
    cyan: "border-cyan-300/35 bg-cyan-300/10 text-cyan-50",
    amber: "border-amber-300/35 bg-amber-300/10 text-amber-50",
    violet: "border-violet-300/35 bg-violet-300/10 text-violet-50",
    green: "border-emerald-300/35 bg-emerald-300/10 text-emerald-50",
  };
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</div>
      <div className="mt-2 flex max-w-full flex-wrap gap-1" data-testid="memory-cells">{bytes.map((byte, index) => <span key={`${byte}-${index}`} className={cx("rounded border px-1.5 py-1 font-mono text-[11px]", active ? tones[tone] : "border-white/10 bg-white/4 text-slate-500")}>{byte}</span>)}</div>
    </div>
  );
}

function HostBox({ name, children, active = false }: { name: string; children: ReactNode; active?: boolean }) {
  return <section className={cx("min-w-0 rounded-2xl border p-3", active ? "border-cyan-300/35 bg-cyan-300/8" : "border-white/10 bg-slate-950/55")} data-testid={`host-${name}`}><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">{name}</div><div className="mt-3 space-y-3">{children}</div></section>;
}

function KernelBox({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-amber-300/25 bg-amber-300/7 p-2"><div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/80">kernel</div>{children}</div>;
}

function NicBox({ label = "NIC / device" }: { label?: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-semibold text-slate-200">{label}</div>;
}

function TcpPathVisual({ sectionId, activity }: { sectionId: string; activity: number }) {
  const isHandshake = sectionId === "2.3";
  const isLarge = sectionId === "2.6";
  const isLoopback = sectionId === "2.11";
  const payload = isLarge ? ["4096-byte stream"] : ["H", "E", "L", "L", "O"];
  const transferLabel = isHandshake ? "SYN / SYN+ACK / ACK" : isLarge ? "TCP segments" : isLoopback ? "loopback path" : "TCP byte stream";
  return (
    <div className="space-y-4" data-testid="foundation-two-host-visual">
      <div className="grid gap-3 sm:grid-cols-2">
        <HostBox name={isLoopback ? "One host" : "Server A"} active={activity >= 1}>
          <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/8 p-2"><div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200/80">application</div><MemoryCells label="send buffer" bytes={payload} active={activity >= 1} /></div>
          <KernelBox><div className="grid grid-cols-2 gap-2 text-center text-[11px]"><div className={cx("rounded-lg border px-2 py-1.5", activity >= 2 ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-500")}>socket / TCP state</div><div className={cx("rounded-lg border px-2 py-1.5", activity >= 2 ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-500")}>send storage</div></div></KernelBox>
          <NicBox label={isLoopback ? "loopback interface" : "NIC / device"} />
        </HostBox>
        {!isLoopback ? <HostBox name="Server B" active={activity >= 4}>
          <div className="rounded-xl border border-violet-300/25 bg-violet-300/8 p-2"><div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200/80">application</div><MemoryCells label="receive buffer" bytes={payload.map((byte, index) => activity >= 5 ? byte : "·")} tone="violet" active={activity >= 5} /></div>
          <KernelBox><div className="grid grid-cols-2 gap-2 text-center text-[11px]"><div className={cx("rounded-lg border px-2 py-1.5", activity >= 4 ? "border-violet-300/35 bg-violet-300/10 text-violet-100" : "border-white/10 text-slate-500")}>TCP receive storage</div><div className={cx("rounded-lg border px-2 py-1.5", activity >= 5 ? "border-violet-300/35 bg-violet-300/10 text-violet-100" : "border-white/10 text-slate-500")}>recv copy</div></div></KernelBox>
          <NicBox />
        </HostBox> : null}
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3"><Arrow label={transferLabel} />{isHandshake ? <Arrow label="connection response" reverse dashed /> : null}</div>
    </div>
  );
}



function TcpSegmentationVisual() {
  const large = tcpEvidence.cases.large;
  const total = large.payloadSegments.reduce((sum, segment) => sum + segment.tcpPayloadLength, 0);
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="foundation-tcp-segmentation">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">recorded application byte stream · {total} bytes</div>
        <div className="mt-2 flex h-9 overflow-hidden rounded-xl border border-cyan-300/25 bg-cyan-300/8 font-mono text-[11px] text-cyan-50">
          {large.payloadSegments.map((segment) => {
            const width = `${Math.max(18, (segment.tcpPayloadLength / total) * 100)}%`;
            return <div key={segment.frameNumber} style={{ width }} className="flex items-center justify-center border-r border-cyan-950/60 last:border-r-0">{segment.relativeSequenceStart}–{segment.relativeSequenceEndExclusive - 1}</div>;
          })}
        </div>
      </div>
      <div className="grid gap-2 lg:grid-cols-3">
        {large.payloadSegments.map((segment) => <div key={segment.frameNumber} className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 p-3">
          <div className="text-xs font-semibold text-cyan-100">captured frame {segment.frameNumber}</div>
          <div className="mt-2 flex flex-wrap gap-1 font-mono text-[10px]">
            <span className="rounded border border-white/15 bg-white/5 px-1.5 py-1">Ethernet</span>
            <span className="rounded border border-white/15 bg-white/5 px-1.5 py-1">IP</span>
            <span className="rounded border border-white/15 bg-white/5 px-1.5 py-1">TCP</span>
            <span className="rounded border border-cyan-300/30 bg-cyan-300/10 px-1.5 py-1 text-cyan-100">payload {segment.tcpPayloadLength} bytes</span>
          </div>
          <div className="mt-2 font-mono text-[11px] text-slate-300">sequence starts at relative byte {segment.relativeSequenceStart}</div>
        </div>)}
      </div>
      <div className="rounded-xl border border-amber-300/20 bg-amber-300/7 p-3 text-xs leading-5 text-amber-50">
        Conceptual comparison, not capture: a 2500-byte stream with capacity 1000 would split as 1000 + 1000 + 500. Sequence numbers identify stream positions; acknowledgements name the next expected byte. Reordering examples are illustrative unless explicitly tied to capture rows.
      </div>
    </div>
  );
}


function EndpointSocketsVisual({ sectionId, activity }: { sectionId: string; activity: number }) {
  const small = tcpEvidence.cases["small-late"];
  const clientPort = small.endpoints.senderLocal[1];
  const listenerPort = small.endpoints.senderPeer[1];
  const established = activity >= 2 || sectionId === "2.2";
  return (
    <div className="space-y-4" data-testid="foundation-socket-endpoints">
      <div className="grid gap-3 sm:grid-cols-2">
        <HostBox name="Server A" active={established}>
          <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/8 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200/80">process A</div>
            <div className="mt-2 grid gap-2 text-xs">
              <div className={cx("rounded-lg border px-2 py-2", established ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-500")}>process-local descriptor fd 3</div>
              <div className="rounded-lg border border-white/10 bg-slate-950/60 px-2 py-2 font-mono text-[11px] text-slate-300">socket object · {established ? `10.10.10.1:${clientPort}` : "unconnected"}</div>
            </div>
          </div>
          <KernelBox><div className="text-center text-xs text-slate-300">TCP connection state · transport endpoint, not a packet</div></KernelBox>
          <NicBox />
        </HostBox>
        <HostBox name="Server B" active={sectionId === "2.2"}>
          <div className="rounded-xl border border-violet-300/25 bg-violet-300/8 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200/80">process B</div>
            <div className="mt-2 grid gap-2 text-xs">
              <div className="rounded-lg border border-violet-300/30 bg-violet-300/10 px-2 py-2 text-violet-100">listening socket · B:{listenerPort}</div>
              <div className={cx("rounded-lg border px-2 py-2", established ? "border-violet-300/35 bg-violet-300/10 text-violet-100" : "border-white/10 text-slate-500")}>accepted socket {established ? "after accept() returns" : "not yet created"}</div>
            </div>
          </div>
          <KernelBox><div className="text-center text-xs text-slate-300">listener and connected socket are distinct kernel objects</div></KernelBox>
          <NicBox />
        </HostBox>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">connection four-tuple · recorded small-late example</div>
        <div className="mt-2 grid gap-2 font-mono text-xs text-cyan-100 sm:grid-cols-4">
          <span className="rounded-lg border border-cyan-300/20 bg-cyan-300/8 px-2 py-1.5">A IP 10.10.10.1</span>
          <span className="rounded-lg border border-cyan-300/20 bg-cyan-300/8 px-2 py-1.5">A port {clientPort}</span>
          <span className="rounded-lg border border-violet-300/20 bg-violet-300/8 px-2 py-1.5">B IP 10.10.10.2</span>
          <span className="rounded-lg border border-violet-300/20 bg-violet-300/8 px-2 py-1.5">B port {listenerPort}</span>
        </div>
        <div className="mt-2 text-[11px] leading-5 text-slate-500">A physical NIC interface, TCP port number and process-local file descriptor are different kinds of identifiers. Another client can connect to B:{listenerPort} while remaining a separate connection because its source address/port differs.</div>
      </div>
    </div>
  );
}

function ByteStreamVisual() {
  const [pattern, setPattern] = useState<0 | 1>(0);
  const stream = ["H", "E", "L", "L", "O"];
  const patterns = [["H", "EL", "LO"], ["HE", "LL", "O"]];
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="foundation-byte-stream">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">application writes</div>
        <div className="mt-2 flex flex-wrap gap-2 font-mono text-xs"><span className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-2 py-1">write HE</span><span className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-2 py-1">write LLO</span></div>
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">continuous byte stream positions</div>
        <div className="mt-2 flex flex-wrap gap-1">{stream.map((byte, index) => <span key={byte + index} className="rounded-md border border-white/15 bg-white/5 px-2 py-1 font-mono text-xs"><span className="text-slate-500">{index}</span> {byte}</span>)}</div>
      </div>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">possible receive chunking · illustrative</div><button type="button" onClick={() => setPattern((value) => value === 0 ? 1 : 0)} className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100" data-testid="byte-stream-pattern-toggle">show another valid chunking</button></div>
        <div className="mt-2 flex flex-wrap gap-2 font-mono text-xs">{patterns[pattern].map((chunk) => <span key={chunk} className="rounded-lg border border-violet-300/25 bg-violet-300/10 px-2 py-1 text-violet-100">read {chunk}</span>)}</div>
        <div className="mt-2 text-[11px] text-slate-500">Both illustrative chunkings deliver the same ordered bytes HELLO. Neither alternative is claimed as a captured packetization.</div>
      </div>
    </div>
  );
}

function TcpKernelPathVisual({ sectionId, activity }: { sectionId: string; activity: number }) {
  const sending = sectionId === "2.5";
  const nic = sectionId === "2.7";
  const receiving = sectionId === "2.8";
  const rows = sending ? [
    "CPU executes Python sendall()",
    "system-call entry; CPU copies five bytes",
    "user source remains HELLO",
    "kernel-owned send storage holds stream bytes",
  ] : nic ? [
    "driver descriptor: pointer + length + flags (metadata)",
    "payload path: RAM → device/NIC via interconnect",
    "descriptor ring does not contain payload bytes",
    "representative physical NIC DMA model",
  ] : [
    "wire → receiver NIC",
    "NIC writes kernel receive storage (representative DMA path)",
    "CPU driver/IP/TCP processing",
    "ordered bytes associated with the correct socket",
  ];
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="foundation-tcp-kernel-path">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/8 p-3"><div className="text-xs font-semibold text-cyan-100">{receiving ? "network input" : "user memory"}</div><MemoryCells label={receiving ? "ordered byte ranges" : "application buffer"} bytes={["H", "E", "L", "L", "O"]} active /></div>
        <div className="flex flex-col items-center gap-2"><Arrow label={sending ? "CPU copy path" : nic ? "DMA payload path" : "DMA + protocol processing"} dashed={!nic && !receiving} /></div>
        <div className="rounded-xl border border-violet-300/25 bg-violet-300/8 p-3"><div className="text-xs font-semibold text-violet-100">{nic ? "Ethernet frame output" : "kernel-managed socket storage"}</div><MemoryCells label={receiving ? "receive storage before recv()" : "send/receive storage"} bytes={["H", "E", "L", "L", "O"]} tone="violet" active={activity >= 1} /></div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">{rows.map((row, index) => <div key={row} className={cx("rounded-lg border px-3 py-2 text-xs", activity >= index / 2 ? "border-white/15 bg-white/5 text-slate-200" : "border-white/8 text-slate-500")}><span className="mr-2 font-mono text-cyan-200">{index + 1}</span>{row}</div>)}</div>
      {receiving ? <div className="rounded-xl border border-amber-300/20 bg-amber-300/7 p-3 text-xs leading-5 text-amber-50">The receiver application buffer is still zero-filled before recv(). Demultiplexing uses the connection four-tuple; out-of-order examples are illustrative unless separately labelled.</div> : null}
    </div>
  );
}



function SoftRoceStackVisual() {
  const hosta = rdmaEvidence.hosts.hosta;
  const hostb = rdmaEvidence.hosts.hostb;
  const rxeStack = ["Python", "Pyverbs", "libibverbs + RXE provider", "Linux RDMA/RXE", "Linux network stack", "data0 underlying interface", "network"];
  const hardwareStack = ["Python", "Pyverbs", "libibverbs + hardware provider", "prepared RNIC resources", "RNIC transport/memory logic", "network"];
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="soft-roce-stack-visual">
      <div className="grid gap-3 sm:grid-cols-2">
        {[{ label: hosta.label, ip: hosta.dataIp }, { label: hostb.label, ip: hostb.dataIp }].map((host) => <div key={host.label} className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 p-3">
          <div className="text-xs font-semibold text-cyan-100">{host.label} · data0 {host.ip}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]"><span className="rounded-full border border-white/15 bg-white/5 px-2 py-1">physical/virtual NIC data0</span><span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2 py-1 text-violet-100">logical RXE device rxe0 · associated with data0</span></div>
        </div>)}
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">Actual laboratory RXE path</div>
          <div className="mt-3 space-y-1.5">{rxeStack.map((item, index) => <div key={item} className="flex items-center gap-2"><span className="w-4 font-mono text-[10px] text-slate-500">{index + 1}</span><span className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200">{item}</span></div>)}</div>
          <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/7 px-2 py-2 text-[11px] leading-5 text-amber-50">CPU executes the RXE software transport and memory-access logic. No CPU-offload or throughput claim is made.</div>
        </div>
        <div className="rounded-xl border border-violet-300/20 bg-violet-300/7 p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">Representative hardware RDMA path</div>
          <div className="mt-3 space-y-1.5">{hardwareStack.map((item, index) => <div key={item} className="flex items-center gap-2"><span className="w-4 font-mono text-[10px] text-slate-500">{index + 1}</span><span className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200">{item}</span></div>)}</div>
          <div className="mt-3 rounded-lg border border-white/10 bg-white/4 px-2 py-2 text-[11px] leading-5 text-slate-400">Hardware illustration only. Kernel setup/control remains separate from userspace-accessible work and hardware transport behavior.</div>
        </div>
      </div>
    </div>
  );
}

function RdmaWorkInitiationVisual() {
  const steps = [
    ["Prepare memory/resources", "open device context and establish access objects"],
    ["Describe work", "construct an instruction that references memory"],
    ["Submit to endpoint", "post the instruction to prepared communication state"],
    ["Observe result", "poll completion reporting and inspect local outcome"],
  ];
  return <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" data-testid="rdma-work-initiation-visual">{steps.map(([title, detail], index) => <div key={title} className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 p-3"><div className="font-mono text-[11px] text-cyan-200">step {index + 1}</div><div className="mt-1 text-sm font-semibold text-slate-100">{title}</div><div className="mt-2 text-xs leading-5 text-slate-400">{detail}</div>{index < steps.length - 1 ? <div className="mt-2 text-cyan-300">↓</div> : null}</div>)}</div>;
}


function HostArchitectureVisual({ sectionId, activity }: { sectionId: string; activity: number }) {
  const bytes = sectionId === "1.4" ? ["48", "45", "4c", "4c", "4f"] : ["H", "E", "L", "L", "O"];
  if (["1.1", "1.2", "1.3", "1.6"].includes(sectionId)) {
    return <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="foundation-host-architecture"><HostBox name="One Linux host" active>
      <div className="grid gap-2 sm:grid-cols-2"><div className={cx("rounded-xl border p-3", activity >= 1 ? "border-cyan-300/35 bg-cyan-300/10" : "border-white/10 bg-white/4")}><div className="text-xs font-semibold text-slate-100">CPU</div><div className="mt-1 text-[11px] text-slate-400">executes process instructions</div></div><div className={cx("rounded-xl border p-3", activity >= 1 ? "border-cyan-300/35 bg-cyan-300/10" : "border-white/10 bg-white/4")}><div className="text-xs font-semibold text-slate-100">RAM</div><div className="mt-2"><MemoryCells label="virtual memory view" bytes={bytes} active={activity >= 2} /></div></div></div>
      <KernelBox><div className="grid gap-2 text-[11px] sm:grid-cols-3">{["process table", "memory mappings", "device control"].map((item, index) => <div key={item} className={cx("rounded-lg border px-2 py-1.5 text-center", activity >= index + 1 ? "border-amber-300/35 bg-amber-300/10 text-amber-100" : "border-white/10 text-slate-500")}>{item}</div>)}</div></KernelBox>
      <div className="grid gap-2 text-[11px] sm:grid-cols-3">
        <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/7 px-2 py-1.5 text-center text-cyan-100">CPU ↔ memory system ↔ RAM</div>
        <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/7 px-2 py-1.5 text-center text-cyan-100">NIC ↔ interconnect ↔ RAM</div>
        <div className="rounded-lg border border-white/10 bg-white/4 px-2 py-1.5 text-center text-slate-400">network cable leaves NIC</div>
      </div>
      {sectionId === "1.2" ? <div className="grid gap-2 text-[11px] sm:grid-cols-2"><div className="rounded-lg border border-violet-300/20 bg-violet-300/8 px-2 py-2 text-violet-100">process A mappings: code · stack · heap/data · shared library</div><div className="rounded-lg border border-violet-300/20 bg-violet-300/8 px-2 py-2 text-violet-100">process C independent mappings to the same physical RAM</div></div> : null}
      {sectionId === "1.3" ? <div className="rounded-lg border border-amber-300/20 bg-amber-300/7 px-3 py-2 text-[11px] leading-5 text-amber-50">CPU virtual address → MMU translation → mapped frame. The same virtual address in another process can resolve to a different frame; a write to a read-only mapping raises a protection fault.</div> : null}
      {sectionId === "1.6" ? <div className="rounded-lg border border-white/10 bg-white/4 px-3 py-2 font-mono text-[11px] text-slate-300">CPU user code → system-call entry → CPU kernel code → return to user code · device wakeup is separate</div> : null}
      <NicBox />
    </HostBox></div>;
  }
  if (["1.4", "1.5"].includes(sectionId)) {
    return <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="foundation-memory-visual"><MemoryCells label={sectionId === "1.4" ? "allocated writable byte buffer · hex bytes 48 45 4c 4c 4f = HELLO" : "source bytes"} bytes={bytes} active={activity >= 1} /><div className="rounded-xl border border-white/10 bg-white/4 p-3"><Arrow label={sectionId === "1.4" ? "CPU writes bytes into allocated memory" : activity >= 2 ? "copy: bytes move to another region" : "reference: another description points at same bytes"} dashed={sectionId === "1.4"} dotted={sectionId === "1.5" && activity < 2} />{sectionId === "1.5" ? <div className="mt-3"><MemoryCells label="destination / referenced bytes" bytes={bytes} tone="violet" active={activity >= 1} /></div> : null}</div></div>;
  }
  return <TcpPathVisual sectionId={sectionId} activity={activity} />;
}

function RdmaFoundationVisual({ sectionId, activity }: { sectionId: string; activity: number }) {
  const resources = [["memory region", "MR"], ["protection domain", "PD"], ["completion queue", "CQ"], ["queue pair", "QP"]];
  const queueLesson = sectionId.startsWith("4.1");
  const keys = ["4.5", "4.6", "4.7", "4.8", "4.9"].includes(sectionId);
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="foundation-rdma-visual">
      <div className="grid gap-2 sm:grid-cols-2">{resources.map(([name, abbr], index) => <div key={name} className={cx("rounded-xl border p-3", activity > index ? "border-cyan-300/35 bg-cyan-300/10" : "border-white/10 bg-white/4")}><div className="text-xs font-semibold text-slate-100">{name}</div><div className="mt-1 font-mono text-[11px] text-cyan-100">{abbr}</div></div>)}</div>
      <MemoryCells label="registered memory bytes" bytes={["H", "E", "L", "L", "O", "·", "·", "·"]} active={activity >= 1} />
      {queueLesson ? <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-cyan-300/25 bg-cyan-300/8 p-3"><div className="text-xs font-semibold text-cyan-100">Send Queue</div><div className="mt-2 space-y-2">{[0, 1].map((i) => <div key={i} className={cx("rounded-lg border px-2 py-2 text-xs", activity > i ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-500")}>WR {i + 1}: opcode + SGE</div>)}</div></div><div className="rounded-xl border border-violet-300/25 bg-violet-300/8 p-3"><div className="text-xs font-semibold text-violet-100">Receive Queue / Completion</div><div className="mt-2 space-y-2">{[0, 1].map((i) => <div key={i} className={cx("rounded-lg border px-2 py-2 text-xs", activity > i + 1 ? "border-violet-300/35 bg-violet-300/10 text-violet-100" : "border-white/10 text-slate-500")}>{i === 0 ? "posted receive buffer" : "completion record"}</div>)}</div></div></div> : <div className="rounded-xl border border-white/10 bg-white/4 p-3"><Arrow label={keys ? "LKEY local · RKEY exchanged to peer" : sectionId.startsWith("3.") ? "software configures device memory access" : "resource relationships"} dashed dotted={activity < 2} /></div>}
    </div>
  );
}


function TcpEvidencePanel({ sectionId }: { sectionId: string }) {
  const small = tcpEvidence.cases["small-late"];
  const large = tcpEvidence.cases.large;
  if (!["2.2", "2.3", "2.5", "2.6", "2.9", "2.10", "2.11", "2.12"].includes(sectionId)) return null;
  if (sectionId === "2.2" || sectionId === "2.3") {
    return <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3" data-testid="tcp-handshake-evidence">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-200">Recorded TCP handshake · small-late.pcap</div><a className="text-xs text-cyan-200 underline underline-offset-4" href={small.capture.downloadPath}>download capture</a></div>
      <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[34rem] text-left font-mono text-xs"><thead className="text-slate-500"><tr><th className="py-1 pr-3">frame</th><th className="py-1 pr-3">direction</th><th className="py-1 pr-3">flags</th><th className="py-1 pr-3">seq</th><th className="py-1 pr-3">ack</th><th className="py-1">tuple</th></tr></thead><tbody>{small.handshake.map((packet) => <tr key={packet.frameNumber} className="border-t border-white/8 text-slate-300"><td className="py-1.5 pr-3">{packet.frameNumber}</td><td className="py-1.5 pr-3">{packet.sourceIp}:{packet.sourcePort} → {packet.destinationIp}:{packet.destinationPort}</td><td className="py-1.5 pr-3 text-cyan-100">{tcpFlagNames(packet.flags)}</td><td className="py-1.5 pr-3">{packet.relativeSequence}</td><td className="py-1.5 pr-3">{packet.relativeAcknowledgement}</td><td className="py-1.5">{small.endpoints.senderLocal[0]}:{small.endpoints.senderLocal[1]} ↔ {small.endpoints.senderPeer[0]}:{small.endpoints.senderPeer[1]}</td></tr>)}</tbody></table></div>
      <div className="mt-2 text-[11px] leading-5 text-slate-500">Endpoint capture on {small.capture.host} {small.capture.interface}. {tcpEvidence.sequenceNumberPolicy}</div>
    </div>;
  }
  if (sectionId === "2.6") {
    return <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3" data-testid="tcp-segmentation-evidence">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-200">Recorded large-transfer segments · large.pcap</div><a className="text-xs text-cyan-200 underline underline-offset-4" href={large.capture.downloadPath}>download capture</a></div>
      <div className="mt-3 grid gap-2">{large.payloadSegments.map((segment) => <div key={segment.frameNumber} className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 px-3 py-2 font-mono text-xs text-slate-200">frame {segment.frameNumber}: relative bytes {segment.relativeSequenceStart}–{segment.relativeSequenceEndExclusive - 1} · TCP payload {segment.tcpPayloadLength} bytes · SHA-256 {segment.payloadSha256.slice(0, 12)}…</div>)}</div>
      <div className="mt-2 text-[11px] leading-5 text-slate-500">Advertised MSS in the handshake: {large.handshake[0]?.advertisedMss ?? "not decoded"}. Sequence ranges are transport payload positions; read chunks are application observations and need not match segment boundaries.</div>
    </div>;
  }
  if (sectionId === "2.10") {
    const early = tcpEvidence.cases["small-early"];
    const cases = [early, small];
    return <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3" data-testid="tcp-read-order-evidence">
      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-200">Recorded ordering comparison · receiver-first versus sender-first</div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">{cases.map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-white/4 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-semibold text-sm text-slate-100">{item.id === "small-early" ? "Receiver reads first" : "Sender sends first"}</div><a className="text-xs text-cyan-200 underline underline-offset-4" href={item.capture.downloadPath}>capture</a></div>
        <div className="mt-2 text-xs text-slate-400">port {item.port} · {item.capture.host}/{item.capture.interface}</div>
        <div className="mt-3 flex flex-wrap gap-2">{item.receiveEvents.map((event, index) => <span key={index} className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 font-mono text-[11px] text-violet-100">read {index + 1}: {event.count}/{event.requested}</span>)}</div>
        <div className="mt-3 grid gap-1 font-mono text-[11px] text-slate-300">{item.events.receiver.filter((event) => ["recv_enter", "recv_return"].includes(String(event.event))).slice(0, 4).map((event, index) => <div key={index}>{String(event.event)} · offset {String(event.offset)} {event.count !== undefined ? `· returned ${String(event.count)}` : ""}</div>)}</div>
        {item.ssSnapshots["after-send-before-read"] ? <pre className="mt-3 max-h-28 overflow-auto rounded-lg bg-slate-950/80 p-2 font-mono text-[10px] leading-4 text-slate-300">{item.ssSnapshots["after-send-before-read"]}</pre> : <div className="mt-3 rounded-lg border border-white/10 p-2 text-[11px] text-slate-500">No unread-queue snapshot in this case; the receiver was already blocked in read before send release.</div>}
      </div>)}</div>
      <div className="mt-2 text-[11px] leading-5 text-slate-500">Both validated cases deliver the same ordered stream. recv() timing affects when bytes enter the application buffer, not whether TCP can accept them into kernel-managed receive storage.</div>
    </div>;
  }
  if (sectionId === "2.11") {
    const loopback = tcpEvidence.cases.loopback;
    return <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3" data-testid="tcp-loopback-evidence">
      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-200">Recorded loopback versus two-host captures</div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">{[loopback, small].map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-white/4 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-semibold text-sm text-slate-100">{item.id === "loopback" ? "Same machine · software loopback" : "Two machines · Ethernet data0"}</div><a className="text-xs text-cyan-200 underline underline-offset-4" href={item.capture.downloadPath}>capture</a></div>
        <div className="mt-2 font-mono text-[11px] text-slate-300">{item.endpoints.senderLocal[0]}:{item.endpoints.senderLocal[1]} → {item.endpoints.senderPeer[0]}:{item.endpoints.senderPeer[1]}</div>
        <div className="mt-2 text-xs text-slate-400">capture point {item.capture.host}/{item.capture.interface} · payload rows {item.validation.forward_payload_rows}</div>
        <div className="mt-2 text-[11px] text-slate-500">{item.id === "loopback" ? "One kernel and one physical memory object; loopback is a software network path, not a claim about physical Ethernet transmission." : "Separate kernels, memory objects and NIC endpoints on the laboratory data network."}</div>
      </div>)}</div>
    </div>;
  }
  if (sectionId === "2.5" || sectionId === "2.9") {
    const snapshot = small.ssSnapshots["after-send-before-read"] || small.ssSnapshots["after-completion"];
    return <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3" data-testid="tcp-read-evidence">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-200">Recorded application reads and socket state</div><a className="text-xs text-cyan-200 underline underline-offset-4" href={small.capture.downloadPath}>download capture</a></div>
      <div className="mt-3 flex flex-wrap gap-2">{small.receiveEvents.map((event, index) => <span key={index} className="rounded-full border border-violet-300/25 bg-violet-300/10 px-3 py-1 font-mono text-xs text-violet-100">read {index + 1}: requested {event.requested}, returned {event.count}</span>)}</div>
      {snapshot ? <pre className="mt-3 max-h-44 overflow-auto rounded-xl bg-slate-950/80 p-3 font-mono text-[11px] leading-5 text-slate-300">{snapshot}</pre> : null}
      <div className="mt-2 text-[11px] leading-5 text-slate-500">The small-late snapshot records Recv-Q 5 before the receiver's first read. Application log records method entry/return; it is not presented as a syscall trace.</div>
    </div>;
  }
  return <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3" data-testid="tcp-evidence-review">
    <div className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-200">Validated TCP evidence set</div>
    <div className="mt-2 rounded-lg border border-amber-300/20 bg-amber-300/7 px-2 py-2 text-[11px] leading-5 text-amber-50">Recorded experiment decoded with TShark artifacts. GUI Wireshark screenshots are not embedded in this revision; the downloadable PCAPs and decoded field/log tables are the authoritative browser evidence.</div>
    <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">{Object.values(tcpEvidence.cases).map((item) => <a key={item.id} href={item.capture.downloadPath} className="rounded-xl border border-white/10 bg-white/4 px-3 py-2 hover:border-cyan-300/30"><span className="font-semibold text-cyan-100">{item.id}</span><br />port {item.port} · {item.validation.forward_payload_rows} forward payload row{item.validation.forward_payload_rows === 1 ? "" : "s"} · validation {item.validation.ok ? "passed" : "failed"}</a>)}</div>
  </div>;
}

function FoundationVisualControls({ activity, setActivity, max }: { activity: number; setActivity: React.Dispatch<React.SetStateAction<number>>; max: number }) {
  return <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setActivity((value) => Math.max(0, value - 1))} disabled={activity === 0} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 disabled:opacity-40">Back</button><button type="button" onClick={() => setActivity((value) => Math.min(max, value + 1))} disabled={activity >= max} className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 disabled:opacity-40" data-testid="foundation-visual-next">Advance visual</button><span className="text-[11px] text-slate-500">conceptual visual step {activity + 1} of {max + 1}</span></div>;
}

export function FoundationVisual({ sectionId }: { sectionId: string }) {
  const [activity, setActivity] = useState(0);
  const max = sectionId.startsWith("1.") && sectionId !== "1.7" ? 3 : sectionId.startsWith("3.") || sectionId.startsWith("4.") ? 4 : 5;
  const memoryStages: Record<string, number> = { "4.1": 1, "4.2": 2, "4.3": 3, "4.4": 4, "4.5": 5, "4.6": 5, "4.7": 5, "4.9": 5 };
  const queueStages: Record<string, number> = { "4.10": 0, "4.11": 1, "4.12": 3, "4.13": 4, "4.14": 6 };
  if (sectionId === "4.8") return <div className="space-y-4"><MemoryAccessExercise /><TcpEvidencePanel sectionId={sectionId} /></div>;
  if (memoryStages[sectionId] !== undefined) return <div className="space-y-4"><MemoryRegistrationDiagram stage={memoryStages[sectionId]} /><TcpEvidencePanel sectionId={sectionId} /></div>;
  if (queueStages[sectionId] !== undefined) return <div className="space-y-4">{queuesVisual(queueStages[sectionId])}<TcpEvidencePanel sectionId={sectionId} /></div>;
  if (sectionId === "3.1" || sectionId === "3.2") return <div className="space-y-4"><DmaDiagram phase={activity >= 1 || sectionId === "3.2" ? "device-dma" : "cpu-copy"} /><TcpEvidencePanel sectionId={sectionId} /><FoundationVisualControls activity={activity} setActivity={setActivity} max={max} /></div>;
  if (sectionId === "3.3") return <div className="space-y-4"><TransferModelComparison /><TcpEvidencePanel sectionId={sectionId} /></div>;
  if (sectionId === "3.5") return <div className="space-y-4"><SoftRoceStackVisual /><TcpEvidencePanel sectionId={sectionId} /></div>;
  if (sectionId === "3.6") return <div className="space-y-4"><RdmaWorkInitiationVisual /><TcpEvidencePanel sectionId={sectionId} /></div>;
  if (sectionId === "3.4") return <div className="space-y-4"><HardwareRdmaConceptDiagram active={activity >= 1} /><TcpEvidencePanel sectionId={sectionId} /><FoundationVisualControls activity={activity} setActivity={setActivity} max={max} /></div>;
  const visual = sectionId === "2.1" || sectionId === "2.2" ? <EndpointSocketsVisual sectionId={sectionId} activity={activity} /> : sectionId === "2.4" ? <ByteStreamVisual /> : sectionId === "2.6" ? <TcpSegmentationVisual /> : ["2.5", "2.7", "2.8"].includes(sectionId) ? <TcpKernelPathVisual sectionId={sectionId} activity={activity} /> : sectionId.startsWith("1.") ? <HostArchitectureVisual sectionId={sectionId} activity={activity} /> : sectionId.startsWith("2.") ? <TcpPathVisual sectionId={sectionId} activity={activity} /> : <RdmaFoundationVisual sectionId={sectionId} activity={activity} />;
  const evidencePanel = <TcpEvidencePanel sectionId={sectionId} />;
  const evidenceFirst = ["2.2", "2.3", "2.5", "2.6", "2.9", "2.10", "2.11", "2.12"].includes(sectionId);
  return <div className="space-y-4">{evidenceFirst ? evidencePanel : null}{visual}{evidenceFirst ? null : evidencePanel}<div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setActivity((value) => Math.max(0, value - 1))} disabled={activity === 0} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 disabled:opacity-40">Back</button><button type="button" onClick={() => setActivity((value) => Math.min(max, value + 1))} disabled={activity >= max} className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 disabled:opacity-40" data-testid="foundation-visual-next">Advance visual</button><span className="text-[11px] text-slate-500">conceptual visual step {activity + 1} of {max + 1}</span></div></div>;
}

export function FoundationInteraction({ section, bindings }: { section: FoundationSourceSection; bindings: Record<string, string> }) {
  const [revealed, setRevealed] = useState(false);
  if (!section.revealCopy) return null;
  return <div className="rounded-2xl border border-white/10 bg-white/4 p-4"><button type="button" onClick={() => setRevealed((value) => !value)} className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100" data-testid="foundation-reveal-toggle">{revealed ? "Hide check" : "Check understanding"}</button>{revealed ? <AuthoredCopy className="mt-4" text={section.revealCopy} bindings={bindings} testId="foundation-reveal-copy" /> : null}</div>;
}

export function FoundationEvidenceNote({ section }: { section: FoundationSourceSection }) {
  const hasBinding = /\{\{/.test(`${section.learnerCopy}\n${section.revealCopy}\n${section.inspectCopy}`);
  if (!hasBinding) return null;
  return <EvidenceNote kind="Evidence binding">Runtime values in this section are bound only to validated recorded evidence. Unvalidated placeholders remain visibly unbound rather than being invented.</EvidenceNote>;
}

export function useFoundationBindings() {
  return useMemo<Record<string, string>>(() => {
    const setup = rdmaEvidence.experiments.find((experiment) => experiment.key === "a") || rdmaEvidence.experiments[0];
    const hosta = setup?.endpoints?.initiator?.memoryRegion;
    return {
      "tcp.small.client_port": String(tcpEvidence.summary.smallClientPort),
      "tcp.small.handshake_frames": `frames ${tcpEvidence.summary.smallHandshakeFrames.join(", ")}`,
      "tcp.small.read_events": `${tcpEvidence.summary.smallReadCounts.join(", ")} bytes`,
      "tcp.large.payload_segments": `${tcpEvidence.summary.largeSegmentLengths.join(" + ")} bytes across relative ranges ${formatRanges(tcpEvidence.summary.largeSegmentRanges)}`,
      "rdma.resources.hosta.address": hosta?.address.hex || "unbound",
      "rdma.resources.hosta.length": String(hosta?.length || "unbound"),
      "rdma.resources.hosta.lkey": hosta?.lkey.hex || "unbound",
      "rdma.resources.hosta.rkey": hosta?.rkey.hex || "unbound",
    };
  }, []);
}
