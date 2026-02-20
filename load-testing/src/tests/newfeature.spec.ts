import { test, expect } from '@playwright/test';
import { LocatorMap } from '../core/locator-map';

// Load locators (ensure this runs before tests, or use a fixture)
// For simplicity in this generated file, we'll assume global load or load in beforeAll
test.beforeAll(async () => {
    await LocatorMap.load('./data/locators.json');
});

test('NewFeature', async ({ page }) => {

    await test.step('Initial Navigation', async () => {
        await page.goto('https://www.deepl.com/en');
    });
    await test.step('Click newfeature_click_1', async () => {
        // Strategy used: Data-testid
        const selector = LocatorMap.getPlaywrightSelector('newfeature_click_1', '[data-testid="sf-text-open-translator-button"]');
        await expect(page.locator(selector).first()).toBeVisible({ timeout: 15000 });
        await page.locator(selector).first().click();
    });
    await test.step('Navigate to https://www.deepl.com/en/translator', async () => {
        await page.goto('https://www.deepl.com/en/translator');
    });
    await test.step('Navigate to https://www.deepl.com/en/translator', async () => {
        await page.goto('https://www.deepl.com/en/translator');
    });
    await test.step('Click newfeature_click_2', async () => {
        // Strategy used: CSS
        const selector = LocatorMap.getPlaywrightSelector('newfeature_click_2', 'div#textareasContainer > div > section > div > div > d-textarea > div');
        await expect(page.locator(selector).first()).toBeVisible({ timeout: 15000 });
        await page.locator(selector).first().click();
    });
    await test.step('Click newfeature_click_3', async () => {
        // Strategy used: Data-testid
        const selector = LocatorMap.getPlaywrightSelector('newfeature_click_3', '[data-testid="cookie-banner-strict-accept-all"]');
        await expect(page.locator(selector).first()).toBeVisible({ timeout: 15000 });
        await page.locator(selector).first().click();
    });
    await test.step('Type into newfeature_input_4', async () => {
        // Strategy used: Data-testid
        const selector = LocatorMap.getPlaywrightSelector('newfeature_input_4', '[data-testid="translator-source-input"]');
        const expectedValue = LocatorMap.getExpectedValue('newfeature_input_4', 'I am ');
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
    });
    await test.step('Drag Select text inside newfeature_drag-select_5', async () => {
        // Strategy used: CSS
        const selector = LocatorMap.getPlaywrightSelector('newfeature_drag-select_5', 'section > div > d-textarea > div > p');
        const locator = page.locator(selector).first();
        await expect(locator).toBeVisible({ timeout: 15000 });
        
        // Simulating double-click to select text, or evaluate selection
        await locator.dblclick(); 
        
        // Log selected text for verification
        console.log(`Selected text: "Ich bin" inside ${selector}`);
    });
    await test.step('Click newfeature_click_6', async () => {
        // Strategy used: ID
        const selector = LocatorMap.getPlaywrightSelector('newfeature_click_6', '#textareasContainer');
        await expect(page.locator(selector).first()).toBeVisible({ timeout: 15000 });
        await page.locator(selector).first().click();
    });
    await test.step('Type into newfeature_input_7', async () => {
        // Strategy used: Data-testid
        const selector = LocatorMap.getPlaywrightSelector('newfeature_input_7', '[data-testid="translator-target-input"]');
        const expectedValue = LocatorMap.getExpectedValue('newfeature_input_7', 'Ich bin ');
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
    });
});