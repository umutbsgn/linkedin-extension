// Simple Express.js server to proxy requests to the Anthropic API
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Healthcheck endpoint
app.get('/api/healthcheck', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Local server is working correctly',
        version: '1.0.0'
    });
});

// Anthropic API endpoint
app.post('/api/anthropic/analyze', async(req, res) => {
    try {
        const { text, systemPrompt } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text parameter is required' });
        }

        // Get API key from environment variables
        const apiKey = process.env.ANTHROPIC_API_KEY;

        // Check if API key is provided
        if (!apiKey) {
            console.log('No API key provided. Returning mock response.');
            // Return a mock response for testing
            return res.status(200).json({
                id: 'msg_mock_response',
                type: 'message',
                role: 'assistant',
                content: [{
                    type: 'text',
                    text: 'This is a mock response because no API key was provided. To use the actual Anthropic API, set the ANTHROPIC_API_KEY environment variable.'
                }],
                model: 'claude-3-5-sonnet-20241022',
                stop_reason: 'end_turn',
                usage: {
                    input_tokens: 10,
                    output_tokens: 30
                }
            });
        }

        // Log request (without sensitive data)
        console.log(`Anthropic API request: ${text.substring(0, 50)}...`);

        // Make request to Anthropic API
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            },
            body: JSON.stringify({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1024,
                system: systemPrompt || "You are a helpful assistant.",
                messages: [
                    { role: "user", content: text }
                ]
            })
        });

        // Handle API errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error && errorData.error.message || response.statusText;
            console.error(`Anthropic API error: ${response.status} - ${errorMessage}`);
            return res.status(response.status).json({
                error: `API call failed: ${response.status} - ${errorMessage}`
            });
        }

        // Return the API response
        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error('Error in Anthropic API proxy:', error);
        return res.status(500).json({ error: error.message });
    }
});

// Default route for the main page
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.6;">
            <h1>LinkedIn AI Assistant API Proxy</h1>
            <p>This is a local API proxy for the LinkedIn AI Assistant browser extension.</p>
            <p>Available endpoints:</p>
            <ul>
                <li><a href="/api/healthcheck">/api/healthcheck</a> - Check if the server is running</li>
                <li><code>/api/anthropic/analyze</code> - Proxy requests to the Anthropic API</li>
            </ul>
            <p>To use this server, update the <code>VERCEL_BACKEND_URL</code> in <code>config.js</code> to point to <code>http://localhost:3001</code>.</p>
        </div>
    `);
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});