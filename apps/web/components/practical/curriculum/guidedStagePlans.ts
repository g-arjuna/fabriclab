export type GuidedContentReference = {
  sectionId: string;
  blockIds: string[];
};

export type GuidedStageDefinition = {
  /** Stable persistence/correlation identifier. Never derive this from presentation text. */
  id: string;
  /** Human-presented stage name; editing this text does not alter stored progress. */
  label: string;
  /** Exact canonical content-block references, including cross-subsection references where the mechanism was authored earlier. */
  instructionReferences?: GuidedContentReference[];
  /** Exact authored observation blocks to present separately from the mechanism instruction. */
  observationReferences?: GuidedContentReference[];
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
  "8.12": plan([["review-the-complete-investigation-checklist", "Review the complete investigation checklist"]]),
};

function content(sectionId: string, ...blockIds: string[]): GuidedContentReference[] {
  return [{ sectionId, blockIds }];
}

const instructionReferencesBySection: Record<string, Record<string, GuidedContentReference[]>> = {
  "1.1": {
    "meet-the-physical-computer": content("1.1", "before-we-connect-two-computers", "a-typical-server-contains-processors"),
    "introduce-the-software-running-on-the-computer": content("1.1", "linux-is-software-running-on"),
    "follow-an-application-instruction": content("1.1", "a-typical-server-contains-processors", "linux-is-software-running-on"),
    "follow-a-kernel-instruction": content("1.1", "linux-is-software-running-on"),
  },
  "1.2": {
    "show-program-stored-on-disk": content("1.2", "a-python-script-or-a"),
    "start-the-first-process": content("1.2", "a-python-script-or-a", "the-operating-system-gives-a", "the-process-does-not-get"),
    "start-a-second-process": content("1.2", "the-operating-system-gives-a", "the-process-does-not-get"),
    "demonstrate-shared-read-only-mappings": content("1.2", "the-operating-system-gives-a", "the-process-does-not-get"),
    "introduce-demand-allocation": content("1.2", "the-process-does-not-get", "both-processes-have-a-virtual"),
    "touch-demand-memory-and-interpret": content("1.2", "now-process-a-accesses-a", "in-our-example-only-process"),
  },
  "1.3": {
    "introduce-a-virtual-address": content("1.3", "a-byte-is-eight-bits", "the-cpu-is-executing-a"),
    "resolve-first-process-translation": content("1.3", "a-byte-is-eight-bits", "for-this-illustration-suppose-a", "address-translation-identifies-frame-p7"),
    "read-the-illustrative-byte": content("1.3", "the-cpu-then-obtains-the", "the-load-returns-0x48-to", "the-cpu-normally-accesses-data"),
    "introduce-second-process-same-address": content("1.3", "process-a-executes-an-instruction", "a-virtual-address-is-interpreted"),
    "resolve-second-process-translation": content("1.3", "a-virtual-address-is-interpreted", "in-our-illustration-address-0x1000"),
    "demonstrate-a-permitted-store": content("1.3", "a-byte-is-eight-bits", "for-this-illustration-suppose-a"),
    "demonstrate-a-rejected-store": content("1.3", "a-byte-is-eight-bits", "for-this-illustration-suppose-a"),
  },
  "1.4": {
    "no-allocated-buffer": content("1.4", "suppose-our-program-wants-to"),
    "allocate-sixteen-bytes": content("1.4", "suppose-our-program-wants-to", "python-buf-bytearray-16-buf"),
    "write-hello-into-the-first-five-cells": content("1.4", "now-the-program-writes-five", "python-buf-bytearray-16-buf"),
    "highlight-capacity-versus-meaningful-data-length": content("1.4", "suppose-our-program-wants-to", "the-application-does-not-itself"),
  },
  "1.5": {
    "original-buffer": content("1.5", "our-original-sixteen-byte-buffer"),
    "create-a-second-reference": content("1.5", "we-create-a-second-reference"),
    "modify-through-that-reference": content("1.5", "using-the-second-reference-we", "reading-through-either-reference-returns"),
    "create-an-independent-copy": content("1.5", "now-we-allocate-a-different", "the-source-currently-contains-xello"),
    "modify-the-copy": content("1.5", "we-replace-x-with-y", "the-two-buffers-contain-independently", "a-reference-provides-another-way"),
  },
  "1.6": {
    "application-executes-in-user-mode": content("1.6", "applications-normally-execute-in-user"),
    "application-requests-a-kernel-service": content("1.6", "linux-provides-controlled-entry-points"),
    "cpu-executes-kernel-instructions": content("1.6", "linux-provides-controlled-entry-points"),
    "waiting-and-device-wakeup-are-separate": content("1.6", "the-kernel-can-also-run"),
    "control-returns-to-user-mode": content("1.6", "linux-provides-controlled-entry-points", "the-kernel-can-also-run"),
  },
  "1.7": {
    "compare-the-two-distinct-host-memory-systems": content("1.7", "we-can-finally-state-our", "server-a-cannot-access-server"),
  },
  "2.1": {
    "inspect-existing-processes-and-their-socket-handles": content("2.1", "consider-a-web-browser-an"),
    "create-the-python-tcp-socket": content("2.1", "a-socket-is-an-operating"),
    "show-the-kernel-managed-socket-object": content("2.1", "linux-provides-a-shared-networking", "a-socket-is-an-operating"),
    "distinguish-nic-port-tcp-port-and-file-descriptor": content("2.1", "consider-a-web-browser-an", "linux-provides-a-shared-networking", "a-socket-is-an-operating"),
  },
  "2.2": {
    "create-the-client-socket": content("2.2", "python-includes-a-standard-library", "python-import-socket-s-socket", "af-inet-selects-ipv4-addressing"),
    "create-the-listener-on-server-b": content("2.2", "we-need-two-cooperating-programs", "python-server-b-prepare-a"),
    "establish-the-connection": content("2.2", "python-server-b-prepare-a", "port-5001-is-an-arbitrary"),
    "identify-the-accepted-connected-socket": content("2.2", "we-need-two-cooperating-programs", "python-server-b-prepare-a", "port-5001-is-an-arbitrary"),
  },
  "2.3": {
    "start-with-distinct-listener-and-client-endpoints": content("2.3", "when-server-a-calls-connect"),
    "follow-the-recorded-syn": content("2.3", "when-server-a-calls-connect"),
    "follow-the-recorded-syn-ack": content("2.3", "when-server-a-calls-connect"),
    "follow-the-recorded-ack-and-established-state": content("2.3", "when-server-a-calls-connect", "python-conn-peer-listener-accept", "conn-is-the-socket-handle"),
  },
  "2.4": {
    "inspect-the-application-writes": content("2.4", "suppose-the-sender-writes-he"),
    "inspect-continuous-byte-stream-positions": content("2.4", "suppose-the-sender-writes-he"),
    "observe-one-valid-receive-chunking": content("2.4", "suppose-the-sender-writes-he"),
    "compare-another-valid-receive-chunking": content("2.4", "suppose-the-sender-writes-he", "the-application-must-decide-how"),
  },
  "2.5": {
    "prepare-the-application-send-buffer": content("2.5", "we-already-have-a-connected", "python-buf-bytearray-16-buf", "memoryview-buf-5-describes-the"),
    "submit-bytes-through-the-socket-interface": content("2.5", "we-already-have-a-connected", "python-buf-bytearray-16-buf", "memoryview-buf-5-describes-the"),
    "copy-bytes-into-kernel-managed-send-storage": content("2.5", "the-kernel-s-tcp-implementation"),
    "return-to-the-application-while-the-source-remains-unchanged": content("2.5", "we-already-have-a-connected", "the-kernel-s-tcp-implementation"),
  },
  "2.6": {
    "show-the-original-application-byte-range": content("2.6", "tcp-is-responsible-for-transferring", "our-hello-payload-may-fit"),
    "highlight-the-first-recorded-tcp-segment": content("2.6", "tcp-sends-portions-of-the", "our-hello-payload-may-fit"),
    "highlight-the-next-recorded-segment": content("2.6", "tcp-sends-portions-of-the", "our-hello-payload-may-fit"),
    "highlight-the-remaining-recorded-segment": content("2.6", "tcp-sends-portions-of-the", "our-hello-payload-may-fit"),
    "compare-segment-and-application-read-boundaries": content("2.6", "tcp-is-responsible-for-transferring", "tcp-sends-portions-of-the", "our-hello-payload-may-fit"),
  },
  "2.7": {
    "inspect-kernel-tcp-ip-and-driver-processing": content("2.7", "the-kernel-s-network-stack", "the-kernel-and-cpu-still"),
    "prepare-the-transmit-descriptor": content("2.7", "the-kernel-s-network-stack"),
    "nic-accesses-prepared-memory": content("2.7", "the-kernel-s-network-stack"),
    "transmit-the-ethernet-frame": content("2.7", "the-kernel-s-network-stack", "the-kernel-and-cpu-still"),
  },
  "2.8": {
    "receive-the-recorded-frame": content("2.8", "at-server-b-the-nic"),
    "place-bytes-in-kernel-receive-storage": content("2.8", "at-server-b-the-nic", "the-kernel-associates-available-bytes"),
    "inspect-the-socket-before-the-application-reads": content("2.8", "the-kernel-checks-and-interprets", "the-kernel-associates-available-bytes"),
    "contrast-a-conceptual-out-of-order-arrival": content("2.8", "the-kernel-checks-and-interprets", "the-kernel-associates-available-bytes"),
  },
  "2.9": {
    "start-with-bytes-waiting-in-kernel-receive-storage": content("2.9", "the-recv-method-belongs-to", "this-returns-a-new-python"),
    "read-the-first-available-bytes": content("2.9", "the-recv-method-belongs-to", "python-part-conn-recv-5", "this-returns-a-new-python"),
    "read-the-next-available-bytes": content("2.9", "for-our-visual-experiment-we", "python-buf-bytearray-5-received", "the-loop-is-required-because"),
    "read-the-remaining-bytes": content("2.9", "for-our-visual-experiment-we", "python-buf-bytearray-5-received", "the-loop-is-required-because"),
  },
  "2.10": {
    "inspect-the-receiver-reads-first-case": content("2.10", "if-the-receiver-calls-recv"),
    "release-the-sender-and-observe-the-blocked-receive-complete": content("2.10", "no-once-the-tcp-connection", "if-the-receiver-calls-recv"),
    "inspect-the-sender-sends-first-case": content("2.10", "no-once-the-tcp-connection"),
    "observe-unread-bytes-waiting-in-kernel-storage": content("2.10", "no-once-the-tcp-connection"),
    "compare-ordering-and-delivery-results": content("2.10", "no-once-the-tcp-connection", "if-the-receiver-calls-recv", "this-is-an-important-contrast"),
  },
  "2.11": {
    "inspect-same-machine-loopback": content("2.11", "the-socket-interface-also-works"),
    "inspect-two-machine-ethernet": content("2.11", "an-ordinary-tcp-connection-to"),
    "compare-the-software-and-physical-network-paths": content("2.11", "the-socket-interface-also-works", "an-ordinary-tcp-connection-to"),
  },
  "2.12": {
    "inspect-the-small-captured-transfer": content("2.12", "we-have-traced-our-five", "in-the-captured-small-transfer"),
    "inspect-the-large-captured-transfer": content("2.12", "in-the-larger-transfer-inspect"),
    "connect-packets-to-application-byte-ranges": content("2.12", "in-the-captured-small-transfer", "in-the-larger-transfer-inspect"),
    "establish-what-the-evidence-does-and-does-not-show": content("2.12", "we-have-traced-our-five", "now-consider-an-ai-or"),
  },
  "3.1": {
    "cpu-mediated-memory-operation": content("3.1", "we-saw-a-cpu-copy"),
    "cpu-prepares-device-work": content("3.1", "we-saw-a-cpu-copy", "dma-allows-a-suitably-configured"),
    "device-accesses-the-memory-system": content("3.1", "dma-allows-a-suitably-configured"),
    "destination-memory-changes": content("3.1", "dma-allows-a-suitably-configured"),
    "cpu-software-observes-the-result": content("3.1", "we-saw-a-cpu-copy", "dma-allows-a-suitably-configured"),
  },
  "3.2": {
    "introduce-the-application-virtual-address": content("3.2", "earlier-the-cpu-used-a"),
    "follow-cpu-mmu-translation": content("3.2", "earlier-the-cpu-used-a"),
    "reveal-the-device-visible-address-view": content("3.2", "earlier-the-cpu-used-a", "a-driver-and-operating-system"),
  },
  "3.3": {
    "follow-the-representative-tcp-memory-path": content("3.3", "our-tcp-data-path-already"),
    "follow-the-representative-hardware-rdma-path": content("3.3", "the-question-rdma-addresses-is"),
    "compare-instruction-control-payload-and-completion-paths": content("3.3", "the-question-rdma-addresses-is", "the-cpu-does-not-disappear"),
  },
  "3.4": {
    "preview-the-shared-memory-to-memory-objective": content("3.4", "remote-direct-memory-access-rdma", "rdma-still-needs-a-network"),
    "preview-send": content("3.4", "there-are-three-basic-operations"),
    "preview-write": content("3.4", "there-are-three-basic-operations"),
    "preview-read": content("3.4", "there-are-three-basic-operations", "rdma-still-needs-a-network"),
  },
  "3.5": {
    "establish-the-actual-rxe-software-path": content("3.5", "our-two-linux-lab-hosts", "the-application-does-not-call"),
    "compare-the-representative-hardware-rnic-path": content("3.5", "a-hardware-rdma-capable-nic"),
    "distinguish-software-transport-execution-from-hardware-transport-execution": content("3.5", "a-hardware-rdma-capable-nic", "our-two-linux-lab-hosts", "the-application-does-not-call"),
  },
  "3.6": {
    "prepare-memory-and-communication-resources": content("3.6", "with-a-tcp-socket-we", "the-next-lesson-builds-these"),
    "describe-work": content("3.6", "the-term-verbs-refers-to"),
    "submit-work-to-the-endpoint": content("3.6", "with-a-tcp-socket-we", "the-term-verbs-refers-to"),
    "observe-the-result": content("3.6", "with-a-tcp-socket-we", "the-term-verbs-refers-to", "the-next-lesson-builds-these"),
  },
  "4.1": {
    "existing-application-buffer": content("4.1", "return-to-our-16-byte"),
    "application-requests-registration": content("4.1", "we-need-to-establish-which"),
    "provider-establishes-registered-access": content("4.1", "we-need-to-establish-which", "in-a-conventional-hardware-registration"),
    "memory-region-metadata-appears": content("4.1", "we-need-to-establish-which", "in-a-conventional-hardware-registration"),
    "address-and-length-are-explained": content("4.1", "return-to-our-16-byte", "we-need-to-establish-which", "in-a-conventional-hardware-registration"),
    "permissions-and-keys-are-revealed": content("4.1", "we-need-to-establish-which", "in-a-conventional-hardware-registration"),
  },
  "4.2": {
    "application-asks-through-pyverbs": content("4.2", "our-python-program-asks-to"),
    "provider-and-protection-domain-establish-the-mr": content("4.2", "our-python-program-asks-to", "the-protection-domain-is-not", "the-program-supplies-the-pd"),
    "mr-is-returned-to-the-application": content("4.2", "the-program-supplies-the-pd"),
  },
  "4.3": {
    "inspect-the-registered-byte-range": content("4.3", "a-registration-describes-a-starting", "the-address-in-this-lesson"),
    "inspect-a-valid-bounded-range": content("4.3", "a-registration-describes-a-starting"),
    "inspect-a-boundary-crossing-range": content("4.3", "a-registration-describes-a-starting"),
    "explain-base-offset-length-and-end-exclusive-boundary": content("4.3", "a-registration-describes-a-starting", "the-address-in-this-lesson"),
  },
  "4.4": {
    "ordinary-cpu-memory-access": content("4.4", "the-words-local-and-remote"),
    "local-provider-write-access": content("4.4", "for-an-mr-local-write"),
    "remote-write-access": content("4.4", "remote-write-allows-an-authorized"),
    "remote-read-access": content("4.4", "remote-write-allows-an-authorized"),
    "compare-the-access-types": content("4.4", "the-words-local-and-remote", "for-an-mr-local-write", "remote-write-allows-an-authorized"),
  },
  "4.5": {
    "valid-local-registration-reference": content("4.5", "imagine-the-application-has-registered", "a-local-buffer-description-typically", "the-local-key-is-supplied"),
    "incorrect-local-key": content("4.5", "imagine-the-application-has-registered", "the-local-key-is-supplied"),
    "correct-key-but-invalid-requested-range": content("4.5", "imagine-the-application-has-registered", "a-local-buffer-description-typically"),
    "correct-association-and-applicable-permission": content("4.5", "imagine-the-application-has-registered", "a-local-buffer-description-typically", "the-local-key-is-supplied"),
  },
  "4.6": {
    "b-owns-a-registered-memory-region": content("4.6", "now-imagine-server-a-wants"),
    "b-shares-address-rkey-and-valid-length": content("4.6", "now-imagine-server-a-wants", "the-rkey-is-an-access"),
    "a-receives-the-remote-metadata": content("4.6", "now-imagine-server-a-wants", "the-rkey-is-an-access"),
    "a-constructs-the-relevant-memory-description": content("4.6", "server-a-uses-its-own"),
    "b-s-provider-validates-the-valid-illustrated-request": content("4.6", "server-a-uses-its-own", "the-rkey-is-an-access"),
    "inspect-an-incorrect-remote-key": content("4.6", "the-rkey-is-an-access"),
    "inspect-an-out-of-range-remote-request": content("4.6", "now-imagine-server-a-wants", "the-rkey-is-an-access"),
    "inspect-missing-remote-write-permission": content("4.6", "the-rkey-is-an-access"),
  },
  "4.7": {
    "inspect-send-setup-metadata": content("4.7", "rdma-memory-registration-is-local", "during-the-resource-and-send"),
    "preview-write-setup-metadata": content("4.7", "rdma-memory-registration-is-local", "during-the-resource-and-send"),
    "exchange-control-metadata": content("4.7", "rdma-memory-registration-is-local", "during-the-resource-and-send", "the-control-connection-carries-metadata"),
    "distinguish-control-metadata-from-rdma-payload-traffic": content("4.7", "the-control-connection-carries-metadata"),
  },
  "4.8": {
    "validate-a-correct-remote-read": content("4.8", "let-s-use-our-registered"),
    "reject-missing-remote-write-permission": content("4.8", "let-s-use-our-registered"),
    "reject-a-boundary-crossing-range": content("4.8", "let-s-use-our-registered"),
    "reject-an-incorrect-key": content("4.8", "let-s-use-our-registered"),
  },
  "4.9": {
    "move-from-illustrative-registration-to-recorded-registration": content("4.9", "we-now-have-enough-background"),
    "inspect-recorded-host-memory-region-metadata": content("4.9", "buffer-address-rdma-resources-hosta", "these-are-real-runtime-values"),
    "connect-the-values-to-immutable-source-lines": content("4.9", "these-are-real-runtime-values", "the-source-helper-used-by"),
  },
  "4.10": {
    "start-with-registered-memory-but-no-described-task": content("4.10", "the-application-now-has-registered", "consider-our-ordinary-tcp-example"),
    "describe-the-desired-task": content("4.10", "consider-our-ordinary-tcp-example", "the-application-needs-a-communication"),
  },
  "4.11": {
    "construct-an-unposted-work-request": content("4.11", "the-program-wants-the-provider", "constructing-the-instruction-does-not", "constructing-the-request-only-prepares"),
    "attach-the-local-memory-description": content("4.11", "recall-the-illustrative-sixteen-byte", "we-want-the-provider-to", "a-scatter-gather-element-or", "sge-field-illustrative-value-meaning"),
    "inspect-the-actual-send-construction-source": content("4.11", "constructing-the-request-only-prepares", "this-is-an-illustrative-logical", "in-the-actual-pyverbs-program", "do-not-imply-that-the", "keep-the-genuine-source-excerpt"),
  },
  "4.12": {
    "start-with-one-send-queue": content("4.12", "the-provider-may-execute-work"),
    "reveal-the-receive-queue": content("4.12", "for-incoming-ordinary-send-messages"),
    "form-a-queue-pair": content("4.12", "the-provider-may-execute-work", "for-incoming-ordinary-send-messages"),
  },
  "4.13": {
    "inspect-endpoint-metadata-exchange": content("4.13", "a-host-can-have-multiple", "in-our-lab-the-two"),
    "follow-destination-qpn-a-to-b": content("4.13", "consider-a-conceptual-a-endpoint"),
    "follow-destination-qpn-b-to-a": content("4.13", "consider-a-conceptual-a-endpoint"),
    "inspect-recorded-endpoint-setup": content("4.13", "consider-a-conceptual-a-endpoint", "in-our-lab-the-two"),
  },
  "4.14": {
    "post-signalled-work-conceptually": content("4.14", "submitting-work-does-not-by"),
    "provider-produces-a-completion": content("4.14", "submitting-work-does-not-by", "a-cq-is-created-separately"),
    "application-polls-the-completion-queue": content("4.14", "submitting-work-does-not-by", "a-cq-is-created-separately"),
    "inspect-the-resource-only-evidence-boundary": content("4.14", "we-can-now-explain-why", "in-the-next-practical-the"),
  },
  "5.1": {
    "locate-the-two-recorded-programs": content("5.1", "we-have-spent-the-first", "now-we-will-follow-two", "on-server-a-hosta-the"),
    "inspect-the-two-program-roles": content("5.1", "on-server-a-hosta-the", "there-are-two-conversations-between"),
    "locate-the-isolated-data-capture": content("5.1", "there-are-two-conversations-between", "we-will-follow-the-source"),
  },
  "5.2": {
    "start-before-resources-are-introduced": content("5.2", "before-either-program-can-transfer"),
    "open-device-and-create-resources": content("5.2", "before-either-program-can-transfer", "look-at-the-actual-setup"),
    "exchange-endpoint-metadata": content("5.2", "a-newly-created-qp-is", "the-numbers-here-belong-to"),
    "prepare-the-qps": content("5.2", "the-helper-configures-the-qps", "the-numbers-here-belong-to"),
  },
  "5.3": {
    "start-before-receive-work-is-described": content("5.3", "think-back-to-the-tcp", "rdma-send-uses-a-different"),
    "describe-receive-memory": content("5.3", "in-this-run-the-buffer", "the-program-constructs-an-sge"),
    "post-receive-work": content("5.3", "the-program-constructs-an-sge", "calling-qp-post-recv-rwr"),
    "tell-a-the-receiver-is-ready": content("5.3", "calling-qp-post-recv-rwr"),
  },
  "5.4": {
    "start-with-no-posted-receive": content("5.4", "suppose-a-submits-a-normal"),
    "try-send-with-no-receive": content("5.4", "suppose-a-submits-a-normal", "this-is-different-from-tcp"),
    "observe-the-receiver-not-ready-state": content("5.4", "this-is-different-from-tcp"),
    "prepare-receive-work": content("5.4", "in-fabriclab-s-actual-send", "there-is-another-separate-constraint"),
    "return-to-the-recorded-experiment": content("5.4", "in-fabriclab-s-actual-send"),
  },
  "5.5": {
    "start-with-prepared-endpoints": content("5.5", "now-the-receiving-side-is"),
    "write-bytes-into-a-s-buffer": content("5.5", "now-the-receiving-side-is", "do-not-confuse-this-call"),
    "construct-the-send-instruction": content("5.5", "the-sender-s-sge-identifies"),
    "submit-to-the-send-queue": content("5.5", "finally-qp-post-send-swr"),
  },
  "5.6": {
    "start-after-send-submission": content("5.6", "the-provider-now-has-an"),
    "inspect-the-captured-send-packet": content("5.6", "on-the-network-we-no", "the-transport-opcode-says-that"),
    "follow-placement-at-b": content("5.6", "on-b-the-provider-identifies"),
  },
  "5.7": {
    "start-with-packet-exchange-complete": content("5.7", "we-chose-reliable-connected-transport", "a-completion-is-a-different"),
    "inspect-the-reverse-ack": content("5.7", "we-chose-reliable-connected-transport"),
    "observe-a-s-completion": content("5.7", "a-completion-is-a-different", "a-successful-send-completion-in"),
    "observe-b-s-completion": content("5.7", "a-completion-is-a-different", "a-successful-send-completion-in"),
  },
  "5.8": {
    "start-before-application-memory-verification": content("5.8", "b-s-application-has-now"),
    "read-the-received-bytes": content("5.8", "b-s-application-has-now", "the-actual-source-uses-bytes"),
    "inspect-verified-receiver-memory": content("5.8", "the-actual-source-uses-bytes", "our-evidence-shows-a-50", "we-now-have-several-complementary"),
    "compare-with-tcp": content("5.8", "our-evidence-shows-a-50", "we-now-have-several-complementary"),
  },
  "5.9": {
    "reconstruct-resources": content("5.9", "before-moving-on-see-if"),
    "reconstruct-receive-readiness": content("5.9", "before-moving-on-see-if"),
    "reconstruct-submission": content("5.9", "before-moving-on-see-if"),
    "reconstruct-packet-and-completion-evidence": content("5.9", "before-moving-on-see-if", "now-imagine-you-only-have"),
  },
  "6.1": {
    "recall-send-destination-selection": content("6.1", "in-the-preceding-experiment-b"),
    "compare-ordinary-write-destination-selection": content("6.1", "what-if-the-two-applications", "the-word-ordinary-is-important", "one-sided-does-not-mean"),
    "open-the-recorded-write-experiment": content("6.1", "we-will-compare-the-same"),
  },
  "6.2": {
    "start-before-target-metadata-is-shared": content("6.2", "the-actual-write-program-exp"),
    "inspect-target-before": content("6.2", "the-actual-write-program-exp", "b-records-the-first-64"),
    "share-destination-information": content("6.2", "during-the-tcp-metadata-exchange"),
    "prepare-endpoints-and-signal-readiness": content("6.2", "the-programs-then-prepare-their"),
  },
  "6.3": {
    "start-with-an-empty-local-source": content("6.3", "a-already-has-registered-local"),
    "fill-a-s-source-buffer": content("6.3", "mr-write-puts-the-message", "the-message-is-53-bytes"),
    "describe-local-source-memory": content("6.3", "a-constructs-the-sge-using"),
    "construct-the-write-work-request": content("6.3", "a-constructs-a-sendwr-containing"),
    "attach-the-remote-destination": content("6.3", "a-calls-swr-set-wr", "python-swr-set-wr-rdma", "the-remote-key-and-address", "the-wr-id-is-local"),
    "submit-the-completed-work-request": content("6.3", "a-calls-qp-post-send", "constructing-the-sendwr-prepares-the"),
  },
  "6.4": {
    "start-after-write-submission": content("6.4", "the-provider-on-a-has"),
    "inspect-the-write-request": content("6.4", "the-provider-on-a-has", "reth-identifies-the-remote-virtual", "the-captured-write-fits-in"),
    "check-target-access": content("6.4", "reth-identifies-the-remote-virtual"),
    "follow-target-placement": content("6.4", "after-these-checks-the-target", "the-captured-write-fits-in"),
  },
  "6.5": {
    "start-with-the-request-on-the-wire": content("6.5", "b-sends-a-transport-acknowledgement"),
    "inspect-the-ack": content("6.5", "b-sends-a-transport-acknowledgement"),
    "poll-writer-cq": content("6.5", "a-polls-its-cq-the"),
    "observe-write-complete": content("6.5", "a-polls-its-cq-the", "it-does-not-establish-that", "this-distinction-is-easy-to"),
  },
  "6.6": {
    "consider-the-target-completion-question": content("6.6", "in-the-send-experiment-b", "before-continuing-consider-whether-b", "the-memory-being-updated-and"),
    "follow-the-synchronization-signal": content("6.6", "a-observes-successful-completion-of"),
    "poll-b-s-cq": content("6.6", "after-receiving-that-control-message"),
    "reveal-the-recorded-target-observation": content("6.6", "the-recorded-poll-returned-zero", "the-target-memory-may-have", "b-could-have-unrelated-cq"),
  },
  "6.7": {
    "start-before-target-memory-verification": content("6.7", "now-look-at-b-s", "the-control-message-does-not"),
    "inspect-before-and-after": content("6.7", "now-look-at-b-s", "the-before-event-contains-the"),
    "verify-exact-target-bytes": content("6.7", "the-actual-program-reads-exactly", "the-before-event-contains-the"),
  },
  "6.8": {
    "compare-ordinary-write": content("6.8", "we-have-now-seen-two", "in-ordinary-write-a-names"),
    "compare-send": content("6.8", "we-have-now-seen-two", "in-send-b-chooses-where"),
    "inspect-write-with-immediate-conceptually": content("6.8", "there-are-other-ways-for"),
    "review-operation-selection": content("6.8", "in-send-b-chooses-where", "in-ordinary-write-a-names", "for-this-lesson-remember-the"),
  },
  "7.1": {
    "inspect-the-application-request-reply-problem": content("7.1", "in-send-and-write-a"),
    "compare-application-request-reply": content("7.1", "one-possible-design-is-to"),
    "choose-rdma-read": content("7.1", "one-possible-design-is-to", "this-gives-us-four-separate", "the-distinction-matters-because-the"),
    "open-the-recorded-read-experiment": content("7.1", "this-gives-us-four-separate", "the-distinction-matters-because-the"),
  },
  "7.2": {
    "start-before-read-metadata-is-shared": content("7.2", "our-actual-program-is-exp", "on-a-the-reader-allocates"),
    "inspect-b-s-source": content("7.2", "our-actual-program-is-exp"),
    "prepare-a-s-destination": content("7.2", "on-a-the-reader-allocates"),
    "exchange-source-metadata": content("7.2", "b-shares-the-remote-address"),
    "confirm-readiness": content("7.2", "the-programs-prepare-their-qps"),
  },
  "7.3": {
    "start-with-prepared-endpoints": content("7.3", "a-will-initiate-a-read", "the-name-sendwr-may-seem", "the-send-queue-is-the"),
    "describe-a-s-local-destination": content("7.3", "a-s-sge-identifies-its"),
    "construct-the-read-work-request": content("7.3", "a-creates-the-sendwr-with"),
    "attach-b-s-remote-source": content("7.3", "a-supplies-b-s-previously"),
    "submit-to-a-s-send-queue": content("7.3", "a-calls-post-send-because", "once-a-calls-qp-post"),
  },
  "7.4": {
    "start-after-read-submission": content("7.4", "the-first-captured-read-packet", "this-packet-is-unlike-the"),
    "inspect-the-captured-read-request": content("7.4", "the-first-captured-read-packet", "this-packet-is-unlike-the"),
    "check-source-access": content("7.4", "at-b-the-provider-uses", "b-does-not-have-to"),
  },
  "7.5": {
    "start-after-source-access": content("7.5", "the-second-packet-in-our", "it-carries-the-data-requested"),
    "inspect-the-captured-read-response": content("7.5", "the-second-packet-in-our", "it-carries-the-data-requested"),
    "place-returned-bytes": content("7.5", "the-provider-places-the-data", "a-read-does-not-mean"),
  },
  "7.6": {
    "start-after-response-placement": content("7.6", "a-polls-its-cq-and"),
    "poll-reader-cq": content("7.6", "a-polls-its-cq-and"),
    "inspect-verified-reader-memory": content("7.6", "only-after-observing-completion-does"),
    "signal-read-done": content("7.6", "the-actual-program-makes-this"),
    "inspect-source-cq": content("7.6", "now-consider-b-s-application", "the-actual-program-makes-this"),
  },
  "7.7": {
    "trace-read": content("7.7", "for-ordinary-send-a-supplies", "the-transport-uses-endpoint-context"),
    "trace-send": content("7.7", "for-ordinary-send-a-supplies"),
    "trace-write": content("7.7", "for-ordinary-send-a-supplies"),
    "compare-operation-semantics": content("7.7", "we-can-now-describe-the", "for-ordinary-send-a-supplies", "the-transport-uses-endpoint-context", "none-of-these-facts-tells"),
  },
  "8.1": {
    "show-the-captured-packet": content("8.1", "we-have-followed-three-real", "we-will-use-fabriclab-s"),
    "identify-outer-network-headers": content("8.1", "start-with-the-familiar-part"),
    "examine-udp-encapsulation": content("8.1", "udp-is-not-providing-the", "a-network-device-that-forwards"),
    "identify-rdma-transport-header": content("8.1", "udp-is-not-providing-the", "a-network-device-that-forwards"),
    "explain-what-can-and-cannot-be-concluded": content("8.1", "we-have-followed-three-real", "a-network-device-that-forwards", "we-will-use-fabriclab-s"),
  },
  "8.2": {
    "inspect-the-send-request-bth": content("8.2", "immediately-after-the-udp-header", "start-with-the-destination-qpn", "the-opcode-tells-the-transport", "the-psn-is-a-24"),
    "switch-to-the-ack-bth": content("8.2", "immediately-after-the-udp-header", "start-with-the-destination-qpn", "the-psn-is-a-24"),
    "interpret-destination-qpn": content("8.2", "start-with-the-destination-qpn"),
    "interpret-opcode-and-psn": content("8.2", "the-opcode-tells-the-transport", "the-psn-is-a-24"),
    "compare-hexadecimal-and-decimal-representations": content("8.2", "start-with-the-destination-qpn", "the-psn-is-a-24"),
  },
  "8.3": {
    "inspect-write-extended-headers": content("8.3", "compare-a-send-request-with", "a-write-needs-to-identify"),
    "inspect-send-packet-structure": content("8.3", "compare-a-send-request-with", "a-send-request-does-not"),
    "inspect-read-extended-headers": content("8.3", "an-rdma-read-request-also"),
    "compare-applicable-header-types": content("8.3", "compare-a-send-request-with", "a-write-needs-to-identify", "an-rdma-read-request-also", "a-send-request-does-not"),
  },
  "8.4": {
    "compare-payload-carrying-packets": content("8.4", "earlier-we-saw-a-4", "the-registered-length-bounds-memory", "not-every-packet-associated-with", "our-send-and-ordinary-write", "roce-transport-may-add-padding", "when-you-compare-a-captured"),
    "inspect-metadata-only-requests": content("8.4", "not-every-packet-associated-with", "the-read-request-also-contains", "registered-capacity-operation-transfer-length"),
    "compare-all-recorded-packet-forms": content("8.4", "not-every-packet-associated-with", "our-send-and-ordinary-write", "the-read-request-also-contains", "the-reverse-acknowledgements-for-send", "recorded-packet-application-bytes-padding", "all-lengths-are-in-bytes", "these-values-are-reference-run"),
  },
  "8.5": {
    "introduce-a-conceptual-multi-packet-send": content("8.5", "our-actual-messages-are-deliberately", "the-transport-needs-to-respect", "our-small-reference-runs-do"),
    "highlight-conceptual-packet-one": content("8.5", "the-transport-needs-to-respect", "here-is-where-the-tcp"),
    "highlight-conceptual-packet-two": content("8.5", "the-transport-needs-to-respect", "here-is-where-the-tcp"),
    "highlight-conceptual-packet-three": content("8.5", "the-transport-needs-to-respect", "here-is-where-the-tcp"),
    "compare-the-small-captured-send": content("8.5", "our-actual-messages-are-deliberately", "here-is-where-the-tcp", "our-small-reference-runs-do"),
  },
  "8.6": {
    "start-with-the-complete-conceptual-exchange": content("8.6", "udp-encapsulation-does-not-make", "we-should-therefore-not-jump"),
    "illustrate-a-missing-packet": content("8.6", "imagine-that-one-packet-of"),
    "illustrate-transport-recovery": content("8.6", "udp-encapsulation-does-not-make", "imagine-that-one-packet-of"),
    "inspect-receiver-not-ready": content("8.6", "there-is-another-kind-of"),
    "inspect-remote-access-rejection": content("8.6", "there-is-another-kind-of", "we-should-therefore-not-jump"),
    "inspect-laboratory-retry-settings": content("8.6", "udp-encapsulation-does-not-make", "we-should-therefore-not-jump"),
  },
  "8.7": {
    "correlate-operation-and-remote-memory": content("8.7", "let-us-put-everything-together", "look-at-the-corresponding-captured", "some-packet-fields-come-from", "text-work-request-operation-local"),
    "correlate-endpoint-context": content("8.7", "some-packet-fields-come-from", "when-the-program-prepares-its", "these-values-establish-communication-and", "python-attr-dest-qp-num", "contrast-this-with", "python-log-emit-qp-ready", "text-work-request-operation-local"),
    "identify-local-only-values": content("8.7", "some-packet-fields-come-from", "text-work-request-operation-local", "other-fields-are-local-a"),
    "connect-complete-write-evidence-chain": content("8.7", "let-us-put-everything-together", "look-at-the-corresponding-captured", "we-can-follow-the-request"),
  },
  "8.8": {
    "frame-the-send-investigation": content("8.8", "imagine-you-are-investigating-a", "we-will-ask-you-to"),
    "reveal-receive-instruction-evidence": content("8.8", "imagine-you-are-investigating-a", "we-will-ask-you-to"),
    "reveal-completion-and-verified-bytes": content("8.8", "imagine-you-are-investigating-a", "we-will-ask-you-to"),
  },
  "8.9": {
    "frame-the-write-investigation": content("8.9", "a-network-engineer-may-see", "look-at-the-actual-write"),
    "reveal-writer-completion": content("8.9", "a-network-engineer-may-see", "look-at-the-actual-write"),
    "reveal-control-signal-and-target-poll": content("8.9", "a-network-engineer-may-see", "look-at-the-actual-write"),
    "reveal-target-memory-evidence": content("8.9", "a-network-engineer-may-see", "look-at-the-actual-write"),
  },
  "8.10": {
    "frame-the-read-response-investigation": content("8.10", "this-time-begin-with-a", "consider-the-four-roles-we"),
    "find-the-earlier-request": content("8.10", "this-time-begin-with-a", "consider-the-four-roles-we"),
    "inspect-originating-read-work": content("8.10", "this-time-begin-with-a", "consider-the-four-roles-we"),
    "inspect-data-and-completion-evidence": content("8.10", "this-time-begin-with-a", "consider-the-four-roles-we"),
  },
  "8.11": {
    "compare-the-host-memory-path": content("8.11", "so-far-we-have-used", "the-application-may-use-a"),
    "inspect-a-possible-gpu-memory-path": content("8.11", "the-application-may-use-a", "in-a-hardware-supported-gpudirect"),
    "inspect-fabric-congestion": content("8.11", "a-real-cluster-has-many", "when-someone-tells-you-an"),
  },
  "8.12": {
    "review-the-complete-investigation-checklist": content("8.12", "we-began-by-looking-at", "you-do-not-need-to", "first-establish-the-application-objective", "a-missing-observation-is-not"),
  },
};


