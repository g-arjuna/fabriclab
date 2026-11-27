"use client";

import { useMemo } from "react";

import { exact, rdmaEvidence } from "@/lib/practical/rdmaEvidence";

import { cx } from "./visuals";
import { guidedEnum, useGuidedVisualStage } from "./guidedVisualState";
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
  const stage = useGuidedVisualStage();
  const configured=stage>=1;
  const deviceActive=stage>=2;
  const copied=stage>=3;
  const reported=stage>=4;
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="foundation-dma-copy">
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_11rem_minmax(0,1fr)] xl:items-center">
      <MemoryObject bytes={hello16} title="RAM source"/>
      <div>
        <LinkLine label="CPU writes source/destination metadata" kind="instruction" active={configured}/>
        <LinkLine label="device payload access over interconnect" kind="payload" direction="both" active={copied} testId="dma-device-memory-access"/>
        {reported?<LinkLine label="completion/report path to CPU or software" kind="metadata" active testId="dma-completion-report-path"/>:null}
      </div>
      <MemoryObject bytes={copied?hello16:zeros16} title="RAM destination / device receive buffer"/>
      <FoundationBox title="DMA-capable device engine" tone="device" active={deviceActive}>{!configured?"waiting for source/destination description":copied?"copy completed; CPU did not copy each payload byte":deviceActive?"accessing memory through the device-visible addresses":"configured with device-visible source and destination"}</FoundationBox>
    </div>
    <div className="grid gap-3 xl:grid-cols-3">
      <FoundationBox title="1 · configured" tone="metadata" active={configured}>CPU/software supplies source, destination and length metadata.</FoundationBox>
      <FoundationBox title="2 · copied" tone="success" active={copied}>Device accesses memory and produces the destination bytes.</FoundationBox>
      <FoundationBox title="3 · reported" tone="success" active={reported}>A completion/report mechanism tells software the work finished.</FoundationBox>
    </div>
    <SmallNote>Compare with CPU copy: the CPU creates or configures the copy metadata, but the device performs the data movement rather than the CPU executing a load/store sequence for every byte. This is an illustrative device mechanism, not proof every NIC uses identical descriptors.</SmallNote>
  </div>;
}

export function DmaAddressContextsVisual() {
  const stage = useGuidedVisualStage();
  const deviceView=stage>=2;
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="dma-address-contexts"><div className="grid gap-3 xl:grid-cols-4"><FoundationBox title="application virtual address" tone="metadata"><span className="font-mono">0x1000</span></FoundationBox><FoundationBox title="CPU/MMU translation" tone="success" active={stage>=1}>{stage>=1?"VA 0x1000 → physical frame P7+0":"CPU translation not yet followed"}</FoundationBox><FoundationBox title="illustrative physical memory" tone="memory"><span className="font-mono">P7+0 · HELLO bytes</span></FoundationBox><FoundationBox title={deviceView?"device-visible DMA address":"device address view hidden"} tone="device" active={deviceView}><span className="font-mono">{deviceView?"DMA 0x4000 → P7+0":"device mapping not yet revealed"}</span></FoundationBox></div><div className="grid gap-2 lg:grid-cols-2"><LinkLine label="CPU/MMU translation metadata" kind="translation" active/><LinkLine label="device mapping metadata; IOMMU only when present/enabled" kind="translation" active={deviceView}/></div><SmallNote>Same underlying memory, separate address contexts. DMA addresses are platform/device dependent; do not assume an enabled IOMMU or a fixed identity mapping.</SmallNote></div>;
}

export function TransferModelComparisonVisual() {
  const stage = useGuidedVisualStage();
  const model = stage === 0 ? "tcp" as const : "rdma" as const;
  type LaneRow = readonly [readonly [string,string,string], readonly [string,string,string], readonly [string,string,string]];
  const tcpRows: LaneRow[] = [
    [["A application buffer","0x1000 · HELLO source","memory"],["same network objective","payload has not left A yet","neutral"],["B application buffer","0x2000 · intended destination position","memory"]],
    [["CPU/kernel-managed send storage","application socket call; CPU copy and TCP protocol processing","cpu"],["instruction/control remains in host A","socket/protocol control is not the payload wire format","metadata"],["B application buffer","still unchanged at 0x2000","memory"]],
    [["conventional NIC DMA","NIC accesses kernel-managed packet memory; conventional NICs can use DMA","device"],["network","Ethernet transport between the two hosts","network"],["receiving conventional NIC DMA","NIC places packet bytes into kernel receive storage","device"]],
    [["A kernel/network stack","completion/return and retransmission state are control responsibilities","cpu"],["network path complete","payload has arrived through NIC/kernel receive storage","network"],["kernel receive storage → CPU copy → B application buffer","TCP ordering processed; CPU copies/returns ordered bytes into 0x2000","cpu"]],
  ];
  const rdmaRows: LaneRow[] = [
    [["A application instruction","submit work describing prepared resources","cpu"],["control preparation already complete","endpoint and registered-memory metadata were prepared before data transfer","metadata"],["B application buffer","0x2000 · authorized destination position","memory"]],
    [["prepared RDMA resources","registered source memory at A 0x1000 and endpoint metadata","metadata"],["control/instruction path","work submission controls the device; it is not the payload path","metadata"],["prepared remote resources","registered destination memory at B 0x2000 is authorized","metadata"]],
    [["RNIC accesses source memory","device-visible memory access rather than a CPU byte copy","device"],["network","RDMA transport packets between representative RNICs","network"],["remote RNIC transport/memory access","representative RNIC places payload into the authorized destination memory","device"]],
    [["completion/control at A","provider completion or application verification path","success"],["control path","completion/control is distinct from payload movement","metadata"],["B application buffer","0x2000 now contains the transferred bytes in this representative outcome","memory"]],
  ];
  const rows=model==="tcp"?tcpRows:rdmaRows;
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="tcp-rdma-model-comparison">
    <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 p-3 text-xs text-cyan-50" data-testid="same-memory-objective">Same objective in both views: source memory position <span className="font-mono">A 0x1000</span> → destination memory position <span className="font-mono">B 0x2000</span>. Positions do not change when the model changes.</div>
    <div className="overflow-x-auto pb-1" data-testid={model==="tcp"?"representative-tcp-memory-path":"representative-rdma-memory-path"}>
      <div className="min-w-[56rem] space-y-2">
        <div className="grid grid-cols-[minmax(0,1fr)_4rem_minmax(0,1fr)_4rem_minmax(0,1fr)] items-center font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500"><span>Host A</span><span /><span className="text-center">network / path kind</span><span /><span className="text-right">Host B</span></div>
        {rows.map((row,rowIndex)=><div key={rowIndex} className="grid grid-cols-[minmax(0,1fr)_4rem_minmax(0,1fr)_4rem_minmax(0,1fr)] items-stretch gap-2">
          <FoundationBox title={row[0][0]} tone={row[0][2] as never} active={rowIndex===rows.length-1}><div className="text-xs leading-5">{row[0][1]}</div></FoundationBox>
          <div className="flex items-center justify-center font-mono text-xl text-cyan-200" aria-hidden="true">{rowIndex===0?"·":"→"}</div>
          <FoundationBox title={row[1][0]} tone={row[1][2] as never}><div className="text-xs leading-5">{row[1][1]}</div></FoundationBox>
          <div className="flex items-center justify-center font-mono text-xl text-cyan-200" aria-hidden="true">{rowIndex===0?"·":"→"}</div>
          <FoundationBox title={row[2][0]} tone={row[2][2] as never} active={rowIndex===rows.length-1}><div className="text-xs leading-5">{row[2][1]}</div></FoundationBox>
        </div>)}
      </div>
    </div>
    <div className="grid gap-2 xl:grid-cols-4" data-testid="tcp-rdma-path-separation">
      <LinkLine label={model==="tcp"?"instruction: application socket send/receive calls":"instruction: application submits a prepared work request"} kind="instruction" active testId="comparison-instruction-path"/>
      <LinkLine label={model==="tcp"?"control: connection/protocol state and socket metadata":"control: resource and endpoint metadata prepared before data transfer"} kind="metadata" active testId="comparison-control-path"/>
      <LinkLine label={model==="tcp"?"payload: memory/storage ↔ conventional NIC ↔ network":"payload: registered memory ↔ RNIC ↔ network ↔ registered memory"} kind="payload" active testId="comparison-payload-path"/>
      <LinkLine label={model==="tcp"?"completion: syscall return and application receive observation":"completion: provider completion or application verification path"} kind="reference" active testId="comparison-completion-path"/>
    </div>
    <SmallNote>Representative buffered TCP and hardware RDMA; optimizations and operations vary. Kernel processing roles are shown separately from physical payload links. Conventional NICs can use DMA; the distinction is where transport and memory-placement responsibilities are implemented. No fixed copy count, universal implementation internals, performance bar, or performance claim is made.</SmallNote>
  </div>;
}

