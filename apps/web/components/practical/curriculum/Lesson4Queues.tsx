"use client";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { cx, EvidenceNote, exactValue, FactGrid, SourceExcerpt } from "./visuals";
import { CompletionLifecycleDiagram } from "./rdmaDiagrams";
import { rdmaEvidence } from "@/lib/practical/rdmaEvidence";

const resources = rdmaEvidence.experiments.find((experiment) => experiment.id === "resources")!;
const a = resources.endpoints.initiator;
const b = resources.endpoints.responder;

function Lesson4Box({ title, children, tone = "neutral", testId, dashed = false }: { title: string; children?: React.ReactNode; tone?: "neutral" | "memory" | "queue" | "completion" | "provider" | "control"; testId?: string; dashed?: boolean }) {
  const tones = {
    neutral: "border-white/12 bg-slate-950/45",
    memory: "border-sky-300/30 bg-sky-300/8",
    queue: "border-cyan-300/30 bg-cyan-300/7",
    completion: "border-lime-300/30 bg-lime-300/7",
    provider: "border-orange-300/30 bg-orange-300/7",
    control: "border-violet-300/30 bg-violet-300/7",
  } as const;
  return (
    <div className={cx("min-w-0 rounded-xl border p-2.5", tones[tone], dashed && "border-dashed opacity-75")} data-testid={testId}>
      <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-500">{title}</div>
      {children ? <div className="mt-1.5 text-xs leading-5 text-slate-200">{children}</div> : null}
    </div>
  );
}

function SmallArrow({ label, dashed = false }: { label: string; dashed?: boolean }) {
  return (
    <div className={cx("flex items-center justify-center gap-2 py-1 text-center text-[10px] leading-4", dashed ? "text-slate-500" : "text-cyan-200/80")}>
      <span className="font-mono text-base leading-none" aria-hidden="true">{dashed ? "⇢" : "↓"}</span>
      <span>{label}</span>
    </div>
  );
}

function HelloMemoryCells() {
  return (
    <div className="flex flex-wrap gap-1" aria-label="registered HELLO buffer">
      {"HELLO".split("").map((char, index) => (
        <span key={`${char}-${index}`} className="rounded border border-sky-300/30 bg-sky-300/10 px-1.5 py-0.5 font-mono text-xs text-sky-100">{char}</span>
      ))}
    </div>
  );
}

function IllustrativeWorkRequest() {
  return (
    <div className="rounded-xl border border-amber-300/30 bg-amber-300/8 p-2.5" data-testid="lesson4-illustrative-work-request">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-amber-100">Work Request · constructed illustration</div>
        <div className="rounded-full border border-amber-300/25 px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] text-amber-100/80">not submitted</div>
      </div>
      <dl className="mt-2 space-y-1 font-mono text-xs text-slate-200">
        <div className="flex justify-between gap-3"><dt>Operation</dt><dd>SEND</dd></div>
        <div className="flex justify-between gap-3"><dt>Source</dt><dd>registered HELLO buffer</dd></div>
        <div className="flex justify-between gap-3"><dt>Length</dt><dd>5 bytes</dd></div>
        <div className="flex justify-between gap-3"><dt>Local key</dt><dd>valid key for the region</dd></div>
      </dl>
    </div>
  );
}

function QueueBox({ title, introduced, children, testId }: { title: string; introduced: boolean; children?: React.ReactNode; testId?: string }) {
  if (!introduced) return null;
  return (
    <Lesson4Box title={title} tone="queue" testId={testId}>
      {children || <div className="rounded border border-dashed border-white/10 px-2 py-1.5 text-slate-500">empty in this illustration</div>}
    </Lesson4Box>
  );
}

