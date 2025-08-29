import * as vscode from 'vscode';

export interface IndexedCodeElement {
    id: string; // Unique identifier like "func_1", "var_2", "op_3"
    type: 'function' | 'variable' | 'parameter' | 'operator' | 'keyword' | 'literal' | 'comment' | 'class' | 'method' | 'property' | 'loop' | 'condition';
    name: string;
    startLine: number;
    endLine: number;
    startChar: number;
    endChar: number;
    range: vscode.Range;
    description: string; // Human-readable description for GPT
    aliases: string[]; // Alternative names this element might be referred to as
    context: string; // Surrounding context for better understanding
}

export interface IndexedCode {
    elements: IndexedCodeElement[];
    elementMap: Map<string, IndexedCodeElement>; // ID -> Element mapping
    codeWithIds: string; // Code with embedded ID markers
    totalElements: number;
}

export class CodeIndexer {
    private elementCounter = 0;

    indexCode(code: string, language: string): IndexedCode {
        this.elementCounter = 0;
        const elements: IndexedCodeElement[] = [];
        const elementMap = new Map<string, IndexedCodeElement>();
        
        const lines = code.split('\n');
        
        // Index different types of code elements with unique IDs
        this.indexFunctions(lines, language, elements, elementMap);
        this.indexVariables(lines, language, elements, elementMap);
        this.indexKeywords(lines, language, elements, elementMap);
        this.indexOperators(lines, language, elements, elementMap);
        this.indexLoopsAndConditions(lines, language, elements, elementMap);
        this.indexLiterals(lines, language, elements, elementMap);

        // Sort elements by position for consistent processing
        elements.sort((a, b) => {
            if (a.startLine === b.startLine) {
                return a.startChar - b.startChar;
            }
            return a.startLine - b.startLine;
        });

        // Create code with embedded ID markers (for GPT reference)
        const codeWithIds = this.embedIdsInCode(code, elements);

        return {
            elements,
            elementMap,
            codeWithIds,
            totalElements: elements.length
        };
    }

    private generateId(type: string): string {
        return `${type}_${++this.elementCounter}`;
    }

    private indexFunctions(lines: string[], language: string, elements: IndexedCodeElement[], elementMap: Map<string, IndexedCodeElement>) {
        const functionPatterns = this.getFunctionPatterns(language);
        
        lines.forEach((line, lineIndex) => {
            functionPatterns.forEach(pattern => {
                const matches = line.matchAll(pattern);
                for (const match of matches) {
                    if (match.groups?.name) {
                        const id = this.generateId('func');
                        const startChar = match.index || 0;
                        const endChar = startChar + match[0].length;
                        
                        const element: IndexedCodeElement = {
                            id,
                            type: 'function',
                            name: match.groups.name,
                            startLine: lineIndex,
                            endLine: lineIndex,
                            startChar,
                            endChar,
                            range: new vscode.Range(lineIndex, startChar, lineIndex, endChar),
                            description: `Function named '${match.groups.name}'`,
                            aliases: [match.groups.name, `${match.groups.name} function`, 'function', 'method'],
                            context: this.getLineContext(lines, lineIndex)
                        };
                        
                        elements.push(element);
                        elementMap.set(id, element);
                    }
                }
            });
        });
    }

    private indexVariables(lines: string[], language: string, elements: IndexedCodeElement[], elementMap: Map<string, IndexedCodeElement>) {
        const variablePatterns = this.getVariablePatterns(language);
        
        lines.forEach((line, lineIndex) => {
            variablePatterns.forEach(pattern => {
                const matches = line.matchAll(pattern);
                for (const match of matches) {
                    if (match.groups?.name) {
                        const id = this.generateId('var');
                        const startChar = match.index || 0;
                        const endChar = startChar + match.groups.name.length;
                        
                        const element: IndexedCodeElement = {
                            id,
                            type: 'variable',
                            name: match.groups.name,
                            startLine: lineIndex,
                            endLine: lineIndex,
                            startChar,
                            endChar,
                            range: new vscode.Range(lineIndex, startChar, lineIndex, endChar),
                            description: `Variable named '${match.groups.name}'`,
                            aliases: [match.groups.name, 'variable', 'var'],
                            context: this.getLineContext(lines, lineIndex)
                        };
                        
                        elements.push(element);
                        elementMap.set(id, element);
                    }
                }
            });
        });
    }

