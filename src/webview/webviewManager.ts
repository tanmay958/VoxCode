import * as vscode from 'vscode';
import * as path from 'path';

export class WebviewManager {
    private panel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
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

    dispose() {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
    }
}