export function SoftRoceStackVisual() {
  const stage = useGuidedVisualStage();
  const hardwareVisible = stage >= 1;
  const comparisonActive = stage >= 2;
  const hostA=rdmaEvidence.hosts.hosta;
  const hostB=rdmaEvidence.hosts.hostb;
  const rxeStack=[
    ["Python application","CPU executes laboratory program"],
    ["Pyverbs","Python bindings used by the program"],
    ["libibverbs + device provider","verbs API/provider boundary for the RXE device"],
    ["Linux RDMA core + RXE software transport","CPU executes RXE transport processing in software"],
    ["Linux UDP/IP + Ethernet driver","CPU/kernel networking path"],
    ["data0 underlying Ethernet interface","isolated laboratory data interface"],
    ["network to peer host","Host A 10.10.10.1 ↔ Host B 10.10.10.2"],
  ] as const;
  const hardwareStack=[
    ["Python application","CPU executes application"],
    ["Pyverbs","same Python API surface in this comparison"],
    ["libibverbs + hardware provider","provider exposes device capabilities and control interface"],
    ["prepared RNIC resources","registered memory, endpoints and userspace-accessible queues where supported"],
    ["representative hardware RNIC","NIC hardware executes transport and memory access"],
    ["physical Ethernet interface","network attachment"],
    ["network to peer RNIC","representative hardware path, not the RXE measurement"],
  ] as const;
  function Stack({title,tone,rows,footer,testId}:{title:string;tone:"cpu"|"device";rows:readonly (readonly [string,string])[];footer:string;testId:string}){
    return <FoundationBox title={title} tone={tone} testId={testId} className="h-full">
      <div className="space-y-1.5">
        {rows.map(([name,description],index)=><div key={name}>
          <div className={cx("rounded-lg border px-2 py-1.5",index<=4&&tone==="cpu"?"border-amber-300/35 bg-amber-300/10":name==="representative hardware RNIC"?"border-orange-300/35 bg-orange-300/10":"border-white/10 bg-slate-950/35")}>
            <div className="font-mono text-xs text-slate-100">{name}</div>
            <div className="text-[11px] leading-4 text-slate-400">{description}</div>
          </div>
          {index<rows.length-1?<div className="py-0.5 text-center font-mono text-cyan-200" aria-hidden="true">↓</div>:null}
        </div>)}
      </div>
      <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/40 p-2 text-[11px] text-slate-300">{footer}</div>
    </FoundationBox>;
  }
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="soft-roce-instruction-path">
    <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 p-3 font-mono text-xs text-cyan-50" data-testid="soft-roce-lab-identities">actual RXE laboratory: hosta ({hostA.label}) data {hostA.dataIp} · hostb ({hostB.label}) data {hostB.dataIp} · isolated data0 Ethernet interfaces</div>
    <div className="grid gap-3 xl:grid-cols-2">
      <Stack title="actual RXE software transport" tone="cpu" rows={rxeStack} footer="logical RXE RDMA device rxe0 is associated with data0; CPUs execute the software transport. This experiment does not measure hardware offload or CPU bypass." testId="rxe-software-transport-column"/>
      {hardwareVisible ? <Stack title="representative hardware RNIC transport" tone="device" rows={hardwareStack} footer="control/setup still involves software; the representative RNIC performs transport execution and device memory access in hardware. This column is explanatory, not evidence from the Soft-RoCE run." testId="hardware-rnic-transport-column"/> : <FoundationBox title="representative hardware RNIC comparison" tone="neutral" dashed testId="hardware-rnic-comparison-pending">The hardware comparison is intentionally withheld until the actual RXE software path is established.</FoundationBox>}
    </div>
    <div className="grid gap-2 xl:grid-cols-2" data-testid="soft-roce-control-setup-paths"><LinkLine label="RXE control/setup: userspace verbs → kernel RDMA/RXE control path; WR submission is not claimed to be one synchronous syscall" kind="metadata" active/><LinkLine label="hardware control/setup: kernel/driver resource setup remains present even when data-path queues are userspace accessible" kind="metadata" active/></div><div className="grid gap-3 xl:grid-cols-2"><FoundationBox title="logical RXE RDMA device" tone="metadata" active>rxe0 · created/configured logical device, not an extra physical NIC</FoundationBox><FoundationBox title="physical or virtual Ethernet interface" tone="device" active>data0 · ordinary underlying network interface</FoundationBox></div>
    {comparisonActive ? <SmallNote testId="soft-roce-comparison-conclusion">Python → Pyverbs → libibverbs/provider. RXE then uses Linux software transport and the Ethernet stack; it does not demonstrate hardware bypass. A hardware RNIC instead implements transport and memory access in device hardware. Kernel/setup involvement is not the same thing as claiming every work request is a synchronous syscall.</SmallNote> : <SmallNote>First establish the actual RXE software path; the representative hardware comparison follows in the next guided stage.</SmallNote>}
  </div>;
}

