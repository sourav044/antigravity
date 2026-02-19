# Build and Run Guide

Complete guide for building and running the load testing framework across different environments.

## Prerequisites

### Required
- **Docker**: For containerized development and deployment
- **Git**: For version control

### Optional (for local development)
- **.NET 8 SDK**: For building and running outside Docker
- **Node.js**: If you plan to extend or customize Playwright scripts

## Quick Start

### Windows (Current Environment)

1. **Setup Ollama (AI Agent Backend)**
   ```powershell
   docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
   docker exec ollama ollama pull llama3
   ```

2. **Build and Run Locally** (if .NET SDK installed)
   ```powershell
   dotnet restore
   dotnet build
   dotnet run --project src/LoadRunner/LoadRunner.csproj
   ```

3. **Run AI Agent Generation**
   ```powershell
   dotnet run --project src/LoadRunner/LoadRunner.csproj -- --generate "Login test"
   ```

### Linux / WSL

1. **Environment Setup**
   ```bash
   # Install .NET 8 SDK
   cd scripts
   chmod +x install_dotnet.sh
   ./install_dotnet.sh
   
   # Setup Ollama
   chmod +x setup_ollama.sh
   ./setup_ollama.sh
   ```

2. **Build and Run**
   ```bash
   dotnet restore
   dotnet build
   dotnet run --project src/LoadRunner/LoadRunner.csproj
   ```

## Docker Workflow

### Development Container

Build and use the development container for validation and testing:

```bash
# Build dev image
docker build -f docker/Dockerfile.dev -t loadtest:dev .

# Run interactive development
docker run --rm -it \
  -v ${PWD}:/app \
  -e URL_PATH=https://your-app.com \
  -e HEADLESS_TEST=true \
  loadtest:dev \
  dotnet run --project src/LoadRunner
```

### Production Runner Container

For high-scale load testing:

```bash
# Publish the application
dotnet publish src/LoadRunner/LoadRunner.csproj -c Release -o publish

# Build runner image
docker build -f docker/Dockerfile.runner -t loadtest:runner .

# Run load test
docker run --rm \
  -e URL_PATH=https://your-app.com \
  -e USERS=100 \
  -e DURATION_MINUTES=30 \
  loadtest:runner
```

## Configuration

All configuration is managed through the `.env` file:

```env
# Application Settings
URL_PATH=https://your-app.com
DATA_ID_VALUE_PATH=/app/data/locators.json
HEADLESS_TEST=true
USERS=30
DURATION_MINUTES=15

# AI/Ollama Settings
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

## Common Commands

### Local Development

```bash
# Build
dotnet build

# Run tests
dotnet test

# Run load test (1 user, 1 minute)
dotnet run --project src/LoadRunner/LoadRunner.csproj

# Run with custom parameters
dotnet run --project src/LoadRunner/LoadRunner.csproj -- --users 50 --duration 10

# Generate feature with AI
dotnet run --project src/LoadRunner/LoadRunner.csproj -- --generate "User registration flow"
```

### Docker Development

```bash
# Build images
docker build -f docker/Dockerfile.dev -t loadtest:dev .
docker build -f docker/Dockerfile.runner -t loadtest:runner .

# Run validation test
docker run --rm loadtest:dev dotnet test

# Interactive shell
docker run --rm -it loadtest:dev bash
```

## Troubleshooting

### .NET SDK Not Found
- **Windows**: Download from [dotnet.microsoft.com](https://dotnet.microsoft.com/download)
- **Linux/WSL**: Run `./scripts/install_dotnet.sh`

### Ollama Connection Issues
- Verify Ollama is running: `curl http://localhost:11434/`
- Check Docker container: `docker ps | grep ollama`
- View logs: `docker logs ollama`

### Docker Build Issues
- Ensure Docker is running
- Clean build: `docker build --no-cache -f docker/Dockerfile.dev -t loadtest:dev .`
- Check disk space: `docker system df`

### Playwright Browser Issues
- Install browsers: `pwsh bin/Debug/net8.0/playwright.ps1 install`
- Or in Docker: Already included in the base image

## Project Structure

```
load-testing/
├── src/LoadRunner/          # Main application
│   ├── AI/                  # Agent orchestration
│   ├── Core/                # Config, locators, reporting
│   ├── Features/            # Gherkin feature files
│   └── Steps/               # Step definitions
├── docker/                  # Docker configurations
├── scripts/                 # Setup scripts
├── data/                    # Test data and locators
└── docs/                    # Documentation
```

## Next Steps

- Review [agent_architecture.md](./agent_architecture.md) for AI agent details
- Check [workflows.md](./workflows.md) for testing workflows
- See [ollama_setup.md](../ollama_setup.md) in the brain directory for detailed Ollama configuration
