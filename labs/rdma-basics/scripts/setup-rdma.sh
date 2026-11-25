#!/bin/bash
# setup-rdma.sh — run INSIDE each lab VM (as root or with sudo).
#
# Prepares Soft-RoCE (rdma_rxe) on the RDMA data-plane interface.
# Idempotent: safe to re-run.
#
# usage: sudo ./setup-rdma.sh <ipv4/prefix> <netdev> [rxe-name]
#   e.g. sudo ./setup-rdma.sh 10.10.10.1/24 enp0s8 rxe0
set -euo pipefail

ADDR="${1:?usage: setup-rdma.sh <ipv4/prefix> <netdev> [rxe-name]}"
NETDEV="${2:?usage: setup-rdma.sh <ipv4/prefix> <netdev> [rxe-name]}"
RXE="${3:-rxe0}"

modprobe rdma_rxe

ip link set "$NETDEV" up mtu 1500
ip addr replace "$ADDR" dev "$NETDEV"

if ! rdma link show | grep -q "^link ${RXE}/"; then
    rdma link add "$RXE" type rxe netdev "$NETDEV"
fi

# udev normally creates /dev/infiniband/uverbsN; fall back to mknod.
if ! ls /dev/infiniband/uverbs* >/dev/null 2>&1; then
    mkdir -p /dev/infiniband
    for u in /sys/class/infiniband_verbs/uverbs*/uevent; do
        n=$(basename "$(dirname "$u")")
        maj=$(awk -F= '/^MAJOR/{print $2}' "$u")
        min=$(awk -F= '/^MINOR/{print $2}' "$u")
        mknod "/dev/infiniband/$n" c "$maj" "$min"
        chmod 666 "/dev/infiniband/$n"
    done
fi

echo "== RDMA ready =="
rdma link
ibv_devinfo | grep -E "hca_id|port:"
