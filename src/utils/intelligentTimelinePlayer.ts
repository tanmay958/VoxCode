import { IntelligentTimeline, IntelligentHighlightFrame } from '../services/intelligentTimelineGenerator';

export interface IntelligentPlayerState {
    isPlaying: boolean;
    currentTimeMs: number;
    activeFrames: IntelligentHighlightFrame[];
    nextFrame: IntelligentHighlightFrame | null;
    progress: number; // 0-1
    currentExplanation: string;
}

export type IntelligentHighlightCallback = (tokenIds: string[], highlightType: 'high' | 'medium' | 'low', confidence: number, explanation: string) => void;
export type IntelligentClearCallback = () => void;
export type IntelligentStateUpdateCallback = (state: IntelligentPlayerState) => void;

export class IntelligentTimelinePlayer {
    private timeline: IntelligentTimeline | null = null;
    private currentTimeMs = 0;
    private isPlaying = false;
    private activeFrames: IntelligentHighlightFrame[] = [];
    
    private highlightCallback: IntelligentHighlightCallback | null = null;
    private clearCallback: IntelligentClearCallback | null = null;
    private stateUpdateCallback: IntelligentStateUpdateCallback | null = null;
    
    private lastHighlightedTokens: string[] = [];

    /**
     * Load an intelligent timeline for playback
     */
    loadTimeline(timeline: IntelligentTimeline) {
        this.timeline = timeline;
        this.reset();
        console.log(`🧠 Intelligent timeline loaded: ${timeline.frames.length} LLM-generated frames, ${timeline.totalDurationMs}ms`);
    }

    /**
     * Set callback for highlighting tokens
     */
    onHighlight(callback: IntelligentHighlightCallback) {
        this.highlightCallback = callback;
        console.log('📝 IntelligentPlayer: Highlight callback set');
    }

    /**
     * Set callback for clearing highlights
     */
    onClear(callback: IntelligentClearCallback) {
        this.clearCallback = callback;
    }

    /**
     * Set callback for state updates
     */
    onStateUpdate(callback: IntelligentStateUpdateCallback) {
        this.stateUpdateCallback = callback;
    }

    /**
     * Start playing the timeline
     */
    play() {
        if (!this.timeline) {
            console.warn('⚠️ IntelligentPlayer: No timeline loaded for play()');
            return;
        }

        this.isPlaying = true;
        console.log(`▶️ IntelligentPlayer: Playback started - timeline has ${this.timeline.frames.length} LLM frames`);
        this.updateState();
    }

    /**
     * Pause the timeline
     */
    pause() {
        this.isPlaying = false;
        console.log('⏸️ IntelligentPlayer: Playback paused');
        this.updateState();
    }

    /**
     * Stop and reset the timeline
     */
    stop() {
        this.isPlaying = false;
        this.reset();
        this.clearHighlights();
        console.log('⏹️ IntelligentPlayer: Playback stopped');
        this.updateState();
    }

    /**
     * Update current time (called by audio player)
     * This is the main synchronization method
     */
    updateTime(timeMs: number) {
        if (!this.timeline) {
            console.log('❌ IntelligentPlayer: No timeline loaded in updateTime');
            return;
        }
        
        // If audio is progressing but we're not marked as playing, auto-start
        if (!this.isPlaying && timeMs > 100) {
            console.log(`🚀 IntelligentPlayer: Auto-starting playback due to audio progress at ${timeMs.toFixed(1)}ms`);
            this.isPlaying = true;
        }
        
        if (!this.isPlaying) {
            console.log(`⏸️ IntelligentPlayer: Not playing, ignoring updateTime(${timeMs.toFixed(1)}ms)`);
            return;
        }

        console.log(`🕐 IntelligentPlayer: updateTime(${timeMs.toFixed(1)}ms) - isPlaying: ${this.isPlaying}`);
        this.currentTimeMs = timeMs;
        this.updateHighlighting();
        this.updateState();
    }

    /**
     * Seek to a specific time
     */
    seekTo(timeMs: number) {
        if (!this.timeline) return;

        this.currentTimeMs = Math.max(0, Math.min(timeMs, this.timeline.totalDurationMs));
        this.updateHighlighting();
        this.updateState();
    }

