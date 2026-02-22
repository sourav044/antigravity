import { GeneratorAgent } from './src/ai/generator';

async function testGeneration() {
    const generator = new GeneratorAgent();

    // Create a mock imported event (like what the UI would send)
    const mockEvents = [
        {
            id: 'login_spec_ts_login_0',
            type: 'imported',
            value: 'Initial Navigation',
            selector: undefined,
            rawCode: '    await test.step(\'Initial Navigation\', async () => {\n        await page.goto(\'https://www.saucedemo.com/\');\n        await page.waitForLoadState(\'networkidle\');\n    });'
        },
        {
            id: 'login_spec_ts_login_1',
            type: 'imported',
            value: 'Type into username',
            selector: undefined,
            rawCode: '    await test.step(\'Type into username\', async () => {\n        const locator = page.locator(\'[data-test="username"]\').first();\n        await expect(locator).toBeVisible({ timeout: 15000 });\n        await locator.fill("standard_user");\n    });'
        },
        {
            id: 'step_3',
            type: 'click',
            selector: '[data-test="add-to-cart-sauce-labs-backpack"]',
            value: ''
        }
    ];

    console.log('Generating spec...');
    const result = await generator.generatePlaywrightSpec('my_test', mockEvents);

    console.log('\n--- Generated Spec ---');
    console.log(result.specContent);
    console.log('\n--- Generated Pages ---');
    console.log(Object.keys(result.pages || {}));
}

testGeneration().catch(console.error);
