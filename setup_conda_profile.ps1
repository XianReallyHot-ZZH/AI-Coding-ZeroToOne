$PROFILE_PATH = $PROFILE
$PROFILE_CONTENT = @"
# Auto-activate AI-ZeroToOne conda environment
conda activate AI-ZeroToOne
"@

if (-not (Test-Path $PROFILE_PATH)) {
    New-Item -ItemType File -Path $PROFILE_PATH -Force | Out-Null
}

Set-Content -Path $PROFILE_PATH -Value $PROFILE_CONTENT -Force
Write-Host "Success! Conda environment 'AI-ZeroToOne' will now be automatically activated when opening new PowerShell terminals." -ForegroundColor Green
Write-Host "Profile location: $PROFILE_PATH" -ForegroundColor Cyan
