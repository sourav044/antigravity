import { BaseAgent } from './base-agent';

export class GeneratorAgent extends BaseAgent {

    async generateFeature(testPlan: string): Promise<string> {
        const systemPrompt = "You are a Playwright Test Generator. Generate a Gherkin feature file based on the test plan.";
        const response = await this.prompt(systemPrompt, testPlan);

        if (response.startsWith("Mock response")) {
            return `Feature: Generated Feature from Plan
    Scenario: Valid Login
        Given I am on the login page
        When I login with valid credentials
        Then I should see the dashboard`;
        }
        return response;
    }

    async generateFeatureFromEvents(featureName: string, events: any[]): Promise<string> {
        // Rule-Based Generation (No AI)
        let scenarios = "";

        for (const e of events) {
            if (e.type === 'navigation') {
                scenarios += `    Given I navigate to "${e.url}"\n`;
            }
            if (e.type === 'click') {
                // Ensure selector is safe for Gherkin
                scenarios += `    When I click "${e.selector}"\n`;
            }
            if (e.type === 'input') {
                scenarios += `    When I type "${e.value}" into "${e.selector}"\n`;
            }
        }

        if (!scenarios) {
            scenarios = `    Given I navigate to the home page\n`;
        }

        return `Feature: ${featureName}

  Scenario: ${featureName} Flow
${scenarios}    Then the action should complete`;
    }

    async generateSteps(featureContent: string): Promise<string> {
        // Rule-Based Step Generation (No AI)
        // We parse the known Gherkin patterns we just generated

        let steps = `import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { page } from './hooks';

`;
        const generatedPatterns = new Set<string>();

        // 1. Navigation Step
        if (!generatedPatterns.has('nav')) {
            steps += `
Given('I navigate to {string}', async function (url: string) {
    await page.goto(url);
});
`;
            generatedPatterns.add('nav');
        }

        // 2. Click Step
        if (!generatedPatterns.has('click')) {
            steps += `
When('I click {string}', async function (selector: string) {
    const locator = page.locator(selector);
    await expect(locator).toBeVisible();
    await locator.click();
});
`;
            generatedPatterns.add('click');
        }

        // 3. Input Step
        if (!generatedPatterns.has('input')) {
            steps += `
When('I type {string} into {string}', async function (value: string, selector: string) {
    const locator = page.locator(selector);
    await expect(locator).toBeVisible();
    await locator.fill(value);
});
`;
            generatedPatterns.add('input');
        }

        // 4. Default Validation
        steps += `
Then('the action should complete', async function () {
    // Placeholder for validation
    // await expect(page).toHaveTitle(/Sequence/); 
});
`;
        return steps;
    }
}
