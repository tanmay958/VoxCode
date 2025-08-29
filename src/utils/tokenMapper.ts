import { CodeToken, TokenHighlightEvent } from './tokenHighlighter';
import { WordTiming } from '../services/voiceSynthesizer';
import { IndexedCode } from './codeIndexer';

export interface TokenMapping {
    wordIndex: number;
    word: string;
    tokenIds: string[];
    confidence: number;
    mappingType: 'direct' | 'fuzzy' | 'semantic' | 'contextual';
}

export interface TokenTimeline {
    events: TokenHighlightEvent[];
    totalDuration: number;
    mappingConfidence: number;
}

export class TokenMapper {
    private allTokens: Map<string, CodeToken> = new Map();
    private wordToTokenMappings: TokenMapping[] = [];

    /**
     * Initialize with tokens from TokenHighlighter
     */
    initialize(tokens: Map<string, CodeToken>) {
        this.allTokens = new Map(tokens);
        this.wordToTokenMappings = [];
    }

    /**
     * Create token-level timeline from explanation and word timings
     */
    createTokenTimeline(
        explanation: string, 
        wordTimings: WordTiming[], 
        indexedCode?: IndexedCode
    ): TokenTimeline {
        // First, create word-to-token mappings
        this.createWordToTokenMappings(explanation);

        // Then create timed events
        const events = this.createTimedTokenEvents(wordTimings);

        // Calculate overall mapping confidence
        const mappingConfidence = this.calculateOverallMappingConfidence();

        return {
            events,
            totalDuration: wordTimings.length > 0 ? 
                Math.max(...wordTimings.map(w => w.endMs)) : 0,
            mappingConfidence
        };
    }

    private createWordToTokenMappings(explanation: string) {
        const words = explanation.split(/\s+/);
        this.wordToTokenMappings = [];

        words.forEach((word, index) => {
            const cleanWord = this.cleanWord(word);
            const tokenIds = this.findTokensForWord(cleanWord);
            
            if (tokenIds.length > 0) {
                const mapping: TokenMapping = {
                    wordIndex: index,
                    word: cleanWord,
                    tokenIds,
                    confidence: this.calculateMappingConfidence(cleanWord, tokenIds),
                    mappingType: this.determineMappingType(cleanWord, tokenIds)
                };
                
                this.wordToTokenMappings.push(mapping);
            }
        });
    }

