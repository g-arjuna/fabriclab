"use client";

import { useMemo, useState } from "react";

import { exact, rdmaEvidence } from "@/lib/practical/rdmaEvidence";

import { cx } from "./visuals";
import { ActionRow, ByteCells, FoundationAction, FoundationBox, LinkLine, SmallNote } from "./foundationVisualPrimitives";

const zeros16 = Array.from({ length: 16 }, () => "00");
const hello16 = ["48","45","4c","4c","4f",...Array.from({length:11},()=>"00")];
const resources = rdmaEvidence.experiments.find((experiment) => experiment.id === "resources")!;
const writeExperiment = rdmaEvidence.experiments.find((experiment) => experiment.id === "write")!;
const mr = resources.endpoints.initiator.memoryRegion;
const responderMr = resources.endpoints.responder.memoryRegion;

function sourceLines(path: string, start: number, end: number) {
  const source = rdmaEvidence.sources.find((item) => item.path === path);
  return source?.lines.filter((line) => line.number >= start && line.number <= end) ?? [];
}
function SourceExcerpt({ path, start, end, label }: { path: string; start: number; end: number; label: string }) {
  const lines = sourceLines(path,start,end);
  return <div className="rounded-xl border border-white/10 bg-slate-950/80 p-3" data-testid="actual-python-source-excerpt"><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label} · {path}:{start}-{end}</div><pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-5 text-slate-200">{lines.map((line)=><span key={line.number} className="block"><span className="mr-3 select-none text-slate-600">{line.number}</span>{line.text}</span>)}</pre></div>;
}
function MemoryObject({ bytes = hello16, title = "existing illustrative 16-byte buffer", testId = "illustrative-memory-buffer", highlight = [] as number[] }) {
  return <FoundationBox title={title} tone="memory" testId={testId}><ByteCells compact bytes={bytes} highlight={highlight} /></FoundationBox>;
}
function StepLanes({ steps, active }: { steps: string[]; active: number }) {
  return <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{steps.map((step,index)=><div key={step} className={cx("rounded-xl border px-3 py-2 text-xs",index<=active?"border-cyan-300/35 bg-cyan-300/10 text-cyan-50":"border-white/10 bg-white/4 text-slate-500")}><span className="font-mono text-slate-400">{index+1}. </span>{step}</div>)}</div>;
}

export function DmaCopyVisual() {
  const [copied,setCopied]=useState(false);
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="foundation-dma-copy"><ActionRow><FoundationAction testId="configure-dma-copy" active={copied} onClick={()=>setCopied(true)}>Configure the device copy</FoundationAction></ActionRow><div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] xl:items-center"><MemoryObject bytes={hello16} title="RAM source"/><div><LinkLine label="CPU writes source/destination metadata" kind="instruction" active={copied}/><LinkLine label="device payload access over interconnect" kind="payload" direction="both" active={copied} testId="dma-device-memory-access"/></div><MemoryObject bytes={copied?hello16:zeros16} title="RAM destination / device receive buffer"/><FoundationBox title="DMA-capable device engine" tone="device" active={copied}>copies/moves bytes using device-visible addresses</FoundationBox></div><SmallNote>CPU creates or configures the copy metadata; after that the device can access RAM without the CPU copying each byte. This is an illustrative device mechanism, not proof every NIC uses identical descriptors.</SmallNote></div>;
}

export function DmaAddressContextsVisual() {
  const [deviceView,setDeviceView]=useState(false);
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="dma-address-contexts"><ActionRow><FoundationAction testId="show-device-address-view" active={deviceView} onClick={()=>setDeviceView(v=>!v)}>Show the device-visible address view</FoundationAction></ActionRow><div className="grid gap-3 xl:grid-cols-4"><FoundationBox title="application virtual address" tone="metadata"><span className="font-mono">0x1000</span></FoundationBox><FoundationBox title="CPU/MMU translation" tone="success">VA 0x1000 → physical frame P7+0</FoundationBox><FoundationBox title="illustrative physical memory" tone="memory"><span className="font-mono">P7+0 · HELLO bytes</span></FoundationBox><FoundationBox title={deviceView?"device-visible DMA address":"device address view hidden"} tone="device" active={deviceView}><span className="font-mono">{deviceView?"DMA 0x4000 → P7+0":"select action"}</span></FoundationBox></div><div className="grid gap-2 lg:grid-cols-2"><LinkLine label="CPU/MMU translation metadata" kind="translation" active/><LinkLine label="device mapping metadata; IOMMU only when present/enabled" kind="translation" active={deviceView}/></div><SmallNote>Same underlying memory, separate address contexts. DMA addresses are platform/device dependent; do not assume an enabled IOMMU or a fixed identity mapping.</SmallNote></div>;
}

