import { GeneratorAgent } from './generator';
import { chromium, Browser, Page } from 'playwright';
import { Config } from '../core/config';
import fs from 'fs-extra';
import path from 'path';
import { InteractiveRecorder } from './recorder';

export class AgentOrchestrator {
    private generator: GeneratorAgent;

    constructor() {
        this.generator = new GeneratorAgent();
    }

    async runInteractiveMode(): Promise<void> {
        // 1. Ask for Feature Name (we can do this via CLI in index.ts or here)
        // Let's assume passed or asking here if `readline` is needed.
        // Actually, let's delegate the whole interactive loop to Recorder for simplicity
        // But Recorder just records. 

        // Let's use readline here to get the name first.
        // const readline = require('readline');
        // const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        // const ask = (q: string) => new Promise<string>(resolve => rl.question(q, resolve));

        // const featureName = await ask('Enter Feature Name: ');
        // rl.close(); // Close this interface, Recorder will open its own or we pass it? 
        // Better to close here.

        console.log(`Starting Interactive Recorder...`);

        const recorder = new InteractiveRecorder();
        // Start without a name, or a default. The UI will let user set it.
        const { events, featureName } = await recorder.start("");

        if (events.length === 0) {
            console.log("No events recorded. Exiting.");
            return;
        }

        console.log(`Generating files from recording for ${featureName}...`);

        // Generate Playwright Spec
        const sanitizedName = featureName.replace(/[^a-zA-Z0-9_\-]/g, '').replace(/\s+/g, '_').toLowerCase();
        const generated = await this.generator.generatePlaywrightSpec(featureName, events);

        // 1. Write Spec File
        const specPath = path.join(process.cwd(), 'src', 'tests', `${sanitizedName}.spec.ts`);
        await fs.ensureDir(path.dirname(specPath));
        await fs.writeFile(specPath, generated.specContent);

        // 2. Write Page Object Models (POMs)
        const pagesDir = path.join(process.cwd(), 'src', 'pages');
        await fs.ensureDir(pagesDir);
        for (const [className, content] of Object.entries(generated.pages)) {
            const pagePath = path.join(pagesDir, `${className}.ts`);
            await fs.writeFile(pagePath, content);
            console.log(`📄 Page Object:   ${pagePath}`);
        }

        // 3. Write Custom Fixtures file
        const fixturePath = path.join(process.cwd(), 'src', 'tests', 'fixtures.ts');
        await fs.writeFile(fixturePath, generated.fixtureContent);

        console.log(`\n✅ GENERATION COMPLETE`);
        console.log(`---------------------------------------------------`);
        console.log(`📄 Spec File:     ${specPath}`);
        console.log(`📄 Fixture File:  ${fixturePath}`);
        console.log(`---------------------------------------------------\n`);

        console.log(`🚀 Automatically running the generated test in Playwright to verify...`);

        // To achieve a truly unified seamless flow, we instantly execute Playwright on the new spec.
        const spawnCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

        // Ensure relative path is used for playwright to avoid absolute path matching issues on Windows
        const relativeSpecPath = path.relative(process.cwd(), specPath).replace(/\\/g, '/');

        const testProc = require('child_process').spawn(spawnCmd, ['playwright', 'test', relativeSpecPath, '--headed'], {
            stdio: 'inherit',
            shell: true
        });

        await new Promise<void>((resolve) => {
            testProc.on('close', (code: number) => {
                if (code === 0) {
                    console.log(`\n🎉 Test completed successfully!`);
                } else {
                    console.log(`\n❌ Test failed with exit code ${code}.`);
                }
                resolve();
            });
        });
    }
}
