import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import fs from 'fs-extra';

export class ReportManager {
    private static metrics: any[] = [];

    static addMetric(name: string, durationMs: number, status: string, error?: string) {
        this.metrics.push({
            timestamp: new Date().toISOString(),
            name,
            durationMs,
            status,
            error: error || ''
        });
    }

    static async saveMetrics(filePath: string): Promise<void> {
        try {
            await fs.ensureDir(path.dirname(filePath));

            const csvWriter = createObjectCsvWriter({
                path: filePath,
                header: [
                    { id: 'timestamp', title: 'Timestamp' },
                    { id: 'name', title: 'Test Name' },
                    { id: 'durationMs', title: 'Duration (ms)' },
                    { id: 'status', title: 'Status' },
                    { id: 'error', title: 'Error' }
                ]
            });

            await csvWriter.writeRecords(this.metrics);
            console.log(`Metrics saved to ${filePath}`);
        } catch (error) {
            console.error('Failed to save metrics:', error);
        }
    }
}