    private cleanWord(word: string): string {
        // Remove punctuation and convert to lowercase
        return word.toLowerCase()
            .replace(/[.,!?;:()[\]{}'"]/g, '')
            .trim();
    }

    private findTokensForWord(word: string): string[] {
        const matchedTokenIds: string[] = [];

        this.allTokens.forEach((token, tokenId) => {
            const confidence = this.calculateWordTokenMatch(word, token);
            if (confidence > 0.6) { // Threshold for token matching
                matchedTokenIds.push(tokenId);
            }
        });

        return matchedTokenIds;
    }

    private calculateWordTokenMatch(word: string, token: CodeToken): number {
        const tokenText = token.text.toLowerCase();
        
        // Direct match
        if (word === tokenText) {
            return 1.0;
        }

        // Check if word contains token or vice versa
        if (word.includes(tokenText) || tokenText.includes(word)) {
            return 0.9;
        }

        // Special mappings for common spoken forms
        const spokenMappings = this.getSpokenMappings();
        if (spokenMappings[word] === tokenText || spokenMappings[tokenText] === word) {
            return 0.95;
        }

        // Fuzzy matching for identifiers and keywords
        if (token.type === 'identifier' || token.type === 'keyword') {
            return this.calculateLevenshteinSimilarity(word, tokenText);
        }

        // Context-based matching
        const contextScore = this.calculateContextualMatch(word, token);
        if (contextScore > 0.7) {
            return contextScore;
        }

        return 0;
    }

    private getSpokenMappings(): Record<string, string> {
        return {
            // Operators
            'equals': '=',
            'assign': '=',
            'assignment': '=',
            'double equals': '==',
            'equality': '==',
            'triple equals': '===',
            'strict equality': '===',
            'plus': '+',
            'add': '+',
            'addition': '+',
            'minus': '-',
            'subtract': '-',
            'subtraction': '-',
            'times': '*',
            'multiply': '*',
            'multiplication': '*',
            'divide': '/',
            'division': '/',
            'increment': '++',
            'decrement': '--',
            'and': '&&',
            'logical and': '&&',
            'or': '||',
            'logical or': '||',
            'arrow': '=>',
            'arrow function': '=>',
            
            // Punctuation
            'parenthesis': '(',
            'open paren': '(',
            'close paren': ')',
            'closing parenthesis': ')',
            'brace': '{',
            'open brace': '{',
            'curly brace': '{',
            'close brace': '}',
            'closing brace': '}',
            'bracket': '[',
            'open bracket': '[',
            'square bracket': '[',
            'close bracket': ']',
            'closing bracket': ']',
            'semicolon': ';',
            'comma': ',',
            'dot': '.',
            'period': '.',
            
            // Keywords variations
            'function': 'function',
            'method': 'function',
            'procedure': 'function',
            'variable': 'var',
            'constant': 'const',
            'condition': 'if',
            'loop': 'for',
            'iteration': 'for',
            'return': 'return',
            'class': 'class',
            'object': 'class'
        };
    }

    private calculateLevenshteinSimilarity(str1: string, str2: string): number {
        const matrix = Array(str2.length + 1).fill(null).map(() => 
            Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) {
            matrix[0][i] = i;
        }

        for (let j = 0; j <= str2.length; j++) {
            matrix[j][0] = j;
        }

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,     // deletion
                    matrix[j - 1][i] + 1,     // insertion
                    matrix[j - 1][i - 1] + indicator   // substitution
                );
            }
        }

        const distance = matrix[str2.length][str1.length];
        const maxLength = Math.max(str1.length, str2.length);
        
