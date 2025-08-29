// Example of correct Murf.ai API usage
// This is for reference only - the extension implements this automatically

async function testMurfAPI() {
    const API_KEY = "ap2_your-api-key-here"; // Replace with your actual API key
    const VOICE_ID = "en-US-natalie"; // or en-US-clyde, en-GB-charlotte, etc.
    
    try {
        const response = await fetch("https://api.murf.ai/v1/speech/generate", {
            method: "POST",
            headers: {
                "api-key": API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "text": "Hello! This is a test of the Murf.ai text-to-speech API.",
                "voiceId": VOICE_ID
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API Response:", data);

        // The response will include:
        // - audioFile: URL to download the generated audio
        // - audioLengthInSeconds: Duration of the audio
        // - wordDurations: Timing data for each word
        // - consumedCharacterCount: Characters used
        // - remainingCharacterCount: Characters remaining in quota

        // To download the audio:
        if (data.audioFile) {
            console.log("Audio file URL:", data.audioFile);
            console.log("Audio length:", data.audioLengthInSeconds, "seconds");
            
            // In the extension, we download this file automatically
            // const audioResponse = await fetch(data.audioFile);
            // const audioBuffer = await audioResponse.arrayBuffer();
        }

    } catch (error) {
        console.error("Error calling Murf.ai API:", error);
    }
}

// Example voice IDs you can try:
const AVAILABLE_VOICES = [
    "en-US-natalie",
    "en-US-clyde", 
    "en-US-daniel",
    "en-GB-charlotte",
    "en-GB-oscar",
    "en-AU-bella",
    "es-ES-sofia",
    "fr-FR-amelie",
    "de-DE-felix"
    // Add more voice IDs as needed
];

// Uncomment to test (make sure to set your API key first):
// testMurfAPI();

/* 
To use this in the extension:
1. Get your Murf.ai API key from https://murf.ai
2. Open VSCode settings and search for "Code Voice Explainer"
3. Set "Murf Api Key" to your API key (format: ap2_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
4. Set "Murf Voice Id" to your preferred voice (e.g., en-US-natalie)
5. The extension will automatically use Murf.ai for speech synthesis
*/
