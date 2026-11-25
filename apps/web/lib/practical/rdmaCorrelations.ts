import type {
  Completion,
  Experiment,
  PacketRecord,
  WalkthroughStep,
  WorkRequest,
} from "@/lib/practical/rdmaEvidence";

export type RelationshipQualifications = {
  events: Map<string, Set<string>>;
  packets: Map<string, Set<string>>;
  workRequests: Map<string, Set<string>>;
  completions: Map<string, Set<string>>;
  memoryRegions: Map<string, Set<string>>;
};

export type RelationshipModel = {
  eventIds: Set<string>;
  packetIds: Set<string>;
  workRequestIds: Set<string>;
  completionIds: Set<string>;
  memoryRegionIds: Set<string>;
  codeRefs: WalkthroughStep["codeRefs"];
  basis: string[];
  qualifications: RelationshipQualifications;
};

function qualificationMaps(): RelationshipQualifications {
  return {
    events: new Map(),
    packets: new Map(),
    workRequests: new Map(),
    completions: new Map(),
    memoryRegions: new Map(),
  };
}

export function emptyRelationships(): RelationshipModel {
  return {
    eventIds: new Set(),
    packetIds: new Set(),
    workRequestIds: new Set(),
    completionIds: new Set(),
    memoryRegionIds: new Set(),
    codeRefs: [],
    basis: [],
    qualifications: qualificationMaps(),
  };
}

function qualify(model: RelationshipModel, kind: keyof RelationshipQualifications, id: string, qualification: string) {
  const map = model.qualifications[kind];
  if (!map.has(id)) map.set(id, new Set());
  map.get(id)!.add(qualification);
}

function mergeQualifications(target: RelationshipModel, source: RelationshipModel) {
  (Object.keys(target.qualifications) as Array<keyof RelationshipQualifications>).forEach((kind) => {
    source.qualifications[kind].forEach((qualifications, id) => {
      qualifications.forEach((qualification) => qualify(target, kind, id, qualification));
    });
  });
}

export function mergeRelationships(target: RelationshipModel, source: RelationshipModel) {
  source.eventIds.forEach((id) => target.eventIds.add(id));
  source.packetIds.forEach((id) => target.packetIds.add(id));
  source.workRequestIds.forEach((id) => target.workRequestIds.add(id));
  source.completionIds.forEach((id) => target.completionIds.add(id));
  source.memoryRegionIds.forEach((id) => target.memoryRegionIds.add(id));
  const codeKeys = new Set(target.codeRefs.map((reference) => `${reference.sourcePath}:${reference.startLine}:${reference.endLine}:${reference.label}`));
  source.codeRefs.forEach((reference) => {
    const key = `${reference.sourcePath}:${reference.startLine}:${reference.endLine}:${reference.label}`;
    if (!codeKeys.has(key)) target.codeRefs.push(reference);
  });
  target.basis.push(...source.basis.filter((item) => !target.basis.includes(item)));
  mergeQualifications(target, source);
}

function qualifyAll(model: RelationshipModel, kind: keyof RelationshipQualifications, ids: Iterable<string>, qualification: string) {
  for (const id of ids) qualify(model, kind, id, qualification);
}

export function relationshipsForStep(step: WalkthroughStep): RelationshipModel {
  const relationships = emptyRelationships();
  step.eventIds.forEach((id) => relationships.eventIds.add(id));
  step.packetIds.forEach((id) => relationships.packetIds.add(id));
  step.workRequestIds.forEach((id) => relationships.workRequestIds.add(id));
  step.completionIds.forEach((id) => relationships.completionIds.add(id));
  step.memoryRegionIds.forEach((id) => relationships.memoryRegionIds.add(id));
  qualifyAll(relationships, "events", step.eventIds, "guided step context");
  qualifyAll(relationships, "packets", step.packetIds, "guided step packet");
  qualifyAll(relationships, "workRequests", step.workRequestIds, "guided step context");
  qualifyAll(relationships, "completions", step.completionIds, "guided step completion");
  qualifyAll(relationships, "memoryRegions", step.memoryRegionIds, "guided step memory context");
  relationships.codeRefs.push(...step.codeRefs);
  relationships.basis.push("guided causal walkthrough step");
  return relationships;
}