const observationReferencesBySection: Record<string, Record<string, GuidedContentReference[]>> = {
  "1.2": {
    "touch-demand-memory-and-interpret": content("1.2", "a-s-illustrated-mapping-is", "demand-allocation-is-associated-with"),
  },
  "1.3": {
    "read-the-illustrative-byte": content("1.3", "address-translation-did-not-copy", "the-diagram-shows-logical-values"),
    "resolve-second-process-translation": content("1.3", "the-numerical-address-has-not", "this-is-one-reason-separate"),
  },
  "4.11": {
    "attach-the-local-memory-description": content("4.11", "the-provider-can-use-this", "constructing-the-instruction-does-not"),
  },
  "8.4": {
    "compare-all-recorded-packet-forms": content("8.4", "the-recorded-acknowledgement-packets-and", "transport-headers-integrity-fields-and", "registered-capacity-operation-transfer-length"),
  },
  "8.7": {
    "correlate-endpoint-context": content("8.7", "the-helper-configures-endpoint-and", "the-captured-write-packet-s", "in-this-particular-reference-exchange"),
    "identify-local-only-values": content("8.7", "the-local-wr-id-is"),
  },
};

export function guidedStagesForSection(sectionId: string) {
  const stages = foundationGuidedStages[sectionId] || operationGuidedStages[sectionId] || plan([["inspect-the-concept", "Inspect the concept"]]);
  const references = instructionReferencesBySection[sectionId];
  if (!references) return stages;
  return stages.map((stage) => ({ ...stage, instructionReferences: references[stage.id], observationReferences: observationReferencesBySection[sectionId]?.[stage.id] }));
}
