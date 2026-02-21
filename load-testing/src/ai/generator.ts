export interface GeneratedResult {
    specContent: string;
    fixtureContent: string;
    pages: { [className: string]: string };
    testData: any;
}

export class GeneratorAgent {

    private getPageClassName(url: string, fallback: string = 'BasePage'): string {
        if (!url || url === 'about:blank') return fallback;
        try {
            const urlObj = new URL(url);
            let pathName = urlObj.pathname;
            if (pathName === '/' || pathName === '') {
                let hostParts = urlObj.hostname.split('.');
                if (hostParts[0] === 'www') hostParts.shift();
                let name = hostParts[0];
                return name.charAt(0).toUpperCase() + name.slice(1) + 'Page';
            } else {
                const segments = pathName.split('/').filter(s => s.length > 0);
                let lastSegment = segments[segments.length - 1];
                lastSegment = lastSegment.replace(/[^a-zA-Z0-9]/g, '');
                if (!lastSegment) return fallback;
                return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1) + 'Page';
            }
        } catch {
            return fallback;
        }
    }

    async generatePlaywrightSpec(featureName: string, events: any[]): Promise<GeneratedResult> {
        const config = (await import('../core/config')).Config;
        const { LocatorMap } = await import('../core/locator-map');

        // Ensure map is loaded
        await LocatorMap.load(config.DataIdValuePath);

        let stepCount = 1;

        const pages: { [className: string]: { methods: string[] } } = {};

        let specImports = `import { test, expect } from './fixtures';\nimport { LocatorMap } from '../core/locator-map';\n`;
        let specBody = "";
        let pageInstantiations = new Set<string>();

        let currentUrl = config.UrlPath;
        let currentPageClass = this.getPageClassName(currentUrl);

        if (events.length > 0) {
            let firstRealNav = events.find(ev => (ev.type === 'navigation' || ev.type === 'url-change') && ev.url !== 'about:blank');
            let initialUrl = firstRealNav ? firstRealNav.url : config.UrlPath;
            specBody += `
    await test.step('Initial Navigation', async () => {
        await page.goto('${initialUrl}');
        await page.waitForLoadState('networkidle');
    });`;
            pageInstantiations.add(this.getPageClassName(initialUrl));
        }

        for (const e of events) {
            let pomObjectStr = currentPageClass.charAt(0).toLowerCase() + currentPageClass.slice(1);

            if (e.type === 'navigation' || e.type === 'url-change') {
                if (e.url === 'about:blank') continue; // Avoid playwright timeouts on blank page transitions

                currentUrl = e.url;
                currentPageClass = this.getPageClassName(currentUrl);
                pomObjectStr = currentPageClass.charAt(0).toLowerCase() + currentPageClass.slice(1);
                pageInstantiations.add(currentPageClass);

                if (e.type === 'navigation') {
                    specBody += `
    await test.step('Navigate to ${e.url}', async () => {
        await page.goto('${e.url}');
        await page.waitForLoadState('networkidle');
    });`;
                } else {
                    specBody += `
    await test.step('URL changed to ${e.url}', async () => {
        await expect(page).toHaveURL('${e.url}');
        await page.waitForLoadState('networkidle');
    });`;
                }
            } else if (e.type === 'manual') {
                let selector = e.selector || '';
                const match = selector.match(/^\{(.+)\}$/);
                if (match) {
                    selector = match[1];
                }

                specBody += `
    await test.step('Manual Step: ${e.value}', async () => {
        const locator = page.locator('${selector}');
        await expect(locator).toBeVisible({ timeout: 15000 });
        await locator.click(); // Defaulting manual step to click. User should edit this block.
    });`;
            } else {
                // Click, Input, Drag-Select, Assert -> handled by POM
                pageInstantiations.add(currentPageClass);

                const cleanFeature = featureName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                const key = `${cleanFeature}_${e.type}_${stepCount++}`;

                LocatorMap.register(key, e.selector, e.value);

                if (!pages[currentPageClass]) {
                    pages[currentPageClass] = { methods: [] };
                }

                const methodName = `action_${key.replace(/-/g, '')}`;

                if (e.type === 'click') {
                    pages[currentPageClass].methods.push(`
    async ${methodName}() {
        const selector = LocatorMap.getPlaywrightSelector('${key}', '${e.selector}');
        await expect(this.page.locator(selector).first()).toBeVisible({ timeout: 15000 });
        await this.page.locator(selector).first().click();
    }`);
                    specBody += `
    await test.step('Click ${key}', async () => {
        await ${pomObjectStr}.${methodName}();
    });`;
                } else if (e.type === 'input') {
                    pages[currentPageClass].methods.push(`
    async ${methodName}() {
        const selector = LocatorMap.getPlaywrightSelector('${key}', '${e.selector}');
        const expectedValue = LocatorMap.getExpectedValue('${key}', '${e.value}');
        const locator = this.page.locator(selector).first();
        await expect(locator).toBeVisible({ timeout: 15000 });
        try {
            await locator.fill(expectedValue);
            await expect(locator).toHaveValue(expectedValue, { timeout: 5000 });
        } catch (error) {
            await locator.click();
            await locator.pressSequentially(expectedValue);
        }
    }`);
                    specBody += `
    await test.step('Type into ${key}', async () => {
        await ${pomObjectStr}.${methodName}();
    });`;
                } else if (e.type === 'drag-select') {
                    pages[currentPageClass].methods.push(`
    async ${methodName}() {
        const selector = LocatorMap.getPlaywrightSelector('${key}', '${e.selector}');
        const locator = this.page.locator(selector).first();
        await expect(locator).toBeVisible({ timeout: 15000 });
        await locator.dblclick(); 
    }`);
                    specBody += `
    await test.step('Drag Select text inside ${key}', async () => {
        await ${pomObjectStr}.${methodName}();
    });`;
                } else if (e.type === 'assert') {
                    const isInput = e.selector?.toLowerCase().includes('input') || e.selector?.toLowerCase().includes('textarea');
                    const assertMethod = isInput ? 'toHaveValue' : 'toHaveText';
                    pages[currentPageClass].methods.push(`
    async ${methodName}() {
        const selector = LocatorMap.getPlaywrightSelector('${key}', '${e.selector}');
        const expectedValue = LocatorMap.getExpectedValue('${key}', '${e.value}');
        const locator = this.page.locator(selector).first();
        await expect(locator).toBeVisible({ timeout: 15000 });
        await expect(locator).${assertMethod}(expectedValue, { timeout: 10000 });
    }`);
                    specBody += `
    await test.step('Verify text in ${key}', async () => {
        await ${pomObjectStr}.${methodName}();
    });`;
                }
            }
        }

        // Save updated map
        await LocatorMap.save(config.DataIdValuePath);

        // Build Pages Output
        const pageOutputs: { [className: string]: string } = {};
        for (const [className, pageDef] of Object.entries(pages)) {
            pageOutputs[className] = `import { Page, expect } from '@playwright/test';
import { LocatorMap } from '../core/locator-map';

export class ${className} {
    constructor(public page: Page) {}
${pageDef.methods.join('\n')}
}
`;
        }

        // Build Fixtures Output
        let fixtureImports = `import { test as base } from '@playwright/test';\n`;
        let fixtureTypes = `type MyFixtures = {\n`;
        let fixtureExtends = ``;

        for (const className of Array.from(pageInstantiations)) {
            const varName = className.charAt(0).toLowerCase() + className.slice(1);
            fixtureImports += `import { ${className} } from '../pages/${className}';\n`;
            fixtureTypes += `    ${varName}: ${className};\n`;

            fixtureExtends += `    ${varName}: async ({ page }, use) => {
        await use(new ${className}(page));
    },\n`;
        }
        fixtureTypes += `};\n`;

        const fixtureContent = `${fixtureImports}\n${fixtureTypes}\nexport const test = base.extend<MyFixtures>({\n${fixtureExtends}});\nexport { expect } from '@playwright/test';\n`;

        const fixtureArgs = Array.from(pageInstantiations).map(className => {
            return className.charAt(0).toLowerCase() + className.slice(1);
        }).join(', ');

        const fullSpec = `${specImports}
// Load locators (ensure this runs before tests, or use a fixture)
test.beforeAll(async () => {
    await LocatorMap.load('${config.DataIdValuePath.replace(/\\/g, '/')}');
});

test('${featureName}', async ({ page, ${fixtureArgs} }) => {
${specBody}
});`;

        return {
            specContent: fullSpec,
            fixtureContent,
            pages: pageOutputs,
            testData: {}
        };
    }
}
