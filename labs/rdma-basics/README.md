# RDMA basics: verified Soft-RoCE practical lab

This lab is a small, executable reference implementation of RDMA verbs. Two
isolated Ubuntu guests communicate over RoCEv2 using the Linux software RXE
transport (`rdma_rxe`), rdma-core, and Pyverbs. It demonstrates resource
creation, RC queue-pair setup, SEND/RECEIVE, RDMA WRITE, and RDMA READ, with
packet captures from the data plane.

Soft-RoCE is a software implementation of the RDMA transport. It is useful for
learning verbs, headers, queue-pair state, memory registration, and packet
flow. It is **not** a hardware RNIC and must not be used to infer ConnectX or
Spectrum-X performance, offload behaviour, congestion-control behaviour, or
line-rate characteristics.

## Architecture

```text
HOST A (KVM/QEMU guest)             HOST B (KVM/QEMU guest)
10.10.10.1 data0                    10.10.10.2 data0
192.168.100.1 ctrl0                 192.168.100.2 ctrl0
        |                                    |
        +------ dedicated data network ------+
        +----- dedicated control network -----+
```

The guests are Ubuntu 24.04 cloud images. QEMU is packaged in a Docker helper
container so the host only needs Docker and `/dev/kvm`; no host QEMU, libvirt,
sudo, or host RDMA configuration is required. The control network carries the
small TCP metadata/control channel. The data network carries RoCEv2 UDP/4791.
SSH uses a separate QEMU user-mode management interface bound to localhost
ports 2222 and 2223.

This VM design was chosen because the workstation's host kernel does not provide
the required post-7.1 RXE network-namespace fixes. Containerlab network
namespaces could create QPs but could not complete the RC data transfer on that
kernel. Full kernel-isolated guests avoid that host-kernel dependency.

## Requirements

- x86_64 Ubuntu machine with KVM (`/dev/kvm`) and hardware virtualisation.
- Docker usable by the current user.
- About 4 GiB free memory while the lab is running and several GiB of disk
  for the cached cloud image and qcow2 overlays.
- Network access to download the Ubuntu cloud image and apt packages.
- No physical interface, host route, bridge, or system RDMA configuration is
  changed.

The scripts were validated on Ubuntu 24.04.5 with Docker 27.5.1 and a host
7.0-series kernel. The guests run Ubuntu 24.04.5, kernel 6.8.0-151-generic,
rdma-core/python3-pyverbs 50.0-2ubuntu0.2.

## Quick start

From `labs/rdma-basics`:

```bash
./scripts/check-prereqs.sh
./scripts/setup-lab.sh
./scripts/verify-lab.sh
./scripts/run-experiments.sh
./scripts/collect-evidence.sh
./scripts/validate-evidence.sh --verify-checksums
```

When finished:

```bash
./scripts/teardown-lab.sh
```

`setup-lab.sh` downloads and checksum-verifies the official Ubuntu minimal
cloud image, builds the QEMU helper image, creates two overlay disks, boots two
guests, installs `linux-modules-extra-$(uname -r)` inside them (required because
Ubuntu cloud kernels place `rdma_rxe` there), loads `rdma_rxe`, creates `rxe0`,
and configures the isolated interfaces.

To run a subset:

```bash
./scripts/run-experiments.sh b,c
```

Experiment letters: `a` resources, `b` SEND/RECEIVE, `c` RDMA WRITE, `d` RDMA
READ.

## What each experiment proves

### A — resource creation and QP state

Both sides open `rxe0`, allocate a PD/CQ/MR/QP, select the IPv4 RoCEv2 GID,
exchange QPN/PSN/GID metadata over the control channel, and transition the RC
QP through INIT, RTR, and RTS. No data work request is posted.

### B — SEND/RECEIVE

The receiver posts a receive WR before signalling readiness. The sender posts a
50-byte SEND. Both sides require successful CQEs and the receiver requires an
exact payload match. Any missing/error completion or payload mismatch exits
nonzero.

### C — RDMA WRITE

The target registers memory and shares its address and RKEY through the control
channel. The writer posts one RDMA WRITE. The target posts **no receive WR** and
observes zero target CQEs, demonstrating that ordinary RDMA WRITE completion is
a sender-side operation. After explicit control-channel synchronisation, the
target verifies that memory contains the exact payload.

The capture validates the wire metadata. `packet-analysis.txt` is generated
from the application event logs and packet decode in the same evidence set; it
records the exact VA, RKEY, DMA length, destination QPN, and PSN for that run.
These values are runtime-specific and must not be copied as constants.

### D — RDMA READ

The source shares memory address/RKEY. The reader posts an RDMA READ and
verifies exact data after its successful completion. The capture contains both
the READ request and READ response.

## Evidence

`collect-evidence.sh` stages artifacts in a fresh temporary directory,
validates application-to-packet correlation and freshness, regenerates
`packet-analysis.txt`, writes an exact checksum manifest, and only then
publishes `evidence/reference-run/`. `validate-evidence.sh` repeats the same
application/packet correlation checks without starting the VMs. Missing host
evidence, missing expected files, empty/corrupt captures, failed experiment status, stale artifacts, or
metadata mismatches make collection return nonzero without replacing the
previously validated evidence. Partial experiment selections are published
under a clearly named `partial-run-*` directory rather than as a complete
A/B/C/D reference run. The evidence directory contains:

