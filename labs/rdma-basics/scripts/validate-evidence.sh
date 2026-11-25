#!/usr/bin/env bash
set -euo pipefail
# Optionally pass an evidence directory name. The default is reference-run.
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/validate_evidence.py" "$@"
