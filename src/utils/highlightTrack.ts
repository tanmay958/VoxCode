import { CodeToken } from './tokenHighlighter';

export interface HighlightFrame {
    timeMs: number; // Exact time in milliseconds
    tokenIds: string[]; // Which tokens to highlight
    confidence: number; // Confidence level (0-1)
    highlightType: 'high' | 'medium' | 'low';
}

export interface HighlightTrack {
    frames: HighlightFrame[]; // Time-ordered frames
    durationMs: number; // Total track duration (should match audio)
    frameRate: number; // Frames per second (e.g., 10 = every 100ms)
    audioUrl: string; // Audio file URL
    metadata: {
        totalFrames: number;
        averageConfidence: number;
        trackVersion: string;
    };
}

export class HighlightTrackBuilder {
    private frameRate: number = 10; // 10 FPS = every 100ms

    /**
     * Set the frame rate for the highlight track
     */
    setFrameRate(fps: number) {
        this.frameRate = Math.max(1, Math.min(60, fps)); // 1-60 FPS
    }

    /**
     * Build a highlight track from word timings and token mappings
     */
    buildTrack(
        explanation: string,
        wordTimings: Array<{word: string, startMs: number, endMs: number}>,
        tokens: Map<string, CodeToken>,
        audioUrl: string,
        audioDurationMs: number
    ): HighlightTrack {
        console.log(`🎬 Building highlight track: ${audioDurationMs}ms, ${this.frameRate}fps`);

        // Step 1: Map words to tokens
        const wordToTokenMappings = this.mapWordsToTokens(explanation, wordTimings, tokens);

        // Step 2: Create frames at regular intervals
        const frames = this.createFrames(wordToTokenMappings, audioDurationMs);

        // Step 3: Calculate metadata
        const metadata = this.calculateMetadata(frames);

        const track: HighlightTrack = {
            frames,
            durationMs: audioDurationMs,
            frameRate: this.frameRate,
            audioUrl,
            metadata
        };

        console.log(`✅ Track built: ${frames.length} frames, ${metadata.averageConfidence.toFixed(2)} avg confidence`);
        return track;
    }

    private mapWordsToTokens(
        explanation: string,
        wordTimings: Array<{word: string, startMs: number, endMs: number}>,
        tokens: Map<string, CodeToken>
    ): Array<{
        startMs: number;
        endMs: number;
        tokenIds: string[];
        confidence: number;
    }> {
        const words = explanation.toLowerCase().split(/\s+/);
        const mappings: Array<{
            startMs: number;
            endMs: number;
            tokenIds: string[];
            confidence: number;
        }> = [];

        wordTimings.forEach((timing, index) => {
            if (index < words.length) {
                const word = this.cleanWord(words[index]);
                const tokenMatch = this.findTokensForWord(word, tokens);
                
                if (tokenMatch.tokenIds.length > 0) {
                    mappings.push({
                        startMs: timing.startMs,
                        endMs: timing.endMs,
                        tokenIds: tokenMatch.tokenIds,
                        confidence: tokenMatch.confidence
                    });
                }
            }
        });

        return mappings;
    }

