import type { KnowledgeConcept } from '@/types'

export const rocev2Concepts: KnowledgeConcept[] = [
  {
    id: 'rocev2',
    title: 'RoCEv2 overview',
    summary: 'RDMA over Converged Ethernet v2 — GPU-to-GPU RDMA over standard IP/UDP, enabling sub-2µs latency at 400Gb/s without CPU involvement.',
    relatedCommands: ['show roce', 'rdma link show', 'show interface counters'],
    relatedConcepts: ['pfc', 'ecn', 'rdma-qp'],
    content: `## What RoCEv2 is

RoCEv2 encapsulates InfiniBand transport packets inside UDP/IP, making RDMA
routable over standard Ethernet infrastructure.

Frame format:
  Ethernet → IP → UDP (port **4791**) → IB BTH → RDMA Payload

## Why it needs a lossless fabric

RDMA queue pairs use RC (Reliable Connected) transport which guarantees
in-order delivery. A single dropped packet causes the QP to enter error
state and retransmit the entire message.

At 400Gb/s, one retransmit stalls a GPU training step for milliseconds.
Multiplied across a 256-GPU AllReduce, this destroys training throughput.

Lossless delivery is achieved via PFC (backstop) + ECN (rate control).

## GPUDirect RDMA

In DGX deployments, the ConnectX NIC DMA's tensor data directly from GPU
HBM memory. The CPU is not involved in the data path. This enables the full
400Gb/s bandwidth with sub-2 microsecond latency.

Path: GPU HBM → NVLink → NIC DMA → wire (no CPU copy)

## MTU requirement

RoCEv2 requires jumbo frames (MTU **9000**) end to end. An MTU mismatch
anywhere in the path causes silent fragmentation that looks like drops.

## DSCP marking

RoCEv2 traffic must be marked DSCP 26. Switches map DSCP 26 → priority class 3
for PFC and ETS queue treatment.`,
  },
  {
    id: 'rdma-qp',
    title: 'RDMA queue pairs (QP)',
    summary: 'The fundamental RDMA communication channel — hardware queues on the NIC that send and receive data with no CPU involvement in the data path.',
    relatedCommands: ['rdma link show', 'ibstat'],
    relatedConcepts: ['rocev2'],
    content: `## Queue pair structure

An RDMA Queue Pair consists of:
  **Send Queue (SQ)** — application posts Work Queue Entries (WQEs) here
  **Receive Queue (RQ)** — incoming messages land here
  **Completion Queue (CQ)** — completions posted here, application polls

The NIC processes WQEs autonomously. The CPU posts requests and polls
completions — it does not touch the actual data in flight.

## RC vs UD transport

| Type | Reliability | Use in DGX |
|---|---|---|
| RC (Reliable Connected) | In-order, reliable | AllReduce, point-to-point |
| UD (Unreliable Datagram) | Best-effort | Multicast, small messages |

AllReduce uses RC QPs — hence the requirement for lossless fabric.

## QP error state

When a packet is dropped, the RC QP enters error state. Recovery requires:
1. Application detects QP error (timeout or completion error)
2. Repost all in-flight WQEs
3. Reset QP to RTS state
4. Resume transmission

This recovery adds milliseconds of latency — catastrophic in an AllReduce barrier.`,
  },
  {
    id: 'infiniband-vs-roce',
    title: 'InfiniBand vs RoCEv2',
    summary: 'Two RDMA fabrics used in AI clusters — IB uses a lossless switched network with centralised Subnet Manager; RoCEv2 runs RDMA over standard Ethernet with ECN+PFC for lossless delivery.',
    relatedCommands: ['ibstat', 'show roce'],
    relatedConcepts: ['rocev2', 'rdma-qp'],
    content: `## InfiniBand (IB)

- Native lossless transport — credit-based flow control at hardware level
- Centralised Subnet Manager (SM) manages routing, path records, LID assignment
- Lower latency than RoCEv2 (~1µs vs ~1.5-2µs at 400G)
- NVIDIA QM9700 switch, NDR 400G, uses IB mode ConnectX-7
- SHARP in-network reduction: AllReduce computed in switches, not endpoints
- UFM manages the IB fabric (SM + topology + counters)

## RoCEv2 (Spectrum-X fabric)

- RDMA over Ethernet — UDP port 4791, standard IP routing
- Lossless via ECN (rate control) + PFC (backstop)
- ConnectX-7 in Ethernet mode, SN5600 (Spectrum-X) switch
- More flexible routing — any ECMP-capable Ethernet switch can route RoCEv2
- Standard Grafana/Prometheus monitoring stack applies

## DGX H100 can run either

ConnectX-7 HCAs support both IB and Ethernet mode (firmware selectable).
DGX BasePOD ships with either QM9700 (IB) or SN5600 (RoCEv2/Spectrum-X).
The choice affects monitoring tools, congestion control approach, and
routing architecture.`,
  },
  {
    id: 'allreduce',
    title: 'AllReduce — the core collective',
    summary: 'The synchronisation barrier at the heart of distributed training — every GPU must send and receive every parameter gradient before any GPU can update its weights.',
    relatedCommands: ['nccl-debug --transport', 'run nccl-tests'],
    relatedConcepts: ['rocev2', 'nccl'],
    content: `## What AllReduce does

In data-parallel training, each GPU holds a replica of the full model.
After each forward+backward pass, each GPU has computed gradients for
its mini-batch. AllReduce sums these gradients across all GPUs, then
distributes the result back to every GPU.

After AllReduce: every GPU has the same summed gradient.
All GPUs then apply the same parameter update → replicas stay in sync.

## Ring-AllReduce algorithm (used by NCCL)

1. Divide parameters into N chunks (N = GPU count)
2. Ring scatter-reduce: each GPU sends one chunk, receives one chunk, N times
3. Ring all-gather: each GPU receives the reduced chunks from all others

Cost = 2 × (N-1)/N × message_size × (1/bandwidth)

## Why the fabric bottleneck is AllReduce latency

AllReduce is synchronous — the training step cannot proceed until all GPUs
have completed the operation. The slowest GPU (the straggler) determines
step time for the entire job.

A 12% AllReduce slowdown on one GPU = 12% throughput reduction for all GPUs.
1 marginal connector → 12% slower training → significant cost at scale.

## busbw — how to measure

    run nccl-tests   → reports busbw (bus bandwidth per GPU)

Expected ~146 GB/s for 128 GPUs over RoCEv2. Drop to ~3 GB/s = TCP fallback.`,
  },
  {
    id: 'nccl',
    title: 'NCCL — NVIDIA Collective Communications Library',
    summary: 'The library that implements AllReduce, AllGather, and other collectives over RoCEv2 or InfiniBand — sits between the training framework and the fabric.',
    relatedCommands: ['nccl-debug --transport', 'show nccl env', 'run nccl-tests', 'set nccl ib-hca'],
    relatedConcepts: ['allreduce', 'rocev2'],
    content: `## NCCL's role

NCCL sits between PyTorch/JAX/TensorFlow and the RDMA fabric.
Training framework calls nccl.allreduce() → NCCL selects transport and
algorithm → ConnectX NIC executes RDMA operations.

## Transport selection

NCCL auto-selects transport in priority order:
1. **NVLink** (intra-node, fastest — ~900 GB/s per GPU)
2. **Net/RDMA** (inter-node, ~400 Gbps per NIC — correct)
3. **Socket/TCP** (fallback if RDMA unavailable — ~3 GB/s)

If NCCL falls back to socket, busbw drops from ~146 GB/s to ~3 GB/s.

## Critical environment variables

| Variable | Purpose | Correct value |
|---|---|---|
| NCCL_IB_HCA | Which HCAs to use for RDMA | mlx5_0,...,mlx5_7 |
| NCCL_SOCKET_IFNAME | Which NIC for coordination | eno1 (management) |
| NCCL_DEBUG | Verbosity | VERSION (production) or INFO (debug) |
| NCCL_ALGO | Ring/Tree/DoubleTree | Leave auto unless tuning |

## Lab 5 fault

NCCL_IB_HCA=mlx5_bond_0 → device doesn't exist → RDMA device list empty
→ NCCL falls back to socket transport → busbw = 0.1 GB/s instead of ~146 GB/s.`,
  },
  {
    id: 'gpudirect',
    title: 'GPUDirect RDMA and Storage',
    summary: 'NVIDIA technology allowing NICs and storage controllers to DMA data directly to/from GPU HBM — bypassing CPU and host DRAM entirely.',
    relatedCommands: ['rdma link show'],
    relatedConcepts: ['rocev2'],
    content: `## GPUDirect RDMA

Without GPUDirect:
  GPU HBM → cudaMemcpy → host DRAM → NIC DMA → wire (2 copies, CPU involved)

With GPUDirect RDMA:
  GPU HBM → NIC DMA → wire (0 copies, CPU not in data path)

Enabled automatically when ConnectX NIC detects peer RDMA to a CUDA device.
Requires: nvidia-peermem kernel module + supported CUDA version.

## GPUDirect Storage (GDS)

Extends the concept to NVMe storage. The DPU (BlueField-3) handles NVMe-oF
traffic and DMA's directly to GPU HBM for checkpoint saves/loads.

Without GDS: NVMe data → host DRAM → GPU HBM (2 hops, ~31.5 GB/s PCIe ceiling)
With GDS:    NVMe data → GPU HBM directly via DPU DMA (800 Gbps storage BW)

## Why the DPU, not the ConnectX-7

Each DGX H100 has 2× BlueField-3 DPUs (2× 400G = 800 Gbps storage BW).
The DPU runs its own ARM cores + NVMe-oF target. The ConnectX-7 handles
compute fabric (AllReduce). Separation prevents storage traffic from
competing with training traffic on the same NIC.`,
  },
]
