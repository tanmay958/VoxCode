import * as vscode from 'vscode';

export class HighlightManager {
    private decorationType: vscode.TextEditorDecorationType;
    private activeDecorations: Map<vscode.TextEditor, vscode.Range[]> = new Map();

    constructor() {
        // Create decoration type for highlighting code
        this.decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
            border: '2px solid',
            borderColor: new vscode.ThemeColor('editorInfo.foreground'),
            borderRadius: '3px',
            overviewRulerColor: new vscode.ThemeColor('editorInfo.foreground'),
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            isWholeLine: false
        });
    }

    /**
     * Highlight a specific range in the editor
     */
    highlightRange(editor: vscode.TextEditor, range: vscode.Range) {
        this.clearHighlights(editor);
        
        const decoration: vscode.DecorationOptions = {
            range: range,
            hoverMessage: 'Code being explained with voice'
        };

        editor.setDecorations(this.decorationType, [decoration]);
        this.activeDecorations.set(editor, [range]);

        // Scroll to the highlighted range
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }

    /**
     * Highlight multiple ranges in the editor
     */
    highlightRanges(editor: vscode.TextEditor, ranges: vscode.Range[]) {
        this.clearHighlights(editor);
        
        const decorations: vscode.DecorationOptions[] = ranges.map(range => ({
            range: range,
            hoverMessage: 'Code being explained with voice'
        }));

        editor.setDecorations(this.decorationType, decorations);
        this.activeDecorations.set(editor, ranges);

        // Scroll to the first highlighted range
        if (ranges.length > 0) {
            editor.revealRange(ranges[0], vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        }
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
        editor.setDecorations(this.decorationType, []);
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
        this.decorationType.dispose();
    }
}
