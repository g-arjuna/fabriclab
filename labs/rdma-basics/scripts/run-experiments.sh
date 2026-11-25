#!/bin/bash
# run-experiments.sh — run INSIDE a lab VM.
#
# Copies the python/ examples to /root/lab/python and runs one
# experiment across both VMs is NOT done here — this script runs on
# ONE vm and expects the peer experiment to be started on the other.
# See ../../README.md "Running the experiments" for the exact
# two-terminal sequence.
#
# usage: sudo ./run-experiments.sh <role-args...>
#   e.g. on hostb:  sudo ./run-experiments.sh receiver --host hostb \
#                    --dev rxe0 --ctrl-listen
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p /root/lab
cp -r "$HERE/../python" /root/lab/
cd /root/lab/python
exec python3 "$@"
