"use client";

import { useState } from "react";

import { cx } from "./visuals";
import { ActionRow, ByteCells, FoundationAction, FoundationBox, Legend, LinkLine, SmallNote } from "./foundationVisualPrimitives";

const zero16 = Array.from({ length: 16 }, () => "00");
const helloHex = ["48", "45", "4c", "4c", "4f"];
const helloBuffer = [...helloHex, ...Array.from({ length: 11 }, () => "00")];
const bufferAddresses = Array.from({ length: 16 }, (_, index) => `0x${(0x1000 + index).toString(16)}`);
const bufferOffsets = Array.from({ length: 16 }, (_, index) => index);

function HardwareMachine({
  cpuActive = false,
  cpuLabel = "CPU cores + caches",
  ramChildren,
  nicActive = false,
  softwareOverlay = false,
}: {
  cpuActive?: boolean;
  cpuLabel?: string;
  ramChildren?: React.ReactNode;
  nicActive?: boolean;
  softwareOverlay?: boolean;
}) {
  return (
    <div className="space-y-2" data-testid="physical-host-model">
      {softwareOverlay ? (
        <div className="grid gap-2 sm:grid-cols-2" data-testid="software-responsibility-overlay">
          <FoundationBox title="user applications · software" tone="neutral" dashed>Python processes and other applications</FoundationBox>
          <FoundationBox title="Linux kernel · software" tone="kernel" dashed>privileged memory, process and device services</FoundationBox>
        </div>
      ) : null}
      {softwareOverlay ? <div className="text-center text-[10px] uppercase tracking-[0.14em] text-slate-500">logical software overlay · not physical wiring</div> : null}
      <div className="grid gap-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,0.35fr)_minmax(0,1fr)] lg:items-center">
        <FoundationBox title={cpuLabel} tone="cpu" active={cpuActive} testId="hardware-cpu">
          <div className="grid grid-cols-2 gap-1 text-[11px]"><span className="rounded border border-white/10 px-2 py-1">core 0</span><span className="rounded border border-white/10 px-2 py-1">core 1</span><span className="col-span-2 rounded border border-white/10 px-2 py-1">small fast caches</span></div>
          <div className="mt-2 text-[11px] opacity-80">CPU executes</div>
        </FoundationBox>
        <div><LinkLine label="bidirectional memory-system connection" kind="payload" direction="both" /></div>
        <FoundationBox title="one physical RAM memory system" tone="memory" testId="hardware-ram">
          {ramChildren || <div className="rounded-lg border border-white/10 bg-slate-950/40 p-2 text-xs">physical memory pages</div>}
          <div className="mt-2 text-[11px] opacity-80">RAM stores</div>
        </FoundationBox>
      </div>
      <div className="grid gap-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,0.35fr)_minmax(0,1fr)] lg:items-center">
        <FoundationBox title="NIC · network interface" tone="device" active={nicActive} testId="hardware-nic">NIC transmits/receives</FoundationBox>
        <div><LinkLine label="device interconnect · NIC can access RAM when configured" kind="payload" direction="both" /></div>
        <FoundationBox title="device interconnect" tone="neutral">PCIe/SoC interconnect illustration</FoundationBox>
      </div>
      <LinkLine label="network cable leaves the NIC" kind="network" direction="right" testId="network-cable" />
    </div>
  );
}

export function HostHardwareSoftwareVisual() {
  const [view, setView] = useState<"hardware" | "software">("hardware");
  const [execution, setExecution] = useState<"none" | "application" | "kernel">("none");
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="foundation-host-architecture">
      <ActionRow>
        <FoundationAction testId="show-hardware-toggle" active={view === "hardware"} onClick={() => setView("hardware")}>Show hardware</FoundationAction>
        <FoundationAction testId="show-software-toggle" active={view === "software"} onClick={() => setView("software")}>Show software responsibilities</FoundationAction>
        <FoundationAction testId="run-application-instruction" active={execution === "application"} onClick={() => setExecution("application")}>Execute application instruction</FoundationAction>
        <FoundationAction testId="run-kernel-instruction" active={execution === "kernel"} onClick={() => setExecution("kernel")}>Execute kernel instruction</FoundationAction>
      </ActionRow>
      <HardwareMachine cpuActive={execution !== "none"} cpuLabel={execution === "kernel" ? "same physical CPU · privileged kernel instructions" : execution === "application" ? "same physical CPU · application instructions" : "CPU cores + caches"} softwareOverlay={view === "software"} />
      <SmallNote testId="cpu-execution-result">{execution === "none" ? "Select application or kernel execution: in both cases the highlighted hardware is the same physical CPU, not an extra kernel device." : execution === "application" ? "The CPU is executing user application instructions." : "The same physical CPU is executing privileged Linux kernel instructions."}</SmallNote>
    </div>
  );
}