    private cleanWord(word: string): string {
        return word.replace(/[.,!?;:()[\]{}'"]/g, '').trim();
    }

    private findTokensForWord(word: string, tokens: Map<string, CodeToken>): {
        tokenIds: string[];
        confidence: number;
    } {
        const matches: Array<{id: string, confidence: number}> = [];

        tokens.forEach((token, tokenId) => {
            const confidence = this.calculateWordTokenMatch(word, token);
            if (confidence > 0.3) {
                matches.push({ id: tokenId, confidence });
            }
        });

        if (matches.length === 0) {
            return { tokenIds: [], confidence: 0 };
        }

        // Sort by confidence and take best matches
        matches.sort((a, b) => b.confidence - a.confidence);
        const bestMatches = matches.slice(0, 2); // Max 2 tokens per word

        const avgConfidence = bestMatches.reduce((sum, match) => sum + match.confidence, 0) / bestMatches.length;

        return {
            tokenIds: bestMatches.map(m => m.id),
            confidence: avgConfidence
        };
    }

    private calculateWordTokenMatch(word: string, token: CodeToken): number {
        const tokenText = token.text.toLowerCase();

        // Direct match
        if (word === tokenText) {
            return 1.0;
        }

        // Inclusion match
        if (word.includes(tokenText) || tokenText.includes(word)) {
            return 0.9;
        }

        // Semantic mappings
        const semanticScore = this.getSemanticScore(word, tokenText);
        if (semanticScore > 0) {
            return semanticScore;
        }

        // Fuzzy match for longer words
        if (word.length > 3 && tokenText.length > 3) {
            const similarity = this.calculateSimilarity(word, tokenText);
            if (similarity > 0.7) {
                return similarity * 0.8; // Reduce confidence for fuzzy matches
            }
        }

        return 0;
    }

    private getSemanticScore(word: string, tokenText: string): number {
        const semanticMappings: Record<string, string[]> = {
            // Operators
            '=': ['equals', 'assign', 'assignment'],
            '==': ['double equals', 'equality'],
            '===': ['triple equals', 'strict equality'],
            '+': ['plus', 'add'],
            '-': ['minus', 'subtract'],
            '*': ['times', 'multiply'],
            '/': ['divide'],
            '++': ['increment'],
            '--': ['decrement'],
            '&&': ['and'],
            '||': ['or'],
            '=>': ['arrow'],
            // Punctuation
            '(': ['parenthesis', 'paren'],
            ')': ['close paren'],
            '{': ['brace'],
            '}': ['close brace'],
            '[': ['bracket'],
            ']': ['close bracket'],
            // Keywords
            'function': ['function', 'method'],
            'const': ['constant'],
            'let': ['variable'],
            'var': ['variable'],
            'if': ['condition'],
            'for': ['loop']
        };

        const mappings = semanticMappings[tokenText] || [];
        return mappings.includes(word) ? 0.95 : 0;
    }

    private calculateSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    private createFrames(
        wordMappings: Array<{
            startMs: number;
            endMs: number;
            tokenIds: string[];
            confidence: number;
        }>,
        audioDurationMs: number
    ): HighlightFrame[] {
        const frames: HighlightFrame[] = [];
        const intervalMs = 1000 / this.frameRate; // e.g., 100ms for 10fps

        // Create frames at regular intervals
        for (let timeMs = 0; timeMs <= audioDurationMs; timeMs += intervalMs) {
            const activeTokens = new Set<string>();
            let maxConfidence = 0;

            // Find all word mappings active at this time
            wordMappings.forEach(mapping => {
                if (timeMs >= mapping.startMs && timeMs <= mapping.endMs) {
                    mapping.tokenIds.forEach(tokenId => activeTokens.add(tokenId));
                    maxConfidence = Math.max(maxConfidence, mapping.confidence);
                }
            });

            // Create frame if there are tokens to highlight
            if (activeTokens.size > 0) {
                const frame: HighlightFrame = {
                    timeMs: Math.round(timeMs),
                    tokenIds: Array.from(activeTokens),
                    confidence: maxConfidence,
                    highlightType: this.getHighlightType(maxConfidence)
                };
                frames.push(frame);
            } else {
                // Create empty frame to clear highlights
                const frame: HighlightFrame = {
                    timeMs: Math.round(timeMs),
                    tokenIds: [],
                    confidence: 0,
                    highlightType: 'low'
                };
                frames.push(frame);
            }
        }

        return frames;
    }

    private getHighlightType(confidence: number): 'high' | 'medium' | 'low' {
        if (confidence >= 0.8) return 'high';
        if (confidence >= 0.5) return 'medium';
        return 'low';
    }

    private calculateMetadata(frames: HighlightFrame[]): {
        totalFrames: number;
        averageConfidence: number;
        trackVersion: string;
    } {
        const totalFrames = frames.length;
        const framesWithHighlights = frames.filter(f => f.tokenIds.length > 0);
        
        const averageConfidence = framesWithHighlights.length > 0 ? 
            framesWithHighlights.reduce((sum, frame) => sum + frame.confidence, 0) / framesWithHighlights.length : 0;

        return {
            totalFrames,
            averageConfidence,
            trackVersion: '1.0'
        };
    }

    /**
     * Get diagnostics about track building
     */
    getDiagnostics(track: HighlightTrack): {
        frameStats: {
            total: number;
            withHighlights: number;
            empty: number;
        };
        confidenceStats: {
            high: number;
            medium: number;
            low: number;
        };
        timingStats: {
            duration: number;
            frameRate: number;
            coverage: number; // Percentage of time with highlights
        };
    } {
        const framesWithHighlights = track.frames.filter(f => f.tokenIds.length > 0);
        const frameStats = {
            total: track.frames.length,
            withHighlights: framesWithHighlights.length,
            empty: track.frames.length - framesWithHighlights.length
        };

        const confidenceStats = {
            high: track.frames.filter(f => f.highlightType === 'high').length,
            medium: track.frames.filter(f => f.highlightType === 'medium').length,
            low: track.frames.filter(f => f.highlightType === 'low').length
        };

        const coverage = track.frames.length > 0 ? (framesWithHighlights.length / track.frames.length) * 100 : 0;
        const timingStats = {
            duration: track.durationMs,
            frameRate: track.frameRate,
            coverage
        };

        return {
            frameStats,
            confidenceStats,
            timingStats
        };
    }
}
