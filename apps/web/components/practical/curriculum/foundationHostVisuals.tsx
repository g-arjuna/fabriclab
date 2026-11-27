"use client";

import { cx } from "./visuals";
import { useGuidedVisualStage } from "./guidedVisualState";
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

function GuidedHardwareComponent({ title, responsibility, active = false, testId }: { title: string; responsibility: string; active?: boolean; testId: string }) {
  return (
    <div className={cx("mx-auto w-full max-w-xl rounded-2xl border px-4 py-3 text-center transition", active ? "border-cyan-300/55 bg-cyan-300/14 text-cyan-50 shadow-[0_0_28px_rgba(103,232,249,0.10)]" : "border-white/12 bg-slate-950/55 text-slate-300")} data-testid={testId}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-slate-400">{responsibility}</div>
    </div>
  );
}

function VerticalLink({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div className="flex flex-col items-center py-0.5" aria-label={label}>
      <div className={cx("h-5 w-px", active ? "bg-cyan-300" : "bg-slate-600")} />
      <div className={cx("rounded-full border px-2 py-0.5 text-[10px]", active ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/4 text-slate-500")}>{label}</div>
      <div className={cx("h-5 w-px", active ? "bg-cyan-300" : "bg-slate-600")} />
      <div className={cx("h-2 w-2 rotate-45 border-b border-r", active ? "border-cyan-300" : "border-slate-600")} />
    </div>
  );
}

export function HostHardwareSoftwareVisual() {
  const stage = useGuidedVisualStage();
  const softwareVisible = stage >= 1;
  const applicationActive = stage === 2;
  const kernelActive = stage === 3;
  const cpuActive = stage >= 2;
  const memoryActive = stage === 2;
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="foundation-host-architecture" data-guided-stage={stage}>
      {softwareVisible ? (
        <div className="rounded-2xl border border-violet-300/25 bg-violet-300/7 p-3" data-testid="software-responsibility-overlay">
          <div className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200">Software · executable instructions, not additional hardware</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={cx("rounded-xl border border-dashed p-3", applicationActive ? "border-cyan-300/60 bg-cyan-300/14 text-cyan-50" : "border-violet-300/25 bg-slate-950/35 text-slate-200")} data-testid="application-software-box">
              <div className="font-semibold">Application</div>
              <div className="mt-1 text-xs opacity-80">User-level work</div>
            </div>
            <div className={cx("rounded-xl border border-dashed p-3", kernelActive ? "border-amber-300/60 bg-amber-300/14 text-amber-50" : "border-violet-300/25 bg-slate-950/35 text-slate-200")} data-testid="kernel-software-box">
              <div className="font-semibold">Linux kernel</div>
              <div className="mt-1 text-xs opacity-80">Resource management · privileged services</div>
            </div>
          </div>
          <div className="mx-auto mt-2 max-w-md" data-testid="software-to-same-cpu-connectors">
            <div className="relative h-8" aria-hidden="true">
              <div className="absolute left-[25%] top-0 h-3 w-px bg-violet-300/55" />
              <div className="absolute right-[25%] top-0 h-3 w-px bg-violet-300/55" />
              <div className="absolute left-[25%] right-[25%] top-3 border-t border-violet-300/55" />
              <div className="absolute left-1/2 top-3 h-4 w-px bg-violet-300/70" />
              <div className="absolute left-1/2 top-7 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-violet-300/70" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-center text-[11px] text-violet-100/80">
              <div>application instructions run on the CPU below</div>
              <div>kernel instructions run on the same CPU below</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-0" data-testid="physical-host-model">
        <GuidedHardwareComponent
          title={kernelActive ? "Same physical CPU and caches · executing kernel instructions" : applicationActive ? "Same physical CPU and caches · executing application instructions" : "CPU and caches"}
          responsibility="CPU: executes instructions"
          active={cpuActive || stage === 0}
          testId="hardware-cpu"
        />
        <VerticalLink label="memory system" active={memoryActive} />
        <GuidedHardwareComponent title="RAM" responsibility="RAM: stores instructions and data" active={memoryActive || stage === 0} testId="hardware-ram" />
        <VerticalLink label="system/device interconnect" active={stage === 0} />
        <GuidedHardwareComponent title="Network interface" responsibility="NIC: transmits and receives network traffic" active={stage === 0} testId="hardware-nic" />
        <VerticalLink label="network" active={stage === 0} />
        <div className="mx-auto w-full max-w-xl rounded-xl border border-white/10 bg-white/4 px-4 py-2 text-center text-xs text-slate-400" data-testid="network-cable">Network</div>
      </div>

      {stage === 2 ? (
        <div className="grid gap-3 rounded-2xl border border-cyan-300/25 bg-cyan-300/7 p-3 lg:grid-cols-4" data-testid="application-memory-access">
          <div className="rounded-xl border border-cyan-300/25 bg-slate-950/40 p-3"><div className="text-xs font-semibold text-cyan-100">Application instruction</div><div className="mt-1 font-mono text-xs">Read a byte from memory</div></div>
          <div className="rounded-xl border border-cyan-300/25 bg-slate-950/40 p-3"><div className="text-xs font-semibold text-cyan-100">CPU</div><div className="mt-1 text-xs">executes the instruction</div></div>
          <div className="rounded-xl border border-cyan-300/25 bg-slate-950/40 p-3"><div className="text-xs font-semibold text-cyan-100">Memory access</div><div className="mt-1 font-mono text-xs">memory contains 0x48</div></div>
          <div className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-3"><div className="text-xs font-semibold text-emerald-100">Value returned</div><div className="mt-1 font-mono text-lg">0x48</div></div>
        </div>
      ) : null}

      {stage === 3 ? (
        <div className="rounded-2xl border border-amber-300/25 bg-amber-300/7 p-3" data-testid="kernel-service-flow">
          <div className="grid gap-2 md:grid-cols-4">
            {["Application requests a service", "CPU executes privileged kernel instructions", "Kernel performs the relevant service", "Application continues when appropriate"].map((item, index) => (
              <div key={item} className="rounded-xl border border-amber-300/25 bg-slate-950/40 px-3 py-2 text-center text-xs text-amber-50"><span className="mr-1 font-mono text-amber-200">{index + 1}</span>{item}</div>
            ))}
          </div>
        </div>
      ) : null}

      <SmallNote testId="cpu-execution-result">
        {stage === 0 ? "Physical CPU, RAM and network interface are shown before any software responsibilities are introduced." : stage === 1 ? "The software overlay is logical. The physical CPU, RAM and network interface underneath are unchanged." : stage === 2 ? "The highlighted application instructions execute on the same physical CPU; the application box is not a processor." : "The highlighted kernel instructions execute on the same physical CPU with different privileges and responsibilities."}
      </SmallNote>
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
  const stage = useGuidedVisualStage();
  const startedA = stage >= 1;
  const startedC = stage >= 3;
  const touched = stage >= 6;
  const compare = stage >= 4;
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="process-creation-visual" data-guided-stage={stage}>
      <div className="grid gap-3 xl:grid-cols-[15rem_minmax(0,1fr)_15rem]">
        <FoundationBox title="storage" tone="neutral" active={stage === 0} testId="program-storage"><div className="font-mono text-xs">sender.py<br />python3 interpreter</div><div className="mt-1 text-[11px] text-slate-400">program stored on disk</div></FoundationBox>
        <div className="grid gap-3 lg:grid-cols-2">
          {startedA ? <ProcessMap name="A" active={stage === 1 || stage === 2 || compare} frame="P7" shared={stage >= 5} demandTouched={touched} /> : <FoundationBox title="process A" dashed tone="neutral">not started</FoundationBox>}
          {startedC ? <ProcessMap name="C" active={stage === 3 || compare} frame="P9" shared={stage >= 5} demandTouched={touched} /> : <FoundationBox title="process C" dashed tone="neutral">not started</FoundationBox>}
        </div>
        <FoundationBox title="one physical RAM" tone="memory" active={compare} testId="shared-physical-ram"><div className="flex flex-wrap gap-1 font-mono text-[11px]">{["P3", "P5", "P7", "P8", "P9", "P11", "P12 RO", "P13", "P14"].map((page) => <span key={page} className={cx("rounded border px-1.5 py-1", page.includes("12") ? stage >= 5 ? "border-violet-300/60 bg-violet-300/18" : "border-violet-300/30 bg-violet-300/10" : "border-sky-300/30 bg-sky-300/10")}>{page}</span>)}</div><div className="mt-2 text-[11px]">One shared read-only library page may be mapped into both processes; writable process memory remains independent.</div></FoundationBox>
      </div>
      <SmallNote testId="same-va-different-frame">The same numerical virtual address <span className="font-mono">0x1000</span> maps to frame P7 in process A and frame P9 in process C. These are illustrative mappings in different address-space contexts.{touched ? " The demand-allocation rows are now populated because the memory was touched." : stage >= 2 ? " Demand-allocation rows remain dotted until touched." : ""}</SmallNote>
    </div>
  );
}

export function AddressTranslationVisual() {
  const stage = useGuidedVisualStage();
  const process = stage >= 4 ? "C" : "A";
  const readOnly = stage >= 7;
  const frame = process === "A" ? "P7" : "P9";
  const initialValues = { A: "48", C: "99" } as const;
  const storedC = stage >= 6;
  const value = process === "C" && storedC ? "4c" : initialValues[process];
  const result = stage === 0
    ? "A virtual address is introduced before any memory request is performed."
    : stage < 3
      ? `process ${process} context is active; VA 0x1002 translates through ${frame}+2`
      : stage === 3
        ? `load byte [0x1002] returned 0x${value} through ${frame}+2`
        : stage < 6
          ? `the same numerical VA 0x1002 is now interpreted in process C and translates through P9+2`
          : stage === 6
            ? "store byte [0x1002] = 0x4c completed in process C; byte is now 0x4c"
            : stage === 7
              ? "the mapping has been changed to read-only; no store has been attempted yet"
              : `store byte [0x1002] = 0x4c rejected: protection fault in process ${process}; memory remains 0x${value}`;
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="address-translation-visual" data-guided-stage={stage}>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_11rem_minmax(0,1fr)_11rem_minmax(0,1fr)] xl:items-center">
        <FoundationBox title="CPU execution" tone="cpu" active testId="translation-cpu"><div className="font-mono text-xs">process {process}<br />load byte [0x1002]<br />store byte [0x1002] = 0x4c</div></FoundationBox>
        <LinkLine label="instruction uses a virtual address" kind="instruction" active={stage >= 1} />
        <FoundationBox title="MMU translation + permission check" tone="success" active={stage >= 2} testId="mmu-translation"><div className="font-mono text-xs">VA 0x1002<br />process {process} → {frame}+2<br />{readOnly ? "write permission absent" : "write permission present"}</div></FoundationBox>
        <LinkLine label="translation is metadata, not payload movement" kind="translation" active={stage >= 2} />
        <FoundationBox title="cache / memory system" tone="memory" active={stage >= 2} testId="translated-memory"><div className="font-mono text-xs">frame {frame}<br />offset 2 = 0x{value}<br />process {process} context</div></FoundationBox>
      </div>
      <Legend items={[["instruction", "CPU instruction execution"], ["translation", "address translation metadata"], ["memory", "resulting byte value"]]} />
      <SmallNote testId="translation-result">{result}</SmallNote>
      <SmallNote>Illustrative addresses; simplified cache behavior. This diagram follows logical memory values, not measured physical memory transactions.</SmallNote>
    </div>
  );
}

export function BufferAllocationVisual() {
  const stage = useGuidedVisualStage();
  const allocated = stage >= 1;
  const cellsVisible = stage >= 2;
  const written = stage >= 3;
  const bytes = written ? helloBuffer : zero16;
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="buffer-allocation-visual" data-guided-stage={stage}>
      {!allocated ? <FoundationBox title="application memory" tone="neutral" testId="no-allocated-buffer">No allocated buffer.</FoundationBox> : (
        <div className="space-y-3">
          <div className="grid gap-3 xl:grid-cols-[12rem_minmax(0,1fr)]">
            <FoundationBox title="process address map" tone="metadata" active={stage >= 1}><div className="font-mono text-xs">buf mapping<br />0x1000–0x100f<br />capacity 16 bytes</div></FoundationBox>
            <FoundationBox title="CPU executes the store/copy operation" tone="cpu" active={written} testId="buffer-cpu-write">{written ? "buf[:5] = b\"HELLO\" completed; source bytes remain visible below" : "sixteen bytes are allocated and initialized"}</FoundationBox>
          </div>
          {cellsVisible ? <ByteCells testId="sixteen-byte-buffer" bytes={bytes} offsets={bufferOffsets} addresses={bufferAddresses} ascii highlight={written ? [0, 1, 2, 3, 4] : []} /> : <FoundationBox title="allocated byte cells" tone="memory" dashed>allocation exists; byte cells are revealed next</FoundationBox>}
          <div className="grid gap-2 sm:grid-cols-2">
            <SmallNote testId="payload-length-observation">Meaningful payload length: <span className="font-mono text-slate-200">{written ? 5 : 0} bytes</span>. Allocated capacity remains <span className="font-mono text-slate-200">16 bytes</span>.</SmallNote>
            <SmallNote>Addresses <span className="font-mono">0x1000–0x100f</span> are illustrative virtual addresses. Offsets 0–15 are positions within the buffer.</SmallNote>
          </div>
          {stage >= 4 ? <SmallNote testId="capacity-length-comparison">Capacity: 16 bytes. Meaningful payload: 5 bytes. The remaining eleven initialized cells are still allocated and unchanged.</SmallNote> : null}
        </div>
      )}
    </div>
  );
}

