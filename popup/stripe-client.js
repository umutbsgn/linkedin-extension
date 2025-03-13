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
        // Generate base URL from configuration
        let baseUrl = API_ENDPOINTS.VERCEL_BACKEND_URL;

        // If baseUrl is undefined, use a hardcoded value
        if (!baseUrl) {
            baseUrl = 'https://linkedin-extension-seven.vercel.app';
            console.log('Using hardcoded baseUrl for Stripe publishable key:', baseUrl);
        }

        // Use hardcoded endpoint if API_ENDPOINTS.STRIPE_PUBLISHABLE_KEY is undefined
        const keyEndpoint = API_ENDPOINTS.STRIPE_PUBLISHABLE_KEY || `${baseUrl}/api/config/stripe-publishable-key`;
        console.log('Using Stripe publishable key endpoint:', keyEndpoint);

        try {
            // Fetch publishable key from server
            const response = await fetch(keyEndpoint);
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
            console.error('Error fetching Stripe publishable key:', error);
            console.log('Falling back to mock key for development');

            // Load Stripe.js dynamically
            await loadStripeScript();

            // Initialize Stripe with a mock key
            return window.Stripe('pk_test_mock_key');
        }
    } catch (error) {
        console.error('Error initializing Stripe:', error);
        throw error;
    }
}

// Create checkout session
export async function createCheckoutSession(token) {
    try {
        // Generate base URL from configuration
        let baseUrl = API_ENDPOINTS.VERCEL_BACKEND_URL;

        // Debug baseUrl
        console.log('API_ENDPOINTS:', API_ENDPOINTS);
        console.log('VERCEL_BACKEND_URL:', baseUrl);

        // If baseUrl is undefined, use a hardcoded value
        if (!baseUrl) {
            baseUrl = 'https://linkedin-extension-seven.vercel.app';
            console.log('Using hardcoded baseUrl:', baseUrl);
        }

        // Create a unique session tracking ID
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

        // Create success and cancel URLs with the tracking ID
        const successUrl = `${baseUrl}/api/subscriptions/redirect?status=success&session_id=${sessionId}`;
        const cancelUrl = `${baseUrl}/api/subscriptions/redirect?status=canceled&session_id=${sessionId}`;

        console.log('Using valid URLs for Stripe checkout:', { successUrl, cancelUrl });

        // Use hardcoded endpoint if API_ENDPOINTS.CREATE_CHECKOUT is undefined
        const createCheckoutEndpoint = API_ENDPOINTS.CREATE_CHECKOUT || `${baseUrl}/api/subscriptions/create-checkout`;
        console.log('Using checkout endpoint:', createCheckoutEndpoint);

        // Call the server to create a checkout session
        const response = await fetch(createCheckoutEndpoint, {
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
        // Generate base URL from configuration
        let baseUrl = API_ENDPOINTS.VERCEL_BACKEND_URL;

        // If baseUrl is undefined, use a hardcoded value
        if (!baseUrl) {
            baseUrl = 'https://linkedin-extension-seven.vercel.app';
            console.log('Using hardcoded baseUrl for subscription status:', baseUrl);
        }

        // Use hardcoded endpoint if API_ENDPOINTS.SUBSCRIPTION_STATUS is undefined
        const statusEndpoint = API_ENDPOINTS.SUBSCRIPTION_STATUS || `${baseUrl}/api/subscriptions/status`;
        console.log('Using subscription status endpoint:', statusEndpoint);

        const response = await fetch(statusEndpoint, {
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
        // Generate base URL from configuration
        let baseUrl = API_ENDPOINTS.VERCEL_BACKEND_URL;

        // If baseUrl is undefined, use a hardcoded value
        if (!baseUrl) {
            baseUrl = 'https://linkedin-extension-seven.vercel.app';
            console.log('Using hardcoded baseUrl for cancel subscription:', baseUrl);
        }

        // Use hardcoded endpoint if API_ENDPOINTS.CANCEL_SUBSCRIPTION is undefined
        const cancelEndpoint = API_ENDPOINTS.CANCEL_SUBSCRIPTION || `${baseUrl}/api/subscriptions/cancel`;
        console.log('Using cancel subscription endpoint:', cancelEndpoint);

        const response = await fetch(cancelEndpoint, {
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
        // Generate base URL from configuration
        let baseUrl = API_ENDPOINTS.VERCEL_BACKEND_URL;

        // If baseUrl is undefined, use a hardcoded value
        if (!baseUrl) {
            baseUrl = 'https://linkedin-extension-seven.vercel.app';
            console.log('Using hardcoded baseUrl for update API key settings:', baseUrl);
        }

        // Use hardcoded endpoint if API_ENDPOINTS.UPDATE_API_KEY is undefined
        const updateEndpoint = API_ENDPOINTS.UPDATE_API_KEY || `${baseUrl}/api/subscriptions/update-api-key`;
        console.log('Using update API key settings endpoint:', updateEndpoint);

        const response = await fetch(updateEndpoint, {
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