import { BaseAgent } from './base-agent';

export class GeneratorAgent extends BaseAgent {

    async generatePlaywrightSpec(featureName: string, events: any[]): Promise<string> {
        let testBody = "";
        const config = (await import('../core/config')).Config;
        const { LocatorMap } = await import('../core/locator-map');

        // Ensure map is loaded
        await LocatorMap.load(config.DataIdValuePath);

        let stepCount = 1;

        if (events.length > 0 && events[0].type !== 'navigation' && events[0].type !== 'url-change') {
            testBody += `
    await test.step('Initial Navigation', async () => {
        await page.goto('${config.UrlPath}');
    });`;
        }

        for (const e of events) {
            if (e.type === 'navigation') {
                testBody += `
    await test.step('Navigate to ${e.url}', async () => {
        await page.goto('${e.url}');
    });`;
            } else if (e.type === 'url-change') {
                testBody += `
    await test.step('URL changed to ${e.url}', async () => {
        await expect(page).toHaveURL('${e.url}');
    });`;
            } else if (e.type === 'manual') {
                // Parse curly brace selectors and convert to playwright locators where possible
                // e.g. {#id} -> #id, {.class} -> .class, {div > span} -> div > span
                let selector = e.selector || '';
                const match = selector.match(/^\{(.+)\}$/);
                if (match) {
                    selector = match[1];
                }

                testBody += `
    await test.step('Manual Step: ${e.value}', async () => {
        // Manual Action: ${e.value} on ${selector}
        const locator = page.locator('${selector}');
        await expect(locator).toBeVisible({ timeout: 15000 });
        await locator.click(); // Defaulting manual step to click. User should edit this block.
    });`;
            } else if (e.type === 'click' || e.type === 'input' || e.type === 'drag-select') {
                // Generate a semantic key
                const cleanFeature = featureName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                const key = `${cleanFeature}_${e.type}_${stepCount++}`;

                // Register to LocatorMap
                LocatorMap.register(key, e.selector, e.value);

                if (e.type === 'click') {
                    testBody += `
    await test.step('Click ${key}', async () => {
        // Strategy used: ${e.selectorType || 'CSS'}
        const selector = LocatorMap.getPlaywrightSelector('${key}', '${e.selector}');
        await expect(page.locator(selector).first()).toBeVisible({ timeout: 15000 });
        await page.locator(selector).first().click();
    });`;
                } else if (e.type === 'input') {
                    testBody += `
    await test.step('Type into ${key}', async () => {
        // Strategy used: ${e.selectorType || 'CSS'}
        const selector = LocatorMap.getPlaywrightSelector('${key}', '${e.selector}');
        const expectedValue = LocatorMap.getExpectedValue('${key}', '${e.value}');
        const locator = page.locator(selector).first();
        await expect(locator).toBeVisible({ timeout: 15000 });
        try {
            await locator.fill(expectedValue);
            await expect(locator).toHaveValue(expectedValue, { timeout: 5000 });
        } catch (error) {
            // Fallback for custom web components that aren't native inputs
            await locator.click();
            await locator.pressSequentially(expectedValue);
        }
    });`;
                } else if (e.type === 'drag-select') {
                    // Logic to simulate text selection 
                    testBody += `
    await test.step('Drag Select text inside ${key}', async () => {
        // Strategy used: ${e.selectorType || 'CSS'}
        const selector = LocatorMap.getPlaywrightSelector('${key}', '${e.selector}');
        const locator = page.locator(selector).first();
        await expect(locator).toBeVisible({ timeout: 15000 });
        
        // Simulating double-click to select text, or evaluate selection
        await locator.dblclick(); 
        
        // Log selected text for verification
        console.log(\`Selected text: "${e.value}" inside \$\{selector\}\`);
    });`;
                }
            }
        }

        // Save updated map
        await LocatorMap.save(config.DataIdValuePath);

        if (!testBody) {
            testBody += `
    await test.step('Navigate to initial URL', async () => {
        await page.goto('${config.UrlPath}');
    });`;
        }

        return `import { test, expect } from '@playwright/test';
import { LocatorMap } from '../core/locator-map';

// Load locators (ensure this runs before tests, or use a fixture)
// For simplicity in this generated file, we'll assume global load or load in beforeAll
test.beforeAll(async () => {
    await LocatorMap.load('${config.DataIdValuePath.replace(/\\/g, '/')}');
});

test('${featureName}', async ({ page }) => {
${testBody}
});`;
    }
}
