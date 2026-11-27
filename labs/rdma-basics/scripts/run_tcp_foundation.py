#!/usr/bin/env python3
"""Run and validate the supplied TCP foundations cases in the isolated VM lab."""
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vm_lab as vm  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
SUPPLIED = REPO / "content" / "foundations-v2" / "lab" / "tcp_foundation.py"
OUT = ROOT / "evidence" / "tcp-foundation-v1"
REMOTE_SCRIPT = "/tmp/tcp_foundation.py"
REMOTE_PCAP_DIR = "/tmp/tcp-foundation-captures"

CASES = {
    "small-late": {"port": 5001, "case": "small", "chunk": 2, "receiver_host": "hostb", "sender_host": "hosta", "target": "10.10.10.2", "iface": "data0", "capture_host": "hostb", "receiver_gate": True, "sender_hold": True},
    "small-early": {"port": 5002, "case": "small", "chunk": 2, "receiver_host": "hostb", "sender_host": "hosta", "target": "10.10.10.2", "iface": "data0", "capture_host": "hostb", "sender_gate": True},
    "large": {"port": 5003, "case": "large", "chunk": 700, "receiver_host": "hostb", "sender_host": "hosta", "target": "10.10.10.2", "iface": "data0", "capture_host": "hostb"},
    "loopback": {"port": 5004, "case": "small", "chunk": 2, "receiver_host": "hosta", "sender_host": "hosta", "target": "127.0.0.1", "iface": "lo", "capture_host": "hosta"},
}


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")


def scp_from(host, remote, local):
    local.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["scp", "-i", str(vm.KEY), "-P", str(vm.VMS[host]["ssh_port"]),
           "-o", "BatchMode=yes", "-o", "IdentitiesOnly=yes",
           "-o", "StrictHostKeyChecking=accept-new", "-o", f"UserKnownHostsFile={vm.KNOWN_HOSTS}",
           f"fabriclab@127.0.0.1:{remote}", str(local)]
    vm.run(cmd)


def upload_script():
    text = SUPPLIED.read_text()
    for host in ("hosta", "hostb"):
        vm.run([*vm.ssh_target(host), f"cat > {REMOTE_SCRIPT} && chmod 0755 {REMOTE_SCRIPT}"], input_data=text)
        vm.ssh(host, f"python3 -m py_compile {REMOTE_SCRIPT}")


def ssh_output(host, command):
    proc = vm.ssh(host, command, check=False, timeout=20)
    return {"command": command, "exit_code": proc.returncode, "output": proc.stdout or ""}


def collect_environment():
    env = {"captured_at_unix": time.time(), "purpose": "isolated FabricLab TCP foundations reference run", "hosts": {}}
    commands = [
        "hostname", "uname -a", "python3 --version", "ip -o addr show dev data0",
        "ip link show dev data0", "ip -o addr show dev lo", "ip link show dev lo",
        "ethtool -k data0 2>&1 || true", "ss -tlnp 2>/dev/null | grep -E ':(5001|5002|5003|5004)\\b' || true",
    ]
    for host in ("hosta", "hostb"):
        env["hosts"][host] = {cmd.split()[0] + str(index): ssh_output(host, cmd) for index, cmd in enumerate(commands)}
    env["hosta_route_to_b"] = ssh_output("hosta", "ip route get 10.10.10.2")
    env["hostb_route_to_a"] = ssh_output("hostb", "ip route get 10.10.10.1")
    env["loopback_route"] = ssh_output("hosta", "ip route get 127.0.0.1")
    return env


def configure_offloads():
    records = {}
    # The isolated virtio interfaces already have TCP segmentation offload fixed off.
    # Disable GRO during the reference run so receiver-side coalescing does not obscure
    # TCP segmentation at the packet-capture observation point. Restore it afterwards.
    for host in ("hosta", "hostb"):
        before = ssh_output(host, "ethtool -k data0 2>&1 | grep -E 'generic-receive-offload|generic-segmentation-offload|tcp-segmentation-offload' || true")
        change = ssh_output(host, "sudo ethtool -K data0 gro off 2>&1 || true")
        after = ssh_output(host, "ethtool -k data0 2>&1 | grep -E 'generic-receive-offload|generic-segmentation-offload|tcp-segmentation-offload' || true")
        records[host] = {"before": before, "change": change, "after": after}
    return records