- `environment.json` — host/guest OS, kernel, rdma-core, Pyverbs, image hash,
  commands, and architecture.
- `verification.json` — exit status of every experiment.
- `hosta-events.jsonl` and `hostb-events.jsonl` — structured Pyverbs events.
- `hosta-*.log` and `hostb-*.log` — human-readable application output.
- `send-recv.pcap`, `rdma-write.pcap`, `rdma-read.pcap` — data-plane captures.
- `packet-analysis.txt` — generated decoded opcode/QPN/PSN/RETH correlation
  for the same execution represented by the event logs and pcaps.
- `SHA256SUMS` — integrity manifest.

Open a capture in Wireshark, for example:

```bash
wireshark evidence/reference-run/rdma-write.pcap
```

Or inspect it in text form:

```bash
tshark -r evidence/reference-run/rdma-write.pcap -Y 'udp.port==4791' -V
```

Look for UDP destination port 4791, the InfiniBand Base Transport Header, RC
opcode, destination QPN, PSN, and (for WRITE/READ) the RETH virtual address,
RKEY, and DMA length. The reference pcaps also include a small amount of ICMP,
ARP, or ICMPv6 readiness/neighbour-discovery traffic; those frames are not RDMA
operations.

### Direction-aware QPN and PSN validation

Each endpoint of a Reliable Connected pair owns an independent local QPN. The
fact that the two guests often allocate the same number is coincidental. The
validator therefore correlates `qp_ready` metadata from both sides and checks
packet direction explicitly:

- an initiator-to-responder SEND, WRITE, or READ request must use the
  responder's local QPN in BTH.DestQP;
- a responder-to-initiator ACK or READ response must use the initiator's local
  QPN in BTH.DestQP.

Initial SQ PSNs are endpoint properties. `rq_psn` on one endpoint is configured
from the peer's initial `sq_psn`, but the two SQ initial values do not have to
be numerically equal. For SEND and RDMA WRITE acknowledgements, the InfiniBand
reliable-service rules put the PSN of the most recent acknowledged request in
the ACK. For RDMA READ responses, response PSNs are sequential and begin at the
originating READ request PSN; they are not drawn from the responder's own
independent SQ initial value. The regression suite uses clearly labelled
synthetic mutations of disposable evidence copies to test asymmetric endpoint
QPNs and additional asymmetric-PSN negative cases without replacing the genuine
reference captures. The committed reference pcaps themselves were regenerated
from a real two-VM run in which hostb held one additional QP before the
experiments, so the endpoint QPNs are genuinely asymmetric (for example WRITE
initiator 0x13, target 0x14).

Primary references: InfiniBand Architecture Specification Volume 1 sections
9.7.5.1.1, 9.7.5.1.8, and 9.7.5.1.9; `ibv_modify_qp(3)` for `dest_qp_num`,
`rq_psn`, and `sq_psn` connection semantics.

## Cleanup and safety

`teardown-lab.sh` removes only the `fabriclab-rdma-vm-runner` container, its
two QEMU processes, generated qcow2/seed artifacts, SSH known-hosts entries for
this lab, and the lab cache runtime directory. It does not remove the downloaded
base image or the Docker image, does not alter host networking, and does not
touch host RDMA devices.

The guest interfaces are point-to-point QEMU socket links inside the helper
container. They are not bridged to the physical network. SSH forwarding is bound
to localhost.

## Troubleshooting

- **`/dev/kvm` missing or permission denied**: enable hardware virtualisation
  and ensure the user can access KVM. This lab intentionally avoids sudo.
- **cloud-init error or `modprobe: FATAL: Module rdma_rxe not found`**: recreate
  the lab; current cloud-init installs `linux-modules-extra-$(uname -r)` before
  loading RXE.
- **SSH timeout**: inspect the QEMU serial logs under
  `~/.cache/fabriclab/rdma-basics/run/host*/serial.log` through the runner
  container if they are not host-readable.
- **`ibv_devinfo` cannot open device**: run experiments through the scripts;
  device nodes in the guest are root-managed and the scripts invoke Pyverbs via
  sudo inside the disposable guests.
- **Empty pcap**: capture startup on emulated machines can race a very short
  transfer. The scripts now wait and emit a one-packet ICMP readiness marker;
  if no marker appears, the capture started late.
- **Retry exhausted or no completion**: verify `rdma link show`, port state,
  IPv4 GID index, data-plane IP addresses, and that the control channel is
  192.168.100.x while the data channel is 10.10.10.x.

## Limitations

- Small demonstrations use a handful of packets; they do not exercise PFC, ECN,
  DCQCN, congestion, packet loss, MTU segmentation, GPU memory, or hardware
  offload.
- QEMU user-mode SSH management is only a control convenience and is separate
  from the measured data plane.
- Virtual addresses and RKEYs are run-specific. Values in `packet-analysis.txt`
  are for the committed reference run, not stable constants.
- The evidence is valid for the recorded software versions. Re-run the scripts
  rather than treating pcaps as proof on a different machine.
