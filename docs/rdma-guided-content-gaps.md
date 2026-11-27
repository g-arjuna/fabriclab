# RDMA guided-stage content gaps

This document records exact places where the canonical Foundations V2 or Operations V2 text does not yet contain a complete stage-specific learner explanation required by the guided curriculum. The implementation must not silently invent replacement curriculum prose for these gaps. Current diagrams use concise state captions to describe what is visually shown, while the main explanation panel uses canonical authored units or exact cross-subsection canonical references.

## Foundations

### 1.2 — From a program on disk to a running process

**Gap:** The canonical text explains that some mapped pages need not be resident until accessed, but it does not explicitly narrate the two-process causal comparison needed at the final guided state: Process A touches its own demand-allocation range, only A's illustrative frame becomes populated, and Process C's corresponding range remains unpopulated because no access by C has been shown.

**Current canonical references used:** 1.2 units 13–14 (`It can create mappings...`, `Some mapped pages need not be resident...`).

**Needed authored explanation:** A beginner-visible explanation that demand population is caused by an access in a specific process context and does not automatically populate an independent process's merely similar virtual range.

### 1.3 — How the CPU finds a byte

**Gap:** The canonical subsection explains virtual addresses, MMU translation, permissions, faults and cache/logical-value caveats for one illustrative mapping, but it does not explicitly explain the guided comparison in which Process A and Process C use the same numerical virtual address `0x1002` and resolve it in different address-space contexts.

**Current canonical references used:** 1.3 units 2–4 and 6–9, plus exact earlier canonical cross-references from 1.2 units 10–12.

**Needed authored explanation:** A concise explanation that the numerical virtual address alone is insufficient; translation occurs in the active process address-space context, so the same number can denote different underlying memory in different processes.

**Gap:** The canonical text does not explicitly state the concrete observation for the illustrative load: the resolved byte at offset 2 is returned to the CPU/application as value `0x48` in this teaching example.

**Needed authored explanation:** A stage-specific explanation connecting load execution, translation, the memory-system byte value and the returned result without implying that translation itself copies the application payload.

### 1.5 — What does it mean to copy data?

**Gap:** The canonical text explains copy and reference semantics abstractly, but it does not narrate a continuous memory-history example in which a reference mutation changes the original HELLO buffer to XELLO before an independent copy is created. It therefore does not state that the independent copy must originate from the currently displayed XELLO source state rather than silently resetting to HELLO.

**Needed authored explanation:** A short continuous example or explicit example-boundary statement approved by the curriculum author. The implementation currently preserves memory continuity visually and uses canonical copy/reference explanation, but the exact narrative sequence is not present in canonical text.

### 4.11 — Work Requests: a description of work, not data

**Gap:** The canonical text accurately defines the WR, SGE and WR ID, but it does not explicitly tie the illustrative `addr 0x1000`, length 5 and LKEY `0x11` values back to the particular sixteen-byte HELLO buffer shown in the visual sequence.

**Needed authored explanation:** A sentence explaining that the SGE is a reference/description of the already registered source memory range, not a copy of the payload into the Work Request. The visual currently makes this relationship explicit through its memory link and state captions.

## Operations

### 8.4 — Count the bytes: buffer capacity, transfer length, padding and frame size

**Gap:** The canonical text explains capacity, SGE length, payload, padding and the READ-request distinction. It does not explicitly enumerate the six-packet comparison now used in the guided view: SEND request, SEND ACK, WRITE request, WRITE ACK, READ request and READ response, or the structural presence of AETH in acknowledgements and READ responses subject to the export's field-decoding limitation.

**Needed authored explanation:** A compact author-approved paragraph distinguishing payload-carrying packets, remote-memory-metadata requests without payload, transport acknowledgements without application payload, and READ responses returning requested bytes.

### 8.7 — A complete correlation: Python → WR → packet → memory → completion

**Gap:** The canonical text distinguishes transmitted and local fields, but it does not explicitly separate the destination-QPN and PSN configuration source lines from program logging statements in the compact endpoint-context grouping.

**Needed authored explanation:** A sentence clarifying which immutable helper source lines configure endpoint/transport sequencing state and which application lines merely print or log already prepared values.

## Maintainer guidance

If these gaps are filled in canonical content, reference the new authored units from `guidedStagePlans.ts` rather than embedding replacement prose in React components. Until then, the exact gaps above should remain visible in review artifacts rather than being hidden by generated course copy.