export function TransferModelComparisonVisual() {
  const [model,setModel]=useState<"tcp"|"rdma">("tcp");
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="tcp-rdma-model-comparison"><ActionRow><FoundationAction testId="show-tcp-model" active={model==="tcp"} onClick={()=>setModel("tcp")}>TCP model</FoundationAction><FoundationAction testId="show-rdma-model" active={model==="rdma"} onClick={()=>setModel("rdma")}>Prepared RDMA model</FoundationAction></ActionRow><div className="grid gap-2 lg:grid-cols-5">{(model==="tcp"?["app memory","CPU copy","kernel socket storage","protocol processing","NIC transfer"]:["prepared app memory","registered metadata","QP work request","transport engine","network/target memory"]).map((x)=><div key={x} className="rounded-xl border border-cyan-300/20 bg-cyan-300/6 px-2 py-2 text-center text-xs text-cyan-50">{x}</div>)}</div><SmallNote>{model==="tcp"?"TCP applications use sockets and byte streams; kernel-managed buffering and protocol processing are central.":"RDMA work requests describe prepared memory resources and remote addresses. Resource creation and metadata exchange happen before data operations."} This compares teaching models, not universal implementation internals or performance.</SmallNote></div>;
}

export function SoftRoceStackVisual() {
  const [path,setPath]=useState<"rxe"|"hardware">("rxe");
  const active = path==="rxe"?["Python application","Pyverbs / libibverbs","Linux RDMA core + RXE software transport","Linux UDP/IP + Ethernet driver","data0 interface","network"]:["Python application","Pyverbs / libibverbs + hardware provider","prepared RNIC resources","hardware RNIC transport","physical Ethernet interface","network"];
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="soft-roce-instruction-path"><ActionRow><FoundationAction testId="show-rxe-path" active={path==="rxe"} onClick={()=>setPath("rxe")}>RXE software path</FoundationAction><FoundationAction testId="show-hardware-path" active={path==="hardware"} onClick={()=>setPath("hardware")}>Representative hardware RNIC path</FoundationAction></ActionRow><div className="grid gap-2 lg:grid-cols-6">{active.map((x,index)=><div key={x} className={cx("rounded-xl border px-2 py-2 text-center text-xs",index<3&&path==="rxe"?"border-amber-300/35 bg-amber-300/10 text-amber-50":"border-cyan-300/20 bg-cyan-300/6 text-cyan-50")}>{x}</div>)}</div><div className="grid gap-3 xl:grid-cols-2"><FoundationBox title="logical RXE RDMA device" tone="metadata" active={path==="rxe"}>rxe0 · created/configured logical device</FoundationBox><FoundationBox title="physical or virtual Ethernet interface" tone="device" active>data0 · ordinary network interface</FoundationBox></div><SmallNote>Python → Pyverbs → verbs provider/kernel path → RXE executes the software transport through Linux networking. Hardware RNICs implement transport in NIC hardware. RXE does not demonstrate hardware bypass or hardware-offload performance.</SmallNote></div>;
}

export function RdmaInitiationVisual({ conceptOnly=false }: { conceptOnly?: boolean }) {
  const [step,setStep]=useState(0);
  const steps=["prepare memory/resources","describe work","submit work to endpoint","observe result"];
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="rdma-initiation-sequence"><ActionRow><FoundationAction testId="rdma-next-stage" onClick={()=>setStep(v=>(v+1)%4)}>{step===0?"Start preparation":"Advance to next meaningful stage"}</FoundationAction></ActionRow><StepLanes steps={steps} active={step}/><div className="grid gap-3 xl:grid-cols-4"><FoundationBox title="memory resources" tone="memory" active={step>=0}>{step>=0?"MR/PD/CQ/QP objects exist":"not prepared"}</FoundationBox><FoundationBox title="work request description" tone="metadata" active={step>=1}>{step>=1?"operation + memory references":"not described"}</FoundationBox><FoundationBox title="send queue endpoint" tone="device" active={step>=2}>{step>=2?"posted to QP":"not submitted"}</FoundationBox><FoundationBox title="completion / remote observation" tone="success" active={step>=3}>{step>=3?"observed after execution":"no result yet"}</FoundationBox></div>{conceptOnly?<SmallNote>Conceptual sequence only; actual object relationships and evidence appear in the resource lessons.</SmallNote>:<SmallNote>No data operation packet is produced merely by creating resources. Submission and transport execution are separate steps.</SmallNote>}</div>;
}

