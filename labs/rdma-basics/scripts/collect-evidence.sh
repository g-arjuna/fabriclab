#!/bin/bash
# collect-evidence.sh — run on the lab operator machine (the machine
# that hosts the two QEMU VMs).
#
# Pulls event logs, app output and PCAPs out of both VMs into
# labs/rdma-basics/evidence/<run-id>/ and writes a SHA256 manifest.
#
# Assumes each VM ran experiments with output under /root/lab/
# (see run-experiments.sh) and captures under /root/lab/captures/.
#
# usage: ./collect-evidence.sh [run-id]
set -euo pipefail

RUN_ID="${1:-$(date +%Y%m%d-%H%M%S)}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/evidence/$RUN_ID"
KEY="${VM_SSH_KEY:-$HOME/rdma-vm/vm_key}"
mkdir -p "$OUT/hosta" "$OUT/hostb"

fetch() { # node port remote local
    local node=$1 port=$2 remote=$3 local=$4
    ssh -i "$KEY" -p "$port" -o StrictHostKeyChecking=no \
        devin@127.0.0.1 "sudo cat '$remote' 2>/dev/null" > "$local" || true
}

for spec in "hosta 2222" "hostb 2223"; do
    set -- $spec
    node=$1; port=$2
    fetch "$node" "$port" /root/lab/events.jsonl "$OUT/$node/events.jsonl"
    fetch "$node" "$port" /root/lab/out.log     "$OUT/$node/app.log"
    # Pull every pcap the run produced.
    ssh -i "$KEY" -p "$port" -o StrictHostKeyChecking=no \
        devin@127.0.0.1 \
        "sudo sh -c 'ls /root/lab/captures/*.pcap /root/lab/*.pcap 2>/dev/null'" \
        | while read -r p; do
            [ -n "$p" ] || continue
            fetch "$node" "$port" "$p" "$OUT/$node/$(basename "$p")"
          done
done

( cd "$OUT" && find . -type f ! -name SHA256SUMS -print0 \
    | sort -z | xargs -0 sha256sum > SHA256SUMS )

echo "Evidence written to $OUT"
