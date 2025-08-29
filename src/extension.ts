import * as vscode from 'vscode';
import { CodeExplainer, MappedExplanation } from './services/codeExplainer';
import { VoiceSynthesizer, SynthesisResult } from './services/voiceSynthesizer';
import { HighlightManager } from './utils/highlightManager';
import { WebviewManager } from './webview/webviewManager';
import { CodeIndexer } from './utils/codeIndexer';

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
    highlightManager.highlightSelectionRange(editor, selection);

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
                // Step 1: Index code elements
                progress.report({ increment: 0, message: "Indexing code elements..." });
                const codeIndexer = new CodeIndexer();
                const indexedCode = codeIndexer.indexCode(code, language);
                
                if (token.isCancellationRequested) {
                    return;
                }

                // Step 2: Generate mapped explanation
                progress.report({ increment: 20, message: "Generating mapped explanation..." });
                const mappedExplanation = await codeExplainer.explainCodeWithMapping(indexedCode, language, fileName);
                
                if (token.isCancellationRequested) {
                    return;
                }

                // Step 3: Convert to speech with timing
                progress.report({ increment: 50, message: "Converting to speech with timing..." });
                const synthesisResult = await voiceSynthesizer.synthesizeSpeechWithTiming(mappedExplanation.fullText);
                
                if (token.isCancellationRequested) {
                    return;
                }

                // Step 4: Map timing data to segments
                progress.report({ increment: 75, message: "Mapping timing to code elements..." });
                const timedMappedExplanation = mapTimingToSegments(mappedExplanation, synthesisResult);
                
                if (token.isCancellationRequested) {
                    return;
                }

                // Step 5: Show webview with preprocessed synchronized explanation
                progress.report({ increment: 90, message: "Setting up precise highlighting..." });
                await webviewManager.showPreprocessedExplanation(
                    timedMappedExplanation,
                    indexedCode,
                    synthesisResult, 
                    code, 
                    language, 
                    editor,
                    selection
                );

                progress.report({ increment: 100, message: "Ready for precise synchronized highlighting!" });

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

function mapTimingToSegments(mappedExplanation: MappedExplanation, synthesisResult: SynthesisResult): MappedExplanation {
    // Map word timing data to explanation segments for precise highlighting
    const fullText = mappedExplanation.fullText;
    const words = fullText.split(/\s+/);
    const wordTimings = synthesisResult.wordTimings;

    // Create a mapping of word positions to timing data
    const wordPositionToTiming = new Map<number, { startMs: number; endMs: number }>();
    
    wordTimings.forEach((timing, index) => {
        if (index < words.length) {
            wordPositionToTiming.set(index, {
                startMs: timing.startMs,
                endMs: timing.endMs
            });
        }
    });

    // Map segments to timing based on their text position in the full explanation
    const timedSegments = mappedExplanation.segments.map(segment => {
        const segmentWords = segment.text.split(/\s+/);
        const segmentStart = fullText.indexOf(segment.text);
        
        if (segmentStart === -1) {
            // Segment not found in full text, use estimated timing
            return {
                ...segment,
                startTime: 0,
                endTime: 1000 // 1 second default
            };
        }

        // Count words before this segment
        const textBeforeSegment = fullText.substring(0, segmentStart);
        const wordsBeforeSegment = textBeforeSegment.split(/\s+/).length - 1;
        
        // Find timing for first and last word of segment
        const firstWordIndex = Math.max(0, wordsBeforeSegment);
        const lastWordIndex = Math.min(words.length - 1, firstWordIndex + segmentWords.length - 1);
        
        const startTiming = wordPositionToTiming.get(firstWordIndex);
        const endTiming = wordPositionToTiming.get(lastWordIndex);
        
        return {
            ...segment,
            startTime: startTiming?.startMs || 0,
            endTime: endTiming?.endMs || startTiming?.endMs || 1000
        };
    });

    return {
        ...mappedExplanation,
        segments: timedSegments
    };
}
