#!/usr/bin/env bash
set -euo pipefail

crate_name=$(rg -m 1 '^name\s*=\s*"' Cargo.toml | sed -E 's/name\s*=\s*"(.*)"/\1/')
crate_version=$(rg -m 1 '^version\s*=\s*"' Cargo.toml | sed -E 's/version\s*=\s*"(.*)"/\1/')

echo "crate: ${crate_name}"
echo "version: ${crate_version}"

echo "Running cargo fmt --check"
cargo fmt --check

echo "Running cargo clippy -- -D warnings"
cargo clippy -- -D warnings

echo "Running cargo test"
cargo test

echo "Reminder: git tag v0.1.0 && git push origin v0.1.0"