function EndpointPreparation({ host, qpn, hasConstructedWr, showCq }: { host: "Server A" | "Server B"; qpn: string; hasConstructedWr?: boolean; showCq: boolean }) {
  return (
    <section className="min-w-0 rounded-xl border border-white/10 bg-slate-900/35 p-2.5" data-testid={`lesson4-endpoint-${host === "Server A" ? "hosta" : "hostb"}`}>
      <h3 className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">{host}</h3>
      {hasConstructedWr ? <div className="mt-2"><IllustrativeWorkRequest /></div> : null}
      <div className="mt-2 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-2" data-testid={`lesson4-qp-${host === "Server A" ? "hosta" : "hostb"}`}>
        <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-cyan-100/80">Queue Pair · local QPN {qpn}</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <QueueBox title="Send Queue" introduced testId={`lesson4-send-queue-${host === "Server A" ? "hosta" : "hostb"}`} />
          <QueueBox title="Receive Queue" introduced testId={`lesson4-receive-queue-${host === "Server A" ? "hosta" : "hostb"}`} />
        </div>
      </div>
      {showCq ? (
        <div className="mt-2">
          <Lesson4Box title="Completion Queue · separate associated resource" tone="completion" testId={`lesson4-cq-${host === "Server A" ? "hosta" : "hostb"}`}>
            created separately and associated with the QP; no completion exists because no data work was submitted
          </Lesson4Box>
        </div>
      ) : null}
    </section>
  );
}

function queuesVisual(stage: number) {
  if (stage >= 5) {
    return (
      <div className="space-y-3">
        {stage === 5 ? (
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3" data-testid="lesson4-cq-introduction-context">
            <div className="text-sm font-semibold text-slate-100">The endpoint resources are prepared, but the illustrative SEND is still not submitted.</div>
            <p className="mt-1 text-sm leading-6 text-slate-300">A Completion Queue is now introduced only to explain how the application would learn an outcome. It is separate from the Queue Pair and empty in this preparation context.</p>
          </div>
        ) : null}
        <CompletionLifecycleDiagram polled={stage >= 6} />
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3 text-sm leading-6 text-slate-300" data-testid="lesson4-no-transfer-boundary">
          This lifecycle is intentionally conceptual. Lesson 4 prepares resources and explains completion mechanics; it does not execute a SEND. The complete receiver-prepared SEND/RECEIVE experiment is Lesson 5.
        </div>
      </div>
    );
  }

  if (stage >= 4) {
    return (
      <figure className="rounded-2xl border border-white/10 bg-slate-950/35 p-3" data-testid="lesson4-peer-endpoint-diagram">
        <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/6 px-2.5 py-2 text-xs leading-5 text-emerald-100/85">
          Actual endpoint preparation is now relevant: resources and peer state exist before any real operation can be posted. The illustrative HELLO request remains constructed, not submitted.
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] lg:items-center">
          <EndpointPreparation host="Server A" qpn={exactValue(a.qpn)} hasConstructedWr showCq={false} />
          <div className="rounded-xl border border-violet-300/30 bg-violet-300/8 px-2 py-3 text-center" data-testid="lesson4-control-channel">
            <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-violet-100">TCP control channel</div>
            <div className="mt-1 font-mono text-[10px] text-violet-100/80">{rdmaEvidence.hosts.hosta.controlIp} ⇄ {rdmaEvidence.hosts.hostb.controlIp}</div>
            <div className="mt-2 text-[11px] leading-4 text-violet-50/85">exchange QPN, PSN and network identity<br />not payload</div>
          </div>
          <EndpointPreparation host="Server B" qpn={exactValue(b.qpn)} showCq={false} />
        </div>
        <figcaption className="mt-2 text-center text-[11px] leading-4 text-slate-500">Resource-creation experiment context. QPN values are recorded evidence; the HELLO instruction is illustrative and remains unposted.</figcaption>
      </figure>
    );
  }

  return (
    <figure className="rounded-2xl border border-white/10 bg-slate-950/35 p-3" data-testid="lesson4-progressive-instruction-diagram">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-white/10 bg-slate-900/45 px-2.5 py-2 text-center text-xs uppercase tracking-[0.14em] text-slate-400">Server A · one application endpoint</div>
        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <Lesson4Box title="Application" tone="neutral">wants to send the five bytes in its registered buffer</Lesson4Box>
            <SmallArrow label="owns registered memory" />
            <Lesson4Box title="Registered memory" tone="memory" testId="lesson4-hello-memory"><HelloMemoryCells /></Lesson4Box>
          </div>
          <div>
            {stage >= 1 ? <IllustrativeWorkRequest /> : <Lesson4Box title="Instruction" dashed>not described yet — memory preparation alone says nothing about the desired operation</Lesson4Box>}
            {stage === 2 ? (
              <>
                <SmallArrow label="posting would submit this instruction here; it has not happened yet" dashed />
                <QueueBox title="Send Queue" introduced testId="lesson4-send-queue-hosta" />
              </>
            ) : null}
            {stage >= 3 ? (
              <div className="mt-2 rounded-xl border border-cyan-300/25 bg-cyan-300/5 p-2" data-testid="lesson4-qp-boundary">
                <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-cyan-100/80">Queue Pair boundary</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <QueueBox title="Send Queue" introduced testId="lesson4-qp-send-queue-hosta" />
                  <QueueBox title="Receive Queue · for incoming SEND work" introduced testId="lesson4-receive-queue-hosta" />
                </div>
              </div>
            ) : null}
          </div>
        </div>
        {stage === 2 ? <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/7 px-2.5 py-2 text-xs leading-5 text-amber-100/85" data-testid="lesson4-chronology-note">Conceptual posting preview only. In the real experiment the endpoint resources and peer-ready state are prepared before any operation is submitted.</div> : null}
        {stage === 3 ? <div className="mt-3 rounded-lg border border-white/10 bg-slate-900/45 px-2.5 py-2 text-xs leading-5 text-slate-400">The Send Queue and Receive Queue have different jobs. Together they form one endpoint; neither queue is application memory.</div> : null}
      </div>
      <figcaption className="mt-3 text-center text-[11px] leading-4 text-slate-500">Resources appear only when the explanation needs them. The illustrative instruction remains outside the queues until the endpoint-preparation sequence is understood.</figcaption>
    </figure>
  );
}

