![VoxCode Banner](image.png)

# 🎤 VoxCode: Code Voice Explainer - Hackathon MVP

A revolutionary VSCode extension that brings AI-powered voice interaction to coding. Explain code, ask questions, and generate code using natural language - all with multilingual voice support!

## 🚀 **Features**

### **Interactive Code Q&A** - *Revolutionary!*
- **Ask questions about your code** and get intelligent voice answers
- **Follow-up conversations** for deeper understanding  
- **Context-aware responses** that understand your specific code
- **Example questions**: "What if input is null?", "How can I optimize this?", "Are there security issues?"

### 🎤 **Voice-Controlled Code Generation** - *Game Changer!*
- **Describe what you want** and watch AI generate production-ready code
- **Voice explanations** of the generated code
- **Iterative development**: "Add error handling", "Create unit tests"
- **Example prompts**: "Create email validator", "Build React todo component"

### 🌍 **Multilingual Voice Support** - *Accessibility First!*
- **20+ languages** including Spanish, French, German, Japanese, Hindi, Arabic
- **Native explanations** - both voice and text match your selected language
- **Perfect for international teams** and learning new programming languages

### ✨ **Core Features**
-  **Synchronized Voice Explanations**: Code highlighting synced with voice
-  **GPT-4 Powered**: Intelligent code analysis and explanations  
-  **Precise Highlighting**: LLM-driven intelligent timeline for accurate sync
-  **Beautiful UI**: Modern, responsive webview panels
-  **Export Audio**: Save explanations as MP3 files

## Requirements

Before using this extension, you'll need:

1. **OpenAI API Key** - For code explanation generation (Required)
2. **Murf.ai API Key** - For premium text-to-speech conversion (Optional)

**Note:** If you don't have a Murf.ai API key, the extension will automatically fall back to OpenAI's TTS service, which is more widely available.

## 🛠 **Quick Setup Guide** (Git Clone to Running Extension)

### **Step 1: Clone & Setup**
```bash
# Clone the repository
git clone <repository-url>
cd MURF

# Install dependencies (Node.js 16+ required)
npm install

# Compile TypeScript to JavaScript
npm run compile
```

### **Step 2: Launch in VSCode**
```bash
# Open the project in VSCode
code .

# In VSCode, press F5 to launch Extension Development Host
# This opens a new VSCode window with your extension loaded
```

