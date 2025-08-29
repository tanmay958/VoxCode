import * as vscode from 'vscode';

export interface CodeElement {
    type: 'function' | 'variable' | 'parameter' | 'operator' | 'keyword' | 'literal' | 'comment' | 'class' | 'method' | 'property';
    name: string;
    startLine: number;
    endLine: number;
    startChar: number;
    endChar: number;
    aliases: string[]; // Alternative names this element might be referred to as
    range: vscode.Range;
}

export interface WordToElementMapping {
    word: string;
    elements: CodeElement[];
    confidence: number; // 0-1 score of how likely this word refers to these elements
}

export class CodeElementDetector {
    private elements: CodeElement[] = [];
    private wordMappings: Map<string, CodeElement[]> = new Map();

    analyzeCode(code: string, language: string): CodeElement[] {
        this.elements = [];
        this.wordMappings.clear();

        const lines = code.split('\n');
        
        // Detect different types of code elements
        this.detectFunctions(lines, language);
        this.detectVariables(lines, language);
        this.detectKeywords(lines, language);
        this.detectOperators(lines, language);
        this.detectLiterals(lines, language);
        this.detectComments(lines, language);

        // Build word mappings
        this.buildWordMappings();

        return this.elements;
    }

    getElementsForWord(word: string): CodeElement[] {
        const lowerWord = word.toLowerCase();
        
        // Direct matches
        if (this.wordMappings.has(lowerWord)) {
            return this.wordMappings.get(lowerWord)!;
        }

        // Fuzzy matches
        const fuzzyMatches: CodeElement[] = [];
        for (const [key, elements] of this.wordMappings.entries()) {
            if (key.includes(lowerWord) || lowerWord.includes(key)) {
                fuzzyMatches.push(...elements);
            }
        }

        return fuzzyMatches;
    }

    getElementsForPhrase(phrase: string): CodeElement[] {
        const words = phrase.toLowerCase().split(/\s+/);
        const allElements: CodeElement[] = [];

        for (const word of words) {
            allElements.push(...this.getElementsForWord(word));
        }

        // Remove duplicates and sort by relevance
        const uniqueElements = Array.from(new Set(allElements));
        return uniqueElements;
    }

    private detectFunctions(lines: string[], language: string) {
        const functionPatterns = this.getFunctionPatterns(language);
        
        lines.forEach((line, lineIndex) => {
            functionPatterns.forEach(pattern => {
                const matches = line.matchAll(pattern);
                for (const match of matches) {
                    if (match.groups?.name) {
                        const startChar = match.index || 0;
                        const endChar = startChar + match[0].length;
                        
                        this.elements.push({
                            type: 'function',
                            name: match.groups.name,
                            startLine: lineIndex,
                            endLine: lineIndex,
                            startChar,
                            endChar,
                            aliases: [
                                match.groups.name,
                                `${match.groups.name} function`,
                                `function ${match.groups.name}`,
                                'function',
                                'method'
                            ],
                            range: new vscode.Range(lineIndex, startChar, lineIndex, endChar)
                        });
                    }
                }
            });
        });
    }

    private detectVariables(lines: string[], language: string) {
        const variablePatterns = this.getVariablePatterns(language);
        
        lines.forEach((line, lineIndex) => {
            variablePatterns.forEach(pattern => {
                const matches = line.matchAll(pattern);
                for (const match of matches) {
                    if (match.groups?.name) {
                        const startChar = match.index || 0;
                        const endChar = startChar + match.groups.name.length;
                        
                        this.elements.push({
                            type: 'variable',
                            name: match.groups.name,
                            startLine: lineIndex,
                            endLine: lineIndex,
                            startChar,
                            endChar,
                            aliases: [
                                match.groups.name,
                                'variable',
                                'var',
                                'parameter',
                                'argument'
                            ],
                            range: new vscode.Range(lineIndex, startChar, lineIndex, endChar)
                        });
                    }
                }
            });
        });
    }

