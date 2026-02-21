import { Page, expect } from '@playwright/test';
import { LocatorMap } from '../core/locator-map';

export class TranslatorPage {
    constructor(public page: Page) {}

    async action_newfeature_click_1() {
        const selector = LocatorMap.getPlaywrightSelector('newfeature_click_1', 'div#textareasContainer > div > section > div > div > d-textarea > div');
        await expect(this.page.locator(selector).first()).toBeVisible({ timeout: 15000 });
        await this.page.locator(selector).first().click();
    }

    async action_newfeature_click_2() {
        const selector = LocatorMap.getPlaywrightSelector('newfeature_click_2', 'div#textareasContainer > div > section > div > div > d-textarea > div');
        await expect(this.page.locator(selector).first()).toBeVisible({ timeout: 15000 });
        await this.page.locator(selector).first().click();
    }

    async action_newfeature_input_3() {
        const selector = LocatorMap.getPlaywrightSelector('newfeature_input_3', '[data-testid="translator-source-input"]');
        const expectedValue = LocatorMap.getExpectedValue('newfeature_input_3', 'I am starting');
        const locator = this.page.locator(selector).first();
        await expect(locator).toBeVisible({ timeout: 15000 });
        try {
            await locator.fill(expectedValue);
            await expect(locator).toHaveValue(expectedValue, { timeout: 5000 });
        } catch (error) {
            await locator.click();
            await locator.pressSequentially(expectedValue);
        }
    }

    async action_newfeature_dragselect_4() {
        const selector = LocatorMap.getPlaywrightSelector('newfeature_drag-select_4', '.--l.--r.container-target');
        const locator = this.page.locator(selector).first();
        await expect(locator).toBeVisible({ timeout: 15000 });
        await locator.dblclick(); 
    }

    async action_newfeature_click_5() {
        const selector = LocatorMap.getPlaywrightSelector('newfeature_click_5', '#textareasContainer');
        await expect(this.page.locator(selector).first()).toBeVisible({ timeout: 15000 });
        await this.page.locator(selector).first().click();
    }
}