export function RdmaInitiationVisual({ conceptOnly=false }: { conceptOnly?: boolean }) {
  const step=useGuidedVisualStage();
  const steps=["prepare memory/resources","describe work","submit work to endpoint","observe result"];
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="rdma-initiation-sequence"><StepLanes steps={steps} active={step}/><div className="grid gap-3 xl:grid-cols-4"><FoundationBox title="memory resources" tone="memory" active={step>=0}>{step>=0?"MR/PD/CQ/QP objects exist":"not prepared"}</FoundationBox><FoundationBox title="work request description" tone="metadata" active={step>=1}>{step>=1?"operation + memory references":"not described"}</FoundationBox><FoundationBox title="send queue endpoint" tone="device" active={step>=2}>{step>=2?"posted to QP":"not submitted"}</FoundationBox><FoundationBox title="completion / remote observation" tone="success" active={step>=3}>{step>=3?"observed after execution":"no result yet"}</FoundationBox></div>{conceptOnly?<SmallNote>Conceptual sequence only; actual object relationships and evidence appear in the resource lessons.</SmallNote>:<SmallNote>No data operation packet is produced merely by creating resources. Submission and transport execution are separate steps.</SmallNote>}</div>;
}

export function RegistrationVisual() {
  const stage = useGuidedVisualStage();
  const registered=stage>=3;
  const addressExplained=stage>=4;
  const keysRevealed=stage>=5;
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="registration-illustration"><div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_10rem_minmax(0,0.8fr)] xl:items-center"><MemoryObject/><div>{registered?<LinkLine label="logical registration object references the same existing bytes" kind="reference" direction="both" testId="mr-reference-link"/>:null}</div><FoundationBox title={registered?"memory registration object":"no MR or keys yet"} tone={registered?"metadata":"neutral"} dashed={!registered} testId="logical-memory-registration">{registered?<div className="font-mono text-xs">{addressExplained?"base 0x1000":"base address revealed next"}<br />{addressExplained?"length 16":"length revealed next"}<br />{keysRevealed?"access permissions":"permissions revealed next"}<br />{keysRevealed?"LKEY/RKEY references":"keys revealed next"}</div>:"CPU has already written HELLO; no packet or copy occurred"}</FoundationBox></div><SmallNote>Registration adds metadata/permission associated with the existing buffer. It does not create another copy of the data and does not move HELLO.</SmallNote></div>;
}

export function RegistrationOwnershipVisual() {
  const stage = useGuidedVisualStage();
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="registration-ownership" data-guided-stage={stage}><div className="grid gap-3 xl:grid-cols-4"><FoundationBox title="application process" tone="cpu" active={stage===0}>asks Pyverbs</FoundationBox><FoundationBox title="Pyverbs / libibverbs" tone="metadata" active={stage>=1} dashed={stage<1}>invokes provider operation</FoundationBox><FoundationBox title="device context" tone="device" active={stage>=1} dashed={stage<1}>rxe0 context</FoundationBox><FoundationBox title="protection domain" tone="kernel" active={stage>=1} dashed={stage<1}>PD associates the returned MR</FoundationBox></div><div className="grid gap-2 lg:grid-cols-3"><LinkLine label="application asks" kind="instruction" active={stage>=0}/><LinkLine label="provider establishes registered access" kind="metadata" active={stage>=1}/><LinkLine label="MR returned to application" kind="reference" direction="left" active={stage>=2}/></div>{stage>=2?<FoundationBox title="returned Memory Region handle" tone="success" testId="returned-memory-region-handle">MR associated with the protection domain is now available to the application; the original buffer remains the registered memory.</FoundationBox>:<FoundationBox title="Memory Region handle" tone="neutral" dashed testId="returned-memory-region-handle">not returned to the application yet</FoundationBox>}<SourceExcerpt path="python/exp_a_resources.py" start={74} end={82} label="actual resource creation excerpt"/><SourceExcerpt path="python/rdma_common.py" start={131} end={134} label="actual registration helper"/><SmallNote>The application asks, but provider/kernel implementation establishes registered access. At this beginner stage the diagram intentionally introduces only the context, protection domain and memory registration; communication queues are introduced later.</SmallNote></div>;
}

export function RangeSelectionVisual() {
  const stage = useGuidedVisualStage();
  const choice = stage === 0 ? null : stage === 1 ? "valid" as const : "invalid" as const;
  const valid=choice==="valid";
  const offset=valid?4:12;
  const first=0x1000+offset;
  const endExclusive=first+8;
  const last=endExclusive-1;
  const cells=hello16.concat(Array.from({length:8},()=>"--"));
  const offsets=Array.from({length:24},(_,index)=>index);
  const addresses=offsets.map((index)=>`0x${(0x1000+index).toString(16)}`);
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="registered-range-selection"><div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_17rem]"><FoundationBox title="24 illustrative memory cells · registered region base 0x1000 · offsets 0–15 registered" tone="memory" testId="twenty-four-cell-range"><ByteCells compact bytes={cells} offsets={offsets} addresses={addresses} highlight={choice?Array.from({length:8},(_,index)=>offset+index):[]} outOfRange={[16,17,18,19,20,21,22,23]}/><div className="mt-2 font-mono text-[11px]">registered bytes: 0x1000–0x100f inclusive · end-exclusive 0x1010</div></FoundationBox><FoundationBox title="selected memory description" tone={choice?(valid?"success":"warning"):"metadata"} testId="range-check-result">{choice?<div className="font-mono text-xs">base address 0x1000<br />selected offset {offset}<br />requested length 8<br />first byte 0x{first.toString(16)}<br />last requested byte 0x{last.toString(16)}<br />end-exclusive 0x{endExclusive.toString(16)}<br />{valid?"in range: inside registered 0–15; end-exclusive is not beyond 0x1010":"boundary-crossing: crosses boundary; request continues beyond 0x100f"}</div>:"select a range"}</FoundationBox></div><SmallNote>Base address, offset and length are distinct. Offset + length ≤ 16 is the bounded nonnegative in-range test used here; the invalid illustration visibly crosses the registered boundary.</SmallNote></div>;
}