### **Step 3: Configure API Keys**
1. In the new VSCode window, open Settings (`Cmd/Ctrl + ,`)
2. Search for "Code Voice Explainer"
3. Add your API keys:
   - **OpenAI API Key** (Required): Get from [OpenAI Platform](https://platform.openai.com)
   - **Murf.ai API Key** (Optional): Get from [Murf.ai Dashboard](https://murf.ai)

### **Step 4: Test the Extension** 🧪
1. Open the `demo.js` file in the new VSCode window
2. Select the `calculateTotal` function
3. Right-click and try all features:
   - **"Explain Selected Code with Voice"**
   - **"Ask Question About Code"** 
   - **"Generate Code with Voice"**

### **Alternative: VSIX Installation** (Future)
1. Download the `.vsix` file from releases
2. Install using: `code --install-extension code-voice-explainer-0.0.1.vsix`

## ⚙️ **Configuration**

### **Method 1: VSCode Settings (Basic)**
1. Open VSCode Settings (`Cmd/Ctrl + ,`)
2. Search for "Code Voice Explainer"
3. Configure the following settings:

### **Method 2: Command Palette (Recommended)**
- **For Voice Language**: `Ctrl/Cmd+Shift+P` → "Select Voice Language & Style"
- **For Settings**: `Ctrl/Cmd+Shift+P` → "Open Settings (Code Voice Explainer)"

### **API Keys** 🔑
- **OpenAI API Key**: Your OpenAI API key for code explanations *(Required)*
- **Murf.ai API Key**: Your Murf.ai API key for premium voice synthesis *(Optional)*

### **Voice & Language Settings** 🌍
- **Voice Language Selection**: Use Command Palette → "Select Voice Language & Style"
  - **🇺🇸 English**: natalie, clyde, charlotte, marcus (and 10+ more)
  - **🇪🇸 Spanish**: diego, sofia, marcela, carlos
  - **🇫🇷 French**: amelie, antoine, brigitte, henri  
  - **🇩🇪 German**: klaus, ingrid, marlene, werner
  - **🇮🇹 Italian**: alessandro, chiara, francesco, giulia
  - **🇯🇵 Japanese**: akira, akiko, emiko, hiroshi
  - **🇮🇳 Hindi**: aditi, amit, priya, ravi
  - **🇸🇦 Arabic**: omar, layla, hassan, fatima
  - **And 15+ more languages!**

- **Voice Style**: Choose speaking style for your selected voice:
  - `Conversational`, `Promo`, `Luxury`, `Calm`, `Authoritative`, etc.

- **Explanation Detail**: Choose level of detail:
  - `brief`: 2-3 sentences
  - `detailed`: Comprehensive explanation (default)
  - `comprehensive`: In-depth analysis with patterns and improvements

### **Language-Matched Explanations** 🗣️
When you select a non-English voice:
- **Text explanations** are generated in that language
- **Voice synthesis** uses the native speaker
- **UI remains in English** for consistency

### TTS Fallback Behavior
1. **Primary**: Uses Murf.ai TTS if API key is configured and available
2. **Fallback**: Automatically uses OpenAI TTS if Murf.ai fails or is not configured
3. **Error**: Shows error message if both services fail

## 🎯 **Usage Guide** - 3 Powerful Features

### 🎤 **1. Code Explanations** (Core Feature)
**Explain entire files or selected code with synchronized highlighting**

#### **Method A: Explain Selection** *(Recommended)*
1. **Select code** you want explained (function, class, or any code block)
2. **Right-click** → "Explain Selected Code with Voice"
3. **Watch** as the extension:
   - Generates intelligent explanation
   - Creates synchronized audio
   - Highlights code in sync with voice
   - Switches between files automatically (if needed)

#### **Method B: Explain Entire File**
1. **Open any code file**
2. **Right-click** in editor → "Explain Code with Voice"
3. **Or use Command Palette**: `Ctrl/Cmd+Shift+P` → "Explain Code with Voice"

---

### 🤔 **2. Interactive Q&A** *(Revolutionary!)*
**Ask intelligent questions about your code and get voice answers**

#### **How to Use:**
1. **Select code** you want to ask about
2. **Right-click** → "Ask Question About Code"  
3. **Type your question** in the input box
4. **Get voice answer** with context-aware explanations

#### **Example Questions:**
```
 "What happens if the input is null?"
 "How can I optimize this function?"
 "Are there any security vulnerabilities?"
 "What edge cases am I missing?"
 "How does this scale with large datasets?"
 "What design patterns are used here?"
```

#### **Follow-up Questions:**
- Ask unlimited follow-up questions
- Each answer builds on previous context
- Perfect for deep code understanding

---

### 🎤 **3. Voice-Controlled Code Generation** *(Game Changer!)*
**Describe what you want and watch AI generate production-ready code**

#### **How to Use:**
1. **Right-click anywhere** in your code → "Generate Code with Voice"
2. **Describe what you want** (in plain English)
3. **Watch AI generate** production-ready code
4. **Listen to explanation** of the generated code
5. **Ask for more**: "Add error handling", "Create unit tests"

#### **Example Prompts:**
```
 "Create a function to validate email addresses"
 "Write a React component for a todo list"
 "Make an API endpoint for user authentication"  
 "Generate a binary search algorithm"
 "Create a class for handling user profiles"
 "Write unit tests for this function"
```

#### **Iterative Development:**
- Generate base code first
- Ask for improvements: "Add error handling"
- Request tests: "Create unit tests"
- Add documentation: "Add JSDoc comments"

---

### 🎵 **Audio Controls** (All Features)
- **🎵 Auto-play**: Audio starts automatically
- **⏯️ Play/Pause**: Control playbook
- **🔄 Restart**: Play from beginning  
- **💾 Save Audio**: Export as MP3 file
- **📋 Copy**: Copy text to clipboard

### 🌍 **Multi-Language Experience**
1. **Select Language**: Command Palette → "Select Voice Language & Style"
2. **Choose Voice**: Pick from 60+ premium voices
3. **Get Native Experience**: Explanations in your selected language
4. **Perfect for Learning**: Great for non-native English speakers

## Supported Languages

The extension works with all programming languages supported by VSCode, including:
- JavaScript/TypeScript
- Python
- Java
- C/C++
- C#
- Go
- Rust
- PHP
- Ruby
- And many more!

## API Documentation

### OpenAI Integration
- Uses GPT-4 for high-quality explanations
- Optimized prompts for voice synthesis
- Automatic symbol-to-word conversion for better speech

### Murf.ai Integration
- High-quality voice synthesis
- Multiple voice options
- MP3 audio format
- Configurable speech parameters

## Troubleshooting

### Common Issues

**"OpenAI API key is required"**
- Set your OpenAI API key in VSCode settings
- Verify the key is valid and has sufficient credits

**"Speech synthesis failed"**
- If using Murf.ai: Verify API key is correct and account has available credits
- Extension will automatically try OpenAI TTS as fallback
- If both fail, check your internet connection and API quotas

**"Murf.ai API error (400)"**
- Murf.ai API is currently available only to select customers
- Contact Murf.ai support to request API access
- Extension will automatically fall back to OpenAI TTS

**"No explanation received"**
- Verify OpenAI API key is valid
- Check your OpenAI account has available credits
- Ensure the code selection is not empty

### Getting API Keys

**OpenAI API Key**
1. Visit [OpenAI Platform](https://platform.openai.com)
2. Sign up/login to your account
3. Go to API Keys section
4. Create a new secret key

**Murf.ai API Key**
1. Visit [Murf.ai](https://murf.ai)
2. Sign up for an account
3. Go to API settings in your dashboard
4. Generate an API key

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes during development
npm run watch
```

### Project Structure

```
src/
├── extension.ts                      # Main extension entry point
├── services/
│   ├── codeExplainer.ts             # OpenAI integration (Q&A, code generation)
│   ├── voiceSynthesizer.ts          # Murf.ai/OpenAI TTS integration
│   └── intelligentTimelineGenerator.ts  # LLM-driven highlighting
├── utils/
│   ├── highlightManager.ts         # VSCode highlighting & decorations
│   ├── tokenHighlighter.ts         # Code tokenization
│   └── intelligentTimelinePlayer.ts # Synchronized playback
├── webview/
│   └── webviewManager.ts           # Interactive UI panels
└── types/
    └── interfaces.ts               # TypeScript type definitions
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Privacy & Security

- API keys are stored locally in VSCode settings
- Code is sent to OpenAI and Murf.ai APIs for processing
- No code or audio is stored on our servers
- Review privacy policies of OpenAI and Murf.ai for their data handling

## License

MIT License - see LICENSE file for details

## Support

If you encounter issues or have feature requests:
1. Check the troubleshooting section above
2. Search existing issues on GitHub
3. Create a new issue with detailed information

## 🚀 **Roadmap** (Future Enhancements)

### **🎯 Hackathon Completed Features** ✅
- ✅ Interactive Code Q&A with voice responses
- ✅ Voice-controlled code generation  
- ✅ Multi-language support (20+ languages)
- ✅ Intelligent synchronized highlighting
- ✅ Multi-file automatic switching
- ✅ Follow-up conversation support

### **🔮 Future Vision**
- [ ] **Voice Commands**: "Explain this function", "Generate tests", "Find bugs"
- [ ] **Real-time Code Review**: Live voice feedback while typing
- [ ] **Team Collaboration**: Share voice explanations with teammates
- [ ] **Custom Voice Training**: Train on your codebase's specific terminology
- [ ] **Code Explanation Caching**: Instant explanations for repeated code patterns
- [ ] **Integration Hub**: Support for more TTS providers (Azure, AWS Polly)
- [ ] **Mobile Support**: Voice explanations in VS Code mobile apps
- [ ] **AI Pair Programming**: Continuous voice assistance while coding

---

## 🏆 **Hackathon MVP Stats**

**🚀 Built in record time with cutting-edge features:**
- **3 Revolutionary Features**: Voice Q&A, Code Generation, Multi-language
- **20+ Languages Supported**: Global accessibility 
- **60+ Premium Voices**: Professional voice synthesis
- **5 Core Services**: Advanced AI integration
- **1000+ Lines of Code**: Production-ready TypeScript
- **0 Breaking Changes**: Backwards compatible design

**🎯 Perfect for demonstrating:**
- ✅ **AI Innovation** - GPT-4 powered intelligence  
- ✅ **Accessibility** - Voice interface for all developers
- ✅ **Global Impact** - Multi-language support  
- ✅ **Developer Productivity** - Generate & explain code with voice
- ✅ **Technical Excellence** - Clean, scalable architecture

---

## 🎉 **Ready to Demo!**

**🎤 "The future of coding is here - and it speaks your language!"**

*Transform any code into an interactive conversation. Ask questions, generate solutions, and learn through voice - all in your native language.*

**Happy Coding with Voice! 🎤✨🏆**
