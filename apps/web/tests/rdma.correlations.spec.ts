import { expect, test } from "@playwright/test";

import {
  mergeRelationships,
  qualificationText,
  relationshipsForCompletion,
  relationshipsForEvent,
  relationshipsForPacket,
} from "@/lib/practical/rdmaCorrelations";
import { rdmaEvidence } from "@/lib/practical/rdmaEvidence";

const writeExperiment = rdmaEvidence.experiments.find((experiment) => experiment.id === "write")!;
const sendRecvExperiment = rdmaEvidence.experiments.find((experiment) => experiment.id === "send-recv")!;

test.describe("RDMA evidence correlation model", () => {
  test("WRITE post_send separates direct WR correlation from later completion outcome", () => {
    const event = writeExperiment.events.find((item) => item.type === "post_send" && item.host === "hosta")!;
    const relationships = relationshipsForEvent(writeExperiment, event.id);
    const requestPacket = writeExperiment.packets[0];
    const ackPacket = writeExperiment.packets[1];
    const completion = writeExperiment.completions[0];

    const request = writeExperiment.workRequests.find((item) => item.eventId === event.id)!;
    expect([...relationships.workRequestIds]).toEqual([request.id]);
    expect(relationships.packetIds.has(requestPacket.id)).toBe(true);
    expect(relationships.packetIds.has(ackPacket.id)).toBe(true);
    expect(qualificationText(relationships, "packets", requestPacket.id)).toContain("validated WR/QPN/PSN/RETH correlation");
    expect(qualificationText(relationships, "packets", ackPacket.id)).toContain("later causal outcome");
    expect(qualificationText(relationships, "completions", completion.id)).toContain("later completion outcome");
    expect(qualificationText(relationships, "workRequests", completion.workRequestId!)).toContain("validated application work-request");
  });

  test("metadata and receive-posting events do not fabricate packet relationships", () => {
    const metadata = writeExperiment.events.find((item) => item.type === "metadata_exchange" && item.host === "hostb")!;
    const metadataRelationships = relationshipsForEvent(writeExperiment, metadata.id);
    expect(metadataRelationships.packetIds.size).toBe(0);
    expect(metadataRelationships.workRequestIds.size).toBe(0);
    expect(metadataRelationships.memoryRegionIds.size).toBeGreaterThan(0);
    expect(metadataRelationships.basis.join(" ")).toContain("no control packet is fabricated");

    const postRecv = sendRecvExperiment.events.find((item) => item.type === "post_recv" && item.host === "hostb")!;
    const recvRelationships = relationshipsForEvent(sendRecvExperiment, postRecv.id);
    expect(recvRelationships.workRequestIds.size).toBe(1);
    expect(recvRelationships.packetIds.size).toBe(0);
    expect(recvRelationships.completionIds.size).toBe(0);
  });

  test("completion correlation preserves local ownership and relevant packet exchange", () => {
    const completion = writeExperiment.completions[0];
    const relationships = relationshipsForCompletion(writeExperiment, completion.id);
    expect(completion.host).toBe("hosta");
    expect(relationships.completionIds.has(completion.id)).toBe(true);
    expect(relationships.workRequestIds.has(completion.workRequestId!)).toBe(true);
    expect(relationships.packetIds.has(writeExperiment.packets[1].id)).toBe(true);
    expect(qualificationText(relationships, "packets", writeExperiment.packets[1].id)).toContain("validated ACK/response-to-completion correlation");
    expect(qualificationText(relationships, "completions", completion.id)).toContain("local completion");
  });

  test("packet correlation derives application events through WR/CQE IDs without packet event fabrication", () => {
    const requestPacket = writeExperiment.packets[0];
    const relationships = relationshipsForPacket(writeExperiment, requestPacket.id);
    expect(requestPacket.correlations.eventIds).toEqual([]);
    expect(relationships.eventIds.size).toBeGreaterThan(0);
    expect(relationships.workRequestIds.size).toBe(1);
    expect(qualificationText(relationships, "packets", requestPacket.id)).toContain("selected recorded packet");
    expect(qualificationText(relationships, "memoryRegions", "c:memory:hostb")).toContain("validated packet/RETH memory correlation");
  });

  test("merging the same selection repeatedly does not duplicate relationship qualifications", () => {
    const completion = writeExperiment.completions[0];
    const first = relationshipsForCompletion(writeExperiment, completion.id);
    const before = qualificationText(first, "completions", completion.id);
    mergeRelationships(first, relationshipsForCompletion(writeExperiment, completion.id));
    mergeRelationships(first, relationshipsForCompletion(writeExperiment, completion.id));
    expect(qualificationText(first, "completions", completion.id)).toBe(before);
    expect([...first.completionIds]).toEqual([completion.id]);
  });
});
