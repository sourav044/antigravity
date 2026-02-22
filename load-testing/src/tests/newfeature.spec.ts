import { test, expect } from '@playwright/test';
import { LocatorMap } from '../core/locator-map';
import { NewfeaturePage } from '../pages/newfeature_page';

// Load locators (ensure this runs before tests)
test.beforeAll(async () => {
    await LocatorMap.load('./data/locators.json');
});

test('NewFeature', async ({ page }) => {
    const newfeaturePage = new NewfeaturePage(page);

        await test.step('Initial Navigation', async () => {
        await newfeaturePage.initialNavigation();
    });
        await test.step('Drag newfeature_drag-drop_1 to target', async () => {
        await newfeaturePage.dragNewfeature_dragDrop_1ToTarget();
    });
        await test.step('Click newfeature_step_1', async () => {
        await newfeaturePage.clickNewfeature_step_1();
    });
        await test.step('Drag newfeature_drag-drop_3 to target', async () => {
        await newfeaturePage.dragNewfeature_dragDrop_3ToTarget();
    });
});