import { WordTiming } from '../services/voiceSynthesizer';
import { CodeToken } from './tokenHighlighter';

export interface HighlightSegment {
    id: string;
    startTimeMs: number;
    endTimeMs: number;
    tokenIds: string[];
    confidence: number;
    description: string;
    highlightType: 'high' | 'medium' | 'low';
}

export interface PreprocessedTimeline {
    segments: HighlightSegment[];
    totalDurationMs: number;
    audioUrl: string;
    overallConfidence: number;
    segmentCount: number;
}

export class PreprocessedTimelineBuilder {
    private tokens: Map<string, CodeToken> = new Map();

    /**
     * Initialize with parsed tokens
     */
    initialize(tokens: Map<string, CodeToken>) {
        this.tokens = new Map(tokens);
    }

    /**
     * Build complete preprocessed timeline after audio is generated
     */
    buildTimeline(
        explanation: string,
        wordTimings: WordTiming[],
        audioUrl: string
    ): PreprocessedTimeline {
        console.log('🎯 Building preprocessed timeline...');
        
        // Step 1: Analyze explanation and map words to tokens
        const wordToTokenMappings = this.analyzeExplanationWords(explanation);
        
        // Step 2: Create precise timing segments based on actual audio
        const segments = this.createTimingSegments(wordToTokenMappings, wordTimings);
        
        // Step 3: Optimize segments for better highlighting
        const optimizedSegments = this.optimizeSegments(segments);
        
        // Step 4: Calculate overall metrics
        const overallConfidence = this.calculateOverallConfidence(optimizedSegments);
        
        console.log(`✅ Timeline created: ${optimizedSegments.length} segments, ${overallConfidence.toFixed(2)} confidence`);
        
        return {
            segments: optimizedSegments,
            totalDurationMs: wordTimings.length > 0 ? Math.max(...wordTimings.map(w => w.endMs)) : 0,
            audioUrl,
            overallConfidence,
            segmentCount: optimizedSegments.length
        };
    }

    private analyzeExplanationWords(explanation: string): Array<{
        word: string;
        wordIndex: number;
        tokenIds: string[];
        confidence: number;
        mappingType: 'direct' | 'fuzzy' | 'semantic' | 'contextual';
    }> {
        const words = explanation.toLowerCase().split(/\s+/);
        const mappings: Array<{
            word: string;
            wordIndex: number;
            tokenIds: string[];
            confidence: number;
            mappingType: 'direct' | 'fuzzy' | 'semantic' | 'contextual';
        }> = [];

        words.forEach((word, index) => {
            const cleanWord = this.cleanWord(word);
            if (cleanWord.length > 2) { // Skip very short words
                const tokenMapping = this.findTokensForWord(cleanWord);
                if (tokenMapping.tokenIds.length > 0) {
                    mappings.push({
                        word: cleanWord,
                        wordIndex: index,
                        ...tokenMapping
                    });
                }
            }
        });

        return mappings;
    }

