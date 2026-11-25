#!/usr/bin/env python3
"""Host-side orchestration for the FabricLab two-VM Soft-RoCE lab.

The current supported execution path is KVM/QEMU.  QEMU is packaged in a
small Docker runner image so the workstation does not need a system-wide QEMU
or libvirt installation.  The two guests are still real KVM virtual machines;
Docker is not part of their network or RDMA data plane.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile
import time

LAB_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = LAB_ROOT.parents[1]
RUNNER_IMAGE = os.environ.get("RDMA_RUNNER_IMAGE", "rdma-vm-runner:24.04")
RUNNER_CONTAINER = os.environ.get("RDMA_RUNNER_CONTAINER", "fabriclab-rdma-vm-runner")
CACHE = Path(os.environ.get("RDMA_LAB_CACHE", Path.home() / ".cache" / "fabriclab" / "rdma-basics")).expanduser()
RUN_DIR = CACHE / "run"
KEY = CACHE / "id_ed25519"
KNOWN_HOSTS = CACHE / "known_hosts"
BASE_IMAGE = CACHE / "ubuntu-24.04-minimal-cloudimg-amd64.img"
BASE_IMAGE_URL = os.environ.get(
    "RDMA_CLOUD_IMAGE_URL",
    "https://cloud-images.ubuntu.com/minimal/releases/noble/release/ubuntu-24.04-minimal-cloudimg-amd64.img",
)
CHECKSUMS_URL = os.environ.get(
    "RDMA_CLOUD_IMAGE_CHECKSUMS_URL",
    "https://cloud-images.ubuntu.com/minimal/releases/noble/release/SHA256SUMS",
)

VMS = {
    "hosta": {
        "ssh_port": 2222,
        "ctrl_ip": "192.168.100.1",
        "data_ip": "10.10.10.1",
        "mgmt_mac": "52:54:00:00:11:0a",
        "ctrl_mac": "52:54:00:00:12:0a",
        "data_mac": "52:54:00:00:13:0a",
        "ctrl_listen_port": 11000,
        "data_listen_port": 11001,
    },
    "hostb": {
        "ssh_port": 2223,
        "ctrl_ip": "192.168.100.2",
        "data_ip": "10.10.10.2",
        "mgmt_mac": "52:54:00:00:11:0b",
        "ctrl_mac": "52:54:00:00:12:0b",
        "data_mac": "52:54:00:00:13:0b",
        "ctrl_connect": "127.0.0.1:11000",
        "data_connect": "127.0.0.1:11001",
    },
}

EXPERIMENTS = {
    "a": {
        "script": "exp_a_resources.py",
        "listener_role": "b",
        "connector_role": "a",
        "capture": None,
        "required": True,
    },
    "b": {
        "script": "exp_b_send_recv.py",
        "listener_role": "receiver",
        "connector_role": "sender",
        "capture": "send-recv.pcap",
        "required": True,
    },
    "c": {
        "script": "exp_c_write.py",
        "listener_role": "target",
        "connector_role": "writer",
        "capture": "rdma-write.pcap",
        "required": True,
    },
    "d": {
        "script": "exp_d_read.py",
        "listener_role": "source",
        "connector_role": "reader",
        "capture": "rdma-read.pcap",
        "required": False,
    },
}


def run(cmd, *, check=True, capture=True, timeout=None, input_data=None):
    if isinstance(cmd, str):
        printable = cmd
        shell = True
    else:
        printable = shlex.join(str(x) for x in cmd)
        shell = False
    print(f"+ {printable}", flush=True)
    proc = subprocess.run(
        cmd,
        shell=shell,
        check=False,
        text=True,
        input=input_data,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.STDOUT if capture else None,
        timeout=timeout,
    )
    if check and proc.returncode != 0:
        if capture and proc.stdout:
            print(proc.stdout, file=sys.stderr)
        raise RuntimeError(f"command failed ({proc.returncode}): {printable}")
    return proc


def docker(*args, check=True, capture=True):
    return run(["docker", *args], check=check, capture=capture)


def runner_exec(command, *, check=True, capture=True, timeout=None):
    return docker("exec", RUNNER_CONTAINER, "sh", "-lc", command, check=check, capture=capture)


def ssh_target(host):
    return ["ssh", "-i", str(KEY), "-p", str(VMS[host]["ssh_port"]),
            "-o", "BatchMode=yes", "-o", "IdentitiesOnly=yes",
            "-o", "StrictHostKeyChecking=accept-new",
            "-o", f"UserKnownHostsFile={KNOWN_HOSTS}",
            "-o", "ConnectTimeout=5", f"fabriclab@127.0.0.1"]


def ssh(host, command, *, check=True, capture=True, timeout=30):
    return run([*ssh_target(host), command], check=check, capture=capture, timeout=timeout)


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def check_prereqs():
    failures = []
    if sys.platform != "linux":
        failures.append("this lab currently supports Linux hosts only")
    if os.uname().machine != "x86_64":
        failures.append("the reference workflow is currently x86_64-only")
    if not shutil.which("docker"):
        failures.append("docker CLI is missing")
    else:
        probe = docker("info", check=False)
        if probe.returncode != 0:
            failures.append("docker daemon is not accessible to this user")
    if not Path("/dev/kvm").exists():
        failures.append("/dev/kvm is missing; enable CPU virtualisation and KVM")
    elif not os.access("/dev/kvm", os.R_OK | os.W_OK):
        failures.append("/dev/kvm exists but is not readable/writable by this user")
    for tool in ("ssh", "ssh-keygen", "curl", "tar"):
        if not shutil.which(tool):
            failures.append(f"required host tool is missing: {tool}")
    kernel = os.uname().release
    print(f"host kernel: {kernel}")
    print("architecture: KVM/QEMU virtual machines (host-kernel netns RXE is not required)")
    if failures:
        for failure in failures:
            print(f"ERROR: {failure}", file=sys.stderr)
        return 1
    print("prerequisites: OK")
    return 0


def ensure_key():
    CACHE.mkdir(parents=True, exist_ok=True)
    if not KEY.exists():
        run(["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-f", str(KEY)])
    KEY.chmod(0o600)


def download_base_image():
    CACHE.mkdir(parents=True, exist_ok=True)
    if not BASE_IMAGE.exists():
        tmp = BASE_IMAGE.with_suffix(".img.download")
        if tmp.exists():
            tmp.unlink()
        run(["curl", "-fL", "--retry", "3", "-o", str(tmp), BASE_IMAGE_URL], capture=False, timeout=1800)
        tmp.rename(BASE_IMAGE)
    checksums = CACHE / "SHA256SUMS.cloudimg"
    run(["curl", "-fsSL", "--retry", "3", "-o", str(checksums), CHECKSUMS_URL], timeout=120)
    expected = None
    for line in checksums.read_text().splitlines():
        if line.strip().endswith(BASE_IMAGE.name):
            expected = line.split()[0]
            break
    actual = sha256_file(BASE_IMAGE)
    if expected and actual != expected:
        raise RuntimeError(f"cloud image checksum mismatch: expected {expected}, got {actual}")
    print(f"base image: {BASE_IMAGE} sha256={actual}")


def cloud_init_files(host, pubkey):
    vm = VMS[host]
    user_data = f"""#cloud-config
