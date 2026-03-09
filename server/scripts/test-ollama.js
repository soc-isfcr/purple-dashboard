import ollama from 'ollama';

async function testConnection() {
    console.log("Attempting to connect to Ollama at default (localhost:11434)...");
    try {
        const response = await ollama.chat({
            model: 'qwen2.5:1.5b',
            messages: [{ role: 'user', content: 'Say hello' }],
            stream: false,
        });
        console.log("Success! Response:", response.message.content);
    } catch (error) {
        console.error("Connection failed!");
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        console.error("Full Error:", error);
    }
}

testConnection();
