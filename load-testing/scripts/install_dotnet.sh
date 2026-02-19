#!/bin/bash

# Setup Script for .NET 8.0 on Linux/WSL (Ubuntu/Debian)
# Usage: ./install_dotnet.sh

set -e

echo "Starting .NET SDK 8.0 Installation..."

# 1. Update package list and install prerequisites
echo "Updating package lists..."
sudo apt-get update
sudo apt-get install -y wget apt-transport-https software-properties-common

# 2. Add Microsoft package signing key and repository
# Detect Ubuntu version to select correct repository
# Using the generic method or specific version check if needed.
# For simplicity and broad compatibility, we'll try the direct Microsoft feed registration.

UBUNTU_VERSION=$(lsb_release -rs)
echo "Detected Ubuntu version: $UBUNTU_VERSION"

wget https://packages.microsoft.com/config/ubuntu/$UBUNTU_VERSION/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb

# 3. Install .NET SDK
echo "Installing .NET SDK 8.0..."
sudo apt-get update
sudo apt-get install -y dotnet-sdk-8.0

# 4. Verify Installation
echo "Verifying installation..."
dotnet --version

echo "Installation Complete! .NET 8.0 is ready to use."