function ProcessMap({ name, active, frame, shared = false, demandTouched = false }: { name: "A" | "C"; active: boolean; frame: string; shared?: boolean; demandTouched?: boolean }) {
  const rows = [
    ["code", "0x0800–0x0fff", name === "A" ? "P3" : "P11", false],
    ["data / heap", "0x1000–0x1fff", frame, false],
    ["shared library", "0x3000–0x30ff", "P12 · read-only shared", true],
    ["stack", "0x7f00–0x7fff", name === "A" ? "P5" : "P13", false],
    ["demand allocation", "0x4000–0x4fff", demandTouched ? (name === "A" ? "P8 · populated on touch" : "P14 · populated on touch") : "dotted · not yet populated", false],
    ["unmapped gap", "…", "no physical frame", false],
  ] as const;
  return (
    <FoundationBox title={`process ${name} · independent virtual address space`} tone="metadata" active={active} testId={`process-${name.toLowerCase()}-address-space`}>
      <div className="space-y-1.5">
        {rows.map(([label, range, target, isShared]) => (
          <div key={label} className={cx("grid gap-1 rounded-lg border px-2 py-1.5 text-[11px] sm:grid-cols-[5.5rem_7rem_minmax(0,1fr)]", target.toString().startsWith("dotted") ? "border-dashed border-white/15 text-slate-400" : "border-white/10 bg-slate-950/35")}> 
            <span>{label}{isShared ? " · shared" : ""}</span><span className="font-mono">{range}</span><span className="font-mono text-emerald-100">→ {target}</span>
          </div>
        ))}
        <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/7 px-2 py-1.5 font-mono text-[11px] text-cyan-100">VA 0x1000 in process {name} → illustrative physical frame {frame}</div>
      </div>
    </FoundationBox>
  );
}

export function ProcessCreationVisual() {
  const [startedA, setStartedA] = useState(false);
  const [startedC, setStartedC] = useState(false);
  const [active, setActive] = useState<"A" | "C">("A");
  const [touched, setTouched] = useState(false);
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="process-creation-visual">
      <ActionRow>
        <FoundationAction testId="start-program" active={startedA} onClick={() => { setStartedA(true); setActive("A"); }}>Start a program</FoundationAction>
        <FoundationAction testId="start-another-program" active={startedC} onClick={() => { setStartedA(true); setStartedC(true); setActive("C"); }}>Start another program</FoundationAction>
        <FoundationAction testId="select-process-a" active={active === "A"} disabled={!startedA} onClick={() => setActive("A")}>Select process A</FoundationAction>
        <FoundationAction testId="select-process-c" active={active === "C"} disabled={!startedC} onClick={() => setActive("C")}>Select process C</FoundationAction>
        <FoundationAction testId="touch-demand-page" active={touched} disabled={!startedA} onClick={() => setTouched(true)}>Touch demand-allocated byte</FoundationAction>
      </ActionRow>
      <div className="grid gap-3 xl:grid-cols-[15rem_minmax(0,1fr)_15rem]">
        <FoundationBox title="storage" tone="neutral" testId="program-storage"><div className="font-mono text-xs">sender.py<br />python3 interpreter</div></FoundationBox>
        <div className="grid gap-3 lg:grid-cols-2">
          {startedA ? <ProcessMap name="A" active={active === "A"} frame="P7" demandTouched={touched} /> : <FoundationBox title="process A" dashed tone="neutral">not started</FoundationBox>}
          {startedC ? <ProcessMap name="C" active={active === "C"} frame="P9" demandTouched={touched} /> : <FoundationBox title="process C" dashed tone="neutral">not started</FoundationBox>}
        </div>
        <FoundationBox title="one physical RAM" tone="memory" testId="shared-physical-ram"><div className="flex flex-wrap gap-1 font-mono text-[11px]">{["P3", "P5", "P7", "P8", "P9", "P11", "P12 RO", "P13", "P14"].map((page) => <span key={page} className={cx("rounded border px-1.5 py-1", page.includes("12") ? "border-violet-300/30 bg-violet-300/10" : "border-sky-300/30 bg-sky-300/10")}>{page}</span>)}</div><div className="mt-2 text-[11px]">One shared read-only library page may be mapped into both processes; writable process memory remains independent.</div></FoundationBox>
      </div>
      <SmallNote testId="same-va-different-frame">The same numerical virtual address <span className="font-mono">0x1000</span> maps to frame P7 in process A and frame P9 in process C. These are illustrative mappings in different address-space contexts.</SmallNote>
    </div>
  );
}

