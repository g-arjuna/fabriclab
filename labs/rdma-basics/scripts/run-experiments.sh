#!/usr/bin/env bash
set -euo pipefail
# Optionally pass a comma-separated subset such as "b,c". The default is a,b,c,d.
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/vm_lab.py" run "$@"
