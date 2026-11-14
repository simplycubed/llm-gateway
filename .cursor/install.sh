#!/usr/bin/env bash
# Cloud Agent install for simplycubed/llm-gateway. Idempotent. Non-interactive.
# Hermetic library: no Postgres, no wrangler CLI, no submodules.
set -euo pipefail

# .nvmrc is major 24; this patch pin matches Vendor Watch. Bump when that major changes.
NODE_VERSION=24.22.1
# package.json#packageManager
PNPM_VERSION=11.5.2

export PATH="/usr/local/bin:${PATH}"
export COREPACK_HOME="${COREPACK_HOME:-/usr/local/share/corepack}"

if ! command -v curl >/dev/null 2>&1 || ! command -v xz >/dev/null 2>&1; then
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    xz-utils
fi

if ! /usr/local/bin/node -v 2>/dev/null | grep -qx "v${NODE_VERSION}"; then
  tmp="$(mktemp)"
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o "${tmp}"
  sudo tar -xJf "${tmp}" -C /usr/local --strip-components=1 --no-same-owner
  rm -f "${tmp}"
fi

sudo mkdir -p "${COREPACK_HOME}"
sudo chown "$(id -un):$(id -gn)" "${COREPACK_HOME}"

sudo /usr/local/bin/corepack enable
corepack prepare "pnpm@${PNPM_VERSION}" --activate

sudo tee /etc/profile.d/llm-gateway-path.sh >/dev/null <<'EOF'
export PATH="/usr/local/bin:${PATH}"
export COREPACK_HOME="${COREPACK_HOME:-/usr/local/share/corepack}"
EOF
marker="# llm-gateway node 24"
if ! grep -q "${marker}" "${HOME}/.bashrc" 2>/dev/null; then
  cat >> "${HOME}/.bashrc" <<'EOF'
# llm-gateway node 24 — after nvm and cargo, so this image's Node 22 is not first
export PATH="/usr/local/bin:${PATH}"
export COREPACK_HOME="${COREPACK_HOME:-/usr/local/share/corepack}"
EOF
fi

cd "$(dirname "$0")/.."
# Matches .github/workflows/ci.yml
pnpm install --frozen-lockfile --trust-lockfile

echo "Gate: pnpm check   (lint + typecheck + test:coverage + build + no-provider-literals)"
