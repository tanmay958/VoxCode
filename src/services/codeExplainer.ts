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
            return `You are an expert programming teacher who explains code in a natural, conversational way for voice synthesis. 

CRITICAL VOICE GUIDELINES:
- Instead of saying "console dot log", say "here we're outputting to the console" or "this prints to the console"
- Instead of saying "equals equals", say "is equal to" or "checks if they're equal"
- Instead of saying "plus plus", say "increment" or "add one to"
- Instead of saying "dot", say "accesses" or "calls" or "gets the property"
- Instead of saying "open parenthesis", just flow naturally: "we call the function with these parameters"

NATURAL EXPLANATIONS:
- Explain WHAT the code does, not just read it
- Use phrases like "here we're...", "this line...", "the code...", "we're using..."
- Make it sound like a friendly teacher explaining in person
- Focus on the PURPOSE and BEHAVIOR, not syntax

Be engaging and educational, like you're sitting next to the student showing them how the code works.`;
        }
        
        const languageInstructions = {
            'Spanish': `Eres un profesor experto en programación que explica código de manera natural y conversacional para síntesis de voz.

GUÍAS CRÍTICAS PARA VOZ:
- En lugar de decir "console punto log", di "aquí estamos imprimiendo en la consola" o "esto muestra en la consola"
- En lugar de decir "igual igual", di "es igual a" o "verifica si son iguales"
- En lugar de decir "más más", di "incrementar" o "sumar uno a"
- En lugar de decir "punto", di "accede a" o "llama a" o "obtiene la propiedad"
- Explica QUÉ hace el código, no solo lo leas
- Usa frases como "aquí estamos...", "esta línea...", "el código..."
- Enfócate en el PROPÓSITO y COMPORTAMIENTO, no en la sintaxis`,
            
            'French': `Vous êtes un professeur expert en programmation qui explique le code de manière naturelle et conversationnelle pour la synthèse vocale.

DIRECTIVES CRITIQUES POUR LA VOIX:
- Au lieu de dire "console point log", dites "ici nous affichons dans la console" ou "cela imprime dans la console"
- Au lieu de dire "égale égale", dites "est égal à" ou "vérifie s'ils sont égaux"
- Au lieu de dire "plus plus", dites "incrémenter" ou "ajouter un à"
- Au lieu de dire "point", dites "accède à" ou "appelle" ou "obtient la propriété"
- Expliquez CE QUE fait le code, ne le lisez pas seulement
- Utilisez des phrases comme "ici nous...", "cette ligne...", "le code..."
- Concentrez-vous sur le BUT et le COMPORTEMENT, pas sur la syntaxe`,
            
            'German': `Sie sind ein erfahrener Programmierlehrer, der Code auf natürliche, gesprächige Weise für Sprachsynthese erklärt.

KRITISCHE SPRACH-RICHTLINIEN:
- Statt "console punkt log" sagen Sie "hier geben wir in der Konsole aus" oder "das druckt in die Konsole"
- Statt "gleich gleich" sagen Sie "ist gleich" oder "überprüft ob sie gleich sind"
- Statt "plus plus" sagen Sie "erhöhen" oder "eins hinzufügen zu"
- Statt "punkt" sagen Sie "greift zu" oder "ruft auf" oder "holt die Eigenschaft"
- Erklären Sie WAS der Code tut, lesen Sie ihn nicht nur vor
- Verwenden Sie Phrasen wie "hier machen wir...", "diese Zeile...", "der Code..."
- Fokussieren Sie auf ZWECK und VERHALTEN, nicht auf Syntax`,
            
            'Italian': `Sei un insegnante esperto di programmazione che spiega il codice in modo naturale e colloquiale per la sintesi vocale.

LINEE GUIDA CRITICHE PER LA VOCE:
- Invece di dire "console punto log", di "qui stiamo stampando nella console" o "questo stampa nella console"
- Invece di dire "uguale uguale", di "è uguale a" o "controlla se sono uguali"
- Invece di dire "più più", di "incrementare" o "aggiungere uno a"
- Invece di dire "punto", di "accede a" o "chiama" o "ottiene la proprietà"
- Spiega COSA fa il codice, non limitarti a leggerlo
- Usa frasi come "qui stiamo...", "questa riga...", "il codice..."
- Concentrati sul SCOPO e COMPORTAMENTO, non sulla sintassi`,
            
            'Portuguese': `Você é um professor especialista em programação que explica código de forma natural e conversacional para síntese de voz.

DIRETRIZES CRÍTICAS PARA VOZ:
- Em vez de dizer "console ponto log", diga "aqui estamos imprimindo no console" ou "isso imprime no console"
- Em vez de dizer "igual igual", diga "é igual a" ou "verifica se são iguais"
- Em vez de dizer "mais mais", diga "incrementar" ou "adicionar um a"
- Em vez de dizer "ponto", diga "acessa" ou "chama" ou "obtém a propriedade"
- Explique O QUE o código faz, não apenas o leia
- Use frases como "aqui estamos...", "esta linha...", "o código..."
- Foque no PROPÓSITO e COMPORTAMENTO, não na sintaxe`,
            'Dutch': `Je bent een expert programmeerleraar die code op een natuurlijke, conversationele manier uitlegt voor spraaksynthese. In plaats van letterlijk code te lezen, leg je uit WAT de code doet. Gebruik natuurlijke zinnen zoals "hier printen we naar de console" in plaats van "console punt log".`,
            
            'Russian': `Вы опытный преподаватель программирования, который объясняет код естественно и разговорно для синтеза речи. Вместо буквального чтения кода объясняйте ЧТО делает код. Используйте естественные фразы вроде "здесь мы выводим в консоль" вместо "консоль точка лог".`,
            
            'Chinese': `您是编程专家老师，以自然、对话的方式为语音合成解释代码。不要直接读代码，而要解释代码做什么。使用自然的短语，如"这里我们输出到控制台"而不是"控制台点日志"。`,
            
            'Japanese': `あなたはプログラミングの専門教師で、音声合成のために自然で会話的な方法でコードを説明します。コードを文字通り読むのではなく、コードが何をするかを説明してください。「コンソール・ドット・ログ」ではなく「ここでコンソールに出力しています」のような自然な表現を使ってください。`,
            
            'Korean': `당신은 음성 합성을 위해 자연스럽고 대화적인 방식으로 코드를 설명하는 프로그래밍 전문 교사입니다. 코드를 문자 그대로 읽지 말고 코드가 무엇을 하는지 설명하세요. "콘솔 점 로그" 대신 "여기서 콘솔에 출력합니다"와 같은 자연스러운 표현을 사용하세요.`,
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
            return `Please explain this ${language} code from file "${fileName}" in a natural, conversational way for voice synthesis. ${instruction}

CRITICAL VOICE-FRIENDLY GUIDELINES:
- Instead of saying "console dot log", say "here we're printing to the console" or "this outputs to the console"
- Instead of saying "equals equals", say "is equal to" or "checks if they're equal"
- Instead of saying "plus plus", say "increment" or "add one to"  
- Instead of saying "dot", say "accesses", "calls", or "gets the property of"
- Instead of saying "open parenthesis", just flow naturally: "we call the function with these parameters"

NATURAL EXPLANATION STYLE:
- Explain WHAT the code does, not just read it
- Use natural teacher phrases like "Here we're...", "This line...", "The code...", "Notice how..."
- Focus on PURPOSE and BEHAVIOR, not syntax
- Be engaging and educational like you're teaching in person
- Use conversational transitions and natural flow

GOOD EXAMPLE: "Let's look at this calculateTotal function. Here we're taking an items parameter, and then we initialize a variable called total to zero. The for loop iterates through each item in the array, and for every item, we add its price multiplied by quantity to our total. Finally, we return that total value. At the end, we're printing the result to the console so we can see the final calculation."

BAD EXAMPLE: "calculateTotal function open parenthesis items close parenthesis open brace let total equals zero semicolon for open parenthesis let i equals zero semicolon..."

Code to explain:
\`\`\`${language}
${code}
\`\`\``;
        } else {
            // Enhanced non-English prompts with voice-friendly guidelines
            const voiceFriendlyPrompts: { [key: string]: string } = {
                'Spanish': `Por favor explica este código ${language} del archivo "${fileName}" de manera natural y conversacional para síntesis de voz. ${instruction}

GUÍAS CRÍTICAS PARA VOZ:
- En lugar de decir "console punto log", di "aquí estamos imprimiendo en la consola"
- En lugar de decir "igual igual", di "es igual a" o "comprueba si son iguales"  
- En lugar de decir "más más", di "incrementamos" o "sumamos uno a"
- Explica QUÉ hace el código, no solo lo leas
- Usa frases naturales como "aquí estamos...", "esta línea...", "observa cómo..."

Código a explicar:
\`\`\`${language}
${code}
\`\`\``,

                'French': `Veuillez expliquer ce code ${language} du fichier "${fileName}" de manière naturelle et conversationnelle pour la synthèse vocale. ${instruction}

DIRECTIVES CRITIQUES POUR LA VOIX:
- Au lieu de dire "console point log", dites "ici nous affichons dans la console"
- Au lieu de dire "égale égale", dites "est égal à" ou "vérifie s'ils sont égaux"
- Au lieu de dire "plus plus", dites "nous incrémentons" ou "ajoutons un à"
- Expliquez CE QUE fait le code, ne le lisez pas seulement
- Utilisez des phrases naturelles comme "ici nous...", "cette ligne...", "remarquez comment..."

Code à expliquer:
\`\`\`${language}
${code}
\`\`\``,

                'German': `Bitte erklären Sie diesen ${language} Code aus der Datei "${fileName}" auf natürliche, gesprächige Weise für Sprachsynthese. ${instruction}

KRITISCHE SPRACH-RICHTLINIEN:
- Statt "console punkt log" sagen Sie "hier geben wir in der Konsole aus"
- Statt "gleich gleich" sagen Sie "ist gleich" oder "überprüft ob sie gleich sind"
- Statt "plus plus" sagen Sie "wir erhöhen" oder "fügen eins hinzu zu"
- Erklären Sie WAS der Code tut, lesen Sie ihn nicht nur vor
- Verwenden Sie natürliche Phrasen wie "hier machen wir...", "diese Zeile...", "beachten Sie wie..."

Zu erklärender Code:
\`\`\`${language}
${code}
\`\`\``,

                'Italian': `Per favore spiega questo codice ${language} dal file "${fileName}" in modo naturale e colloquiale per la sintesi vocale. ${instruction}

LINEE GUIDA CRITICHE PER LA VOCE:
- Invece di dire "console punto log", di "qui stiamo stampando nella console"
- Invece di dire "uguale uguale", di "è uguale a" o "controlla se sono uguali"
- Invece di dire "più più", di "incrementiamo" o "aggiungiamo uno a"
- Spiega COSA fa il codice, non limitarti a leggerlo
- Usa frasi naturali come "qui stiamo...", "questa riga...", "nota come..."

Codice da spiegare:
\`\`\`${language}
${code}
\`\`\``
            };

            return voiceFriendlyPrompts[targetLanguage] || `Please explain this ${language} code from file "${fileName}" in a natural, conversational way. ${instruction}

IMPORTANTE: Responde completamente en ${targetLanguage}. Menciona elementos específicos del código (nombres de funciones, variables, operadores) de forma natural como lo harías al enseñar en persona.

Code to explain:
\`\`\`${language}
${code}
\`\`\``;
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

    // === NEW Q&A AND CODE GENERATION METHODS ===
    
    async answerCodeQuestion(code: string, language: string, fileName: string, question: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const config = vscode.workspace.getConfiguration('codeVoiceExplainer');
        const selectedVoiceId = config.get<string>('murfVoiceId') || 'en-US-natalie';
        const voiceLanguageInfo = VOICE_LANGUAGE_MAP[selectedVoiceId];
        const targetLanguage = voiceLanguageInfo ? voiceLanguageInfo.language : 'English';
        const languageName = voiceLanguageInfo ? voiceLanguageInfo.languageName : 'English (US)';

        console.log(`🤔 Answering question in ${targetLanguage} for voice: ${selectedVoiceId}`);

        const systemPrompt = this.buildQASystemPrompt(targetLanguage, languageName);
        const userPrompt = this.buildQAPrompt(code, language, fileName, question, targetLanguage);

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
                            content: userPrompt
                        }
                    ],
                    max_tokens: 800,
                    temperature: 0.5
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const answer = response.data.choices[0]?.message?.content;
            if (!answer) {
                throw new Error('No answer received from OpenAI');
            }

            console.log(`✅ Generated Q&A answer: ${answer.substring(0, 100)}...`);
            return answer;
        } catch (error) {
            console.error('Error in answerCodeQuestion:', error);
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
            throw new Error('Failed to answer question. Please try again.');
        }
    }

    async generateCode(request: string, language: string, fileName: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        console.log(`🎤 Generating ${language} code for request: "${request}"`);

        const systemPrompt = this.buildCodeGenSystemPrompt();
        const userPrompt = this.buildCodeGenPrompt(request, language, fileName);

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
                            content: userPrompt
                        }
                    ],
                    max_tokens: 1200,
                    temperature: 0.3
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const generatedCode = response.data.choices[0]?.message?.content;
            if (!generatedCode) {
                throw new Error('No code generated from OpenAI');
            }

            console.log(`✅ Generated code: ${generatedCode.substring(0, 100)}...`);
            return generatedCode;
        } catch (error) {
            console.error('Error in generateCode:', error);
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
            throw new Error('Failed to generate code. Please try again.');
        }
    }

    async explainGeneratedCode(generatedCode: string, originalRequest: string, language: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const config = vscode.workspace.getConfiguration('codeVoiceExplainer');
        const selectedVoiceId = config.get<string>('murfVoiceId') || 'en-US-natalie';
        const voiceLanguageInfo = VOICE_LANGUAGE_MAP[selectedVoiceId];
        const targetLanguage = voiceLanguageInfo ? voiceLanguageInfo.language : 'English';
        const languageName = voiceLanguageInfo ? voiceLanguageInfo.languageName : 'English (US)';

        console.log(`📖 Explaining generated code in ${targetLanguage}`);

        const systemPrompt = this.buildGeneratedCodeExplanationSystemPrompt(targetLanguage, languageName);
        const userPrompt = this.buildGeneratedCodeExplanationPrompt(generatedCode, originalRequest, language, targetLanguage);

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
                            content: userPrompt
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

            console.log(`✅ Generated code explanation: ${explanation.substring(0, 100)}...`);
            return explanation;
        } catch (error) {
            console.error('Error in explainGeneratedCode:', error);
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
            throw new Error('Failed to explain generated code. Please try again.');
        }
    }

    // === HELPER METHODS FOR Q&A AND CODE GENERATION ===

    private buildQASystemPrompt(targetLanguage: string, languageName: string): string {
        if (targetLanguage === 'English') {
            return `You are an expert programming mentor who answers code questions in a natural, conversational way. 

Your role is to:
- Answer specific questions about the provided code
- Explain potential issues, optimizations, or edge cases
- Provide practical insights and suggestions
- Be encouraging and educational
- Keep responses focused and relevant to the question

Respond as if you're having a friendly conversation with a developer who wants to understand their code better.`;
        }
        
        const languageInstructions = {
            'Spanish': 'Eres un mentor experto en programación que responde preguntas sobre código de manera natural y conversacional. Debes responder completamente en español de forma amigable y educativa.',
            'French': 'Vous êtes un mentor expert en programmation qui répond aux questions sur le code de manière naturelle et conversationnelle. Vous devez répondre entièrement en français de manière amicale et éducative.',
            'German': 'Sie sind ein erfahrener Programmiermentor, der Fragen zum Code auf natürliche, gesprächige Weise beantwortet. Sie müssen vollständig auf Deutsch freundlich und lehrreich antworten.',
            'Italian': 'Sei un mentore esperto di programmazione che risponde alle domande sul codice in modo naturale e colloquiale. Devi rispondere completamente in italiano in modo amichevole ed educativo.',
            'Portuguese': 'Você é um mentor especialista em programação que responde perguntas sobre código de forma natural e conversacional. Você deve responder completamente em português de forma amigável e educativa.'
        };
        
        return languageInstructions[targetLanguage as keyof typeof languageInstructions] || 
               `You are an expert programming mentor. IMPORTANT: You must respond entirely in ${targetLanguage} (${languageName}). Answer code questions in a natural, conversational way.`;
    }

    private buildQAPrompt(code: string, language: string, fileName: string, question: string, targetLanguage: string): string {
        if (targetLanguage === 'English') {
            return `I have a question about this ${language} code from "${fileName}":

QUESTION: ${question}

CODE:
\`\`\`${language}
${code}
\`\`\`

Please provide a clear, conversational answer that addresses my specific question. Focus on the relevant parts of the code and explain in a way that's easy to understand.`;
        } else {
            return `Tengo una pregunta sobre este código ${language} del archivo "${fileName}":

PREGUNTA: ${question}

CÓDIGO:
\`\`\`${language}
${code}
\`\`\`

Por favor proporciona una respuesta clara y conversacional que aborde mi pregunta específica. IMPORTANTE: Responde completamente en ${targetLanguage}.`;
        }
    }

    private buildCodeGenSystemPrompt(): string {
        return `You are an expert code generator. Your role is to:

1. Generate clean, well-structured, production-ready code
2. Follow best practices and conventions for the target language
3. Include appropriate comments for clarity
4. Handle edge cases and errors when relevant
5. Write code that is maintainable and efficient

Generate ONLY the code requested - no extra explanations or markdown formatting around the code block.`;
    }

    private buildCodeGenPrompt(request: string, language: string, fileName: string): string {
        return `Generate ${language} code for the following request:

REQUEST: ${request}

Context: This code will be used in "${fileName}"

Requirements:
- Write clean, production-ready code
- Follow ${language} best practices and conventions
- Include helpful comments
- Handle potential edge cases
- Make the code maintainable and efficient

Generate ONLY the code - no explanations or markdown formatting.`;
    }

    private buildGeneratedCodeExplanationSystemPrompt(targetLanguage: string, languageName: string): string {
        if (targetLanguage === 'English') {
            return `You are an expert programming teacher explaining newly generated code. 

Your role is to:
- Explain how the generated code works step by step
- Highlight key features and design decisions
- Mention best practices that were applied
- Be conversational and educational
- Help the user understand what was created and why

Explain as if you're walking through the code with a colleague.`;
        }
        
        const languageInstructions = {
            'Spanish': 'Eres un profesor experto en programación que explica código recién generado. Explica paso a paso cómo funciona el código de manera conversacional y educativa. Responde completamente en español.',
            'French': 'Vous êtes un professeur expert en programmation qui explique le code nouvellement généré. Expliquez étape par étape comment le code fonctionne de manière conversationnelle et éducative. Répondez entièrement en français.',
            'German': 'Sie sind ein erfahrener Programmierlehrer, der neu generierten Code erklärt. Erklären Sie Schritt für Schritt, wie der Code funktioniert, auf gesprächige und lehrreiche Weise. Antworten Sie vollständig auf Deutsch.',
            'Italian': 'Sei un insegnante esperto di programmazione che spiega il codice appena generato. Spiega passo dopo passo come funziona il codice in modo colloquiale ed educativo. Rispondi completamente in italiano.'
        };
        
        return languageInstructions[targetLanguage as keyof typeof languageInstructions] || 
               `You are an expert programming teacher. IMPORTANT: You must respond entirely in ${targetLanguage} (${languageName}). Explain the generated code step by step in a conversational way.`;
    }

    private buildGeneratedCodeExplanationPrompt(generatedCode: string, originalRequest: string, language: string, targetLanguage: string): string {
        if (targetLanguage === 'English') {
            return `I requested: "${originalRequest}"

Here's the ${language} code that was generated:

\`\`\`${language}
${generatedCode}
\`\`\`

Please explain how this code works, walking through the key parts and highlighting what makes it effective. Be conversational and educational.`;
        } else {
            return `Solicité: "${originalRequest}"

Aquí está el código ${language} que se generó:

\`\`\`${language}
${generatedCode}
\`\`\`

Por favor explica cómo funciona este código, revisando las partes clave. IMPORTANTE: Responde completamente en ${targetLanguage} de manera conversacional y educativa.`;
        }
    }
}