export function CopyReferenceVisual() {
  const stage = useGuidedVisualStage();
  const referenceCreated = stage >= 1 && stage < 4;
  const referenceModified = stage >= 2 && stage < 4;
  const copyCreated = stage >= 4;
  const copyModified = stage >= 5;
  const sourceFirst = referenceModified ? "58" : "48";
  const destinationFirst = copyModified ? "58" : copyCreated ? "48" : "00";
  const source = [sourceFirst, ...helloHex.slice(1), ...Array.from({ length: 11 }, () => "00")];
  const destination = copyCreated ? [destinationFirst, ...helloHex.slice(1), ...Array.from({ length: 11 }, () => "00")] : zero16;
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="copy-reference-visual" data-guided-stage={stage}>
      <div className="grid gap-3 xl:grid-cols-2">
        <FoundationBox title="original buffer · 0x1000" tone="memory" active testId="copy-source-memory"><ByteCells compact bytes={source} /></FoundationBox>
        <FoundationBox title={copyCreated ? "independent copy · 0x2000" : "no independent copy yet"} tone={copyCreated ? "memory" : "neutral"} dashed={!copyCreated} testId="copy-destination-memory"><ByteCells compact bytes={destination} /></FoundationBox>
      </div>
      {stage < 4 ? (
        <div className="space-y-2" data-testid="reference-mechanism"><div className="grid gap-2 sm:grid-cols-2"><FoundationBox title="reference alpha" tone="metadata" active>points to 0x1000</FoundationBox><FoundationBox title="reference beta" tone="metadata" active={referenceCreated}>{referenceCreated ? "points to the same 0x1000 bytes" : "not created yet"}</FoundationBox></div><LinkLine label="both logical handles reference one illustrated buffer" kind="reference" direction="both" active={referenceCreated} /><SmallNote testId="reference-state-result">Observed through alpha: 0x{sourceFirst}; observed through beta: 0x{sourceFirst}. {referenceModified ? "A write through beta changed the same underlying byte visible through alpha." : "No write through beta has occurred yet."}</SmallNote></div>
      ) : (
        <div className="space-y-1" data-testid="copy-mechanism"><LinkLine label="CPU reads source bytes into transient register/cache state" kind="instruction" direction="down" active /><LinkLine label="CPU stores byte values into the separate destination" kind="payload" direction="down" active /><SmallNote testId="copy-state-result">Copy state: original first byte 0x48; independent copy first byte 0x{destinationFirst}. {copyModified ? "The copy was modified and the original remains unchanged." : "The copy currently contains the same byte values but is independently stored."}</SmallNote></div>
      )}
    </div>
  );
}

