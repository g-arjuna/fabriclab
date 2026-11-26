import fs from "node:fs";

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
];

const failures = [];
for (const [path, lineNumber, pattern] of requiredLines) {
  const text = sources.get(path)?.get(lineNumber);
  if (!text) failures.push(`${path}:${lineNumber} is missing from the embedded evidence source`);
  else if (!pattern.test(text)) failures.push(`${path}:${lineNumber} does not contain expected instruction ${pattern}: ${text.trim()}`);
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

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`RDMA curriculum evidence references OK (${requiredLines.length} source lines validated)`);
