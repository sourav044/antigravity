import { BaseAgent } from './base-agent';

export class PlannerAgent extends BaseAgent {

    async createTestPlan(requirement: string): Promise<string> {
        const systemPrompt = "You are a QA Test Planner. Create a high-level test plan based on the user requirement.";

        // Return mock immediately if we know there is no backend, 
        // but the base class handles errors.
        const response = await this.prompt(systemPrompt, requirement);

        // Emulate the mock response from C# version if the LLM fails or is mocked
        if (response.startsWith("Mock response")) {
            return `## Test Plan: ${requirement.substring(0, Math.min(20, requirement.length))}...
- **Objective**: Validate user flow for ${requirement}
- **Scenarios**:
  1. Happy Path: User completes action successfully.
  2. Edge Case: User enters invalid data.
- **Data Requirements**: Valid user credentials, test data set A.`;
        }

        return response;
    }
}