    private detectKeywords(lines: string[], language: string) {
        const keywords = this.getLanguageKeywords(language);
        
        lines.forEach((line, lineIndex) => {
            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                const matches = line.matchAll(regex);
                
                for (const match of matches) {
                    const startChar = match.index || 0;
                    const endChar = startChar + keyword.length;
                    
                    this.elements.push({
                        type: 'keyword',
                        name: keyword,
                        startLine: lineIndex,
                        endLine: lineIndex,
                        startChar,
                        endChar,
                        aliases: [keyword, this.getKeywordAliases(keyword)].flat(),
                        range: new vscode.Range(lineIndex, startChar, lineIndex, endChar)
                    });
                }
            });
        });
    }

    private detectOperators(lines: string[], language: string) {
        const operators = [
            { symbol: '=', aliases: ['equals', 'assign', 'assignment'] },
            { symbol: '==', aliases: ['double equals', 'equality', 'compare'] },
            { symbol: '===', aliases: ['triple equals', 'strict equality'] },
            { symbol: '+', aliases: ['plus', 'add', 'addition'] },
            { symbol: '-', aliases: ['minus', 'subtract', 'subtraction'] },
            { symbol: '*', aliases: ['multiply', 'times', 'multiplication'] },
            { symbol: '/', aliases: ['divide', 'division'] },
            { symbol: '++', aliases: ['increment', 'plus plus'] },
            { symbol: '--', aliases: ['decrement', 'minus minus'] },
            { symbol: '&&', aliases: ['and', 'logical and'] },
            { symbol: '||', aliases: ['or', 'logical or'] },
            { symbol: '!', aliases: ['not', 'logical not', 'bang'] },
            { symbol: '=>', aliases: ['arrow', 'arrow function', 'fat arrow'] }
        ];

        lines.forEach((line, lineIndex) => {
            operators.forEach(op => {
                const escapedSymbol = op.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedSymbol, 'g');
                const matches = line.matchAll(regex);
                
                for (const match of matches) {
                    const startChar = match.index || 0;
                    const endChar = startChar + op.symbol.length;
                    
                    this.elements.push({
                        type: 'operator',
                        name: op.symbol,
                        startLine: lineIndex,
                        endLine: lineIndex,
                        startChar,
                        endChar,
                        aliases: [op.symbol, ...op.aliases],
                        range: new vscode.Range(lineIndex, startChar, lineIndex, endChar)
                    });
                }
            });
        });
    }

    private detectLiterals(lines: string[], language: string) {
        lines.forEach((line, lineIndex) => {
            // String literals
            const stringMatches = line.matchAll(/(['"`])(?:(?!\1)[^\\]|\\.)*\1/g);
            for (const match of stringMatches) {
                const startChar = match.index || 0;
                const endChar = startChar + match[0].length;
                
                this.elements.push({
                    type: 'literal',
                    name: match[0],
                    startLine: lineIndex,
                    endLine: lineIndex,
                    startChar,
                    endChar,
                    aliases: ['string', 'text', 'literal', match[0]],
                    range: new vscode.Range(lineIndex, startChar, lineIndex, endChar)
                });
            }

            // Number literals
            const numberMatches = line.matchAll(/\b\d+(\.\d+)?\b/g);
            for (const match of numberMatches) {
                const startChar = match.index || 0;
                const endChar = startChar + match[0].length;
                
                this.elements.push({
                    type: 'literal',
                    name: match[0],
                    startLine: lineIndex,
                    endLine: lineIndex,
                    startChar,
                    endChar,
                    aliases: ['number', 'value', match[0]],
                    range: new vscode.Range(lineIndex, startChar, lineIndex, endChar)
                });
            }
        });
    }

    private detectComments(lines: string[], language: string) {
        const commentPatterns = this.getCommentPatterns(language);
        
        lines.forEach((line, lineIndex) => {
            commentPatterns.forEach(pattern => {
                const matches = line.matchAll(pattern);
                for (const match of matches) {
                    const startChar = match.index || 0;
                    const endChar = startChar + match[0].length;
                    
                    this.elements.push({
                        type: 'comment',
                        name: match[0],
                        startLine: lineIndex,
                        endLine: lineIndex,
                        startChar,
                        endChar,
                        aliases: ['comment', 'note', 'explanation'],
                        range: new vscode.Range(lineIndex, startChar, lineIndex, endChar)
                    });
                }
            });
        });
    }

    private buildWordMappings() {
        this.elements.forEach(element => {
            element.aliases.forEach(alias => {
                const words = alias.toLowerCase().split(/\s+/);
                words.forEach(word => {
                    if (word.length > 1) { // Skip single-character words
                        if (!this.wordMappings.has(word)) {
                            this.wordMappings.set(word, []);
                        }
                        this.wordMappings.get(word)!.push(element);
                    }
                });
            });
        });
    }

    private getFunctionPatterns(language: string): RegExp[] {
        const patterns: RegExp[] = [];
        
        switch (language) {
            case 'javascript':
            case 'typescript':
                patterns.push(
                    /function\s+(?<name>\w+)\s*\(/gi,
                    /(?<name>\w+)\s*=\s*function/gi,
                    /(?<name>\w+)\s*=\s*\(/gi,
                    /(?<name>\w+)\s*=>\s*/gi,
                    /(?:const|let|var)\s+(?<name>\w+)\s*=\s*\(/gi
                );
                break;
            case 'python':
                patterns.push(/def\s+(?<name>\w+)\s*\(/gi);
                break;
            case 'java':
            case 'csharp':
                patterns.push(/(?:public|private|protected|static)?\s*\w+\s+(?<name>\w+)\s*\(/gi);
                break;
            case 'go':
                patterns.push(/func\s+(?<name>\w+)\s*\(/gi);
                break;
            default:
                patterns.push(/function\s+(?<name>\w+)/gi, /def\s+(?<name>\w+)/gi);
        }
        
        return patterns;
    }

    private getVariablePatterns(language: string): RegExp[] {
        const patterns: RegExp[] = [];
        
        switch (language) {
            case 'javascript':
            case 'typescript':
                patterns.push(
                    /(?:const|let|var)\s+(?<name>\w+)/gi,
                    /(?<name>\w+)\s*=/gi
                );
                break;
            case 'python':
                patterns.push(/(?<name>\w+)\s*=/gi);
                break;
            case 'java':
            case 'csharp':
                patterns.push(/\w+\s+(?<name>\w+)\s*[=;]/gi);
                break;
            default:
                patterns.push(/(?<name>\w+)\s*=/gi);
        }
        
        return patterns;
    }

    private getLanguageKeywords(language: string): string[] {
        const commonKeywords = ['if', 'else', 'for', 'while', 'return', 'function', 'true', 'false', 'null'];
        
        switch (language) {
            case 'javascript':
            case 'typescript':
                return [...commonKeywords, 'const', 'let', 'var', 'async', 'await', 'class', 'extends', 'import', 'export'];
            case 'python':
                return [...commonKeywords, 'def', 'class', 'import', 'from', 'try', 'except', 'with', 'as'];
            case 'java':
                return [...commonKeywords, 'public', 'private', 'protected', 'static', 'class', 'extends', 'implements'];
            case 'csharp':
                return [...commonKeywords, 'public', 'private', 'protected', 'static', 'class', 'namespace', 'using'];
            default:
                return commonKeywords;
        }
    }

    private getKeywordAliases(keyword: string): string[] {
        const aliases: Record<string, string[]> = {
            'if': ['condition', 'conditional', 'check'],
            'else': ['otherwise', 'alternative'],
            'for': ['loop', 'iterate', 'iteration'],
            'while': ['loop', 'iterate', 'iteration'],
            'return': ['give back', 'output', 'result'],
            'function': ['method', 'procedure'],
            'const': ['constant', 'variable'],
            'let': ['variable', 'var'],
            'var': ['variable', 'let'],
            'class': ['object', 'type'],
            'import': ['include', 'require', 'load']
        };
        
        return aliases[keyword.toLowerCase()] || [];
    }

    private getCommentPatterns(language: string): RegExp[] {
        switch (language) {
            case 'javascript':
            case 'typescript':
            case 'java':
            case 'csharp':
                return [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//gm];
            case 'python':
                return [/#.*$/gm, /"""[\s\S]*?"""/gm, /'''[\s\S]*?'''/gm];
            default:
                return [/\/\/.*$/gm, /#.*$/gm];
        }
    }
}
