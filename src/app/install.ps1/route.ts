import { NextResponse } from "next/server";
import { captureInstallEvent } from "../../lib/posthog-server";

const REPO = "flux-run/flux";

const INSTALL_SCRIPT = `# Flux installer for Windows
# Usage: irm https://fluxbase.co/install.ps1 | iex

$ErrorActionPreference = 'Stop'

$Repo = "${REPO}"
$BinName = "flux.exe"
$InstallDir = "$env:LOCALAPPDATA\\flux\\bin"

# ── Detect arch ────────────────────────────────────────────────────────────
$Arch = if ([System.Environment]::Is64BitOperatingSystem) {
  if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'amd64' }
} else {
  Write-Error "32-bit Windows is not supported."
  exit 1
}

$Asset = "flux-windows-$Arch.exe"

# ── Resolve latest release tag ─────────────────────────────────────────────
Write-Host "Fetching latest flux release..."
$Release = Invoke-RestMethod "https://api.github.com/repos/$Repo/releases/latest"
$Tag = $Release.tag_name

if (-not $Tag) {
  Write-Error "Could not determine latest release tag."
  exit 1
}

Write-Host "Installing flux $Tag (windows/$Arch)..."

# ── Download ───────────────────────────────────────────────────────────────
$Url = "https://github.com/$Repo/releases/download/$Tag/$Asset"
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$Dest = Join-Path $InstallDir $BinName
Invoke-WebRequest -Uri $Url -OutFile $Dest

# ── Add to PATH (user scope) ───────────────────────────────────────────────
$CurrentPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
if ($CurrentPath -notlike "*$InstallDir*") {
  [System.Environment]::SetEnvironmentVariable(
    "PATH", "$InstallDir;$CurrentPath", "User"
  )
  Write-Host ""
  Write-Host "Added $InstallDir to your PATH."
  Write-Host "Restart your terminal for the change to take effect."
}

Write-Host ""
Write-Host "v flux $Tag installed to $Dest"
Write-Host ""
Write-Host "Get started:"
Write-Host "  flux init my-app"
Write-Host "  cd my-app; flux dev"
`;

export async function GET(request: Request) {
  // Fire-and-forget — don't block the script download
  void captureInstallEvent("cli_install_download", {
    platform: "windows",
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