export function AccessPathsVisual() {
  const stage = useGuidedVisualStage();
  const path = guidedEnum(stage, ["cpu", "local", "write", "read", "read"] as const);
  const labels={cpu:"Local CPU writes ordinary application memory",local:"Local provider writes with local-write permission",write:"Remote WRITE accesses destination memory",read:"Remote READ obtains data from source memory"} as const;
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="rdma-access-paths"><div className="grid gap-3 xl:grid-cols-4"><FoundationBox title="host CPU" tone="cpu" active={path==="cpu"}>ordinary instruction access</FoundationBox><FoundationBox title="local RDMA provider" tone="device" active={path==="local"}>LKEY + local-write permission</FoundationBox><FoundationBox title="remote initiator" tone="network" active={path==="write"||path==="read"}>{path==="write"?"WRITE opcode":"READ opcode"}</FoundationBox><FoundationBox title="registered buffer B" tone="memory" active><ByteCells compact bytes={hello16}/></FoundationBox></div><SmallNote testId="access-path-distinction">Local CPU memory access is not RDMA local-write permission. Local-write permission authorizes provider writes; WRITE and READ are remotely initiated operation types.</SmallNote></div>;
}

export function KeyExerciseVisual({ remote=false }: { remote?: boolean }) {
  const correct=remote?"0x99":"0x11";
  const stage = useGuidedVisualStage();
  const key=stage===1?"0x22":correct;
  const operation="write" as const;
  const invalidRange=stage===2;
  const requestedLength=invalidRange?24:5;
  const ok=key===correct;
  const operationCheck=ok?(operation==="write"?"local-write permission present for provider write in this stated model":"local read access is available for provider read in this stated model"):"operation access is not evaluated because the key association is invalid";
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid={remote?"remote-key-exercise":"local-key-exercise"}><div className="grid gap-2 sm:grid-cols-2"><FoundationBox title="MR A" tone="metadata">addr 0x1000 · len 16 · {remote?"RKEY 0x99":"LKEY 0x11"}<br />local-write permission present in this stated model</FoundationBox><FoundationBox title="MR B" tone="metadata">addr 0x2000 · len 16 · {remote?"RKEY 0xaa":"LKEY 0x22"}</FoundationBox></div><div className="grid gap-3 xl:grid-cols-2"><FoundationBox title={remote?"remote-memory operation description":"constructed local SGE"} tone={key?(ok?"success":"warning"):"neutral"} testId="key-check-result"><div className="font-mono text-xs">{remote?"remote_addr 0x1000 · rkey":"addr 0x1000 · len {requestedLength} · lkey"} {key??"not selected"}<br />operation {operation}</div><div className="mt-1 text-xs">{key?ok?"key association matches MR A":"key does not match the intended registration":"select a key"}</div></FoundationBox><FoundationBox title="separate access-requirement check" tone={key&&ok?"success":"warning"} testId="local-access-operation-check"><div className="text-xs">{key?(invalidRange?"requested range crosses the registered boundary":operationCheck):"select a key before checking operation access"}</div><div className="mt-2 text-[11px] text-slate-400">A valid LKEY association is not the same question as whether the requested provider operation is permitted.</div></FoundationBox></div><div className="rounded-xl border border-sky-300/20 bg-sky-300/7 p-2" data-testid="local-key-range-highlight"><ByteCells compact bytes={hello16} highlight={ok?Array.from({length:Math.min(16,requestedLength)},(_,index)=>index):[]} /><div className="mt-1 font-mono text-[11px]">MR A range 0x1000–0x100f · requested byte range highlighted when associated</div></div><SmallNote>No fabricated hardware error code or packet: this is only a simplified conceptual association/permission model. Ordinary CPU writes to a writable process mapping do not require an RDMA local-write flag; that flag applies to provider access to registered memory.</SmallNote></div>;
}

export function MetadataExchangeVisual() {
  const stage = useGuidedVisualStage();
  const mode = stage >= 1 ? "write" as const : "send" as const;
  const sent=stage>=2;
  const hostA=rdmaEvidence.hosts.hosta;
  const hostB=rdmaEvidence.hosts.hostb;
  const writeMr=writeExperiment.endpoints.responder.memoryRegion;
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="rdma-metadata-exchange">
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_13rem_minmax(0,1fr)] xl:items-center">
      <FoundationBox title="Host A initiator" tone="metadata" active={sent}>
        <div className="font-mono text-xs">data {hostA.dataIp}<br />control {hostA.controlIp}</div>
        {sent?<div className="mt-2 font-mono text-xs" data-testid="received-control-tuple">{mode==="send"?"received peer QPN/PSN/GID only":"received remote addr/RKEY/length plus endpoint metadata"}<br />local LKEY remains local</div>:null}
      </FoundationBox>
      <div><LinkLine label="dashed ordinary TCP control channel · metadata/coordination only" kind="metadata" direction="both" active={sent} testId="tcp-control-metadata-link"/></div>
      <FoundationBox title="Host B peer/target" tone="memory" active={sent}>
        <div className="font-mono text-xs">data {hostB.dataIp}<br />control {hostB.controlIp}</div>
        {sent?<div className="mt-2 font-mono text-xs">{mode==="send"?"shares QPN/PSN/GID; no receive-buffer RKEY needed":`shares addr ${exact(writeMr.address)} · RKEY ${exact(writeMr.rkey)} · len ${writeMr.length}`}</div>:null}
      </FoundationBox>
    </div>
    <div className="grid gap-3 xl:grid-cols-2">
      <SourceExcerpt path="python/exp_b_send_recv.py" start={60} end={72} label="actual SEND setup metadata source · separate experiment"/>
      <SourceExcerpt path="python/exp_c_write.py" start={57} end={69} label="actual WRITE conditional metadata source · separate experiment"/>
    </div>
    <SmallNote>Registration does not transmit this metadata. The TCP control connection carries metadata only: coordination and endpoint/setup values, not the RDMA payload, and it was not present in the isolated RDMA data captures. Values from different reference experiments are not combined as if they were one execution.</SmallNote>
  </div>;
}

