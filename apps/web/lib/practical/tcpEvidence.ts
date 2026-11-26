import tcpEvidenceJson from "@/public/practical/rdma/tcp-foundations-evidence.json";

export type TcpPacket = {
  frameNumber: number; frameLength: number; capturedLength: number; sourceIp: string; destinationIp: string;
  sourcePort: number; destinationPort: number; flags: string; relativeSequence: number; relativeAcknowledgement: number;
  tcpPayloadLength: number; payloadHex: string; payloadHexTruncated: boolean; payloadSha256: string | null; advertisedMss: number | null;
};
export type TcpCaseEvidence = {
  id: string; port: number;
  capture: { file: string; downloadPath: string; sha256: string; host: string; interface: string; command: string };
  endpoints: { senderLocal: [string, number]; senderPeer: [string, number]; receiverLocal: [string, number]; receiverPeer: [string, number]; senderFd: number; receiverFd: number; listenerFd: number };
  handshake: TcpPacket[];
  payloadSegments: Array<{ frameNumber: number; relativeSequenceStart: number; relativeSequenceEndExclusive: number; tcpPayloadLength: number; payloadSha256: string; payloadHex: string | null; payloadPreviewHex: string | null }>;
  acknowledgements: Array<{ frameNumber: number; sourceIp: string; relativeAcknowledgement: number }>;
  receiveEvents: Array<{ offset: number; requested: number; count: number; monotonicNs: number }>;
  ssSnapshots: Record<string, string>;
  validation: { ok: boolean; errors: string[]; recv_return_counts: number[]; forward_payload_rows: number };
  events: { sender: Array<Record<string, unknown>>; receiver: Array<Record<string, unknown>> };
};
export type TcpEvidenceBundle = {
  schemaVersion: string; kind: string; sequenceNumberPolicy: string; capturePointPolicy: string;
  cases: Record<"small-late" | "small-early" | "large" | "loopback", TcpCaseEvidence>;
  summary: { smallClientPort: number; smallHandshakeFrames: number[]; smallReadCounts: number[]; largeSegmentLengths: number[]; largeSegmentRanges: number[][] };
};
export const tcpEvidence = tcpEvidenceJson as unknown as TcpEvidenceBundle;
export function tcpFlagNames(flags: string) {
  const value = Number(flags); const names: string[] = [];
  if (value & 0x02) names.push("SYN"); if (value & 0x10) names.push("ACK"); if (value & 0x01) names.push("FIN"); if (value & 0x08) names.push("PSH");
  return names.join("+") || flags;
}
export function formatRanges(ranges: number[][]) { return ranges.map(([start, end]) => `${start}–${end - 1}`).join(", "); }
