import evidenceJson from "@/public/practical/rdma/reference-evidence.json";

export type ExactInteger = {
  decimal: string;
  hex: string;
};

export type EvidenceEvent = {
  id: string;
  host: "hosta" | "hostb";
  role: string;
  type: string;
  sequence: number;
  tUnixNs: string;
  fields: Record<string, unknown>;
};

export type MemoryRegionReference = {
  address: ExactInteger;
  length: number;
  lkey: ExactInteger;
  rkey: ExactInteger;
};

export type Endpoint = {
  host: "hosta" | "hostb";
  hostLabel: string;
  role: string;
  roleName: string;
  qpn: ExactInteger;
  destinationQpn: ExactInteger;
  sqPsn: ExactInteger;
  rqPsn: ExactInteger;
  qpState: string | null;
  gid?: string | null;
  peerGid?: string | null;
  memoryRegion: MemoryRegionReference;
  resourceEventId: string;
  qpReadyEventId: string;
  metadataEventId: string | null;
};

export type WorkRequest = {
  id: string;
  eventId: string;
  host: "hosta" | "hostb";
  role: string;
  kind: "send" | "receive" | "rdma-write" | "rdma-read";
  opcode: string;
  wrId: ExactInteger;
  byteLength: number | null;
  localAddress?: ExactInteger;
  localLkey?: ExactInteger;
  remoteAddress?: ExactInteger;
  remoteRkey?: ExactInteger;
  payloadText?: string;
};

export type Completion = {
  id: string;
  eventId: string;
  host: "hosta" | "hostb";
  role: string;
  tag: string | null;
  wrId: ExactInteger;
  workRequestId: string | null;
  opcode: string;
  status: string;
  byteLength: number;
  qpNum: ExactInteger;
  isTargetCompletion: boolean;
};

export type PacketTreeField = {
  name: string;
  value: string;
  annotation?: string;
};

export type PacketRecord = {
  id: string;
  captureFile: string;
  downloadPath: string;
  frameNumber: number;
  timeEpoch: string;
  direction: string;
  sourceIp: string;
  destinationIp: string;
  sourceHost: "hosta" | "hostb" | null;
  destinationHost: "hosta" | "hostb" | null;
  role: "request" | "response" | "acknowledgement" | "transport";
  frameLength: number;
  capturedLength: number;
  opcode: ExactInteger;
  opcodeName: string;
  destinationQpn: ExactInteger;
  psn: ExactInteger;
  udp: {
    sourcePort: number;
    destinationPort: number;
    length: number;
    checksum: string | null;
  };
  bth: {
    padCount: number;
    pKey: ExactInteger;
    ackRequested: boolean;
  };
  reth?: {
    virtualAddress: ExactInteger;
    rkey: ExactInteger;
    dmaLength: ExactInteger;
  };
  dataHex: string | null;
  dataLength: number;
  payloadHex: string | null;
  payloadText: string | null;
  rawHex: string;
  correlations: {
    workRequestIds: string[];
    completionIds: string[];
    eventIds: string[];
    memoryRegionIds: string[];
  };
  protocolTree: Array<{
    protocol: string;
    fields: PacketTreeField[];
  }>;
};

export type MemorySnapshot = {
  id: string;
  label: string;
  eventId: string;
  hex: string | null;
  text: string | null;
  verification?: Record<string, unknown>;
};

export type MemoryRegion = {
  id: string;
  host: "hosta" | "hostb";
  role: string;
  address: ExactInteger;
  length: number;
  lkey: ExactInteger;
  rkey: ExactInteger;
  resourceEventId: string;
  snapshots: MemorySnapshot[];
};

export type ControlEvent = {
  id: string;
  eventId: string;
  host: "hosta" | "hostb";
  type: string;
  meaning: string;
};

export type CodeReference = {
  sourcePath: string;
  startLine: number;
  endLine: number;
  label: string;
};

