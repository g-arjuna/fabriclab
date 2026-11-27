export type GuidedContentReference = {
  sectionId: string;
  unitIndexes: number[];
};

export type GuidedStageDefinition = {
  /** Stable persistence/correlation identifier. Never derive this from presentation text. */
  id: string;
  /** Human-presented stage name; editing this text does not alter stored progress. */
  label: string;
  /** Zero-based canonical instruction-unit references within this subsection; absent means deterministic proportional selection. */
  instructionUnitIndexes?: number[];
  /** Exact canonical content references, including cross-subsection references where the mechanism was authored earlier. */
  instructionReferences?: GuidedContentReference[];
  nextPreview?: string;
};

type GuidedStageInput = readonly [id: string, label: string];

function plan(stages: GuidedStageInput[]): GuidedStageDefinition[] {
  return stages.map(([id, label], index) => ({
    id,
    label,
    nextPreview: stages[index + 1]?.[1],
  }));
}

export const foundationGuidedStages: Record<string, GuidedStageDefinition[]> = {
  "1.1": plan([
    ["meet-the-physical-computer", "Meet the physical computer"],
    ["introduce-the-software-running-on-the-computer", "Introduce the software running on the computer"],
    ["follow-an-application-instruction", "Follow an application instruction"],
    ["follow-a-kernel-instruction", "Follow a kernel instruction"],
  ]),
  "1.2": plan([
    ["show-program-stored-on-disk", "Show program stored on disk"],
    ["start-the-first-process", "Start the first process and its virtual address space"],
    ["start-a-second-process", "Start a second independent process"],
    ["demonstrate-shared-read-only-mappings", "Reveal the shared read-only mapping"],
    ["introduce-demand-allocation", "Introduce an unpopulated demand mapping"],
    ["touch-demand-memory-and-interpret", "Touch demand memory and interpret the result"],
  ]),
  "1.3": plan([
    ["introduce-a-virtual-address", "Reference a virtual address in process A"],
    ["resolve-first-process-translation", "Resolve the address in process A"],
    ["read-the-illustrative-byte", "Read the translated byte"],
    ["introduce-second-process-same-address", "Reference the same address in process C"],
    ["resolve-second-process-translation", "Resolve it in process C"],
    ["demonstrate-a-permitted-store", "Complete a permitted store"],
    ["demonstrate-a-rejected-store", "Reject a store through a read-only mapping"],
  ]),
  "1.4": plan([
    ["no-allocated-buffer", "No allocated buffer"],
    ["allocate-sixteen-bytes", "Create the zero-initialized sixteen-byte buffer"],
    ["write-hello-into-the-first-five-cells", "Write HELLO into the first five cells"],
    ["highlight-capacity-versus-meaningful-data-length", "Compare capacity and meaningful payload length"],
  ]),
  "1.5": plan([
    ["original-buffer", "Start with the original buffer"],
    ["create-a-second-reference", "Create a second reference to the same bytes"],
    ["modify-through-that-reference", "Write through the second reference"],
    ["create-an-independent-copy", "Copy the current bytes independently"],
    ["modify-the-copy", "Modify only the independent copy"],
  ]),
  "1.6": plan([
    ["application-executes-in-user-mode", "Application executes in user mode"],
    ["application-requests-a-kernel-service", "Application requests a kernel service"],
    ["cpu-executes-kernel-instructions", "CPU executes kernel instructions"],
    ["waiting-and-device-wakeup-are-separate", "Waiting and device wakeup are separate"],
    ["control-returns-to-user-mode", "Control returns to user mode"],
  ]),
  "1.7": plan([["compare-the-two-distinct-host-memory-systems", "Compare the two distinct host memory systems"]]),
  "2.1": plan([
    ["inspect-existing-processes-and-their-socket-handles", "Inspect existing processes and their socket handles"],
    ["create-the-python-tcp-socket", "Create the Python TCP socket"],
    ["show-the-kernel-managed-socket-object", "Show the kernel-managed socket object"],
    ["distinguish-nic-port-tcp-port-and-file-descriptor", "Distinguish NIC port, TCP port and file descriptor"],
  ]),
  "2.2": plan([
    ["create-the-client-socket", "Create the client socket"],
    ["create-the-listener-on-server-b", "Create the listener on Server B"],
    ["establish-the-connection", "Establish the connection"],
    ["identify-the-accepted-connected-socket", "Identify the accepted connected socket"],
  ]),
  "2.3": plan([
    ["start-with-distinct-listener-and-client-endpoints", "Start with distinct listener and client endpoints"],
    ["follow-the-recorded-syn", "Follow the recorded SYN"],
    ["follow-the-recorded-syn-ack", "Follow the recorded SYN+ACK"],
    ["follow-the-recorded-ack-and-established-state", "Follow the recorded ACK and established state"],
  ]),
  "2.4": plan([
    ["inspect-the-application-writes", "Inspect the application writes"],
    ["inspect-continuous-byte-stream-positions", "Inspect continuous byte-stream positions"],
    ["observe-one-valid-receive-chunking", "Observe one valid receive chunking"],
    ["compare-another-valid-receive-chunking", "Compare another valid receive chunking"],
  ]),
  "2.5": plan([
    ["prepare-the-application-send-buffer", "Prepare the application send buffer"],
    ["submit-bytes-through-the-socket-interface", "Submit bytes through the socket interface"],
    ["copy-bytes-into-kernel-managed-send-storage", "Copy bytes into kernel-managed send storage"],
    ["return-to-the-application-while-the-source-remains-unchanged", "Return to the application while the source remains unchanged"],
  ]),
  "2.6": plan([
    ["show-the-original-application-byte-range", "Show the original application byte range"],
    ["highlight-the-first-recorded-tcp-segment", "Examine the first recorded TCP segment"],
    ["highlight-the-next-recorded-segment", "Examine the next recorded segment"],
    ["highlight-the-remaining-recorded-segment", "Examine the remaining recorded segment"],
    ["compare-segment-and-application-read-boundaries", "Compare segment and application-read boundaries"],
  ]),
  "2.7": plan([
    ["inspect-kernel-tcp-ip-and-driver-processing", "Inspect kernel TCP/IP and driver processing"],
    ["prepare-the-transmit-descriptor", "Prepare the transmit descriptor"],
    ["nic-accesses-prepared-memory", "NIC accesses prepared memory"],
    ["transmit-the-ethernet-frame", "Transmit the Ethernet frame"],
  ]),
  "2.8": plan([
    ["receive-the-recorded-frame", "Receive the recorded frame"],
    ["place-bytes-in-kernel-receive-storage", "Place bytes in kernel receive storage"],
    ["inspect-the-socket-before-the-application-reads", "Inspect the socket before the application reads"],
    ["contrast-a-conceptual-out-of-order-arrival", "Contrast a conceptual out-of-order arrival"],
  ]),
  "2.9": plan([
    ["start-with-bytes-waiting-in-kernel-receive-storage", "Start with bytes waiting in kernel receive storage"],
    ["read-the-first-available-bytes", "Read the first available bytes"],
    ["read-the-next-available-bytes", "Read the next available bytes"],
    ["read-the-remaining-bytes", "Read the remaining bytes"],
  ]),
  "2.10": plan([
    ["inspect-the-receiver-reads-first-case", "Inspect the receiver-reads-first case"],
    ["release-the-sender-and-observe-the-blocked-receive-complete", "Release the sender and observe the blocked receive complete"],
    ["inspect-the-sender-sends-first-case", "Inspect the sender-sends-first case"],
    ["observe-unread-bytes-waiting-in-kernel-storage", "Observe unread bytes waiting in kernel storage"],
    ["compare-ordering-and-delivery-results", "Compare ordering and delivery results"],
  ]),
  "2.11": plan([
    ["inspect-same-machine-loopback", "Inspect same-machine loopback"],
    ["inspect-two-machine-ethernet", "Inspect two-machine Ethernet"],
    ["compare-the-software-and-physical-network-paths", "Compare the software and physical network paths"],
  ]),
  "2.12": plan([
    ["inspect-the-small-captured-transfer", "Inspect the small captured transfer"],
    ["inspect-the-large-captured-transfer", "Inspect the large captured transfer"],
    ["connect-packets-to-application-byte-ranges", "Connect packets to application byte ranges"],
    ["establish-what-the-evidence-does-and-does-not-show", "Establish what the evidence does and does not show"],
  ]),
  "3.1": plan([
    ["cpu-mediated-memory-operation", "CPU-mediated memory operation"],
    ["cpu-prepares-device-work", "CPU prepares device work"],
    ["device-accesses-the-memory-system", "Device accesses the memory system"],
    ["destination-memory-changes", "Destination memory changes"],
    ["cpu-software-observes-the-result", "CPU/software observes the result"],
  ]),
  "3.2": plan([
    ["introduce-the-application-virtual-address", "Introduce the application virtual address"],
    ["follow-cpu-mmu-translation", "Follow CPU/MMU translation"],
    ["reveal-the-device-visible-address-view", "Reveal the device-visible address view"],
  ]),
  "3.3": plan([
    ["follow-the-representative-tcp-memory-path", "Follow the representative TCP memory path"],
    ["follow-the-representative-hardware-rdma-path", "Follow the representative hardware RDMA path"],
    ["compare-instruction-control-payload-and-completion-paths", "Compare instruction, control, payload and completion paths"],
  ]),
  "3.4": plan([
    ["preview-the-shared-memory-to-memory-objective", "Preview the shared memory-to-memory objective"],
    ["preview-send", "Preview SEND"],
    ["preview-write", "Preview WRITE"],
    ["preview-read", "Preview READ"],
  ]),
  "3.5": plan([
    ["establish-the-actual-rxe-software-path", "Establish the actual RXE software path"],
    ["compare-the-representative-hardware-rnic-path", "Compare the representative hardware RNIC path"],
    ["distinguish-software-transport-execution-from-hardware-transport-execution", "Distinguish software transport execution from hardware transport execution"],
  ]),
  "3.6": plan([
    ["prepare-memory-and-communication-resources", "Prepare memory and communication resources"],
    ["describe-work", "Describe work"],
    ["submit-work-to-the-endpoint", "Submit work to the endpoint"],
    ["observe-the-result", "Observe the result"],
  ]),
  "4.1": plan([
    ["existing-application-buffer", "Existing application buffer"],
    ["application-requests-registration", "Application requests registration"],
    ["provider-establishes-registered-access", "Provider establishes registered access"],
    ["memory-region-metadata-appears", "Memory Region metadata appears"],
    ["address-and-length-are-explained", "Address and length are explained"],
    ["permissions-and-keys-are-revealed", "Permissions and keys are revealed"],
  ]),
  "4.2": plan([
    ["application-asks-through-pyverbs", "Application asks through Pyverbs"],
    ["provider-and-protection-domain-establish-the-mr", "Provider and protection domain establish the MR"],
    ["mr-is-returned-to-the-application", "MR is returned to the application"],
  ]),
  "4.3": plan([
    ["inspect-the-registered-byte-range", "Inspect the registered byte range"],
    ["inspect-a-valid-bounded-range", "Inspect a valid bounded range"],
    ["inspect-a-boundary-crossing-range", "Inspect a boundary-crossing range"],
    ["explain-base-offset-length-and-end-exclusive-boundary", "Explain base, offset, length and end-exclusive boundary"],
  ]),
  "4.4": plan([
    ["ordinary-cpu-memory-access", "Ordinary CPU memory access"],
    ["local-provider-write-access", "Local provider write access"],
    ["remote-write-access", "Remote WRITE access"],
    ["remote-read-access", "Remote READ access"],
    ["compare-the-access-types", "Compare the access types"],
  ]),
  "4.5": plan([
    ["valid-local-registration-reference", "Valid local registration reference"],
    ["incorrect-local-key", "Incorrect local key"],
    ["correct-key-but-invalid-requested-range", "Correct key but invalid requested range"],
    ["correct-association-and-applicable-permission", "Correct association and applicable permission"],
  ]),
  "4.6": plan([
    ["b-owns-a-registered-memory-region", "B owns a registered memory region"],
    ["b-shares-address-rkey-and-valid-length", "B shares address, RKEY and valid length"],
    ["a-receives-the-remote-metadata", "A receives the remote metadata"],
    ["a-constructs-the-relevant-memory-description", "A constructs the relevant memory description"],
    ["b-s-provider-validates-the-valid-illustrated-request", "B's provider validates the valid illustrated request"],
    ["inspect-an-incorrect-remote-key", "Inspect an incorrect remote key"],
    ["inspect-an-out-of-range-remote-request", "Inspect an out-of-range remote request"],
    ["inspect-missing-remote-write-permission", "Inspect missing remote-write permission"],
  ]),
  "4.7": plan([
    ["inspect-send-setup-metadata", "Inspect SEND setup metadata"],
    ["preview-write-setup-metadata", "Preview WRITE setup metadata"],
    ["exchange-control-metadata", "Exchange control metadata"],
    ["distinguish-control-metadata-from-rdma-payload-traffic", "Distinguish control metadata from RDMA payload traffic"],
  ]),
  "4.8": plan([
    ["validate-a-correct-remote-read", "Validate a correct remote read"],
    ["reject-missing-remote-write-permission", "Reject missing remote-write permission"],
    ["reject-a-boundary-crossing-range", "Reject a boundary-crossing range"],
    ["reject-an-incorrect-key", "Reject an incorrect key"],
  ]),
  "4.9": plan([
    ["move-from-illustrative-registration-to-recorded-registration", "Move from illustrative registration to recorded registration"],
    ["inspect-recorded-host-memory-region-metadata", "Inspect recorded host memory-region metadata"],
    ["connect-the-values-to-immutable-source-lines", "Connect the values to immutable source lines"],
  ]),
  "4.10": plan([
    ["start-with-registered-memory-but-no-described-task", "Start with registered memory but no described task"],
    ["describe-the-desired-task", "Describe the desired task"],
  ]),
  "4.11": plan([
    ["construct-an-unposted-work-request", "Construct an unposted Work Request"],
    ["attach-the-local-memory-description", "Attach the local memory description"],
    ["inspect-the-actual-send-construction-source", "Inspect the actual SEND construction source"],
  ]),
  "4.12": plan([
    ["start-with-one-send-queue", "Start with one Send Queue"],
    ["reveal-the-receive-queue", "Reveal the Receive Queue"],
    ["form-a-queue-pair", "Form a Queue Pair"],
  ]),
  "4.13": plan([
    ["inspect-endpoint-metadata-exchange", "Inspect endpoint metadata exchange"],
    ["follow-destination-qpn-a-to-b", "Follow destination QPN A to B"],
    ["follow-destination-qpn-b-to-a", "Follow destination QPN B to A"],
    ["inspect-recorded-endpoint-setup", "Inspect recorded endpoint setup"],
  ]),
  "4.14": plan([
    ["post-signalled-work-conceptually", "Post signalled work conceptually"],
    ["provider-produces-a-completion", "Provider produces a completion"],
    ["application-polls-the-completion-queue", "Application polls the Completion Queue"],
    ["inspect-the-resource-only-evidence-boundary", "Inspect the resource-only evidence boundary"],
  ]),
};