export function RegistrationVisual() {
  const [registered,setRegistered]=useState(false);
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="registration-illustration"><ActionRow><FoundationAction testId="prepare-region-for-rdma" active={registered} onClick={()=>setRegistered(true)}>Prepare this region for RDMA</FoundationAction></ActionRow><div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_10rem_minmax(0,0.8fr)] xl:items-center"><MemoryObject/><div>{registered?<LinkLine label="logical registration object references the same existing bytes" kind="reference" direction="both" testId="mr-reference-link"/>:null}</div><FoundationBox title={registered?"memory registration object":"no MR or keys yet"} tone={registered?"metadata":"neutral"} dashed={!registered} testId="logical-memory-registration">{registered?<div className="font-mono text-xs">base 0x1000<br />length 16<br />access permissions<br />LKEY/RKEY references</div>:"CPU has already written HELLO; no packet or copy occurred"}</FoundationBox></div><SmallNote>Registration adds metadata/permission associated with the existing buffer. It does not create another copy of the data and does not move HELLO.</SmallNote></div>;
}

export function RegistrationOwnershipVisual() {
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="registration-ownership"><div className="grid gap-3 xl:grid-cols-5"><FoundationBox title="application process" tone="cpu">asks Pyverbs</FoundationBox><FoundationBox title="Pyverbs / libibverbs" tone="metadata">invokes provider operation</FoundationBox><FoundationBox title="device context" tone="device">rxe0 context</FoundationBox><FoundationBox title="protection domain" tone="kernel">PD associates MR and future QP</FoundationBox><FoundationBox title="completion queue" tone="neutral">separate object outside PD</FoundationBox></div><SourceExcerpt path="python/exp_a_resources.py" start={74} end={82} label="actual resource creation excerpt"/><SourceExcerpt path="python/rdma_common.py" start={131} end={134} label="actual registration helper"/><SmallNote>The application asks, but provider/kernel implementation establishes registered access. The resulting MR is associated with a protection domain.</SmallNote></div>;
}

export function RangeSelectionVisual() {
  const [choice,setChoice]=useState<"valid"|"invalid"|null>(null);
  const valid=choice==="valid";
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="registered-range-selection"><ActionRow><FoundationAction testId="select-eight-at-offset-four" active={choice==="valid"} onClick={()=>setChoice("valid")}>Inspect 8 bytes at offset 4</FoundationAction><FoundationAction testId="select-eight-at-offset-twelve" active={choice==="invalid"} onClick={()=>setChoice("invalid")}>Inspect 8 bytes at offset 12</FoundationAction></ActionRow><div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_15rem]"><FoundationBox title="24 illustrative memory cells · registered range 0–15" tone="memory" testId="twenty-four-cell-range"><ByteCells compact bytes={hello16.concat(Array.from({length:8},()=>"--"))} highlight={valid?[4,5,6,7,8,9,10,11]:choice==="invalid"?[12,13,14,15,16,17,18,19]:[]} outOfRange={[16,17,18,19,20,21,22,23]}/></FoundationBox><FoundationBox title="selected memory description" tone={choice?(valid?"success":"warning"):"metadata"} testId="range-check-result">{choice?<div className="font-mono text-xs">base 0x1000 + offset {valid?4:12}<br />length 8<br />end offset {valid?12:20}<br />{valid?"inside registered 0–15":"crosses boundary at 15"}</div>:"select a range"}</FoundationBox></div><SmallNote>Base address, offset and length are distinct. The invalid illustration crosses the registered boundary; unregistered cells 16–23 are visible but outside the MR.</SmallNote></div>;
}