def restore_offloads():
    for host in ("hosta", "hostb"):
        vm.ssh(host, "sudo ethtool -K data0 gro on 2>/dev/null || true", check=False)


def start_capture(name, cfg):
    remote = f"{REMOTE_PCAP_DIR}/{name}.pcap"
    vm.ssh(cfg["capture_host"], f"sudo mkdir -p {REMOTE_PCAP_DIR} && sudo rm -f {remote} /tmp/tcp-foundation-tcpdump.pid /tmp/tcp-foundation-tcpdump.log")
    inner = (f"nohup tcpdump -i {cfg['iface']} -s 0 -U -nn -w {remote} "
             f"'tcp port {cfg['port']}' >/tmp/tcp-foundation-tcpdump.log 2>&1 & "
             "echo $! >/tmp/tcp-foundation-tcpdump.pid")
    vm.ssh(cfg["capture_host"], "sudo sh -c " + shlex.quote(inner))
    time.sleep(2)
    return remote


def stop_capture(cfg):
    script = (
        "if [ -f /tmp/tcp-foundation-tcpdump.pid ]; then "
        "pid=$(cat /tmp/tcp-foundation-tcpdump.pid); kill -INT $pid 2>/dev/null || true; "
        "for i in 1 2 3 4 5 6 7 8 9 10; do kill -0 $pid 2>/dev/null || exit 0; sleep 0.2; done; "
        "kill -TERM $pid 2>/dev/null || true; fi"
    )
    vm.ssh(cfg["capture_host"], "sudo sh -c " + shlex.quote(script), check=False)
    vm.ssh(cfg["capture_host"], f"sudo chmod 0644 {REMOTE_PCAP_DIR}/*.pcap 2>/dev/null || true", check=False)


def start_role(host, role, cfg, log_path, err_path, extra):
    args = [role, "--host", cfg["target"] if role == "sender" else ("127.0.0.1" if cfg["iface"] == "lo" else cfg["target"]), "--port", str(cfg["port"]), "--case", cfg["case"], "--chunk", str(cfg["chunk"]), "--timeout", "30", *extra]
    remote = "python3 " + REMOTE_SCRIPT + " " + " ".join(shlex.quote(x) for x in args)
    out = log_path.open("wb")
    err = err_path.open("wb")
    proc = subprocess.Popen([*vm.ssh_target(host), remote], stdin=subprocess.PIPE, stdout=out, stderr=err)
    return {"proc": proc, "out": out, "err": err, "command": " ".join(shlex.quote(x) for x in [*vm.ssh_target(host), remote])}


def close_role(handle):
    for stream in (handle["out"], handle["err"]):
        try:
            stream.close()
        except Exception:
            pass


def read_jsonl(path):
    if not path.exists():
        return []
    events = []
    for line in path.read_text(errors="replace").splitlines():
        if line.strip():
            events.append(json.loads(line))
    return events


def wait_event(path, event, timeout=15):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if any(item.get("event") == event for item in read_jsonl(path)):
            return True
        time.sleep(0.1)
    return False


def release(handle):
    handle["proc"].stdin.write(b"\n")
    handle["proc"].stdin.flush()


def finish(handle, timeout=15):
    try:
        return handle["proc"].wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        handle["proc"].kill()
        return handle["proc"].wait(timeout=5)
    finally:
        close_role(handle)


def ss_snapshot(host, port, label, outdir):
    command = f"ss -tnpi '( sport = :{port} or dport = :{port} )' 2>&1 || true"
    result = ssh_output(host, command)
    result["observation_label"] = label
    result["recorded_monotonic_ns"] = time.monotonic_ns()
    (outdir / f"ss-{label}.txt").write_text(result["output"])
    return result


