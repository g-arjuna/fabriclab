# TCP foundations evidence run — implementation and capture protocol

Use the existing isolated two-Linux-host FabricLab test environment, not production networks. No credentials or real traffic should enter captures. Copy `tcp_foundation.py` to both hosts. These experiments are **new**; do not overwrite RDMA reference captures. The script uses standard Python only. Actual captured packet counts, timestamps, addresses, FD numbers and read return sizes vary; never hardcode them into lesson copy. Timeout defaults to 180 seconds; gates require terminal input, so keep the operator coordinated.

## Capture preparation

Record Python/kernel versions, host names, `ip addr show dev data0`, `ip link show dev data0`, `ip route get 10.10.10.2` on A, equivalent return route on B, and `ethtool -k data0` if supported. Confirm the actual interface/addresses match lab topology; if not, document actual values and update bindings, not fixed narrative. If needed, use verified existing isolated lab orchestration to set addresses. Confirm no other workload on TCP ports 5001–5004. Run captures with lab-authorized privileges only, e.g. on B before the sender runs:

```sh
sudo tcpdump -i data0 -s 0 -U -nn -w small-late.pcap 'tcp port 5001'
```

Stop gracefully with Ctrl-C after completion; retain tcpdump summary. Capture on receiver or suitable observation point, not an invented physical-wire viewpoint. For the large case prefer an isolated MTU 1500 path and disable relevant segmentation/coalescing offloads if supported and safe **on isolated lab interfaces only**, recording actual settings and restoring them after. If virtual interfaces cannot be configured as expected, document that and use a suitable capture point or a larger payload in a separately reviewed extension, not fabricated segmentation. Capture offload and checksum interpretation per Wireshark documentation. The provided 4096 bytes should span multiple segments on an effective ~1460 MSS path, but observed segments are the authority.

## Case A: sender sends first; receiver reads later

Terminal B (receiver):

```sh
python3 tcp_foundation.py receiver --host 10.10.10.2 --port 5001 --case small --chunk 2 --gate | tee small-late-receiver.jsonl
```

Terminal A (sender):

```sh
python3 tcp_foundation.py sender --host 10.10.10.2 --port 5001 --case small --hold-after-send | tee small-late-sender.jsonl
```

Wait until receiver prints `gate_wait` before first read, and sender prints `sendall_return` and `gate_wait` after submission. In another B terminal use `ss -tnpi '( sport = :5001 or dport = :5001 )'` (record actual output and run time). Retry observation briefly if data is not yet available. Validate socket peer addresses and unread Recv-Q, ideally five bytes, before releasing either gate. Confirm actual capture contains the five payload bytes and covering TCP ACK. Gate order is an operator observation; record it in a small run log. Press Enter on B to allow reads; then on A to permit shutdown. Receiver verifies HELLO then reads EOF. Both exit. Capture a second `ss` snapshot after application reads if practical; do not claim a zero queue observation without evidence. The `--chunk 2` limit guarantees no receive returns more than two bytes per call, but not that each returns exactly two.

## Case B: receiver calls read before sender submits

Capture `small-early.pcap` with port 5002. Start receiver without `--gate`, then sender with `--gate` and port 5002. Wait for receiver's `recv_enter` and sender's `gate_wait`; observe receiver has not logged a `recv_return` and collect socket state. Then release sender. Verify output. If desired, obtain `strace -f -tt -e trace=network` using a separate controlled repeat (write output to its own trace file), not by attaching to arbitrary processes. A Python log records method entry/return, not proof of the exact syscall used by the Python implementation. Only display syscall traces if captured and correlated. Explicitly label separate runs.

## Case C: large transfer, segmentation versus read boundaries

Capture `large.pcap` port 5003. Receiver `--case large --chunk 700`, sender `--case large` with the same port. No gates needed. The sender submits the 4096 bytes in a single `sendall()` invocation. Receiver reads at most 700 bytes per iteration and validates all bytes. Compare unique TCP sequence ranges of the actual forward data segments with the logged read chunks. Do not count retransmissions twice. Confirm multiple distinct ranges at the observation point; if not, resolve capture offload or disclose that the large-case evidence is not ready. Record actual MSS/options, MTU, capture point and segmentation/coalescing settings.

## Case D: two processes on one host (loopback)

On one lab host capture `lo`, port 5004, use receiver `--host 127.0.0.1 --port 5004 --case small --chunk 2` and sender with same host/port. Verify HELLO. Record `ip route get 127.0.0.1`. The capture is on a software interface and does not prove a physical Ethernet frame left a NIC. Do not infer timing differences or measure performance.

## Evidence export

Use Wireshark and TShark. For each capture retain raw PCAP, exact command, versions, SHA-256, selected frames, relative/absolute sequence policy, protocol fields, payload hex, app logs and verification. Example extraction (adjust to installed version, validate output):

```sh
tshark -r small-late.pcap -Y 'tcp.port == 5001' -T fields \
  -E header=y -E separator=, -E quote=d \
  -e frame.number -e frame.len -e frame.cap_len -e ip.src -e ip.dst \
  -e tcp.srcport -e tcp.dstport -e tcp.flags -e tcp.seq -e tcp.ack \
  -e tcp.len -e tcp.payload -e tcp.options.mss_val
```

For packet/byte-range diagrams, relative sequence numbering is fine if consistently labelled; SYN consumes one sequence number. Use TCP payload length, not Ethernet frame length. Parse hex robustly; correlate byte stream against sender/receiver SHA-256 and full payload. Use connection tuple and sequence ranges to handle retransmissions and out-of-order arrivals; no unsupported global timestamp ordering. Validate every displayed field and screenshot to the capture. Screenshots must be taken from actual Wireshark rendering of these captures (not image generation, simulated Wireshark, or unrelated stock screenshots). Screenshot cropping may remove chrome but must preserve actual values. If GUI rendering unavailable, use real decoded TShark output with a clearly labelled alternative and report the screenshot blocker; do not invent a screenshot.

Publish under a new TCP evidence bundle/schema, with deterministic export and tests; do not modify original RDMA evidence or its digest. No raw process addresses are needed from non-lab hosts. Teaching buffers are intentionally synthetic test data.

## Handoff fixture smoke test

The supplied Python script was executed locally by the content author over loopback using two processes for each payload size. The five-byte transfer verified successfully with three receive returns (2, 2 and 1 bytes); the 4,096-byte transfer verified successfully with six receive returns using a maximum chunk of 700 bytes. This is a fixture correctness check only. It is not the required two-host reference capture, a segmentation measurement, or validation of the gated observation sequence. Devin must perform the four isolated reference runs and validate the artifacts above.