export type WalkthroughStep = {
  id: string;
  title: string;
  kind: "code" | "resource" | "control" | "memory" | "work-request" | "packet" | "completion" | "verification";
  simpleExplanation: string;
  explanation: string;
  eventIds: string[];
  packetIds: string[];
  workRequestIds: string[];
  completionIds: string[];
  memoryRegionIds: string[];
  codeRefs: CodeReference[];
  memoryState: "none" | "before" | "after" | "unchanged";
  focusHost: string | null;
  plane: "control" | "data";
  teachingPoints: string[];
};

export type Experiment = {
  id: "resources" | "send-recv" | "write" | "read";
  key: "a" | "b" | "c" | "d";
  title: string;
  objective: string;
  default: boolean;
  script: string;
  hosts: {
    initiator: { host: string; roleName: string };
    responder: { host: string; roleName: string };
  };
  endpoints: {
    initiator: Endpoint;
    responder: Endpoint;
  };
  events: EvidenceEvent[];
  resources: Array<Record<string, unknown>>;
  workRequests: WorkRequest[];
  completions: Completion[];
  packets: PacketRecord[];
  memoryRegions: MemoryRegion[];
  controlEvents: ControlEvent[];
  verification: {
    status: string;
    hostaExit: number;
    hostbExit: number;
    required: boolean;
  };
  captureDownload: {
    path: string;
    fileName: string;
  } | null;
  noDataCapture: boolean;
  walkthrough: WalkthroughStep[];
};

export type PythonSource = {
  path: string;
  sha256: string;
  lineCount: number;
  lines: Array<{ number: number; text: string }>;
};

export type RdmaEvidenceBundle = {
  schemaVersion: number;
  source: {
    lab: string;
    transport: string;
    validationStatus: string;
    captureInterface: string;
    controlInterface: string;
  };
  provenance: {
    evidenceDigest: string;
    environmentDigest: string;
    gitCommit: string;
    executionSourceCheckout: string;
    sourceSnapshot: {
      relationship: "matches-verified-execution-source" | "differs-from-verified-execution-source" | "unverified";
      method: string;
    };
    generatedAt: string;
    referenceRunStartedAt: string;
    referenceRunFinishedAt: string;
    exporter: string;
  };
  clockModel: {
    crossHostSynchronized: boolean;
    ordering: string;
    explanation: string;
  };
  environment: {
    architecture?: string;
    guests?: Record<string, {
      kernel?: string;
      os_release?: string;
      python?: string;
      pyverbs?: string;
      rdma_core?: string;
    }>;
    baseImageSha256?: string;
    evidenceScope?: string;
  };
  hosts: Record<string, { label: string; dataIp: string; controlIp: string }>;
  sources: PythonSource[];
  experiments: Experiment[];
};

export const rdmaEvidence = evidenceJson as unknown as RdmaEvidenceBundle;

export function exact(value: ExactInteger | undefined, mode: "hex" | "decimal" = "hex") {
  if (!value) return "—";
  return mode === "hex" ? value.hex : value.decimal;
}

export function bytesFromHex(hex: string | null | undefined): number[] {
  if (!hex) return [];
  const bytes: number[] = [];
  for (let index = 0; index + 1 < hex.length; index += 2) {
    bytes.push(Number.parseInt(hex.slice(index, index + 2), 16));
  }
  return bytes;
}

export function packetLengthBreakdown(packet: PacketRecord) {
  return {
    applicationPayloadBytes: bytesFromHex(packet.payloadHex).length,
    transportPaddingBytes: packet.bth.padCount,
    capturedDataBytes: packet.dataLength,
    totalFrameBytes: packet.frameLength,
    capturedFrameBytes: packet.capturedLength,
  };
}

export function asciiFromBytes(bytes: number[]) {
  return bytes.map((byte) => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".").join("");
}

export function formatUtcEpoch(epoch: string) {
  const milliseconds = Number(epoch) * 1000;
  if (!Number.isFinite(milliseconds)) return epoch;
  return new Date(milliseconds).toISOString().replace("T", " ").replace("Z", " UTC");
}