export function AccessDecisionExerciseVisual() {
  const cases=[
    {id:"read-valid",label:"Read 8 bytes at 0x1004",key:"correct",range:"fits",permission:"remote read present",result:true,offset:4,length:8},
    {id:"write-no-permission",label:"Write 8 bytes at 0x1004",key:"correct",range:"fits",permission:"remote write absent",result:false,offset:4,length:8},
    {id:"read-crossing",label:"Read 8 bytes at 0x100c",key:"correct",range:"crosses boundary",permission:"remote read present",result:false,offset:12,length:8},
    {id:"read-wrong-key",label:"Read 8 bytes at 0x1004",key:"incorrect",range:"fits",permission:"remote read present",result:false,offset:4,length:8},
  ] as const;
  const index=Math.min(3,useGuidedVisualStage());
  const item=cases[index];
  const selected=Array.from({length:item.length},(_,i)=>item.offset+i);
  const cells=hello16.concat(Array.from({length:8},()=>"--"));
  function outcome(label:string,ok:boolean){
    return <div className={cx("rounded-lg border px-2 py-1.5 text-xs",ok?"border-emerald-300/30 bg-emerald-300/8 text-emerald-50":"border-red-300/35 bg-red-300/10 text-red-50")}>{label}: {ok?"present/valid":"fails under stated model"}</div>;
  }
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="access-decision-exercise">
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_17rem]">
      <FoundationBox title="same registered range as 4.3 · offsets 0–15 registered, 16–23 outside" tone="memory" testId="access-exercise-range-grid">
        <ByteCells compact bytes={cells} offsets={Array.from({length:24},(_,i)=>i)} highlight={selected} outOfRange={[16,17,18,19,20,21,22,23]}/>
        <div className="mt-2 font-mono text-xs">base 0x1000 · requested {item.label.toLowerCase()} · length {item.length}</div>
      </FoundationBox>
      <FoundationBox title="individual conceptual checks" tone={item.result?"success":"warning"} testId="access-decision-result">
        <div className="space-y-2">
          {outcome(`appropriate registration/key (${item.key})`,item.key==="correct")}
          {outcome(`requested range (${item.range})`,item.range==="fits")}
          {outcome(`required access permission (${item.permission})`,item.permission.includes("present"))}
          {outcome("suitable endpoint context",true)}
        </div>
        <div className="mt-3 text-sm font-semibold">{item.result?"Permitted under the stated model":"Rejected under the stated model"}</div>
      </FoundationBox>
    </div>
    <SmallNote>The guided sequence changes one access condition at a time. This is a conceptual access-requirement exercise using the authored assumptions; it is not a simulated completion status or observed failure capture.</SmallNote>
  </div>;
}

export function ActualRegistrationInspectionVisual() {
  const stage = useGuidedVisualStage();
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="actual-registration-inspection" data-guided-stage={stage}><div className="rounded-xl border border-emerald-300/25 bg-emerald-300/8 p-3 text-xs text-emerald-50">Transition: the illustrations above use 16 bytes for visibility. The recorded resource experiment used a 4,096-byte host memory region.</div>{stage>=1?<div className="grid gap-3 xl:grid-cols-2"><FoundationBox title="hosta recorded MR" tone="memory"><div className="font-mono text-xs">addr {exact(mr.address)}<br />length {mr.length}<br />LKEY {exact(mr.lkey)} · RKEY {exact(mr.rkey)}<br />QPN {exact(resources.endpoints.initiator.qpn)}</div></FoundationBox><FoundationBox title="hostb recorded MR" tone="memory"><div className="font-mono text-xs">addr {exact(responderMr.address)}<br />length {responderMr.length}<br />LKEY {exact(responderMr.lkey)} · RKEY {exact(responderMr.rkey)}<br />QPN {exact(resources.endpoints.responder.qpn)}</div></FoundationBox></div>:<FoundationBox title="recorded host memory-region metadata" tone="neutral" dashed>recorded registration metadata appears in the next guided stage</FoundationBox>}{stage>=2?<div className="grid gap-3 xl:grid-cols-3"><SourceExcerpt path="python/exp_a_resources.py" start={74} end={82} label="actual resource experiment"/><SourceExcerpt path="python/rdma_common.py" start={40} end={42} label="actual access flags"/><SourceExcerpt path="python/rdma_common.py" start={131} end={134} label="actual registration helper"/></div>:null}<SmallNote>These are recorded registration metadata values. An MR does not contain copied bytes; recorded keys are not reusable live keys.</SmallNote></div>;
}

export function QueueResourcesVisual() {
  const stage = useGuidedVisualStage();
  const created=["device context","protection domain","completion queue","queue pair"].slice(0, stage);
  const objects=["device context","protection domain","completion queue","queue pair"];
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="queue-resource-creation"><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{objects.map((object)=><FoundationBox key={object} title={object} tone={created.includes(object)?"metadata":"neutral"} dashed={!created.includes(object)}>{created.includes(object)?object==="queue pair"?"contains separate SQ and RQ":"created · no data packet":"not created"}</FoundationBox>)}</div><SmallNote>Resource creation prepares structures. It does not itself produce RDMA data-operation packets.</SmallNote></div>;
}

export function WorkRequestVisual() {
  const posted = useGuidedVisualStage() >= 2;
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="illustrative-work-request"><div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><FoundationBox title="unposted illustrative Work Request" tone="metadata" dashed={!posted}><div className="font-mono text-xs">operation SEND · WR ID 7 · signalled<br />SGE addr 0x1000 · length 5 · lkey 0x11</div></FoundationBox><MemoryObject title="separate memory cells · payload not inside queue"/></div>{posted?<LinkLine label="WR submitted to endpoint; it references memory through addr/len/lkey" kind="metadata" direction="right" testId="wr-posted-link"/>:null}<SmallNote>The queue stores descriptions/references, not the HELLO payload cells themselves.</SmallNote></div>;
}

export function QueuePairVisual() {
  const connected = useGuidedVisualStage() >= 1;
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="queue-pair-relationship"><div className="grid gap-3 xl:grid-cols-2">{[["hosta","17","18"],["hostb","18","17"]].map(([host,qpn,peer])=><FoundationBox key={host} title={`${host} QP ${qpn}`} tone="device" active={connected}><div className="grid gap-2 sm:grid-cols-2"><span className="rounded border border-white/10 p-2 text-xs">Send Queue</span><span className="rounded border border-white/10 p-2 text-xs">Receive Queue</span></div><div className="mt-2 font-mono text-xs">{connected?`dest_qpn ${peer} · initial PSN 0x100`:"destination not configured"}</div></FoundationBox>)}</div><LinkLine label="each RC QP names its peer destination QPN; actual recorded resource-run QPNs" kind="metadata" direction="both" active={connected}/></div>;
}

export function CompletionLifecycleVisual() {
  const stage = useGuidedVisualStage();
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="completion-polling-lifecycle"><StepLanes steps={["post signalled WR","transport executes","completion entry written to CQ","application polls CQ and observes WC"]} active={stage}/><div className="grid gap-3 xl:grid-cols-3"><FoundationBox title="Send Queue" tone="device" active={stage===0}>WR ID 7 {stage>0?"consumed/executed":"posted"}</FoundationBox><FoundationBox title="separate Completion Queue" tone="metadata" active={stage>=2}>{stage>=2?"CQE wr_id 7 · SUCCESS":"no completion yet"}</FoundationBox><FoundationBox title="application poll loop" tone="cpu" active={stage===3}>{stage===3?"poll observed WC; reusable resources freed conceptually":"waiting/polling"}</FoundationBox></div><SmallNote>Completion reports the result of posted work. The completion queue is separate from send and receive queues.</SmallNote></div>;
}

