import fs from 'fs-extra';

export interface LocatorDef {
    id: string;
    primary: string;
    fallbacks?: string[];
    value?: string;
    score?: number;
}

export class LocatorMap {
    private static locators: Map<string, LocatorDef> = new Map();

    static async load(filePath: string): Promise<void> {
        try {
            if (await fs.pathExists(filePath)) {
                const data = await fs.readJson(filePath);
                // Handle structure: { "id": [ { "css": "...", "score": ... } ] } 
                // OR simple map { "id": { "primary": "..." } }
                // based on previous code it seemed like a dictionary of definitions.

                // Adapting to match the JSON structure implied by C# code:
                // If the JSON is arbitrary, we need to know the specific schema.
                // Assuming simple key-value or list for now based on 'locators.json' usage.

                for (const [key, value] of Object.entries(data)) {
                    // Normalize to LocatorDef
                    // If value is array, pick best score. If object, use as is.
                    let def: LocatorDef;

                    if (Array.isArray(value)) {
                        // Simplify: pick first or max score
                        const best = value[0]; // simplistic
                        def = {
                            id: key,
                            primary: best.css || best.xpath || best.primary,
                            value: best.value,
                            fallbacks: best.fallbacks
                        };
                    } else {
                        const v = value as any;
                        def = {
                            id: key,
                            primary: v.primary || v.css,
                            value: v.value,
                            fallbacks: v.fallbacks
                        };
                    }
                    this.locators.set(key, def);
                }
                console.log(`Loaded ${this.locators.size} definitions from ${filePath}`);
            } else {
                console.warn(`Locator file not found at ${filePath}`);
            }
        } catch (error) {
            console.error('Failed to load locator map:', error);
        }
    }

    static get(id: string): LocatorDef | undefined {
        return this.locators.get(id);
    }
}
