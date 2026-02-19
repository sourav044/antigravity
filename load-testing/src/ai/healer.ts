import { BaseAgent } from './base-agent';

export class HealerAgent extends BaseAgent {

    async healLocator(locatorId: string, pageSource: string): Promise<string> {
        const systemPrompt = "You are a Self-Healing QA Agent. Find the new valid CSS selector for the element based on the page source.";
        const userPrompt = `Locator ID: ${locatorId}\nPage Source Snippet: ${pageSource.substring(0, 500)}`; // Truncate for token limits

        const response = await this.prompt(systemPrompt, userPrompt);

        if (response.startsWith("Mock response")) {
            return JSON.stringify({
                id: locatorId,
                primary: "#new-id-found-by-ai",
                fallbacks: ["//button[contains(text(), 'Submit')]"],
                score: 0.95
            }, null, 2);
        }
        return response;
    }
}