export function ResourceBoundaryVisual() {
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="resource-experiment-boundary"><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><FoundationBox title="recorded resources" tone="metadata">QPNs 17/18 · PSN 0x100 · MRs</FoundationBox><FoundationBox title="no posted data operation" tone="neutral" active>resource-only experiment</FoundationBox><FoundationBox title="no RDMA payload packet" tone="network">capture boundary is explicit</FoundationBox><a href="/practical/rdma?lesson=send-receive" className="rounded-xl border border-cyan-300/40 bg-cyan-300/12 px-4 py-3 text-center text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/20" data-testid="start-real-send-receive-practical">Start the real SEND/RECEIVE practical</a></div><SmallNote>Lesson 5 uses these concepts with actual posted SEND/RECEIVE work and verified packet/memory evidence.</SmallNote></div>;
}


export function OperationPreviewVisual() {
  type Operation = "send" | "write" | "read";
  const stage = useGuidedVisualStage();
  const operation = guidedEnum(stage, ["send", "send", "write", "read"] as const);
  const descriptions: Record<Operation, { title: string; first: string; second: string; result: string }> = {
    send: {
      title: "SEND · upcoming mechanism",
      first: "A supplies data",
      second: "B has already selected and supplied an appropriate receive buffer",
      result: "A data → network → B receiver-selected buffer. A does not name B's memory.",
    },
    write: {
      title: "WRITE · upcoming mechanism",
      first: "A supplies data",
      second: "the operation names an authorized destination buffer on B",
      result: "A data → network → B named authorized buffer. Keys and detailed fields are introduced later.",
    },
    read: {
      title: "READ · upcoming mechanism",
      first: "A sends a request toward authorized memory on B",
      second: "data returns from B into A's local destination buffer",
      result: "A request → B; then data B → A. The initiating operation starts on A.",
    },
  };
  const item = descriptions[operation];
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="rdma-operation-preview">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_11rem_minmax(0,1fr)] xl:items-center">
        <FoundationBox title="Server A · fixed illustrative memory location" tone="memory" active={operation !== "read"}>
          <ByteCells compact bytes={operation === "read" ? zeros16 : hello16} />
          <div className="mt-1 text-[11px]">{operation === "read" ? "local destination initially empty" : "local source data"}</div>
        </FoundationBox>
        <div className="space-y-1">
          <LinkLine label={operation === "read" ? "request A → B" : "data A → B"} kind="network" direction="right" active />
          {operation === "read" ? <LinkLine label="returned data B → A" kind="payload" direction="left" active /> : null}
        </div>
        <FoundationBox title="Server B · fixed illustrative memory location" tone="memory" active={operation !== "send"}>
          <ByteCells compact bytes={operation === "read" ? hello16 : zeros16} />
          <div className="mt-1 text-[11px]">{operation === "send" ? "receiver-selected buffer" : operation === "write" ? "named authorized buffer" : "authorized source memory"}</div>
        </FoundationBox>
      </div>
      <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 p-3" data-testid="operation-preview-result">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">{item.title}</div>
        <div className="mt-2 text-sm text-slate-200">{item.first}; {item.second}.</div>
        <div className="mt-1 font-mono text-xs text-cyan-100">{item.result}</div>
      </div>
      <SmallNote>Conceptual preview of upcoming mechanisms only. It intentionally does not introduce keys, RDMA headers, queue machinery, or claim that an experiment is currently executing.</SmallNote>
    </div>
  );
}

export function RemoteKeyOwnershipVisual() {
  type Stage = "initial" | "shared" | "constructed" | "valid" | "wrong-key" | "out-of-range" | "no-permission";
  const guidedStage = useGuidedVisualStage();
  const stage = guidedEnum(guidedStage, ["initial", "shared", "shared", "constructed", "valid", "wrong-key", "out-of-range", "no-permission"] as const);
  const shared = stage !== "initial";
  const constructed = ["constructed", "valid", "wrong-key", "out-of-range", "no-permission"].includes(stage);
  const preview = ["valid", "wrong-key", "out-of-range", "no-permission"].includes(stage);
  const checks = stage === "valid"
    ? { key: true, range: true, permission: true, endpoint: true }
    : {
        key: stage !== "wrong-key",
        range: stage !== "out-of-range",
        permission: stage !== "no-permission",
        endpoint: true,
      };
  const passed = checks.key && checks.range && checks.permission && checks.endpoint;
  function Check({ label, ok }: { label: string; ok: boolean }) {
    return <div className={cx("rounded-lg border px-2 py-1.5 text-xs", ok ? "border-emerald-300/30 bg-emerald-300/8 text-emerald-50" : "border-red-300/35 bg-red-300/10 text-red-50")} data-testid={`remote-check-${label.toLowerCase().replaceAll(" ", "-")}`}>{label}: {ok ? "passes conceptual check" : "fails conceptual check"}</div>;
  }
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="remote-key-ownership-visual">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_12rem_minmax(0,1fr)] xl:items-center">
        <FoundationBox title="Server A · independent host · local source" tone="memory" testId="server-a-local-source">
          <ByteCells compact bytes={hello16} />
          <div className="mt-2 font-mono text-xs text-sky-100">address 0x1000 · LKEY 0x11 · capacity 16</div>
          <div className="text-[11px] text-slate-400">A's LKEY belongs to A's own registration.</div>
        </FoundationBox>
        <div className="space-y-1">
          <LinkLine label={shared ? "dashed TCP control B → A · metadata only" : "registration does not transmit metadata"} kind="metadata" direction="left" active={shared} testId="remote-metadata-control-path" />
          {shared ? <div className="rounded-lg border border-fuchsia-300/25 bg-fuchsia-300/8 p-2 text-center font-mono text-[11px] text-fuchsia-100" data-testid="shared-remote-tuple">remote address 0x2000<br />remote key 0x42<br />available length 16</div> : null}
        </div>
        <FoundationBox title="Server B · independent host · registered destination" tone="memory" testId="server-b-remote-destination">
          <ByteCells compact bytes={zeros16} />
          <div className="mt-2 font-mono text-xs text-fuchsia-100">address 0x2000 · RKEY 0x42 · capacity 16</div>
          <div className="text-[11px] text-slate-400">{stage === "no-permission" ? "remote-write access absent in this scenario" : "remote-write access enabled"} · target LKEY is not shared here</div>
        </FoundationBox>
      </div>
      {constructed ? (
        <div className="grid gap-3 xl:grid-cols-2" data-testid="constructed-remote-operation">
          <FoundationBox title="local memory description · cyan/A-owned" tone="metadata" active>
            <div className="font-mono text-xs">source address 0x1000<br />LKEY 0x11<br />length 5</div>
          </FoundationBox>
          <FoundationBox title="remote memory description · magenta/B-owned" tone="metadata" active>
            <div className="font-mono text-xs">destination address {stage === "out-of-range" ? "0x200e" : "0x2000"}<br />RKEY {stage === "wrong-key" ? "0x99" : "0x42"}<br />transfer length 5</div>
          </FoundationBox>
        </div>
      ) : null}
      {preview ? (
        <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/45 p-3" data-testid="target-side-validation-preview">
          <LinkLine label="abstract conceptual remote-access request A provider → B provider · no WRITE execution" kind="network" direction="right" active testId="abstract-remote-request" />
          <FoundationBox title="Server B provider · conceptual validation only" tone={passed ? "success" : "warning"} active>
            <div className="grid gap-2 sm:grid-cols-2">
              <Check label="registered region and remote key" ok={checks.key} />
              <Check label="address range and length" ok={checks.range} />
              <Check label="remote-write permission" ok={checks.permission} />
              <Check label="endpoint and protection context" ok={checks.endpoint} />
            </div>
            <div className="mt-2 text-xs" data-testid="remote-validation-result">{passed ? "All selected conceptual checks pass; access could be permitted in this model." : "The selected request fails the highlighted conceptual association or access check."}</div>{stage === "out-of-range" ? <div className="mt-3" data-testid="remote-crossing-range"><ByteCells compact bytes={zeros16.concat(Array.from({length:4},()=>"--"))} highlight={[14,15,16,17,18]} outOfRange={[16,17,18,19]}/><div className="mt-1 font-mono text-[11px]">destination 0x200e + length 5 requests 0x200e–0x2012; registered region ends at 0x200f inclusive</div></div> : null}
          </FoundationBox>
        </div>
      ) : null}
      <SmallNote>All addresses and keys in this demonstration are illustrative. No fictional completion status is produced, and actual WRITE execution remains in Lesson 6. Server A never dereferences Server B's virtual address with its CPU.</SmallNote>
    </div>
  );
}

