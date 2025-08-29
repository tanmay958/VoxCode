import * as vscode from 'vscode';
import { CodeExplainer } from './services/codeExplainer';
import { VoiceSynthesizer } from './services/voiceSynthesizer';
import { HighlightManager } from './utils/highlightManager';
import { WebviewManager } from './webview/webviewManager';

let codeExplainer: CodeExplainer;
let voiceSynthesizer: VoiceSynthesizer;
let highlightManager: HighlightManager;
let webviewManager: WebviewManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('Code Voice Explainer extension is now active!');

    // Initialize services
    codeExplainer = new CodeExplainer();
    voiceSynthesizer = new VoiceSynthesizer();
    highlightManager = new HighlightManager();
    webviewManager = new WebviewManager(context);

    // Register commands
    const explainCodeCommand = vscode.commands.registerCommand('codeVoiceExplainer.explainCode', async () => {
        await explainCurrentFile();
    });

    const explainSelectionCommand = vscode.commands.registerCommand('codeVoiceExplainer.explainSelection', async () => {
        await explainSelectedCode();
    });

    const openSettingsCommand = vscode.commands.registerCommand('codeVoiceExplainer.openSettings', async () => {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'codeVoiceExplainer');
    });

    // Add commands to subscriptions
    context.subscriptions.push(explainCodeCommand, explainSelectionCommand, openSettingsCommand);

    // Show welcome message
    vscode.window.showInformationMessage('Code Voice Explainer is ready! Right-click on code to explain it with voice.');
}

async function explainCurrentFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    const document = editor.document;
    const code = document.getText();
    const fileName = document.fileName;
    const language = document.languageId;

    if (!code.trim()) {
        vscode.window.showErrorMessage('No code found in the current file');
        return;
    }

    await processCodeExplanation(code, fileName, language, editor);
}

async function explainSelectedCode() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showErrorMessage('No code selected');
        return;
    }

    const selectedText = editor.document.getText(selection);
    const fileName = editor.document.fileName;
    const language = editor.document.languageId;

    // Highlight the selected code
    highlightManager.highlightRange(editor, selection);

    await processCodeExplanation(selectedText, fileName, language, editor, selection);
}

async function processCodeExplanation(
    code: string, 
    fileName: string, 
    language: string, 
    editor: vscode.TextEditor,
    selection?: vscode.Selection
) {
    try {
        // Check if required API keys are configured
        const config = vscode.workspace.getConfiguration('codeVoiceExplainer');
        const openaiApiKey = config.get<string>('openaiApiKey');
        const murfApiKey = config.get<string>('murfApiKey');

        if (!openaiApiKey) {
            const action = await vscode.window.showErrorMessage(
                'OpenAI API key is required for code explanations. Please set it in settings.',
                'Open Settings'
            );
            if (action === 'Open Settings') {
                await vscode.commands.executeCommand('codeVoiceExplainer.openSettings');
            }
            return;
        }

        // Warn if Murf.ai API key is not configured (will use OpenAI TTS fallback)
        if (!murfApiKey) {
            vscode.window.showInformationMessage(
                'Murf.ai API key not configured. Using OpenAI TTS as fallback for voice synthesis.'
            );
        }

        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Explaining code with voice...",
            cancellable: true
        }, async (progress: vscode.Progress<{message?: string; increment?: number}>, token: vscode.CancellationToken) => {
            try {
                // Step 1: Generate explanation
                progress.report({ increment: 0, message: "Analyzing code..." });
                const explanation = await codeExplainer.explainCode(code, language, fileName);
                
                if (token.isCancellationRequested) {
                    return;
                }

                // Step 2: Convert to speech
                progress.report({ increment: 50, message: "Converting to speech..." });
                const audioBuffer = await voiceSynthesizer.synthesizeSpeech(explanation);
                
                if (token.isCancellationRequested) {
                    return;
                }

                // Step 3: Show webview with explanation and audio
                progress.report({ increment: 100, message: "Ready!" });
                await webviewManager.showExplanation(explanation, audioBuffer, code, language);

                // Keep highlight during explanation
                if (selection) {
                    setTimeout(() => {
                        highlightManager.clearHighlights(editor);
                    }, 10000); // Clear after 10 seconds
                }

            } catch (error) {
                console.error('Error in processCodeExplanation:', error);
                vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                
                // Clear highlights on error
                if (selection) {
                    highlightManager.clearHighlights(editor);
                }
            }
        });

    } catch (error) {
        console.error('Error in processCodeExplanation:', error);
        vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function deactivate() {
    if (highlightManager) {
        highlightManager.dispose();
    }
    if (webviewManager) {
        webviewManager.dispose();
    }
}