function WorkRequestAnatomy() {
  return (
    <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-4" data-testid="work-request-anatomy">
      <h3 className="font-semibold text-slate-100">One concrete logical instruction</h3>
      <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
        <div className="rounded-xl border border-white/10 bg-slate-950/55 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Work Request = instruction</div>
          <dl className="mt-2 space-y-1 font-mono text-xs text-slate-200">
            <div className="flex justify-between gap-3"><dt>operation</dt><dd>SEND</dd></div>
            <div className="flex justify-between gap-3"><dt>source buffer</dt><dd>registered memory</dd></div>
            <div className="flex justify-between gap-3"><dt>length</dt><dd>5 bytes</dd></div>
            <div className="flex justify-between gap-3"><dt>local key</dt><dd>valid for that region</dd></div>
            <div className="flex justify-between gap-3"><dt>WR ID</dt><dd>application recognition tag</dd></div>
            <div className="flex justify-between gap-3"><dt>signalled</dt><dd>request local completion</dd></div>
          </dl>
        </div>
        <div className="text-center font-mono text-cyan-200" aria-hidden="true">→</div>
        <div className="rounded-xl border border-white/10 bg-slate-950/55 p-3 text-sm leading-6 text-slate-300">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Scatter/Gather Entry</div>
          <p className="mt-2">The local memory description: address says where the local data begins, length says how much data is involved, and LKEY associates that local memory reference with registered access.</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">Later, the Queue Pair will be the communication endpoint whose queues hold posted work. The Completion Queue is introduced separately when the application needs to discover the outcome.</p>
    </section>
  );
}