export function AccessPathsVisual() {
  const [path,setPath]=useState<"cpu"|"local"|"write"|"read">("cpu");
  const labels={cpu:"Local CPU writes ordinary application memory",local:"Local provider writes with local-write permission",write:"Remote WRITE accesses destination memory",read:"Remote READ obtains data from source memory"} as const;
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="rdma-access-paths"><ActionRow>{(Object.keys(labels) as Array<keyof typeof labels>).map((key)=><FoundationAction key={key} testId={`access-path-${key}`} active={path===key} onClick={()=>setPath(key)}>{labels[key]}</FoundationAction>)}</ActionRow><div className="grid gap-3 xl:grid-cols-4"><FoundationBox title="host CPU" tone="cpu" active={path==="cpu"}>ordinary instruction access</FoundationBox><FoundationBox title="local RDMA provider" tone="device" active={path==="local"}>LKEY + local-write permission</FoundationBox><FoundationBox title="remote initiator" tone="network" active={path==="write"||path==="read"}>{path==="write"?"WRITE opcode":"READ opcode"}</FoundationBox><FoundationBox title="registered buffer B" tone="memory" active><ByteCells compact bytes={hello16}/></FoundationBox></div><SmallNote testId="access-path-distinction">Local CPU memory access is not RDMA local-write permission. Local-write permission authorizes provider writes; WRITE and READ are remotely initiated operation types.</SmallNote></div>;
}

export function KeyExerciseVisual({ remote=false }: { remote?: boolean }) {
  const correct=remote?"0x99":"0x11";
  const [key,setKey]=useState<string|null>(null);
  const ok=key===correct;
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid={remote?"remote-key-exercise":"local-key-exercise"}><div className="grid gap-2 sm:grid-cols-2"><FoundationBox title="MR A" tone="metadata">addr 0x1000 · len 16 · {remote?"RKEY 0x99":"LKEY 0x11"}</FoundationBox><FoundationBox title="MR B" tone="metadata">addr 0x2000 · len 16 · {remote?"RKEY 0xaa":"LKEY 0x22"}</FoundationBox></div><ActionRow>{(remote?["0x99","0xaa"]:["0x11","0x22"]).map((value)=><FoundationAction key={value} testId={`choose-key-${value}`} active={key===value} onClick={()=>setKey(value)}>Use key {value}</FoundationAction>)}</ActionRow><FoundationBox title={remote?"remote-memory operation description":"local memory description"} tone={key?(ok?"success":"warning"):"neutral"} testId="key-check-result"><div className="font-mono text-xs">{remote?"remote_addr 0x1000 · rkey":"addr 0x1000 · len 8 · lkey"} {key??"not selected"}</div><div className="mt-1 text-xs">{key?ok?"conceptual association matches MR A":"key does not match the intended registration":"select a key"}</div></FoundationBox><SmallNote>No fabricated hardware error code or packet: this is only the conceptual association/permission check.</SmallNote></div>;
}

export function MetadataExchangeVisual() {
  const [sent,setSent]=useState(false);
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="rdma-metadata-exchange"><ActionRow><FoundationAction testId="share-remote-metadata" active={sent} onClick={()=>setSent(true)}>Share B's remote-memory metadata over TCP</FoundationAction></ActionRow><div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_11rem_minmax(0,1fr)] xl:items-center"><FoundationBox title="Server B target" tone="memory"><div className="font-mono text-xs">registered addr {exact(writeExperiment.endpoints.responder.memoryRegion.address)}<br />len {writeExperiment.endpoints.responder.memoryRegion.length}<br />RKEY {exact(writeExperiment.endpoints.responder.memoryRegion.rkey)}</div></FoundationBox><div><LinkLine label="existing TCP control channel · metadata only" kind="metadata" direction="right" active={sent} testId="tcp-control-metadata-link"/></div><FoundationBox title="Server A initiator" tone="metadata" active={sent}><div className="font-mono text-xs">received remote addr/RKEY/len<br />local LKEY {exact(mr.lkey)} remains local</div></FoundationBox></div><SourceExcerpt path="python/exp_c_write.py" start={57} end={69} label="actual WRITE metadata exchange excerpt"/><SourceExcerpt path="python/exp_c_write.py" start={124} end={134} label="actual WRITE construction excerpt"/><SmallNote>Metadata exchange is application/control-plane communication, not the RDMA payload transfer. Recorded keys are evidence values, not reusable live credentials.</SmallNote></div>;
}

