# Ultra-Light AI-Augmented Playwright Load-Testing Framework

This project is a scalable load testing framework using .NET 8, Playwright, and Reqnroll (SpecFlow).

## Architecture
- **Dev Image**: For generating tests (AI), recording traces, and validating tests (headed/headless).
- **Runner Image**: Ultra-light production image for high-scale load testing via Aspire.

## Prerequisites
- Docker
- .NET 8 SDK (optional, for local dev outside Docker)

## Project Structure
- `src/LoadRunner`: Main console application
- `docker`: Dockerfiles
- `data/locators.json`: Robust locator definitions

## Usage

### 1. Development & Validation
Use the Dev image to run tests, validate locators, or generate new features.

```bash
# Build Dev Image
docker build -f docker/Dockerfile.dev -t myloadtest:dev .

# Run Validation Test (Headed)
docker run --rm -it \
  -v ${PWD}:/app \
  -e URL_PATH=https://example.com \
  -e HEADLESS_TEST=false \
  myloadtest:dev \
  dotnet run --project src/LoadRunner -- --users 1 --duration 1
```

### 2. Production Load Test
Build the lightweight runner image and deploy.

```bash
# Build Runner Image
dotnet publish src/LoadRunner/LoadRunner.csproj -c Release -o publish
docker build -f docker/Dockerfile.runner -t myloadtest:runner .

# Run Load Test
docker run --rm \
  -e URL_PATH=https://example.com \
  -e USERS=50 \
  -e DURATION_MINUTES=10 \
  myloadtest:runner
```

## AI Agent Integration (Implemented)
The framework now uses a **Planner → Generator → Healer** architecture:
1.  **Planner**: Generates high-level Markdown test plans from requirements.
2.  **Generator**: Creates `.feature`, `Steps.cs`, `locators.json`, and `testdata.json`.
3.  **Healer**: Patches broken locators in `locators.json` without altering test intent.

Run the agent flow via:
```bash
dotnet run --project src/LoadRunner -- --generate "Verify user login"
```

## Configuration
- `.env`: Environment variables
- `locators.json`: UI element definitions with fallbacks
