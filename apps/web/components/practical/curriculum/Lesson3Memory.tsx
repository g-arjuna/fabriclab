"use client";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { cx, EvidenceNote, exactValue, FactGrid, SourceExcerpt } from "./visuals";
import { ResourceRelationshipDiagram } from "./rdmaDiagrams";
import { rdmaEvidence } from "@/lib/practical/rdmaEvidence";

const resources = rdmaEvidence.experiments.find((experiment) => experiment.id === "resources")!;
const endpoint = resources.endpoints.initiator;

function ProcessMemoryScope({ stage }: { stage: number }) {
  const allocated = stage >= 1;
  const registered = stage >= 3;
  return (
    <section className="mb-3 rounded-xl border border-white/10 bg-slate-950/45 p-3" data-testid="process-memory-scope">
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Application process memory</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-slate-900/35 p-2 text-xs text-slate-500">private state<br /><span className="font-mono">must remain outside</span></div>
        <div className={cx("rounded-lg border p-2 text-xs", registered ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100" : allocated ? "border-amber-300/35 bg-amber-300/10 text-amber-100" : "border-dashed border-white/10 text-slate-600")}>
          intended transfer buffer<br />
          <span className="font-mono">{registered ? "registered for permitted access" : allocated ? "allocated, not yet registered" : "not allocated yet"}</span>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-900/35 p-2 text-xs text-slate-500">unrelated memory<br /><span className="font-mono">outside this operation</span></div>
      </div>
    </section>
  );
}

function MemoryRegistrationDiagram({ stage }: { stage: number }) {
  const allocated = stage >= 1;
  const registered = stage >= 3;
  return (
    <div data-testid="memory-registration-diagram">
      <ProcessMemoryScope stage={stage} />
      {stage < 2 ? (
        <figure className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
          <div className="mx-auto max-w-xl text-center">
            <div className="rounded-xl border border-amber-300/25 bg-amber-300/8 p-4">
              <div className="text-sm font-semibold text-amber-100">The safety problem</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {allocated
                  ? "The application owns the intended buffer, but the RDMA device has no registered description of it and no authority to use it."
                  : "If a device can access memory, the application needs a way to authorize exactly one region rather than expose the whole process."}
              </p>
              {allocated ? <div className="mt-3 font-mono text-xs text-amber-100/80">buffer length {endpoint.memoryRegion.length} bytes · address exists in the process, but is not yet device-authorized</div> : null}
            </div>
          </div>
          <figcaption className="mt-3 text-center text-xs text-slate-500">Conceptual memory layout. Registration metadata appears only after the real registration operation.</figcaption>
        </figure>
      ) : (
        <div>
          <ResourceRelationshipDiagram stage={stage} />
          {registered ? (
            <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/7 p-3" data-testid="registered-memory-evidence">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-100">Recorded registered memory metadata</div>
              <dl className="mt-2 grid gap-2 font-mono text-xs text-slate-200 sm:grid-cols-2">
                <div className="flex justify-between gap-2"><dt>address</dt><dd>{exactValue(endpoint.memoryRegion.address)}</dd></div>
                <div className="flex justify-between gap-2"><dt>length</dt><dd>{endpoint.memoryRegion.length}</dd></div>
                {stage >= 5 ? <div className="flex justify-between gap-2"><dt>LKEY</dt><dd>{exactValue(endpoint.memoryRegion.lkey)}</dd></div> : null}
                {stage >= 5 ? <div className="flex justify-between gap-2"><dt>RKEY</dt><dd>{exactValue(endpoint.memoryRegion.rkey)}</dd></div> : null}
              </dl>
              {stage >= 4 ? <p className="mt-2 text-xs leading-5 text-emerald-100/80">Local write, remote write and remote read are distinct permissions. Registration does not authorize unrelated memory or every operation.</p> : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function MemoryAccessExercise() {
  const cases = [
    {
      id: "valid-read",
      label: "Read 8 bytes inside the region",
      result: "Permitted",
      tone: "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
      explanation: "The request names the registered region, stays inside its address range and requires remote-read permission, which exists in this illustration.",
    },
    {
      id: "write-without-permission",
      label: "Write 8 bytes into the region",
      result: "Rejected",
      tone: "border-amber-300/35 bg-amber-300/10 text-amber-100",
      explanation: "The range is inside the region, but the illustrated permissions allow remote read and not remote write. A valid address range is not sufficient without the required access permission.",
    },
    {
      id: "out-of-bounds-read",
      label: "Read bytes beyond the 16-byte region",
      result: "Rejected",
      tone: "border-amber-300/35 bg-amber-300/10 text-amber-100",
      explanation: "The operation names the region and remote read is allowed, but the requested range crosses the registered boundary. Permission does not extend to unrelated memory.",
    },
  ] as const;
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-4" data-testid="memory-access-exercise">
      <h3 className="font-semibold text-slate-100">Conceptual memory-access check</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">Illustrative registered buffer: address <span className="font-mono text-cyan-100">0x1000</span>, length 16 bytes. Permissions: remote read allowed; remote write not allowed. Inspect each proposed operation.</p>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {cases.map((item) => (
          <details key={item.id} className="rounded-xl border border-white/10 bg-slate-900/45 p-3" data-testid={`memory-access-${item.id}`}>
            <summary className="cursor-pointer text-sm font-medium text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">{item.label}</summary>
            <div className={cx("mt-3 rounded-lg border p-2 text-xs font-semibold", item.tone)}>{item.result}</div>
            <p className="mt-2 text-xs leading-5 text-slate-300">{item.explanation}</p>
          </details>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">Conceptual access model, not a fabricated packet or completion-status experiment.</p>
    </section>
  );
}

export function Lesson3Memory({ onComplete }: { onComplete: () => void }) {
  const steps: GuidedStep[] = [
    {
      id: "security-problem",
      title: "A device that can access memory creates a safety problem",
      actionLabel: "Allocate a buffer",
      body: (
        <>
          <p>If an RDMA device can read or write application memory, unrestricted access would be unacceptable. A process contains memory that has nothing to do with the intended transfer: private application state, unrelated data structures and memory owned for completely different purposes.</p>
          <p>The first design problem is therefore not speed. It is scoping: how does the application say “this specific memory, for these specific operations, may be used by the RDMA device”?</p>
        </>
      ),
      visual: <MemoryRegistrationDiagram stage={0} />,
      evidence: <EvidenceNote kind="Problem before terminology">The need for registration follows from the danger of unconstrained device memory access. We do not start by memorizing object names; we first decide what must be constrained.</EvidenceNote>,
    },
    {
      id: "allocate-buffer",
      title: "Allocation alone does not authorize the device",
      actionLabel: "Prepare the device context and protection boundary",
      body: (
        <>
          <p>The application first allocates an ordinary buffer. The application references it through a virtual address and length. At this point the memory belongs to the application process, but allocation alone does not create a Memory Region, a device-visible translation relationship or permission for the RDMA device/provider to use it.</p>
          <p>Registration is needed because the device/provider must have a valid registered mapping and explicit access attributes for the intended region. Depending on the provider and registration model, residency, pinning and translation may involve additional mechanisms such as on-demand paging; this lesson does not need the full virtual-memory implementation detail.</p>
        </>
      ),
      visual: <MemoryRegistrationDiagram stage={1} />,
      inspect: (
        <SourceExcerpt path="python/exp_a_resources.py" start={77} end={83} title="The reference program allocates memory before registration" emphasisLines={[79]} emphasisLabel="Highlighted line 79 creates the application buffer represented as the intended transfer memory in the diagram.">
          <code className="font-mono text-cyan-100">ctypes.create_string_buffer(BUF_LEN)</code> creates process memory. Nothing about that allocation, by itself, authorizes an RDMA device to access it. In the embedded source the PD is created one line earlier because both are independent setup prerequisites; their relative order is not what creates protection.
        </SourceExcerpt>
      ),
    },
    {
      id: "protection-domain",
      title: "The application establishes the resource boundary",
      actionLabel: "Register the buffer",
      body: (
        <>
          <p>Before memory can be registered, the application opens the RDMA device context and creates a protection boundary for the resources that belong together. The boundary exists so memory regions, queues and access permissions are associated with one controlled application context rather than floating independently.</p>
          <p>The technical term is a <strong className="text-slate-100">Protection Domain</strong>, normally shortened to PD only after the purpose is clear. A PD does not encrypt memory. It scopes which RDMA resources are associated with one another.</p>
        </>
      ),
      visual: <MemoryRegistrationDiagram stage={2} />,
      inspect: (
        <SourceExcerpt path="python/exp_a_resources.py" start={77} end={84} title="PD creation precedes memory registration" emphasisLines={[78]} emphasisLabel="Highlighted line 78 creates the Protection Domain shown in the resource-context side of the diagram.">
          <code className="font-mono text-cyan-100">pd_mod.PD(ctx)</code> creates the Protection Domain. The next lines use that PD when registering memory and creating queues, visually connecting the object to the resource boundary in the diagram. Allocation and PD creation are independent prerequisites; registration is the operation that binds the buffer, permissions and boundary together.
        </SourceExcerpt>
      ),
    },
    {
      id: "register-memory",
      title: "Registration makes a specific region available for permitted operations",
      actionLabel: "Inspect access permissions",
      body: (
        <>
          <p>Registration tells the RDMA device/provider and operating system about one intended buffer: its virtual starting address, length, protection attributes and applicable address-translation relationship. The resulting <strong className="text-slate-100">Memory Region</strong> is the registered resource describing that buffer; it is not the buffer allocation itself.</p>
          <p>The device/provider can now use the region in the ways the registration permits. Other memory in the process remains outside the registration. In this laboratory the registered length is {endpoint.memoryRegion.length} bytes and the recorded starting address is run-specific evidence, not a value that another execution should reproduce exactly.</p>
        </>
      ),
      visual: <MemoryRegistrationDiagram stage={3} />,
      evidence: <EvidenceNote kind="Recorded application evidence">The resource-creation experiment recorded the registered address, length and keys shown here. These values are valid evidence for that run, not constants of RDMA.</EvidenceNote>,
      inspect: (
        <SourceExcerpt path="python/rdma_common.py" start={131} end={134} title="The real registration helper" emphasisLines={[132, 133, 134]} emphasisLabel="The highlighted helper return binds the buffer address, length, access permissions and Protection Domain into the registered Memory Region shown in the diagram.">
          <code className="font-mono text-cyan-100">mr_mod.MR(pd, length=length, access=ACCESS, address=ctypes.addressof(buf))</code> binds the PD, buffer address, length and access permissions into one registered Memory Region.
        </SourceExcerpt>
      ),
    },
    {
      id: "permissions",
      title: "Local and remote access are distinct permissions",
      actionLabel: "Inspect memory keys",
      body: (
        <>
          <p>Registering memory does not mean “anyone may do anything.” The access flags say what operations are allowed. Remote write and remote read permissions concern operations initiated by a peer. A local-write registration flag is different from the application’s ordinary CPU permission to write its own process memory.</p>
          <p>Use the short access check below to see that three requirements are independent: the operation must identify the appropriate registered memory, the requested range must be valid and the required access permission must exist. This distinction matters because receive-style operations, ordinary WRITE and READ use memory differently.</p>
        </>
      ),
      visual: <MemoryRegistrationDiagram stage={4} />,
      interaction: <MemoryAccessExercise />,
      inspect: (
        <SourceExcerpt path="python/rdma_common.py" start={35} end={42} title="The laboratory access flags" emphasisLines={[40, 41, 42]} emphasisLabel="The highlighted flags are the exact permissions later associated with the registered memory region.">
          The reference lab enables local write, remote write and remote read so that all three later operations can be studied. A production application should grant only the access its design requires.
        </SourceExcerpt>
      ),
    },
    {
      id: "keys",
      title: "Memory keys identify authorized access to the registered region",
      actionLabel: "Continue: how does work reach the device?",
      body: (
        <>
          <p>Registration produces keys used by the verbs programming model. The local key, or LKEY, authorizes local references to the registered memory in work requests. The remote key, or RKEY, is the value a peer must present when a one-sided operation names this memory.</p>
          <p>An RKEY is not encryption and it is not a general authentication credential for the server. It is a scoped authorization value associated with a registered region and its permissions. Presenting it does not expose unrelated memory.</p>
          <p>The resource-creation experiment produces no RDMA data-operation packets because preparing communication resources is not itself a data transfer. No work request has yet asked the device to send, write or read application data.</p>
        </>
      ),
      visual: <MemoryRegistrationDiagram stage={5} />,
      evidence: <EvidenceNote kind="Validated relationship">The recorded resource experiment created endpoints with QPNs, memory regions and keys, then deliberately posted no data work request. The absence of a data capture is therefore expected evidence, not missing evidence.</EvidenceNote>,
      inspect: (
        <div className="space-y-4">
          <FactGrid facts={[
            { label: "Recorded local key", value: exactValue(endpoint.memoryRegion.lkey) },
            { label: "Recorded remote key", value: exactValue(endpoint.memoryRegion.rkey) },
            { label: "Recorded address", value: exactValue(endpoint.memoryRegion.address) },
            { label: "Registered length", value: `${endpoint.memoryRegion.length} bytes` },
          ]} />
          <p>These are the actual values from the validated reference execution. They identify this run’s registered resource; they are not permanent addresses or reusable credentials.</p>
        </div>
      ),
    },
  ];

  return <GuidedLesson lessonId="memory" steps={steps} onComplete={onComplete} finalActionLabel="Start Lesson 4: queues and work" />;
}
