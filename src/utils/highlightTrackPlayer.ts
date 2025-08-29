import { HighlightTrack, HighlightFrame } from './highlightTrack';

export interface TrackPlayerState {
    isPlaying: boolean;
    currentTimeMs: number;
    currentFrame: HighlightFrame | null;
    nextFrame: HighlightFrame | null;
    progress: number; // 0-1
    frameIndex: number;
}

export type HighlightCallback = (tokenIds: string[], highlightType: 'high' | 'medium' | 'low', confidence: number) => void;
export type ClearCallback = () => void;
export type StateUpdateCallback = (state: TrackPlayerState) => void;

export class HighlightTrackPlayer {
    private track: HighlightTrack | null = null;
    private currentTimeMs = 0;
    private currentFrameIndex = 0;
    private isPlaying = false;
    
    private highlightCallback: HighlightCallback | null = null;
    private clearCallback: ClearCallback | null = null;
    private stateUpdateCallback: StateUpdateCallback | null = null;
    
    private lastHighlightedTokens: string[] = [];

    /**
     * Load a highlight track for playback
     */
    loadTrack(track: HighlightTrack) {
        this.track = track;
        this.reset();
        console.log(`🎬 Highlight track loaded: ${track.frames.length} frames, ${track.durationMs}ms`);
    }

