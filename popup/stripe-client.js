// Stripe client for the LinkedIn AI Assistant browser extension
import { API_ENDPOINTS } from '../config.js';

// Load Stripe.js script dynamically
export async function loadStripeScript() {
    return new Promise((resolve, reject) => {
        if (window.Stripe) {
            resolve(window.Stripe);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        script.onload = () => resolve(window.Stripe);
        script.onerror = () => reject(new Error('Failed to load Stripe.js'));
        document.head.appendChild(script);
    });
}

// Initialize Stripe
export async function initStripe() {
    try {
        // Fetch publishable key from server
        const response = await fetch(API_ENDPOINTS.STRIPE_PUBLISHABLE_KEY);
        if (!response.ok) {
            throw new Error(`Failed to get Stripe publishable key: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const key = data.key;
        console.log('Using Stripe publishable key from server');

        // Load Stripe.js dynamically
        await loadStripeScript();

        // Initialize Stripe with the key
        return window.Stripe(key);
    } catch (error) {
        console.error('Error initializing Stripe:', error);
        throw error;
    }
}

// Create checkout session
export async function createCheckoutSession(token) {
    try {
        // Generate base URL from configuration
        const baseUrl = API_ENDPOINTS.VERCEL_BACKEND_URL;

        // Debug baseUrl
        console.log('API_ENDPOINTS:', API_ENDPOINTS);
        console.log('VERCEL_BACKEND_URL:', baseUrl);

        // Create a unique session tracking ID
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

        // Create success and cancel URLs with the tracking ID
        const successUrl = `${baseUrl}/api/subscriptions/redirect?status=success&session_id=${sessionId}`;
        const cancelUrl = `${baseUrl}/api/subscriptions/redirect?status=canceled&session_id=${sessionId}`;

        console.log('Using valid URLs for Stripe checkout:', { successUrl, cancelUrl });

        // Call the server to create a checkout session
        const response = await fetch(API_ENDPOINTS.CREATE_CHECKOUT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                successUrl: successUrl,
                cancelUrl: cancelUrl
            })
        });

        // Check if the response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('Non-JSON response received from create-checkout endpoint:');
            const text = await response.text();
            console.error(text);
            throw new Error('Invalid response format from server. Please check server logs.');
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to create checkout session: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating checkout session:', error);
        throw error;
    }
}

// Redirect to checkout
export async function redirectToCheckout(token) {
    try {
        // Create checkout session and get URL
        const { url } = await createCheckoutSession(token);

        console.log('Opening Stripe checkout URL:', url);

        // Open the checkout URL in a new tab
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
            // Chrome extension environment
            chrome.tabs.create({ url: url });
            console.log('Opened checkout in new tab using chrome.tabs.create');
        } else {
            // Regular web environment
            const newWindow = window.open(url, '_blank');
            if (!newWindow) {
                // Handle popup blockers
                alert('Please allow popups for this site to proceed to checkout.');
            }
        }

        return true;
    } catch (error) {
        console.error('Error redirecting to checkout:', error);
        throw error;
    }
}

// Get subscription status
export async function getSubscriptionStatus(token) {
    try {
        const response = await fetch(API_ENDPOINTS.SUBSCRIPTION_STATUS, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to get subscription status: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting subscription status:', error);
        throw error;
    }
}

// Cancel subscription
export async function cancelSubscription(token) {
    try {
        const response = await fetch(API_ENDPOINTS.CANCEL_SUBSCRIPTION, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to cancel subscription: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error canceling subscription:', error);
        throw error;
    }
}

// Update API key settings
export async function updateApiKeySettings(token, useOwnApiKey, apiKey = null) {
    try {
        const response = await fetch(API_ENDPOINTS.UPDATE_API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                useOwnApiKey,
                apiKey: useOwnApiKey ? apiKey : null
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to update API key settings: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating API key settings:', error);
        throw error;
    }
}