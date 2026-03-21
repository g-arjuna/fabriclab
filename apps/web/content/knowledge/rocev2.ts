import type { KnowledgeConcept } from '@/types'

export const rocev2Concepts: KnowledgeConcept[] = [
  {
    id: 'rocev2',
    title: 'RoCEv2 overview',
    summary: 'RDMA over Converged Ethernet v2 — GPU-to-GPU RDMA over standard IP/UDP, enabling sub-2 microsecond latency at 400Gb/s without CPU involvement.',
    relatedCommands: ['show roce', 'rdma link show', 'show interface counters'],
    relatedConcepts: ['pfc', 'ecn'],
    content: `## What RoCEv2 is

RoCEv2 encapsulates InfiniBand transport packets inside UDP/IP, making RDMA
routable over standard Ethernet infrastructure.

Frame format:
  Ethernet → IP → UDP (port 4791) → IB BTH → RDMA Payload

## Why it needs a lossless fabric

RDMA queue pairs have a timeout. A dropped packet causes the QP to enter an
error state and retransmit the entire message. At 400Gb/s, one retransmit
stalls a GPU training step for milliseconds. Multiplied across a 256-GPU
AllReduce, this destroys training throughput.

Lossless delivery is achieved via PFC or ECN — or both together.

## GPUDirect RDMA

In DGX deployments, the ConnectX NIC DMA's tensor data directly from GPU
HBM memory. The CPU is not involved in the data path. This enables the full
400Gb/s bandwidth with sub-2 microsecond latency.

## MTU requirement

RoCEv2 requires jumbo frames (MTU 9000) end to end. An MTU mismatch anywhere
in the path causes silent fragmentation. Always verify: ip link show eth0
should show MTU 9000.`,
  },
  {
    id: 'rdma-qp',
    title: 'RDMA queue pairs',
    summary: 'The fundamental RDMA communication channel — a pair of hardware queues managed entirely by the NIC with no CPU involvement in the data path.',
    relatedCommands: ['rdma link show'],
    relatedConcepts: ['rocev2'],
    content: `## Queue pair basics

An RDMA Queue Pair consists of:
  Send Queue (SQ) — application posts Work Requests here
  Receive Queue (RQ) — incoming messages land here
  Completion Queue (CQ) — completions posted here, application polls this

The NIC processes Work Requests autonomously. The CPU posts requests and polls
completions — it does not touch the actual data in flight.

## Why RC QPs require lossless

RoCEv2 training traffic uses RC (Reliable Connected) QPs which guarantee
in-order delivery. A single dropped packet causes the QP to enter error
state — this is why lossless fabric is non-negotiable for RoCEv2 workloads.`,
  },
]
