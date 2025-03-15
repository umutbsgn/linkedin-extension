// API endpoint for PostHog analytics tracking
import fetch from 'node-fetch';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { eventName, properties, distinctId } = req.body;

        if (!eventName) {
            return res.status(400).json({ error: 'eventName is required' });
        }

        // Log the event for debugging
        console.log(`Tracking event: ${eventName}`, {
            properties,
            distinctId: distinctId || 'anonymous'
        });

        // Get PostHog credentials from environment variables
        const posthogApiKey = process.env.POSTHOG_API_KEY;
        const posthogApiHost = process.env.POSTHOG_API_HOST || 'https://eu.i.posthog.com';

        if (!posthogApiKey || !posthogApiHost) {
            console.error('PostHog configuration missing on server');
            return res.status(200).json({
                success: true,
                message: 'Event acknowledged but not tracked (PostHog not configured)',
                event: eventName
            });
        }

        // Prepare event properties
        const eventProperties = {
            ...properties,
            source: 'vercel_backend',
            timestamp: new Date().toISOString()
        };

        // Make request to PostHog API
        try {
            const response = await fetch(`${posthogApiHost}/capture/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    api_key: posthogApiKey,
                    event: eventName,
                    properties: eventProperties,
                    distinct_id: distinctId || 'anonymous_user',
                    timestamp: new Date().toISOString()
                })
            });

            // Check if the request was successful
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error from PostHog API:', errorText);
                return res.status(200).json({
                    success: true,
                    warning: `PostHog API responded with: ${response.status} ${response.statusText}`,
                    event: eventName
                });
            }

            // Return success response
            return res.status(200).json({
                success: true,
                message: 'Event tracked successfully',
                event: eventName
            });
        } catch (posthogError) {
            console.error('Error sending event to PostHog:', posthogError);
            return res.status(200).json({
                success: true,
                warning: 'Event acknowledged but PostHog API request failed',
                error: posthogError.message,
                event: eventName
            });
        }
    } catch (error) {
        console.error('Error in tracking endpoint:', error);
        return res.status(500).json({ error: error.message });
    }
}