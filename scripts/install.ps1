# Install ArchLens CLI from GitHub releases (Windows).
# Usage: irm https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.ps1 | iex
param(
    [string]$Dir = "",
    [string]$Version = "",
    [switch]$Uninstall,
    [switch]$Help
)

$ErrorActionPreference = "Stop"
$GithubRepo = if ($env:ARCHLENS_GITHUB_REPO) { $env:ARCHLENS_GITHUB_REPO } else { "mzworthington/archlens" }

function Show-Usage {
    Write-Host @"
ArchLens install script (Windows)

Usage:
  install.ps1 [-Dir <path>] [-Version <tag>] [-Uninstall]

Options:
  -Dir <path>       Install directory (default: %USERPROFILE%\.local\bin)
  -Version <tag>    Install a specific release (e.g. v0.1.5)
  -Uninstall        Remove archlens.exe and bundled tree-sitter WASMs
  -Help             Show this help
"@
}

if ($Help) {
    Show-Usage
    exit 0
}

function Get-InstallDir {
    if ($Dir) { return $Dir }
    if ($env:ARCHLENS_INSTALL_DIR) { return $env:ARCHLENS_INSTALL_DIR }
    return Join-Path $env:USERPROFILE ".local\bin"
}

function Remove-Install([string]$InstallDir) {
    $removed = $false
    $exe = Join-Path $InstallDir "archlens.exe"
    if (Test-Path $exe) {
        Remove-Item -Force $exe
        $removed = $true
    }
    Get-ChildItem -Path $InstallDir -Filter "tree-sitter-*.wasm" -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-Item -Force $_.FullName
        $removed = $true
    }
    if (-not $removed) {
        Write-Error "No ArchLens install found in $InstallDir"
    }
    Write-Host "Removed ArchLens from $InstallDir"
}

function Get-ReleaseTag {
    if ($Version) { return $Version }
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$GithubRepo/releases/latest"
    return $response.tag_name
}

function Verify-Checksum([string]$ArchivePath, [string]$AssetName, [string]$Tag) {
    $checksumsUrl = "https://github.com/$GithubRepo/releases/download/$Tag/checksums.txt"
    try {
        $content = Invoke-WebRequest -Uri $checksumsUrl -UseBasicParsing | Select-Object -ExpandProperty Content
    } catch {
        return
    }
    $expected = $null
    foreach ($line in ($content -split "`n")) {
        $parts = $line.Trim() -split '\s+', 2
        if ($parts.Count -eq 2 -and $parts[1] -eq $AssetName) {
            $expected = $parts[0]
            break
        }
    }
    if (-not $expected) { return }

    $actual = (Get-FileHash -Algorithm SHA256 -Path $ArchivePath).Hash.ToLower()
    if ($actual -ne $expected.ToLower()) {
        throw "Checksum mismatch for $AssetName"
    }
    Write-Host "Checksum verified"
}

function Install-Archlens {
    $installDir = Get-InstallDir
    if ($Uninstall) {
        Remove-Install $installDir
        return
    }

    New-Item -ItemType Directory -Force -Path $installDir | Out-Null
    $asset = "archlens-windows-x64.zip"
    $tag = Get-ReleaseTag
    $url = "https://github.com/$GithubRepo/releases/download/$tag/$asset"
    $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("archlens-install-" + [guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null

    try {
        Write-Host "Downloading $url"
        $zipPath = Join-Path $tmp $asset
        Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
        Verify-Checksum $zipPath $asset $tag
        Expand-Archive -Path $zipPath -DestinationPath $tmp -Force
        Copy-Item -Force (Join-Path $tmp "archlens.exe") (Join-Path $installDir "archlens.exe")
        Get-ChildItem -Path $tmp -Filter "tree-sitter-*.wasm" | ForEach-Object {
            Copy-Item -Force $_.FullName (Join-Path $installDir $_.Name)
        }
    } finally {
        Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
    }

    $exe = Join-Path $installDir "archlens.exe"
    Write-Host ""
    Write-Host "Installed archlens to $exe"
    if (Test-Path $exe) {
        $ver = & $exe --version 2>$null
        if ($ver) { Write-Host "Version: $ver" }
    }

    $pathEntries = $env:PATH -split ';'
    if ($pathEntries -notcontains $installDir) {
        Write-Host @"

Add ArchLens to your PATH:

  setx PATH "$installDir;%PATH%"

Restart your terminal after updating PATH.
"@
    }
}

Install-Archlens