def run_case(name, cfg):
    cdir = OUT / name
    if cdir.exists():
        shutil.rmtree(cdir)
    cdir.mkdir(parents=True)
    sender_log = cdir / "sender.jsonl"
    receiver_log = cdir / "receiver.jsonl"
    sender_err = cdir / "sender.stderr"
    receiver_err = cdir / "receiver.stderr"
    operator = []
    remote_pcap = start_capture(name, cfg)
    operator.append({"event": "capture_started", "host": cfg["capture_host"], "interface": cfg["iface"], "remote": remote_pcap, "monotonic_ns": time.monotonic_ns()})

    rextra = ["--gate"] if cfg.get("receiver_gate") else []
    sextra = []
    if cfg.get("sender_gate"):
        sextra.append("--gate")
    if cfg.get("sender_hold"):
        sextra.append("--hold-after-send")
    receiver = start_role(cfg["receiver_host"], "receiver", cfg, receiver_log, receiver_err, rextra)
    if not wait_event(receiver_log, "listen"):
        raise RuntimeError(f"{name}: receiver did not listen")
    operator.append({"event": "receiver_listen", "monotonic_ns": time.monotonic_ns()})
    ss = [ss_snapshot(cfg["receiver_host"], cfg["port"], "before-connect", cdir)]

    sender = start_role(cfg["sender_host"], "sender", cfg, sender_log, sender_err, sextra)
    gate_releases = []
    if name == "small-late":
        if not wait_event(sender_log, "gate_wait") or not wait_event(receiver_log, "gate_wait"):
            raise RuntimeError("small-late gates were not reached")
        ss.append(ss_snapshot(cfg["receiver_host"], cfg["port"], "after-send-before-read", cdir))
        operator.append({"event": "observed_after_send_before_read", "monotonic_ns": time.monotonic_ns()})
        gate_releases = [("receiver_before_first_read", receiver), ("sender_after_send_before_shutdown", sender)]
    elif name == "small-early":
        if not wait_event(receiver_log, "recv_enter") or not wait_event(sender_log, "gate_wait"):
            raise RuntimeError("small-early gates were not reached")
        if any(e.get("event") == "recv_return" for e in read_jsonl(receiver_log)):
            raise RuntimeError("small-early receiver returned before sender release")
        ss.append(ss_snapshot(cfg["receiver_host"], cfg["port"], "receiver-waiting-before-send", cdir))
        operator.append({"event": "observed_receiver_waiting_before_send", "monotonic_ns": time.monotonic_ns()})
        gate_releases = [("sender_before_send", sender)]
    elif name == "large":
        pass

    for label, handle in gate_releases:
        release(handle)
        operator.append({"event": "gate_release", "gate": label, "monotonic_ns": time.monotonic_ns()})
        time.sleep(0.4)
    src = finish(sender)
    rrc = finish(receiver)
    ss.append(ss_snapshot(cfg["receiver_host"], cfg["port"], "after-completion", cdir))
    stop_capture(cfg)
    operator.append({"event": "capture_stopped", "monotonic_ns": time.monotonic_ns()})
    scp_from(cfg["capture_host"], remote_pcap, cdir / f"{name}.pcap")
    tcpdump_summary = subprocess.run(["tcpdump", "-nn", "-tttt", "-r", str(cdir / f"{name}.pcap")], text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False)
    (cdir / "tcpdump-summary.txt").write_text(tcpdump_summary.stdout)
    tshark = subprocess.run([
        "tshark", "-r", str(cdir / f"{name}.pcap"), "-Y", f"tcp.port == {cfg['port']}", "-T", "fields",
        "-E", "header=y", "-E", "separator=,", "-E", "quote=d",
        "-e", "frame.number", "-e", "frame.len", "-e", "frame.cap_len", "-e", "ip.src", "-e", "ip.dst",
        "-e", "tcp.srcport", "-e", "tcp.dstport", "-e", "tcp.flags", "-e", "tcp.seq", "-e", "tcp.ack",
        "-e", "tcp.len", "-e", "tcp.payload", "-e", "tcp.options.mss_val",
    ], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    (cdir / "tshark-fields.csv").write_text(tshark.stdout)
    if tshark.stderr:
        (cdir / "tshark.stderr").write_text(tshark.stderr)
    write_json(cdir / "operator-log.json", operator)
    write_json(cdir / "ss-snapshots.json", ss)
    write_json(cdir / "process-results.json", {"sender_exit": src, "receiver_exit": rrc, "sender_command": sender["command"], "receiver_command": receiver["command"], "capture_command": f"tcpdump -i {cfg['iface']} -s 0 -U -nn -w {name}.pcap 'tcp port {cfg['port']}'", "capture_host": cfg["capture_host"], "capture_interface": cfg["iface"]})
    return validate_case(name, cfg, cdir)


def validate_case(name, cfg, cdir):
    sender_events = read_jsonl(cdir / "sender.jsonl")
    receiver_events = read_jsonl(cdir / "receiver.jsonl")
    errors = []
    def require(condition, message):
        if not condition:
            errors.append(message)
    require(any(e.get("event") == "connect_return" for e in sender_events), "sender connect_return missing")
    require(any(e.get("event") == "sendall_return" for e in sender_events), "sender sendall_return missing")
    require(any(e.get("event") == "verify" and e.get("ok") is True for e in receiver_events), "receiver verify ok missing")
    require(any(e.get("event") == "eof_read_return" and e.get("count") == 0 for e in receiver_events), "receiver EOF observation missing")
    require(any(e.get("event") == "peer_eof" and e.get("count") == 0 for e in sender_events), "sender peer EOF observation missing")
    recv_returns = [e for e in receiver_events if e.get("event") == "recv_return"]
    expected_len = 5 if cfg["case"] == "small" else 4096
    require(sum(e.get("count", 0) for e in recv_returns) == expected_len, "received byte count mismatch")
    require(all(e.get("count", 0) <= cfg["chunk"] for e in recv_returns), "recv return exceeded configured chunk")
    payload_hex = next((e.get("hex") for e in sender_events if e.get("event") == "source_buffer"), None)
    verify_hex = next((e.get("hex") for e in receiver_events if e.get("event") == "verify"), None)
    require(payload_hex == verify_hex, "sender payload and receiver verify hex differ")
    rows = []
    csv_path = cdir / "tshark-fields.csv"
    if csv_path.exists():
        import csv
        rows = list(csv.DictReader(csv_path.open()))
    data_rows = [r for r in rows if r.get("tcp.len") and r["tcp.len"].isdigit() and int(r["tcp.len"]) > 0 and r.get("ip.src") == ("10.10.10.1" if cfg["iface"] == "data0" else "127.0.0.1")]
    require(bool(data_rows), "no forward TCP payload rows decoded")
    if cfg["case"] == "small":
        require(any((r.get("tcp.payload") or "").replace(":", "").lower() == "48454c4c4f" for r in data_rows), "HELLO payload not found in capture")
    else:
        ranges = sorted({int(r["tcp.seq"]) for r in data_rows})
        require(len(data_rows) >= 2 and len(ranges) >= 2, "large transfer did not decode as multiple forward data segments")
    if name == "small-early":
        first_enter = next((e for e in receiver_events if e.get("event") == "recv_enter"), None)
        first_return = next((e for e in receiver_events if e.get("event") == "recv_return"), None)
        require(first_enter and first_return and first_enter["monotonic_ns"] < first_return["monotonic_ns"], "receiver enter/return chronology invalid")
    result = {"case": name, "ok": not errors, "errors": errors, "event_counts": {"sender": len(sender_events), "receiver": len(receiver_events)}, "recv_return_counts": [e.get("count") for e in recv_returns], "forward_payload_rows": len(data_rows), "decoded_rows": len(rows)}
    write_json(cdir / "validation.json", result)
    return result


def checksums():
    entries = []
    for path in sorted(OUT.rglob("*")):
        if path.is_file() and path.name != "SHA256SUMS":
            entries.append((vm.sha256_file(path), path.relative_to(OUT).as_posix()))
    (OUT / "SHA256SUMS").write_text("".join(f"{digest}  {name}\n" for digest, name in entries))


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    upload_script()
    environment = collect_environment()
    environment["offload_control"] = configure_offloads()
    write_json(OUT / "environment.json", environment)
    results = []
    try:
        for name, cfg in CASES.items():
            print(f"=== TCP foundation case: {name} ===", flush=True)
            results.append(run_case(name, cfg))
    finally:
        restore_offloads()
    write_json(OUT / "validation.json", {"ok": all(r["ok"] for r in results), "cases": results})
    write_json(OUT / "provenance.json", {
        "evidence_set": "tcp-foundation-v1",
        "script_sha256": vm.sha256_file(SUPPLIED),
        "script_source": SUPPLIED.as_posix(),
        "captured_at_unix": time.time(),
        "lab": "FabricLab isolated KVM/QEMU two-host laboratory",
        "notes": "PCAP timestamps and kernel values are actual run-specific observations. Loopback evidence is a software-interface observation. Original RDMA reference evidence is not modified.",
    })
    checksums()
    failed = [r["case"] for r in results if not r["ok"]]
    if failed:
        raise SystemExit(f"validation failed: {', '.join(failed)}")
    print(f"TCP foundation evidence validated: {OUT}")


if __name__ == "__main__":
    main()