    private reset() {
        this.currentTimeMs = 0;
        this.activeFrames = [];
        this.lastHighlightedTokens = [];
    }

    private updateHighlighting() {
        if (!this.timeline) return;

        // Find frames that should be active at current time (LLM frames have duration)
        const newActiveFrames = this.timeline.frames.filter(frame =>
            this.currentTimeMs >= frame.timeMs && 
            this.currentTimeMs <= (frame.timeMs + frame.durationMs)
        );

        console.log(`🔍 IntelligentPlayer: updateHighlighting at ${this.currentTimeMs.toFixed(1)}ms - found ${newActiveFrames.length} active frames`);
        
        // Check if active frames changed
        const framesChanged = !this.arraysEqual(
            this.activeFrames.map(f => f.timeMs.toString()),
            newActiveFrames.map(f => f.timeMs.toString())
        );

        if (framesChanged) {
            this.activeFrames = newActiveFrames;

            if (this.activeFrames.length > 0) {
                // Collect all token IDs from active frames (LLM can have overlapping highlights)
                const allTokenIds = new Set<string>();
                let maxConfidence = 0;
                let bestFrame: IntelligentHighlightFrame | undefined = undefined;

                this.activeFrames.forEach(frame => {
                    frame.tokenIds.forEach(tokenId => allTokenIds.add(tokenId));
                    if (frame.confidence > maxConfidence) {
                        maxConfidence = frame.confidence;
                        bestFrame = frame;
                    }
                });

                const newTokens = Array.from(allTokenIds);
                const tokensChanged = !this.arraysEqual(this.lastHighlightedTokens, newTokens);

                console.log(`🔄 IntelligentPlayer: tokensChanged: ${tokensChanged}, newTokens: [${newTokens.join(', ')}], activeFrames: ${this.activeFrames.length}`);

                if (tokensChanged) {
                    this.lastHighlightedTokens = [...newTokens];

                    if (newTokens.length > 0 && bestFrame) {
                        // Highlight the tokens with context from best frame
                        const frame = bestFrame as IntelligentHighlightFrame;
                        if (this.highlightCallback) {
                            console.log(`🎯 IntelligentPlayer: Calling highlightCallback with ${newTokens.length} tokens, explanation: "${frame.explanation}"`);
                            this.highlightCallback(
                                newTokens, 
                                frame.highlightType, 
                                maxConfidence,
                                frame.explanation
                            );
                        } else {
                            console.log('❌ IntelligentPlayer: No highlightCallback set!');
                        }
                    } else {
                        // Clear highlights
                        console.log('🧹 IntelligentPlayer: Clearing highlights (no tokens in frames)');
                        this.clearHighlights();
                    }
                }
            } else {
                // No frames active, clear highlights if needed
                if (this.lastHighlightedTokens.length > 0) {
                    console.log('🧹 IntelligentPlayer: Clearing highlights (no frames found)');
                    this.lastHighlightedTokens = [];
                    this.clearHighlights();
                }
            }
        }
    }

    private clearHighlights() {
        if (this.clearCallback) {
            this.clearCallback();
        }
    }

    private arraysEqual(arr1: string[], arr2: string[]): boolean {
        if (arr1.length !== arr2.length) return false;
        return arr1.every((item, index) => item === arr2[index]);
    }

    private updateState() {
        if (!this.stateUpdateCallback || !this.timeline) return;

        const progress = this.timeline.totalDurationMs > 0 ? 
            this.currentTimeMs / this.timeline.totalDurationMs : 0;

        const nextFrame = this.findNextFrame();
        const currentExplanation = this.activeFrames.length > 0 ? 
            this.activeFrames[0].explanation : '';

        const state: IntelligentPlayerState = {
            isPlaying: this.isPlaying,
            currentTimeMs: this.currentTimeMs,
            activeFrames: [...this.activeFrames],
            nextFrame,
            progress,
            currentExplanation
        };

        this.stateUpdateCallback(state);
    }

    private findNextFrame(): IntelligentHighlightFrame | null {
        if (!this.timeline) return null;

        return this.timeline.frames.find(frame => 
            frame.timeMs > this.currentTimeMs
        ) || null;
    }

