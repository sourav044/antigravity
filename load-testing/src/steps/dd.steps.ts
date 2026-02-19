import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { page } from './hooks';


Given('I navigate to {string}', async function (url: string) {
    await page.goto(url);
});

When('I click {string}', async function (selector: string) {
    const locator = page.locator(selector);
    await expect(locator).toBeVisible();
    await locator.click();
});

When('I type {string} into {string}', async function (value: string, selector: string) {
    const locator = page.locator(selector);
    await expect(locator).toBeVisible();
    await locator.fill(value);
});

Then('the action should complete', async function () {
    // Placeholder for validation
    // await expect(page).toHaveTitle(/Sequence/); 
});
