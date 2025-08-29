# Testing the Code Voice Explainer Extension

## Quick Start (OpenAI Only)

Since Murf.ai API access is limited, you can test the extension with just an OpenAI API key:

### 1. Setup
1. Open this project in VSCode
2. Press `F5` to launch Extension Development Host
3. A new VSCode window will open with the extension loaded

### 2. Configure OpenAI API Key
1. In the new window, open Settings (`Cmd/Ctrl + ,`)
2. Search for "Code Voice Explainer"
3. Set your **OpenAI API Key** (required)
4. Leave **Murf.ai API Key** empty (optional - will use OpenAI TTS fallback)

### 3. Test the Extension
1. Create a new file with some code (any language):
```javascript
function calculateTotal(items) {
    let total = 0;
    for (let item of items) {
        total += item.price * item.quantity;
    }
    return total;
}
```

2. **Method 1 - Explain entire file:**
   - Right-click in the editor
   - Select "Explain Code with Voice"

3. **Method 2 - Explain selected code:**
   - Select a portion of the code
   - Right-click on the selection
   - Select "Explain Selected Code with Voice"

### 4. Expected Behavior
1. Extension will show: "Murf.ai API key not configured. Using OpenAI TTS as fallback for voice synthesis."
2. Progress indicator: "Explaining code with voice..."
3. A webview panel will open with:
   - Audio player with generated speech
   - Text explanation
   - Original code display
4. Audio will automatically start playing (if browser allows auto-play)

### 5. Testing Different Scenarios

#### Test with different code types:
```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
```

```java
public class Calculator {
    public static int add(int a, int b) {
        return a + b;
    }
}
```

#### Test configuration options:
- Change **Explanation Detail** to "brief" or "comprehensive"
- Try explaining different sized code blocks

### 6. Expected Error Scenarios

#### No OpenAI API Key:
- Error: "OpenAI API key is required for code explanations"
- Prompts to open settings

#### Invalid OpenAI API Key:
- Error during explanation generation
- Check API key validity

#### No code selected:
- Error: "No code selected" (for selection mode)
- Error: "No code found in the current file" (for file mode)

### 7. Advanced Testing (With Murf.ai API Key)

If you have a Murf.ai API key:
1. Set your Murf.ai API key in settings (format: `ap2_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
2. Choose a voice ID (e.g., `en-US-natalie`, `en-US-clyde`, `en-GB-charlotte`)
3. Test should use Murf.ai for higher quality voice
4. If Murf.ai fails, should automatically fall back to OpenAI TTS
5. Extension will show "Using Murf.ai for voice synthesis" (no fallback message)

### 8. Audio Controls Testing
- **Play/Pause**: Should control audio playback
- **Restart**: Should restart audio from beginning
- **Save Audio**: Should allow saving as MP3 file

### 9. Common Issues & Solutions

#### Audio doesn't auto-play:
- Browser security may prevent auto-play
- Click the play button manually
- This is normal behavior

#### Webview doesn't open:
- Check for popup blockers
- Try reloading the extension window
- Check VSCode developer console for errors

#### Long response times:
- First API calls may be slower
- Check your internet connection
- Verify API quotas aren't exceeded

## Debugging

If you encounter issues:
1. Open VSCode Developer Tools (`Help > Toggle Developer Tools`)
2. Check console for error messages
3. Look in the extension's output panel
4. Compare with expected behaviors listed above

## Success Criteria

✅ Extension loads without errors  
✅ Settings are configurable  
✅ Code explanation generates successfully  
✅ Audio plays in webview  
✅ Fallback to OpenAI TTS works when Murf.ai unavailable  
✅ Error handling works for missing API keys  
✅ Code highlighting works for selections  
✅ Audio can be saved as MP3  

Happy testing! 🎤✨
