export interface SyncDataPoint {
    timestamp: number; // When the measurement was taken
    actualTimeMs: number; // Actual audio time from player
    expectedTimeMs: number; // Expected time based on plan
    offset: number; // actualTime - expectedTime
}

export interface SyncCalibration {
    currentOffset: number; // Current timing offset in ms
    averageOffset: number; // Running average offset
    confidence: number; // 0-1 confidence in calibration accuracy
    lastCalibrationTime: number; // Timestamp of last calibration
    driftRate: number; // Rate of timing drift (ms per second)
}

export class RealTimeSyncCalibrator {
    private syncHistory: SyncDataPoint[] = [];
    private maxHistorySize = 50; // Keep last 50 measurements
    private calibration: SyncCalibration = {
        currentOffset: 0,
        averageOffset: 0,
        confidence: 0,
        lastCalibrationTime: Date.now(),
        driftRate: 0
    };

    private calibrationCallbacks: Array<(calibration: SyncCalibration) => void> = [];
    private isCalibrating = false;

    /**
     * Add a sync measurement point
     */
    addSyncPoint(actualTimeMs: number, expectedTimeMs: number) {
        const now = Date.now();
        const offset = actualTimeMs - expectedTimeMs;

        const syncPoint: SyncDataPoint = {
            timestamp: now,
            actualTimeMs,
            expectedTimeMs,
            offset
        };

        this.syncHistory.push(syncPoint);

        // Keep history size manageable
        if (this.syncHistory.length > this.maxHistorySize) {
            this.syncHistory.shift();
        }

        // Update calibration
        this.updateCalibration();
        
        // Notify callbacks of calibration update
        this.notifyCalibrationUpdate();
    }

    private updateCalibration() {
        if (this.syncHistory.length < 2) {
            return;
        }

        const recent = this.syncHistory.slice(-10); // Use last 10 points for current offset
        const all = this.syncHistory;

        // Calculate current offset (average of recent measurements)
        this.calibration.currentOffset = recent.reduce((sum, point) => sum + point.offset, 0) / recent.length;

        // Calculate average offset over all measurements
        this.calibration.averageOffset = all.reduce((sum, point) => sum + point.offset, 0) / all.length;

        // Calculate confidence based on consistency of measurements
        this.calibration.confidence = this.calculateConfidence(recent);

        // Calculate drift rate (change in offset over time)
        this.calibration.driftRate = this.calculateDriftRate();

        this.calibration.lastCalibrationTime = Date.now();
    }

    private calculateConfidence(measurements: SyncDataPoint[]): number {
        if (measurements.length < 3) {
            return 0.3; // Low confidence with few measurements
        }

        // Calculate standard deviation of offsets
        const mean = measurements.reduce((sum, point) => sum + point.offset, 0) / measurements.length;
        const variance = measurements.reduce((sum, point) => sum + Math.pow(point.offset - mean, 2), 0) / measurements.length;
        const stdDev = Math.sqrt(variance);

        // Lower standard deviation = higher confidence
        // Map stdDev to confidence (0-1)
        const maxAcceptableStdDev = 100; // 100ms std dev = 0 confidence
        const confidence = Math.max(0, Math.min(1, 1 - (stdDev / maxAcceptableStdDev)));

        return confidence;
    }

    private calculateDriftRate(): number {
        if (this.syncHistory.length < 5) {
            return 0;
        }

        const oldPoints = this.syncHistory.slice(0, Math.floor(this.syncHistory.length / 2));
        const newPoints = this.syncHistory.slice(Math.floor(this.syncHistory.length / 2));

        const oldAvgOffset = oldPoints.reduce((sum, point) => sum + point.offset, 0) / oldPoints.length;
        const newAvgOffset = newPoints.reduce((sum, point) => sum + point.offset, 0) / newPoints.length;

        const oldAvgTime = oldPoints.reduce((sum, point) => sum + point.timestamp, 0) / oldPoints.length;
        const newAvgTime = newPoints.reduce((sum, point) => sum + point.timestamp, 0) / newPoints.length;

        const offsetChange = newAvgOffset - oldAvgOffset;
        const timeChange = (newAvgTime - oldAvgTime) / 1000; // Convert to seconds

        return timeChange > 0 ? offsetChange / timeChange : 0;
    }

    /**
     * Get the current calibration
     */
    getCurrentCalibration(): SyncCalibration {
        return { ...this.calibration };
    }

    /**
     * Adjust a planned time based on current calibration
     */
    adjustTime(plannedTimeMs: number): number {
        const calibration = this.getCurrentCalibration();
        
        if (calibration.confidence < 0.3) {
            // Low confidence, don't adjust much
            return plannedTimeMs + (calibration.currentOffset * 0.3);
        } else if (calibration.confidence < 0.7) {
            // Medium confidence, partial adjustment
            return plannedTimeMs + (calibration.currentOffset * 0.7);
        } else {
            // High confidence, full adjustment
            return plannedTimeMs + calibration.currentOffset;
        }
    }

