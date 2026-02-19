#!/bin/bash

# Setup Script for Ollama on Linux/WSL
# Usage: ./setup_ollama.sh

set -e

echo "Starting Ollama Setup..."

# 1. Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

echo "Docker is installed."

# 2. Pull and Run Ollama Container
CONTAINER_NAME="ollama"
OLLAMA_PORT="11434"
MODEL_NAME="llama3"

if [ "$(docker ps -aq -f name=^/${CONTAINER_NAME}$)" ]; then
    if [ "$(docker ps -aq -f status=exited -f name=^/${CONTAINER_NAME}$)" ]; then
        echo "Starting existing Ollama container..."
        docker start $CONTAINER_NAME
    else
        echo "Ollama container is already running."
    fi
else
    echo "Creating and starting new Ollama container..."
    # Using host networking or port mapping. Port mapping is safer for WSL/Cross-platform compatibility.
    # Mounting a volume for persistent models
    docker run -d -v ollama:/root/.ollama -p $OLLAMA_PORT:11434 --name $CONTAINER_NAME ollama/ollama
fi

# 3. Wait for Ollama to be ready
echo "Waiting for Ollama API to be ready..."
MAX_RETRIES=30
COUNT=0
while ! curl -s "http://localhost:$OLLAMA_PORT" > /dev/null; do
    sleep 1
    COUNT=$((COUNT+1))
    if [ $COUNT -ge $MAX_RETRIES ]; then
        echo "Error: Timed out waiting for Ollama to start."
        exit 1
    fi
    echo -n "."
done
echo "Ollama is ready!"

# 4. Pull the Model
echo "Pulling model: $MODEL_NAME (This may take a while)..."
docker exec $CONTAINER_NAME ollama pull $MODEL_NAME

echo "Setup Complete! Ollama is running with $MODEL_NAME."
echo "Base URL: http://localhost:$OLLAMA_PORT"
