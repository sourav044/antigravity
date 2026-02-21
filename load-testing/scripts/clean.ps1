# Exit on error
$ErrorActionPreference = "Stop"

# Use the script's directory to reliably find the project root
$rootDir = Split-Path $PSScriptRoot -Parent

Write-Host "Cleaning local Playwright test results..."
if (Test-Path -Path "$rootDir\report") { Remove-Item -Recurse -Force -Path "$rootDir\report" }

Write-Host "Cleaning Docker container results and logs..."
if (Test-Path -Path "$rootDir\docker\container_results\*") { Remove-Item -Recurse -Force -Path "$rootDir\docker\container_results\*" }
if (Test-Path -Path "$rootDir\docker\logs\*") { Remove-Item -Recurse -Force -Path "$rootDir\docker\logs\*" }

# Create .gitkeep files to maintain the folder structure in Git
if (!(Test-Path -Path "$rootDir\docker\container_results")) { New-Item -ItemType Directory -Force -Path "$rootDir\docker\container_results" | Out-Null }
if (!(Test-Path -Path "$rootDir\docker\logs")) { New-Item -ItemType Directory -Force -Path "$rootDir\docker\logs" | Out-Null }
New-Item -ItemType File -Force -Path "$rootDir\docker\container_results\.gitkeep" | Out-Null
New-Item -ItemType File -Force -Path "$rootDir\docker\logs\.gitkeep" | Out-Null

Write-Host "Cleanup complete!" -ForegroundColor Green