    /**
     * Predict the timing for a future event based on current drift
     */
    predictFutureTime(plannedTimeMs: number, currentActualTimeMs: number): number {
        const calibration = this.getCurrentCalibration();
        const timeDifference = (plannedTimeMs - currentActualTimeMs) / 1000; // Seconds into future
        
        // Apply current offset plus predicted drift
        const predictedOffset = calibration.currentOffset + (calibration.driftRate * timeDifference);
        
        return plannedTimeMs + predictedOffset;
    }

    /**
     * Check if timing adjustment is needed
     */
    needsAdjustment(threshold: number = 50): boolean {
        return Math.abs(this.calibration.currentOffset) > threshold && this.calibration.confidence > 0.5;
    }

    /**
     * Get sync quality assessment
     */
    getSyncQuality(): {
        quality: 'excellent' | 'good' | 'fair' | 'poor';
        score: number; // 0-100
        issues: string[];
    } {
        const calibration = this.getCurrentCalibration();
        const issues: string[] = [];
        let score = 100;

        // Check offset magnitude
        const offsetMagnitude = Math.abs(calibration.currentOffset);
        if (offsetMagnitude > 200) {
            issues.push('Large timing offset detected');
            score -= 30;
        } else if (offsetMagnitude > 100) {
            issues.push('Moderate timing offset');
            score -= 15;
        }

        // Check confidence
        if (calibration.confidence < 0.5) {
            issues.push('Low calibration confidence');
            score -= 20;
        }

        // Check drift rate
        const driftMagnitude = Math.abs(calibration.driftRate);
        if (driftMagnitude > 10) {
            issues.push('High timing drift rate');
            score -= 25;
        } else if (driftMagnitude > 5) {
            issues.push('Moderate timing drift');
            score -= 10;
        }

        // Check data availability
        if (this.syncHistory.length < 5) {
            issues.push('Insufficient calibration data');
            score -= 15;
        }

        // Determine quality level
        let quality: 'excellent' | 'good' | 'fair' | 'poor';
        if (score >= 90) quality = 'excellent';
        else if (score >= 75) quality = 'good';
        else if (score >= 60) quality = 'fair';
        else quality = 'poor';

        return { quality, score: Math.max(0, score), issues };
    }

    /**
     * Register callback for calibration updates
     */
    onCalibrationUpdate(callback: (calibration: SyncCalibration) => void) {
        this.calibrationCallbacks.push(callback);
    }

    /**
     * Remove calibration update callback
     */
    removeCalibrationCallback(callback: (calibration: SyncCalibration) => void) {
        const index = this.calibrationCallbacks.indexOf(callback);
        if (index > -1) {
            this.calibrationCallbacks.splice(index, 1);
        }
    }

    private notifyCalibrationUpdate() {
        this.calibrationCallbacks.forEach(callback => {
            try {
                callback(this.getCurrentCalibration());
            } catch (error) {
                console.error('Error in calibration callback:', error);
            }
        });
    }

    /**
     * Start real-time calibration mode
     */
    startCalibration() {
        this.isCalibrating = true;
    }

    /**
     * Stop real-time calibration mode
     */
    stopCalibration() {
        this.isCalibrating = false;
    }

    /**
     * Check if currently calibrating
     */
    isCalibrationActive(): boolean {
        return this.isCalibrating;
    }

    /**
     * Reset calibration data
     */
    reset() {
        this.syncHistory = [];
        this.calibration = {
            currentOffset: 0,
            averageOffset: 0,
            confidence: 0,
            lastCalibrationTime: Date.now(),
            driftRate: 0
        };
    }

    /**
     * Get diagnostic information for debugging
     */
    getDiagnostics(): {
        historySize: number;
        lastOffset: number;
        avgOffset: number;
        confidence: number;
        driftRate: number;
        syncQuality: {
            quality: 'excellent' | 'good' | 'fair' | 'poor';
            score: number;
            issues: string[];
        };
        recentHistory: SyncDataPoint[];
    } {
        return {
            historySize: this.syncHistory.length,
            lastOffset: this.syncHistory.length > 0 ? this.syncHistory[this.syncHistory.length - 1].offset : 0,
            avgOffset: this.calibration.averageOffset,
            confidence: this.calibration.confidence,
            driftRate: this.calibration.driftRate,
            syncQuality: this.getSyncQuality(),
            recentHistory: this.syncHistory.slice(-5) // Last 5 measurements
        };
    }

    /**
     * Export calibration data for analysis
     */
    exportData(): {
        calibration: SyncCalibration;
        history: SyncDataPoint[];
        diagnostics: {
            historySize: number;
            lastOffset: number;
            avgOffset: number;
            confidence: number;
            driftRate: number;
            syncQuality: {
                quality: 'excellent' | 'good' | 'fair' | 'poor';
                score: number;
                issues: string[];
            };
            recentHistory: SyncDataPoint[];
        };
    } {
        return {
            calibration: this.getCurrentCalibration(),
            history: [...this.syncHistory],
            diagnostics: this.getDiagnostics()
        };
    }
}
