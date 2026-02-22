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
        const { PageObjectGenerator } = await import('./page-object-generator');

        // Ensure map is loaded
        await LocatorMap.load(config.DataIdValuePath);

        let stepCount = 1;

        let specImports = `import { test, expect } from '@playwright/test';\nimport { LocatorMap } from '../core/locator-map';\nimport { Config } from '../core/config';\n`;
        let specBody = "";

        let currentUrl = config.UrlPath;
        let currentPageClass = this.getPageClassName(currentUrl);

        // Organize imported steps by scenario using their ID prefix
        // ID format from reusable-steps: safeFile_safeScenario_stepIndex
        const importedStepsByScenario: { [scenario: string]: { title: string, rawCode: string }[] } = {};

        if (events.length > 0) {
            let firstRealNav = events.find(ev => (ev.type === 'navigation' || ev.type === 'url-change') && ev.url !== 'about:blank');
            let initialUrl = firstRealNav ? firstRealNav.url : config.UrlPath;
            // Inject as a standard step on the feature so it gets placed into the POM
            if (!importedStepsByScenario[featureName]) {
                importedStepsByScenario[featureName] = [];
            }
            importedStepsByScenario[featureName].push({
                title: 'Initial Navigation',
                rawCode: `        await page.goto('${initialUrl}');\n        await page.waitForLoadState('networkidle', { timeout: Config.Timeout }).catch(() => { console.log(\`Network not idle after \${Config.Timeout}ms, continuing anyway.\`); });`
            });
            specBody += `\n    // PLACEHOLDER: ${featureName} : Initial Navigation`;
        }
        for (const e of events) {
            if (e.type === 'imported' && e.rawCode) {
                const parts = e.id.split('_');
                // Assume the scenario is identified by the first two parts (file_scenario)
                const scenarioKey = parts.length >= 2 ? parts[0] + '_' + parts[1] : 'Common';
                if (!importedStepsByScenario[scenarioKey]) {
                    importedStepsByScenario[scenarioKey] = [];
                }
                importedStepsByScenario[scenarioKey].push({ title: e.value || e.selector || 'Step', rawCode: e.rawCode });
            }
        }

        for (const e of events) {
            if (e.type === 'navigation' || e.type === 'url-change') {
                if (e.url === 'about:blank') continue; // Avoid playwright timeouts on blank page transitions
                currentUrl = e.url;

                let rawStepCode = '';
                let stepTitle = '';

                if (e.type === 'navigation') {
                    stepTitle = `Navigate to ${e.url}`;
                    rawStepCode = `        await page.goto('${e.url}');\n        await page.waitForLoadState('networkidle', { timeout: Config.Timeout }).catch(() => { console.log(\`Network not idle after \${Config.Timeout}ms, continuing anyway.\`); });`;
                } else {
                    stepTitle = `URL changed to ${e.url}`;
                    rawStepCode = `        await expect(page).toHaveURL('${e.url}');\n        await page.waitForLoadState('networkidle', { timeout: Config.Timeout }).catch(() => { console.log(\`Network not idle after \${Config.Timeout}ms, continuing anyway.\`); });`;
                }

                if (!importedStepsByScenario[featureName]) {
                    importedStepsByScenario[featureName] = [];
                }
                const isFirstNav = featureName in importedStepsByScenario && importedStepsByScenario[featureName].find(s => s.title === 'Initial Navigation');

                // If this is the very first navigation and we already created the "Initial Navigation" synthetic event above, skip it.
                if (e.type === 'navigation' && isFirstNav && e.url === currentUrl && importedStepsByScenario[featureName].length === 1) {
                    continue;
                }

                importedStepsByScenario[featureName].push({ title: stepTitle, rawCode: rawStepCode });
                specBody += `\n    // PLACEHOLDER: ${featureName} : ${stepTitle}`;

            } else if (e.type === 'manual') {
                let selector = e.selector || '';
                const match = selector.match(/^\{(.+)\}$/);
                if (match) {
                    selector = match[1];
                }

                specBody += `
    await test.step('Manual Step: ${e.value}', async () => {
        const locator = page.locator('${selector}');
        await expect(locator).toBeVisible({ timeout: Config.Timeout });
        await locator.click(); // Defaulting manual step to click. User should edit this block.
    });`;
            } else if (e.type === 'imported') {
                if (e.rawCode) {
                    const parts = e.id.split('_');
                    const scenarioKey = parts.length >= 2 ? parts[0] + '_' + parts[1] : 'Common';

                    const stepTitle = e.value || e.selector || 'Step';
                    specBody += `\n    // PLACEHOLDER: ${scenarioKey} : ${stepTitle}`;
                }
            } else {
                const cleanFeature = featureName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                let key = e.id;
                let formattedSelector = e.selector;

                // Auto-format data attributes if user just typed the raw value
                const selType = e.selectorType?.toLowerCase();
                const allowedTypes = ['data-testid', 'dataid', 'testid', 'tid', 'hid', 'cid', 'data-is'];

                if (selType && allowedTypes.includes(selType) && formattedSelector && !formattedSelector.startsWith('[')) {
                    formattedSelector = `[${selType}="${formattedSelector}"]`;
                }

                // Identify if key is empty or an old auto-generated type
                const isAutoGenerated = !key || new RegExp(`^(${cleanFeature}_)?(step|click|input|assert|drag-select|hover)_\\d+$`).test(key);

                if (isAutoGenerated) {
                    key = `${cleanFeature}_step_${stepCount++}`;
                } else if (!key.startsWith(`${cleanFeature}_`)) {
                    key = `${cleanFeature}_${key}`;
                }

                // Check for duplicate keys/values
                const perfectlyMatchingExistingKey = LocatorMap.findBySelectorAndValue(formattedSelector, e.value);
                if (perfectlyMatchingExistingKey) {
                    // Values are identical: reuse the existing ID
                    key = perfectlyMatchingExistingKey;
                } else {
                    // If the Key exists but values differ, generate a new ID based on the specification filename
                    let existingDef = LocatorMap.get(key);
                    while (existingDef) {
                        key = `${cleanFeature}_step_${stepCount++}`;
                        existingDef = LocatorMap.get(key);
                    }
                    LocatorMap.register(key, formattedSelector, e.value);
                }

                let rawStepCode = '';

                if (e.type === 'click') {
                    rawStepCode = `        const selector = LocatorMap.getPlaywrightSelector('${key}');
        await expect(page.locator(selector).first()).toBeVisible({ timeout: Config.Timeout });
        await page.locator(selector).first().click();`;
                } else if (e.type === 'input') {
                    rawStepCode = `        const selector = LocatorMap.getPlaywrightSelector('${key}');
        const expectedValue = LocatorMap.getExpectedValue('${key}');
        const locator = page.locator(selector).first();
        await expect(locator).toBeVisible({ timeout: Config.Timeout });
        try {
            await locator.fill(expectedValue);
            await expect(locator).toHaveValue(expectedValue, { timeout: 5000 });
        } catch (error) {
            await locator.click();
            await locator.pressSequentially(expectedValue);
        }`;
                } else if (e.type === 'drag-select') {
                    rawStepCode = `        const selector = LocatorMap.getPlaywrightSelector('${key}');
        const locator = page.locator(selector).first();
        await expect(locator).toBeVisible({ timeout: Config.Timeout });
        await locator.dblclick();`;
                } else if (e.type === 'drag-drop') {
                    // Angular CDK and complex frameworks need very deliberate mouse steps to recognize drag.
                    rawStepCode = `        const sourceSelectorRaw = LocatorMap.getPlaywrightSelector('${key}');
        const targetSelectorRaw = LocatorMap.getExpectedValue('${key}');
        const sourceSelector = sourceSelectorRaw.replace(/\\.cdk-drag-dragging/g, '').replace(/\\.cdk-drag-placeholder/g, '').trim();
        const targetSelector = targetSelectorRaw.trim();
        const sourceLocator = page.locator(sourceSelector).first();
        const targetLocator = page.locator(targetSelector).first();
        
        await expect(sourceLocator).toBeVisible({ timeout: Config.Timeout });
        
        // Robust Drag and Drop for Angular CDK
        await sourceLocator.hover();
        await page.mouse.down();
        // Move slightly to initiate Drag
        const srcBound = await sourceLocator.boundingBox();
        if (srcBound) {
            await page.mouse.move(srcBound.x + srcBound.width / 2 + 10, srcBound.y + srcBound.height / 2 + 10, { steps: 2 });
        }
        await page.waitForTimeout(200);
        
        // Target element might only appear after drag starts (like a placeholder)
        await expect(targetLocator).toBeVisible({ timeout: Config.Timeout });
        
        // Move to Target
        await targetLocator.hover();
        await page.waitForTimeout(200);
        await page.mouse.up();`;
                } else if (e.type === 'assert') {
                    const isInput = e.selector?.toLowerCase().includes('input') || e.selector?.toLowerCase().includes('textarea');
                    const assertMethod = isInput ? 'toHaveValue' : 'toHaveText';
                    rawStepCode = `        const selector = LocatorMap.getPlaywrightSelector('${key}');
        const expectedValue = LocatorMap.getExpectedValue('${key}');
        const locator = page.locator(selector).first();
        await expect(locator).toBeVisible({ timeout: Config.Timeout });
        await expect(locator).${assertMethod}(expectedValue, { timeout: 10000 });`;
                }

                if (rawStepCode) {
                    if (!importedStepsByScenario[featureName]) {
                        importedStepsByScenario[featureName] = [];
                    }

                    let stepTitle = '';
                    if (e.type === 'click') stepTitle = `Click ${key}`;
                    else if (e.type === 'input') stepTitle = `Type into ${key}`;
                    else if (e.type === 'drag-select') stepTitle = `Drag Select text inside ${key}`;
                    else if (e.type === 'drag-drop') stepTitle = `Drag ${key} to target`;
                    else if (e.type === 'assert') stepTitle = `Verify text in ${key}`;

                    importedStepsByScenario[featureName].push({ title: stepTitle, rawCode: rawStepCode });

                    // The actual injection into specBody will happen after the POM is generated below.
                    // We mark this with a placeholder to replace later
                    specBody += `\n    // PLACEHOLDER: ${featureName} : ${stepTitle}`;
                }
            }
        }

        // --- SECOND PASS: Generate POMs for ALL gathered steps (imported AND standard recording) ---

        // Generate POMs and keep track of instances
        const pomInstances: { [scenarioKey: string]: { className: string, importPath: string, methods: string[] } } = {};
        for (const [scenarioKey, steps] of Object.entries(importedStepsByScenario)) {
            const result = await PageObjectGenerator.generatePomForSteps(scenarioKey, steps);
            pomInstances[scenarioKey] = result;
        }

        let pomImports = '';
        let pomInstantiations = '';
        for (const [scenarioKey, pom] of Object.entries(pomInstances)) {
            pomImports += `import { ${pom.className} } from '${pom.importPath}';\n`;
            const instanceName = pom.className.charAt(0).toLowerCase() + pom.className.slice(1);
            pomInstantiations += `    const ${instanceName} = new ${pom.className}(page);\n`;

            // Re-map placeholders in specBody to their new method names
            const currentSteps = importedStepsByScenario[scenarioKey] || [];
            currentSteps.forEach((step: any) => {
                const { methodName } = PageObjectGenerator.transformStepToMethod(step.rawCode, step.title, new Set<string>());
                const placeholder = `// PLACEHOLDER: ${scenarioKey} : ${step.title}`;
                const replacement = `    await test.step('${step.title}', async () => {\n        await ${instanceName}.${methodName}();\n    });`;
                specBody = specBody.replace(placeholder, replacement);
            });
        }

        // Save updated map
        await LocatorMap.save(config.DataIdValuePath);


        const fullSpec = `${specImports}${pomImports}
// Load locators (ensure this runs before tests)
test.beforeAll(async () => {
    await LocatorMap.load('${config.DataIdValuePath.replace(/\\/g, '/')}');
});

test('${featureName}', async ({ page }) => {
${pomInstantiations}${specBody}
});`;

        // Read the actual POM file contents from disk to send back to the UI for saving
        const pagesData: { [filename: string]: string } = {};
        for (const pom of Object.values(pomInstances)) {
            const fileBaseName = pom.importPath.split('/').pop() || pom.className.toLowerCase();
            const fileName = `${fileBaseName}.ts`;
            const filePath = require('path').join(process.cwd(), 'src', 'pages', fileName);
            try {
                if (require('fs').existsSync(filePath)) {
                    pagesData[fileName] = require('fs').readFileSync(filePath, 'utf-8');
                }
            } catch (e) { }
        }

        return {
            specContent: fullSpec,
            fixtureContent: "",
            pages: pagesData,
            testData: {}
        };
    }
}
