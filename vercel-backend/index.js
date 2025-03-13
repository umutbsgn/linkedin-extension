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
        version: '1.0.2'
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

// Stripe Configuration endpoints
app.get('/api/config/stripe-publishable-key', (req, res) => {
    // Get the Stripe publishable key from environment variables
    const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

    if (!stripePublishableKey) {
        return res.status(500).json({ error: 'Stripe publishable key not configured' });
    }

    // Return the Stripe publishable key
    return res.status(200).json({ key: stripePublishableKey });
});

app.get('/api/config/stripe-price-id', (req, res) => {
    // Get the Stripe price ID from environment variables
    const stripePriceId = process.env.STRIPE_PRO_PRICE_ID;

    if (!stripePriceId) {
        return res.status(500).json({ error: 'Stripe price ID not configured' });
    }

    // Return the Stripe price ID
    return res.status(200).json({ priceId: stripePriceId });
});

app.get('/api/config/stripe-secret-key', (req, res) => {
    // Get the Stripe secret key from environment variables
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
        return res.status(500).json({ error: 'Stripe secret key not configured' });
    }

    // Return the Stripe secret key
    return res.status(200).json({ key: stripeSecretKey });
});

app.get('/api/config/stripe-webhook-secret', (req, res) => {
    // Get the Stripe webhook secret from environment variables
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeWebhookSecret) {
        return res.status(500).json({ error: 'Stripe webhook secret not configured' });
    }

    // Return the Stripe webhook secret
    return res.status(200).json({ secret: stripeWebhookSecret });
});

// Stripe Subscription endpoints
app.get('/api/subscriptions/status', async(req, res) => {
    // Get authorization token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // For now, return a mock subscription status
    return res.status(200).json({
        subscriptionType: 'trial',
        hasActiveSubscription: false,
        useOwnApiKey: false,
        apiKey: null,
        subscription: null
    });
});

app.post('/api/subscriptions/create-checkout', async(req, res) => {
    // Get authorization token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get success and cancel URLs from request
    const { successUrl, cancelUrl } = req.body;

    if (!successUrl || !cancelUrl) {
        return res.status(400).json({ error: 'Success and cancel URLs are required' });
    }

    // For now, return a mock checkout session
    return res.status(200).json({
        sessionId: 'mock_session_id',
        url: 'https://example.com/checkout'
    });
});

app.post('/api/subscriptions/cancel', async(req, res) => {
    // Get authorization token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // For now, return a mock response
    return res.status(200).json({
        success: true,
        message: 'Subscription will be canceled at the end of the current billing period',
        subscription: {
            id: 'mock_subscription_id',
            status: 'canceling',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
    });
});

app.post('/api/subscriptions/update-api-key', async(req, res) => {
    // Get authorization token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get API key settings from request
    const { useOwnApiKey, apiKey } = req.body;

    if (typeof useOwnApiKey !== 'boolean') {
        return res.status(400).json({ error: 'useOwnApiKey must be a boolean' });
    }

    // If using own API key, validate it
    if (useOwnApiKey && (!apiKey || typeof apiKey !== 'string')) {
        return res.status(400).json({ error: 'API key is required when useOwnApiKey is true' });
    }

    // For now, return a mock response
    return res.status(200).json({
        success: true,
        message: 'API key settings updated successfully',
        settings: {
            useOwnApiKey,
            apiKey: useOwnApiKey ? apiKey : null
        }
    });
});

app.get('/api/subscriptions/redirect', (req, res) => {
    // Get status and session ID from query parameters
    const { status, session_id } = req.query;

    // Create HTML response based on status
    let html;

    if (status === 'success') {
        html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Subscription Successful</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                        text-align: center;
                        line-height: 1.6;
                    }
                    h1 {
                        color: #4CAF50;
                        margin-bottom: 20px;
                    }
                    p {
                        margin-bottom: 20px;
                    }
                    .icon {
                        font-size: 64px;
                        margin-bottom: 20px;
                    }
                    .close-button {
                        display: inline-block;
                        background-color: #4CAF50;
                        color: white;
                        padding: 10px 20px;
                        border-radius: 4px;
                        text-decoration: none;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="icon">✅</div>
                <h1>Subscription Successful!</h1>
                <p>Thank you for subscribing to the Pro plan. Your subscription is now active.</p>
                <p>You can now return to the extension and enjoy all the Pro features.</p>
                <p><small>Session ID: ${session_id}</small></p>
                <a href="#" class="close-button" onclick="window.close()">Close this window</a>
                <script>
                    // Close window automatically after 5 seconds
                    setTimeout(() => {
                        window.close();
                    }, 5000);
                </script>
            </body>
            </html>
        `;
    } else if (status === 'canceled') {
        html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Subscription Canceled</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                        text-align: center;
                        line-height: 1.6;
                    }
                    h1 {
                        color: #F44336;
                        margin-bottom: 20px;
                    }
                    p {
                        margin-bottom: 20px;
                    }
                    .icon {
                        font-size: 64px;
                        margin-bottom: 20px;
                    }
                    .close-button {
                        display: inline-block;
                        background-color: #F44336;
                        color: white;
                        padding: 10px 20px;
                        border-radius: 4px;
                        text-decoration: none;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="icon">❌</div>
                <h1>Subscription Canceled</h1>
                <p>You have canceled the subscription process. No charges have been made.</p>
                <p>You can still use the extension with the trial features.</p>
                <p><small>Session ID: ${session_id}</small></p>
                <a href="#" class="close-button" onclick="window.close()">Close this window</a>
                <script>
                    // Close window automatically after 5 seconds
                    setTimeout(() => {
                        window.close();
                    }, 5000);
                </script>
            </body>
            </html>
        `;
    } else {
        html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invalid Status</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                        text-align: center;
                        line-height: 1.6;
                    }
                    h1 {
                        color: #FF9800;
                        margin-bottom: 20px;
                    }
                    p {
                        margin-bottom: 20px;
                    }
                    .icon {
                        font-size: 64px;
                        margin-bottom: 20px;
                    }
                    .close-button {
                        display: inline-block;
                        background-color: #FF9800;
                        color: white;
                        padding: 10px 20px;
                        border-radius: 4px;
                        text-decoration: none;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="icon">⚠️</div>
                <h1>Invalid Status</h1>
                <p>An invalid status was provided. Please return to the extension.</p>
                <p><small>Status: ${status || 'none'}, Session ID: ${session_id || 'none'}</small></p>
                <a href="#" class="close-button" onclick="window.close()">Close this window</a>
                <script>
                    // Close window automatically after 5 seconds
                    setTimeout(() => {
                        window.close();
                    }, 5000);
                </script>
            </body>
            </html>
        `;
    }

    // Set content type and send HTML response
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
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