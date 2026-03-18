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
Write-Host "  mkdir my-app; cd my-app"
Write-Host "  flux init"
Write-Host "  flux dev"

Write-Host ""
$SetupServer = Read-Host "Would you like to set up a local Flux server using Docker? (y/N)"
if ($SetupServer -match "^[Yy]$") {
  Write-Host "Downloading docker-compose.yml..."
  Invoke-WebRequest -Uri "https://raw.githubusercontent.com/flux-run/flux/main/docker-compose.yml" -OutFile "docker-compose.yml"
  if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Starting Flux server and Postgres..."
    Start-Process -NoNewWindow -Wait docker -ArgumentList "compose","up","-d"
    Write-Host "v Flux server is running in the background!"
  } else {
    Write-Host "Docker is not installed. You can start the server later by running 'docker compose up -d' in this directory."
  }
}
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
