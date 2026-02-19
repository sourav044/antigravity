import { PlannerAgent } from './planner';
import { GeneratorAgent } from './generator';
import { HealerAgent } from './healer';
import { chromium, Browser, Page } from 'playwright';
import { Config } from '../core/config';
import fs from 'fs-extra';
import path from 'path';
import { InteractiveRecorder } from './recorder';

export class AgentOrchestrator {
    private planner: PlannerAgent;
    private generator: GeneratorAgent;
    private healer: HealerAgent;

    constructor() {
        this.planner = new PlannerAgent();
        this.generator = new GeneratorAgent();
        this.healer = new HealerAgent();
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

        // Generate Feature
        // Generate Feature
        const sanitizedName = featureName.replace(/[^a-zA-Z0-9_\-]/g, '').replace(/\s+/g, '_').toLowerCase();
        const feature = await this.generator.generateFeatureFromEvents(featureName, events);
        const featurePath = path.join(process.cwd(), 'src', 'features', `${sanitizedName}.feature`);
        await fs.ensureDir(path.dirname(featurePath));
        await fs.writeFile(featurePath, feature);

        // Generate Steps
        const steps = await this.generator.generateSteps(feature);
        const stepsPath = path.join(process.cwd(), 'src', 'steps', `${sanitizedName}.steps.ts`);
        await fs.ensureDir(path.dirname(stepsPath));
        await fs.writeFile(stepsPath, steps);

        console.log(`\n✅ GENERATION COMPLETE`);
        console.log(`---------------------------------------------------`);
        console.log(`📄 Feature File:  ${featurePath}`);
        console.log(`👣 Step Defs:     ${stepsPath}`);
        console.log(`---------------------------------------------------\n`);
    }

    async heal(locatorId: string, pageSource: string): Promise<void> {
        console.log(`Healer: Attempting to heal ${locatorId}...`);
        const newLocatorKey = await this.healer.healLocator(locatorId, pageSource);
        console.log(`Healed Locator: ${newLocatorKey}`);
    }
}
