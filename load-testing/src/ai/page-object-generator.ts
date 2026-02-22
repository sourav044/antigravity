import fs from 'fs-extra';
import path from 'path';

export class PageObjectGenerator {

    /**
     * Converts a raw Playwright step code block into a reusable POM method body.
     * Extracts `page.locator(...)` calls into class properties.
     */
    static transformStepToMethod(rawCode: string, methodTitle: string, existingProperties: Set<string>): { methodName: string, methodCode: string, newProperties: { name: string, definition: string }[] } {
        // Create a safe camelCase method name from the step title
        const words = methodTitle.replace(/[^a-zA-Z0-9_]/g, ' ').split(/\s+/).filter(w => w.length > 0);
        let methodName = words.map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
        if (!methodName) methodName = 'customStep';

        let methodBody = rawCode;

        // Strip the wrapping test.step('...', async () => { ... });
        // The regex looks for the start of test.step and extracts everything up to the final });
        const stepMatch = methodBody.match(/await\s+test\.step\s*\(\s*['"`][^'"`]*['"`]\s*,\s*async\s*\(\)\s*=>\s*\{([\s\S]*)\}\s*\);?/);
        if (stepMatch && stepMatch[1]) {
            // Trim leading/trailing blank lines
            methodBody = stepMatch[1].replace(/^\s*[\r\n]/, '').replace(/[\r\n]\s*$/, '');
        }

        const newProperties: { name: string, definition: string }[] = [];

        // 1. Find all instances of page.locator('selector')
        // This simple regex looks for page.locator holding string literals
        const locatorRegex = /page\.locator\(\s*(['"`].*?['"`])\s*\)/g;

        // 2. Extract and replace them
        methodBody = methodBody.replace(locatorRegex, (match, selectorStr) => {
            // Create a property name based on the selector value loosely
            let cleanSelector = selectorStr.replace(/['"`\[\]\=\-\.]/g, ' ').trim();
            let propWords = cleanSelector.split(/\s+/).filter((w: string) => w.length > 0 && w.length < 20);

            // Default to 'element' if we can't make a good name
            let propName = 'element';
            if (propWords.length > 0) {
                propName = propWords.map((w: string, i: number) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
            }

            // Add suffix to avoid conflicts with reserved words/methods
            let finalPropName = propName + 'Element';

            // Handle naming collisions
            let counter = 1;
            let tempName = finalPropName;
            while (existingProperties.has(tempName)) {
                tempName = `${finalPropName}${counter}`;
                counter++;
            }
            finalPropName = tempName;
            existingProperties.add(finalPropName);

            // Record the property for the constructor
            newProperties.push({
                name: finalPropName,
                definition: `this.${finalPropName} = page.locator(${selectorStr});`
            });

            // Replace in the method body
            return `this.${finalPropName}`;
        });

        // 3. Fallback for any leftover page usages (like page.goto)
        methodBody = methodBody.replace(/([^a-zA-Z0-9_])page\./g, '$1this.page.');

        const methodCode = `
    async ${methodName}() {
${methodBody}
    }`;

        return { methodName, methodCode, newProperties };
    }

    /**
     * Generates or updates a Page Object Model file for a given scenario.
     * Returns the generated class name and the method names added.
     */
    static async generatePomForSteps(scenarioKey: string, steps: { title: string, rawCode: string }[]): Promise<{ className: string, methods: string[], importPath: string }> {
        // Clean up scenarioKey: remove 'spec', 'ts', and non-alphanumerics
        let cleanName = scenarioKey.replace(/(_ts|_spec|\.spec|\.ts)/gi, '').replace(/[^a-zA-Z0-9]/g, ' ');
        if (!cleanName.trim()) cleanName = 'Common';

        // Create a safe PascalCase class name
        const words = cleanName.split(/\s+/).filter(w => w.length > 0);
        const className = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('') + 'Page';

        const fileBaseName = words.map(w => w.toLowerCase()).join('_') + '_page';
        const fileName = `${fileBaseName}.ts`;
        const pagesDir = path.join(process.cwd(), 'src', 'pages');
        const filePath = path.join(pagesDir, fileName);

        await fs.ensureDir(pagesDir);

        let existingContent = '';
        if (await fs.pathExists(filePath)) {
            existingContent = await fs.readFile(filePath, 'utf-8');
        }

        const generatedMethods = [];
        let newMethodsCode = '';

        let allNewProperties: { name: string, definition: string }[] = [];
        const existingClassProperties = new Set<string>();
        // Scrape existing properties from file to avoid duplicates
        if (existingContent) {
            const propMatches = [...existingContent.matchAll(/readonly\s+([a-zA-Z0-9_]+)\s*:/g)];
            propMatches.forEach(m => existingClassProperties.add(m[1]));
        }

        for (const step of steps) {
            const { methodName, methodCode, newProperties } = this.transformStepToMethod(step.rawCode, step.title, existingClassProperties);

            // Avoid adding duplicate methods if this POM was compiled before
            const methodSignatureRegex = new RegExp(`async\\s+${methodName}\\s*\\(`);
            if (!methodSignatureRegex.test(existingContent) && !newMethodsCode.includes(`async ${methodName}(`)) {
                newMethodsCode += methodCode + '\n';
                generatedMethods.push(methodName);
                allNewProperties.push(...newProperties);
            } else {
                // Method already exists, just return the name so it can be called
                generatedMethods.push(methodName);
            }
        }

        if (existingContent && newMethodsCode) {
            // Need to inject properties and constructor changes in existing files (complex AST stuff usually)
            // For now, if the file exists, we won't inject properties to avoid breaking the file,
            // we will just fallback to standard this.page.locator in the transformation
            // ... (A proper AST parser is recommended here if file updating is heavily expected)
            // But let's do a best-effort injection.

            let updatedContent = existingContent;

            if (allNewProperties.length > 0) {
                // Inject declarations right after class declaration
                const classDeclMatch = /export class [^{]+{/.exec(updatedContent);
                if (classDeclMatch) {
                    const insertIdx = classDeclMatch.index + classDeclMatch[0].length;
                    const declarations = '\n' + allNewProperties.map(p => `    readonly ${p.name}: any;`).join('\n');
                    updatedContent = updatedContent.slice(0, insertIdx) + declarations + updatedContent.slice(insertIdx);
                }

                // Inject definitions inside constructor
                const ctorMatch = /constructor\s*\([^)]+\)\s*{[^}]*(this\.page = page;)/.exec(updatedContent);
                if (ctorMatch) {
                    const insertIdx = ctorMatch.index + ctorMatch[0].length;
                    const definitions = '\n' + allNewProperties.map(p => `        ${p.definition}`).join('\n');
                    updatedContent = updatedContent.slice(0, insertIdx) + definitions + updatedContent.slice(insertIdx);
                }
            }

            // Inject new methods before the last closing brace of the class
            const lastBraceIndex = updatedContent.lastIndexOf('}');
            if (lastBraceIndex !== -1) {
                updatedContent = updatedContent.slice(0, lastBraceIndex) + newMethodsCode + updatedContent.slice(lastBraceIndex);
                await fs.writeFile(filePath, updatedContent);
            }
        } else if (!existingContent) {
            // Create brand new POM
            const propDeclarations = allNewProperties.map(p => `    readonly ${p.name}: any;`).join('\n');
            const propDefinitions = allNewProperties.map(p => `        ${p.definition}`).join('\n');

            const newClassContent = `import { Page, expect, test } from '@playwright/test';
import { LocatorMap } from '../core/locator-map';

export class ${className} {
    readonly page: Page;
${propDeclarations}

    constructor(page: Page) {
        this.page = page;
${propDefinitions}
    }
${newMethodsCode}
}
`;
            await fs.writeFile(filePath, newClassContent);
        }

        return {
            className,
            methods: generatedMethods,
            importPath: `../pages/${fileBaseName}`
        };
    }
}
