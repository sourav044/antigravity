import { Before, After, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { Config } from '../core/config';
import { LocatorMap } from '../core/locator-map';

// Set default timeout
setDefaultTimeout(60 * 1000);

// Export these for use in other step files
export let browser: Browser;
export let context: BrowserContext;
export let page: Page;

Before(async function () {
    // Determine headless mode from config or env
    // 'true' by default unless explicit 'false'
    const headless = process.env.HEADLESS_TEST !== 'false';

    console.log(`[Hooks] Launching browser (Headless: ${headless})...`);

    browser = await chromium.launch({ headless: headless, channel: 'chrome' });
    context = await browser.newContext();
    page = await context.newPage();

    // Load locators if needed (or rely on them being loaded by main process, 
    // but good to ensure here if running via cucumber-js directly)
    await LocatorMap.load(Config.DataIdValuePath);
});

After(async function (scenario) {
    if (scenario.result?.status === Status.FAILED) {
        console.log(`[Hooks] Scenario failed: ${scenario.pickle.name}`);
        // Capture screenshot on failure
        if (page) {
            const screenshotPath = `screenshots/${scenario.pickle.name.replace(/\s+/g, '_')}_failed.png`;
            await page.screenshot({ path: screenshotPath });
            console.log(`[Hooks] Screenshot saved: ${screenshotPath}`);
        }
    }

    await page?.close();
    await context?.close();
    await browser?.close();
});