export const operationGuidedStages: Record<string, GuidedStageDefinition[]> = {
  "5.1": plan([["locate-the-two-recorded-programs", "Locate the two recorded programs"], ["inspect-the-two-program-roles", "Inspect the two program roles"], ["locate-the-isolated-data-capture", "Locate the isolated data capture"]]),
  "5.2": plan([["start-before-resources-are-introduced", "Start before resources are introduced"], ["open-device-and-create-resources", "Open device and create resources"], ["exchange-endpoint-metadata", "Exchange endpoint metadata"], ["prepare-the-qps", "Prepare the QPs"]]),
  "5.3": plan([["start-before-receive-work-is-described", "Start before receive work is described"], ["describe-receive-memory", "Describe receive memory"], ["post-receive-work", "Post receive work"], ["tell-a-the-receiver-is-ready", "Tell A the receiver is ready"]]),
  "5.4": plan([["start-with-no-posted-receive", "Start with no posted receive"], ["try-send-with-no-receive", "Try SEND with no receive"], ["observe-the-receiver-not-ready-state", "Observe the receiver-not-ready state"], ["prepare-receive-work", "Prepare receive work"], ["return-to-the-recorded-experiment", "Return to the recorded experiment"]]),
  "5.5": plan([["start-with-prepared-endpoints", "Start with prepared endpoints"], ["write-bytes-into-a-s-buffer", "Write bytes into A's buffer"], ["construct-the-send-instruction", "Construct the SEND instruction"], ["submit-to-the-send-queue", "Submit to the Send Queue"]]),
  "5.6": plan([["start-after-send-submission", "Start after SEND submission"], ["inspect-the-captured-send-packet", "Inspect the captured SEND packet"], ["follow-placement-at-b", "Follow placement at B"]]),
  "5.7": plan([["start-with-packet-exchange-complete", "Start with packet exchange complete"], ["inspect-the-reverse-ack", "Inspect the reverse ACK"], ["observe-a-s-completion", "Observe A's completion"], ["observe-b-s-completion", "Observe B's completion"]]),
  "5.8": plan([["start-before-application-memory-verification", "Start before application memory verification"], ["read-the-received-bytes", "Read the received bytes"], ["inspect-verified-receiver-memory", "Inspect verified receiver memory"], ["compare-with-tcp", "Compare with TCP"]]),
  "5.9": plan([["reconstruct-resources", "Reconstruct resources"], ["reconstruct-receive-readiness", "Reconstruct receive readiness"], ["reconstruct-submission", "Reconstruct submission"], ["reconstruct-packet-and-completion-evidence", "Reconstruct packet and completion evidence"]]),
  "6.1": plan([["recall-send-destination-selection", "Recall SEND destination selection"], ["compare-ordinary-write-destination-selection", "Compare ordinary WRITE destination selection"], ["open-the-recorded-write-experiment", "Open the recorded WRITE experiment"]]),
  "6.2": plan([["start-before-target-metadata-is-shared", "Start before target metadata is shared"], ["inspect-target-before", "Inspect target before"], ["share-destination-information", "Share destination information"], ["prepare-endpoints-and-signal-readiness", "Prepare endpoints and signal readiness"]]),
  "6.3": plan([["start-with-an-empty-local-source", "Start with an empty local source"], ["fill-a-s-source-buffer", "Fill A's source buffer"], ["describe-local-source-memory", "Describe local source memory"], ["construct-the-write-work-request", "Construct the WRITE Work Request"], ["attach-the-remote-destination", "Attach the remote destination"], ["submit-the-completed-work-request", "Submit the completed Work Request"]]),
  "6.4": plan([["start-after-write-submission", "Start after WRITE submission"], ["inspect-the-write-request", "Inspect the WRITE request"], ["check-target-access", "Check target access"], ["follow-target-placement", "Follow target placement"]]),
  "6.5": plan([["start-with-the-request-on-the-wire", "Start with the request on the wire"], ["inspect-the-ack", "Inspect the ACK"], ["poll-writer-cq", "Poll writer CQ"], ["observe-write-complete", "Observe write_complete"]]),
  "6.6": plan([["consider-the-target-completion-question", "Consider the target-completion question"], ["follow-the-synchronization-signal", "Follow the synchronization signal"], ["poll-b-s-cq", "Poll B's CQ"], ["reveal-the-recorded-target-observation", "Reveal the recorded target observation"]]),
  "6.7": plan([["start-before-target-memory-verification", "Start before target memory verification"], ["inspect-before-and-after", "Inspect before and after"], ["verify-exact-target-bytes", "Verify exact target bytes"]]),
  "6.8": plan([["compare-ordinary-write", "Compare ordinary WRITE"], ["compare-send", "Compare SEND"], ["inspect-write-with-immediate-conceptually", "Inspect WRITE with immediate conceptually"], ["review-operation-selection", "Review operation selection"]]),
  "7.1": plan([["inspect-the-application-request-reply-problem", "Inspect the application request/reply problem"], ["compare-application-request-reply", "Compare application request/reply"], ["choose-rdma-read", "Choose RDMA READ"], ["open-the-recorded-read-experiment", "Open the recorded READ experiment"]]),
  "7.2": plan([["start-before-read-metadata-is-shared", "Start before read metadata is shared"], ["inspect-b-s-source", "Inspect B's source"], ["prepare-a-s-destination", "Prepare A's destination"], ["exchange-source-metadata", "Exchange source metadata"], ["confirm-readiness", "Confirm readiness"]]),
  "7.3": plan([["start-with-prepared-endpoints", "Start with prepared endpoints"], ["describe-a-s-local-destination", "Describe A's local destination"], ["construct-the-read-work-request", "Construct the READ Work Request"], ["attach-b-s-remote-source", "Attach B's remote source"], ["submit-to-a-s-send-queue", "Submit to A's Send Queue"]]),
  "7.4": plan([["start-after-read-submission", "Start after READ submission"], ["inspect-the-captured-read-request", "Inspect the captured READ request"], ["check-source-access", "Check source access"]]),
  "7.5": plan([["start-after-source-access", "Start after source access"], ["inspect-the-captured-read-response", "Inspect the captured READ response"], ["place-returned-bytes", "Place returned bytes"]]),
  "7.6": plan([["start-after-response-placement", "Start after response placement"], ["poll-reader-cq", "Poll reader CQ"], ["inspect-verified-reader-memory", "Inspect verified reader memory"], ["signal-read-done", "Signal READ done"], ["inspect-source-cq", "Inspect source CQ"]]),
  "7.7": plan([["trace-read", "Trace READ"], ["trace-send", "Trace SEND"], ["trace-write", "Trace WRITE"], ["compare-operation-semantics", "Compare operation semantics"]]),
  "8.1": plan([
    ["show-the-captured-packet", "Locate the captured RoCEv2 packet"],
    ["identify-outer-network-headers", "Examine Ethernet and IP delivery"],
    ["examine-udp-encapsulation", "Examine UDP encapsulation"],
    ["identify-rdma-transport-header", "Identify the RDMA transport header and data"],
    ["explain-what-can-and-cannot-be-concluded", "Establish what this capture shows"],
  ]),
  "8.2": plan([["inspect-the-send-request-bth", "Inspect the SEND request BTH"], ["switch-to-the-ack-bth", "Switch to the ACK BTH"], ["interpret-destination-qpn", "Interpret destination QPN"], ["interpret-opcode-and-psn", "Interpret opcode and PSN"], ["compare-hexadecimal-and-decimal-representations", "Compare hexadecimal and decimal representations"]]),
  "8.3": plan([["inspect-write-extended-headers", "Inspect WRITE extended headers"], ["inspect-send-packet-structure", "Inspect SEND packet structure"], ["inspect-read-extended-headers", "Inspect READ extended headers"], ["compare-applicable-header-types", "Compare applicable header types"]]),
  "8.4": plan([
    ["compare-payload-carrying-packets", "Compare packets carrying application payload"],
    ["inspect-metadata-only-requests", "Inspect remote-memory metadata without payload"],
    ["compare-all-recorded-packet-forms", "Compare acknowledgements and all recorded packet forms"],
  ]),
  "8.5": plan([["introduce-a-conceptual-multi-packet-send", "Introduce a conceptual multi-packet SEND"], ["highlight-conceptual-packet-one", "Highlight conceptual packet one"], ["highlight-conceptual-packet-two", "Highlight conceptual packet two"], ["highlight-conceptual-packet-three", "Highlight conceptual packet three"], ["compare-the-small-captured-send", "Compare the small captured SEND"]]),
  "8.6": plan([["start-with-the-complete-conceptual-exchange", "Start with the complete conceptual exchange"], ["illustrate-a-missing-packet", "Illustrate a missing packet"], ["illustrate-transport-recovery", "Illustrate transport recovery"], ["inspect-receiver-not-ready", "Inspect receiver-not-ready"], ["inspect-remote-access-rejection", "Inspect remote-access rejection"], ["inspect-laboratory-retry-settings", "Inspect laboratory retry settings"]]),
  "8.7": plan([
    ["correlate-operation-and-remote-memory", "Correlate the operation and remote-memory values"],
    ["correlate-endpoint-context", "Correlate endpoint and sequencing context"],
    ["identify-local-only-values", "Identify values that remain local"],
    ["connect-complete-write-evidence-chain", "Connect the complete recorded WRITE evidence chain"],
  ]),
  "8.8": plan([["frame-the-send-investigation", "Frame the SEND investigation"], ["reveal-receive-instruction-evidence", "Reveal receive instruction evidence"], ["reveal-completion-and-verified-bytes", "Reveal completion and verified bytes"]]),
  "8.9": plan([["frame-the-write-investigation", "Frame the WRITE investigation"], ["reveal-writer-completion", "Reveal writer completion"], ["reveal-control-signal-and-target-poll", "Reveal control signal and target poll"], ["reveal-target-memory-evidence", "Reveal target memory evidence"]]),
  "8.10": plan([["frame-the-read-response-investigation", "Frame the READ-response investigation"], ["find-the-earlier-request", "Find the earlier request"], ["inspect-originating-read-work", "Inspect originating read work"], ["inspect-data-and-completion-evidence", "Inspect data and completion evidence"]]),
  "8.11": plan([["compare-the-host-memory-path", "Compare the host-memory path"], ["inspect-a-possible-gpu-memory-path", "Inspect a possible GPU-memory path"], ["inspect-fabric-congestion", "Inspect fabric congestion"]]),
  "8.12": plan([["objective", "Objective"], ["preparation", "Preparation"], ["submission", "Submission"], ["transport", "Transport"], ["application-observation", "Application observation"]]),
};