export function KernelServiceVisual() {
  const stage = useGuidedVisualStage();
  const state = stage === 0 || stage >= 4 ? "user" : stage === 3 ? "sleeping" : "kernel";
  const lane = [
    ["user", "CPU executing user code"],
    ["syscall", "system-call entry"],
    ["kernel", "CPU executing kernel code"],
    ["return", "return to user code"],
  ] as const;
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="kernel-service-visual" data-guided-stage={stage}>
      <div className="grid gap-2 sm:grid-cols-4" data-testid="cpu-mode-time-lane">
        {lane.map(([key, label]) => <div key={key} className={cx("rounded-xl border px-3 py-2 text-center text-xs", (stage >= 1 && stage <= 2 && ["syscall", "kernel"].includes(key)) || ((stage === 0 || stage >= 4) && ["user", "return"].includes(key)) ? "border-amber-300/40 bg-amber-300/10 text-amber-50" : "border-white/10 bg-white/4 text-slate-500")}>{label}</div>)}
      </div>
      <HardwareMachine cpuActive cpuLabel={stage >= 1 && stage <= 3 ? "one hardware CPU · kernel mode" : "one hardware CPU · user mode"} ramChildren={<div className="font-mono text-xs">same RAM before, during and after the service request</div>} />
      {stage === 3 ? <div className="grid gap-2 sm:grid-cols-3" data-testid="thread-wait-state"><FoundationBox title="calling thread" tone="kernel">sleeping while waiting</FoundationBox><FoundationBox title="another runnable thread" tone="cpu" active>can use the CPU meanwhile</FoundationBox><FoundationBox title="device notification" tone="device">asynchronous event; separate from the synchronous call</FoundationBox></div> : null}
      <SmallNote testId="kernel-service-result">Current observation: {stage === 0 ? "the CPU is executing user code" : stage === 1 ? "a controlled system-call entry transfers execution to kernel code" : stage === 2 ? "the same CPU is executing privileged kernel code" : stage === 3 ? "the waiting thread is suspended; another runnable thread can execute" : "control has returned to user execution"}. No process switch or fixed timing is implied.</SmallNote>
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
