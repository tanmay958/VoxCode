import { WordTiming } from '../services/voiceSynthesizer';
import { CodeElement, CodeElementDetector } from './codeElementDetector';

export interface HighlightEvent {
    startMs: number;
    endMs: number;
    elements: CodeElement[];
    word: string;
    confidence: number;
}

export class WordElementMapper {
    private detector: CodeElementDetector;
    private elements: CodeElement[] = [];

    constructor() {
        this.detector = new CodeElementDetector();
    }

    /**
     * Analyzes code and creates mapping between words and code elements
     */
    analyzeCodeForMapping(code: string, language: string): void {
        this.elements = this.detector.analyzeCode(code, language);
    }

    /**
     * Maps word timings to code elements for real-time highlighting
     */
    createHighlightTimeline(wordTimings: WordTiming[], explanation: string): HighlightEvent[] {
        const events: HighlightEvent[] = [];

        // Process each word timing
        wordTimings.forEach((timing, index) => {
            const word = timing.word.toLowerCase().trim();
            
            // Skip very short words and common words that don't map to code
            if (this.shouldSkipWord(word)) {
                return;
            }

            // Find code elements for this word
            const elements = this.detector.getElementsForWord(word);
            
            if (elements.length > 0) {
                events.push({
                    startMs: timing.startMs,
                    endMs: timing.endMs,
                    elements: elements,
                    word: timing.word,
                    confidence: this.calculateConfidence(word, elements, explanation, index, wordTimings)
                });
            }

            // Check for compound phrases (e.g., "for loop", "arrow function")
            this.checkForPhrases(timing, index, wordTimings, events, explanation);
        });

        // Sort by start time and remove overlapping low-confidence events
        return this.optimizeHighlightEvents(events);
    }

    /**
     * Get elements that should be highlighted at a specific time
     */
    getElementsAtTime(timeMs: number, events: HighlightEvent[]): CodeElement[] {
        const activeEvents = events.filter(event => 
            timeMs >= event.startMs && timeMs <= event.endMs
        );

        // Sort by confidence and return highest confidence elements
        activeEvents.sort((a, b) => b.confidence - a.confidence);
        
        if (activeEvents.length > 0) {
            return activeEvents[0].elements;
        }

        return [];
    }

    private shouldSkipWord(word: string): boolean {
        const skipWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'my', 'your', 'his', 'her', 'its', 'our', 'their', 'here', 'there', 'where',
            'when', 'why', 'how', 'what', 'who', 'which', 'some', 'any', 'all', 'each',
            'very', 'really', 'quite', 'just', 'only', 'also', 'too', 'so', 'now', 'then',
            'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'than', 'most'
        ]);

        return skipWords.has(word) || word.length <= 1;
    }

    private checkForPhrases(
        currentTiming: WordTiming, 
        index: number, 
        allTimings: WordTiming[], 
        events: HighlightEvent[],
        explanation: string
    ): void {
        if (index >= allTimings.length - 1) return;

        const currentWord = currentTiming.word.toLowerCase().trim();
        const nextTiming = allTimings[index + 1];
        const nextWord = nextTiming.word.toLowerCase().trim();

        // Check for common programming phrases
        const phrases = [
            ['for', 'loop'],
            ['while', 'loop'],
            ['if', 'statement'],
            ['else', 'statement'],
            ['arrow', 'function'],
            ['function', 'declaration'],
            ['variable', 'declaration'],
            ['return', 'statement'],
            ['assignment', 'operator'],
            ['comparison', 'operator']
        ];

        phrases.forEach(phrase => {
            if (phrase[0] === currentWord && phrase[1] === nextWord) {
                const phraseText = phrase.join(' ');
                const elements = this.detector.getElementsForPhrase(phraseText);
                
                if (elements.length > 0) {
                    events.push({
                        startMs: currentTiming.startMs,
                        endMs: nextTiming.endMs,
                        elements: elements,
                        word: `${currentTiming.word} ${nextTiming.word}`,
                        confidence: 0.8 // High confidence for phrase matches
                    });
                }
            }
        });
    }

    private calculateConfidence(
        word: string, 
        elements: CodeElement[], 
        explanation: string, 
        wordIndex: number,
        allTimings: WordTiming[]
    ): number {
        let confidence = 0.5; // Base confidence

        // Higher confidence for exact name matches
        elements.forEach(element => {
            if (element.name.toLowerCase() === word) {
                confidence += 0.3;
            }
            
            // Check if this is a primary alias
            if (element.aliases[0]?.toLowerCase() === word) {
                confidence += 0.2;
            }
        });

        // Higher confidence for function/variable names
        const hasImportantElements = elements.some(el => 
            el.type === 'function' || el.type === 'variable' || el.type === 'class'
        );
        if (hasImportantElements) {
            confidence += 0.2;
        }

        // Context-based confidence boost
        const contextWords = this.getContextWords(wordIndex, allTimings, 2);
        const contextText = contextWords.join(' ').toLowerCase();
        
        // Boost confidence if surrounded by programming context
        if (/\b(function|variable|method|parameter|argument|loop|condition)\b/.test(contextText)) {
            confidence += 0.1;
        }

        // Cap confidence at 1.0
        return Math.min(confidence, 1.0);
    }

    private getContextWords(index: number, timings: WordTiming[], radius: number): string[] {
        const start = Math.max(0, index - radius);
        const end = Math.min(timings.length, index + radius + 1);
        
        return timings.slice(start, end).map(t => t.word);
    }

    private optimizeHighlightEvents(events: HighlightEvent[]): HighlightEvent[] {
        // Sort by start time
        events.sort((a, b) => a.startMs - b.startMs);

        // Remove overlapping events with lower confidence
        const optimized: HighlightEvent[] = [];
        
        for (const event of events) {
            const overlapping = optimized.filter(existing => 
                this.eventsOverlap(event, existing)
            );

            if (overlapping.length === 0) {
                optimized.push(event);
            } else {
                // Keep the event with highest confidence
                const highestConfidence = Math.max(event.confidence, ...overlapping.map(e => e.confidence));
                
                if (event.confidence === highestConfidence) {
                    // Remove overlapping events with lower confidence
                    overlapping.forEach(overlappingEvent => {
                        const index = optimized.indexOf(overlappingEvent);
                        if (index > -1 && overlappingEvent.confidence < event.confidence) {
                            optimized.splice(index, 1);
                        }
                    });
                    optimized.push(event);
                }
            }
        }

        return optimized;
    }

    private eventsOverlap(event1: HighlightEvent, event2: HighlightEvent): boolean {
        return !(event1.endMs <= event2.startMs || event2.endMs <= event1.startMs);
    }

    /**
     * Get all unique elements from the analyzed code
     */
    getAllElements(): CodeElement[] {
        return this.elements;
    }

    /**
     * Find elements by their range for debugging
     */
    getElementsInRange(startLine: number, endLine: number): CodeElement[] {
        return this.elements.filter(element => 
            element.startLine >= startLine && element.endLine <= endLine
        );
    }
}
