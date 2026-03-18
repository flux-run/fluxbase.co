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

ASSET="\${BIN_NAME}-\${OS_LABEL}-\${ARCH_LABEL}"

# ── Resolve latest release tag ─────────────────────────────────────────────
echo "Fetching latest flux release..."
API_RESPONSE="$(curl -sSL "https://api.github.com/repos/\${REPO}/releases/latest")"
TAG="$(echo "\$API_RESPONSE" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": "\\(.*\\)".*/\\1/')"

if [ -z "$TAG" ]; then
  echo "" >&2
  echo "Error: no published release found for \${REPO}." >&2
  echo "Check https://github.com/\${REPO}/releases or try again shortly." >&2
  exit 1
fi

echo "Installing flux \${TAG} (\${OS_LABEL}/\${ARCH_LABEL})..."

# ── Download ───────────────────────────────────────────────────────────────
URL="https://github.com/\${REPO}/releases/download/\${TAG}/\${ASSET}"
TMP="$(mktemp)"
curl -fsSL "\$URL" -o "\$TMP"
chmod +x "\$TMP"

# ── Install ────────────────────────────────────────────────────────────────
if [ -w "\$INSTALL_DIR" ]; then
  mv "\$TMP" "\${INSTALL_DIR}/\${BIN_NAME}"
else
  sudo mv "\$TMP" "\${INSTALL_DIR}/\${BIN_NAME}"
fi

echo ""
echo "✓ flux \${TAG} installed to \${INSTALL_DIR}/\${BIN_NAME}"
echo ""
echo "Get started:"
echo "  mkdir my-app && cd my-app"
echo "  flux init"
echo "  flux dev"

echo ""
echo -n "Would you like to set up a local Flux server using Docker? (y/N) "
if [ -t 0 ] || [ -c /dev/tty ]; then
  exec < /dev/tty || true
  read -r SETUP_SERVER || true
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
