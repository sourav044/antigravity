import { Page, expect, test } from '@playwright/test';
import { LocatorMap } from '../core/locator-map';

export class NewfeaturePage {
    readonly page: Page;


    constructor(page: Page) {
        this.page = page;

    }

    async initialNavigation() {
        await this.page.goto('https://v12.material.angular.io/cdk/drag-drop/overview');
        await this.page.waitForLoadState('networkidle');
    }

    async dragNewfeature_dragDrop_1ToTarget() {
        const sourceSelectorRaw = LocatorMap.getPlaywrightSelector('newfeature_drag-drop_1');
        const targetSelectorRaw = LocatorMap.getExpectedValue('newfeature_drag-drop_1');
        const sourceSelector = sourceSelectorRaw.replace(/\.cdk-drag-dragging/g, '').replace(/\.cdk-drag-placeholder/g, '').trim();
        const targetSelector = targetSelectorRaw.trim();
        const sourceLocator = this.page.locator(sourceSelector).first();
        const targetLocator = this.page.locator(targetSelector).first();
        
        await expect(sourceLocator).toBeVisible({ timeout: 15000 });
        
        // Robust Drag and Drop for Angular CDK
        await sourceLocator.hover();
        await this.page.mouse.down();
        // Move slightly to initiate Drag
        const srcBound = await sourceLocator.boundingBox();
        if (srcBound) {
            await this.page.mouse.move(srcBound.x + srcBound.width / 2 + 10, srcBound.y + srcBound.height / 2 + 10, { steps: 2 });
        }
        await this.page.waitForTimeout(200);
        
        // Target element might only appear after drag starts (like a placeholder)
        await expect(targetLocator).toBeVisible({ timeout: 15000 });
        
        // Move to Target
        await targetLocator.hover();
        await this.page.waitForTimeout(200);
        await this.page.mouse.up();
    }

    async clickNewfeature_step_1() {
        const selector = LocatorMap.getPlaywrightSelector('newfeature_step_1');
        await expect(this.page.locator(selector).first()).toBeVisible({ timeout: 15000 });
        await this.page.locator(selector).first().click();
    }

    async dragNewfeature_dragDrop_3ToTarget() {
        const sourceSelectorRaw = LocatorMap.getPlaywrightSelector('newfeature_drag-drop_3');
        const targetSelectorRaw = LocatorMap.getExpectedValue('newfeature_drag-drop_3');
        const sourceSelector = sourceSelectorRaw.replace(/\.cdk-drag-dragging/g, '').replace(/\.cdk-drag-placeholder/g, '').trim();
        const targetSelector = targetSelectorRaw.trim();
        const sourceLocator = this.page.locator(sourceSelector).first();
        const targetLocator = this.page.locator(targetSelector).first();
        
        await expect(sourceLocator).toBeVisible({ timeout: 15000 });
        
        // Robust Drag and Drop for Angular CDK
        await sourceLocator.hover();
        await this.page.mouse.down();
        // Move slightly to initiate Drag
        const srcBound = await sourceLocator.boundingBox();
        if (srcBound) {
            await this.page.mouse.move(srcBound.x + srcBound.width / 2 + 10, srcBound.y + srcBound.height / 2 + 10, { steps: 2 });
        }
        await this.page.waitForTimeout(200);
        
        // Target element might only appear after drag starts (like a placeholder)
        await expect(targetLocator).toBeVisible({ timeout: 15000 });
        
        // Move to Target
        await targetLocator.hover();
        await this.page.waitForTimeout(200);
        await this.page.mouse.up();
    }

}
