import { PreprocessedTimeline, HighlightSegment } from './preprocessedTimelineBuilder';

export interface TimelinePlayerState {
    isPlaying: boolean;
    currentTimeMs: number;
    activeSegments: HighlightSegment[];
    nextSegment: HighlightSegment | null;
    progress: number; // 0-1
}

export type HighlightCallback = (tokenIds: string[], highlightType: 'high' | 'medium' | 'low', confidence: number) => void;
export type ClearCallback = () => void;
export type StateCallback = (state: TimelinePlayerState) => void;

export class TimelinePlayer {
    private timeline: PreprocessedTimeline | null = null;
    private currentTimeMs = 0;
    private isPlaying = false;
    private activeSegments: HighlightSegment[] = [];
    
    private highlightCallback: HighlightCallback | null = null;
    private clearCallback: ClearCallback | null = null;
    private stateCallback: StateCallback | null = null;

    /**
     * Load a preprocessed timeline
     */
    loadTimeline(timeline: PreprocessedTimeline) {
        this.timeline = timeline;
        this.currentTimeMs = 0;
        this.activeSegments = [];
        console.log(`📺 Timeline loaded: ${timeline.segments.length} segments, ${timeline.totalDurationMs}ms duration`);
    }

    /**
     * Set callback for highlighting tokens
     */
    onHighlight(callback: HighlightCallback) {
        this.highlightCallback = callback;
    }

    /**
     * Set callback for clearing highlights
     */
    onClear(callback: ClearCallback) {
        this.clearCallback = callback;
    }

    /**
     * Set callback for state updates
     */
    onStateUpdate(callback: StateCallback) {
        this.stateCallback = callback;
    }

    /**
     * Start playing the timeline
     */
    play() {
        if (!this.timeline) {
            console.warn('⚠️ No timeline loaded');
            return;
        }

        this.isPlaying = true;
        console.log('▶️ Timeline playback started');
        this.notifyStateUpdate();
    }

    /**
     * Pause the timeline
     */
    pause() {
        this.isPlaying = false;
        console.log('⏸️ Timeline playback paused');
        this.notifyStateUpdate();
    }

    /**
     * Stop and reset the timeline
     */
    stop() {
        this.isPlaying = false;
        this.currentTimeMs = 0;
        this.activeSegments = [];
        
        if (this.clearCallback) {
            this.clearCallback();
        }
        
        console.log('⏹️ Timeline playback stopped');
        this.notifyStateUpdate();
    }

    /**
     * Seek to a specific time
     */
    seekTo(timeMs: number) {
        if (!this.timeline) return;

        this.currentTimeMs = Math.max(0, Math.min(timeMs, this.timeline.totalDurationMs));
        this.updateHighlighting();
        this.notifyStateUpdate();
    }

    /**
     * Update the current time (called by audio player)
     */
    updateTime(timeMs: number) {
        if (!this.timeline || !this.isPlaying) return;

        this.currentTimeMs = timeMs;
        this.updateHighlighting();
        this.notifyStateUpdate();
    }

    private updateHighlighting() {
        if (!this.timeline) return;

        // Find segments that should be active at current time
        const newActiveSegments = this.timeline.segments.filter(segment =>
            this.currentTimeMs >= segment.startTimeMs && this.currentTimeMs <= segment.endTimeMs
        );

        // Check if active segments changed
        const segmentsChanged = !this.arraysEqual(
            this.activeSegments.map(s => s.id),
            newActiveSegments.map(s => s.id)
        );

        if (segmentsChanged) {
            this.activeSegments = newActiveSegments;

            if (this.activeSegments.length > 0) {
                // Get the highest confidence segment if multiple are active
                const bestSegment = this.activeSegments.reduce((best, current) =>
                    current.confidence > best.confidence ? current : best
                );

                // Highlight tokens from the best segment
                if (this.highlightCallback) {
                    this.highlightCallback(
                        bestSegment.tokenIds,
                        bestSegment.highlightType,
                        bestSegment.confidence
                    );
                }
            } else {
                // Clear highlights when no segments are active
                if (this.clearCallback) {
                    this.clearCallback();
                }
            }
        }
    }

