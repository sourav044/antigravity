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

## Reporting Structure & Best Practices

All Playwright test output is centralized into a single `report/` folder.

### Folder Structure
```text
report/
├── playwright-report/   # Contains the final HTML report and assets used to render it.
├── blob-report/         # Contains raw binary blob reports, useful for merging results from parallel or CI runs.
└── test-results/        # Contains test artifacts (screenshots, traces, videos) generated during execution, mostly upon failure.
```

### Why a Centralized `report/` Folder?
- **Cleaner Workspace**: Avoids polluting the root directory with multiple output folders (`test-results`, `playwright-report`, `blob-report`).
- **Easier Git Management**: A single entry (`report/`) in `.gitignore` cleanly prevents all generated test artifacts from being committed.
- **Simplified Cleanup**: Pre-run scripts (like `clean.ps1`) only need to target one local directory to completely reset the test state.
- **CI/CD Friendly**: Packaging or publishing test results in CI pipelines only requires archiving the contents of a single directory.

### Running Tests and Viewing Reports

Use the following npm scripts to run tests and view the generated reports:

1. **Run Tests (Headless)**:
   ```bash
   npm run test
   ```
   This executes all tests and generates the reports inside the `report/` folder.

2. **Run Tests (UI Mode)**:
   ```bash
   npm run test:ui
   ```
   This opens Playwright's interactive UI mode for debugging and visually running tests.

3. **View the HTML Report**:
   ```bash
   npm run test:report
   ```
   This starts a local server and opens your browser to view the generated HTML report from `report/playwright-report`.
