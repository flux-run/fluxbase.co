import { NextResponse } from "next/server";

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
TAG="$(curl -fsSL "https://api.github.com/repos/\${REPO}/releases/latest" \
  | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": "\\(.*\\)".*/\\1/')"

if [ -z "$TAG" ]; then
  echo "Could not determine latest release tag." >&2
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
echo "  flux init my-app"
echo "  cd my-app && flux dev"
`;

export async function GET() {
  return new NextResponse(INSTALL_SCRIPT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