export function AccessDecisionExerciseVisual() {
  const [key,setKey]=useState<"correct"|"incorrect">("correct");
  const [range,setRange]=useState<"fits"|"crosses">("fits");
  const [permission,setPermission]=useState<"present"|"absent">("present");
  const pass=key==="correct"&&range==="fits"&&permission==="present";
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="access-decision-exercise"><div className="grid gap-2 md:grid-cols-3"><div className="space-x-2"><FoundationAction testId="decision-correct-key" active={key==="correct"} onClick={()=>setKey("correct")}>correct key</FoundationAction><FoundationAction testId="decision-incorrect-key" active={key==="incorrect"} onClick={()=>setKey("incorrect")}>incorrect key</FoundationAction></div><div className="space-x-2"><FoundationAction testId="decision-fits" active={range==="fits"} onClick={()=>setRange("fits")}>range fits</FoundationAction><FoundationAction testId="decision-crosses" active={range==="crosses"} onClick={()=>setRange("crosses")}>crosses boundary</FoundationAction></div><div className="space-x-2"><FoundationAction testId="decision-permission-present" active={permission==="present"} onClick={()=>setPermission("present")}>permission present</FoundationAction><FoundationAction testId="decision-permission-absent" active={permission==="absent"} onClick={()=>setPermission("absent")}>permission absent</FoundationAction></div></div><FoundationBox title="conceptual access decision" tone={pass?"success":"warning"} testId="access-decision-result">{pass?"all conceptual checks pass; access may proceed":"access does not pass the selected conceptual checks"}</FoundationBox><SmallNote>Retry by changing the selectors. This is a conceptual decision table, not simulated provider completion status.</SmallNote></div>;
}

export function ActualRegistrationInspectionVisual() {
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="actual-registration-inspection"><div className="rounded-xl border border-emerald-300/25 bg-emerald-300/8 p-3 text-xs text-emerald-50">Transition: the illustrations above use 16 bytes for visibility. The recorded resource experiment used a 4,096-byte host memory region.</div><div className="grid gap-3 xl:grid-cols-2"><FoundationBox title="hosta recorded MR" tone="memory"><div className="font-mono text-xs">addr {exact(mr.address)}<br />length {mr.length}<br />LKEY {exact(mr.lkey)} · RKEY {exact(mr.rkey)}<br />QPN {exact(resources.endpoints.initiator.qpn)}</div></FoundationBox><FoundationBox title="hostb recorded MR" tone="memory"><div className="font-mono text-xs">addr {exact(responderMr.address)}<br />length {responderMr.length}<br />LKEY {exact(responderMr.lkey)} · RKEY {exact(responderMr.rkey)}<br />QPN {exact(resources.endpoints.responder.qpn)}</div></FoundationBox></div><SourceExcerpt path="python/exp_a_resources.py" start={74} end={82} label="actual resource experiment"/><SmallNote>These are recorded registration metadata values. An MR does not contain copied bytes; recorded keys are not reusable live keys.</SmallNote></div>;
}

export function QueueResourcesVisual() {
  const [created,setCreated]=useState<string[]>([]);
  const objects=["device context","protection domain","completion queue","queue pair"];
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="queue-resource-creation"><ActionRow>{objects.map((object)=><FoundationAction key={object} testId={`create-${object.replaceAll(" ","-")}`} active={created.includes(object)} onClick={()=>setCreated(v=>v.includes(object)?v:[...v,object])}>Create {object}</FoundationAction>)}</ActionRow><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{objects.map((object)=><FoundationBox key={object} title={object} tone={created.includes(object)?"metadata":"neutral"} dashed={!created.includes(object)}>{created.includes(object)?object==="queue pair"?"contains separate SQ and RQ":"created · no data packet":"not created"}</FoundationBox>)}</div><SmallNote>Resource creation prepares structures. It does not itself produce RDMA data-operation packets.</SmallNote></div>;
}

export function WorkRequestVisual() {
  const [posted,setPosted]=useState(false);
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="illustrative-work-request"><ActionRow><FoundationAction testId="post-illustrative-wr" active={posted} onClick={()=>setPosted(true)}>Post WR to Send Queue</FoundationAction></ActionRow><div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><FoundationBox title="unposted illustrative Work Request" tone="metadata" dashed={!posted}><div className="font-mono text-xs">operation SEND · WR ID 7 · signalled<br />SGE addr 0x1000 · length 5 · lkey 0x11</div></FoundationBox><MemoryObject title="separate memory cells · payload not inside queue"/></div>{posted?<LinkLine label="WR submitted to endpoint; it references memory through addr/len/lkey" kind="metadata" direction="right" testId="wr-posted-link"/>:null}<SmallNote>The queue stores descriptions/references, not the HELLO payload cells themselves.</SmallNote></div>;
}

