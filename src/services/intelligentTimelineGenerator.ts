import OpenAI from 'openai';
import * as vscode from 'vscode';
import { WordTiming } from './voiceSynthesizer';
import { CodeToken } from '../utils/tokenHighlighter';

export interface IntelligentHighlightFrame {
    timeMs: number;
    durationMs: number;
    tokenIds: string[];
    explanation: string;
    confidence: number;
    highlightType: 'high' | 'medium' | 'low';
}

export interface IntelligentTimeline {
    frames: IntelligentHighlightFrame[];
    totalDurationMs: number;
    audioUrl: string;
    explanation: string;
    metadata: {
        totalFrames: number;
        llmModel: string;
        generatedAt: string;
    };
}

export class IntelligentTimelineGenerator {
    private openai: OpenAI | null = null;

    constructor() {
        this.initializeOpenAI();
    }

    private initializeOpenAI() {
        const config = vscode.workspace.getConfiguration('codeVoiceExplainer');
        const apiKey = config.get<string>('openaiApiKey');
        
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
        }
    }

    /**
     * Generate intelligent timeline using LLM analysis
     */
    async generateTimeline(
        explanation: string,
        code: string,
        language: string,
        wordTimings: WordTiming[],
        tokens: Map<string, CodeToken>,
        audioUrl: string,
        audioDurationMs: number
    ): Promise<IntelligentTimeline> {
        if (!this.openai) {
            throw new Error('OpenAI API key not configured for intelligent timeline generation');
        }

        console.log('🧠 Generating intelligent timeline with LLM...');

        // Prepare token mapping for LLM
        const tokenList = Array.from(tokens.entries()).map(([id, token]) => ({
            id,
            text: token.text,
            type: token.type,
            line: token.line,
            startChar: token.startChar,
            endChar: token.endChar
        }));

        // Create the prompt for LLM
        const prompt = this.buildIntelligentPrompt(
            explanation,
            code,
            language,
            wordTimings,
            tokenList,
            audioDurationMs
        );

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at creating precise code highlighting timelines synchronized with audio explanations. You analyze the explanation, code, word timings, and create accurate second-by-second highlighting instructions.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1,
                response_format: { type: 'json_object' }
            });

            const llmResponse = response.choices[0]?.message?.content;
            if (!llmResponse) {
                throw new Error('No response from LLM for timeline generation');
            }

            console.log('🧠 LLM Response received, parsing timeline...');
            const intelligentTimeline = this.parseIntelligentResponse(
                llmResponse,
                audioUrl,
                audioDurationMs,
                explanation
            );

            console.log(`✅ Intelligent timeline created: ${intelligentTimeline.frames.length} frames`);
            return intelligentTimeline;

        } catch (error) {
            console.error('❌ Error generating intelligent timeline:', error);
            throw new Error(`Failed to generate intelligent timeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private buildIntelligentPrompt(
        explanation: string,
        code: string,
        language: string,
        wordTimings: WordTiming[],
        tokenList: Array<{
            id: string;
            text: string;
            type: string;
            line: number;
            startChar: number;
            endChar: number;
        }>,
        audioDurationMs: number
    ): string {
        return `Create a precise timeline for highlighting code tokens synchronized with audio explanation.

EXPLANATION TEXT:
"""
${explanation}
"""

CODE (${language}):
"""
${code}
"""

WORD TIMINGS (what words are spoken when):
${wordTimings.map(w => `"${w.word}" at ${w.startMs}-${w.endMs}ms`).join('\n')}

AVAILABLE CODE TOKENS TO HIGHLIGHT:
${tokenList.map(t => `${t.id}: "${t.text}" (${t.type}) at line ${t.line}, chars ${t.startChar}-${t.endChar}`).join('\n')}

AUDIO DURATION: ${audioDurationMs}ms

TASK:
Create a JSON timeline that specifies exactly what code tokens to highlight at each moment during the audio playback. Consider:

1. **Semantic Matching**: When the explanation mentions concepts, highlight related code elements
2. **Timing Accuracy**: Use the word timings to determine when to highlight each element  
3. **Context Awareness**: Highlight supporting code when explaining a concept (e.g., highlight function name when explaining what the function does)
4. **Visual Flow**: Create smooth highlighting that guides the user's attention through the code logically
5. **Confidence Levels**: Rate how confident you are about each highlight (0.0-1.0)

RULES:
- Each highlight should last at least 500ms for visibility
- Overlap highlights when multiple tokens are relevant
- Use 'high' confidence (0.8+) for direct mentions, 'medium' (0.5-0.8) for related concepts, 'low' (0.2-0.5) for context
- Include brief explanation for each highlight frame
- Cover the entire audio duration with appropriate highlights

OUTPUT FORMAT (JSON):
{
  "frames": [
    {
      "timeMs": 0,
      "durationMs": 1000,
      "tokenIds": ["token_1", "token_2"],
      "explanation": "Introducing the function",
      "confidence": 0.9,
      "highlightType": "high"
    }
  ]
}`;
    }

    private parseIntelligentResponse(
        llmResponse: string,
        audioUrl: string,
        audioDurationMs: number,
        explanation: string
    ): IntelligentTimeline {
        try {
            const parsed = JSON.parse(llmResponse);
            
            if (!parsed.frames || !Array.isArray(parsed.frames)) {
                throw new Error('Invalid LLM response: missing frames array');
            }

            const frames: IntelligentHighlightFrame[] = parsed.frames.map((frame: any, index: number) => {
                // Validate frame structure
                if (typeof frame.timeMs !== 'number' || 
                    typeof frame.durationMs !== 'number' ||
                    !Array.isArray(frame.tokenIds)) {
                    throw new Error(`Invalid frame ${index}: missing required fields`);
                }

                return {
                    timeMs: frame.timeMs,
                    durationMs: frame.durationMs,
                    tokenIds: frame.tokenIds,
                    explanation: frame.explanation || `Frame ${index + 1}`,
                    confidence: Math.max(0, Math.min(1, frame.confidence || 0.5)),
                    highlightType: this.determineHighlightType(frame.confidence || 0.5)
                };
            });

            // Sort frames by time
            frames.sort((a, b) => a.timeMs - b.timeMs);

            return {
                frames,
                totalDurationMs: audioDurationMs,
                audioUrl,
                explanation,
                metadata: {
                    totalFrames: frames.length,
                    llmModel: 'gpt-4o',
                    generatedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private determineHighlightType(confidence: number): 'high' | 'medium' | 'low' {
        if (confidence >= 0.8) return 'high';
        if (confidence >= 0.5) return 'medium';
        return 'low';
    }

    /**
     * Update configuration when API key changes
     */
    updateConfig() {
        this.initializeOpenAI();
    }

    /**
     * Get diagnostics about the intelligent timeline
     */
    getDiagnostics(timeline: IntelligentTimeline): {
        frameStats: {
            total: number;
            averageDuration: number;
            totalCoverage: number;
        };
        confidenceStats: {
            high: number;
            medium: number;
            low: number;
            average: number;
        };
        tokenUsage: {
            uniqueTokens: number;
            totalHighlights: number;
            averageTokensPerFrame: number;
        };
    } {
        const frames = timeline.frames;
        
        const frameStats = {
            total: frames.length,
            averageDuration: frames.length > 0 ? 
                frames.reduce((sum, f) => sum + f.durationMs, 0) / frames.length : 0,
            totalCoverage: frames.reduce((sum, f) => sum + f.durationMs, 0)
        };

        const confidenceStats = {
            high: frames.filter(f => f.highlightType === 'high').length,
            medium: frames.filter(f => f.highlightType === 'medium').length,
            low: frames.filter(f => f.highlightType === 'low').length,
            average: frames.length > 0 ? 
                frames.reduce((sum, f) => sum + f.confidence, 0) / frames.length : 0
        };

        const allTokenIds = new Set<string>();
        let totalHighlights = 0;
        
        frames.forEach(frame => {
            frame.tokenIds.forEach(id => allTokenIds.add(id));
            totalHighlights += frame.tokenIds.length;
        });

        const tokenUsage = {
            uniqueTokens: allTokenIds.size,
            totalHighlights,
            averageTokensPerFrame: frames.length > 0 ? totalHighlights / frames.length : 0
        };

        return {
            frameStats,
            confidenceStats,
            tokenUsage
        };
    }
}