export function AddressTranslationVisual() {
  const [process, setProcess] = useState<"A" | "C">("A");
  const [readOnly, setReadOnly] = useState(false);
  const [values, setValues] = useState({ A: "48", C: "99" });
  const [result, setResult] = useState("No memory request yet.");
  const frame = process === "A" ? "P7" : "P9";
  function load() {
    setResult(`load byte [0x1002] returned 0x${values[process]} through ${frame}+2`);
  }
  function store() {
    if (readOnly) {
      setResult(`store byte [0x1002] = 0x4c rejected: protection fault in process ${process}; memory remains 0x${values[process]}`);
      return;
    }
    setValues((current) => ({ ...current, [process]: "4c" }));
    setResult(`store byte [0x1002] = 0x4c completed in process ${process}; byte is now 0x4c`);
  }
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="address-translation-visual">
      <ActionRow>
        <FoundationAction testId="translation-select-a" active={process === "A"} onClick={() => setProcess("A")}>Process A context</FoundationAction>
        <FoundationAction testId="translation-select-c" active={process === "C"} onClick={() => setProcess("C")}>Process C context</FoundationAction>
        <FoundationAction testId="request-memory-load" onClick={load}>Request a memory load</FoundationAction>
        <FoundationAction testId="request-memory-store" onClick={store}>Request a memory store</FoundationAction>
        <FoundationAction testId="toggle-readonly-mapping" active={readOnly} onClick={() => setReadOnly((value) => !value)}>{readOnly ? "Make page writable" : "Change mapping to read-only"}</FoundationAction>
      </ActionRow>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_11rem_minmax(0,1fr)_11rem_minmax(0,1fr)] xl:items-center">
        <FoundationBox title="CPU execution" tone="cpu" active testId="translation-cpu"><div className="font-mono text-xs">process {process}<br />load byte [0x1002]<br />store byte [0x1002] = 0x4c</div></FoundationBox>
        <LinkLine label="instruction uses a virtual address" kind="instruction" />
        <FoundationBox title="MMU translation + permission check" tone="success" active testId="mmu-translation"><div className="font-mono text-xs">VA 0x1002<br />process {process} → {frame}+2<br />{readOnly ? "write permission absent" : "write permission present"}</div></FoundationBox>
        <LinkLine label="translation is metadata, not payload movement" kind="translation" />
        <FoundationBox title="cache / memory system" tone="memory" active testId="translated-memory"><div className="font-mono text-xs">frame {frame}<br />offset 2 = 0x{values[process]}<br />process {process} context</div></FoundationBox>
      </div>
      <Legend items={[["instruction", "CPU instruction execution"], ["translation", "address translation metadata"], ["memory", "resulting byte value"]]} />
      <SmallNote testId="translation-result">{result}</SmallNote>
      <SmallNote>Illustrative addresses; simplified cache behavior. This diagram follows logical memory values, not measured physical memory transactions.</SmallNote>
    </div>
  );
}

export function BufferAllocationVisual() {
  const [allocated, setAllocated] = useState(false);
  const [written, setWritten] = useState(false);
  const bytes = written ? helloBuffer : zero16;
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="buffer-allocation-visual">
      <ActionRow>
        <FoundationAction testId="allocate-16-bytes" active={allocated} onClick={() => setAllocated(true)}>Allocate 16 bytes</FoundationAction>
        <FoundationAction testId="write-hello" active={written} disabled={!allocated} onClick={() => setWritten(true)}>Write HELLO</FoundationAction>
      </ActionRow>
      {!allocated ? <FoundationBox title="application memory" tone="neutral" testId="no-allocated-buffer">No allocated buffer.</FoundationBox> : (
        <div className="space-y-3">
          <div className="grid gap-3 xl:grid-cols-[12rem_minmax(0,1fr)]">
            <FoundationBox title="process address map" tone="metadata"><div className="font-mono text-xs">buf mapping<br />0x1000–0x100f<br />capacity 16 bytes</div></FoundationBox>
            <FoundationBox title="CPU executes the store/copy operation" tone="cpu" active={written} testId="buffer-cpu-write">{written ? "buf[:5] = b\"HELLO\" completed; source bytes remain visible below" : "waiting for Write HELLO"}</FoundationBox>
          </div>
          <ByteCells testId="sixteen-byte-buffer" bytes={bytes} offsets={bufferOffsets} addresses={bufferAddresses} ascii highlight={written ? [0, 1, 2, 3, 4] : []} />
          <div className="grid gap-2 sm:grid-cols-2">
            <SmallNote testId="payload-length-observation">Meaningful payload length: <span className="font-mono text-slate-200">{written ? 5 : 0} bytes</span>. Allocated capacity remains <span className="font-mono text-slate-200">16 bytes</span>.</SmallNote>
            <SmallNote>Addresses <span className="font-mono">0x1000–0x100f</span> are illustrative virtual addresses. Offsets 0–15 are positions within the buffer.</SmallNote>
          </div>
        </div>
      )}
    </div>
  );
}

