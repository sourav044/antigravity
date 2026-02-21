#!/usr/bin/env bash

# Exit on error
set -e

echo "Cleaning local Playwright test results..."
rm -rf ../test-results ../playwright-report

echo "Cleaning Docker container results and logs..."
rm -rf ../docker/container_results/*
rm -rf ../docker/logs/*

# Create .gitkeep files to maintain the folder structure in Git
touch ../docker/container_results/.gitkeep
touch ../docker/logs/.gitkeep

echo "Cleanup complete!"
