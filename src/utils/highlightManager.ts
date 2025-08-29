import * as vscode from 'vscode';

export class HighlightManager {
    private selectionDecorationType: vscode.TextEditorDecorationType;
    private explanationDecorationType: vscode.TextEditorDecorationType;
    private activeDecorations: Map<vscode.TextEditor, vscode.Range[]> = new Map();

    constructor() {
        // Create decoration type for selection highlighting (blue)
        this.selectionDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(0, 120, 255, 0.2)', // Blue with transparency
            border: '2px solid rgba(0, 120, 255, 0.6)', // Blue border
            borderRadius: '3px',
            overviewRulerColor: 'rgba(0, 120, 255, 0.6)',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            isWholeLine: false
        });

        // Create decoration type for explanation highlighting (light yellow, minimal border)
        this.explanationDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 255, 0, 0.15)', // Light yellow with low transparency
            border: '1px solid rgba(255, 255, 0, 0.3)', // Minimal yellow border
            borderRadius: '2px',
            overviewRulerColor: 'rgba(255, 255, 0, 0.4)',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            isWholeLine: false
        });
    }

    /**
     * Highlight a specific range in the editor for selection (blue)
     */
    highlightSelectionRange(editor: vscode.TextEditor, range: vscode.Range) {
        this.clearHighlights(editor);
        
        const decoration: vscode.DecorationOptions = {
            range: range,
            hoverMessage: 'Selected code for explanation'
        };

        editor.setDecorations(this.selectionDecorationType, [decoration]);
        this.activeDecorations.set(editor, [range]);

        // Scroll to the highlighted range
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }

    /**
     * Highlight a specific range in the editor during explanation (light yellow)
     */
    highlightExplanationRange(editor: vscode.TextEditor, range: vscode.Range) {
        this.clearHighlights(editor);
        
        const decoration: vscode.DecorationOptions = {
            range: range,
            hoverMessage: 'Code being explained with voice'
        };

        editor.setDecorations(this.explanationDecorationType, [decoration]);
        this.activeDecorations.set(editor, [range]);

        // Scroll to the highlighted range
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }

    /**
     * Legacy method for backward compatibility - defaults to explanation highlighting
     */
    highlightRange(editor: vscode.TextEditor, range: vscode.Range) {
        this.highlightExplanationRange(editor, range);
    }

    /**
     * Highlight multiple ranges in the editor for selection (blue)
     */
    highlightSelectionRanges(editor: vscode.TextEditor, ranges: vscode.Range[]) {
        this.clearHighlights(editor);
        
        const decorations: vscode.DecorationOptions[] = ranges.map(range => ({
            range: range,
            hoverMessage: 'Selected code for explanation'
        }));

        editor.setDecorations(this.selectionDecorationType, decorations);
        this.activeDecorations.set(editor, ranges);

        // Scroll to the first highlighted range
        if (ranges.length > 0) {
            editor.revealRange(ranges[0], vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        }
    }

    /**
     * Highlight multiple ranges in the editor during explanation (light yellow)
     */
    highlightExplanationRanges(editor: vscode.TextEditor, ranges: vscode.Range[]) {
        this.clearHighlights(editor);
        
        const decorations: vscode.DecorationOptions[] = ranges.map(range => ({
            range: range,
            hoverMessage: 'Code being explained with voice'
        }));

        editor.setDecorations(this.explanationDecorationType, decorations);
        this.activeDecorations.set(editor, ranges);

        // Scroll to the first highlighted range
        if (ranges.length > 0) {
            editor.revealRange(ranges[0], vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        }
    }

    /**
     * Legacy method for backward compatibility - defaults to explanation highlighting
     */
    highlightRanges(editor: vscode.TextEditor, ranges: vscode.Range[]) {
        this.highlightExplanationRanges(editor, ranges);
    }

    /**
     * Highlight the entire visible area of the editor
     */
    highlightVisibleCode(editor: vscode.TextEditor) {
        const visibleRanges = editor.visibleRanges;
        if (visibleRanges.length > 0) {
            this.highlightRanges(editor, [...visibleRanges]);
        }
    }

    /**
     * Highlight specific lines by line numbers
     */
    highlightLines(editor: vscode.TextEditor, lineNumbers: number[]) {
        const ranges = lineNumbers.map(lineNumber => {
            const line = editor.document.lineAt(Math.max(0, lineNumber - 1)); // Convert to 0-based
            return new vscode.Range(line.range.start, line.range.end);
        });

        this.highlightRanges(editor, ranges);
    }

    /**
     * Clear all highlights from a specific editor
     */
    clearHighlights(editor: vscode.TextEditor) {
        editor.setDecorations(this.selectionDecorationType, []);
        editor.setDecorations(this.explanationDecorationType, []);
        this.activeDecorations.delete(editor);
    }

    /**
     * Clear all highlights from all editors
     */
    clearAllHighlights() {
        vscode.window.visibleTextEditors.forEach(editor => {
            this.clearHighlights(editor);
        });
        this.activeDecorations.clear();
    }

    /**
     * Get the currently highlighted ranges for an editor
     */
    getHighlightedRanges(editor: vscode.TextEditor): vscode.Range[] {
        return this.activeDecorations.get(editor) || [];
    }

    /**
     * Check if an editor has active highlights
     */
    hasHighlights(editor: vscode.TextEditor): boolean {
        return this.activeDecorations.has(editor) && this.activeDecorations.get(editor)!.length > 0;
    }

    /**
     * Animate highlight by pulsing the decoration
     */
    animateHighlight(editor: vscode.TextEditor, range: vscode.Range, duration: number = 3000) {
        const pulseDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editorInfo.background'),
            border: '2px solid',
            borderColor: new vscode.ThemeColor('editorInfo.foreground'),
            borderRadius: '3px',
            overviewRulerColor: new vscode.ThemeColor('editorInfo.foreground'),
            overviewRulerLane: vscode.OverviewRulerLane.Right
        });

        const decoration: vscode.DecorationOptions = {
            range: range,
            hoverMessage: 'Code being explained with voice'
        };

        // Apply the animated decoration
        editor.setDecorations(pulseDecorationType, [decoration]);

        // Remove after duration
        setTimeout(() => {
            editor.setDecorations(pulseDecorationType, []);
            pulseDecorationType.dispose();
        }, duration);
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.clearAllHighlights();
        this.selectionDecorationType.dispose();
        this.explanationDecorationType.dispose();
    }
}
