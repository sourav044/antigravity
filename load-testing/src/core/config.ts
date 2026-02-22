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

    static get Timeout(): number {
        return parseInt(process.env.TIMEOUT || '15000', 10);
    }

    static get Workers(): number | undefined {
        const workers = parseInt(process.env.WORKERS || '', 10);
        return isNaN(workers) ? undefined : workers;
    }

    // Command line args can override env vars if needed, 
    // but for now we follow the .NET pattern of using Env vars primarily.
}