hostname: {host}
manage_etc_hosts: true
ssh_pwauth: false
users:
  - name: fabriclab
    groups: [sudo]
    shell: /bin/bash
    sudo: "ALL=(ALL) NOPASSWD:ALL"
    lock_passwd: true
    ssh_authorized_keys:
      - {pubkey}
package_update: true
packages:
  - sudo
  - rdma-core
  - ibverbs-utils
  - python3-pyverbs
  - tcpdump
  - tshark
  - iproute2
  - iputils-ping
runcmd:
  # Ubuntu cloud kernels place rdma_rxe in linux-modules-extra.
  - apt-get install -y linux-modules-extra-$(uname -r)
  - modprobe rdma_rxe
"""
    meta_data = f"instance-id: fabriclab-rdma-{host}\nlocal-hostname: {host}\n"
    network_config = f"""version: 2
ethernets:
  mgmt0:
    match:
      macaddress: "{vm['mgmt_mac']}"
    dhcp4: true
  ctrl0:
    match:
      macaddress: "{vm['ctrl_mac']}"
    set-name: ctrl0
    mtu: 1500
    addresses: ["{vm['ctrl_ip']}/24"]
  data0:
    match:
      macaddress: "{vm['data_mac']}"
    set-name: data0
    mtu: 1500
    addresses: ["{vm['data_ip']}/24"]