export function QueuePairVisual() {
  const [connected,setConnected]=useState(false);
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="queue-pair-relationship"><ActionRow><FoundationAction testId="configure-destination-qpn" active={connected} onClick={()=>setConnected(true)}>Configure destination QPN and start PSN</FoundationAction></ActionRow><div className="grid gap-3 xl:grid-cols-2">{[["hosta","17","18"],["hostb","18","17"]].map(([host,qpn,peer])=><FoundationBox key={host} title={`${host} QP ${qpn}`} tone="device" active={connected}><div className="grid gap-2 sm:grid-cols-2"><span className="rounded border border-white/10 p-2 text-xs">Send Queue</span><span className="rounded border border-white/10 p-2 text-xs">Receive Queue</span></div><div className="mt-2 font-mono text-xs">{connected?`dest_qpn ${peer} · initial PSN 0x100`:"destination not configured"}</div></FoundationBox>)}</div><LinkLine label="each RC QP names its peer destination QPN; actual recorded resource-run QPNs" kind="metadata" direction="both" active={connected}/></div>;
}

export function CompletionLifecycleVisual() {
  const [stage,setStage]=useState(0);
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="completion-polling-lifecycle"><ActionRow><FoundationAction testId="advance-completion-lifecycle" onClick={()=>setStage(v=>(v+1)%4)}>Advance completion lifecycle</FoundationAction></ActionRow><StepLanes steps={["post signalled WR","transport executes","completion entry written to CQ","application polls CQ and observes WC"]} active={stage}/><div className="grid gap-3 xl:grid-cols-3"><FoundationBox title="Send Queue" tone="device" active={stage===0}>WR ID 7 {stage>0?"consumed/executed":"posted"}</FoundationBox><FoundationBox title="separate Completion Queue" tone="metadata" active={stage>=2}>{stage>=2?"CQE wr_id 7 · SUCCESS":"no completion yet"}</FoundationBox><FoundationBox title="application poll loop" tone="cpu" active={stage===3}>{stage===3?"poll observed WC; reusable resources freed conceptually":"waiting/polling"}</FoundationBox></div><SmallNote>Completion reports the result of posted work. The completion queue is separate from send and receive queues.</SmallNote></div>;
}

export function ResourceBoundaryVisual() {
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="resource-experiment-boundary"><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><FoundationBox title="recorded resources" tone="metadata">QPNs 17/18 · PSN 0x100 · MRs</FoundationBox><FoundationBox title="no posted data operation" tone="neutral" active>resource-only experiment</FoundationBox><FoundationBox title="no RDMA payload packet" tone="network">capture boundary is explicit</FoundationBox><a href="/practical/send-receive" className="rounded-xl border border-cyan-300/40 bg-cyan-300/12 px-4 py-3 text-center text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/20" data-testid="start-real-send-receive-practical">Start the real SEND/RECEIVE practical</a></div><SmallNote>Lesson 5 uses these concepts with actual posted SEND/RECEIVE work and verified packet/memory evidence.</SmallNote></div>;
}

export function RdmaFoundationVisual({ sectionId }: { sectionId: string }) {
  if(sectionId==="3.1")return <DmaCopyVisual/>;
  if(sectionId==="3.2")return <DmaAddressContextsVisual/>;
  if(sectionId==="3.3")return <TransferModelComparisonVisual/>;
  if(sectionId==="3.4")return <RdmaInitiationVisual conceptOnly/>;
  if(sectionId==="3.5")return <SoftRoceStackVisual/>;
  if(sectionId==="3.6")return <RdmaInitiationVisual/>;
  if(sectionId==="4.1")return <RegistrationVisual/>;
  if(sectionId==="4.2")return <RegistrationOwnershipVisual/>;
  if(sectionId==="4.3")return <RangeSelectionVisual/>;
  if(sectionId==="4.4")return <AccessPathsVisual/>;
  if(sectionId==="4.5")return <KeyExerciseVisual/>;
  if(sectionId==="4.6")return <KeyExerciseVisual remote/>;
  if(sectionId==="4.7")return <MetadataExchangeVisual/>;
  if(sectionId==="4.8")return <AccessDecisionExerciseVisual/>;
  if(sectionId==="4.9")return <ActualRegistrationInspectionVisual/>;
  if(sectionId==="4.10")return <QueueResourcesVisual/>;
  if(sectionId==="4.11")return <WorkRequestVisual/>;
  if(sectionId==="4.12")return <QueuePairVisual/>;
  if(sectionId==="4.13")return <CompletionLifecycleVisual/>;
  return <ResourceBoundaryVisual/>;
}
