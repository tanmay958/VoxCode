import * as vscode from 'vscode';
import axios from 'axios';

export class CodeExplainer {
    private apiKey: string = '';

    constructor() {
        this.updateApiKey();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('codeVoiceExplainer.openaiApiKey')) {
                this.updateApiKey();
            }
        });
    }

    private updateApiKey() {
        const config = vscode.workspace.getConfiguration('codeVoiceExplainer');
        this.apiKey = config.get<string>('openaiApiKey') || '';
    }

    async explainCode(code: string, language: string, fileName: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const config = vscode.workspace.getConfiguration('codeVoiceExplainer');
        const explanationDetail = config.get<string>('explanationDetail') || 'detailed';

        const prompt = this.buildPrompt(code, language, fileName, explanationDetail);

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert software engineer who explains code clearly and concisely for voice synthesis. Your explanations should be conversational, easy to understand when spoken aloud, and avoid complex formatting.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.3
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const explanation = response.data.choices[0]?.message?.content;
            if (!explanation) {
                throw new Error('No explanation received from OpenAI');
            }

            return this.cleanExplanationForSpeech(explanation);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const statusCode = error.response?.status;
                const errorMessage = error.response?.data?.error?.message || error.message;
                
                if (statusCode === 401) {
                    throw new Error('Invalid OpenAI API key. Please check your configuration.');
                } else if (statusCode === 429) {
                    throw new Error('OpenAI API rate limit exceeded. Please try again later.');
                } else {
                    throw new Error(`OpenAI API error: ${errorMessage}`);
                }
            }
            throw error;
        }
    }

    private buildPrompt(code: string, language: string, fileName: string, detail: string): string {
        const detailInstructions = {
            brief: 'Provide a brief, high-level explanation in 2-3 sentences.',
            detailed: 'Provide a detailed explanation covering the main functionality, key components, and logic flow.',
            comprehensive: 'Provide a comprehensive explanation including functionality, design patterns, potential improvements, and edge cases.'
        };

        const instruction = detailInstructions[detail as keyof typeof detailInstructions] || detailInstructions.detailed;

        return `Please explain this ${language} code from file "${fileName}". ${instruction}

The explanation will be converted to speech, so:
- Use natural, conversational language
- Avoid special characters and complex formatting
- Spell out symbols (e.g., "equals" instead of "=", "arrow function" instead of "=>")
- Break down complex concepts into simple terms
- Use short sentences that flow well when spoken

Code to explain:
\`\`\`${language}
${code}
\`\`\``;
    }

    private cleanExplanationForSpeech(explanation: string): string {
        return explanation
            // Remove markdown formatting
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/#{1,6}\s/g, '')
            
            // Replace common programming symbols with words
            .replace(/\b=>\b/g, ' arrow function ')
            .replace(/\b=\b/g, ' equals ')
            .replace(/\b==\b/g, ' double equals ')
            .replace(/\b===\b/g, ' triple equals ')
            .replace(/\b!=\b/g, ' not equals ')
            .replace(/\b!==\b/g, ' not triple equals ')
            .replace(/\b&&\b/g, ' and ')
            .replace(/\b\|\|\b/g, ' or ')
            .replace(/\b!\b/g, ' not ')
            .replace(/\b\+\+\b/g, ' increment ')
            .replace(/\b--\b/g, ' decrement ')
            .replace(/\b\+=\b/g, ' plus equals ')
            .replace(/\b-=\b/g, ' minus equals ')
            .replace(/\b\*=\b/g, ' times equals ')
            .replace(/\b\/=\b/g, ' divided by equals ')
            
            // Clean up extra whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }
}
