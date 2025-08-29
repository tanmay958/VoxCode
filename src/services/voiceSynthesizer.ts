import * as vscode from 'vscode';
import axios from 'axios';

export class VoiceSynthesizer {
    private apiKey: string = '';
    private voiceId: string = '';

    constructor() {
        this.updateConfig();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('codeVoiceExplainer.murfApiKey') || 
                event.affectsConfiguration('codeVoiceExplainer.murfVoiceId')) {
                this.updateConfig();
            }
        });
    }

    private updateConfig() {
        const config = vscode.workspace.getConfiguration('codeVoiceExplainer');
        this.apiKey = config.get<string>('murfApiKey') || '';
        this.voiceId = config.get<string>('murfVoiceId') || 'en-US-natalie';
    }

    async synthesizeSpeech(text: string): Promise<Buffer> {
        // If Murf.ai API key is not configured, go straight to OpenAI TTS fallback
        if (!this.apiKey) {
            console.log('Murf.ai API key not configured, using OpenAI TTS fallback');
            return await this.synthesizeWithFallback(text);
        }

        try {
            // Try Murf.ai API first
            return await this.synthesizeWithMurfAI(text);
        } catch (error) {
            console.warn('Murf.ai API failed, trying fallback options:', error);
            
            // Fallback to other TTS options
            try {
                return await this.synthesizeWithFallback(text);
            } catch (fallbackError) {
                throw new Error(`Text-to-speech failed. Murf.ai error: ${error instanceof Error ? error.message : 'Unknown error'}. Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
            }
        }
    }

    private async synthesizeWithMurfAI(text: string): Promise<Buffer> {
        try {
            // Use the correct Murf.ai API format
            const response = await axios.post(
                'https://api.murf.ai/v1/speech/generate',
                {
                    text: text,
                    voiceId: this.voiceId
                },
                {
                    headers: {
                        'api-key': this.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // The API returns an audioFile URL that we can download
            if (response.data.audioFile) {
                return await this.downloadAudio(response.data.audioFile);
            } else {
                throw new Error('No audio file URL received from Murf.ai API');
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const statusCode = error.response?.status;
                const errorData = error.response?.data;
                const errorMessage = errorData?.message || errorData?.error || error.message;
                
                if (statusCode === 401 || statusCode === 403) {
                    throw new Error('Invalid Murf.ai API key. Please check your API key in settings.');
                } else if (statusCode === 429) {
                    throw new Error('Murf.ai API rate limit exceeded. Please try again later.');
                } else if (statusCode === 400) {
                    throw new Error(`Murf.ai API error (400): ${errorMessage}. Please check your request parameters.`);
                } else {
                    throw new Error(`Murf.ai API error (${statusCode}): ${errorMessage}`);
                }
            }
            throw error;
        }
    }



    private async downloadAudio(audioUrl: string): Promise<Buffer> {
        const response = await axios.get(audioUrl, {
            responseType: 'arraybuffer'
        });

        return Buffer.from(response.data);
    }

    // Fallback to OpenAI TTS API (more widely available)
    private async synthesizeWithFallback(text: string): Promise<Buffer> {
        // Try OpenAI TTS as fallback
        const config = vscode.workspace.getConfiguration('codeVoiceExplainer');
        const openaiApiKey = config.get<string>('openaiApiKey');
        
        if (!openaiApiKey) {
            throw new Error('Both Murf.ai and OpenAI API keys are required for TTS fallback');
        }

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/audio/speech',
                {
                    model: 'tts-1',
                    voice: 'alloy',
                    input: text,
                    response_format: 'mp3'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${openaiApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer'
                }
            );

            return Buffer.from(response.data);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const statusCode = error.response?.status;
                const errorMessage = error.response?.data?.error?.message || error.message;
                
                if (statusCode === 401) {
                    throw new Error('Invalid OpenAI API key for TTS fallback');
                } else if (statusCode === 429) {
                    throw new Error('OpenAI TTS rate limit exceeded');
                } else {
                    throw new Error(`OpenAI TTS error: ${errorMessage}`);
                }
            }
            throw error;
        }
    }
}
