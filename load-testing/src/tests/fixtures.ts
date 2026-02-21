import { test as base } from '@playwright/test';
import { TranslatorPage } from '../pages/TranslatorPage';

type MyFixtures = {
    translatorPage: TranslatorPage;
};

export const test = base.extend<MyFixtures>({
    translatorPage: async ({ page }, use) => {
        await use(new TranslatorPage(page));
    },
});
export { expect } from '@playwright/test';