export function ResourcesQuestionVisual() {
  const described = useGuidedVisualStage() >= 1;
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="resource-questions-visual">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <FoundationBox title="Server A application · registered memory already exists" tone="memory" testId="registered-hello-before-operation">
          <ByteCells compact bytes={hello16} />
          <div className="mt-2 font-mono text-xs">base 0x1000 · length 16 · registered access established</div>
        </FoundationBox>
        <div className="grid gap-2" data-testid="unresolved-resource-questions">
          {["What task?", "Where should the instruction be submitted?", "How will the application learn the result?"].map((question) => (
            <FoundationBox key={question} title={question} tone="neutral" dashed>{described && question === "What task?" ? "Desired task: send the first five HELLO bytes. Submission and result reporting are still unresolved." : "not answered yet"}</FoundationBox>
          ))}
        </div>
      </div>
      {described ? <SmallNote testId="described-task-transition">The next step is to construct a visible task description. Submission and completion-reporting machinery have not been introduced yet.</SmallNote> : <SmallNote>Registered memory alone does not describe the desired operation, where work is submitted, or how completion is observed.</SmallNote>}
    </div>
  );
}

export function ConstructedWorkRequestVisual() {
  const source = useGuidedVisualStage() >= 2;
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="illustrative-work-request">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_10rem_minmax(0,1.1fr)] xl:items-center">
        <FoundationBox title="constructed instruction · unposted Work Request" tone="metadata" active testId="unposted-work-request">
          <div className="font-mono text-xs">operation SEND<br />WR ID 7<br />SGE addr 0x1000 · length 5 · lkey 0x11<br />request successful send completion · signalled</div>
          <div className="mt-2 text-[11px]">constructed in application software; not submitted and not a packet</div>
        </FoundationBox>
        <LinkLine label="SGE references memory; payload is not copied into the instruction" kind="reference" direction="right" active testId="wr-memory-reference" />
        <MemoryObject title="separate source memory cells" />
      </div>
      {source ? <SourceExcerpt path="python/exp_b_send_recv.py" start={131} end={138} label="optional actual SEND construction excerpt · separate run" /> : null}
      <SmallNote>No queue is shown as containing this request yet. WR ID is application-chosen local identification; it is not a packet sequence number.</SmallNote>
    </div>
  );
}

export function QueueFormationVisual() {
  const stage = useGuidedVisualStage();
  const qp = stage >= 2;
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="queue-formation-visual">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <FoundationBox title="constructed WR remains outside pending queues" tone="metadata" testId="wr-outside-queue">
          <div className="font-mono text-xs">SEND · WR ID 7 · SGE 0x1000/5/0x11</div>
          <div className="text-[11px]">not yet submitted</div>
        </FoundationBox>
        <div className={cx("rounded-2xl border p-3", qp ? "border-violet-300/35 bg-violet-300/7" : "border-white/10 bg-white/3")} data-testid="queue-pair-boundary">
          {qp ? <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-100">Queue Pair logical boundary · transport endpoint state · peer placeholder</div> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <FoundationBox title="Send Queue" tone="device" active testId="empty-send-queue">
              empty · future submission point for SEND/WRITE/READ work
            </FoundationBox>
            {stage >= 1 ? (
              <FoundationBox title="Receive Queue" tone="device" active testId="receive-queue-revealed">
                empty · an illustrative receive memory description exists but is not posted
              </FoundationBox>
            ) : (
              <FoundationBox title="Receive Queue" tone="neutral" dashed>not introduced yet</FoundationBox>
            )}
          </div>
        </div>
      </div>
      <MemoryObject title="registered HELLO buffer remains separate" />
      <SmallNote>No transfer executes and no peer endpoint-numbering mechanics are introduced here. Queue entries are implementation/provider state, not packet queues on a switch and not necessarily physical hardware-visible memory in this diagram.</SmallNote>
    </div>
  );
}

