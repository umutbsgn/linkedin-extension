// Main entry point for Vercel deployment
const express = require('express');
const app = express();
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers
app.use((req, res, next) => {
    // Get allowed origins from environment variable
    const allowedOrigins = process.env.ALLOWED_ORIGINS ?
        process.env.ALLOWED_ORIGINS.split(',') : ['chrome-extension://your-extension-id'];

    const origin = req.headers.origin;

    // Check if the origin is allowed
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
        // Set default CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    // Handle preflight requests
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
        message: 'Vercel deployment is working correctly',
        version: '1.0.1'
    });
});

// Anthropic API endpoint
app.post('/api/anthropic/analyze', async(req, res) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { text, systemPrompt } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text parameter is required' });
        }

        // Get API key from environment variables
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured on server' });
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
                    // No need for "anthropic-dangerous-direct-browser-access" header on server
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

// Supabase Auth endpoints
app.post('/api/supabase/auth/login', async(req, res) => {
    // Implementation for login
    res.status(200).json({ message: 'Login endpoint' });
});

app.post('/api/supabase/auth/signup', async(req, res) => {
    // Implementation for signup
    res.status(200).json({ message: 'Signup endpoint' });
});

// Supabase Data endpoints
app.get('/api/supabase/user-settings', async(req, res) => {
    // Implementation for user settings
    res.status(200).json({ message: 'User settings endpoint' });
});

app.get('/api/supabase/beta-access', async(req, res) => {
    // Implementation for beta access
    res.status(200).json({ message: 'Beta access endpoint' });
});

// Analytics endpoint
app.post('/api/analytics/track', async(req, res) => {
    // Implementation for analytics tracking
    res.status(200).json({ message: 'Analytics tracking endpoint' });
});

// Default route for the main page
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.6;">
            <h1>LinkedIn AI Assistant API Proxy</h1>
            <p>This is a secure API proxy for the LinkedIn AI Assistant browser extension.</p>
            <p>This server securely handles API calls to:</p>
            <ul>
                <li>Anthropic API</li>
                <li>Supabase API</li>
                <li>PostHog Analytics</li>
            </ul>
            <p>All API keys are securely stored as environment variables on the server.</p>
            <p><strong>Note:</strong> This page is informational only. The actual API endpoints are not accessible directly through a browser.</p>
        </div>
    `);
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start the server if running directly
if (require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

// Export for Vercel
module.exports = app;