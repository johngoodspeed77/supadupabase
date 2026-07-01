#Requires -Version 5.1
# Trigger remote deploy from Windows (away from home LAN).
# Usage: .\scripts\remote-deploy.ps1 [-Target supadupabase|timesheet|both] [-Migrate]

param(
  [ValidateSet('supadupabase', 'timesheet', 'both')]
  [string]$Target = 'supadupabase',
  [switch]$Migrate
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $Root '.env.remote'

if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
    $name, $value = $_ -split '=', 2
    if (-not $env:$name) { Set-Item -Path "env:$name" -Value $value.Trim().Trim('"').Trim("'") }
  }
}

if (-not $env:DEPLOY_HOOK_SECRET) {
  Write-Error 'Set DEPLOY_HOOK_SECRET in .env.remote or environment'
}

$argsList = @('--target', $Target)
if ($Migrate) { $argsList += '--migrate' }

& node (Join-Path $Root 'scripts\remote-deploy.mjs') @argsList
