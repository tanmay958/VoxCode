import * as vscode from 'vscode';
import * as path from 'path';
import { StructuredExplanation, CodeSection, MappedExplanation } from '../services/codeExplainer';
import { SynthesisResult, WordTiming } from '../services/voiceSynthesizer';
import { HighlightManager } from '../utils/highlightManager';
import { WordElementMapper, HighlightEvent } from '../utils/wordElementMapper';
import { CodeElement } from '../utils/codeElementDetector';
import { IndexedCode, IndexedCodeElement } from '../utils/codeIndexer';

export class WebviewManager {
    private panel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;
    private currentEditor: vscode.TextEditor | undefined;
    private highlightManager: HighlightManager | undefined;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.highlightManager = new HighlightManager();
    }

    async showSynchronizedExplanation(
        structuredExplanation: StructuredExplanation,
        synthesisResult: SynthesisResult,
        code: string,
        language: string,
        editor: vscode.TextEditor,
        selection?: vscode.Selection
    ) {
        this.currentEditor = editor;

        // Create or show webview panel
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
        } else {
            this.panel = vscode.window.createWebviewPanel(
                'codeVoiceExplainer',
                'Synchronized Code Explanation',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    localResourceRoots: [this.context.extensionUri],
                    retainContextWhenHidden: true
                }
            );

            // Handle panel disposal
            this.panel.onDidDispose(() => {
                this.panel = undefined;
                this.currentEditor = undefined;
                if (this.highlightManager && editor) {
                    this.highlightManager.clearHighlights(editor);
                }
            });
        }

        // Convert audio buffer to base64 for embedding
        const audioBase64 = synthesisResult.audioBuffer.toString('base64');
        const audioDataUri = `data:audio/mpeg;base64,${audioBase64}`;

        // Set webview content with synchronization support
        this.panel.webview.html = this.getSynchronizedWebviewContent(
            structuredExplanation,
            synthesisResult,
            audioDataUri,
            code,
            language
        );

        // Handle messages from webview for synchronization
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'highlightSection':
                        this.highlightCodeSection(message.sectionIndex);
                        break;
                    case 'clearHighlights':
                        this.clearAllHighlights();
                        break;
                    case 'saveAudio':
                        await this.saveAudioFile(synthesisResult.audioBuffer);
                        break;
                    case 'audioProgress':
                        this.handleAudioProgress(message.currentTime, structuredExplanation);
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );

        // Initial highlight for selected code (blue highlighting)
        if (selection && this.highlightManager) {
            this.highlightManager.highlightSelectionRange(editor, selection);
        }
    }

    async showNaturalExplanation(
        explanation: string,
        synthesisResult: SynthesisResult,
        highlightTimeline: HighlightEvent[],
        wordElementMapper: WordElementMapper,
        code: string,
        language: string,
        editor: vscode.TextEditor,
        selection?: vscode.Selection
    ) {
        this.currentEditor = editor;

        // Create or show webview panel
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
        } else {
            this.panel = vscode.window.createWebviewPanel(
                'codeVoiceExplainer',
                'Natural Code Explanation',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    localResourceRoots: [this.context.extensionUri],
                    retainContextWhenHidden: true
                }
            );

            // Handle panel disposal
            this.panel.onDidDispose(() => {
                this.panel = undefined;
                this.currentEditor = undefined;
                if (this.highlightManager && editor) {
                    this.highlightManager.clearHighlights(editor);
                }
            });
        }

        // Convert audio buffer to base64 for embedding
        const audioBase64 = synthesisResult.audioBuffer.toString('base64');
        const audioDataUri = `data:audio/mpeg;base64,${audioBase64}`;

        // Set webview content with natural synchronization support
        this.panel.webview.html = this.getNaturalWebviewContent(
            explanation,
            synthesisResult,
            highlightTimeline,
            audioDataUri,
            code,
            language
        );

        // Handle messages from webview for natural synchronization
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'highlightElements':
                        this.highlightCodeElements(message.elements);
                        break;
                    case 'clearHighlights':
                        this.clearAllHighlights();
                        break;
                    case 'saveAudio':
                        await this.saveAudioFile(synthesisResult.audioBuffer);
                        break;
                    case 'audioProgress':
                        this.handleNaturalAudioProgress(message.currentTime, highlightTimeline, wordElementMapper);
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );

        // Initial highlight for selected code (blue highlighting)
        if (selection && this.highlightManager) {
            this.highlightManager.highlightSelectionRange(editor, selection);
        }
    }

    async showPreprocessedExplanation(
        mappedExplanation: MappedExplanation,
        indexedCode: IndexedCode,
        synthesisResult: SynthesisResult,
        code: string,
        language: string,
        editor: vscode.TextEditor,
        selection?: vscode.Selection
    ) {
        this.currentEditor = editor;

        // Create or show webview panel
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
        } else {
            this.panel = vscode.window.createWebviewPanel(
                'codeVoiceExplainer',
                'Preprocessed Code Explanation',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    localResourceRoots: [this.context.extensionUri],
                    retainContextWhenHidden: true
                }
            );

            // Handle panel disposal
            this.panel.onDidDispose(() => {
                this.panel = undefined;
                this.currentEditor = undefined;
                if (this.highlightManager && editor) {
                    this.highlightManager.clearHighlights(editor);
                }
            });
        }

        // Convert audio buffer to base64 for embedding
        const audioBase64 = synthesisResult.audioBuffer.toString('base64');
        const audioDataUri = `data:audio/mpeg;base64,${audioBase64}`;

        // Set webview content with preprocessed synchronization support
        this.panel.webview.html = this.getPreprocessedWebviewContent(
            mappedExplanation,
            indexedCode,
            audioDataUri,
            code,
            language
        );

        // Handle messages from webview for preprocessed synchronization
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'highlightElements':
                        this.highlightIndexedElements(message.elementIds, indexedCode);
                        break;
                    case 'clearHighlights':
                        this.clearAllHighlights();
                        break;
                    case 'saveAudio':
                        await this.saveAudioFile(synthesisResult.audioBuffer);
                        break;
                    case 'audioProgress':
                        this.handlePreprocessedAudioProgress(message.currentTime, mappedExplanation, indexedCode);
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );

        // Initial highlight for selected code (blue highlighting)
        if (selection && this.highlightManager) {
            this.highlightManager.highlightSelectionRange(editor, selection);
        }
    }

    async showExplanation(explanation: string, audioBuffer: Buffer, code: string, language: string) {
        // Create or show webview panel
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
        } else {
            this.panel = vscode.window.createWebviewPanel(
                'codeVoiceExplainer',
                'Code Voice Explanation',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    localResourceRoots: [this.context.extensionUri],
                    retainContextWhenHidden: true
                }
            );

            // Handle panel disposal
            this.panel.onDidDispose(() => {
                this.panel = undefined;
            });
        }

        // Convert audio buffer to base64 for embedding
        const audioBase64 = audioBuffer.toString('base64');
        const audioDataUri = `data:audio/mpeg;base64,${audioBase64}`;

        // Set webview content
        this.panel.webview.html = this.getWebviewContent(explanation, audioDataUri, code, language);

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'playAudio':
                        // Audio is handled in the webview
                        break;
                    case 'regenerate':
                        vscode.window.showInformationMessage('Regenerating explanation...');
                        // Trigger regeneration logic here
                        break;
                    case 'saveAudio':
                        await this.saveAudioFile(audioBuffer);
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    private getWebviewContent(explanation: string, audioDataUri: string, code: string, language: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Voice Explanation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .header {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        
        .title {
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 10px 0;
            color: var(--vscode-foreground);
        }
        
        .subtitle {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            margin: 0;
        }
        
        .audio-controls {
            background: var(--vscode-panel-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .audio-player {
            width: 100%;
            margin-bottom: 15px;
        }
        
        .controls {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        
        .btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .btn:disabled {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: not-allowed;
        }
        
        .explanation {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .explanation h3 {
            margin-top: 0;
            color: var(--vscode-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        
        .explanation p {
            margin: 15px 0;
            line-height: 1.7;
        }
        
        .code-preview {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
        }
        
        .code-preview h4 {
            margin: 0 0 15px 0;
            color: var(--vscode-foreground);
            font-size: 14px;
            font-weight: 600;
        }
        
        .code-block {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 15px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 13px;
            line-height: 1.4;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            margin-top: 10px;
        }
        
        .status-icon {
            width: 16px;
            height: 16px;
            border-radius: 50%;
        }
        
        .status-ready { background: var(--vscode-testing-iconPassed); }
        .status-playing { background: var(--vscode-testing-iconQueued); }
        .status-error { background: var(--vscode-testing-iconFailed); }
        
        @media (max-width: 600px) {
            .controls {
                flex-direction: column;
            }
            
            .btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">Code Voice Explanation</h1>
            <p class="subtitle">AI-generated explanation with voice synthesis</p>
        </div>
        
        <div class="audio-controls">
            <audio id="audioPlayer" class="audio-player" controls preload="auto">
                <source src="${audioDataUri}" type="audio/mpeg">
                Your browser does not support the audio element.
            </audio>
            
            <div class="controls">
                <button class="btn" onclick="playAudio()">▶️ Play</button>
                <button class="btn" onclick="pauseAudio()">⏸️ Pause</button>
                <button class="btn" onclick="restartAudio()">🔄 Restart</button>
                <button class="btn" onclick="saveAudio()">💾 Save Audio</button>
            </div>
            
            <div class="status">
                <div class="status-icon status-ready" id="statusIcon"></div>
                <span id="statusText">Ready to play</span>
            </div>
        </div>
        
        <div class="explanation">
            <h3>📝 Explanation</h3>
            <div id="explanationText">${explanation.replace(/\n/g, '</p><p>')}</div>
        </div>
        
        <div class="code-preview">
            <h4>📄 Code (${language})</h4>
            <div class="code-block">${this.escapeHtml(code)}</div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const audioPlayer = document.getElementById('audioPlayer');
        const statusIcon = document.getElementById('statusIcon');
        const statusText = document.getElementById('statusText');

        function updateStatus(status, text) {
            statusIcon.className = 'status-icon ' + status;
            statusText.textContent = text;
        }

        function playAudio() {
            audioPlayer.play();
            updateStatus('status-playing', 'Playing...');
            vscode.postMessage({ command: 'playAudio' });
        }

        function pauseAudio() {
            audioPlayer.pause();
            updateStatus('status-ready', 'Paused');
        }

        function restartAudio() {
            audioPlayer.currentTime = 0;
            audioPlayer.play();
            updateStatus('status-playing', 'Playing from start...');
        }

        function saveAudio() {
            vscode.postMessage({ command: 'saveAudio' });
        }

        // Audio event listeners
        audioPlayer.addEventListener('play', () => {
            updateStatus('status-playing', 'Playing...');
        });

        audioPlayer.addEventListener('pause', () => {
            updateStatus('status-ready', 'Paused');
        });

        audioPlayer.addEventListener('ended', () => {
            updateStatus('status-ready', 'Finished');
        });

        audioPlayer.addEventListener('error', (e) => {
            updateStatus('status-error', 'Audio error');
            console.error('Audio error:', e);
        });

        audioPlayer.addEventListener('loadstart', () => {
            updateStatus('status-ready', 'Loading audio...');
        });

        audioPlayer.addEventListener('canplay', () => {
            updateStatus('status-ready', 'Ready to play');
        });

        // Auto-play on load (if browser allows)
        document.addEventListener('DOMContentLoaded', () => {
            // Small delay to ensure audio is loaded
            setTimeout(() => {
                audioPlayer.play().catch(e => {
                    console.log('Auto-play prevented by browser:', e);
                    updateStatus('status-ready', 'Click play to start');
                });
            }, 500);
        });
    </script>
</body>
</html>`;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    private async saveAudioFile(audioBuffer: Buffer) {
        try {
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('code-explanation.mp3'),
                filters: {
                    'Audio Files': ['mp3']
                }
            });

            if (saveUri) {
                await vscode.workspace.fs.writeFile(saveUri, audioBuffer);
                vscode.window.showInformationMessage(`Audio saved to ${saveUri.fsPath}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private highlightCodeSection(sectionIndex: number) {
        if (!this.currentEditor || !this.highlightManager) {
            return;
        }

        // This would be called from the webview when a specific section is being explained
        // Implementation depends on how we map sections to line ranges
        console.log(`Highlighting section ${sectionIndex}`);
    }

    private clearAllHighlights() {
        if (this.currentEditor && this.highlightManager) {
            this.highlightManager.clearHighlights(this.currentEditor);
        }
    }

    private highlightCodeElements(elements: CodeElement[]) {
        if (!this.currentEditor || !this.highlightManager || elements.length === 0) {
            return;
        }

        // Convert code elements to VSCode ranges and highlight them (light yellow for explanation)
        const ranges = elements.map(element => element.range);
        this.highlightManager.highlightExplanationRanges(this.currentEditor, ranges);
    }

    private handleNaturalAudioProgress(currentTimeMs: number, highlightTimeline: HighlightEvent[], wordElementMapper: WordElementMapper) {
        if (!this.currentEditor || !this.highlightManager) {
            return;
        }

        // Get elements that should be highlighted at this time
        const elementsToHighlight = wordElementMapper.getElementsAtTime(currentTimeMs, highlightTimeline);
        
        if (elementsToHighlight.length > 0) {
            this.highlightCodeElements(elementsToHighlight);
        } else {
            // Clear highlights if no elements should be highlighted
            this.clearAllHighlights();
        }
    }

    private highlightIndexedElements(elementIds: string[], indexedCode: IndexedCode) {
        if (!this.currentEditor || !this.highlightManager || elementIds.length === 0) {
            return;
        }

        // Convert element IDs to VSCode ranges and highlight them
        const ranges: vscode.Range[] = [];
        elementIds.forEach(id => {
            const element = indexedCode.elementMap.get(id);
            if (element) {
                ranges.push(element.range);
            }
        });

        if (ranges.length > 0) {
            this.highlightManager.highlightExplanationRanges(this.currentEditor, ranges);
        }
    }

    private handlePreprocessedAudioProgress(currentTimeMs: number, mappedExplanation: MappedExplanation, indexedCode: IndexedCode) {
        if (!this.currentEditor || !this.highlightManager) {
            return;
        }

        // Find which segment should be highlighted based on timing
        const activeSegments = mappedExplanation.segments.filter(segment => 
            segment.startTime !== undefined && 
            segment.endTime !== undefined &&
            currentTimeMs >= segment.startTime && 
            currentTimeMs <= segment.endTime
        );

        if (activeSegments.length > 0) {
            // Sort by confidence and use highest confidence segment
            activeSegments.sort((a, b) => b.confidence - a.confidence);
            const bestSegment = activeSegments[0];
            
            // Highlight elements for this segment
            this.highlightIndexedElements(bestSegment.elementIds, indexedCode);
        } else {
            // Clear highlights when no segments are active
            this.clearAllHighlights();
        }
    }

    private handleAudioProgress(currentTimeMs: number, structuredExplanation: StructuredExplanation) {
        if (!this.currentEditor || !this.highlightManager) {
            return;
        }

        // Find which section should be highlighted based on audio progress
        // This is a simplified approach - in reality, you'd map word timings to sections
        const totalDuration = 10000; // Estimate total duration
        const sectionDuration = totalDuration / structuredExplanation.sections.length;
        const currentSection = Math.floor(currentTimeMs / sectionDuration);

        if (currentSection < structuredExplanation.sections.length) {
            const section = structuredExplanation.sections[currentSection];
            const startLine = section.startLine - 1; // Convert to 0-based
            const endLine = section.endLine - 1;
            
            const range = new vscode.Range(startLine, 0, endLine, 999);
            this.highlightManager.highlightExplanationRange(this.currentEditor, range);
        }
    }

    private getSynchronizedWebviewContent(
        structuredExplanation: StructuredExplanation,
        synthesisResult: SynthesisResult,
        audioDataUri: string,
        code: string,
        language: string
    ): string {
        const sectionsJson = JSON.stringify(structuredExplanation.sections);
        const wordTimingsJson = JSON.stringify(synthesisResult.wordTimings);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Synchronized Code Explanation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .left-panel {
            display: flex;
            flex-direction: column;
        }
        
        .right-panel {
            display: flex;
            flex-direction: column;
        }
        
        .header {
            grid-column: 1 / -1;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        
        .title {
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 10px 0;
            color: var(--vscode-foreground);
        }
        
        .subtitle {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            margin: 0;
        }
        
        .audio-controls {
            background: var(--vscode-panel-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .audio-player {
            width: 100%;
            margin-bottom: 15px;
        }
        
        .controls {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .btn.sync-enabled {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .sections {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .section {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            transition: all 0.3s ease;
        }
        
        .section.active {
            background: var(--vscode-editor-selectionHighlightBackground);
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 1px var(--vscode-focusBorder);
        }
        
        .section-title {
            font-weight: 600;
            margin: 0 0 10px 0;
            color: var(--vscode-foreground);
            font-size: 16px;
        }
        
        .section-lines {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
        }
        
        .section-explanation {
            line-height: 1.6;
        }
        
        .code-preview {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 15px;
        }
        
        .code-preview h4 {
            margin: 0 0 15px 0;
            color: var(--vscode-foreground);
            font-size: 14px;
            font-weight: 600;
        }
        
        .code-block {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 15px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 13px;
            line-height: 1.4;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .code-line {
            display: block;
            transition: background-color 0.3s ease;
        }
        
        .code-line.highlighted {
            background-color: var(--vscode-editor-findMatchHighlightBackground);
            outline: 1px solid var(--vscode-editor-findMatchBorder);
        }
        
        .sync-status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            margin-top: 10px;
        }
        
        .sync-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--vscode-testing-iconPassed);
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        @media (max-width: 768px) {
            .container {
                grid-template-columns: 1fr;
            }
            
            .controls {
                flex-direction: column;
            }
            
            .btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🎤 Synchronized Code Explanation</h1>
            <p class="subtitle">AI-generated explanation with real-time code highlighting</p>
        </div>
        
        <div class="left-panel">
            <div class="audio-controls">
                <audio id="audioPlayer" class="audio-player" controls preload="auto">
                    <source src="${audioDataUri}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
                
                <div class="controls">
                    <button class="btn" onclick="playAudio()">▶️ Play</button>
                    <button class="btn" onclick="pauseAudio()">⏸️ Pause</button>
                    <button class="btn" onclick="restartAudio()">🔄 Restart</button>
                    <button class="btn sync-enabled" onclick="toggleSync()" id="syncBtn">🔗 Sync ON</button>
                    <button class="btn" onclick="saveAudio()">💾 Save Audio</button>
                </div>
                
                <div class="sync-status">
                    <div class="sync-indicator" id="syncIndicator"></div>
                    <span id="syncStatus">Synchronization enabled</span>
                </div>
            </div>
            
            <div class="sections">
                <h3>📋 Explanation Sections</h3>
                <div id="sectionsList"></div>
            </div>
        </div>
        
        <div class="right-panel">
            <div class="code-preview">
                <h4>📄 Code (${language})</h4>
                <div class="code-block" id="codeBlock">${this.escapeHtml(code)}</div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const audioPlayer = document.getElementById('audioPlayer');
        const syncIndicator = document.getElementById('syncIndicator');
        const syncStatus = document.getElementById('syncStatus');
        const syncBtn = document.getElementById('syncBtn');
        const sectionsList = document.getElementById('sectionsList');
        const codeBlock = document.getElementById('codeBlock');

        let syncEnabled = true;
        let currentSection = -1;
        let sections = ${sectionsJson};
        let wordTimings = ${wordTimingsJson};

        // Initialize sections display
        function initSections() {
            sections.forEach((section, index) => {
                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'section';
                sectionDiv.id = 'section-' + index;
                sectionDiv.innerHTML = \`
                    <div class="section-title">\${section.title}</div>
                    <div class="section-lines">Lines \${section.startLine}-\${section.endLine}</div>
                    <div class="section-explanation">\${section.explanation}</div>
                \`;
                sectionsList.appendChild(sectionDiv);
            });
        }

        function playAudio() {
            audioPlayer.play();
        }

        function pauseAudio() {
            audioPlayer.pause();
        }

        function restartAudio() {
            audioPlayer.currentTime = 0;
            audioPlayer.play();
        }

        function toggleSync() {
            syncEnabled = !syncEnabled;
            syncBtn.textContent = syncEnabled ? '🔗 Sync ON' : '🔗 Sync OFF';
            syncBtn.className = syncEnabled ? 'btn sync-enabled' : 'btn';
            syncStatus.textContent = syncEnabled ? 'Synchronization enabled' : 'Synchronization disabled';
            
            if (!syncEnabled) {
                clearHighlights();
            }
        }

        function saveAudio() {
            vscode.postMessage({ command: 'saveAudio' });
        }

        function highlightSection(sectionIndex) {
            // Clear previous highlights
            document.querySelectorAll('.section.active').forEach(el => {
                el.classList.remove('active');
            });

            // Highlight current section in UI
            if (sectionIndex >= 0 && sectionIndex < sections.length) {
                const sectionEl = document.getElementById('section-' + sectionIndex);
                if (sectionEl) {
                    sectionEl.classList.add('active');
                    sectionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                // Send message to extension to highlight code in editor
                vscode.postMessage({ 
                    command: 'highlightSection', 
                    sectionIndex: sectionIndex 
                });
            }
        }

        function clearHighlights() {
            document.querySelectorAll('.section.active').forEach(el => {
                el.classList.remove('active');
            });
            vscode.postMessage({ command: 'clearHighlights' });
        }

        // Audio progress tracking for synchronization
        audioPlayer.addEventListener('timeupdate', () => {
            if (!syncEnabled) return;

            const currentTimeMs = audioPlayer.currentTime * 1000;
            
            // Send progress to extension
            vscode.postMessage({ 
                command: 'audioProgress', 
                currentTime: currentTimeMs 
            });

            // Simple section highlighting based on time
            const totalDuration = audioPlayer.duration * 1000;
            const sectionDuration = totalDuration / sections.length;
            const newSection = Math.floor(currentTimeMs / sectionDuration);

            if (newSection !== currentSection && newSection < sections.length) {
                currentSection = newSection;
                highlightSection(currentSection);
            }
        });

        audioPlayer.addEventListener('ended', () => {
            clearHighlights();
            currentSection = -1;
        });

        audioPlayer.addEventListener('pause', () => {
            syncIndicator.style.animationPlayState = 'paused';
        });

        audioPlayer.addEventListener('play', () => {
            syncIndicator.style.animationPlayState = 'running';
        });

        // Initialize
        initSections();

        // Auto-play on load (if browser allows)
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                audioPlayer.play().catch(e => {
                    console.log('Auto-play prevented by browser:', e);
                });
            }, 500);
        });
    </script>
</body>
</html>`;
    }

    private getNaturalWebviewContent(
        explanation: string,
        synthesisResult: SynthesisResult,
        highlightTimeline: HighlightEvent[],
        audioDataUri: string,
        code: string,
        language: string
    ): string {
        const timelineJson = JSON.stringify(highlightTimeline);
        const wordTimingsJson = JSON.stringify(synthesisResult.wordTimings);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Natural Code Explanation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .header {
            grid-column: 1 / -1;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        
        .title {
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 10px 0;
            color: var(--vscode-foreground);
        }
        
        .subtitle {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            margin: 0;
        }
        
        .left-panel {
            display: flex;
            flex-direction: column;
        }
        
        .right-panel {
            display: flex;
            flex-direction: column;
        }
        
        .audio-controls {
            background: var(--vscode-panel-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .audio-player {
            width: 100%;
            margin-bottom: 15px;
        }
        
        .controls {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .btn.sync-enabled {
            background: var(--vscode-testing-iconPassed);
            color: white;
        }
        
        .explanation-panel {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .explanation-text {
            line-height: 1.8;
            font-size: 16px;
        }
        

        
        .code-preview {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 15px;
        }
        
        .code-preview h4 {
            margin: 0 0 15px 0;
            color: var(--vscode-foreground);
            font-size: 14px;
            font-weight: 600;
        }
        
        .code-block {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 15px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 13px;
            line-height: 1.4;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .sync-status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            margin-top: 10px;
        }
        
        .sync-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--vscode-testing-iconPassed);
            animation: pulse 2s infinite;
        }
        
        .sync-indicator.disabled {
            background: var(--vscode-testing-iconSkipped);
            animation: none;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .highlight-info {
            background: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            padding: 10px 15px;
            margin-top: 10px;
            font-size: 14px;
            border-radius: 0 4px 4px 0;
        }
        
        @media (max-width: 768px) {
            .container {
                grid-template-columns: 1fr;
            }
            
            .controls {
                flex-direction: column;
            }
            
            .btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🎤 Natural Code Explanation</h1>
            <p class="subtitle">Real-time highlighting follows your teacher's natural voice explanation</p>
        </div>
        
        <div class="left-panel">
            <div class="audio-controls">
                <audio id="audioPlayer" class="audio-player" controls preload="auto">
                    <source src="${audioDataUri}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
                
                <div class="controls">
                    <button class="btn" onclick="playAudio()">▶️ Play</button>
                    <button class="btn" onclick="pauseAudio()">⏸️ Pause</button>
                    <button class="btn" onclick="restartAudio()">🔄 Restart</button>
                    <button class="btn sync-enabled" onclick="toggleSync()" id="syncBtn">🎯 Highlight ON</button>
                    <button class="btn" onclick="saveAudio()">💾 Save Audio</button>
                </div>
                
                <div class="sync-status">
                    <div class="sync-indicator" id="syncIndicator"></div>
                    <span id="syncStatus">Natural highlighting enabled</span>
                </div>
                
                <div class="highlight-info">
                    <strong>🌟 Natural Teaching Mode:</strong> Watch as code elements highlight naturally as they're mentioned, just like a real teacher pointing at the board!
                </div>
            </div>
            
            <div class="explanation-panel">
                <h3>📖 Teacher's Explanation</h3>
                <div class="explanation-text" id="explanationText"></div>
            </div>
        </div>
        
        <div class="right-panel">
            <div class="code-preview">
                <h4>📄 Code (${language})</h4>
                <div class="code-block" id="codeBlock">${this.escapeHtml(code)}</div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const audioPlayer = document.getElementById('audioPlayer');
        const syncIndicator = document.getElementById('syncIndicator');
        const syncStatus = document.getElementById('syncStatus');
        const syncBtn = document.getElementById('syncBtn');
        const explanationText = document.getElementById('explanationText');

        let syncEnabled = true;
        let highlightTimeline = ${timelineJson};
        let wordTimings = ${wordTimingsJson};

        // Initialize explanation text (simple, no word wrapping)
        function initExplanationText() {
            explanationText.innerHTML = \`${explanation}\`;
        }

        function playAudio() {
            audioPlayer.play();
        }

        function pauseAudio() {
            audioPlayer.pause();
        }

        function restartAudio() {
            audioPlayer.currentTime = 0;
            audioPlayer.play();
        }

        function toggleSync() {
            syncEnabled = !syncEnabled;
            syncBtn.textContent = syncEnabled ? '🎯 Highlight ON' : '🎯 Highlight OFF';
            syncBtn.className = syncEnabled ? 'btn sync-enabled' : 'btn';
            syncStatus.textContent = syncEnabled ? 'Natural highlighting enabled' : 'Highlighting disabled';
            syncIndicator.className = syncEnabled ? 'sync-indicator' : 'sync-indicator disabled';
            
            if (!syncEnabled) {
                clearHighlights();
            }
        }

        function saveAudio() {
            vscode.postMessage({ command: 'saveAudio' });
        }

        function clearHighlights() {
            // Clear code highlights in editor only
            vscode.postMessage({ command: 'clearHighlights' });
        }

        // Audio progress tracking for code highlighting only
        audioPlayer.addEventListener('timeupdate', () => {
            if (!syncEnabled) return;

            const currentTimeMs = audioPlayer.currentTime * 1000;
            
            // Find highlight events for this time
            const activeEvents = highlightTimeline.filter(event => 
                currentTimeMs >= event.startMs && currentTimeMs <= event.endMs
            );

            if (activeEvents.length > 0) {
                // Sort by confidence and use highest confidence event
                activeEvents.sort((a, b) => b.confidence - a.confidence);
                const bestEvent = activeEvents[0];
                
                // Send elements to highlight in editor
                vscode.postMessage({ 
                    command: 'highlightElements', 
                    elements: bestEvent.elements 
                });
            } else {
                // Clear highlights when no events are active
                vscode.postMessage({ command: 'clearHighlights' });
            }

            // Send progress to extension
            vscode.postMessage({ 
                command: 'audioProgress', 
                currentTime: currentTimeMs 
            });
        });

        audioPlayer.addEventListener('ended', () => {
            clearHighlights();
        });

        audioPlayer.addEventListener('pause', () => {
            syncIndicator.style.animationPlayState = 'paused';
        });

        audioPlayer.addEventListener('play', () => {
            syncIndicator.style.animationPlayState = 'running';
        });

        // Initialize
        initExplanationText();

        // Auto-play on load (if browser allows)
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                audioPlayer.play().catch(e => {
                    console.log('Auto-play prevented by browser:', e);
                });
            }, 500);
        });
    </script>
</body>
</html>`;
    }

    private getPreprocessedWebviewContent(
        mappedExplanation: MappedExplanation,
        indexedCode: IndexedCode,
        audioDataUri: string,
        code: string,
        language: string
    ): string {
        const segmentsJson = JSON.stringify(mappedExplanation.segments);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preprocessed Code Explanation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .header {
            grid-column: 1 / -1;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        
        .title {
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 10px 0;
            color: var(--vscode-foreground);
        }
        
        .subtitle {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            margin: 0;
        }
        
        .left-panel {
            display: flex;
            flex-direction: column;
        }
        
        .right-panel {
            display: flex;
            flex-direction: column;
        }
        
        .audio-controls {
            background: var(--vscode-panel-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .audio-player {
            width: 100%;
            margin-bottom: 15px;
        }
        
        .controls {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .btn.sync-enabled {
            background: var(--vscode-testing-iconPassed);
            color: white;
        }
        
        .explanation-panel {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .explanation-text {
            line-height: 1.8;
            font-size: 16px;
        }
        
        .code-preview {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 15px;
        }
        
        .code-preview h4 {
            margin: 0 0 15px 0;
            color: var(--vscode-foreground);
            font-size: 14px;
            font-weight: 600;
        }
        
        .code-block {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 15px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 13px;
            line-height: 1.4;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .sync-status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            margin-top: 10px;
        }
        
        .sync-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--vscode-testing-iconPassed);
            animation: pulse 2s infinite;
        }
        
        .sync-indicator.disabled {
            background: var(--vscode-testing-iconSkipped);
            animation: none;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .highlight-info {
            background: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            padding: 10px 15px;
            margin-top: 10px;
            font-size: 14px;
            border-radius: 0 4px 4px 0;
        }
        
        @media (max-width: 768px) {
            .container {
                grid-template-columns: 1fr;
            }
            
            .controls {
                flex-direction: column;
            }
            
            .btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🎯 Preprocessed Code Explanation</h1>
            <p class="subtitle">Dual highlighting: Blue for selection, light yellow for explanation</p>
        </div>
        
        <div class="left-panel">
            <div class="audio-controls">
                <audio id="audioPlayer" class="audio-player" controls preload="auto">
                    <source src="${audioDataUri}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
                
                <div class="controls">
                    <button class="btn" onclick="playAudio()">▶️ Play</button>
                    <button class="btn" onclick="pauseAudio()">⏸️ Pause</button>
                    <button class="btn" onclick="restartAudio()">🔄 Restart</button>
                    <button class="btn sync-enabled" onclick="toggleSync()" id="syncBtn">🎯 Highlight ON</button>
                    <button class="btn" onclick="saveAudio()">💾 Save Audio</button>
                </div>
                
                <div class="sync-status">
                    <div class="sync-indicator" id="syncIndicator"></div>
                    <span id="syncStatus">Preprocessed highlighting enabled</span>
                </div>
                
                <div class="highlight-info">
                    <strong>🎯 Dual Highlighting:</strong> Blue when selecting code, light yellow during explanation. Code analyzed first, mapped to elements, then voice generated for maximum accuracy!
                </div>
            </div>
            
            <div class="explanation-panel">
                <h3>📖 Preprocessed Explanation</h3>
                <div class="explanation-text">${mappedExplanation.fullText}</div>
            </div>
        </div>
        
        <div class="right-panel">
            <div class="code-preview">
                <h4>📄 Code (${language}) - Blue/Light Yellow Highlighting</h4>
                <div class="code-block">${this.escapeHtml(code)}</div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const audioPlayer = document.getElementById('audioPlayer');
        const syncIndicator = document.getElementById('syncIndicator');
        const syncStatus = document.getElementById('syncStatus');
        const syncBtn = document.getElementById('syncBtn');

        let syncEnabled = true;
        let segments = ${segmentsJson};

        function playAudio() {
            audioPlayer.play();
        }

        function pauseAudio() {
            audioPlayer.pause();
        }

        function restartAudio() {
            audioPlayer.currentTime = 0;
            audioPlayer.play();
        }

        function toggleSync() {
            syncEnabled = !syncEnabled;
            syncBtn.textContent = syncEnabled ? '🎯 Highlight ON' : '🎯 Highlight OFF';
            syncBtn.className = syncEnabled ? 'btn sync-enabled' : 'btn';
            syncStatus.textContent = syncEnabled ? 'Preprocessed highlighting enabled' : 'Highlighting disabled';
            syncIndicator.className = syncEnabled ? 'sync-indicator' : 'sync-indicator disabled';
            
            if (!syncEnabled) {
                clearHighlights();
            }
        }

        function saveAudio() {
            vscode.postMessage({ command: 'saveAudio' });
        }

        function clearHighlights() {
            vscode.postMessage({ command: 'clearHighlights' });
        }

        // Preprocessed audio progress tracking
        audioPlayer.addEventListener('timeupdate', () => {
            if (!syncEnabled) return;

            const currentTimeMs = audioPlayer.currentTime * 1000;
            
            // Send progress to extension for preprocessed highlighting
            vscode.postMessage({ 
                command: 'audioProgress', 
                currentTime: currentTimeMs 
            });
        });

        audioPlayer.addEventListener('ended', () => {
            clearHighlights();
        });

        audioPlayer.addEventListener('pause', () => {
            syncIndicator.style.animationPlayState = 'paused';
        });

        audioPlayer.addEventListener('play', () => {
            syncIndicator.style.animationPlayState = 'running';
        });

        // Auto-play on load (if browser allows)
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                audioPlayer.play().catch(e => {
                    console.log('Auto-play prevented by browser:', e);
                });
            }, 500);
        });
    </script>
</body>
</html>`;
    }

    dispose() {
        if (this.highlightManager) {
            this.highlightManager.dispose();
        }
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
    }
}