function stateMachineExplanation() {
  return (
    <details className="rounded-2xl border border-white/10 bg-slate-950/50 p-4" data-testid="qp-state-explanation">
      <summary className="cursor-pointer text-sm font-semibold text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Why do RESET, INIT, RTR and RTS appear in the code?</summary>
      <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
        <p>A newly created Reliable Connected Queue Pair starts in RESET. INIT configures local port and access attributes. RTR — ready to receive — supplies peer addressing information, the destination QPN and the packet sequence number expected from the peer. RTS — ready to send — supplies the local sending sequence number and retry/timeout behavior.</p>
        <p>These states are not separate network protocols. They are programming transitions that make the local endpoint internally consistent. Creating a QP does not automatically tell the remote host anything; the laboratory exchanges endpoint metadata over a separate TCP control channel.</p>
      </div>
    </details>
  );
}

export function Lesson4Queues({ onComplete }: { onComplete: () => void }) {
  const steps: GuidedStep[] = [
    {
      id: "need-work-description",
      title: "Prepared memory is not yet an instruction",
      actionLabel: "Describe the work",
      body: (
        <>
          <p>We have prepared memory for RDMA. But the device still does not know whether we want to send data, receive data, read remote memory or write remote memory. We need a way to describe the work.</p>
          <p>The application must say which operation is requested, which local memory is involved, how many bytes matter, and which key authorizes use of that local memory.</p>
        </>
      ),
      visual: queuesVisual(0),
    },
    {
      id: "work-request",
      title: "A Work Request is the application’s instruction",
      actionLabel: "Introduce the Send Queue",
      body: (
        <>
          <p>A <strong className="text-slate-100">Work Request</strong> is an application-level description of work for the RDMA device. It can describe a send, a receive buffer, a write into named remote memory or a read from named remote memory.</p>
          <p>For memory access, the request references a local buffer by address and length and uses the local memory key. One-sided operations additionally contain the remote address and remote key. The request is not a packet; it is input to the device and transport implementation.</p>
        </>
      ),
      visual: queuesVisual(1),
      interaction: <WorkRequestAnatomy />,
      inspect: (
        <SourceExcerpt path="python/exp_b_send_recv.py" start={131} end={139} title="A real SEND Work Request under construction">
          This excerpt comes from the separate verified SEND experiment, not from the resource-creation run whose QPNs are shown later. The scatter-gather entry names the local buffer address, byte length and LKEY. The SendWR carries the operation type and a signalling flag. Later lessons correlate this exact structure with a genuine packet.
        </SourceExcerpt>
      ),
    },
    {
      id: "queues",
      title: "The Send Queue is where send work will be submitted",
      actionLabel: "Introduce the Receive Queue and Queue Pair",
      body: (
        <>
          <p>The application does not shout instructions into the network. Once an endpoint is ready, it submits a Work Request by posting it to the appropriate queue. Send-style operations are posted to the <strong className="text-slate-100">Send Queue</strong>.</p>
          <p>Constructing an instruction and posting it are different actions. Our HELLO instruction remains constructed in this illustration; the real program cannot submit it until the endpoint resources and peer state exist. This is a conceptual preview of where it will eventually go, not the chronological SEND execution.</p>
        </>
      ),
      visual: queuesVisual(2),
      evidence: <EvidenceNote kind="Mechanism">When an application submits an instruction, it first appears in the appropriate queue. Nothing yet implies that a packet exists.</EvidenceNote>,
    },
    {
      id: "queue-pair",
      title: "A Queue Pair is one communication endpoint",
      actionLabel: "Introduce the peer endpoint",
      body: (
        <>
          <p>An endpoint also needs somewhere to describe memory available for incoming SEND operations. That is the <strong className="text-slate-100">Receive Queue</strong>. A Reliable Connected endpoint uses a Send Queue and a Receive Queue together; together they form a <strong className="text-slate-100">Queue Pair</strong>.</p>
          <p>Each endpoint has its own Queue Pair Number, or QPN. A packet header carries the destination QPN: the QPN of the endpoint that packet is targeting.</p>
          <p>A QP is not a TCP connection and a QPN is not an IP address or UDP port. RoCEv2 uses IP and UDP underneath, while the RDMA transport uses QPNs and packet sequence numbers for endpoint and reliability semantics.</p>
        </>
      ),
      visual: queuesVisual(3),
      inspect: (
        <div className="space-y-4">
          <FactGrid facts={[
            { label: "Server A endpoint QPN", value: exactValue(a.qpn) },
            { label: "Server A peer QPN", value: exactValue(a.destinationQpn) },
            { label: "Server B endpoint QPN", value: exactValue(b.qpn) },
            { label: "Server B peer QPN", value: exactValue(b.destinationQpn) },
          ]} />
          <p>These endpoint numbers come from the validated resource-creation run. They are run-specific identifiers, not universal constants.</p>
        </div>
      ),
    },
    {
      id: "connection-setup",
      title: "Both endpoints must be programmed with peer information",
      actionLabel: "Introduce the Completion Queue",
      body: (
        <>
          <p>Server A cannot communicate by itself. Server B prepares its own endpoint, and each side needs enough peer information to interpret and generate transport packets: the peer’s QPN, initial packet sequence number and RoCEv2 network identity.</p>
          <p>In this laboratory that information is exchanged through a separate TCP control mechanism. The control channel carries metadata only. It does not carry the RDMA payload, and creating a QP does not automatically establish remote communication.</p>
        </>
      ),
      visual: queuesVisual(4),
      interaction: stateMachineExplanation(),
      inspect: (
        <SourceExcerpt path="python/rdma_common.py" start={155} end={191} title="RESET → INIT → RTR → RTS in the real helper">
          The comments in the embedded source show why each transition exists. RTR programs information needed to receive from the peer; RTS programs information needed to send to the peer.
        </SourceExcerpt>
      ),
    },
    {
      id: "completion-queue",
      title: "A Completion Queue reports local outcomes to the application",
      actionLabel: "Compare requests, packets, acknowledgements and completions",
      body: (
        <>
          <p>Posting work is not the same as knowing the outcome. When a signalled operation completes, the device or provider places a <strong className="text-slate-100">Completion Queue Entry</strong> into a Completion Queue. The application polls that queue and interprets the entry.</p>
          <p>A Completion Queue is an independently created resource associated with one or more Queue Pairs. Multiple QPs may share a CQ, and send and receive completions may use the same or different CQs depending on the design. A QP itself consists of its Send Queue and Receive Queue.</p>
          <p>A completion is local application evidence. It is not a network packet and it is not the peer’s completion. A transport acknowledgement can contribute to the reliable-transport outcome, but the acknowledgement on the wire and the completion observed by the application are different objects.</p>
        </>
      ),
      visual: queuesVisual(5),
      inspect: (
        <SourceExcerpt path="python/rdma_common.py" start={194} end={224} title="Polling a real Completion Queue">
          The application repeatedly polls the CQ. It interprets a completion only after checking successful status. This is why completion ownership is local and explicit.
        </SourceExcerpt>
      ),
    },
    {
      id: "four-objects",
      title: "Four related objects must remain distinct",
      actionLabel: "Continue: perform a real SEND/RECEIVE transfer",
      body: (
        <>
          <p>A Work Request is the application’s instruction. A network packet is a wire-format artifact produced as transport executes work. A transport acknowledgement is network behavior used by reliable transport. A Work Completion is a local record observed by an application.</p>
          <p>They can correlate strongly, but they are not interchangeable. Confusing them causes exactly the operational mistakes network engineers need to avoid: treating an ACK as application consumption, treating a local completion as a peer event, or assuming a posted request means a packet already exists.</p>
        </>
      ),
      visual: queuesVisual(6),
      evidence: <EvidenceNote kind="Validated reference context">The resource-creation experiment reaches ready endpoint state but posts no data work. No data-operation capture exists for it because preparing resources is not itself an RDMA data transfer.</EvidenceNote>,
    },
  ];

  return <GuidedLesson lessonId="queues" steps={steps} onComplete={onComplete} finalActionLabel="Start Lesson 5: real SEND/RECEIVE" />;
}
