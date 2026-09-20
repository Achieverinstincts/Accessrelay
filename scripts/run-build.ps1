$ErrorActionPreference = 'Continue'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
& npm.cmd run build *> .codex-build.log
$LASTEXITCODE | Set-Content -LiteralPath .codex-build.exit -Encoding ascii
