import { Command } from 'commander';
import { Config } from './core/config';
import { AgentOrchestrator } from './ai/orchestrator';
import { LocatorMap } from './core/locator-map';
import { spawn } from 'child_process';
import path from 'path';

const program = new Command();

program
    .name('load-runner')
    .description('TypeScript Load Runner with AI Agents')
    .version('1.0.0');

// Define CLI options to match .NET args roughly
program
    .option('--generate [prompt]', 'Run AI generation flow')
    .option('--users <number>', 'Number of concurrent users', '1')
    .option('--duration <minutes>', 'Duration in minutes', '1');

program.parse();

const options = program.opts();

async function main() {
    console.log("Initializing Load Runner TS...");

    // Load static config
    // (Config class loads .env automatically on import, but we can override with CLI args here if needed)

    if (options.generate) {
        // GENERATION MODE
        console.log(`=== Interactive Generator ===`);

        // Force non-headless for generation as requested
        process.env.HEADLESS_TEST = 'false';

        const orchestrator = new AgentOrchestrator();
        // The prompt arg is ignored in favor of interactive prompt inside, 
        // or we can pass it if provided. The request said "Ask user for feature name".
        // So we just run the interactive mode.
        await orchestrator.runInteractiveMode();
        return; // EXIT after generation
    }

    // EXECUTION MODE
    console.log(`Target: ${Config.UrlPath}`);
    console.log(`Users: ${options.users || Config.Users}`);
    console.log(`Duration: ${options.duration || Config.DurationMinutes} minutes`);

    // Load Locators
    await LocatorMap.load(Config.DataIdValuePath);

    // Playwright natively handles parallelization well.
    // The load testing execution can just be calling playwright test.
    const userCount = parseInt(options.users || Config.Users.toString());
    console.log(`Setting up ${userCount} users for Playwright load test...`);

    // We can pass the user count to Playwright via environment variables
    process.env.LOAD_TEST_USERS = userCount.toString();

    return new Promise((resolve, reject) => {
        const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        const proc = spawn(cmd, ['playwright', 'test'], {
            stdio: 'inherit',
            shell: true,
            env: process.env
        });

        proc.on('close', (code) => {
            console.log(`Load test finished with code ${code}`);
            resolve(null);
        });

        proc.on('error', (err) => {
            console.error(`Load test failed:`, err);
            resolve(null);
        });
    });
}

main().catch(console.error);