export function CopyReferenceVisual() {
  const [mode, setMode] = useState<"copy" | "reference">("copy");
  const [copied, setCopied] = useState(false);
  const [referencePassed, setReferencePassed] = useState(false);
  const [sourceFirst, setSourceFirst] = useState("48");
  const [destFirst, setDestFirst] = useState("00");
  const source = [sourceFirst, ...helloHex.slice(1), ...Array.from({ length: 11 }, () => "00")];
  const destination = copied ? [destFirst, ...helloHex.slice(1), ...Array.from({ length: 11 }, () => "00")] : zero16;
  function reset(nextMode: "copy" | "reference") {
    setMode(nextMode); setCopied(false); setReferencePassed(false); setSourceFirst("48"); setDestFirst("00");
  }
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="copy-reference-visual">
      <ActionRow>
        <FoundationAction testId="select-copy-demo" active={mode === "copy"} onClick={() => reset("copy")}>Copy demonstration</FoundationAction>
        <FoundationAction testId="select-reference-demo" active={mode === "reference"} onClick={() => reset("reference")}>Reference demonstration</FoundationAction>
        {mode === "copy" ? <FoundationAction testId="copy-five-bytes" active={copied} onClick={() => { setCopied(true); setDestFirst("48"); }}>Copy five bytes</FoundationAction> : <FoundationAction testId="pass-reference" active={referencePassed} onClick={() => setReferencePassed(true)}>Pass a reference instead</FoundationAction>}
        {mode === "copy" ? <FoundationAction testId="modify-copy-destination" disabled={!copied} onClick={() => setDestFirst("58")}>Write X in destination copy</FoundationAction> : <FoundationAction testId="modify-through-reference" disabled={!referencePassed} onClick={() => setSourceFirst("58")}>Write X through reference beta</FoundationAction>}
      </ActionRow>
      <div className="grid gap-3 xl:grid-cols-2">
        <FoundationBox title="source range · 0x1000" tone="memory" testId="copy-source-memory"><ByteCells compact bytes={source} /></FoundationBox>
        <FoundationBox title={mode === "copy" ? "independent destination range · 0x2000" : "no destination copy in reference case"} tone={mode === "copy" ? "memory" : "neutral"} dashed={mode === "reference"} testId="copy-destination-memory"><ByteCells compact bytes={mode === "copy" ? destination : zero16} /></FoundationBox>
      </div>
      {mode === "copy" ? (
        <div className="space-y-1" data-testid="copy-mechanism"><LinkLine label="CPU reads source bytes into transient register/cache state" kind="instruction" direction="down" active={copied} /><LinkLine label="CPU stores byte values into the separate destination" kind="payload" direction="down" active={copied} /><SmallNote testId="copy-state-result">Copy state: source first byte 0x{sourceFirst}; independent destination first byte 0x{copied ? destFirst : "00"}. A later destination modification does not modify the original.</SmallNote></div>
      ) : (
        <div className="space-y-2" data-testid="reference-mechanism"><div className="grid gap-2 sm:grid-cols-2"><FoundationBox title="reference alpha" tone="metadata" active={referencePassed}>points to 0x1000</FoundationBox><FoundationBox title="reference beta" tone="metadata" active={referencePassed}>points to the same 0x1000 bytes</FoundationBox></div><LinkLine label="both logical handles reference one illustrated buffer" kind="reference" direction="both" active={referencePassed} /><SmallNote testId="reference-state-result">Observed through alpha: 0x{sourceFirst}; observed through beta: 0x{sourceFirst}. A write through either reference changes the same underlying byte.</SmallNote></div>
      )}
    </div>
  );
}