    /**
     * Set callback for highlighting tokens
     */
    onHighlight(callback: HighlightCallback) {
        this.highlightCallback = callback;
        console.log('📝 TrackPlayer: Highlight callback set');
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
    onStateUpdate(callback: StateUpdateCallback) {
        this.stateUpdateCallback = callback;
    }

    /**
     * Start playing the track
     */
    play() {
        if (!this.track) {
            console.warn('⚠️ TrackPlayer: No track loaded for play()');
            return;
        }

        this.isPlaying = true;
        console.log(`▶️ TrackPlayer: Playback started - track has ${this.track.frames.length} frames`);
        this.updateState();
    }

    /**
     * Pause the track
     */
    pause() {
        this.isPlaying = false;
        console.log('⏸️ Highlight track playback paused');
        this.updateState();
    }

    /**
     * Stop and reset the track
     */
    stop() {
        this.isPlaying = false;
        this.reset();
        this.clearHighlights();
        console.log('⏹️ Highlight track playback stopped');
        this.updateState();
    }

    /**
     * Update current time (called by audio player)
     * This is the main synchronization method
     */
    updateTime(timeMs: number) {
        if (!this.track) {
            console.log('❌ TrackPlayer: No track loaded in updateTime');
            return;
        }
        
        // If audio is progressing but we're not marked as playing, auto-start
        if (!this.isPlaying && timeMs > 100) {
            console.log(`🚀 TrackPlayer: Auto-starting playback due to audio progress at ${timeMs.toFixed(1)}ms`);
            this.isPlaying = true;
        }
        
        if (!this.isPlaying) {
            console.log(`⏸️ TrackPlayer: Not playing, ignoring updateTime(${timeMs.toFixed(1)}ms)`);
            return;
        }

        console.log(`🕐 TrackPlayer: updateTime(${timeMs.toFixed(1)}ms) - isPlaying: ${this.isPlaying}`);
        this.currentTimeMs = timeMs;
        this.updateHighlighting();
        this.updateState();
    }

    /**
     * Seek to a specific time
     */
    seekTo(timeMs: number) {
        if (!this.track) return;

        this.currentTimeMs = Math.max(0, Math.min(timeMs, this.track.durationMs));
        this.findCurrentFrame();
        this.updateHighlighting();
        this.updateState();
    }

    private reset() {
        this.currentTimeMs = 0;
        this.currentFrameIndex = 0;
        this.lastHighlightedTokens = [];
    }

    private updateHighlighting() {
        if (!this.track) return;

        // Find the frame for current time
        const currentFrame = this.getCurrentFrame();
        console.log(`🔍 TrackPlayer: updateHighlighting at ${this.currentTimeMs.toFixed(1)}ms - found frame:`, currentFrame ? `${currentFrame.tokenIds.length} tokens, conf: ${currentFrame.confidence.toFixed(2)}` : 'none');
        
        if (currentFrame) {
            // Check if highlights have changed
            const newTokens = currentFrame.tokenIds;
            const tokensChanged = !this.arraysEqual(this.lastHighlightedTokens, newTokens);
            
            console.log(`🔄 TrackPlayer: tokensChanged: ${tokensChanged}, newTokens: [${newTokens.join(', ')}], lastTokens: [${this.lastHighlightedTokens.join(', ')}]`);
            
            if (tokensChanged) {
                this.lastHighlightedTokens = [...newTokens];
                
                if (newTokens.length > 0) {
                    // Highlight the tokens
                    if (this.highlightCallback) {
                        console.log(`🎯 TrackPlayer: Calling highlightCallback with ${newTokens.length} tokens`);
                        this.highlightCallback(newTokens, currentFrame.highlightType, currentFrame.confidence);
                    } else {
                        console.log('❌ TrackPlayer: No highlightCallback set!');
                    }
                } else {
                    // Clear highlights
                    console.log('🧹 TrackPlayer: Clearing highlights (no tokens in frame)');
                    this.clearHighlights();
                }
            }
        } else {
            // No frame at current time, clear highlights if needed
            if (this.lastHighlightedTokens.length > 0) {
                console.log('🧹 TrackPlayer: Clearing highlights (no frame found)');
                this.lastHighlightedTokens = [];
                this.clearHighlights();
            }
        }
    }

    private getCurrentFrame(): HighlightFrame | null {
        if (!this.track) return null;

        // Find the frame closest to current time
        let bestFrame: HighlightFrame | null = null;
        let bestDistance = Infinity;

        for (let i = 0; i < this.track.frames.length; i++) {
            const frame = this.track.frames[i];
            const distance = Math.abs(frame.timeMs - this.currentTimeMs);
            
            // Frame should be at or before current time, within reasonable tolerance
            if (frame.timeMs <= this.currentTimeMs + 50 && distance < bestDistance) { // 50ms tolerance
                bestFrame = frame;
                bestDistance = distance;
                this.currentFrameIndex = i;
            }
        }

        return bestFrame;
    }

    private findCurrentFrame() {
        // Helper method to find frame index for seeking
        if (!this.track) return;

        for (let i = 0; i < this.track.frames.length; i++) {
            if (this.track.frames[i].timeMs >= this.currentTimeMs) {
                this.currentFrameIndex = i;
                break;
            }
        }
    }

    private getNextFrame(): HighlightFrame | null {
        if (!this.track || this.currentFrameIndex >= this.track.frames.length - 1) {
            return null;
        }
        return this.track.frames[this.currentFrameIndex + 1];
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
        if (!this.stateUpdateCallback || !this.track) return;

        const progress = this.track.durationMs > 0 ? 
            this.currentTimeMs / this.track.durationMs : 0;

        const state: TrackPlayerState = {
            isPlaying: this.isPlaying,
            currentTimeMs: this.currentTimeMs,
            currentFrame: this.getCurrentFrame(),
            nextFrame: this.getNextFrame(),
            progress,
            frameIndex: this.currentFrameIndex
        };

        this.stateUpdateCallback(state);
    }

    /**
     * Get current state
     */
    getState(): TrackPlayerState {
        if (!this.track) {
            return {
                isPlaying: false,
                currentTimeMs: 0,
                currentFrame: null,
                nextFrame: null,
                progress: 0,
                frameIndex: 0
            };
        }

        const progress = this.track.durationMs > 0 ? 
            this.currentTimeMs / this.track.durationMs : 0;

        return {
            isPlaying: this.isPlaying,
            currentTimeMs: this.currentTimeMs,
            currentFrame: this.getCurrentFrame(),
            nextFrame: this.getNextFrame(),
            progress,
            frameIndex: this.currentFrameIndex
        };
    }

    /**
     * Get track information
     */
    getTrackInfo(): {
        loaded: boolean;
        duration: number;
        frameCount: number;
        frameRate: number;
        averageConfidence: number;
    } {
        if (!this.track) {
            return {
                loaded: false,
                duration: 0,
                frameCount: 0,
                frameRate: 0,
                averageConfidence: 0
            };
        }

        return {
            loaded: true,
            duration: this.track.durationMs,
            frameCount: this.track.frames.length,
            frameRate: this.track.frameRate,
            averageConfidence: this.track.metadata.averageConfidence
        };
    }

    /**
     * Get frame at specific time
     */
    getFrameAtTime(timeMs: number): HighlightFrame | null {
        if (!this.track) return null;

        // Find frame closest to the specified time
        let bestFrame: HighlightFrame | null = null;
        let bestDistance = Infinity;

        for (const frame of this.track.frames) {
            const distance = Math.abs(frame.timeMs - timeMs);
            if (distance < bestDistance) {
                bestFrame = frame;
                bestDistance = distance;
            }
        }

        return bestFrame;
    }

    /**
     * Get frames in time range
     */
    getFramesInRange(startMs: number, endMs: number): HighlightFrame[] {
        if (!this.track) return [];

        return this.track.frames.filter(frame => 
            frame.timeMs >= startMs && frame.timeMs <= endMs
        );
    }

    /**
     * Get track statistics
     */
    getStatistics(): {
        totalFrames: number;
        framesWithHighlights: number;
        averageConfidence: number;
        highlightCoverage: number; // Percentage of time with highlights
        confidenceDistribution: { high: number; medium: number; low: number };
    } {
        if (!this.track) {
            return {
                totalFrames: 0,
                framesWithHighlights: 0,
                averageConfidence: 0,
                highlightCoverage: 0,
                confidenceDistribution: { high: 0, medium: 0, low: 0 }
            };
        }

        const framesWithHighlights = this.track.frames.filter(f => f.tokenIds.length > 0);
        const highlightCoverage = this.track.frames.length > 0 ? 
            (framesWithHighlights.length / this.track.frames.length) * 100 : 0;

        const confidenceDistribution = {
            high: this.track.frames.filter(f => f.highlightType === 'high').length,
            medium: this.track.frames.filter(f => f.highlightType === 'medium').length,
            low: this.track.frames.filter(f => f.highlightType === 'low').length
        };

        return {
            totalFrames: this.track.frames.length,
            framesWithHighlights: framesWithHighlights.length,
            averageConfidence: this.track.metadata.averageConfidence,
            highlightCoverage,
            confidenceDistribution
        };
    }

    /**
     * Debug: Get current frame info
     */
    debug(): {
        currentTime: number;
        currentFrameIndex: number;
        currentFrame: HighlightFrame | null;
        trackLoaded: boolean;
        isPlaying: boolean;
    } {
        return {
            currentTime: this.currentTimeMs,
            currentFrameIndex: this.currentFrameIndex,
            currentFrame: this.getCurrentFrame(),
            trackLoaded: this.track !== null,
            isPlaying: this.isPlaying
        };
    }

    /**
     * Dispose of the player
     */
    dispose() {
        this.stop();
        this.track = null;
        this.highlightCallback = null;
        this.clearCallback = null;
        this.stateUpdateCallback = null;
    }
}
