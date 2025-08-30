import * as vscode from 'vscode';
import axios from 'axios';
import { IndexedCode, IndexedCodeElement } from '../utils/codeIndexer';

interface VoiceLanguageMap {
    [voiceId: string]: {
        language: string;
        languageName: string;
        country: string;
    };
}

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

// Voice ID to language mapping based on Murf.ai Voice Library
const VOICE_LANGUAGE_MAP: VoiceLanguageMap = {
    // English (US)
    'en-US-natalie': { language: 'English', languageName: 'English (US)', country: 'United States' },
    'en-US-terrell': { language: 'English', languageName: 'English (US)', country: 'United States' },
    'en-US-miles': { language: 'English', languageName: 'English (US)', country: 'United States' },
    'en-US-ken': { language: 'English', languageName: 'English (US)', country: 'United States' },
    'en-US-samantha': { language: 'English', languageName: 'English (US)', country: 'United States' },
    'en-US-paul': { language: 'English', languageName: 'English (US)', country: 'United States' },
    'en-US-claire': { language: 'English', languageName: 'English (US)', country: 'United States' },
    'en-US-ryan': { language: 'English', languageName: 'English (US)', country: 'United States' },
    
    // English (UK)
    'en-UK-ruby': { language: 'English', languageName: 'English (UK)', country: 'United Kingdom' },
    'en-UK-theo': { language: 'English', languageName: 'English (UK)', country: 'United Kingdom' },
    'en-UK-hazel': { language: 'English', languageName: 'English (UK)', country: 'United Kingdom' },
    'en-UK-archie': { language: 'English', languageName: 'English (UK)', country: 'United Kingdom' },
    
    // Spanish
    'es-ES-diego': { language: 'Spanish', languageName: 'Español (España)', country: 'Spain' },
    'es-ES-valentina': { language: 'Spanish', languageName: 'Español (España)', country: 'Spain' },
    'es-MX-fernando': { language: 'Spanish', languageName: 'Español (México)', country: 'Mexico' },
    'es-MX-rosa': { language: 'Spanish', languageName: 'Español (México)', country: 'Mexico' },
    
    // French
    'fr-FR-amelie': { language: 'French', languageName: 'Français (France)', country: 'France' },
    'fr-FR-antoine': { language: 'French', languageName: 'Français (France)', country: 'France' },
    'fr-FR-henri': { language: 'French', languageName: 'Français (France)', country: 'France' },
    'fr-FR-louise': { language: 'French', languageName: 'Français (France)', country: 'France' },
    
    // German
    'de-DE-klaus': { language: 'German', languageName: 'Deutsch (Deutschland)', country: 'Germany' },
    'de-DE-petra': { language: 'German', languageName: 'Deutsch (Deutschland)', country: 'Germany' },
    'de-DE-werner': { language: 'German', languageName: 'Deutsch (Deutschland)', country: 'Germany' },
    'de-DE-julia': { language: 'German', languageName: 'Deutsch (Deutschland)', country: 'Germany' },
    
    // Italian
    'it-IT-alessandro': { language: 'Italian', languageName: 'Italiano (Italia)', country: 'Italy' },
    'it-IT-chiara': { language: 'Italian', languageName: 'Italiano (Italia)', country: 'Italy' },
    'it-IT-giuseppe': { language: 'Italian', languageName: 'Italiano (Italia)', country: 'Italy' },
    'it-IT-francesca': { language: 'Italian', languageName: 'Italiano (Italia)', country: 'Italy' },
    
    // Portuguese
    'pt-BR-antonio': { language: 'Portuguese', languageName: 'Português (Brasil)', country: 'Brazil' },
    'pt-BR-bruna': { language: 'Portuguese', languageName: 'Português (Brasil)', country: 'Brazil' },
    'pt-PT-diogo': { language: 'Portuguese', languageName: 'Português (Portugal)', country: 'Portugal' },
    'pt-PT-ines': { language: 'Portuguese', languageName: 'Português (Portugal)', country: 'Portugal' },
    
    // Dutch
    'nl-NL-daan': { language: 'Dutch', languageName: 'Nederlands (Nederland)', country: 'Netherlands' },
    'nl-NL-sanne': { language: 'Dutch', languageName: 'Nederlands (Nederland)', country: 'Netherlands' },
    
    // Russian
    'ru-RU-dmitri': { language: 'Russian', languageName: 'Русский (Россия)', country: 'Russia' },
    'ru-RU-svetlana': { language: 'Russian', languageName: 'Русский (Россия)', country: 'Russia' },
    
    // Chinese
    'zh-CN-wang': { language: 'Chinese', languageName: '中文 (中国)', country: 'China' },
    'zh-CN-xiaoxiao': { language: 'Chinese', languageName: '中文 (中国)', country: 'China' },
    
    // Japanese
    'ja-JP-akira': { language: 'Japanese', languageName: '日本語 (日本)', country: 'Japan' },
    'ja-JP-emi': { language: 'Japanese', languageName: '日本語 (日本)', country: 'Japan' },
    
    // Korean
    'ko-KR-minho': { language: 'Korean', languageName: '한국어 (한국)', country: 'South Korea' },
    'ko-KR-sora': { language: 'Korean', languageName: '한국어 (한국)', country: 'South Korea' },
    
    // Hindi
    'hi-IN-kalpana': { language: 'Hindi', languageName: 'हिन्दी (भारत)', country: 'India' },
    'hi-IN-ravi': { language: 'Hindi', languageName: 'हिन्दी (भारत)', country: 'India' },
    
    // Arabic
    'ar-SA-omar': { language: 'Arabic', languageName: 'العربية (السعودية)', country: 'Saudi Arabia' },
    'ar-SA-layla': { language: 'Arabic', languageName: 'العربية (السعودية)', country: 'Saudi Arabia' }
};

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
        
        // Get selected voice and determine target language
        const selectedVoiceId = config.get<string>('murfVoiceId') || 'en-US-natalie';
        const voiceLanguageInfo = VOICE_LANGUAGE_MAP[selectedVoiceId];
        const targetLanguage = voiceLanguageInfo ? voiceLanguageInfo.language : 'English';
        const languageName = voiceLanguageInfo ? voiceLanguageInfo.languageName : 'English (US)';
        
        console.log(`🌍 Generating explanation in ${targetLanguage} (${languageName}) for voice: ${selectedVoiceId}`);

        const prompt = this.buildNaturalPrompt(code, language, fileName, explanationDetail, targetLanguage);

        // Build system prompt with language instruction
        const systemPrompt = this.buildSystemPrompt(targetLanguage, languageName);

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
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

    private buildSystemPrompt(targetLanguage: string, languageName: string): string {
        if (targetLanguage === 'English') {
            return 'You are an expert programming teacher who explains code in a natural, conversational way. Your explanations should mention specific code elements (function names, variables, operators) naturally as you would when teaching in person. Be engaging and educational, like you\'re sitting next to the student pointing at different parts of the code.';
        }
        
        const languageInstructions = {
            'Spanish': 'Eres un profesor experto en programación que explica código de manera natural y conversacional. Debes mencionar elementos específicos del código (nombres de funciones, variables, operadores) de forma natural como lo harías al enseñar en persona. Sé atractivo y educativo, como si estuvieras sentado al lado del estudiante señalando diferentes partes del código.',
            'French': 'Vous êtes un professeur expert en programmation qui explique le code de manière naturelle et conversationnelle. Vos explications doivent mentionner des éléments de code spécifiques (noms de fonctions, variables, opérateurs) naturellement comme vous le feriez en enseignant en personne. Soyez engageant et éducatif, comme si vous étiez assis à côté de l\'étudiant en pointant différentes parties du code.',
            'German': 'Sie sind ein erfahrener Programmierlehrer, der Code auf natürliche, gesprächige Weise erklärt. Ihre Erklärungen sollten spezifische Code-Elemente (Funktionsnamen, Variablen, Operatoren) natürlich erwähnen, wie Sie es beim persönlichen Unterrichten tun würden. Seien Sie fesselnd und lehrreich, als würden Sie neben dem Schüler sitzen und auf verschiedene Code-Teile zeigen.',
            'Italian': 'Sei un insegnante esperto di programmazione che spiega il codice in modo naturale e colloquiale. Le tue spiegazioni dovrebbero menzionare elementi specifici del codice (nomi di funzioni, variabili, operatori) naturalmente come faresti insegnando di persona. Sii coinvolgente ed educativo, come se fossi seduto accanto allo studente indicando diverse parti del codice.',
            'Portuguese': 'Você é um professor especialista em programação que explica código de forma natural e conversacional. Suas explicações devem mencionar elementos específicos do código (nomes de funções, variáveis, operadores) naturalmente como você faria ao ensinar pessoalmente. Seja envolvente e educativo, como se estivesse sentado ao lado do aluno apontando para diferentes partes do código.',
            'Dutch': 'Je bent een expert programmeerleraar die code op een natuurlijke, conversationele manier uitlegt. Je uitleg moet specifieke code-elementen (functienamen, variabelen, operatoren) natuurlijk noemen zoals je zou doen bij persoonlijk onderwijs. Wees boeiend en educatief, alsof je naast de student zit en naar verschillende delen van de code wijst.',
            'Russian': 'Вы опытный преподаватель программирования, который объясняет код естественно и разговорно. Ваши объяснения должны естественно упоминать конкретные элементы кода (названия функций, переменные, операторы), как вы бы делали при личном обучении. Будьте увлекательными и образовательными, как будто сидите рядом со студентом и указываете на разные части кода.',
            'Chinese': '您是编程专家老师，以自然、对话的方式解释代码。您的解释应该自然地提及特定的代码元素（函数名、变量、操作符），就像您在亲自教学时一样。要引人入胜且具有教育性，就像您坐在学生旁边指向代码的不同部分一样。',
            'Japanese': 'あなたはプログラミングの専門教師で、自然で会話的な方法でコードを説明します。あなたの説明は、対面で教えるときのように、特定のコード要素（関数名、変数、演算子）を自然に言及する必要があります。学生の隣に座ってコードのさまざまな部分を指しているかのように、魅力的で教育的であってください。',
            'Korean': '당신은 자연스럽고 대화적인 방식으로 코드를 설명하는 프로그래밍 전문 교사입니다. 당신의 설명은 직접 가르칠 때처럼 특정 코드 요소(함수명, 변수, 연산자)를 자연스럽게 언급해야 합니다. 학생 옆에 앉아 코드의 다른 부분을 가리키는 것처럼 매력적이고 교육적이어야 합니다.',
            'Hindi': 'आप एक विशेषज्ञ प्रोग्रामिंग शिक्षक हैं जो कोड को प्राकृतिक, बातचीत के तरीके से समझाते हैं। आपकी व्याख्याओं में विशिष्ट कोड तत्वों (फ़ंक्शन नाम, चर, ऑपरेटर) का प्राकृतिक रूप से उल्लेख होना चाहिए जैसा कि आप व्यक्तिगत रूप से पढ़ाते समय करते हैं। आकर्षक और शैक्षिक बनें, जैसे कि आप छात्र के बगल में बैठकर कोड के विभिन्न हिस्सों की ओर इशारा कर रहे हों।',
            'Arabic': 'أنت مدرس برمجة خبير يشرح الكود بطريقة طبيعية ومحادثة. يجب أن تذكر تفسيراتك عناصر الكود المحددة (أسماء الوظائف، المتغيرات، المشغلات) بشكل طبيعي كما تفعل عند التدريس شخصياً. كن جذاباً وتعليمياً، كما لو كنت جالساً بجانب الطالب تشير إلى أجزاء مختلفة من الكود.'
        };
        
        const instruction = languageInstructions[targetLanguage as keyof typeof languageInstructions];
        
        if (instruction) {
            return instruction;
        }
        
        // Fallback with language specification
        return `You are an expert programming teacher who explains code in a natural, conversational way. IMPORTANT: You must respond entirely in ${targetLanguage} (${languageName}). Your explanations should mention specific code elements (function names, variables, operators) naturally as you would when teaching in person. Be engaging and educational, like you're sitting next to the student pointing at different parts of the code.`;
    }

    private buildNaturalPrompt(code: string, language: string, fileName: string, detail: string, targetLanguage: string = 'English'): string {
        const detailInstructions = {
            English: {
                brief: 'Provide a brief, natural explanation in 2-3 sentences, mentioning key code elements.',
                detailed: 'Provide a conversational explanation like you\'re teaching a student, naturally mentioning function names, variables, and key operations.',
                comprehensive: 'Provide a thorough, engaging explanation like an experienced teacher, naturally referencing all important code elements and their purposes.'
            },
            Spanish: {
                brief: 'Proporciona una explicación breve y natural en 2-3 oraciones, mencionando elementos clave del código.',
                detailed: 'Proporciona una explicación conversacional como si estuvieras enseñando a un estudiante, mencionando naturalmente nombres de funciones, variables y operaciones clave.',
                comprehensive: 'Proporciona una explicación completa y atractiva como un profesor experimentado, referenciando naturalmente todos los elementos importantes del código y sus propósitos.'
            },
            French: {
                brief: 'Fournissez une explication brève et naturelle en 2-3 phrases, mentionnant les éléments clés du code.',
                detailed: 'Fournissez une explication conversationnelle comme si vous enseigniez à un étudiant, mentionnant naturellement les noms de fonctions, variables et opérations clés.',
                comprehensive: 'Fournissez une explication complète et engageante comme un professeur expérimenté, référençant naturellement tous les éléments importants du code et leurs objectifs.'
            },
            German: {
                brief: 'Geben Sie eine kurze, natürliche Erklärung in 2-3 Sätzen mit wichtigen Code-Elementen.',
                detailed: 'Geben Sie eine gesprächige Erklärung wie beim Unterrichten eines Schülers, erwähnen Sie natürlich Funktionsnamen, Variablen und wichtige Operationen.',
                comprehensive: 'Geben Sie eine gründliche, fesselnde Erklärung wie ein erfahrener Lehrer, referenzieren Sie natürlich alle wichtigen Code-Elemente und ihre Zwecke.'
            }
        };

        const languageInstructions = detailInstructions[targetLanguage as keyof typeof detailInstructions] || detailInstructions.English;
        const instruction = languageInstructions[detail as keyof typeof languageInstructions] || languageInstructions.detailed;

        if (targetLanguage === 'English') {
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
        } else {
            return `Por favor explica este código ${language} del archivo "${fileName}" de manera natural y conversacional. ${instruction}

Código a explicar:
\`\`\`${language}
${code}
\`\`\`

IMPORTANTE: Responde completamente en ${targetLanguage}. Menciona elementos específicos del código (nombres de funciones, variables, operadores) de forma natural como lo harías al enseñar en persona.`;
        }
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