    private indexKeywords(lines: string[], language: string, elements: IndexedCodeElement[], elementMap: Map<string, IndexedCodeElement>) {
        const keywords = this.getLanguageKeywords(language);
        
        lines.forEach((line, lineIndex) => {
            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                const matches = line.matchAll(regex);
                
                for (const match of matches) {
                    const id = this.generateId('kw');
                    const startChar = match.index || 0;
                    const endChar = startChar + keyword.length;
                    
                    const element: IndexedCodeElement = {
                        id,
                        type: 'keyword',
                        name: keyword,
                        startLine: lineIndex,
                        endLine: lineIndex,
                        startChar,
                        endChar,
                        range: new vscode.Range(lineIndex, startChar, lineIndex, endChar),
                        description: `${keyword} keyword`,
                        aliases: [keyword, ...this.getKeywordAliases(keyword)],
                        context: this.getLineContext(lines, lineIndex)
                    };
                    
                    elements.push(element);
                    elementMap.set(id, element);
                }
            });
        });
    }

    private indexOperators(lines: string[], language: string, elements: IndexedCodeElement[], elementMap: Map<string, IndexedCodeElement>) {
        const operators = [
            { symbol: '=', aliases: ['equals', 'assign', 'assignment'] },
            { symbol: '==', aliases: ['double equals', 'equality'] },
            { symbol: '===', aliases: ['triple equals', 'strict equality'] },
            { symbol: '+', aliases: ['plus', 'add'] },
            { symbol: '-', aliases: ['minus', 'subtract'] },
            { symbol: '*', aliases: ['multiply', 'times'] },
            { symbol: '/', aliases: ['divide'] },
            { symbol: '++', aliases: ['increment'] },
            { symbol: '--', aliases: ['decrement'] },
            { symbol: '&&', aliases: ['and', 'logical and'] },
            { symbol: '||', aliases: ['or', 'logical or'] },
            { symbol: '=>', aliases: ['arrow', 'arrow function'] }
        ];

        lines.forEach((line, lineIndex) => {
            operators.forEach(op => {
                const escapedSymbol = op.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedSymbol, 'g');
                const matches = line.matchAll(regex);
                
                for (const match of matches) {
                    const id = this.generateId('op');
                    const startChar = match.index || 0;
                    const endChar = startChar + op.symbol.length;
                    
                    const element: IndexedCodeElement = {
                        id,
                        type: 'operator',
                        name: op.symbol,
                        startLine: lineIndex,
                        endLine: lineIndex,
                        startChar,
                        endChar,
                        range: new vscode.Range(lineIndex, startChar, lineIndex, endChar),
                        description: `${op.aliases[0]} operator (${op.symbol})`,
                        aliases: [op.symbol, ...op.aliases],
                        context: this.getLineContext(lines, lineIndex)
                    };
                    
                    elements.push(element);
                    elementMap.set(id, element);
                }
            });
        });
    }

    private indexLoopsAndConditions(lines: string[], language: string, elements: IndexedCodeElement[], elementMap: Map<string, IndexedCodeElement>) {
        const patterns = [
            { pattern: /\bfor\s*\(/gi, type: 'loop' as const, name: 'for loop', aliases: ['for', 'loop', 'iteration'] },
            { pattern: /\bwhile\s*\(/gi, type: 'loop' as const, name: 'while loop', aliases: ['while', 'loop'] },
            { pattern: /\bif\s*\(/gi, type: 'condition' as const, name: 'if condition', aliases: ['if', 'condition', 'conditional'] },
            { pattern: /\belse\b/gi, type: 'condition' as const, name: 'else', aliases: ['else', 'otherwise'] }
        ];

        lines.forEach((line, lineIndex) => {
            patterns.forEach(({ pattern, type, name, aliases }) => {
                const matches = line.matchAll(pattern);
                for (const match of matches) {
                    const id = this.generateId(type);
                    const startChar = match.index || 0;
                    const endChar = startChar + match[0].length;
                    
                    const element: IndexedCodeElement = {
                        id,
                        type,
                        name,
                        startLine: lineIndex,
                        endLine: lineIndex,
                        startChar,
                        endChar,
                        range: new vscode.Range(lineIndex, startChar, lineIndex, endChar),
                        description: `${name}`,
                        aliases,
                        context: this.getLineContext(lines, lineIndex)
                    };
                    
                    elements.push(element);
                    elementMap.set(id, element);
                }
            });
        });
    }

    private indexLiterals(lines: string[], language: string, elements: IndexedCodeElement[], elementMap: Map<string, IndexedCodeElement>) {
        lines.forEach((line, lineIndex) => {
            // Number literals
            const numberMatches = line.matchAll(/\b\d+(\.\d+)?\b/g);
            for (const match of numberMatches) {
                const id = this.generateId('lit');
                const startChar = match.index || 0;
                const endChar = startChar + match[0].length;
                
                const element: IndexedCodeElement = {
                    id,
                    type: 'literal',
                    name: match[0],
                    startLine: lineIndex,
                    endLine: lineIndex,
                    startChar,
                    endChar,
                    range: new vscode.Range(lineIndex, startChar, lineIndex, endChar),
                    description: `Number literal ${match[0]}`,
                    aliases: ['number', 'value', match[0]],
                    context: this.getLineContext(lines, lineIndex)
                };
                
                elements.push(element);
                elementMap.set(id, element);
            }
        });
    }

    private embedIdsInCode(code: string, elements: IndexedCodeElement[]): string {
        // This creates a version of code with ID markers for GPT to reference
        // We'll add comments with IDs next to important elements
        const lines = code.split('\n');
        
        // Group elements by line
        const elementsByLine = new Map<number, IndexedCodeElement[]>();
        elements.forEach(element => {
            if (!elementsByLine.has(element.startLine)) {
                elementsByLine.set(element.startLine, []);
            }
            elementsByLine.get(element.startLine)!.push(element);
        });

        // Add ID markers to lines with important elements
        const markedLines = lines.map((line, index) => {
            const lineElements = elementsByLine.get(index);
            if (lineElements && lineElements.length > 0) {
                const importantElements = lineElements.filter(el => 
                    ['function', 'variable', 'loop', 'condition'].includes(el.type)
                );
                if (importantElements.length > 0) {
                    const ids = importantElements.map(el => el.id).join(', ');
                    return `${line} // [${ids}]`;
                }
            }
            return line;
        });

        return markedLines.join('\n');
    }

    private getLineContext(lines: string[], lineIndex: number): string {
        const start = Math.max(0, lineIndex - 1);
        const end = Math.min(lines.length, lineIndex + 2);
        return lines.slice(start, end).join('\n');
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
                    /(?<name>\w+)\s*=>/gi,
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
            default:
                patterns.push(/(?<name>\w+)\s*=/gi);
        }
        
        return patterns;
    }

    private getLanguageKeywords(language: string): string[] {
        const commonKeywords = ['if', 'else', 'for', 'while', 'return'];
        
        switch (language) {
            case 'javascript':
            case 'typescript':
                return [...commonKeywords, 'const', 'let', 'var', 'function', 'class'];
            case 'python':
                return [...commonKeywords, 'def', 'class', 'import', 'from'];
            case 'java':
                return [...commonKeywords, 'public', 'private', 'class', 'static'];
            default:
                return commonKeywords;
        }
    }

    private getKeywordAliases(keyword: string): string[] {
        const aliases: Record<string, string[]> = {
            'if': ['condition', 'check'],
            'else': ['otherwise'],
            'for': ['loop', 'iterate'],
            'while': ['loop'],
            'return': ['give back', 'output'],
            'function': ['method'],
            'const': ['constant'],
            'let': ['variable'],
            'var': ['variable']
        };
        
        return aliases[keyword.toLowerCase()] || [];
    }
}
