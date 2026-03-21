import { NextResponse } from "next/server";
import { captureInstallEvent } from "../../lib/posthog-server";

const REPO = "flux-run/flux";

const INSTALL_SCRIPT = `#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO}"
BIN_NAME="flux"
INSTALL_DIR="/usr/local/bin"

# ── Detect OS and arch ─────────────────────────────────────────────────────
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux)  OS_LABEL="linux" ;;
  Darwin) OS_LABEL="macos" ;;
  *)
    echo "Unsupported OS: $OS" >&2
    exit 1
    ;;
esac

case "$ARCH" in
  x86_64 | amd64)  ARCH_LABEL="amd64" ;;
  aarch64 | arm64) ARCH_LABEL="arm64" ;;
  *)
    echo "Unsupported architecture: $ARCH" >&2
    exit 1
    ;;
esac

# ── Resolve latest release tag ─────────────────────────────────────────────
echo "Fetching latest flux release..."
API_RESPONSE="\$(curl -sSL "https://api.github.com/repos/\${REPO}/releases/latest")"
TAG="\$(echo "\$API_RESPONSE" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": "\\(.*\\)".*/\\1/')"

if [ -z "\$TAG" ]; then
  echo "" >&2
  echo "Error: no published release found for \${REPO}." >&2
  echo "Check https://github.com/\${REPO}/releases or try again shortly." >&2
  exit 1
fi

echo "Installing flux \${TAG} (\${OS_LABEL}/\${ARCH_LABEL})..."

# ── Download and Install Flux CLI ──────────────────────────────────────────
ASSET="flux-\${OS_LABEL}-\${ARCH_LABEL}"
URL="https://github.com/\${REPO}/releases/download/\${TAG}/\${ASSET}"
TMP="\$(mktemp)"
curl -fsSL "\$URL" -o "\$TMP"
chmod +x "\$TMP"

if [ -w "\$INSTALL_DIR" ]; then
  mv "\$TMP" "\${INSTALL_DIR}/\${BIN_NAME}"
else
  sudo mv "\$TMP" "\${INSTALL_DIR}/\${BIN_NAME}"
fi

# ── Download and Install Flux Runtime ──────────────────────────────────────
RUNTIME_ASSET="flux-runtime-\${OS_LABEL}-\${ARCH_LABEL}"
RUNTIME_URL="https://github.com/\${REPO}/releases/download/\${TAG}/\${RUNTIME_ASSET}"
RUNTIME_TMP="\$(mktemp)"
if curl -fsSL "\$RUNTIME_URL" -o "\$RUNTIME_TMP"; then
  chmod +x "\$RUNTIME_TMP"
  if [ -w "\$INSTALL_DIR" ]; then
    mv "\$RUNTIME_TMP" "\${INSTALL_DIR}/flux-runtime"
  else
    sudo mv "\$RUNTIME_TMP" "\${INSTALL_DIR}/flux-runtime"
  fi
else
  echo "Warning: failed to download flux-runtime asset."
fi

echo ""
echo "✓ flux \${TAG} installed to \${INSTALL_DIR}/\${BIN_NAME}"
echo "✓ flux-runtime installed to \${INSTALL_DIR}/flux-runtime"
echo ""
echo "Get started:"
echo "  mkdir my-app && cd my-app"
echo "  flux init"
echo "  flux dev"

echo ""
echo -n "Would you like to set up a local Flux server using Docker? (y/N) "
if [ -t 0 ] || [ -c /dev/tty ]; then
  read -r SETUP_SERVER </dev/tty || true
fi

if [[ "\${SETUP_SERVER:-}" =~ ^[Yy]$ ]]; then
  echo "Downloading docker-compose.yml..."
  if curl -fsSL "https://raw.githubusercontent.com/flux-run/flux/main/docker-compose.yml" -o docker-compose.yml; then
    if command -v docker >/dev/null 2>&1; then
      echo "Starting Flux server and Postgres..."
      if docker compose version >/dev/null 2>&1; then
        docker compose up -d
      else
        docker-compose up -d
      fi
      
      echo "Configuring local authentication..."
      mkdir -p "\$HOME/.flux"
      if [ ! -f "\$HOME/.flux/config.toml" ]; then
        cat > "\$HOME/.flux/config.toml" <<EOF
url = "http://localhost:4000"
token = "local-development-token"
EOF
        echo "✓ CLI authenticated to local server!"
      else
        echo "Note: ~/.flux/config.toml already exists. Skipping auto-authentication."
      fi
      
      echo "✓ Flux server is running in the background!"
    else
      echo "Docker is not installed. You can start the server later by running 'docker compose up -d' in this directory."
    fi
  else
    echo "Failed to download docker-compose.yml"
  fi
fi
`;

export async function GET(request: Request) {
  // Fire-and-forget — don't block the script download
  void captureInstallEvent("cli_install_download", {
    platform: "unix",
    referrer: request.headers.get("referer") ?? undefined,
    user_agent: request.headers.get("user-agent") ?? undefined,
  });

  return new NextResponse(INSTALL_SCRIPT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