    /**
     * Get current playback state
     */
    getState(): IntelligentPlayerState {
        if (!this.timeline) {
            return {
                isPlaying: false,
                currentTimeMs: 0,
                activeFrames: [],
                nextFrame: null,
                progress: 0,
                currentExplanation: ''
            };
        }

        const progress = this.timeline.totalDurationMs > 0 ? 
            this.currentTimeMs / this.timeline.totalDurationMs : 0;

        return {
            isPlaying: this.isPlaying,
            currentTimeMs: this.currentTimeMs,
            activeFrames: [...this.activeFrames],
            nextFrame: this.findNextFrame(),
            progress,
            currentExplanation: this.activeFrames.length > 0 ? this.activeFrames[0].explanation : ''
        };
    }

    /**
     * Get timeline information
     */
    getTimelineInfo(): {
        loaded: boolean;
        duration: number;
        frameCount: number;
        llmModel: string;
        generatedAt: string;
    } {
        if (!this.timeline) {
            return {
                loaded: false,
                duration: 0,
                frameCount: 0,
                llmModel: '',
                generatedAt: ''
            };
        }

        return {
            loaded: true,
            duration: this.timeline.totalDurationMs,
            frameCount: this.timeline.frames.length,
            llmModel: this.timeline.metadata.llmModel,
            generatedAt: this.timeline.metadata.generatedAt
        };
    }

    /**
     * Get frame at specific time
     */
    getFrameAtTime(timeMs: number): IntelligentHighlightFrame | null {
        if (!this.timeline) return null;

        return this.timeline.frames.find(frame =>
            timeMs >= frame.timeMs && timeMs <= (frame.timeMs + frame.durationMs)
        ) || null;
    }

    /**
     * Get frames in time range
     */
    getFramesInRange(startMs: number, endMs: number): IntelligentHighlightFrame[] {
        if (!this.timeline) return [];

        return this.timeline.frames.filter(frame =>
            !(frame.timeMs + frame.durationMs < startMs || frame.timeMs > endMs)
        );
    }

    /**
     * Get timeline statistics
     */
    getStatistics(): {
        totalFrames: number;
        averageFrameDuration: number;
        averageConfidence: number;
        timelineCoverage: number; // Percentage of time with highlights
        confidenceDistribution: { high: number; medium: number; low: number };
    } {
        if (!this.timeline) {
            return {
                totalFrames: 0,
                averageFrameDuration: 0,
                averageConfidence: 0,
                timelineCoverage: 0,
                confidenceDistribution: { high: 0, medium: 0, low: 0 }
            };
        }

        const frames = this.timeline.frames;
        const totalHighlightTime = frames.reduce((sum, frame) => sum + frame.durationMs, 0);
        const timelineCoverage = this.timeline.totalDurationMs > 0 ? 
            (totalHighlightTime / this.timeline.totalDurationMs) * 100 : 0;

        const averageFrameDuration = frames.length > 0 ? 
            totalHighlightTime / frames.length : 0;

        const averageConfidence = frames.length > 0 ? 
            frames.reduce((sum, frame) => sum + frame.confidence, 0) / frames.length : 0;

        const confidenceDistribution = {
            high: frames.filter(f => f.highlightType === 'high').length,
            medium: frames.filter(f => f.highlightType === 'medium').length,
            low: frames.filter(f => f.highlightType === 'low').length
        };

        return {
            totalFrames: frames.length,
            averageFrameDuration,
            averageConfidence,
            timelineCoverage,
            confidenceDistribution
        };
    }

    /**
     * Debug: Get current frame info
     */
    debug(): {
        currentTime: number;
        activeFrames: number;
        currentFrame: IntelligentHighlightFrame | null;
        timelineLoaded: boolean;
        isPlaying: boolean;
    } {
        return {
            currentTime: this.currentTimeMs,
            activeFrames: this.activeFrames.length,
            currentFrame: this.activeFrames.length > 0 ? this.activeFrames[0] : null,
            timelineLoaded: this.timeline !== null,
            isPlaying: this.isPlaying
        };
    }

    /**
     * Dispose of the player
     */
    dispose() {
        this.stop();
        this.timeline = null;
        this.highlightCallback = null;
        this.clearCallback = null;
        this.stateUpdateCallback = null;
    }
}