function memoryIdForHost(experiment: Experiment, host: string) {
  return experiment.memoryRegions.find((region) => region.host === host)?.id ?? null;
}

function peerHost(experiment: Experiment, host: string) {
  return experiment.endpoints.initiator.host === host ? experiment.endpoints.responder.host : experiment.endpoints.initiator.host;
}

function addWorkRequestRelationship(experiment: Experiment, relationships: RelationshipModel, request: WorkRequest) {
  relationships.workRequestIds.add(request.id);
  qualify(relationships, "workRequests", request.id, "validated application work-request correlation");
  relationships.eventIds.add(request.eventId);
  qualify(relationships, "events", request.eventId, "recorded work-request posting event");
  const localMemory = memoryIdForHost(experiment, request.host);
  if (localMemory) {
    relationships.memoryRegionIds.add(localMemory);
    qualify(relationships, "memoryRegions", localMemory, "local buffer memory metadata");
  }
  if (request.remoteAddress) {
    const remoteMemory = memoryIdForHost(experiment, peerHost(experiment, request.host));
    if (remoteMemory) {
      relationships.memoryRegionIds.add(remoteMemory);
      qualify(relationships, "memoryRegions", remoteMemory, "remote memory metadata named by the work request");
    }
  }
  experiment.packets.forEach((packet) => {
    if (packet.correlations.workRequestIds.includes(request.id)) {
      relationships.packetIds.add(packet.id);
      const qualification = packet.role === "request"
        ? "validated WR/QPN/PSN/RETH correlation"
        : "later causal outcome for the same work request";
      qualify(relationships, "packets", packet.id, qualification);
      if (packet.role === "request" && packet.correlations.completionIds.length) {
        qualify(relationships, "packets", packet.id, "causal precursor to a later completion outcome");
      }
      packet.correlations.memoryRegionIds.forEach((id) => {
        relationships.memoryRegionIds.add(id);
        qualify(relationships, "memoryRegions", id, "validated packet/RETH memory correlation");
      });
      packet.correlations.completionIds.forEach((id) => {
        relationships.completionIds.add(id);
        qualify(relationships, "completions", id, "later completion outcome for the same work request");
      });
    }
  });
  const postingStep = experiment.walkthrough.find((item) => item.workRequestIds.includes(request.id) && item.codeRefs.length);
  if (postingStep) relationships.codeRefs.push(...postingStep.codeRefs);
  relationships.basis.push("validated work-request event and WR-ID correlation");
}

function addCompletionRelationship(experiment: Experiment, relationships: RelationshipModel, completion: Completion) {
  relationships.completionIds.add(completion.id);
  qualify(relationships, "completions", completion.id, "selected or validated local completion");
  relationships.eventIds.add(completion.eventId);
  qualify(relationships, "events", completion.eventId, "recorded completion event");
  const owningMemory = memoryIdForHost(experiment, completion.host);
  if (owningMemory) {
    relationships.memoryRegionIds.add(owningMemory);
    qualify(relationships, "memoryRegions", owningMemory, "memory local to the completion-owning host");
  }
  const request = experiment.workRequests.find((item) => item.id === completion.workRequestId);
  if (request) addWorkRequestRelationship(experiment, relationships, request);
  experiment.packets.forEach((packet) => {
    if (packet.correlations.completionIds.includes(completion.id)) {
      relationships.packetIds.add(packet.id);
      qualify(relationships, "packets", packet.id, "validated ACK/response-to-completion correlation");
    } else if (request && packet.correlations.workRequestIds.includes(request.id)) {
      relationships.packetIds.add(packet.id);
      qualify(relationships, "packets", packet.id, "protocol exchange for the same work request");
    }
    if (packet.correlations.completionIds.includes(completion.id) || (request && packet.correlations.workRequestIds.includes(request.id))) {
      packet.correlations.memoryRegionIds.forEach((id) => {
        relationships.memoryRegionIds.add(id);
        qualify(relationships, "memoryRegions", id, "memory correlated through the packet exchange");
      });
    }
  });
  const completionStep = experiment.walkthrough.find((item) => item.completionIds.includes(completion.id) && item.codeRefs.length);
  if (completionStep) relationships.codeRefs.push(...completionStep.codeRefs);
  relationships.basis.push("validated WR-ID to CQE correlation; completion ownership remains local to the polling host");
}