        return maxLength > 0 ? 1 - (distance / maxLength) : 1;
    }

    private calculateContextualMatch(word: string, token: CodeToken): number {
        // Context-based matching using surrounding code understanding
        const contextWords = [
            'function', 'method', 'variable', 'parameter', 'argument',
            'condition', 'loop', 'iteration', 'return', 'class', 'object',
            'property', 'attribute', 'value', 'result', 'output'
        ];

        if (contextWords.includes(word)) {
            // If the word describes what the token is, give it a good score
            switch (word) {
                case 'function':
                case 'method':
                    return token.type === 'keyword' && token.text === 'function' ? 0.9 : 0;
                case 'variable':
                    return token.type === 'identifier' ? 0.7 : 0;
                case 'condition':
                    return token.type === 'keyword' && ['if', 'else', 'elif'].includes(token.text) ? 0.8 : 0;
                case 'loop':
                case 'iteration':
                    return token.type === 'keyword' && ['for', 'while'].includes(token.text) ? 0.8 : 0;
                default:
                    return 0;
            }
        }

        return 0;
    }

    private calculateMappingConfidence(word: string, tokenIds: string[]): number {
        if (tokenIds.length === 0) {
            return 0;
        }

        // Calculate average confidence across all matched tokens
        const confidences = tokenIds.map(tokenId => {
            const token = this.allTokens.get(tokenId);
            return token ? this.calculateWordTokenMatch(word, token) : 0;
        });

        const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
        
        // Adjust based on number of matches (prefer fewer, more specific matches)
        const countPenalty = tokenIds.length > 3 ? 0.8 : 1.0;
        
        return avgConfidence * countPenalty;
    }

    private determineMappingType(word: string, tokenIds: string[]): TokenMapping['mappingType'] {
        if (tokenIds.length === 0) {
            return 'direct';
        }

        const firstToken = this.allTokens.get(tokenIds[0]);
        if (!firstToken) {
            return 'direct';
        }

        // Check if it's a direct word match
        if (word === firstToken.text.toLowerCase()) {
            return 'direct';
        }

        // Check if it's a known spoken form
        const spokenMappings = this.getSpokenMappings();
        if (spokenMappings[word] === firstToken.text) {
            return 'semantic';
        }

        // Check if it's a fuzzy match
        const similarity = this.calculateLevenshteinSimilarity(word, firstToken.text.toLowerCase());
        if (similarity > 0.8) {
            return 'fuzzy';
        }

        return 'contextual';
    }

    private createTimedTokenEvents(wordTimings: WordTiming[]): TokenHighlightEvent[] {
        const events: TokenHighlightEvent[] = [];

        this.wordToTokenMappings.forEach(mapping => {
            const wordTiming = wordTimings[mapping.wordIndex];
            if (wordTiming && mapping.tokenIds.length > 0) {
                const event: TokenHighlightEvent = {
                    tokenIds: mapping.tokenIds,
                    startTimeMs: wordTiming.startMs,
                    endTimeMs: wordTiming.endMs,
                    confidence: mapping.confidence
                };
                
                events.push(event);
            }
        });

        // Sort events by start time
        events.sort((a, b) => a.startTimeMs - b.startTimeMs);

        // Merge overlapping events with similar confidence
        return this.mergeOverlappingEvents(events);
    }

    private mergeOverlappingEvents(events: TokenHighlightEvent[]): TokenHighlightEvent[] {
        if (events.length <= 1) {
            return events;
        }

        const merged: TokenHighlightEvent[] = [];
        let current = { ...events[0] };

        for (let i = 1; i < events.length; i++) {
            const next = events[i];
            
            // Check if events overlap and have similar confidence
            const overlap = current.endTimeMs > next.startTimeMs;
            const similarConfidence = Math.abs(current.confidence - next.confidence) < 0.2;
            
            if (overlap && similarConfidence) {
                // Merge events
                current.tokenIds = [...current.tokenIds, ...next.tokenIds];
                current.endTimeMs = Math.max(current.endTimeMs, next.endTimeMs);
                current.confidence = (current.confidence + next.confidence) / 2;
            } else {
                // No overlap or different confidence, push current and start new
                merged.push(current);
                current = { ...next };
            }
        }
        
        merged.push(current);
        return merged;
    }

    private calculateOverallMappingConfidence(): number {
        if (this.wordToTokenMappings.length === 0) {
            return 0;
        }

        const totalConfidence = this.wordToTokenMappings.reduce(
            (sum, mapping) => sum + mapping.confidence, 0
        );
        
        return totalConfidence / this.wordToTokenMappings.length;
    }

    /**
     * Get tokens that should be highlighted at a specific time
     */
    getTokensAtTime(timeMs: number, timeline: TokenTimeline): string[] {
        const activeEvents = timeline.events.filter(event => 
            timeMs >= event.startTimeMs && timeMs <= event.endTimeMs
        );

        if (activeEvents.length === 0) {
            return [];
        }

        // Return tokens from highest confidence event if multiple active
        const bestEvent = activeEvents.reduce((best, event) => 
            event.confidence > best.confidence ? event : best
        );

        return bestEvent.tokenIds;
    }

    /**
     * Get mapping diagnostics for debugging
     */
    getDiagnostics(): {
        totalMappings: number;
        averageConfidence: number;
        mappingsByType: Record<string, number>;
        unmappedWords: string[];
        highConfidenceMappings: TokenMapping[];
    } {
        const mappingsByType: Record<string, number> = {};
        this.wordToTokenMappings.forEach(mapping => {
            mappingsByType[mapping.mappingType] = (mappingsByType[mapping.mappingType] || 0) + 1;
        });

        const averageConfidence = this.calculateOverallMappingConfidence();
        
        const highConfidenceMappings = this.wordToTokenMappings.filter(
            mapping => mapping.confidence > 0.8
        );

        // Find words that couldn't be mapped
        const unmappedWords: string[] = [];
        // This would need the original word list to determine unmapped words

        return {
            totalMappings: this.wordToTokenMappings.length,
            averageConfidence,
            mappingsByType,
            unmappedWords,
            highConfidenceMappings
        };
    }

    /**
     * Reset mapper state
     */
    reset() {
        this.allTokens.clear();
        this.wordToTokenMappings = [];
    }
}
