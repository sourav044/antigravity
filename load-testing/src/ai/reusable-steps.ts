import fs from 'fs-extra';
import path from 'path';

export interface TestStep {
    id: string; // unique id
    title: string;
    rawCode: string;
}

export interface TestScenario {
    file: string;
    name: string;
    steps: TestStep[];
}

export async function getExistingScenarios(): Promise<TestScenario[]> {
    const testsDir = path.join(process.cwd(), 'src', 'tests');
    const scenarios: TestScenario[] = [];

    if (!(await fs.pathExists(testsDir))) {
        return scenarios;
    }

    const files = await fs.readdir(testsDir);
    const specFiles = files.filter(f => f.endsWith('.spec.ts'));

    for (const file of specFiles) {
        const filePath = path.join(testsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');

        const testRegex = /test\('([^']+)',\s*async\s*\(\{\s*page\s*\}\)\s*=>\s*\{([\s\S]*?)\n\}\);/g;
        let testMatch;
        while ((testMatch = testRegex.exec(content)) !== null) {
            const scenarioName = testMatch[1];
            const scenarioBody = testMatch[2] + '\n}';

            const steps: TestStep[] = [];

            const stepRegex = /(\s+await test\.step\('([^']+)',\s*async\s*\(\)\s*=>\s*\{[\s\S]*?\n\s+\}\);)/g;
            let stepMatch;
            let stepIndex = 0;
            while ((stepMatch = stepRegex.exec(scenarioBody)) !== null) {
                const rawCode = stepMatch[1];
                const title = stepMatch[2];
                // Clean id from invalid characters
                const safeFile = file.replace(/[^a-zA-Z0-9]/g, '_');
                const safeScenario = scenarioName.replace(/[^a-zA-Z0-9]/g, '_');
                steps.push({
                    id: `${safeFile}_${safeScenario}_${stepIndex++}`,
                    title,
                    rawCode: rawCode // Keep leading whitespace for exact copy
                });
            }

            if (steps.length > 0) {
                scenarios.push({
                    file,
                    name: scenarioName,
                    steps
                });
            }
        }
    }

    return scenarios;
}