"""
    return user_data, meta_data, network_config


def build_runner():
    docker("build", "-t", RUNNER_IMAGE, "-f", str(LAB_ROOT / "docker" / "vm-runner.Dockerfile"), str(LAB_ROOT), capture=False)


def start_runner():
    existing = docker("inspect", "-f", "{{.State.Running}}", RUNNER_CONTAINER, check=False)
    if existing.returncode == 0:
        if existing.stdout.strip() == "true":
            print(f"runner container already running: {RUNNER_CONTAINER}")
            return
        docker("rm", "-f", RUNNER_CONTAINER, check=False, capture=False)
    docker(
        "run", "-d", "--name", RUNNER_CONTAINER,
        "--device", "/dev/kvm",
        "-p", "127.0.0.1:2222:2222",
        "-p", "127.0.0.1:2223:2223",
        "-v", f"{LAB_ROOT}:/lab:ro",
        "-v", f"{CACHE}:/cache",
        RUNNER_IMAGE, "sleep", "infinity",
        capture=False,
    )


def prepare_vm_images():
    if RUN_DIR.exists():
        shutil.rmtree(RUN_DIR)
    RUN_DIR.mkdir(parents=True)
    pubkey = KEY.with_suffix(".pub").read_text().strip()
    for host in VMS:
        user_data, meta_data, network_config = cloud_init_files(host, pubkey)
        host_dir = RUN_DIR / host
        host_dir.mkdir()
        (host_dir / "user-data").write_text(user_data)
        (host_dir / "meta-data").write_text(meta_data)
        (host_dir / "network-config").write_text(network_config)
    runner_exec("rm -f /cache/run/host*/disk.qcow2 /cache/run/host*/seed.iso /cache/run/host*/*vars.fd")
    for host in VMS:
        runner_exec(
            f"cloud-localds --network-config /cache/run/{host}/network-config "
            f"/cache/run/{host}/seed.iso /cache/run/{host}/user-data /cache/run/{host}/meta-data && "
            f"qemu-img create -f qcow2 -F qcow2 -b /cache/{BASE_IMAGE.name} /cache/run/{host}/disk.qcow2 10G"
        )


def uefi_paths():
    probe = runner_exec("ls /usr/share/OVMF/OVMF_CODE*.fd /usr/share/OVMF/OVMF_VARS*.fd 2>/dev/null")
    paths = probe.stdout.split()
    code = next((p for p in paths if "OVMF_CODE" in p and "secboot" not in p), None)
    vars_template = next((p for p in paths if "OVMF_VARS" in p and "secboot" not in p), None)
    if not code or not vars_template:
        raise RuntimeError("OVMF firmware files not found in VM runner image")
    return code, vars_template


def qemu_command(host, uefi_code, uefi_vars):
    vm = VMS[host]
    base = [
        "qemu-system-x86_64",
        "-machine", "type=pc,accel=kvm",
        "-cpu", "host",
        "-smp", "2",
        "-m", "1024",
        "-display", "none",
        "-daemonize",
        "-pidfile", f"/cache/run/{host}/qemu.pid",
        "-serial", f"file:/cache/run/{host}/serial.log",
        "-monitor", f"unix:/cache/run/{host}/monitor.sock,server,nowait",
        "-drive", f"if=pflash,format=raw,readonly=on,file={uefi_code}",
        "-drive", f"if=pflash,format=raw,file=/cache/run/{host}/ovmf-vars.fd",
        "-drive", f"file=/cache/run/{host}/disk.qcow2,if=virtio,format=qcow2",
        "-cdrom", f"/cache/run/{host}/seed.iso",
        "-netdev", f"user,id=mgmt,hostfwd=tcp::{vm['ssh_port']}-:22",
        "-device", f"virtio-net-pci,netdev=mgmt,mac={vm['mgmt_mac']}",
    ]
    if host == "hosta":
        base += [
            "-netdev", f"socket,id=ctrl,listen=127.0.0.1:{vm['ctrl_listen_port']}",
            "-device", f"virtio-net-pci,netdev=ctrl,mac={vm['ctrl_mac']}",
            "-netdev", f"socket,id=data,listen=127.0.0.1:{vm['data_listen_port']}",
            "-device", f"virtio-net-pci,netdev=data,mac={vm['data_mac']}",
        ]
    else:
        base += [
            "-netdev", f"socket,id=ctrl,connect={vm['ctrl_connect']}",
            "-device", f"virtio-net-pci,netdev=ctrl,mac={vm['ctrl_mac']}",
            "-netdev", f"socket,id=data,connect={vm['data_connect']}",
            "-device", f"virtio-net-pci,netdev=data,mac={vm['data_mac']}",
        ]
    return shlex.join(base)


def start_vms():
    uefi_code, uefi_vars_template = uefi_paths()
    for host in VMS:
        runner_exec(f"cp {shlex.quote(uefi_vars_template)} /cache/run/{host}/ovmf-vars.fd")
    runner_exec(qemu_command("hosta", uefi_code, uefi_vars_template))
    time.sleep(1)
    runner_exec(qemu_command("hostb", uefi_code, uefi_vars_template))


def wait_for_vms(timeout_seconds=420):
    if KNOWN_HOSTS.exists():
        KNOWN_HOSTS.unlink()
    deadline = time.monotonic() + timeout_seconds
    pending = set(VMS)
    while pending and time.monotonic() < deadline:
        for host in list(pending):
            probe = ssh(host, "true", check=False, timeout=8)
            if probe.returncode == 0:
                print(f"ssh ready: {host}")
                pending.remove(host)
        if pending:
            time.sleep(5)
    if pending:
        raise RuntimeError(f"timed out waiting for SSH on: {', '.join(sorted(pending))}")
    for host in VMS:
        ssh(host, "cloud-init status --wait", timeout=600)


def copy_lab_files():
    for host in VMS:
        ssh(host, "mkdir -p /home/fabriclab/lab/python /home/fabriclab/lab/scripts /home/fabriclab/lab/run")
        tar_cmd = f"tar -C {shlex.quote(str(LAB_ROOT / 'python'))} -cf - ."
        remote_cmd = "tar -xf - -C /home/fabriclab/lab/python"
        run(f"{tar_cmd} | {' '.join(ssh_target(host))} {shlex.quote(remote_cmd)}", capture=False)
        for script in ("setup-rdma.sh",):
            data = (LAB_ROOT / "scripts" / script).read_bytes()
            proc = run([*ssh_target(host), f"cat > /home/fabriclab/lab/scripts/{script}"], input_data=data.decode(), check=True)
        ssh(host, "chmod +x /home/fabriclab/lab/scripts/setup-rdma.sh")


def configure_rdma():
    for host, vm in VMS.items():
        ssh(host, f"sudo /home/fabriclab/lab/scripts/setup-rdma.sh {vm['data_ip']}/24 data0 rxe0", timeout=60)
    print("RDMA devices configured in both guests")


def setup():
    if check_prereqs() != 0:
        return 1
    ensure_key()
    download_base_image()
    build_runner()
    start_runner()
    prepare_vm_images()
    start_vms()
    wait_for_vms()
    copy_lab_files()
    configure_rdma()
    print("lab setup complete")
    return verify()


def verify():
    failures = []
    checks = []
    a, b = VMS["hosta"], VMS["hostb"]
    checks.append(("hosta", f"ping -c 2 -W 1 {b['data_ip']}"))
    checks.append(("hosta", f"ping -c 2 -W 1 {b['ctrl_ip']}"))
    for host in VMS:
        checks.extend([
            (host, "rdma link show | grep -q 'link rxe0/1 state ACTIVE'"),
            (host, "ibv_devinfo rxe0 | grep -q 'PORT_ACTIVE'"),
            (host, "ibv_devinfo rxe0 | grep -q 'active_mtu.*1024'"),
            (host, "ip addr show data0 | grep -q 'inet 10.10.10.'"),
        ])
    for host, command in checks:
        proc = ssh(host, command, check=False, timeout=20)
        if proc.returncode != 0:
            failures.append(f"{host}: {command}\n{proc.stdout}")
    for host in VMS:
        print(f"== {host} verification ==")
        for command in (
            "ip -brief addr show ctrl0; ip -brief addr show data0",
            "rdma link show",
            "ibv_devinfo rxe0 | sed -n '1,18p'",
        ):
            proc = ssh(host, command, check=False)
            print(proc.stdout.strip())
    if failures:
        print("verification failures:", file=sys.stderr)
        print("\n".join(failures), file=sys.stderr)
        return 1
    print("lab verification: OK")
    return 0


def remote_role_command(host, exp_key, role, listener):
    exp = EXPERIMENTS[exp_key]
    peer_ctrl_ip = VMS["hostb"]["ctrl_ip"]
    event_log = f"/home/fabriclab/lab/run/exp-{exp_key}-events.jsonl"
    out_log = f"/home/fabriclab/lab/run/exp-{exp_key}-{role}.log"
    control = "--ctrl-listen" if listener else f"--ctrl-connect {peer_ctrl_ip}"
    return (
        "cd /home/fabriclab/lab/python && "
        f"RDMA_EVENT_LOG={event_log} timeout 25 sudo -E python3 {exp['script']} "
        f"--role {role} --host {host} --dev rxe0 {control} "
        f">{out_log} 2>&1"
    )


def start_capture(exp_key):
    capture = EXPERIMENTS[exp_key].get("capture")
    if not capture:
        return
    remote = f"/home/fabriclab/lab/run/{capture}"
    command = (
        "sudo sh -c "
        + shlex.quote(
            f"rm -f {remote} /tmp/rdma-tcpdump.pid /tmp/rdma-tcpdump.log; "
            f"nohup tcpdump -i data0 -U -s 0 -w {remote} "
            ">/tmp/rdma-tcpdump.log 2>&1 & echo $! >/tmp/rdma-tcpdump.pid"
        )
    )
    ssh("hosta", command)
    # The emulated machines can take a moment to open the AF_PACKET capture
    # socket even after the backgrounded tcpdump command returns.
    time.sleep(3)
    # Generate one explicit readiness marker on the data plane. Besides warming
    # ARP, this makes capture-start races visible in the resulting pcap.
    ssh("hosta", f"ping -c 1 -W 1 {VMS['hostb']['data_ip']}", check=False)


def stop_capture(exp_key):
    if not EXPERIMENTS[exp_key].get("capture"):
        return
    script = (
        "if [ -f /tmp/rdma-tcpdump.pid ]; then "
        "pid=$(cat /tmp/rdma-tcpdump.pid); "
        "kill -INT $pid 2>/dev/null || true; "
        "for i in 1 2 3 4 5 6 7 8 9 10; do "
        "kill -0 $pid 2>/dev/null || exit 0; sleep 0.2; "
        "done; kill -TERM $pid 2>/dev/null || true; fi"
    )
    ssh("hosta", "sudo sh -c " + shlex.quote(script), check=False)
    ssh("hosta", "sudo chmod 0644 /home/fabriclab/lab/run/*.pcap 2>/dev/null || true", check=False)


def experiment_order(selected):
    if selected:
        return [x.strip().lower() for x in selected.split(",") if x.strip()]
    return list(EXPERIMENTS)


def run_experiments(selected=None):
    verification = {
        "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "experiments": {},
        "overall": "pass",
    }
    RUN_DIR.mkdir(parents=True, exist_ok=True)
    failures = []
    for exp_key in experiment_order(selected):
        if exp_key not in EXPERIMENTS:
            print(f"unknown experiment: {exp_key}", file=sys.stderr)
            failures.append(exp_key)
            continue
        exp = EXPERIMENTS[exp_key]
        print(f"== experiment {exp_key}: {exp['script']} ==")
        for host in VMS:
            ssh(host, f"rm -f /home/fabriclab/lab/run/exp-{exp_key}-events.jsonl /home/fabriclab/lab/run/exp-{exp_key}-*.log", check=False)
        start_capture(exp_key)
        listener_cmd = remote_role_command("hostb", exp_key, exp["listener_role"], True)
        connector_cmd = remote_role_command("hosta", exp_key, exp["connector_role"], False)
        listener = subprocess.Popen([*ssh_target("hostb"), listener_cmd], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        time.sleep(1)
        connector = subprocess.Popen([*ssh_target("hosta"), connector_cmd], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        connector_out, _ = connector.communicate(timeout=40)
        listener_out, _ = listener.communicate(timeout=40)
        stop_capture(exp_key)
        result = {
            "script": exp["script"],
            "hosta_role": exp["connector_role"],
            "hostb_role": exp["listener_role"],
            "hosta_exit": connector.returncode,
            "hostb_exit": listener.returncode,
            "required": exp["required"],
            "status": "pass" if connector.returncode == 0 and listener.returncode == 0 else "fail",
        }
        verification["experiments"][exp_key] = result
        print(json.dumps(result, sort_keys=True))
        for host, role in (("hosta", exp["connector_role"]), ("hostb", exp["listener_role"])):
            log = ssh(host, f"cat /home/fabriclab/lab/run/exp-{exp_key}-{role}.log 2>/dev/null", check=False).stdout
            print(f"-- {host}/{role} output --")
            print(log.strip())
        if result["status"] != "pass":
            failures.append(exp_key)
            if exp["required"]:
                verification["overall"] = "fail"
            elif verification["overall"] == "pass":
                verification["overall"] = "pass-with-optional-failures"
    verification["finished_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    RUN_DIR.mkdir(parents=True, exist_ok=True)
    (RUN_DIR / "verification.json").write_text(json.dumps(verification, indent=2, sort_keys=True) + "\n")
    if failures:
        print("failed experiments: " + ", ".join(failures), file=sys.stderr)
        return 1
    print("all selected experiments passed")
    return 0


def collect_remote_run(host, destination):
    destination.mkdir(parents=True, exist_ok=True)
    command = "tar -C /home/fabriclab/lab/run -cf - . 2>/dev/null"
    proc = subprocess.Popen([*ssh_target(host), command], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    tar = subprocess.run(["tar", "-xf", "-", "-C", str(destination)], stdin=proc.stdout, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    proc.stderr.read()
    proc.wait()
    return tar.returncode == 0


def host_facts(host):
    facts = {}
    for key, command in {
        "kernel": "uname -r",
        "os_release": ". /etc/os-release; echo $PRETTY_NAME",
        "python": "python3 --version 2>&1",
        "pyverbs": "dpkg-query -W -f='${Version}\\n' python3-pyverbs 2>/dev/null",
        "rdma_core": "dpkg-query -W -f='${Version}\\n' rdma-core 2>/dev/null",
    }.items():
        proc = ssh(host, command, check=False)
        facts[key] = proc.stdout.strip()
    return facts


def collect(output_name="reference-run"):
    out = LAB_ROOT / "evidence" / output_name
    out.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        for host in VMS:
            collect_remote_run(host, tmpdir / host)
        for host in VMS:
            host_src = tmpdir / host
            events_out = out / f"{host}-events.jsonl"
            with events_out.open("w") as dst:
                for exp_key in EXPERIMENTS:
                    src = host_src / f"exp-{exp_key}-events.jsonl"
                    if src.exists():
                        dst.write(src.read_text())
            for src in sorted(host_src.glob("exp-*-*.log")):
                shutil.copy2(src, out / f"{host}-{src.name}")
        hosta = tmpdir / "hosta"
        for exp in EXPERIMENTS.values():
            capture = exp.get("capture")
            if capture and (hosta / capture).exists() and (hosta / capture).stat().st_size > 24:
                shutil.copy2(hosta / capture, out / capture)
    verification_src = RUN_DIR / "verification.json"
    if verification_src.exists():
        shutil.copy2(verification_src, out / "verification.json")
    environment = {
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "git_commit": run(["git", "-C", str(REPO_ROOT), "rev-parse", "HEAD"]).stdout.strip(),
        "architecture": "two Ubuntu 24.04 KVM/QEMU guests; QEMU packaged in Docker runner; dedicated direct socket-connected control and data NICs",
        "host": {
            "os": open("/etc/os-release").read().split('PRETTY_NAME="')[1].split('"')[0] if Path("/etc/os-release").exists() else "unknown",
            "kernel": os.uname().release,
            "arch": os.uname().machine,
            "docker": docker("--version").stdout.strip(),
        },
        "guests": {host: host_facts(host) for host in VMS},
        "base_image": {"url": BASE_IMAGE_URL, "sha256": sha256_file(BASE_IMAGE) if BASE_IMAGE.exists() else None},
        "commands": [
            "./scripts/check-prereqs.sh",
            "./scripts/setup-lab.sh",
            "./scripts/verify-lab.sh",
            "./scripts/run-experiments.sh",
            "./scripts/collect-evidence.sh",
            "./scripts/teardown-lab.sh",
        ],
    }
    (out / "environment.json").write_text(json.dumps(environment, indent=2, sort_keys=True) + "\n")
    sums = []
    for path in sorted(p for p in out.iterdir() if p.is_file() and p.name != "SHA256SUMS"):
        sums.append(f"{sha256_file(path)}  {path.name}")
    (out / "SHA256SUMS").write_text("\n".join(sums) + "\n")
    print(f"evidence written to {out}")
    return 0


def teardown():
    # QEMU runs as root inside the helper container. Removing that container
    # reliably terminates the VMs; asking it to clean /cache first avoids
    # root-owned artifacts that the unprivileged host user cannot delete.
    runner_exec("rm -rf /cache/run", check=False)
    docker("rm", "-f", RUNNER_CONTAINER, check=False, capture=False)
    if RUN_DIR.exists():
        shutil.rmtree(RUN_DIR)
    if KNOWN_HOSTS.exists():
        KNOWN_HOSTS.unlink()
    print("lab VMs and runner removed; cached base image and Docker image retained")
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["check", "setup", "verify", "run", "collect", "teardown"])
    parser.add_argument("arguments", nargs="*")
    args = parser.parse_args()
    actions = {
        "check": check_prereqs,
        "setup": setup,
        "verify": verify,
        "run": lambda: run_experiments(args.arguments[0] if args.arguments else None),
        "collect": lambda: collect(args.arguments[0] if args.arguments else "reference-run"),
        "teardown": teardown,
    }
    try:
        return actions[args.action]()
    except (RuntimeError, subprocess.TimeoutExpired) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
