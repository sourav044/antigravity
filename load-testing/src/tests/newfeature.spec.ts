import { test, expect } from './fixtures';
import { LocatorMap } from '../core/locator-map';

// Load locators (ensure this runs before tests, or use a fixture)
test.beforeAll(async () => {
    await LocatorMap.load('./data/locators.json');
});

test('NewFeature', async ({ page, translatorPage }) => {

    await test.step('Initial Navigation', async () => {
        await page.goto('https://www.deepl.com/en/translator');
        await page.waitForLoadState('networkidle');
    });
    await test.step('URL changed to https://www.deepl.com/en/translator', async () => {
        await expect(page).toHaveURL('https://www.deepl.com/en/translator');
        await page.waitForLoadState('networkidle');
    });
    await test.step('Click newfeature_click_1', async () => {
        await translatorPage.action_newfeature_click_1();
    });
    await test.step('Navigate to https://www.deepl.com/en/translator', async () => {
        await page.goto('https://www.deepl.com/en/translator');
        await page.waitForLoadState('networkidle');
    });
    await test.step('Click newfeature_click_2', async () => {
        await translatorPage.action_newfeature_click_2();
    });
    await test.step('Type into newfeature_input_3', async () => {
        await translatorPage.action_newfeature_input_3();
    });
    await test.step('Drag Select text inside newfeature_drag-select_4', async () => {
        await translatorPage.action_newfeature_dragselect_4();
    });
    await test.step('Click newfeature_click_5', async () => {
        await translatorPage.action_newfeature_click_5();
    });
});