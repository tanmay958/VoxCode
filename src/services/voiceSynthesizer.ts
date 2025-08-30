import * as vscode from 'vscode';
import axios from 'axios';

export interface WordTiming {
    word: string;
    startMs: number;
    endMs: number;
}

export interface SynthesisResult {
    audioBuffer: Buffer;
    wordTimings: WordTiming[];
    audioLengthInSeconds: number;
}

export class VoiceSynthesizer {
    private apiKey: string = '';
    private voiceId: string = '';
    private voiceStyle: string = '';

    constructor() {
        this.updateConfig();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('codeVoiceExplainer.murfApiKey') || 
                event.affectsConfiguration('codeVoiceExplainer.murfVoiceId') ||
                event.affectsConfiguration('codeVoiceExplainer.voiceStyle')) {
                this.updateConfig();
            }
        });
    }

    private updateConfig() {
        const config = vscode.workspace.getConfiguration('codeVoiceExplainer');
        this.apiKey = config.get<string>('murfApiKey') || '';
        this.voiceId = config.get<string>('murfVoiceId') || 'en-US-natalie';
        this.voiceStyle = config.get<string>('voiceStyle') || 'Conversational';
        
        console.log(`🎵 Voice updated: ${this.voiceId} with style: ${this.voiceStyle}`);
    }

    async synthesizeSpeech(text: string): Promise<Buffer> {
        const result = await this.synthesizeSpeechWithTiming(text);
        return result.audioBuffer;
    }

    async synthesizeSpeechWithTiming(text: string): Promise<SynthesisResult> {
        // If Murf.ai API key is not configured, go straight to OpenAI TTS fallback
        if (!this.apiKey) {
            console.log('Murf.ai API key not configured, using OpenAI TTS fallback');
            return await this.synthesizeWithFallbackTiming(text);
        }

        try {
            // Try Murf.ai API first
            return await this.synthesizeWithMurfAITiming(text);
        } catch (error) {
            console.warn('Murf.ai API failed, trying fallback options:', error);
            
            // Fallback to other TTS options
            try {
                return await this.synthesizeWithFallbackTiming(text);
            } catch (fallbackError) {
                throw new Error(`Text-to-speech failed. Murf.ai error: ${error instanceof Error ? error.message : 'Unknown error'}. Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
            }
        }
    }

    private async synthesizeWithMurfAI(text: string): Promise<Buffer> {
        const result = await this.synthesizeWithMurfAITiming(text);
        return result.audioBuffer;
    }

    private async synthesizeWithMurfAITiming(text: string): Promise<SynthesisResult> {
        try {
            // Use the correct Murf.ai API format with voice style
            const requestBody: any = {
                text: text,
                voiceId: this.voiceId
            };

            // Add voice style if configured
            if (this.voiceStyle && this.voiceStyle !== 'Conversational') {
                requestBody.style = this.voiceStyle;
            }

            console.log(`🎵 Murf.ai request: ${this.voiceId} (${this.voiceStyle}) - "${text.substring(0, 50)}..."`);

            const response = await axios.post(
                'https://api.murf.ai/v1/speech/generate',
                requestBody,
                {
                    headers: {
                        'api-key': this.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // The API returns an audioFile URL and timing data
            if (response.data.audioFile) {
                const audioBuffer = await this.downloadAudio(response.data.audioFile);
                
                // Extract word timings from Murf.ai response
                const wordTimings: WordTiming[] = (response.data.wordDurations || []).map((word: any) => ({
                    word: word.word || '',
                    startMs: word.startMs || 0,
                    endMs: word.endMs || 0
                }));

                return {
                    audioBuffer,
                    wordTimings,
                    audioLengthInSeconds: response.data.audioLengthInSeconds || 0
                };
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
        const result = await this.synthesizeWithFallbackTiming(text);
        return result.audioBuffer;
    }

    private async synthesizeWithFallbackTiming(text: string): Promise<SynthesisResult> {
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

            const audioBuffer = Buffer.from(response.data);
            
            // OpenAI doesn't provide word timings, so we estimate based on word count
            const words = text.split(/\s+/);
            const estimatedDurationSeconds = words.length * 0.5; // Rough estimate: 0.5 seconds per word
            const wordTimings: WordTiming[] = words.map((word, index) => ({
                word,
                startMs: index * 500, // 500ms per word
                endMs: (index + 1) * 500
            }));

            return {
                audioBuffer,
                wordTimings,
                audioLengthInSeconds: estimatedDurationSeconds
            };
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
