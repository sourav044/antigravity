# Project Workflows & Architecture

This document visualizes the architecture and workflows of the **Ultra-Light AI-Augmented Playwright Load-Testing Framework**.

## 1. High-Level System Architecture

This diagram shows how the Dev and Runner images interact with the core components.

```mermaid
flowchart TD
    subgraph Dev_Environment ["Dev Image (Generation + Validation)"]
        User[User / CI] -->|Request: 'Verify Login'| Orchestrator[Agent Orchestrator]
        Orchestrator --> Planner[Planner Agent]
        Planner -->|Markdown Plan| Generator[Generator Agent]
        Generator -->|Creates| Artifacts
        
        subgraph Artifacts ["Generated Artifacts"]
            Feature[.feature File]
            Steps[Steps.cs]
            Locators[locators.json (Unified)]
        end
        
        User -->|Run Validation| TestRunner[Local Test Runner]
        Artifacts --> TestRunner
        TestRunner -->|Browser| App[Target Application]
    end

    subgraph Prod_Environment ["Runner Image (Load Testing)"]
        Aspire[Aspire / Orchestrator] -->|Scale to 50x| Runner[Lite Runner Instance]
        Artifacts -->|Copy| Runner
        Runner -->|Headless Load| App
        Runner -->|Metrics| Report[CSV/HTML Report]
    end
```

## 2. Agent Generation Workflow (The "Yes" to your question)

This workflow confirms that your code (`GeneratorAgent`) is responsible for creating all necessary files for a new use case.

```mermaid
sequenceDiagram
    participant User
    participant CLI as Program.cs
    participant Plan as Planner Agent
    participant Gen as Generator Agent
    participant FS as File System

    User->>CLI: dotnet run -- --generate "Verify Checkout"
    CLI->>Plan: CreateTestPlanAsync("Verify Checkout")
    Plan-->>CLI: Returns Markdown Plan
    
    CLI->>Gen: GenerateFeatureAsync(Plan)
    Gen-->>FS: Writes LoadTest.feature
    
    CLI->>Gen: GenerateStepsAsync(Feature)
    Gen-->>FS: Writes LoadSteps.cs
    
    CLI->>Gen: GenerateLocatorsAsync(Snapshot)
    Gen-->>FS: Writes locators.json (with values)
    
    Note over Gen, FS: YES, the code generates all 3 key files!
```

## 3. Unified Locator Model

This diagram explains how the single `locators.json` file drives both the UI interaction and the Data input, removing the need for a separate data file.

```mermaid
classDiagram
    class LocatorJson {
        +string ID
        +string Primary (Selector)
        +List Fallbacks
        +string Value (Test Data)
    }

    class LoadSteps {
        +FillElementAsync(id)
        +ClickElementAsync(id)
    }

    class Playwright {
        +Locator(selector)
        +FillAsync(value)
    }

    LocatorJson <|-- LoadSteps : Read Mapping
    LoadSteps --> Playwright : Execute
    
    note for LoadSteps "Uses 'Primary' to find element\nUses 'Value' to type text"
```