    private cleanWord(word: string): string {
        return word.replace(/[.,!?;:()[\]{}'"]/g, '').trim();
    }

    private findTokensForWord(word: string): {
        tokenIds: string[];
        confidence: number;
        mappingType: 'direct' | 'fuzzy' | 'semantic' | 'contextual';
    } {
        const matchedTokens: Array<{tokenId: string, confidence: number, type: 'direct' | 'fuzzy' | 'semantic' | 'contextual'}> = [];

        // Check all tokens for matches
        this.tokens.forEach((token, tokenId) => {
            const match = this.calculateWordTokenMatch(word, token);
            if (match.confidence > 0.3) {
                matchedTokens.push({
                    tokenId,
                    confidence: match.confidence,
                    type: match.type
                });
            }
        });

        if (matchedTokens.length === 0) {
            return { tokenIds: [], confidence: 0, mappingType: 'direct' };
        }

        // Sort by confidence and take best matches
        matchedTokens.sort((a, b) => b.confidence - a.confidence);
        const bestMatches = matchedTokens.slice(0, 3); // Max 3 tokens per word

        const avgConfidence = bestMatches.reduce((sum, match) => sum + match.confidence, 0) / bestMatches.length;
        const bestType = bestMatches[0].type;

        return {
            tokenIds: bestMatches.map(m => m.tokenId),
            confidence: avgConfidence,
            mappingType: bestType
        };
    }

    private calculateWordTokenMatch(word: string, token: CodeToken): {
        confidence: number;
        type: 'direct' | 'fuzzy' | 'semantic' | 'contextual';
    } {
        const tokenText = token.text.toLowerCase();

        // Direct exact match
        if (word === tokenText) {
            return { confidence: 1.0, type: 'direct' };
        }

        // Check for inclusion
        if (word.includes(tokenText) || tokenText.includes(word)) {
            return { confidence: 0.9, type: 'direct' };
        }

        // Semantic mappings for common spoken forms
        const semanticScore = this.checkSemanticMapping(word, tokenText);
        if (semanticScore > 0) {
            return { confidence: semanticScore, type: 'semantic' };
        }

        // Fuzzy matching for similar words
        const fuzzyScore = this.calculateFuzzyScore(word, tokenText);
        if (fuzzyScore > 0.7) {
            return { confidence: fuzzyScore, type: 'fuzzy' };
        }

        // Contextual matching based on token type
        const contextualScore = this.checkContextualMapping(word, token);
        if (contextualScore > 0) {
            return { confidence: contextualScore, type: 'contextual' };
        }

        return { confidence: 0, type: 'direct' };
    }

    private checkSemanticMapping(word: string, tokenText: string): number {
        const semanticMappings: Record<string, string[]> = {
            // Operators
            '=': ['equals', 'assign', 'assignment', 'set'],
            '==': ['double equals', 'equality', 'equal to'],
            '===': ['triple equals', 'strict equality', 'exactly equal'],
            '+': ['plus', 'add', 'addition', 'sum'],
            '-': ['minus', 'subtract', 'subtraction'],
            '*': ['times', 'multiply', 'multiplication'],
            '/': ['divide', 'division'],
            '++': ['increment', 'increase'],
            '--': ['decrement', 'decrease'],
            '&&': ['and', 'logical and'],
            '||': ['or', 'logical or'],
            '=>': ['arrow', 'arrow function', 'goes to'],
            
            // Punctuation
            '(': ['parenthesis', 'open paren', 'bracket'],
            ')': ['close paren', 'closing parenthesis'],
            '{': ['brace', 'open brace', 'curly brace'],
            '}': ['close brace', 'closing brace'],
            '[': ['bracket', 'open bracket', 'square bracket'],
            ']': ['close bracket', 'closing bracket'],
            ';': ['semicolon'],
            ',': ['comma'],
            '.': ['dot', 'period'],
            
            // Keywords
            'function': ['function', 'method', 'procedure'],
            'const': ['constant', 'const'],
            'let': ['let', 'variable'],
            'var': ['var', 'variable'],
            'if': ['if', 'condition', 'conditional'],
            'else': ['else', 'otherwise'],
            'for': ['for', 'loop', 'iteration'],
            'while': ['while', 'loop'],
            'return': ['return', 'give back', 'output']
        };

        const mappings = semanticMappings[tokenText] || [];
        if (mappings.includes(word)) {
            return 0.95;
        }

        // Check reverse mapping
        for (const [token, words] of Object.entries(semanticMappings)) {
            if (token === word && words.includes(tokenText)) {
                return 0.95;
            }
        }

        return 0;
    }

    private calculateFuzzyScore(word1: string, word2: string): number {
        const longer = word1.length > word2.length ? word1 : word2;
        const shorter = word1.length > word2.length ? word2 : word1;
        
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

    private checkContextualMapping(word: string, token: CodeToken): number {
        const contextMappings: Record<string, string[]> = {
            'function': ['function', 'method'],
            'variable': ['identifier'],
            'condition': ['keyword'],
            'loop': ['keyword'],
            'operator': ['operator'],
            'string': ['string'],
            'number': ['literal']
        };

        for (const [context, types] of Object.entries(contextMappings)) {
            if (word.includes(context) && types.includes(token.type)) {
                return 0.6;
            }
        }

        return 0;
    }

    private createTimingSegments(
        wordMappings: Array<{
            word: string;
            wordIndex: number;
            tokenIds: string[];
            confidence: number;
            mappingType: 'direct' | 'fuzzy' | 'semantic' | 'contextual';
        }>,
        wordTimings: WordTiming[]
    ): HighlightSegment[] {
        const segments: HighlightSegment[] = [];

        wordMappings.forEach((mapping, index) => {
            const wordTiming = wordTimings[mapping.wordIndex];
            if (wordTiming && mapping.tokenIds.length > 0) {
                const segment: HighlightSegment = {
                    id: `segment_${index}`,
                    startTimeMs: wordTiming.startMs,
                    endTimeMs: wordTiming.endMs,
                    tokenIds: mapping.tokenIds,
                    confidence: mapping.confidence,
                    description: `Highlighting '${mapping.word}' (${mapping.mappingType})`,
                    highlightType: this.determineHighlightType(mapping.confidence)
                };
                
                segments.push(segment);
            }
        });

        // Sort by start time
        segments.sort((a, b) => a.startTimeMs - b.startTimeMs);
        
        return segments;
    }

    private determineHighlightType(confidence: number): 'high' | 'medium' | 'low' {
        if (confidence >= 0.8) return 'high';
        if (confidence >= 0.5) return 'medium';
        return 'low';
    }

    private optimizeSegments(segments: HighlightSegment[]): HighlightSegment[] {
        if (segments.length <= 1) return segments;

        const optimized: HighlightSegment[] = [];
        let current = { ...segments[0] };

        for (let i = 1; i < segments.length; i++) {
            const next = segments[i];
            
            // Check if segments overlap or are very close
            const overlap = current.endTimeMs > next.startTimeMs;
            const closeInTime = (next.startTimeMs - current.endTimeMs) < 200; // Within 200ms
            const sameTokens = this.arraysEqual(current.tokenIds, next.tokenIds);
            
            if ((overlap || closeInTime) && sameTokens) {
                // Merge segments
                current.endTimeMs = Math.max(current.endTimeMs, next.endTimeMs);
                current.confidence = Math.max(current.confidence, next.confidence);
                current.description += ` + ${next.description}`;
                current.highlightType = this.determineHighlightType(current.confidence);
            } else {
                // Push current and start new
                optimized.push(current);
                current = { ...next };
            }
        }
        
        optimized.push(current);
        return optimized;
    }

    private arraysEqual(arr1: string[], arr2: string[]): boolean {
        if (arr1.length !== arr2.length) return false;
        return arr1.every(item => arr2.includes(item));
    }

    private calculateOverallConfidence(segments: HighlightSegment[]): number {
        if (segments.length === 0) return 0;
        
        const totalConfidence = segments.reduce((sum, segment) => sum + segment.confidence, 0);
        return totalConfidence / segments.length;
    }

    /**
     * Get diagnostics about the timeline building process
     */
    getDiagnostics(timeline: PreprocessedTimeline): {
        segmentStats: {
            high: number;
            medium: number;
            low: number;
        };
        averageSegmentDuration: number;
        coveragePercentage: number;
        confidenceDistribution: number[];
    } {
        const segmentStats = {
            high: timeline.segments.filter(s => s.highlightType === 'high').length,
            medium: timeline.segments.filter(s => s.highlightType === 'medium').length,
            low: timeline.segments.filter(s => s.highlightType === 'low').length
        };

        const durations = timeline.segments.map(s => s.endTimeMs - s.startTimeMs);
        const averageSegmentDuration = durations.length > 0 ? 
            durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

        const totalHighlightTime = durations.reduce((sum, d) => sum + d, 0);
        const coveragePercentage = timeline.totalDurationMs > 0 ? 
            (totalHighlightTime / timeline.totalDurationMs) * 100 : 0;

        const confidenceDistribution = timeline.segments.map(s => s.confidence);

        return {
            segmentStats,
            averageSegmentDuration,
            coveragePercentage,
            confidenceDistribution
        };
    }
}
