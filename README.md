# Code Voice Explainer

A VSCode extension that explains your code using AI and converts the explanations to natural speech using Murf.ai TTS. Perfect for learning, code reviews, and accessibility.

## Features

- 🎤 **Voice Explanations**: Get your code explained in natural, conversational voice
- 🤖 **AI-Powered**: Uses OpenAI GPT-4 for intelligent code analysis
- 🎯 **Code Highlighting**: Highlights the specific code being explained
- 📱 **Interactive UI**: Beautiful webview panel with audio controls
- ⚙️ **Configurable**: Customizable explanation detail levels and voice settings
- 💾 **Save Audio**: Export explanations as MP3 files

## Requirements

Before using this extension, you'll need:

1. **OpenAI API Key** - For code explanation generation (Required)
2. **Murf.ai API Key** - For premium text-to-speech conversion (Optional)

**Note:** If you don't have a Murf.ai API key, the extension will automatically fall back to OpenAI's TTS service, which is more widely available.

## Installation

### From Source (Development)

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Compile the extension:
   ```bash
   npm run compile
   ```
4. Open in VSCode and press `F5` to launch Extension Development Host

### From VSIX (Future)

1. Download the `.vsix` file from releases
2. Install using: `code --install-extension code-voice-explainer-0.0.1.vsix`

## Configuration

1. Open VSCode Settings (`Cmd/Ctrl + ,`)
2. Search for "Code Voice Explainer"
3. Configure the following settings:

### API Keys
- **OpenAI API Key**: Your OpenAI API key for code explanations (Required)
- **Murf.ai API Key**: Your Murf.ai API key for premium voice synthesis (Optional)

### Voice Settings
- **Voice ID**: Choose your preferred Murf.ai voice (default: `en-US-natalie`)
  - Examples: `en-US-natalie`, `en-US-clyde`, `en-GB-charlotte`
  - Only used if Murf.ai API key is configured
  - Falls back to OpenAI TTS voices if Murf.ai is unavailable
- **Explanation Detail**: Choose level of detail:
  - `brief`: 2-3 sentences
  - `detailed`: Comprehensive explanation (default)
  - `comprehensive`: In-depth analysis with patterns and improvements

### TTS Fallback Behavior
1. **Primary**: Uses Murf.ai TTS if API key is configured and available
2. **Fallback**: Automatically uses OpenAI TTS if Murf.ai fails or is not configured
3. **Error**: Shows error message if both services fail

## Usage

### Explain Entire File
1. Open any code file
2. Right-click in the editor
3. Select "Explain Code with Voice" from the context menu
4. Or use the command palette: `Ctrl/Cmd+Shift+P` → "Explain Code with Voice"

### Explain Selected Code
1. Select the code you want explained
2. Right-click on the selection
3. Select "Explain Selected Code with Voice"
4. The selected code will be highlighted and explained

### Audio Controls
- **Play/Pause**: Control audio playback
- **Restart**: Play from the beginning
- **Save Audio**: Export explanation as MP3 file

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
├── extension.ts              # Main extension entry point
├── services/
│   ├── codeExplainer.ts     # OpenAI integration
│   └── voiceSynthesizer.ts  # Murf.ai integration
├── utils/
│   └── highlightManager.ts # Code highlighting utilities
└── webview/
    └── webviewManager.ts    # UI panel management
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

## Roadmap

- [ ] Support for multiple languages (non-English)
- [ ] Offline voice synthesis options
- [ ] Custom voice training
- [ ] Code explanation caching
- [ ] Integration with other TTS providers
- [ ] Batch explanation for multiple files

---

**Happy Coding with Voice! 🎤✨**
