#!/usr/bin/env bash
set -euo pipefail

check_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Missing required file: $path" >&2
    exit 1
  fi
}

check_file "docs/index.html"
check_file "docs/assets/styles.css"
check_file "docs/assets/app.js"
check_file "docs/pricing/index.html"
check_file "docs/demo/index.html"

for page in docs/index.html docs/pricing/index.html docs/demo/index.html; do
  grep -q "Home" "$page" || { echo "Navbar missing Home in $page" >&2; exit 1; }
  grep -q "Pricing" "$page" || { echo "Navbar missing Pricing in $page" >&2; exit 1; }
  grep -q "Demo" "$page" || { echo "Navbar missing Demo in $page" >&2; exit 1; }
  grep -q "GitHub" "$page" || { echo "Navbar missing GitHub in $page" >&2; exit 1; }
  done

grep -q "Convert" docs/demo/index.html || { echo "Demo page missing Convert button" >&2; exit 1; }

grep -q "Patient view" docs/demo/index.html || { echo "Demo page missing Patient view tab" >&2; exit 1; }

grep -q "Clinician view" docs/demo/index.html || { echo "Demo page missing Clinician view tab" >&2; exit 1; }

echo "Docs smoke checks passed."
