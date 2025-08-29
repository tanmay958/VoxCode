# Testing the Code Voice Explainer Extension with Preprocessed Highlighting

## 🎯 NEW: Preprocessed Efficient Highlighting

The extension now features **preprocessed, accurate highlighting** that's much more efficient! Code is indexed first, then explanations are mapped to specific elements, then voice is generated, resulting in precise yellow highlighting with maximum accuracy.

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

### 4. Expected Behavior (NEW Preprocessed Experience!)
1. Extension will show: "Murf.ai API key not configured. Using OpenAI TTS as fallback for voice synthesis."
2. Progress indicators: 
   - "Indexing code elements..."
   - "Generating mapped explanation..."
   - "Converting to speech with timing..."
   - "Mapping timing to code elements..."
   - "Setting up precise highlighting..."
   - "Ready for precise synchronized highlighting!"
3. A **preprocessed explanation webview panel** will open with:
   - **Split-screen layout**: Controls on left, code on right
   - **Audio player** with highlight controls (🎯 Highlight ON/OFF button)
   - **Preprocessed explanation** optimized for accuracy
   - **Dual highlighting system**: Blue for selection, light yellow for explanation
   - **Precise element mapping** based on preprocessed analysis
   - **Efficiency indicator** (pulsing green dot)
4. **Preprocessed synchronized playback**:
   - Audio starts automatically (if browser allows)
   - **Blue highlighting** when you select code for explanation
   - **Light yellow highlighting** during voice explanation (minimal border)
   - **No word highlighting in webview** - focus is on code only
   - **Precise timing** based on preprocessed mapping
   - **Maximum efficiency** - everything computed before playback starts

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

### 8. New Natural Highlighting Testing

#### 🎯 Test the Natural Teaching Experience:

1. **Natural Word-based Highlighting**:
   - Play audio and watch code elements highlight as they're **naturally mentioned**
   - Functions highlight when teacher says "this function" or mentions function name
   - Variables highlight when teacher mentions them in conversation
   - Operators highlight when teacher talks about "equals", "loop", etc.

2. **Highlight Controls**:
   - **🎯 Highlight ON**: Green pulsing indicator, natural highlighting follows speech
   - **🎯 Highlight OFF**: Highlighting stops, audio continues independently
   - Toggle should work during playback

3. **Word-level Synchronization**:
   - **Current word highlighting** in explanation text
   - **Smooth scrolling** to follow current word
   - **Code element detection** working for functions, variables, operators
   - **Timing accuracy** using Murf.ai word timing data

4. **Natural Teacher Experience**:
   - **Conversational explanations** not rigid sections
   - **Organic highlighting** that follows natural speech patterns
   - **Visual feedback** shows which words map to code elements
   - **Professional teaching interface** like a real instructor

#### 🔧 Test Natural Highlighting Scenarios:

```javascript
function calculateTotal(items) {
    let total = 0;
    for (let item of items) {
        total += item.price * item.quantity;
    }
    return total;
}
```

#### 📊 Expected Natural Highlighting:
- **"calculateTotal function"** → highlights function name
- **"items parameter"** → highlights parameter  
- **"total variable"** → highlights variable declaration
- **"for loop"** → highlights for loop structure
- **"price" and "quantity"** → highlights property access
- **"return"** → highlights return statement

**Natural Flow Example**:
> "Let's look at this **calculateTotal** function. It takes an **items** parameter, and then we initialize a **total** variable to zero. The **for loop** here goes through each **item**..."

As the teacher speaks, watch the corresponding code elements highlight naturally!

### 9. Audio Controls Testing
- **Play/Pause**: Should control audio playback
- **Restart**: Should restart audio from beginning  
- **🔗 Sync ON/OFF**: Toggle real-time highlighting
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

### ✅ Core Functionality
- Extension loads without errors  
- Settings are configurable  
- Code explanation generates successfully  
- Audio plays in webview  
- Fallback to OpenAI TTS works when Murf.ai unavailable  
- Error handling works for missing API keys  
- Audio can be saved as MP3  

### ✅ NEW: Preprocessed Efficient Highlighting Features
- **Preprocessed Analysis**: Code indexed first for maximum accuracy  
- **Mapped Explanations**: AI explanations precisely mapped to code elements  
- **Dual Highlighting System**: 
  - 🔵 **Blue highlighting** when selecting code for explanation
  - 🟡 **Light yellow highlighting** during voice explanation (minimal border)
- **No Webview Highlighting**: Clean, focused experience without distracting word highlighting  
- **Precise Sync Controls**: Toggle preprocessed highlighting on/off during playback  
- **Advanced Code Indexing**: Intelligent detection of functions, variables, operators, keywords with unique IDs  
- **Efficient Processing**: Everything computed upfront for smooth playback  
- **Murf.ai Timing Integration**: Uses precise word timing data mapped to preprocessed segments  
- **Maximum Accuracy**: Preprocessing ensures nearly perfect element mapping  

### 🎯 MVP Testing Checklist

**Basic Test (5 minutes)**:
1. ✅ Set OpenAI API key
2. ✅ Create simple function 
3. ✅ Right-click → "Explain Selected Code with Voice"
4. ✅ Watch synchronized highlighting in action

**Advanced Test (10 minutes)**:
1. ✅ Test with complex multi-section code
2. ✅ Toggle sync on/off during playback
3. ✅ Click different sections in UI
4. ✅ Test audio controls (play, pause, restart)
5. ✅ Verify highlighting in both webview and editor

**Edge Cases (5 minutes)**:
1. ✅ Test with very short code (should create 1-2 sections)
2. ✅ Test with very long code (should break into manageable sections)  
3. ✅ Test sync toggle during different parts of audio
4. ✅ Test with different programming languages

## 🎉 You now have a preprocessed, efficient code explanation experience!

The extension creates an **optimized teaching environment** where:
- 🎤 **Natural voice** explains code with preprocessed accuracy
- 🔵🟡 **Dual highlighting** shows selection (blue) and explanation (light yellow) phases distinctly  
- 📊 **Preprocessed analysis** ensures maximum accuracy and efficiency
- 🔄 **Smart indexing** maps every explanation segment to specific code elements
- ⚡ **Maximum efficiency** - everything computed upfront for smooth experience!

**Key improvements:**
1. ✅ **No webview highlighting** - clean, focused experience
2. ✅ **Dual highlighting system** - blue for selection, light yellow for explanation
3. ✅ **Preprocessed mapping** - nearly perfect accuracy
4. ✅ **Efficient processing** - much faster and more reliable
5. ✅ **Minimal borders** - light yellow highlighting is subtle and non-intrusive

**The most accurate and efficient code explanation experience possible!**

Happy testing! 🎤✨📚⚡
