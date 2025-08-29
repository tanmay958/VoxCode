import * as vscode from 'vscode';
import axios from 'axios';
import { IndexedCode, IndexedCodeElement } from '../utils/codeIndexer';

export interface CodeSection {
    startLine: number;
    endLine: number;
    code: string;
    explanation: string;
    title: string;
}

export interface StructuredExplanation {
    overallExplanation: string;
    sections: CodeSection[];
    totalLines: number;
}

export interface MappedExplanationSegment {
    text: string; // The explanation text
    elementIds: string[]; // IDs of code elements this segment refers to
    startTime?: number; // Will be filled after voice synthesis
    endTime?: number; // Will be filled after voice synthesis
    confidence: number; // 0-1 confidence of mapping
}

export interface MappedExplanation {
    fullText: string; // Complete explanation text
    segments: MappedExplanationSegment[]; // Mapped segments with element references
    unmappedText: string[]; // Text that doesn't map to specific elements
}

export class CodeExplainer {
    private apiKey: string = '';

    constructor() {
        this.updateApiKey();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('codeVoiceExplainer.openaiApiKey')) {
                this.updateApiKey();
            }
        });
    }

    private updateApiKey() {
        const config = vscode.workspace.getConfiguration('codeVoiceExplainer');
        this.apiKey = config.get<string>('openaiApiKey') || '';
    }

    async explainCode(code: string, language: string, fileName: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const config = vscode.workspace.getConfiguration('codeVoiceExplainer');
        const explanationDetail = config.get<string>('explanationDetail') || 'detailed';

        const prompt = this.buildNaturalPrompt(code, language, fileName, explanationDetail);

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert programming teacher who explains code in a natural, conversational way. Your explanations should mention specific code elements (function names, variables, operators) naturally as you would when teaching in person. Be engaging and educational, like you\'re sitting next to the student pointing at different parts of the code.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.4
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const explanation = response.data.choices[0]?.message?.content;
            if (!explanation) {
                throw new Error('No explanation received from OpenAI');
            }

            return this.cleanExplanationForSpeech(explanation);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const statusCode = error.response?.status;
                const errorMessage = error.response?.data?.error?.message || error.message;
                
                if (statusCode === 401) {
                    throw new Error('Invalid OpenAI API key. Please check your configuration.');
                } else if (statusCode === 429) {
                    throw new Error('OpenAI API rate limit exceeded. Please try again later.');
                } else {
                    throw new Error(`OpenAI API error: ${errorMessage}`);
                }
            }
            throw error;
        }
    }

    async explainCodeWithMapping(indexedCode: IndexedCode, language: string, fileName: string): Promise<MappedExplanation> {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const config = vscode.workspace.getConfiguration('codeVoiceExplainer');
        const explanationDetail = config.get<string>('explanationDetail') || 'detailed';

        const prompt = this.buildMappedPrompt(indexedCode, language, fileName, explanationDetail);

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert programming teacher who explains code naturally while precisely mapping explanations to specific code elements using their IDs. You must provide both natural explanations and accurate element mappings for synchronized highlighting.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 1500,
                    temperature: 0.3
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const explanation = response.data.choices[0]?.message?.content;
            if (!explanation) {
                throw new Error('No explanation received from OpenAI');
            }

            return this.parseMappedExplanation(explanation, indexedCode);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const statusCode = error.response?.status;
                const errorMessage = error.response?.data?.error?.message || error.message;
                
                if (statusCode === 401) {
                    throw new Error('Invalid OpenAI API key. Please check your configuration.');
                } else if (statusCode === 429) {
                    throw new Error('OpenAI API rate limit exceeded. Please try again later.');
                } else {
                    throw new Error(`OpenAI API error: ${errorMessage}`);
                }
            }
            throw error;
        }
    }

    async explainCodeStructured(code: string, language: string, fileName: string): Promise<StructuredExplanation> {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const config = vscode.workspace.getConfiguration('codeVoiceExplainer');
        const explanationDetail = config.get<string>('explanationDetail') || 'detailed';

        const prompt = this.buildStructuredPrompt(code, language, fileName, explanationDetail);

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert software engineer who explains code in a structured way for synchronized voice playback with code highlighting. Break down code into logical sections and provide JSON responses.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 1500,
                    temperature: 0.3
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const explanation = response.data.choices[0]?.message?.content;
            if (!explanation) {
                throw new Error('No explanation received from OpenAI');
            }

            return this.parseStructuredExplanation(explanation, code);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const statusCode = error.response?.status;
                const errorMessage = error.response?.data?.error?.message || error.message;
                
                if (statusCode === 401) {
                    throw new Error('Invalid OpenAI API key. Please check your configuration.');
                } else if (statusCode === 429) {
                    throw new Error('OpenAI API rate limit exceeded. Please try again later.');
                } else {
                    throw new Error(`OpenAI API error: ${errorMessage}`);
                }
            }
            throw error;
        }
    }

    private buildStructuredPrompt(code: string, language: string, fileName: string, detail: string): string {
        const detailInstructions = {
            brief: 'Provide brief explanations for each section.',
            detailed: 'Provide detailed explanations covering functionality, key components, and logic flow.',
            comprehensive: 'Provide comprehensive explanations including functionality, design patterns, potential improvements, and edge cases.'
        };

        const instruction = detailInstructions[detail as keyof typeof detailInstructions] || detailInstructions.detailed;
        const lines = code.split('\n');
        const numberedCode = lines.map((line, index) => `${index + 1}: ${line}`).join('\n');

        return `Please analyze this ${language} code from file "${fileName}" and break it into logical sections for synchronized explanation with code highlighting.

${instruction}

Requirements:
1. Return ONLY valid JSON (no markdown code blocks)
2. Break code into 3-8 logical sections based on functionality
3. Each section should cover 1-10 lines of related code
4. Provide clear, conversational explanations suitable for voice synthesis
5. Use natural language, spell out symbols (e.g., "equals" not "=")

Code with line numbers:
${numberedCode}

Return JSON in this exact format:
{
  "overallExplanation": "Brief overview of what this code does overall",
  "sections": [
    {
      "startLine": 1,
      "endLine": 3,
      "title": "Function Declaration",
      "explanation": "This section declares a function called calculateTotal that takes an items parameter"
    },
    {
      "startLine": 4,
      "endLine": 8,
      "title": "Main Logic",
      "explanation": "Here we initialize a total variable and loop through each item to calculate the sum"
    }
  ]
}`;
    }

    private buildNaturalPrompt(code: string, language: string, fileName: string, detail: string): string {
        const detailInstructions = {
            brief: 'Provide a brief, natural explanation in 2-3 sentences, mentioning key code elements.',
            detailed: 'Provide a conversational explanation like you\'re teaching a student, naturally mentioning function names, variables, and key operations.',
            comprehensive: 'Provide a thorough, engaging explanation like an experienced teacher, naturally referencing all important code elements and their purposes.'
        };

        const instruction = detailInstructions[detail as keyof typeof detailInstructions] || detailInstructions.detailed;

        return `Please explain this ${language} code from file "${fileName}" in a natural, conversational way. ${instruction}

IMPORTANT GUIDELINES:
- Speak naturally like you're teaching in person
- Mention specific code elements by name (function names, variable names, operators)
- Use natural teacher language like "Here we have", "Notice how", "This function", "The variable called"
- Reference code elements as you would when pointing at them
- Be engaging and educational, not robotic
- Avoid overly technical jargon, explain in simple terms
- Use conversational transitions and natural flow

Example style: "Let's look at this calculateTotal function. Notice how it takes an items parameter, and then inside the function, we initialize a variable called total to zero. The for loop here goes through each item..."

Code to explain:
\`\`\`${language}
${code}
\`\`\``;
    }

    private buildPrompt(code: string, language: string, fileName: string, detail: string): string {
        const detailInstructions = {
            brief: 'Provide a brief, high-level explanation in 2-3 sentences.',
            detailed: 'Provide a detailed explanation covering the main functionality, key components, and logic flow.',
            comprehensive: 'Provide a comprehensive explanation including functionality, design patterns, potential improvements, and edge cases.'
        };

        const instruction = detailInstructions[detail as keyof typeof detailInstructions] || detailInstructions.detailed;

        return `Please explain this ${language} code from file "${fileName}". ${instruction}

The explanation will be converted to speech, so:
- Use natural, conversational language
- Avoid special characters and complex formatting
- Spell out symbols (e.g., "equals" instead of "=", "arrow function" instead of "=>")
- Break down complex concepts into simple terms
- Use short sentences that flow well when spoken

Code to explain:
\`\`\`${language}
${code}
\`\`\``;
    }

    private parseStructuredExplanation(explanation: string, code: string): StructuredExplanation {
        try {
            // Remove any markdown code blocks if present
            let cleanedExplanation = explanation.replace(/```json\s*|\s*```/g, '').trim();
            
            // Try to find JSON in the response
            const jsonMatch = cleanedExplanation.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleanedExplanation = jsonMatch[0];
            }

            const parsed = JSON.parse(cleanedExplanation);
            const lines = code.split('\n');

            // Validate and process sections
            const sections: CodeSection[] = (parsed.sections || []).map((section: any) => {
                const startLine = Math.max(1, parseInt(section.startLine) || 1);
                const endLine = Math.min(lines.length, parseInt(section.endLine) || startLine);
                
                const sectionCode = lines.slice(startLine - 1, endLine).join('\n');
                
                return {
                    startLine,
                    endLine,
                    code: sectionCode,
                    explanation: this.cleanExplanationForSpeech(section.explanation || ''),
                    title: section.title || `Section ${startLine}-${endLine}`
                };
            });

            const overallExplanation = this.cleanExplanationForSpeech(parsed.overallExplanation || 'This code performs various operations.');

            return {
                overallExplanation,
                sections,
                totalLines: lines.length
            };
        } catch (error) {
            console.warn('Failed to parse structured explanation, falling back to simple format:', error);
            
            // Fallback: create a single section with the entire code
            const lines = code.split('\n');
            const cleanedExplanation = this.cleanExplanationForSpeech(explanation);
            
            return {
                overallExplanation: cleanedExplanation,
                sections: [{
                    startLine: 1,
                    endLine: lines.length,
                    code: code,
                    explanation: cleanedExplanation,
                    title: 'Complete Code Explanation'
                }],
                totalLines: lines.length
            };
        }
    }

    private buildMappedPrompt(indexedCode: IndexedCode, language: string, fileName: string, detail: string): string {
        const detailInstructions = {
            brief: 'Provide a brief, natural explanation while mapping key elements.',
            detailed: 'Provide a detailed, conversational explanation with precise element mapping.',
            comprehensive: 'Provide a comprehensive explanation with thorough element mapping.'
        };

        const instruction = detailInstructions[detail as keyof typeof detailInstructions] || detailInstructions.detailed;

        // Create element reference guide
        const elementGuide = indexedCode.elements
            .filter(el => ['function', 'variable', 'loop', 'condition', 'operator'].includes(el.type))
            .map(el => `${el.id}: ${el.description}`)
            .join('\n');

        return `Please explain this ${language} code from file "${fileName}" in a natural, conversational way. ${instruction}

CRITICAL: You must provide your response as JSON with this exact structure:
{
  "explanation": "Your natural, conversational explanation text",
  "segments": [
    {
      "text": "portion of explanation text",
      "elementIds": ["func_1", "var_2"],
      "confidence": 0.9
    }
  ]
}

ELEMENT REFERENCE GUIDE:
${elementGuide}

INSTRUCTIONS:
1. Write a natural, teacher-like explanation in the "explanation" field
2. Break your explanation into segments that reference specific code elements
3. Each segment should be 1-3 sentences that naturally mention code elements
4. Map segments to element IDs when you mention them
5. Use confidence 0.8-1.0 for direct mentions, 0.5-0.7 for indirect references
6. Segments should flow naturally - don't force unnatural breaks

EXAMPLE SEGMENT MAPPING:
- "Let's look at this calculateTotal function" → ["func_1"] (if func_1 is calculateTotal)
- "It takes an items parameter and initializes total to zero" → ["var_1", "var_2"] 
- "The for loop iterates through each item" → ["loop_1"]

Code with element markers:
${indexedCode.codeWithIds}`;
    }

    private parseMappedExplanation(explanation: string, indexedCode: IndexedCode): MappedExplanation {
        try {
            // Remove any markdown code blocks if present
            let cleanedExplanation = explanation.replace(/```json\s*|\s*```/g, '').trim();
            
            // Try to find JSON in the response
            const jsonMatch = cleanedExplanation.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleanedExplanation = jsonMatch[0];
            }

            const parsed = JSON.parse(cleanedExplanation);
            
            const fullText = this.cleanExplanationForSpeech(parsed.explanation || '');
            const segments: MappedExplanationSegment[] = [];
            const unmappedText: string[] = [];

            if (parsed.segments && Array.isArray(parsed.segments)) {
                parsed.segments.forEach((segment: any) => {
                    const segmentText = this.cleanExplanationForSpeech(segment.text || '');
                    const elementIds = Array.isArray(segment.elementIds) ? segment.elementIds : [];
                    const confidence = typeof segment.confidence === 'number' ? segment.confidence : 0.5;

                    // Validate that element IDs exist in our indexed code
                    const validElementIds = elementIds.filter((id: string) => indexedCode.elementMap.has(id));

                    if (validElementIds.length > 0) {
                        segments.push({
                            text: segmentText,
                            elementIds: validElementIds,
                            confidence: Math.min(confidence, 1.0)
                        });
                    } else {
                        // Segment doesn't map to valid elements
                        unmappedText.push(segmentText);
                    }
                });
            }

            return {
                fullText,
                segments,
                unmappedText
            };
        } catch (error) {
            console.warn('Failed to parse mapped explanation, creating fallback:', error);
            
            // Fallback: create a simple mapped explanation
            const cleanedText = this.cleanExplanationForSpeech(explanation);
            
            return {
                fullText: cleanedText,
                segments: [{
                    text: cleanedText,
                    elementIds: indexedCode.elements
                        .filter(el => ['function', 'variable'].includes(el.type))
                        .slice(0, 3) // Take first few important elements
                        .map(el => el.id),
                    confidence: 0.3 // Low confidence for fallback
                }],
                unmappedText: []
            };
        }
    }

    private cleanExplanationForSpeech(explanation: string): string {
        return explanation
            // Remove markdown formatting
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/#{1,6}\s/g, '')
            
            // Replace common programming symbols with words
            .replace(/\b=>\b/g, ' arrow function ')
            .replace(/\b=\b/g, ' equals ')
            .replace(/\b==\b/g, ' double equals ')
            .replace(/\b===\b/g, ' triple equals ')
            .replace(/\b!=\b/g, ' not equals ')
            .replace(/\b!==\b/g, ' not triple equals ')
            .replace(/\b&&\b/g, ' and ')
            .replace(/\b\|\|\b/g, ' or ')
            .replace(/\b!\b/g, ' not ')
            .replace(/\b\+\+\b/g, ' increment ')
            .replace(/\b--\b/g, ' decrement ')
            .replace(/\b\+=\b/g, ' plus equals ')
            .replace(/\b-=\b/g, ' minus equals ')
            .replace(/\b\*=\b/g, ' times equals ')
            .replace(/\b\/=\b/g, ' divided by equals ')
            
            // Clean up extra whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }
}