export function QpnEndpointVisual() {
  const stage = useGuidedVisualStage();
  const direction = stage >= 2 ? "b-to-a" as const : "a-to-b" as const;
  const inspect = stage >= 3;
  const a = resources.endpoints.initiator;
  const b = resources.endpoints.responder;
  const destination = direction === "a-to-b" ? 18 : 17;
  const destinationIp = direction === "a-to-b" ? "10.10.10.2" : "10.10.10.1";
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="qpn-endpoint-visual">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_12rem_minmax(0,1fr)] xl:items-center">
        <FoundationBox title="Server A · QP endpoint" tone="device" active={direction === "b-to-a"}>
          <div className="font-mono text-sm">resource-run local QPN {exact(a.qpn, "decimal")}</div>
          <div className="text-[11px]">network identity 10.10.10.1 · initial PSN 0x100</div>
        </FoundationBox>
        <div className="space-y-1">
          <LinkLine label="dashed TCP control path exchanges endpoint metadata" kind="metadata" direction="both" active testId="qpn-control-exchange" />
          <LinkLine label={direction === "a-to-b" ? "future data direction A → B" : "future data direction B → A"} kind="network" direction={direction === "a-to-b" ? "right" : "left"} active testId="qpn-data-direction" />
        </div>
        <FoundationBox title="Server B · QP endpoint" tone="device" active={direction === "a-to-b"}>
          <div className="font-mono text-sm">resource-run local QPN {exact(b.qpn, "decimal")}</div>
          <div className="text-[11px]">network identity 10.10.10.2 · initial PSN 0x100</div>
        </FoundationBox>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <FoundationBox title="clearly illustrative BTH field · not a captured packet" tone="metadata" active testId="illustrative-bth-destination-qpn">
          <div className="font-mono text-xs">destination QPN = {destination}<br />destination IP = {destinationIp}</div>
        </FoundationBox>
        <FoundationBox title="distinct identifiers" tone="neutral">
          <div className="text-xs">Destination IP selects the network destination. Destination QPN identifies the target RDMA endpoint in the relevant device/transport context. WR ID identifies local work; PSN is initial transport packet sequence information.</div>
        </FoundationBox>
      </div>
      {inspect ? (
        <div className="space-y-3" data-testid="recorded-endpoint-setup">
          <div className="grid gap-3 xl:grid-cols-2">
            <FoundationBox title="recorded hosta ready endpoint" tone="metadata"><div className="font-mono text-xs">local QPN {exact(a.qpn, "decimal")} · destination QPN {exact(a.destinationQpn, "decimal")}<br />sq_psn {exact(a.sqPsn)} · rq_psn {exact(a.rqPsn)} · state {a.qpState}</div></FoundationBox>
            <FoundationBox title="recorded hostb ready endpoint" tone="metadata"><div className="font-mono text-xs">local QPN {exact(b.qpn, "decimal")} · destination QPN {exact(b.destinationQpn, "decimal")}<br />sq_psn {exact(b.sqPsn)} · rq_psn {exact(b.rqPsn)} · state {b.qpState}</div></FoundationBox>
          </div>
          <SourceExcerpt path="python/exp_a_resources.py" start={100} end={110} label="actual endpoint metadata exchange excerpt" />
          <SourceExcerpt path="python/rdma_common.py" start={155} end={190} label="actual bring_qp_to_rts excerpt" />
        </div>
      ) : null}
      <SmallNote>The resource-only experiment recorded endpoint preparation, not an RDMA data-operation packet. This BTH field is a labelled illustration.</SmallNote>
    </div>
  );
}

export function CompletionAndResourceEvidenceVisual() {
  const stage = useGuidedVisualStage();
  const resourceEvents = resources.events.filter((event) => event.host === "hosta").slice(0, 6);
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3" data-testid="completion-and-resource-evidence">
      <div className="grid gap-2 lg:grid-cols-4" data-testid="conceptual-completion-lifecycle">
        <FoundationBox title="provider" tone="device" active={stage >= 1}>produces completion for signalled successful send-side work</FoundationBox>
        <FoundationBox title="Completion Queue" tone="metadata" active={stage === 1} testId="conceptual-cq">{stage === 1 ? "one conceptual entry pending" : stage >= 2 ? "polled entry no longer pending in CQ" : "empty conceptual CQ"}</FoundationBox>
        <FoundationBox title="application polls" tone="cpu" active={stage >= 2}>polling retrieves entries</FoundationBox>
        <FoundationBox title="retrieved Work Completion" tone="success" active={stage >= 2} testId="retrieved-work-completion">{stage >= 2 ? "outside CQ · status and WR identity available" : "not retrieved"}</FoundationBox>
      </div>
      <SmallNote>Conceptual lifecycle only: a local Work Completion is not a network acknowledgement, and this illustration does not claim every send WR produces a success completion.</SmallNote>
      <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/7 p-3" data-testid="resource-only-evidence-ledger">
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-100">actual resource-only experiment ledger · hosta local sequence</div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {resourceEvents.map((event) => <div key={event.id} className="rounded-lg border border-white/10 bg-slate-950/45 px-2 py-2 font-mono text-[11px] text-slate-300"><span className="text-emerald-200">{event.sequence}. {event.type}</span><br />{event.type === "resources" ? `MR len ${event.fields.mr_len} · QPN ${event.fields.qp_num}` : event.type === "metadata_exchange" ? `own QPN ${event.fields.own_qpn} · peer QPN ${event.fields.peer_qpn}` : event.type === "qp_ready" ? `dest QPN ${event.fields.dest_qpn} · state ${event.fields.state}` : event.type === "open_device" ? `device ${event.fields.dev}` : event.type === "qp_state" ? String(event.fields.state) : "port/GID observed"}</div>)}
          <FoundationBox title="no data WR posted in this run" tone="warning" active>validated evidence contains zero resource-run Work Requests</FoundationBox>
          <FoundationBox title="no RDMA data-operation packets recorded" tone="warning" active>resource-run capture boundary contains zero RDMA data-operation packets</FoundationBox>
        </div>
      </div>
      <SourceExcerpt path="python/exp_a_resources.py" start={77} end={110} label="actual resource setup source excerpt" />
      <a href="/practical/rdma?lesson=send-receive" className="inline-block rounded-full border border-cyan-300/40 bg-cyan-300/12 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/20" data-testid="start-real-send-receive-practical">Start the real SEND/RECEIVE practical</a>
      <SmallNote>No completions are invented for the resource-only run. The conceptual completion lifecycle above is visually separate from this genuine setup evidence.</SmallNote>
    </div>
  );
}

export function RdmaFoundationVisual({ sectionId }: { sectionId: string }) {
  if(sectionId==="3.1")return <DmaCopyVisual/>;
  if(sectionId==="3.2")return <DmaAddressContextsVisual/>;
  if(sectionId==="3.3")return <TransferModelComparisonVisual/>;
  if(sectionId==="3.4")return <OperationPreviewVisual/>;
  if(sectionId==="3.5")return <SoftRoceStackVisual/>;
  if(sectionId==="3.6")return <RdmaInitiationVisual/>;
  if(sectionId==="4.1")return <RegistrationVisual/>;
  if(sectionId==="4.2")return <RegistrationOwnershipVisual/>;
  if(sectionId==="4.3")return <RangeSelectionVisual/>;
  if(sectionId==="4.4")return <AccessPathsVisual/>;
  if(sectionId==="4.5")return <KeyExerciseVisual/>;
  if(sectionId==="4.6")return <RemoteKeyOwnershipVisual/>;
  if(sectionId==="4.7")return <MetadataExchangeVisual/>;
  if(sectionId==="4.8")return <AccessDecisionExerciseVisual/>;
  if(sectionId==="4.9")return <ActualRegistrationInspectionVisual/>;
  if(sectionId==="4.10")return <ResourcesQuestionVisual/>;
  if(sectionId==="4.11")return <ConstructedWorkRequestVisual/>;
  if(sectionId==="4.12")return <QueueFormationVisual/>;
  if(sectionId==="4.13")return <QpnEndpointVisual/>;
  return <CompletionAndResourceEvidenceVisual/>;
}
