import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config();

export class Config {
    static get UrlPath(): string {
        return process.env.URL_PATH || 'https://example.com';
    }

    static get Users(): number {
        return parseInt(process.env.USERS || '1', 10);
    }

    static get DurationMinutes(): number {
        return parseInt(process.env.DURATION_MINUTES || '1', 10);
    }

    static get Headless(): boolean {
        return process.env.HEADLESS_TEST !== 'false';
    }

    static get DataIdValuePath(): string {
        return process.env.DATA_ID_VALUE_PATH || path.join(process.cwd(), 'data', 'locators.json');
    }

    static get OllamaKey(): string {
        return process.env.OPENAI_KEY || 'mock-key';
    }

    static get OllamaModel(): string {
        return process.env.OLLAMA_MODEL || 'llama3';
    }

    static get OllamaBaseUrl(): string {
        return process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    }

    // Command line args can override env vars if needed, 
    // but for now we follow the .NET pattern of using Env vars primarily.
}
