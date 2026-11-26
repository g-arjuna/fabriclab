import fs from "node:fs";
import crypto from "node:crypto";

const evidence = JSON.parse(fs.readFileSync(new URL("../public/practical/rdma/reference-evidence.json", import.meta.url), "utf8"));
const sources = new Map(evidence.sources.map((source) => [source.path, new Map(source.lines.map((line) => [line.number, line.text]))]));

const requiredLines = [
  ["python/exp_b_send_recv.py", 107, /qp\.post_recv\(rwr\)/],
  ["python/exp_b_send_recv.py", 113, /poll_one_cqe\(cq, tag="recv"/],
  ["python/exp_b_send_recv.py", 139, /qp\.post_send\(swr\)/],
  ["python/exp_b_send_recv.py", 144, /poll_one_cqe\(cq, tag="send"/],
  ["python/exp_c_write.py", 125, /SGE\(addr=.*length=len\(PAYLOAD\)/],
  ["python/exp_c_write.py", 127, /SendWR\(wr_id=WR_ID_WRITE/],
  ["python/exp_c_write.py", 133, /set_wr_rdma\(rkey=peer\["rkey"\], addr=peer\["addr"\]\)/],
  ["python/exp_c_write.py", 134, /qp\.post_send\(swr\)/],
  ["python/exp_c_write.py", 140, /poll_one_cqe\(cq, tag="write"/],
  ["python/exp_c_write.py", 161, /cq\.poll\(1\)/],
  ["python/exp_c_write.py", 165, /bytes\(buf\.raw\[:len\(PAYLOAD\)\]\)/],
  ["python/exp_d_read.py", 120, /qp\.post_send\(swr\)/],
  ["python/exp_d_read.py", 126, /poll_one_cqe\(cq, tag="read"/],
  ["python/exp_a_resources.py", 78, /pd_mod\.PD\(ctx\)/],
  ["python/exp_a_resources.py", 80, /new_memory_region\(pd, buf, BUF_LEN\)/],
  ["python/exp_a_resources.py", 100, /ctrl_send\(sock, \{"role"/],
  ["python/exp_a_resources.py", 107, /bring_qp_to_rts\(qp/],
  ["python/exp_b_send_recv.py", 133, /SGE\(addr=.*length=len\(PAYLOAD\)/],
  ["python/exp_b_send_recv.py", 135, /SendWR\(wr_id=WR_ID_SEND/],
  ["python/rdma_common.py", 40, /IBV_ACCESS_LOCAL_WRITE/],
  ["python/rdma_common.py", 41, /IBV_ACCESS_REMOTE_WRITE/],
  ["python/rdma_common.py", 42, /IBV_ACCESS_REMOTE_READ/],
  ["python/rdma_common.py", 133, /mr_mod\.MR\(pd, length=length, access=ACCESS/],
];

const failures = [];
for (const [path, lineNumber, pattern] of requiredLines) {
  const text = sources.get(path)?.get(lineNumber);
  if (!text) failures.push(`${path}:${lineNumber} is missing from the embedded evidence source`);
  else if (!pattern.test(text)) failures.push(`${path}:${lineNumber} does not contain expected instruction ${pattern}: ${text.trim()}`);
}

const operationsVisuals = fs.readFileSync(new URL("../components/practical/curriculum/operationsVisuals.tsx", import.meta.url), "utf8");
for (const match of operationsVisuals.matchAll(/<SourceLines\s+path="([^"]+)"\s+start=\{(\d+)\}\s+end=\{(\d+)\}/g)) {
  const [, path, startText, endText] = match;
  const start = Number(startText);
  const end = Number(endText);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
    failures.push(`operations visual has invalid source range ${path}:${startText}-${endText}`);
    continue;
  }
  for (let lineNumber = start; lineNumber <= end; lineNumber += 1) {
    if (!sources.get(path)?.has(lineNumber)) failures.push(`operations visual source excerpt ${path}:${lineNumber} is missing from immutable evidence`);
  }
}

for (const experiment of evidence.experiments.filter((item) => item.id !== "resources")) {
  const endpointQpns = new Set([experiment.endpoints.initiator.qpn.decimal, experiment.endpoints.responder.qpn.decimal]);
  for (const packet of experiment.packets) {
    if (!endpointQpns.has(packet.destinationQpn.decimal)) {
      failures.push(`${experiment.id}/${packet.id} destination QPN does not match a validated endpoint`);
    }
    if (packet.payloadText && !packet.payloadHex) {
      failures.push(`${experiment.id}/${packet.id} has payload text without authoritative payload bytes`);
    }
    const applicationPayloadBytes = packet.payloadHex ? packet.payloadHex.length / 2 : 0;
    if (packet.dataLength !== applicationPayloadBytes + packet.bth.padCount) {
      failures.push(`${experiment.id}/${packet.id} captured data length ${packet.dataLength} does not equal application payload ${applicationPayloadBytes} plus BTH padding ${packet.bth.padCount}`);
    }
  }
}

for (const [experimentId, packetRole] of [["send-recv", "request"], ["write", "request"], ["read", "response"]]) {
  const experiment = evidence.experiments.find((item) => item.id === experimentId);
  const packet = experiment?.packets.find((item) => item.role === packetRole);
  if (!packet?.payloadHex) {
    failures.push(`${experimentId}/${packetRole} payload-bearing reference packet is missing`);
  } else {
    const applicationPayloadBytes = packet.payloadHex.length / 2;
    if (!applicationPayloadBytes || packet.dataLength <= applicationPayloadBytes) {
      failures.push(`${experimentId}/${packetRole} does not expose a distinct application payload length and padded captured data length`);
    }
  }
}


const foundations = JSON.parse(fs.readFileSync(new URL("../lib/practical/foundationsContent.generated.json", import.meta.url), "utf8"));
const tcpEvidence = JSON.parse(fs.readFileSync(new URL("../public/practical/rdma/tcp-foundations-evidence.json", import.meta.url), "utf8"));
const foundationSourceDir = new URL("../../../content/foundations-v2/", import.meta.url);
const foundationFiles = new Map(fs.readdirSync(foundationSourceDir).filter((name) => name.endsWith(".md")).map((name) => [name, fs.readFileSync(new URL(name, foundationSourceDir), "utf8")]));

function sourceBlock(source, sectionId, blockName) {
  const sectionMarker = new RegExp(`^## ${sectionId.replaceAll(".", "\\.")} .*$`, "m").exec(source);
  if (!sectionMarker) return "";
  const sectionBodyStart = sectionMarker.index + sectionMarker[0].length;
  const sectionRest = source.slice(sectionBodyStart);
  const nextSection = sectionRest.search(/^## \d+\.\d+ /m);
  const sectionBody = nextSection === -1 ? sectionRest : sectionRest.slice(0, nextSection);
  const blockMarker = new RegExp(`^### ${blockName}\\n\\n`, "m").exec(sectionBody);
  if (!blockMarker) return "";
  const blockRest = sectionBody.slice(blockMarker.index + blockMarker[0].length);
  const nextBlock = blockRest.search(/^### /m);
  return (nextBlock === -1 ? blockRest : blockRest.slice(0, nextBlock)).trim();
}

function resolveTemplateValue(template) {
  const [, caseName, metric] = template.split(".");
  if (caseName === "small") {
    if (metric === "client_port") return tcpEvidence.summary.smallClientPort;
    if (metric === "handshake_frames") return tcpEvidence.summary.smallHandshakeFrames.length;
    if (metric === "read_events") return tcpEvidence.summary.smallReadCounts.length;
    return undefined;
  }
  const item = tcpEvidence.cases[caseName];
  if (!item) return undefined;
  if (metric === "client_port") return item.endpoints.senderLocal?.[1];
  if (metric === "handshake_frames") return item.handshake.length;
  if (metric === "read_events") return item.receiveEvents.length;
  if (metric === "payload_segments") return item.payloadSegments.length;
  return undefined;
}


for (const section of foundations) {
  const source = foundationFiles.get(section.sourceFile);
  if (!source) {
    failures.push(`${section.id} source file ${section.sourceFile} is missing`);
    continue;
  }
  for (const [key, blockName] of [["learnerCopy", "Learner copy"], ["visualSpec", "Visual and interaction"], ["revealCopy", "Reveal/feedback"], ["inspectCopy", "Inspect"]]) {
    const authored = sourceBlock(source, section.id, blockName);
    if (authored !== section[key]) failures.push(`${section.id} ${blockName} does not exactly match ${section.sourceFile}`);
  }
  const combined = [section.learnerCopy, section.visualSpec, section.revealCopy, section.inspectCopy].join("\n");
  for (const template of combined.matchAll(/\{(tcp\.[^}]+|rdma\.[^}]+)\}/g)) {
    const key = template[1];
    if (key.startsWith("tcp.") && resolveTemplateValue(key) === undefined) failures.push(`${section.id} references unavailable TCP evidence binding ${key}`);
    if (key.startsWith("rdma.")) {
      const resources = evidence.experiments.find((entry) => entry.id === "resources");
      const hostMemory = {
        hosta: resources?.endpoints?.initiator?.memoryRegion,
        hostb: resources?.endpoints?.responder?.memoryRegion,
      };
      const [, , host, metric] = key.split(".");
      if (!hostMemory[host]?.[metric]) failures.push(`${section.id} references unavailable RDMA evidence binding ${key}`);
    }
  }
}

if (!foundations.length) failures.push("generated authored foundations content is empty");
if (foundations.filter((section) => section.lesson === "moving-data").length !== 19) failures.push("moving-data does not contain 19 authored sections");
if (foundations.filter((section) => section.lesson === "why-rdma").length !== 6) failures.push("why-rdma does not contain 6 authored sections");
if (foundations.filter((section) => section.lesson === "memory").length !== 9) failures.push("memory does not contain 9 authored sections");
if (foundations.filter((section) => section.lesson === "queues").length !== 5) failures.push("queues does not contain 5 authored sections");

const operations = JSON.parse(fs.readFileSync(new URL("../lib/practical/operationsContent.generated.json", import.meta.url), "utf8"));
const operationSourceDir = new URL("../../../content/operations-v2/", import.meta.url);
const operationFiles = new Map(fs.readdirSync(operationSourceDir).filter((name) => /^0[5-8].*\.md$/.test(name)).map((name) => [name, fs.readFileSync(new URL(name, operationSourceDir), "utf8")]));
for (const section of operations) {
  const source = operationFiles.get(section.sourceFile);
  if (!source) {
    failures.push(`${section.id} operations source file ${section.sourceFile} is missing`);
    continue;
  }
  for (const [key, blockName] of [["learnerCopy", "Learner copy"], ["visualSpec", "Visual and interaction"], ["revealCopy", "Reveal/feedback"], ["inspectCopy", "Inspect"]]) {
    const authored = sourceBlock(source, section.id, blockName);
    if (authored !== section[key]) failures.push(`${section.id} operations ${blockName} does not exactly match ${section.sourceFile}`);
  }
}
for (const [lesson, count] of [["send-receive", 9], ["write", 8], ["read", 7], ["packets", 12]]) {
  if (operations.filter((section) => section.lesson === lesson).length !== count) failures.push(`${lesson} does not contain ${count} authored operations sections`);
}

const anchors = JSON.parse(fs.readFileSync(new URL("../../../content/operations-v2/evidence-anchors.json", import.meta.url), "utf8"));
for (const [file, expected] of [["../public/practical/rdma/reference-evidence.json", anchors.rdmaJsonSha256], ["../public/practical/rdma/tcp-foundations-evidence.json", anchors.tcpJsonSha256]]) {
  const bytes = fs.readFileSync(new URL(file, import.meta.url));
  const actual = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected) failures.push(`${file} SHA-256 ${actual} does not match immutable baseline ${expected}`);
}
for (const anchorExperiment of anchors.experiments) {
  const experiment = evidence.experiments.find((item) => item.id === anchorExperiment.id);
  if (!experiment) {
    failures.push(`anchor experiment ${anchorExperiment.id} is missing`);
    continue;
  }
  for (const endpoint of [experiment.endpoints.initiator, experiment.endpoints.responder]) {
    if (![anchorExperiment.aQpn, anchorExperiment.bQpn].includes(Number(endpoint.qpn.decimal))) failures.push(`${experiment.id} endpoint QPN ${endpoint.qpn.decimal} outside scoped anchor pair`);
  }
  for (const packetAnchor of anchorExperiment.packets) {
    const packetValue = experiment.packets.find((item) => item.id === packetAnchor.id);
    if (!packetValue) {
      failures.push(`${experiment.id} anchor packet ${packetAnchor.id} is missing`);
      continue;
    }
    const applicationPayloadBytes = packetValue.payloadHex ? packetValue.payloadHex.length / 2 : 0;
    const checks = [
      [packetValue.role, packetAnchor.role, "role"],
      [Number(packetValue.opcode.decimal), packetAnchor.opcode, "opcode"],
      [Number(packetValue.destinationQpn.decimal), packetAnchor.destinationQpn, "destination QPN"],
      [Number(packetValue.psn.decimal), packetAnchor.psn, "PSN"],
      [applicationPayloadBytes, packetAnchor.payloadBytes, "payload bytes"],
      [packetValue.bth.padCount, packetAnchor.pad, "padding"],
      [packetValue.dataLength, packetAnchor.dataLength, "captured data length"],
      [packetValue.frameLength, packetAnchor.frameLength, "frame length"],
      [Boolean(packetValue.reth), packetAnchor.reth, "RETH presence"],
    ];
    for (const [actual, expected, label] of checks) {
      if (actual !== expected) failures.push(`${packetAnchor.id} ${label} ${actual} does not match anchor ${expected}`);
    }
    if (packetAnchor.rethDmaLength && Number(packetValue.reth?.dmaLength.decimal) !== packetAnchor.rethDmaLength) failures.push(`${packetAnchor.id} RETH DMA length does not match anchor ${packetAnchor.rethDmaLength}`);
  }
  for (const id of [...anchorExperiment.wrIds, ...anchorExperiment.completionIds, ...anchorExperiment.snapshotIds, ...anchorExperiment.requiredEventIds]) {
    const present = experiment.workRequests.some((item) => item.id === id) || experiment.completions.some((item) => item.id === id) || experiment.events.some((item) => item.id === id) || experiment.memoryRegions.some((region) => region.snapshots.some((item) => item.id === id));
    if (!present) failures.push(`${experiment.id} required anchor evidence ${id} is missing`);
  }
  for (const packetValue of experiment.packets.filter((item) => item.payloadHex)) {
    if (packetValue.payloadHex.slice(-2) !== anchorExperiment.expectedPayloadLastByteHex) failures.push(`${packetValue.id} does not preserve final newline byte ${anchorExperiment.expectedPayloadLastByteHex}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`RDMA curriculum evidence references OK (${requiredLines.length} source lines, ${operations.length} operations sections validated)`);
