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

function GuidedHardwareComponent({ title, responsibility, active = false, testId, children }: { title: string; responsibility: string; active?: boolean; testId: string; children?: React.ReactNode }) {
  return (
    <div className={cx("mx-auto w-full max-w-xl rounded-2xl border px-4 py-3 text-center transition", active ? "border-cyan-300/55 bg-cyan-300/14 text-cyan-50 shadow-[0_0_28px_rgba(103,232,249,0.10)]" : "border-white/12 bg-slate-950/55 text-slate-300")} data-testid={testId}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-slate-400">{responsibility}</div>
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

function VerticalLink({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div className="flex flex-col items-center py-0.5" aria-label={label}>
      <div className={cx("h-5 w-px", active ? "bg-cyan-300" : "bg-slate-600")} />
      <div className={cx("rounded-full border px-2 py-0.5 text-[10px]", active ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/4 text-slate-500")}>{label}</div>
      <div className={cx("h-5 w-px", active ? "bg-cyan-300" : "bg-slate-600")} />
      <div className={cx("-my-1 font-mono text-sm leading-none", active ? "text-cyan-300" : "text-slate-600")}>↕</div>
    </div>
  );
}

function CompactMobileHostModel({ stage, softwareVisible, applicationActive, kernelActive, memoryActive }: { stage: number; softwareVisible: boolean; applicationActive: boolean; kernelActive: boolean; memoryActive: boolean }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-slate-950/35 p-2 lg:hidden" data-testid="physical-host-model-compact">
      {softwareVisible ? (
        <div className="rounded-xl border border-violet-300/25 bg-violet-300/7 p-2" data-testid="mobile-software-relationships">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className={cx("rounded-lg border border-dashed px-2 py-1.5", applicationActive ? "border-cyan-300/60 bg-cyan-300/14 text-cyan-50" : "border-violet-300/25 text-slate-200")}>
              <div className="text-xs font-semibold">Application software</div>
              <div className="text-[11px] opacity-80">user-level instructions</div>
            </div>
            <div className={cx("rounded-lg border border-dashed px-2 py-1.5", kernelActive ? "border-amber-300/60 bg-amber-300/14 text-amber-50" : "border-violet-300/25 text-slate-200")}>
              <div className="text-xs font-semibold">Kernel software</div>
              <div className="text-[11px] opacity-80">privileged services</div>
            </div>
          </div>
          <div className="mx-auto mt-1 h-4 w-px bg-violet-300/65" aria-hidden="true" />
          <div className="text-center text-[11px] leading-4 text-violet-100/80">both kinds of instructions execute on the same physical CPU</div>
        </div>
      ) : null}
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-center gap-1">
        <div className={cx("rounded-xl border px-2 py-2 text-center", stage >= 2 || stage === 0 ? "border-cyan-300/45 bg-cyan-300/10 text-cyan-50" : "border-white/12 text-slate-300")} data-testid="mobile-hardware-cpu">
          <div className="text-sm font-semibold">CPU + caches</div>
          <div className="mt-1 text-[11px] leading-4 text-slate-300">{kernelActive ? "executing kernel instructions" : applicationActive ? "executing application instructions" : "executes software"}</div>
          {applicationActive ? <div className="mt-1 rounded border border-cyan-300/25 px-1 py-0.5 font-mono text-[10px]">load byte → 0x48 returned</div> : null}
          {kernelActive ? <div className="mt-1 rounded border border-amber-300/25 px-1 py-0.5 text-[10px] text-amber-50">privileged kernel work</div> : null}
        </div>
        <div className={cx("text-center font-mono text-lg", memoryActive ? "text-cyan-300" : "text-slate-500")} aria-label="bidirectional CPU memory access">↕</div>
        <div className={cx("rounded-xl border px-2 py-2 text-center", memoryActive || stage === 0 ? "border-sky-300/40 bg-sky-300/10 text-sky-50" : "border-white/12 text-slate-300")} data-testid="mobile-hardware-memory">
          <div className="text-sm font-semibold">Memory / RAM</div>
          <div className="mt-1 text-[11px] leading-4 text-slate-300">shared physical memory system</div>
          {applicationActive ? <div className="mt-1 rounded border border-sky-300/25 px-1 py-0.5 font-mono text-[10px]">byte value 0x48</div> : null}
        </div>
      </div>
      <div className="my-1 text-center text-[11px] text-slate-400">bidirectional CPU memory access · device access when configured</div>
      <div className="grid grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-center gap-1">
        <div className="rounded-xl border border-white/12 px-2 py-2 text-center text-slate-300" data-testid="mobile-hardware-nic"><div className="text-sm font-semibold">NIC</div><div className="text-[11px]">transmit / receive</div></div>
        <div className="text-center font-mono text-lg text-slate-500">↔</div>
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 px-2 py-2 text-center text-cyan-100"><div className="text-sm font-semibold">Network</div><div className="text-[11px]">other computers</div></div>
      </div>
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
        <div className="hidden rounded-2xl border border-violet-300/25 bg-violet-300/7 p-3 lg:block" data-testid="software-responsibility-overlay">
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

      <CompactMobileHostModel stage={stage} softwareVisible={softwareVisible} applicationActive={applicationActive} kernelActive={kernelActive} memoryActive={memoryActive} />
      <div className="hidden rounded-2xl border border-white/8 bg-slate-950/35 p-2 lg:block" data-testid="physical-host-model">
        <GuidedHardwareComponent
          title={kernelActive ? "Same physical CPU and caches · executing kernel instructions" : applicationActive ? "Same physical CPU and caches · executing application instructions" : "CPU and caches"}
          responsibility="executes application or kernel instructions"
          active={cpuActive || stage === 0}
          testId="hardware-cpu"
        >
          {applicationActive ? <div className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 font-mono text-[11px] text-cyan-50">load byte: read requested memory</div> : null}
          {kernelActive ? <div className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-[11px] text-amber-50">CPU executes privileged kernel instructions for the requested service</div> : null}
        </GuidedHardwareComponent>
        <VerticalLink label="CPU memory access · load/store · bidirectional" active={memoryActive} />
        <GuidedHardwareComponent
          title="Memory system / RAM"
          responsibility="shared physical memory system stores instructions and data"
          active={memoryActive || stage === 0}
          testId="hardware-ram"
        >
          {applicationActive ? <div className="rounded-lg border border-sky-300/30 bg-sky-300/10 px-2 py-1 font-mono text-[11px] text-sky-50">memory contains 0x48<br /><span className="text-emerald-100">0x48 returned to CPU/application</span></div> : null}
        </GuidedHardwareComponent>
        <VerticalLink label="device-access path to memory system · bidirectional when configured" active={stage === 0} />
        <GuidedHardwareComponent title="Network interface" responsibility="NIC transmits and receives network traffic" active={stage === 0} testId="hardware-nic" />
        <VerticalLink label="NIC transmission/reception · bidirectional network signalling" active={stage === 0} />
        <div className="mx-auto w-full max-w-xl rounded-xl border border-cyan-300/20 bg-cyan-300/7 px-4 py-2 text-center text-xs text-cyan-100" data-testid="network-cable">Network</div>
        <div className="mt-2 text-center text-[10px] uppercase tracking-[0.14em] text-slate-500">simplified shared-system relationships · not a serial forwarding path for application data</div>
      </div>

      {stage === 2 ? (
        <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/7 px-3 py-2 text-xs leading-5 text-cyan-50" data-testid="application-memory-access">
          Application instruction → CPU memory access → memory contains 0x48 → 0x48 returned to the CPU/application. A CPU load may be served by caches rather than directly accessing physical DRAM.
        </div>
      ) : null}

      {stage === 3 ? (
        <div className="rounded-xl border border-amber-300/25 bg-amber-300/7 px-3 py-2 text-xs leading-5 text-amber-50" data-testid="kernel-service-flow">
          Application requests a service → the same CPU executes privileged kernel instructions → the kernel performs the relevant service → control returns to the application when appropriate. No separate physical kernel component is introduced.
        </div>
      ) : null}

      <SmallNote testId="cpu-execution-result">
        {stage === 0 ? "Physical CPU, RAM and network interface are shown before any software responsibilities are introduced." : stage === 1 ? "The software overlay is logical. The physical CPU, RAM and network interface underneath are unchanged." : stage === 2 ? "The highlighted application instructions execute on the same physical CPU; the application box is not a processor." : "The highlighted kernel instructions execute on the same physical CPU with different privileges and responsibilities."}
      </SmallNote>
    </div>
  );
}

function ProcessMap({ name, active, frame, shared = false, demandState = "hidden" }: { name: "A" | "C"; active: boolean; frame: string; shared?: boolean; demandState?: "hidden" | "unpopulated" | "populated" }) {
  const rows = [
    ["code", "0x0800–0x0fff", name === "A" ? "P3" : "P11", false],
    ["data / heap", "0x1000–0x1fff", frame, false],
    ...(shared ? [["shared library", "0x3000–0x30ff", "P12 · read-only shared", true] as const] : []),
    ["stack", "0x7f00–0x7fff", name === "A" ? "P5" : "P13", false],
    ...(demandState !== "hidden" ? [["demand allocation", "0x4000–0x4fff", demandState === "populated" ? (name === "A" ? "P8 · populated on touch" : "P14 · populated on touch") : "dotted · virtual mapping not yet populated", false] as const] : []),
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
  const startedC = stage >= 2;
  const sharedVisible = stage >= 3;
  const demandVisible = stage >= 4;
  const touched = stage >= 5;
  const compare = stage >= 2;
  const frames = [
    ...(startedA ? ["P3", "P5", "P7"] : []),
    ...(startedC ? ["P9", "P11", "P13"] : []),
    ...(sharedVisible ? ["P12 RO"] : []),
    ...(touched ? ["P8"] : []),
  ];
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="process-creation-visual" data-guided-stage={stage}>
      <div className="grid gap-3 xl:grid-cols-[15rem_minmax(0,1fr)_15rem]">
        <FoundationBox title="storage" tone="neutral" active={stage === 0} testId="program-storage"><div className="font-mono text-xs">sender.py<br />python3 interpreter</div><div className="mt-1 text-[11px] text-slate-400">program stored on disk</div></FoundationBox>
        <div className="grid gap-3 2xl:grid-cols-2">
          {startedA ? <ProcessMap name="A" active={stage === 1 || compare} frame="P7" shared={sharedVisible} demandState={demandVisible ? (touched ? "populated" : "unpopulated") : "hidden"} /> : <FoundationBox title="process A" dashed tone="neutral">not started</FoundationBox>}
          {startedC ? <ProcessMap name="C" active={stage === 2 || compare} frame="P9" shared={sharedVisible} demandState={demandVisible ? "unpopulated" : "hidden"} /> : <FoundationBox title="process C" dashed tone="neutral">not started</FoundationBox>}
        </div>
        <FoundationBox title="one physical RAM" tone="memory" active={compare} testId="shared-physical-ram">
          {frames.length ? <div className="flex flex-wrap gap-1 font-mono text-[11px]">{frames.map((page) => <span key={page} className={cx("rounded border px-1.5 py-1", page.includes("12") ? sharedVisible ? "border-violet-300/60 bg-violet-300/18" : "border-violet-300/30 bg-violet-300/10" : "border-sky-300/30 bg-sky-300/10")}>{page}</span>)}</div> : <div className="text-xs text-slate-400">No process frames are populated yet.</div>}
          <div className="mt-2 text-[11px]">{sharedVisible ? "The read-only library frame P12 is shared by both mappings; writable process memory remains independent." : "Only frames belonging to introduced processes are shown."}</div>
        </FoundationBox>
      </div>
      <SmallNote testId="same-va-different-frame">
        {stage === 0 ? "The program exists on storage before any process or virtual-address mappings are introduced." : null}
        {stage === 1 ? "Running the program establishes process A and its virtual address space. VA 0x1000 in process A maps to illustrative physical frame P7." : null}
        {stage === 2 ? "Process C has an independent address-space context. The same numerical virtual address 0x1000 maps to frame P7 in process A and frame P9 in process C." : null}
        {stage === 3 ? "Both processes can deliberately map the same read-only library frame P12 while their writable memory remains independent." : null}
        {stage === 4 ? "Each process has a virtual demand-allocation range, but no physical frame is populated for that range yet." : null}
        {stage >= 5 ? "Process A touched its demand-allocation range, so A's illustrative frame P8 is populated. Process C's corresponding range remains unpopulated because no access by C is shown." : null}
      </SmallNote>
    </div>
  );
}

export function AddressTranslationVisual() {
  const stage = useGuidedVisualStage();
  const process = stage >= 3 ? "C" : "A";
  const isStore = stage >= 5;
  const readOnly = stage >= 6;
  const frame = process === "A" ? "P7" : "P9";
  const initialValues = { A: "48", C: "99" } as const;
  const storedC = stage >= 5;
  const value = process === "C" && storedC ? "4c" : initialValues[process];
  const translationVisible = stage === 1 || stage === 2 || stage >= 4;
  const byteVisible = stage === 2 || stage >= 5;
  const activeInstruction = isStore ? "store byte [0x1002] = 0x4c" : "load byte [0x1002]";
  const result = stage === 0
    ? "Process A is about to execute a load using virtual address 0x1002. No translation or memory result is shown yet."
    : stage === 1
      ? "The CPU's Memory Management Unit (MMU) resolves virtual address 0x1002 in process A's address-space context: frame P7 plus byte offset 2."
      : stage === 2
        ? "load byte [0x1002] returned 0x48. Address translation selected the location and checked permission; it is not a separate transfer of the application payload."
        : stage === 3
          ? "Process C now references the same numerical virtual address 0x1002. Its translation has not been shown yet."
          : stage === 4
            ? "In process C's independent address-space context, the same numerical virtual address resolves to frame P9 plus byte offset 2."
            : stage === 5
              ? "store byte [0x1002] = 0x4c completed in process C; the illustrated byte is now 0x4c."
              : "A later store through the now read-only mapping is rejected: protection fault in process C; memory remains 0x4c.";
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="address-translation-visual" data-guided-stage={stage}>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_11rem_minmax(0,1fr)_11rem_minmax(0,1fr)] xl:items-center">
        <FoundationBox title="CPU execution" tone="cpu" active testId="translation-cpu">
          <div className="font-mono text-xs">process {process}</div>
          <div className="mt-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-2 py-1.5 font-mono text-xs text-amber-50" data-testid="active-memory-instruction">{activeInstruction}</div>
          <div className="mt-1 text-[11px] text-slate-400">only the current instruction is active</div>
        </FoundationBox>
        <LinkLine label="instruction uses a virtual address" kind="instruction" active />
        <FoundationBox title="Memory Management Unit (MMU)" tone="success" active={translationVisible} testId="mmu-translation">
          {translationVisible ? <div className="font-mono text-xs">VA 0x1002<br />process {process} context → frame {frame} + byte offset 2<br />{readOnly ? "write permission absent" : "write permission present"}</div> : <div className="text-xs text-slate-400">translation appears when the instruction needs memory</div>}
        </FoundationBox>
        <LinkLine label="translation selects location/permission; it does not move payload" kind="translation" active={translationVisible} />
        <FoundationBox title="cache / memory system" tone="memory" active={byteVisible} testId="translated-memory">
          {byteVisible ? <div className="font-mono text-xs">frame {frame}<br />byte offset 2 = 0x{value}<br />process {process} context</div> : <div className="text-xs text-slate-400">the resulting byte appears after translation</div>}
        </FoundationBox>
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
  const cellsVisible = stage >= 1;
  const written = stage >= 2;
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
          {stage >= 3 ? <SmallNote testId="capacity-length-comparison">Capacity: 16 bytes. Meaningful payload: 5 bytes. The remaining eleven initialized cells are still allocated and unchanged.</SmallNote> : null}
        </div>
      )}
    </div>
  );
}

export function CopyReferenceVisual() {
  const stage = useGuidedVisualStage();
  const referenceCreated = stage >= 1;
  const referenceModified = stage >= 2;
  const copyCreated = stage >= 3;
  const copyModified = stage >= 4;
  const sourceFirst = referenceModified ? "58" : "48";
  const destinationFirst = copyModified ? "59" : sourceFirst;
  const source = [sourceFirst, ...helloHex.slice(1), ...Array.from({ length: 11 }, () => "00")];
  const destination = copyCreated ? [destinationFirst, ...helloHex.slice(1), ...Array.from({ length: 11 }, () => "00")] : [];
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="copy-reference-visual" data-guided-stage={stage}>
      <div className="grid gap-3 xl:grid-cols-2">
        <FoundationBox title="original buffer · 0x1000" tone="memory" active testId="copy-source-memory"><ByteCells compact bytes={source} /></FoundationBox>
        {copyCreated ? <FoundationBox title="independent copy · 0x2000" tone="memory" testId="copy-destination-memory"><ByteCells compact bytes={destination} /></FoundationBox> : <FoundationBox title="independent copy" tone="neutral" dashed testId="copy-destination-memory">No independent copy exists yet.</FoundationBox>}
      </div>
      {!copyCreated ? (
        <div className="space-y-2" data-testid="reference-mechanism">
          <div className="grid gap-2 sm:grid-cols-2">
            <FoundationBox title="reference alpha" tone="metadata" active>points to 0x1000</FoundationBox>
            {referenceCreated ? <FoundationBox title="reference beta" tone="metadata" active={referenceCreated}>points to the same 0x1000 bytes</FoundationBox> : <FoundationBox title="reference beta" tone="neutral" dashed>not created yet</FoundationBox>}
          </div>
          <LinkLine label="both logical handles reference one illustrated buffer" kind="reference" direction="both" active={referenceCreated} />
          <SmallNote testId="reference-state-result">
            Observed through alpha: 0x{sourceFirst}.{referenceCreated ? ` Observed through beta: 0x${sourceFirst}.` : " Reference beta has not been created, so no beta observation is reported."} {referenceModified ? "A write through beta changed the same underlying byte visible through alpha; the original buffer now contains XELLO." : "No write through beta has occurred yet."}
          </SmallNote>
        </div>
      ) : (
        <div className="space-y-1" data-testid="copy-mechanism">
          <LinkLine label="CPU reads the current source bytes into transient register/cache state" kind="instruction" direction="down" active />
          <LinkLine label="CPU stores equivalent byte values into the separate destination" kind="payload" direction="down" active />
          <SmallNote testId="copy-state-result">Copy state: original first byte 0x{sourceFirst}; independent copy first byte 0x{destinationFirst}. {copyModified ? "The copy was modified to YELLO and the original remains XELLO." : "The copy starts with the current XELLO byte values but is independently stored."}</SmallNote>
        </div>
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