const instructionReferencesBySection: Record<string, Record<string, GuidedContentReference[]>> = {
  "1.2": {
    "show-program-stored-on-disk": [{ sectionId: "1.2", unitIndexes: [0] }],
    "start-the-first-process": [{ sectionId: "1.2", unitIndexes: [1, 2, 5, 7] }],
    "start-a-second-process": [{ sectionId: "1.2", unitIndexes: [5, 9, 10, 11] }],
    "demonstrate-shared-read-only-mappings": [{ sectionId: "1.2", unitIndexes: [8, 9] }],
    "introduce-demand-allocation": [{ sectionId: "1.2", unitIndexes: [12, 13] }],
    "touch-demand-memory-and-interpret": [{ sectionId: "1.2", unitIndexes: [12, 13] }],
  },
  "1.3": {
    "introduce-a-virtual-address": [{ sectionId: "1.3", unitIndexes: [1, 2] }],
    "resolve-first-process-translation": [{ sectionId: "1.3", unitIndexes: [3, 5, 6] }],
    "read-the-illustrative-byte": [{ sectionId: "1.3", unitIndexes: [1, 9, 10, 11] }],
    "introduce-second-process-same-address": [{ sectionId: "1.3", unitIndexes: [2] }, { sectionId: "1.2", unitIndexes: [9, 10, 11] }],
    "resolve-second-process-translation": [{ sectionId: "1.3", unitIndexes: [3, 6] }, { sectionId: "1.2", unitIndexes: [10, 11] }],
    "demonstrate-a-permitted-store": [{ sectionId: "1.3", unitIndexes: [1, 3] }],
    "demonstrate-a-rejected-store": [{ sectionId: "1.3", unitIndexes: [3, 7, 8] }],
  },
  "1.4": {
    "no-allocated-buffer": [{ sectionId: "1.4", unitIndexes: [0, 1, 2] }],
    "allocate-sixteen-bytes": [{ sectionId: "1.4", unitIndexes: [3, 4, 5] }],
    "write-hello-into-the-first-five-cells": [{ sectionId: "1.4", unitIndexes: [6, 7, 8, 9, 10] }],
    "highlight-capacity-versus-meaningful-data-length": [{ sectionId: "1.4", unitIndexes: [9, 11, 12, 13] }],
  },
  "1.5": {
    "original-buffer": [{ sectionId: "1.5", unitIndexes: [0, 1, 2] }],
    "create-a-second-reference": [{ sectionId: "1.5", unitIndexes: [5, 6] }],
    "modify-through-that-reference": [{ sectionId: "1.5", unitIndexes: [5, 6, 7] }],
    "create-an-independent-copy": [{ sectionId: "1.5", unitIndexes: [1, 2, 3] }],
    "modify-the-copy": [{ sectionId: "1.5", unitIndexes: [4, 7, 8] }],
  },
  "4.11": {
    "construct-an-unposted-work-request": [{ sectionId: "4.11", unitIndexes: [0, 1, 2, 3, 5] }],
    "attach-the-local-memory-description": [{ sectionId: "4.11", unitIndexes: [3, 4] }],
    "inspect-the-actual-send-construction-source": [{ sectionId: "4.11", unitIndexes: [6, 7, 8, 9] }],
  },
  "8.1": {
    "show-the-captured-packet": [{ sectionId: "8.1", unitIndexes: [0, 1, 2] }],
    "identify-outer-network-headers": [{ sectionId: "8.1", unitIndexes: [3, 4, 5, 6] }],
    "examine-udp-encapsulation": [{ sectionId: "8.1", unitIndexes: [6, 7, 8, 9, 10, 11, 12] }],
    "identify-rdma-transport-header": [{ sectionId: "8.1", unitIndexes: [13, 14, 15] }],
    "explain-what-can-and-cannot-be-concluded": [{ sectionId: "8.1", unitIndexes: [15, 16, 17, 18] }],
  },
  "8.4": {
    "compare-payload-carrying-packets": [{ sectionId: "8.4", unitIndexes: [0, 1, 5, 7, 9, 10] }],
    "inspect-metadata-only-requests": [{ sectionId: "8.4", unitIndexes: [2, 3, 12] }],
    "compare-all-recorded-packet-forms": [{ sectionId: "8.4", unitIndexes: [4, 6, 8, 11, 13, 14, 15] }],
  },
  "8.7": {
    "correlate-operation-and-remote-memory": [{ sectionId: "8.7", unitIndexes: [0, 1, 2, 4, 5, 7, 8, 9] }],
    "correlate-endpoint-context": [{ sectionId: "8.7", unitIndexes: [3, 6, 14, 15] }],
    "identify-local-only-values": [{ sectionId: "8.7", unitIndexes: [10, 11, 12, 13] }],
    "connect-complete-write-evidence-chain": [{ sectionId: "8.7", unitIndexes: [16, 17, 18] }],
  },
};


export function guidedStagesForSection(sectionId: string) {
  const stages = foundationGuidedStages[sectionId] || operationGuidedStages[sectionId] || plan([["inspect-the-concept", "Inspect the concept"]]);
  const references = instructionReferencesBySection[sectionId];
  if (!references) return stages;
  return stages.map((stage) => references[stage.id] ? { ...stage, instructionReferences: references[stage.id] } : stage);
}
