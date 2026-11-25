"use client";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { cx, EvidenceNote, exactValue, FactGrid, SourceExcerpt } from "./visuals";
import { rdmaEvidence } from "@/lib/practical/rdmaEvidence";

const resources = rdmaEvidence.experiments.find((experiment) => experiment.id === "resources")!;
const endpoint = resources.endpoints.initiator;

function MemoryRegistrationDiagram({ stage }: { stage: number }) {
  const registered = stage >= 3;
  const prepared = stage >= 2;
  const allocated = stage >= 1;
  return (
    <figure className="rounded-[1.6rem] border border-white/10 bg-slate-950/35 p-4" data-testid="memory-registration-diagram">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.72fr)]">
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-100">Application process memory</h3>
            <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">one process, several regions</span>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-white/10 bg-slate-950/55 p-3">
              <div className="text-xs font-semibold text-slate-400">Private application state</div>
              <div className="mt-1 font-mono text-sm text-slate-600">authentication state · parser state · unrelated data</div>
            </div>
            <div className={cx("rounded-xl border p-3 transition", allocated ? "border-amber-300/35 bg-amber-300/10" : "border-dashed border-white/10 bg-slate-950/45")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-amber-100">Intended transfer buffer</div>
                {allocated ? <span className="font-mono text-xs text-amber-100/80">length {endpoint.memoryRegion.length} bytes</span> : <span className="text-xs text-slate-600">not allocated yet</span>}
              </div>
              <div className="mt-2 font-mono text-sm text-slate-300">
                {allocated ? "space available to the application" : "—"}
              </div>
              <div className={cx("mt-2 rounded-lg border px-2 py-1.5 text-xs", registered ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100" : "border-white/8 text-slate-500")}>
                {registered ? "registered for explicitly permitted RDMA access" : allocated ? "not registered: the RDMA device has no authority to use it" : "the security problem exists before any registration"}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/55 p-3">
              <div className="text-xs font-semibold text-slate-400">Other process memory</div>
              <div className="mt-1 font-mono text-sm text-slate-600">must remain outside this operation</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/45 p-4">
          <h3 className="font-semibold text-slate-100">RDMA device resource context</h3>
          <div className="mt-4 space-y-3">
            <div className={cx("rounded-xl border p-3", prepared ? "border-cyan-300/35 bg-cyan-300/10" : "border-dashed border-white/10 text-slate-600")}>
              <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{prepared ? "Device context" : "No device context yet"}</div>
              <div className="mt-1 text-sm text-slate-200">{prepared ? "an open handle through which the application uses the RDMA device" : "the application has not established a resource context"}</div>
            </div>
            <div className={cx("rounded-xl border p-3", prepared ? "border-violet-300/35 bg-violet-300/10" : "border-dashed border-white/10 text-slate-600")}>
              <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{prepared ? "Protection domain" : "No protection boundary yet"}</div>
              <div className="mt-1 text-sm text-slate-200">{prepared ? "the resource boundary that associates memory, queues and permissions for this application context" : "the need for a boundary is visible before its technical name"}</div>
            </div>
            <div className={cx("rounded-xl border p-3", registered ? "border-emerald-300/35 bg-emerald-300/10" : "border-dashed border-white/10 text-slate-600")}>
              <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Registered memory region</div>
              {registered ? (
                <dl className="mt-2 grid gap-2 font-mono text-xs text-slate-200">
                  <div className="flex justify-between gap-2"><dt>address</dt><dd>{exactValue(endpoint.memoryRegion.address)}</dd></div>
                  <div className="flex justify-between gap-2"><dt>length</dt><dd>{endpoint.memoryRegion.length}</dd></div>
                  {stage >= 5 ? <div className="flex justify-between gap-2"><dt>LKEY</dt><dd>{exactValue(endpoint.memoryRegion.lkey)}</dd></div> : null}
                  {stage >= 5 ? <div className="flex justify-between gap-2"><dt>RKEY</dt><dd>{exactValue(endpoint.memoryRegion.rkey)}</dd></div> : null}
                </dl>
              ) : <div className="mt-1 text-sm">no memory region registered</div>}
            </div>
          </div>
          {stage >= 4 ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/55 p-3 text-sm leading-6 text-slate-300">
              <strong className="text-slate-100">Access is explicit:</strong> local write, remote write and remote read are separate permissions. Registering memory does not make all memory accessible and does not make every operation permitted.
            </div>
          ) : null}
        </section>
      </div>
      <figcaption className="mt-3 text-xs leading-5 text-slate-500">
        The memory layout is conceptual; the registered-region metadata shown after registration comes from the validated resource-creation reference run. Run-specific addresses and keys are evidence values, not permanent values learners should expect on another execution.
      </figcaption>
    </figure>
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
          <p>The application first allocates an ordinary buffer. At this point the memory belongs to the application process, but the RDMA device has no registered description of it and no permission to use it for RDMA operations.</p>
          <p>An application buffer is a contiguous region described by a starting memory address and a length. Those two values matter because the device needs to know exactly where the permitted region begins and ends.</p>
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
          <p>Registration tells the RDMA device and operating system about one memory region: its starting address, length and allowed access. The device can now use that region in the ways the registration permits. Other memory in the process remains outside the registration.</p>
          <p>The technical object is a <strong className="text-slate-100">Memory Region</strong>, often abbreviated MR. In this laboratory the registered length is {endpoint.memoryRegion.length} bytes and the recorded starting address is run-specific evidence, not a value that another execution should reproduce exactly.</p>
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
          <p>Registering memory does not mean “anyone may do anything.” The access flags say what operations are allowed. Local write permission concerns use by the local system. Remote write and remote read permissions concern operations initiated by a peer.</p>
          <p>This distinction matters because a receive-style operation, an ordinary WRITE and a READ use memory differently. A target that permits remote write is not automatically permitting remote read unless that permission was also granted.</p>
        </>
      ),
      visual: <MemoryRegistrationDiagram stage={4} />,
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