    private arraysEqual(arr1: string[], arr2: string[]): boolean {
        if (arr1.length !== arr2.length) return false;
        return arr1.every((item, index) => item === arr2[index]);
    }

    private notifyStateUpdate() {
        if (!this.stateCallback || !this.timeline) return;

        const progress = this.timeline.totalDurationMs > 0 ? 
            this.currentTimeMs / this.timeline.totalDurationMs : 0;

        const nextSegment = this.findNextSegment();

        const state: TimelinePlayerState = {
            isPlaying: this.isPlaying,
            currentTimeMs: this.currentTimeMs,
            activeSegments: [...this.activeSegments],
            nextSegment,
            progress
        };

        this.stateCallback(state);
    }

    private findNextSegment(): HighlightSegment | null {
        if (!this.timeline) return null;

        return this.timeline.segments.find(segment => 
            segment.startTimeMs > this.currentTimeMs
        ) || null;
    }

    /**
     * Get current playback state
     */
    getState(): TimelinePlayerState {
        if (!this.timeline) {
            return {
                isPlaying: false,
                currentTimeMs: 0,
                activeSegments: [],
                nextSegment: null,
                progress: 0
            };
        }

        const progress = this.timeline.totalDurationMs > 0 ? 
            this.currentTimeMs / this.timeline.totalDurationMs : 0;

        return {
            isPlaying: this.isPlaying,
            currentTimeMs: this.currentTimeMs,
            activeSegments: [...this.activeSegments],
            nextSegment: this.findNextSegment(),
            progress
        };
    }

    /**
     * Get timeline information
     */
    getTimelineInfo(): {
        totalDuration: number;
        segmentCount: number;
        overallConfidence: number;
        loaded: boolean;
    } {
        if (!this.timeline) {
            return {
                totalDuration: 0,
                segmentCount: 0,
                overallConfidence: 0,
                loaded: false
            };
        }

        return {
            totalDuration: this.timeline.totalDurationMs,
            segmentCount: this.timeline.segmentCount,
            overallConfidence: this.timeline.overallConfidence,
            loaded: true
        };
    }

    /**
     * Get segments in a time range
     */
    getSegmentsInRange(startMs: number, endMs: number): HighlightSegment[] {
        if (!this.timeline) return [];

        return this.timeline.segments.filter(segment =>
            !(segment.endTimeMs < startMs || segment.startTimeMs > endMs)
        );
    }

    /**
     * Get segment at specific time
     */
    getSegmentAtTime(timeMs: number): HighlightSegment | null {
        if (!this.timeline) return null;

        return this.timeline.segments.find(segment =>
            timeMs >= segment.startTimeMs && timeMs <= segment.endTimeMs
        ) || null;
    }

    /**
     * Get all segments
     */
    getAllSegments(): HighlightSegment[] {
        return this.timeline?.segments || [];
    }

    /**
     * Get timeline statistics
     */
    getStatistics(): {
        segmentsByType: Record<'high' | 'medium' | 'low', number>;
        averageConfidence: number;
        totalHighlightTime: number;
        coveragePercentage: number;
    } {
        if (!this.timeline) {
            return {
                segmentsByType: { high: 0, medium: 0, low: 0 },
                averageConfidence: 0,
                totalHighlightTime: 0,
                coveragePercentage: 0
            };
        }

        const segmentsByType = {
            high: this.timeline.segments.filter(s => s.highlightType === 'high').length,
            medium: this.timeline.segments.filter(s => s.highlightType === 'medium').length,
            low: this.timeline.segments.filter(s => s.highlightType === 'low').length
        };

        const totalHighlightTime = this.timeline.segments.reduce(
            (sum, segment) => sum + (segment.endTimeMs - segment.startTimeMs), 0
        );

        const coveragePercentage = this.timeline.totalDurationMs > 0 ? 
            (totalHighlightTime / this.timeline.totalDurationMs) * 100 : 0;

        return {
            segmentsByType,
            averageConfidence: this.timeline.overallConfidence,
            totalHighlightTime,
            coveragePercentage
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
        this.stateCallback = null;
    }
}
