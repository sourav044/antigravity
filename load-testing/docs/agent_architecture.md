# Agentic Architecture: Planner → Generator → Healer

This framework employs a 3-agent architecture to ensure robust, healable, and human-readable tests.

## 1. Planner Agent
- **Role**: Architect & Strategist.
- **Input**: User requirement (e.g., "Login test").
- **Output**: High-level Markdown Plan.
- **Responsibility**: Explores the requirement and outlines scenarios without writing code.

## 2. Generator Agent
- **Role**: Builder.
- **Input**: Markdown Plan + DOM Snapshot (via MCP).
- **Output**: 
    - `.feature` files (Locked Intent).
    - `Steps.cs` (Implementation Glue).
    - `locators.json` (Resilient Selectors).
    - `testdata.json` (Separated Data).
- **Responsibility**: Converts the plan into executable artifacts, ensuring separation of concerns.

## 3. Healer Agent
- **Role**: Mechanic.
- **Input**: Failed Test Log + Page Source.
- **Output**: Patched `locators.json`.
- **Constraint**: NEVER rewrites the Feature file (Intent). Only fixes the "how", not the "what".

## Data Separation
- **Features**: Describe *what* happens.
- **Steps**: Describe *how* it interacts.
- **Locators**: Describe *where* elements are.
- **Data**: Describes *with what* values.

## Usage
Run the generation flow via:
```bash
dotnet run --project src/LoadRunner -- --generate "Verify user login"
```
