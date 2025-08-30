import * as vscode from 'vscode';
import { CodeExplainer } from './services/codeExplainer';
import { VoiceSynthesizer, SynthesisResult } from './services/voiceSynthesizer';
import { HighlightManager } from './utils/highlightManager';
import { WebviewManager } from './webview/webviewManager';
import { TokenHighlighter } from './utils/tokenHighlighter';
import { IntelligentTimelineGenerator } from './services/intelligentTimelineGenerator';
import { IntelligentTimelinePlayer } from './utils/intelligentTimelinePlayer';

let codeExplainer: CodeExplainer;
let voiceSynthesizer: VoiceSynthesizer;
let highlightManager: HighlightManager;
let webviewManager: WebviewManager;
let tokenHighlighter: TokenHighlighter;
let intelligentTimelineGenerator: IntelligentTimelineGenerator;
let intelligentTimelinePlayer: IntelligentTimelinePlayer;

export function activate(context: vscode.ExtensionContext) {
    console.log('Code Voice Explainer extension is now active!');

    // Initialize services
    codeExplainer = new CodeExplainer();
    voiceSynthesizer = new VoiceSynthesizer();
    highlightManager = new HighlightManager();
    tokenHighlighter = new TokenHighlighter();
    intelligentTimelineGenerator = new IntelligentTimelineGenerator();
    intelligentTimelinePlayer = new IntelligentTimelinePlayer();
    webviewManager = new WebviewManager(context, highlightManager, tokenHighlighter, intelligentTimelinePlayer);

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

    const selectVoiceCommand = vscode.commands.registerCommand('codeVoiceExplainer.selectVoice', async () => {
        await selectVoiceLanguage();
    });

    const askQuestionCommand = vscode.commands.registerCommand('codeVoiceExplainer.askQuestion', async () => {
        await askQuestionAboutCode();
    });

    const generateCodeCommand = vscode.commands.registerCommand('codeVoiceExplainer.generateCode', async () => {
        await generateCodeWithVoice();
    });

    // Add commands to subscriptions
    context.subscriptions.push(explainCodeCommand, explainSelectionCommand, openSettingsCommand, selectVoiceCommand, askQuestionCommand, generateCodeCommand);

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

    // Highlight the selected code with blue highlighting
    highlightManager.highlightSelectionRange(editor, selection);
    
    // Also prepare token-level highlighting for the selected area
    tokenHighlighter.resetTokens();
    const selectionTokens = tokenHighlighter.parseCodeIntoTokens(selectedText, language);
    // Show selection using token-based highlighting as well
    if (selectionTokens.length > 0) {
        const tokenIds = selectionTokens.map(token => token.id);
        tokenHighlighter.highlightSelectionTokens(editor, tokenIds);
    }

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
                // Step 1: Generate natural explanation
                progress.report({ increment: 0, message: "Generating explanation..." });
                const explanation = await codeExplainer.explainCode(code, language, fileName);
                
                if (token.isCancellationRequested) {
                    return;
                }

                // Step 2: Convert to speech with precise timing (AUDIO FIRST!)
                progress.report({ increment: 25, message: "Converting to speech with timing..." });
                const synthesisResult = await voiceSynthesizer.synthesizeSpeechWithTiming(explanation);
                
                if (token.isCancellationRequested) {
                    return;
                }

                // Step 3: Parse code into tokens for precise highlighting
                progress.report({ increment: 50, message: "Parsing code into tokens..." });
                tokenHighlighter.resetTokens();
                const tokens = tokenHighlighter.parseCodeIntoTokens(code, language);
                
                if (token.isCancellationRequested) {
                    return;
                }

                // Step 4: Generate intelligent timeline using LLM
                progress.report({ increment: 75, message: "Generating intelligent timeline with LLM..." });
                const audioBase64 = synthesisResult.audioBuffer.toString('base64');
                const audioDataUri = `data:audio/mpeg;base64,${audioBase64}`;
                
                const intelligentTimeline = await intelligentTimelineGenerator.generateTimeline(
                    explanation,
                    code,
                    language,
                    synthesisResult.wordTimings,
                    tokenHighlighter.getAllTokens(),
                    audioDataUri,
                    synthesisResult.audioLengthInSeconds * 1000 // Convert to ms
                );
                
                if (token.isCancellationRequested) {
                    return;
                }

                // Step 5: Show webview with intelligent timeline player
                progress.report({ increment: 90, message: "Setting up intelligent timeline player..." });
                await webviewManager.showIntelligentTimelineExplanation(
                    explanation,
                    intelligentTimeline,
                    code, 
                    language, 
                    editor,
                    selection
                );

                progress.report({ increment: 100, message: "Ready for intelligent timeline synchronization!" });

            } catch (error) {
                console.error('Error in processCodeExplanation:', error);
                vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                
                // Clear highlights on error
                if (selection) {
                    tokenHighlighter.clearHighlights(editor);
                }
            }
        });

    } catch (error) {
        console.error('Error in processCodeExplanation:', error);
        vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function selectVoiceLanguage() {
    const config = vscode.workspace.getConfiguration('codeVoiceExplainer');
    
    // Voice categories based on Murf.ai Voice Library
    const voiceCategories = [
        {
            category: '🇺🇸 English (US)',
            voices: [
                { id: 'en-US-natalie', name: 'Natalie', description: 'Promo, Narration, Newscast' },
                { id: 'en-US-terrell', name: 'Terrell', description: 'Inspirational, Narration, Calm' },
                { id: 'en-US-miles', name: 'Miles', description: 'Conversational, Promo, Sports' },
                { id: 'en-US-ken', name: 'Ken', description: 'Conversational, Storytelling' },
                { id: 'en-US-samantha', name: 'Samantha', description: 'Conversational, Luxury, Promo' },
                { id: 'en-US-paul', name: 'Paul', description: 'Audiobook, Conversational' },
                { id: 'en-US-claire', name: 'Claire', description: 'Narration, Luxury' },
                { id: 'en-US-ryan', name: 'Ryan', description: 'Narration, Conversational, Promo' }
            ]
        },
        {
            category: '🇬🇧 English (UK)',
            voices: [
                { id: 'en-UK-ruby', name: 'Ruby', description: 'Conversational, Promo' },
                { id: 'en-UK-theo', name: 'Theo', description: 'Narration, Promo, Calm' },
                { id: 'en-UK-hazel', name: 'Hazel', description: 'Conversational' },
                { id: 'en-UK-archie', name: 'Archie', description: 'Conversational, Promo' }
            ]
        },
        {
            category: '🇪🇸 Spanish',
            voices: [
                { id: 'es-ES-diego', name: 'Diego (Spain)', description: 'Conversational, Narration' },
                { id: 'es-ES-valentina', name: 'Valentina (Spain)', description: 'Conversational, Promo' },
                { id: 'es-MX-fernando', name: 'Fernando (Mexico)', description: 'Conversational, Promo' },
                { id: 'es-MX-rosa', name: 'Rosa (Mexico)', description: 'Conversational, Narration' }
            ]
        },
        {
            category: '🇫🇷 French',
            voices: [
                { id: 'fr-FR-amelie', name: 'Amelie', description: 'Conversational, Narration' },
                { id: 'fr-FR-antoine', name: 'Antoine', description: 'Conversational, Promo' },
                { id: 'fr-FR-henri', name: 'Henri', description: 'Narration, Conversational' },
                { id: 'fr-FR-louise', name: 'Louise', description: 'Conversational, Promo' }
            ]
        },
        {
            category: '🇩🇪 German',
            voices: [
                { id: 'de-DE-klaus', name: 'Klaus', description: 'Conversational, Narration' },
                { id: 'de-DE-petra', name: 'Petra', description: 'Conversational, Promo' },
                { id: 'de-DE-werner', name: 'Werner', description: 'Narration, Conversational' },
                { id: 'de-DE-julia', name: 'Julia', description: 'Conversational, Narration' }
            ]
        },
        {
            category: '🇮🇹 Italian',
            voices: [
                { id: 'it-IT-alessandro', name: 'Alessandro', description: 'Conversational, Narration' },
                { id: 'it-IT-chiara', name: 'Chiara', description: 'Conversational, Promo' },
                { id: 'it-IT-giuseppe', name: 'Giuseppe', description: 'Narration, Conversational' },
                { id: 'it-IT-francesca', name: 'Francesca', description: 'Conversational, Narration' }
            ]
        },
        {
            category: '🌏 Other Languages',
            voices: [
                { id: 'pt-BR-antonio', name: 'Antonio (Portuguese BR)', description: 'Conversational, Narration' },
                { id: 'ru-RU-dmitri', name: 'Dmitri (Russian)', description: 'Conversational, Narration' },
                { id: 'zh-CN-wang', name: 'Wang (Chinese)', description: 'Conversational, Narration' },
                { id: 'ja-JP-akira', name: 'Akira (Japanese)', description: 'Conversational, Narration' },
                { id: 'ko-KR-minho', name: 'Minho (Korean)', description: 'Conversational, Narration' },
                { id: 'hi-IN-kalpana', name: 'Kalpana (Hindi)', description: 'Conversational, Narration' },
                { id: 'ar-SA-omar', name: 'Omar (Arabic)', description: 'Conversational, Narration' }
            ]
        }
    ];

    // Create quick pick items
    const items: vscode.QuickPickItem[] = [];
    
    for (const category of voiceCategories) {
        items.push({
            label: category.category,
            kind: vscode.QuickPickItemKind.Separator
        });
        
        for (const voice of category.voices) {
            const currentVoice = config.get<string>('murfVoiceId');
            const isSelected = currentVoice === voice.id;
            
            items.push({
                label: `${isSelected ? '✅ ' : ''}${voice.name}`,
                description: voice.description,
                detail: voice.id,
                picked: isSelected
            });
        }
    }

    const selectedVoice = await vscode.window.showQuickPick(items, {
        title: '🎵 Select Voice Language & Character',
        placeHolder: 'Choose from 150+ voices in 20+ languages',
        matchOnDescription: true,
        matchOnDetail: true
    });

    if (selectedVoice && selectedVoice.detail) {
        // Update voice configuration
        await config.update('murfVoiceId', selectedVoice.detail, vscode.ConfigurationTarget.Global);
        
        // Ask for voice style
        const currentStyle = config.get<string>('voiceStyle') || 'Conversational';
        const styleOptions = [
            { label: 'Conversational', description: 'Natural, friendly tone', value: 'Conversational' },
            { label: 'Narration', description: 'Clear storytelling voice', value: 'Narration' },
            { label: 'Promo', description: 'Energetic promotional style', value: 'Promo' },
            { label: 'Newscast', description: 'Professional news anchor style', value: 'Newscast' },
            { label: 'Calm', description: 'Relaxed, soothing tone', value: 'Calm' },
            { label: 'Inspirational', description: 'Motivating, uplifting voice', value: 'Inspirational' },
            { label: 'Audiobook', description: 'Perfect for long-form content', value: 'Audiobook' },
            { label: 'Documentary', description: 'Informative, educational tone', value: 'Documentary' }
        ];

        const selectedStyle = await vscode.window.showQuickPick(
            styleOptions.map(style => ({
                ...style,
                picked: style.value === currentStyle
            })),
            {
                title: 'Select Voice Style',
                placeHolder: 'Choose the speaking style for your voice'
            }
        );

        if (selectedStyle) {
            await config.update('voiceStyle', selectedStyle.value, vscode.ConfigurationTarget.Global);
        }

        const voiceName = selectedVoice.label.replace('✅ ', '');
        const styleName = selectedStyle?.label.replace(/^\S+ /, '') || currentStyle;
        
        vscode.window.showInformationMessage(
            `🎵 Voice updated to ${voiceName} (${styleName}). Try explaining some code to hear your new voice!`
        );
    }
}

async function askQuestionAboutCode() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showErrorMessage('Please select some code first');
        return;
    }

    const selectedCode = editor.document.getText(selection);
    const language = editor.document.languageId;
    const fileName = editor.document.fileName;

    // Ask user for their question
    const question = await vscode.window.showInputBox({
        title: 'Ask a Question About Your Code',
        placeHolder: 'e.g., "What happens if the input is null?", "How can I optimize this?", "What are potential bugs?"',
        prompt: 'Ask any question about the selected code - the AI will explain with voice!',
        ignoreFocusOut: true
    });

    if (!question) {
        return; // User cancelled
    }

    console.log(`User asked: "${question}" about ${language} code`);

    try {
        // Highlight the selected code
        highlightManager.highlightSelectionRange(editor, selection);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Answering your question with voice...",
            cancellable: true
        }, async (progress, token) => {
            // Step 1: Generate contextual answer
            progress.report({ increment: 20, message: "AI analyzing your question..." });
            const answer = await codeExplainer.answerCodeQuestion(selectedCode, language, fileName, question);
            
            if (token.isCancellationRequested) {
                return;
            }

            // Step 2: Convert to speech
            progress.report({ increment: 60, message: "Converting answer to voice..." });
            const synthesisResult = await voiceSynthesizer.synthesizeSpeechWithTiming(answer);
            
            if (token.isCancellationRequested) {
                return;
            }

            // Step 3: Show interactive Q&A in webview
            progress.report({ increment: 90, message: "Setting up interactive answer..." });
            const audioBase64 = synthesisResult.audioBuffer.toString('base64');
            const audioDataUri = `data:audio/mpeg;base64,${audioBase64}`;
            
            await webviewManager.showInteractiveQA(
                question,
                answer,
                selectedCode,
                language,
                audioDataUri,
                editor,
                selection
            );

            progress.report({ increment: 100, message: "Ready! Your question has been answered." });
        });

    } catch (error) {
        console.error('Error in askQuestionAboutCode:', error);
        vscode.window.showErrorMessage(`Q&A error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Clear highlights on error
        highlightManager.clearHighlights(editor);
    }
}

async function generateCodeWithVoice() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    // Ask user what code they want to generate
    const codeRequest = await vscode.window.showInputBox({
        title: '🎤 Generate Code with Voice',
        placeHolder: 'e.g., "Create a function to sort an array", "Write a REST API endpoint", "Make a React component"',
        prompt: 'Describe what code you want to generate - AI will create it and explain with voice!',
        ignoreFocusOut: true
    });

    if (!codeRequest) {
        return; // User cancelled
    }

    // Get current language context
    const language = editor.document.languageId;
    const fileName = editor.document.fileName;
    
    console.log(`🎤 User requested: "${codeRequest}" for ${language}`);

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating code with voice explanation...",
            cancellable: true
        }, async (progress, token) => {
            // Step 1: Generate code
            progress.report({ increment: 15, message: "AI generating your code..." });
            const generatedCode = await codeExplainer.generateCode(codeRequest, language, fileName);
            
            if (token.isCancellationRequested) {
                return;
            }

            // Step 2: Generate explanation
            progress.report({ increment: 35, message: "Creating explanation..." });
            const explanation = await codeExplainer.explainGeneratedCode(generatedCode, codeRequest, language);
            
            if (token.isCancellationRequested) {
                return;
            }

            // Step 3: Convert to speech
            progress.report({ increment: 60, message: "Converting to voice..." });
            const synthesisResult = await voiceSynthesizer.synthesizeSpeechWithTiming(explanation);
            
            if (token.isCancellationRequested) {
                return;
            }

            // Step 4: Insert code and show explanation
            progress.report({ increment: 85, message: "Inserting code and preparing explanation..." });
            
            // Insert the generated code at cursor position
            await editor.edit(editBuilder => {
                editBuilder.insert(editor.selection.active, generatedCode);
            });

            // Show voice explanation
            const audioBase64 = synthesisResult.audioBuffer.toString('base64');
            const audioDataUri = `data:audio/mpeg;base64,${audioBase64}`;
            
            await webviewManager.showCodeGeneration(
                codeRequest,
                generatedCode,
                explanation,
                language,
                audioDataUri,
                editor
            );

            progress.report({ increment: 100, message: "Code generated! Listen to the explanation." });
        });

    } catch (error) {
        console.error('Error in generateCodeWithVoice:', error);
        vscode.window.showErrorMessage(`Code generation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function deactivate() {
    if (highlightManager) {
        highlightManager.dispose();
    }
    if (tokenHighlighter) {
        tokenHighlighter.dispose();
    }
    if (intelligentTimelinePlayer) {
        intelligentTimelinePlayer.dispose();
    }
    if (webviewManager) {
        webviewManager.dispose();
    }
}


