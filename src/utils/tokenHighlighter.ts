import * as vscode from 'vscode';

export interface CodeToken {
    id: string;
    text: string;
    type: 'keyword' | 'identifier' | 'operator' | 'literal' | 'punctuation' | 'comment' | 'string';
    line: number;
    startChar: number;
    endChar: number;
    range: vscode.Range;
    confidence: number; // 0-1 confidence for highlighting this token
}

export interface TokenHighlightEvent {
    tokenIds: string[];
    startTimeMs: number;
    endTimeMs: number;
    confidence: number;
}

export class TokenHighlighter {
    private selectionDecorationType: vscode.TextEditorDecorationType;
    private explanationDecorationType: vscode.TextEditorDecorationType;
    private highConfidenceDecorationType: vscode.TextEditorDecorationType;
    private mediumConfidenceDecorationType: vscode.TextEditorDecorationType;
    private lowConfidenceDecorationType: vscode.TextEditorDecorationType;
    
    private activeDecorations: Map<vscode.TextEditor, CodeToken[]> = new Map();
    private allTokens: Map<string, CodeToken> = new Map(); // token ID -> token mapping

    constructor() {
        // Selection highlighting (blue)
        this.selectionDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(0, 120, 255, 0.2)',
            border: '2px solid rgba(0, 120, 255, 0.6)',
            borderRadius: '3px',
            overviewRulerColor: 'rgba(0, 120, 255, 0.6)',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            isWholeLine: false
        });

        // High confidence explanation highlighting (bright light yellow)
        this.highConfidenceDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 255, 0, 0.25)', // Brighter for high confidence
            border: '1px solid rgba(255, 255, 0, 0.5)',
            borderRadius: '2px',
            overviewRulerColor: 'rgba(255, 255, 0, 0.6)',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            isWholeLine: false
        });

        // Medium confidence explanation highlighting (medium light yellow)
        this.mediumConfidenceDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 255, 0, 0.15)', // Medium brightness
            border: '1px solid rgba(255, 255, 0, 0.3)',
            borderRadius: '2px',
            overviewRulerColor: 'rgba(255, 255, 0, 0.4)',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            isWholeLine: false
        });

        // Low confidence explanation highlighting (subtle yellow)
        this.lowConfidenceDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 255, 0, 0.08)', // Very subtle
            border: '1px dotted rgba(255, 255, 0, 0.2)',
            borderRadius: '2px',
            overviewRulerColor: 'rgba(255, 255, 0, 0.2)',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            isWholeLine: false
        });

        // Default explanation highlighting (legacy compatibility)
        this.explanationDecorationType = this.mediumConfidenceDecorationType;
    }

    /**
     * Parse code into individual tokens for precise highlighting
     */
    parseCodeIntoTokens(code: string, language: string): CodeToken[] {
        const tokens: CodeToken[] = [];
        const lines = code.split('\n');
        let tokenId = 0;

        lines.forEach((line, lineIndex) => {
            const lineTokens = this.parseLineIntoTokens(line, lineIndex, language);
            lineTokens.forEach(token => {
                token.id = `token_${++tokenId}`;
                tokens.push(token);
                this.allTokens.set(token.id, token);
            });
        });

        return tokens;
    }

    private parseLineIntoTokens(line: string, lineIndex: number, language: string): CodeToken[] {
        const tokens: CodeToken[] = [];
        
        // Define token patterns based on language
        const patterns = this.getLanguagePatterns(language);
        
        let position = 0;
        while (position < line.length) {
            const char = line[position];
            
            // Skip whitespace
            if (/\s/.test(char)) {
                position++;
                continue;
            }

            let tokenFound = false;
            
            // Try each pattern
            for (const pattern of patterns) {
                const match = line.slice(position).match(pattern.regex);
                if (match && match.index === 0) {
                    const tokenText = match[0];
                    const startChar = position;
                    const endChar = position + tokenText.length;
                    
                    const token: CodeToken = {
                        id: '', // Will be set by caller
                        text: tokenText,
                        type: pattern.type,
                        line: lineIndex,
                        startChar,
                        endChar,
                        range: new vscode.Range(lineIndex, startChar, lineIndex, endChar),
                        confidence: this.calculateTokenConfidence(tokenText, pattern.type)
                    };
                    
                    tokens.push(token);
                    position = endChar;
                    tokenFound = true;
                    break;
                }
            }
            
            // If no pattern matched, treat as identifier or unknown
            if (!tokenFound) {
                const remainingLine = line.slice(position);
                const identifierMatch = remainingLine.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
                
                if (identifierMatch) {
                    const tokenText = identifierMatch[0];
                    const startChar = position;
                    const endChar = position + tokenText.length;
                    
                    const token: CodeToken = {
                        id: '',
                        text: tokenText,
                        type: 'identifier',
                        line: lineIndex,
                        startChar,
                        endChar,
                        range: new vscode.Range(lineIndex, startChar, lineIndex, endChar),
                        confidence: 0.7 // Medium confidence for identifiers
                    };
                    
                    tokens.push(token);
                    position = endChar;
                } else {
                    // Single character token
                    const tokenText = char;
                    const startChar = position;
                    const endChar = position + 1;
                    
                    const token: CodeToken = {
                        id: '',
                        text: tokenText,
                        type: 'punctuation',
                        line: lineIndex,
                        startChar,
                        endChar,
                        range: new vscode.Range(lineIndex, startChar, lineIndex, endChar),
                        confidence: 0.3 // Low confidence for punctuation
                    };
                    
                    tokens.push(token);
                    position++;
                }
            }
        }
        
        return tokens;
    }

    private getLanguagePatterns(language: string): Array<{regex: RegExp, type: CodeToken['type']}> {
        const patterns: Array<{regex: RegExp, type: CodeToken['type']}> = [];
        
        // Common patterns for most languages
        patterns.push(
            // Comments
            { regex: /^\/\/.*$/, type: 'comment' },
            { regex: /^\/\*[\s\S]*?\*\//, type: 'comment' },
            { regex: /^#.*$/, type: 'comment' },
            
            // Strings
            { regex: /^"(?:[^"\\]|\\.)*"/, type: 'string' },
            { regex: /^'(?:[^'\\]|\\.)*'/, type: 'string' },
            { regex: /^`(?:[^`\\]|\\.)*`/, type: 'string' },
            
            // Numbers
            { regex: /^\d+(\.\d+)?([eE][+-]?\d+)?/, type: 'literal' },
            
            // Operators (order matters - longer first)
            { regex: /^===/, type: 'operator' },
            { regex: /^!==/, type: 'operator' },
            { regex: /^==/, type: 'operator' },
            { regex: /^!=/, type: 'operator' },
            { regex: /^<=/, type: 'operator' },
            { regex: /^>=/, type: 'operator' },
            { regex: /^=>/, type: 'operator' },
            { regex: /^\+\+/, type: 'operator' },
            { regex: /^--/, type: 'operator' },
            { regex: /^&&/, type: 'operator' },
            { regex: /^\|\|/, type: 'operator' },
            { regex: /^[+\-*/%=<>!&|^~]/, type: 'operator' },
            
            // Punctuation
            { regex: /^[(){}\[\];,.]/, type: 'punctuation' }
        );

        // Language-specific keywords
        switch (language) {
            case 'javascript':
            case 'typescript':
                patterns.push(
                    { regex: /\b(function|const|let|var|if|else|for|while|return|class|import|export|async|await|try|catch|finally|throw|new|this|super|extends|implements|interface|type|enum|namespace|module|declare|public|private|protected|static|readonly|abstract)\b/, type: 'keyword' }
                );
                break;
            case 'python':
                patterns.push(
                    { regex: /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|raise|with|lambda|global|nonlocal|yield|assert|break|continue|pass|del|and|or|not|in|is|True|False|None)\b/, type: 'keyword' }
                );
                break;
            case 'java':
                patterns.push(
                    { regex: /\b(public|private|protected|static|final|abstract|class|interface|extends|implements|if|else|for|while|return|try|catch|finally|throw|throws|new|this|super|package|import|void|int|String|boolean|double|float|long|short|byte|char)\b/, type: 'keyword' }
                );
                break;
            default:
                patterns.push(
                    { regex: /\b(if|else|for|while|return|function|class|def|import|export|var|let|const|try|catch|finally)\b/, type: 'keyword' }
                );
        }

        return patterns;
    }

    private calculateTokenConfidence(text: string, type: CodeToken['type']): number {
        // Calculate confidence based on token type and characteristics
        switch (type) {
            case 'keyword':
                return 0.9; // High confidence for keywords
            case 'identifier':
                return text.length > 2 ? 0.8 : 0.6; // Higher confidence for longer identifiers
            case 'operator':
                return 0.7; // Medium-high confidence for operators
            case 'string':
                return 0.8; // High confidence for strings
            case 'literal':
                return 0.7; // Medium-high confidence for literals
            case 'comment':
                return 0.5; // Medium confidence for comments
            case 'punctuation':
                return 0.3; // Low confidence for punctuation
            default:
                return 0.5;
        }
    }

    /**
     * Highlight specific tokens for selection (blue)
     */
    highlightSelectionTokens(editor: vscode.TextEditor, tokenIds: string[]) {
        this.clearHighlights(editor);
        
        const tokens = tokenIds.map(id => this.allTokens.get(id)).filter(Boolean) as CodeToken[];
        const decorations = tokens.map(token => ({
            range: token.range,
            hoverMessage: `Selected token: ${token.text} (${token.type})`
        }));

        editor.setDecorations(this.selectionDecorationType, decorations);
        this.activeDecorations.set(editor, tokens);
    }

    /**
     * Highlight specific tokens during explanation with confidence-based styling
     */
    highlightExplanationTokens(editor: vscode.TextEditor, tokenIds: string[], overallConfidence: number = 0.7) {
        this.clearHighlights(editor);
        
        const tokens = tokenIds.map(id => this.allTokens.get(id)).filter(Boolean) as CodeToken[];
        
        // Group tokens by confidence level
        const highConfidenceTokens: vscode.DecorationOptions[] = [];
        const mediumConfidenceTokens: vscode.DecorationOptions[] = [];
        const lowConfidenceTokens: vscode.DecorationOptions[] = [];

        tokens.forEach(token => {
            const combinedConfidence = (token.confidence * 0.6) + (overallConfidence * 0.4);
            const decoration = {
                range: token.range,
                hoverMessage: `${token.text} (${token.type}) - Confidence: ${(combinedConfidence * 100).toFixed(0)}%`
            };

            if (combinedConfidence >= 0.8) {
                highConfidenceTokens.push(decoration);
            } else if (combinedConfidence >= 0.5) {
                mediumConfidenceTokens.push(decoration);
            } else {
                lowConfidenceTokens.push(decoration);
            }
        });

        // Apply decorations based on confidence levels
        editor.setDecorations(this.highConfidenceDecorationType, highConfidenceTokens);
        editor.setDecorations(this.mediumConfidenceDecorationType, mediumConfidenceTokens);
        editor.setDecorations(this.lowConfidenceDecorationType, lowConfidenceTokens);
        
        this.activeDecorations.set(editor, tokens);

        // Scroll to the first token if any
        if (tokens.length > 0) {
            editor.revealRange(tokens[0].range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        }
    }

    /**
     * Find tokens that match spoken words with fuzzy matching
     */
    findTokensForWords(spokenWords: string[], language: string): string[] {
        const matchedTokenIds: string[] = [];
        const words = spokenWords.map(w => w.toLowerCase().trim());

        this.allTokens.forEach((token, tokenId) => {
            const tokenText = token.text.toLowerCase();
            
            // Direct word matching
            if (words.includes(tokenText)) {
                matchedTokenIds.push(tokenId);
                return;
            }

            // Fuzzy matching for identifiers
            if (token.type === 'identifier' || token.type === 'keyword') {
                const similarity = this.calculateWordSimilarity(tokenText, words);
                if (similarity > 0.7) {
                    matchedTokenIds.push(tokenId);
                }
            }

            // Special handling for common spoken representations
            const spokenForm = this.getSpokenForm(token);
            if (spokenForm && words.some(word => word.includes(spokenForm) || spokenForm.includes(word))) {
                matchedTokenIds.push(tokenId);
            }
        });

        return matchedTokenIds;
    }

    private calculateWordSimilarity(tokenText: string, words: string[]): number {
        let maxSimilarity = 0;
        
        words.forEach(word => {
            // Simple similarity based on common characters and length
            const commonChars = tokenText.split('').filter(char => word.includes(char)).length;
            const similarity = commonChars / Math.max(tokenText.length, word.length);
            maxSimilarity = Math.max(maxSimilarity, similarity);
        });

        return maxSimilarity;
    }

    private getSpokenForm(token: CodeToken): string | null {
        // Convert code tokens to their likely spoken forms
        const spokenForms: Record<string, string> = {
            '=': 'equals',
            '==': 'double equals',
            '===': 'triple equals',
            '+': 'plus',
            '-': 'minus',
            '*': 'times',
            '/': 'divide',
            '++': 'increment',
            '--': 'decrement',
            '&&': 'and',
            '||': 'or',
            '=>': 'arrow',
            '(': 'parenthesis',
            ')': 'close parenthesis',
            '{': 'brace',
            '}': 'close brace',
            '[': 'bracket',
            ']': 'close bracket',
            ';': 'semicolon',
            ',': 'comma',
            '.': 'dot'
        };

        return spokenForms[token.text] || null;
    }

    /**
     * Clear all highlights from editor
     */
    clearHighlights(editor: vscode.TextEditor) {
        editor.setDecorations(this.selectionDecorationType, []);
        editor.setDecorations(this.highConfidenceDecorationType, []);
        editor.setDecorations(this.mediumConfidenceDecorationType, []);
        editor.setDecorations(this.lowConfidenceDecorationType, []);
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
     * Get all tokens for a code file
     */
    getAllTokens(): Map<string, CodeToken> {
        return this.allTokens;
    }

    /**
     * Reset token storage (call when analyzing new code)
     */
    resetTokens() {
        this.allTokens.clear();
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.clearAllHighlights();
        this.selectionDecorationType.dispose();
        this.highConfidenceDecorationType.dispose();
        this.mediumConfidenceDecorationType.dispose();
        this.lowConfidenceDecorationType.dispose();
    }
}
