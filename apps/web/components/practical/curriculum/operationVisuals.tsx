import type { ReactNode } from "react";

import { exact, type Completion, type PacketRecord, type WorkRequest } from "@/lib/practical/rdmaEvidence";
import { exactValue, FactGrid } from "./visuals";

export function WorkRequestSummary({ request, title = "Recorded Work Request" }: { request: WorkRequest; title?: string }) {
  return (
    <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/6 p-4" data-testid="work-request-summary">
      <h3 className="font-semibold text-cyan-100">{title}</h3>
      <div className="mt-3">
        <FactGrid facts={[
          { label: "Operation", value: request.opcode },
          { label: "WR ID", value: exactValue(request.wrId) },
          { label: "Byte length", value: request.byteLength ?? "—" },
          { label: "Local address", value: exactValue(request.localAddress) },
          { label: "Local LKEY", value: exactValue(request.localLkey) },
          ...(request.remoteAddress ? [{ label: "Remote address", value: exactValue(request.remoteAddress) }] : []),
          ...(request.remoteRkey ? [{ label: "Remote RKEY", value: exactValue(request.remoteRkey) }] : []),
        ]} />
      </div>
      {request.payloadText ? <p className="mt-3 text-sm leading-6 text-slate-300">Payload recorded in the application log: <span className="font-mono text-cyan-100">{request.payloadText}</span></p> : null}
    </section>
  );
}

export function CompletionSummary({ completion, title = "Recorded completion" }: { completion: Completion; title?: string }) {
  return (
    <section className="rounded-2xl border border-lime-300/20 bg-lime-300/6 p-4" data-testid="completion-summary">
      <h3 className="font-semibold text-lime-100">{title}</h3>
      <div className="mt-3">
        <FactGrid facts={[
          { label: "Observed on", value: completion.host === "hosta" ? "Server A" : "Server B" },
          { label: "Opcode", value: completion.opcode },
          { label: "Status", value: completion.status },
          { label: "Byte length", value: completion.byteLength },
          { label: "WR ID", value: exactValue(completion.wrId) },
          { label: "QP number", value: exactValue(completion.qpNum) },
        ]} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">This Completion Queue Entry is local to {completion.host === "hosta" ? "Server A" : "Server B"}. It is not a packet and does not represent a completion automatically observed by the peer.</p>
    </section>
  );
}

export function PacketSummary({ packet, children }: { packet: PacketRecord; children?: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-orange-300/20 bg-orange-300/6" data-testid="packet-summary">
      <header className="border-b border-orange-300/15 px-4 py-3">
        <h3 className="font-semibold text-orange-100">Captured packet · {packet.captureFile} frame {packet.frameNumber}</h3>
        <p className="mt-1 text-xs text-slate-500">{packet.direction} · {packet.opcodeName} · captured on the data network</p>
      </header>
      <div className="p-4">
        <FactGrid facts={[
          { label: "Ethernet/IP", value: `${packet.sourceIp} → ${packet.destinationIp}` },
          { label: "UDP destination port", value: packet.udp.destinationPort },
          { label: "Opcode", value: packet.opcodeName },
          { label: "Destination QPN", value: exact(packet.destinationQpn) },
          { label: "Packet sequence number", value: exact(packet.psn) },
          ...(packet.reth ? [
            { label: "Remote virtual address", value: exact(packet.reth.virtualAddress) },
            { label: "RKEY", value: exact(packet.reth.rkey) },
            { label: "DMA length", value: exact(packet.reth.dmaLength, "decimal") },
          ] : []),
          ...(packet.payloadText ? [{ label: "Payload text", value: packet.payloadText }] : []),
        ]} />
        {children ? <div className="mt-4 text-sm leading-6 text-slate-300">{children}</div> : null}
      </div>
    </section>
  );
}

export function PayloadMemory({ label, value, empty }: { label: string; value?: string | null; empty?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 whitespace-pre-wrap break-words font-mono text-sm leading-6 text-slate-200">{value || empty || "—"}</div>
    </div>
  );
}
