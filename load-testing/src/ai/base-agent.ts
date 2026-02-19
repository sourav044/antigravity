import OpenAI from 'openai';
import { Config } from '../core/config';

export class BaseAgent {
    protected openai: OpenAI;
    protected model: string;

    constructor() {
        this.openai = new OpenAI({
            apiKey: Config.OllamaKey,
            baseURL: Config.OllamaBaseUrl + '/v1', // Ollama compatible endpoint
        });
        this.model = Config.OllamaModel;
    }

    protected async prompt(systemPrompt: string, userPrompt: string): Promise<string> {
        try {
            const completion = await this.openai.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                model: this.model,
            });

            return completion.choices[0]?.message?.content || '';
        } catch (error) {
            console.error('AI Request Failed:', error);
            // Fallback for mocked environment if no actual LLM is reachable
            return this.mockResponse(userPrompt);
        }
    }

    protected mockResponse(input: string): string {
        return `Mock response for: ${input}`;
    }
}