export function relationshipsForPacket(experiment: Experiment, packetId: string): RelationshipModel {
  const relationships = emptyRelationships();
  const packet = experiment.packets.find((item) => item.id === packetId);
  if (!packet) return relationships;
  relationships.packetIds.add(packet.id);
  qualify(relationships, "packets", packet.id, "selected recorded packet");
  packet.correlations.eventIds.forEach((id) => {
    relationships.eventIds.add(id);
    qualify(relationships, "events", id, "recorded packet correlation");
  });
  packet.correlations.memoryRegionIds.forEach((id) => {
    relationships.memoryRegionIds.add(id);
    qualify(relationships, "memoryRegions", id, "validated packet/RETH memory correlation");
  });
  packet.correlations.workRequestIds.forEach((id) => {
    relationships.workRequestIds.add(id);
    qualify(relationships, "workRequests", id, "validated packet-to-work-request correlation");
    const request = experiment.workRequests.find((item) => item.id === id);
    if (request) {
      relationships.eventIds.add(request.eventId);
      qualify(relationships, "events", request.eventId, "application event for the correlated work request");
      addWorkRequestRelationship(experiment, relationships, request);
    }
  });
  packet.correlations.completionIds.forEach((id) => {
    relationships.completionIds.add(id);
    qualify(relationships, "completions", id, "validated packet-to-completion correlation");
    const completion = experiment.completions.find((item) => item.id === id);
    if (completion) {
      relationships.eventIds.add(completion.eventId);
      qualify(relationships, "events", completion.eventId, "application event for the correlated completion");
    }
  });
  relationships.basis.push("validated packet QPN/PSN/RETH and correlation IDs");
  return relationships;
}

export function relationshipsForEvent(experiment: Experiment, eventId: string): RelationshipModel {
  const relationships = emptyRelationships();
  const event = experiment.events.find((item) => item.id === eventId);
  if (!event) return relationships;
  relationships.eventIds.add(event.id);
  qualify(relationships, "events", event.id, "selected application event");
  const request = experiment.workRequests.find((item) => item.eventId === eventId);
  if (request) addWorkRequestRelationship(experiment, relationships, request);
  const completion = experiment.completions.find((item) => item.eventId === eventId);
  if (completion) addCompletionRelationship(experiment, relationships, completion);
  if (["resources", "buffer_before", "buffer_after", "metadata_exchange"].includes(event.type)) {
    const memory = memoryIdForHost(experiment, event.host);
    if (memory) {
      relationships.memoryRegionIds.add(memory);
      qualify(relationships, "memoryRegions", memory, event.type === "metadata_exchange" ? "memory metadata exchanged over the control channel" : "memory recorded by the selected application event");
    }
  }
  if (event.type.includes("metadata") || event.type.includes("ready") || event.type.includes("signal")) {
    relationships.basis.push("control-channel metadata/synchronisation event; no control packet is fabricated");
  }
  relationships.basis.push("selected application event; direct packet relationships use validated IDs while later outcomes remain causal");
  return relationships;
}

export function relationshipsForCompletion(experiment: Experiment, completionId: string): RelationshipModel {
  const relationships = emptyRelationships();
  const completion = experiment.completions.find((item) => item.id === completionId);
  if (completion) addCompletionRelationship(experiment, relationships, completion);
  return relationships;
}

export function qualificationText(model: RelationshipModel, kind: keyof RelationshipQualifications, id: string) {
  return Array.from(model.qualifications[kind].get(id) ?? []).join("; ");
}

export function packetIsGuided(step: WalkthroughStep, packet: PacketRecord | null) {
  return Boolean(packet && step.packetIds.includes(packet.id));
}
