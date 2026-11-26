#!/usr/bin/env python3
"""Isolated teaching transfer. JSONL events are actual local observations.
No privileged operation, no host reconfiguration, no packet capture inside this script.
Run receiver and sender in separate terminals; use --gate for manual observation.
"""
import argparse
import ctypes
import hashlib
import json
import os
import socket
import time


def event(name, **fields):
    print(json.dumps({"event": name, "pid": os.getpid(),
                      "monotonic_ns": time.monotonic_ns(), **fields}, sort_keys=True), flush=True)


def payload(case):
    if case == "small":
        return b"HELLO"
    return bytes((65 + (i % 26) for i in range(4096)))


def address(buf):
    return hex(ctypes.addressof(ctypes.c_char.from_buffer(buf)))


def gate(name):
    event("gate_wait", gate=name)
    input()
    event("gate_release", gate=name)


def endpoint(sock):
    return {"local": list(sock.getsockname()), "peer": list(sock.getpeername()), "fd": sock.fileno()}


def receiver(args):
    expected = payload(args.case)
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.settimeout(args.timeout)
        listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        listener.bind((args.host, args.port))
        listener.listen(1)
        event("listen", local=list(listener.getsockname()), fd=listener.fileno())
        event("accept_enter")
        conn, peer = listener.accept()
        with conn:
            conn.settimeout(args.timeout)
            event("accept_return", **endpoint(conn), listener_fd=listener.fileno())
            dest = bytearray(len(expected))
            event("buffer_before", address=address(dest), capacity=len(dest),
                  hex=dest.hex(), sha256=hashlib.sha256(dest).hexdigest())
            if args.gate:
                gate("before_first_read")
            received = 0
            while received < len(dest):
                requested = min(args.chunk, len(dest) - received)
                event("recv_enter", offset=received, requested=requested)
                count = conn.recv_into(memoryview(dest)[received:received + requested])
                if count == 0:
                    event("unexpected_eof", received=received)
                    raise EOFError("incomplete payload")
                event("recv_return", offset=received, requested=requested, count=count,
                      hex=dest[received:received + count].hex())
                received += count
            ok = bytes(dest) == expected
            event("verify", ok=ok, received=received, hex=dest.hex(),
                  sha256=hashlib.sha256(dest).hexdigest())
            if not ok:
                raise ValueError("payload mismatch")
            # Observe orderly EOF; no application reply contaminates the data stream.
            event("eof_read_enter")
            tail = conn.recv(1)
            event("eof_read_return", count=len(tail), hex=tail.hex())
            if tail != b"":
                raise ValueError("unexpected trailing data")
    event("closed")


def sender(args):
    data = payload(args.case)
    # Small-case buffer has 16 bytes of capacity; transfer only its first five.
    source = bytearray(max(16, len(data)))
    source[:len(data)] = data
    event("source_buffer", address=address(source), capacity=len(source),
          payload_length=len(data), hex=bytes(source[:len(data)]).hex(),
          sha256=hashlib.sha256(data).hexdigest())
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as conn:
        conn.settimeout(args.timeout)
        event("connect_enter", target=[args.host, args.port])
        conn.connect((args.host, args.port))
        event("connect_return", **endpoint(conn))
        if args.gate:
            gate("before_send")
        event("sendall_enter", length=len(data))
        conn.sendall(memoryview(source)[:len(data)])
        event("sendall_return", length=len(data), source_unchanged=bytes(source[:len(data)]) == data)
        # Keep connection open during the late-reader queue observation if requested.
        if args.hold_after_send:
            gate("after_send_before_shutdown")
        conn.shutdown(socket.SHUT_WR)
        event("shutdown_write")
        # Receiver closes after verifying and observing EOF.
        reply = conn.recv(1)
        event("peer_eof", count=len(reply), hex=reply.hex())
        if reply != b"":
            raise ValueError("unexpected application reply")
    event("closed")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("role", choices=["sender", "receiver"])
    p.add_argument("--host", required=True, help="Receiver bind IP or sender destination IP")
    p.add_argument("--port", type=int, default=5001)
    p.add_argument("--case", choices=["small", "large"], default="small")
    p.add_argument("--chunk", type=int, default=2, help="Receiver maximum bytes per read")
    p.add_argument("--gate", action="store_true", help="Wait before sender send or receiver first read")
    p.add_argument("--hold-after-send", action="store_true", help="Sender waits after submission before FIN")
    p.add_argument("--timeout", type=float, default=180)
    args = p.parse_args()
    if args.chunk <= 0 or args.timeout <= 0:
        p.error("chunk and timeout must be positive")
    event("start", role=args.role, case=args.case, chunk=args.chunk)
    (sender if args.role == "sender" else receiver)(args)


if __name__ == "__main__":
    main()
