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

    // Run Load Test
    // For this migration, we will spawn Cucumber processes or use Cucumber JS API.
    // To simulate "Users" running in parallel, we can try to use Promise.all 
    // with multiple Cucumber API runs, or just spawn child processes.
    // Playwright natively handles parallelization well, but CucumberJS is often single threaded per process.
    // For "Load Testing", usually we want parallel users. 

    // Let's implement a simple loop that runs a Cucumber profile/command 'n' times in parallel.
    // Note: This is a "poor man's load test". Real load testing with Playwright often uses artillery-playwright or similar.
    // But we are sticking to the logic of the original .NET application which spawned Tasks.

    const userCount = parseInt(options.users || Config.Users.toString());
    console.log(`Spawning ${userCount} users...`);

    const promises = [];
    for (let i = 0; i < userCount; i++) {
        promises.push(runUserLoad(i));
    }

    await Promise.all(promises);
    console.log("Load Test Completed.");
}

async function runUserLoad(userId: number): Promise<void> {
    console.log(`User ${userId} started.`);

    return new Promise((resolve, reject) => {
        // Run cucumber-js via CLI for isolation, or use API. 
        // CLI is safer for environment isolation per "user".
        const cucumberPath = path.resolve('node_modules', '.bin', 'cucumber-js');
        // On Windows it might be cucumber-js.cmd
        const cmd = process.platform === 'win32' ? 'cucumber-js.cmd' : 'cucumber-js';

        const proc = spawn(cmd, ['src/features/*.feature', '--require', 'dist/steps/*.js', '--require', 'dist/core/*.js', '--format', 'summary'], {
            stdio: 'inherit',
            shell: true,
            env: { ...process.env, USER_ID: userId.toString() }
        });

        proc.on('close', (code) => {
            console.log(`User ${userId} finished with code ${code}`);
            resolve();
        });

        proc.on('error', (err) => {
            console.error(`User ${userId} failed:`, err);
            resolve(); // Resolve anyway to let other users finish
        });
    });
}

main().catch(console.error);