export function KernelServiceVisual() {
  const [state, setState] = useState<"user" | "kernel" | "sleeping" | "wakeup">("user");
  const lane = [
    ["user", "CPU executing user code"],
    ["syscall", "system-call entry"],
    ["kernel", "CPU executing kernel code"],
    ["return", "return to user code"],
  ] as const;
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="kernel-service-visual">
      <ActionRow>
        <FoundationAction testId="ask-linux-service" active={state === "kernel"} onClick={() => setState("kernel")}>Ask Linux for a service</FoundationAction>
        <FoundationAction testId="wait-for-device" active={state === "sleeping"} onClick={() => setState("sleeping")}>Wait for device</FoundationAction>
        <FoundationAction testId="device-wakeup" active={state === "wakeup"} disabled={state !== "sleeping"} onClick={() => setState("wakeup")}>Device notification arrives</FoundationAction>
        <FoundationAction testId="return-user-mode" active={state === "user"} onClick={() => setState("user")}>Return to user execution</FoundationAction>
      </ActionRow>
      <div className="grid gap-2 sm:grid-cols-4" data-testid="cpu-mode-time-lane">
        {lane.map(([key, label]) => <div key={key} className={cx("rounded-xl border px-3 py-2 text-center text-xs", (state === "kernel" && ["syscall", "kernel"].includes(key)) || (state === "user" && ["user", "return"].includes(key)) ? "border-amber-300/40 bg-amber-300/10 text-amber-50" : "border-white/10 bg-white/4 text-slate-500")}>{label}</div>)}
      </div>
      <HardwareMachine cpuActive cpuLabel={state === "kernel" || state === "wakeup" ? "one hardware CPU · kernel mode" : "one hardware CPU · user mode"} ramChildren={<div className="font-mono text-xs">same RAM before, during and after the service request</div>} />
      {state === "sleeping" || state === "wakeup" ? <div className="grid gap-2 sm:grid-cols-3" data-testid="thread-wait-state"><FoundationBox title="calling thread" tone="kernel">{state === "sleeping" ? "sleeping while waiting" : "made runnable by wakeup"}</FoundationBox><FoundationBox title="another runnable thread" tone="cpu" active={state === "sleeping"}>can use the CPU meanwhile</FoundationBox><FoundationBox title="device notification" tone="device" active={state === "wakeup"}>asynchronous event; separate from the synchronous call</FoundationBox></div> : null}
      <SmallNote testId="kernel-service-result">Current observation: {state === "kernel" ? "the same CPU is executing privileged kernel code after controlled entry" : state === "sleeping" ? "the waiting thread is suspended; another runnable thread can execute" : state === "wakeup" ? "a device notification caused kernel processing and wakeup" : "the CPU is executing user code"}. No process switch or fixed timing is implied.</SmallNote>
    </div>
  );
}

export function TwoHostsObjectiveVisual() {
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="two-host-objective-visual">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] xl:items-center">
        <FoundationBox title="Server A · distinct physical machine" tone="neutral" testId="two-host-server-a"><div className="space-y-2"><div className="text-xs">process A virtual address space</div><ByteCells compact bytes={helloBuffer} testId="server-a-hello-buffer" /><div className="text-[11px] text-slate-400">one RAM object in Server A · source remains unchanged</div></div></FoundationBox>
        <div><LinkLine label="NIC ↔ Ethernet ↔ NIC" kind="network" direction="both" testId="ethernet-objective-link" /></div>
        <FoundationBox title="Server B · distinct physical machine" tone="neutral" testId="two-host-server-b"><div className="space-y-2"><div className="text-xs">process B virtual address space</div><ByteCells compact bytes={zero16} testId="server-b-zero-buffer" /><div className="text-[11px] text-slate-400">one RAM object in Server B · destination starts zero-filled</div></div></FoundationBox>
      </div>
      <SmallNote>Objective: make the five byte values appear in Server B's buffer. Server A cannot use an ordinary CPU load or store directly on Server B memory. No RDMA keys or queues are introduced here.</SmallNote>
    </div>
  );
}

export function HostFoundationVisual({ sectionId }: { sectionId: string }) {
  if (sectionId === "1.1") return <HostHardwareSoftwareVisual />;
  if (sectionId === "1.2") return <ProcessCreationVisual />;
  if (sectionId === "1.3") return <AddressTranslationVisual />;
  if (sectionId === "1.4") return <BufferAllocationVisual />;
  if (sectionId === "1.5") return <CopyReferenceVisual />;
  if (sectionId === "1.6") return <KernelServiceVisual />;
  return <TwoHostsObjectiveVisual />;
}
