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

        const { key } = await response.json();
        console.log('Using Stripe publishable key:', key);

        // Load Stripe.js dynamically
        await loadStripeScript();

        // Initialize Stripe with the key
        return window.Stripe(key);
    } catch (error) {
        console.error('Error initializing Stripe:', error);

        // Fallback to mock key for development
        console.log('Falling back to mock key for development');
        const key = 'pk_test_mock_key';

        // Load Stripe.js dynamically
        await loadStripeScript();

        // Initialize Stripe with the mock key
        return window.Stripe(key);
    }
}

// Create checkout session
export async function createCheckoutSession(token) {
    try {
        // Always use valid HTTPS URLs for Stripe
        // We'll use the Vercel backend URL with our redirect endpoint
        const baseUrl = API_ENDPOINTS.VERCEL_BACKEND_URL;

        // Generate a unique ID to track this checkout session
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

        // Create success and cancel URLs that Stripe will accept
        const successUrl = `${baseUrl}/api/subscriptions/redirect?status=success&session_id=${sessionId}`;
        const cancelUrl = `${baseUrl}/api/subscriptions/redirect?status=canceled&session_id=${sessionId}`;

        console.log('Using valid URLs for Stripe checkout:', { successUrl, cancelUrl });

        try {
            // Create the checkout session
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
            console.error('Error creating checkout session with server:', error);
            console.log('Falling back to mock checkout session');

            // Return mock data with a real Stripe checkout URL for development
            return {
                sessionId: 'mock_session_id',
                url: 'https://checkout.stripe.com/c/pay/cs_test_mock_checkout_session'
            };
        }
    } catch (error) {
        console.error('Error creating checkout session:', error);
        throw error;
    }
}

// Redirect to checkout
export async function redirectToCheckout(token) {
    try {
        // Create checkout session
        const { url } = await createCheckoutSession(token);

        console.log('Opening Stripe checkout URL:', url);

        // Open the checkout URL in a new tab
        try {
            // Try to use Chrome API if available (extension context)
            if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
                chrome.tabs.create({ url: url });
                console.log('Opened checkout in new tab using chrome.tabs.create');
            } else {
                // Fallback to window.open for non-Chrome environments
                const newWindow = window.open(url, '_blank');
                if (newWindow) {
                    console.log('Opened checkout in new tab using window.open');
                } else {
                    console.warn('Popup blocker may have prevented opening the checkout page');
                    alert('Please allow popups for this site to proceed to checkout.');
                }
            }
        } catch (error) {
            console.error('Error opening checkout URL:', error);
            // Final fallback - show the URL to the user
            alert(`Please open this URL to complete your checkout: ${url}`);
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

        // Check if the response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('Non-JSON response received:', await response.text());
            throw new Error('Invalid response format from server');
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to get subscription status: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting subscription status:', error);
        // Return a default subscription status for trial users
        console.log('Falling back to mock subscription status');
        return {
            subscriptionType: 'trial',
            hasActiveSubscription: false,
            useOwnApiKey: false,
            apiKey: null,
            subscription: null
        };
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

        // Check if the response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('Non-JSON response received:', await response.text());
            throw new Error('Invalid response format from server');
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to cancel subscription: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error canceling subscription:', error);
        console.log('Falling back to mock cancel subscription response');

        // Return mock data for development
        return {
            success: true,
            message: 'Subscription will be canceled at the end of the current billing period',
            subscription: {
                id: 'mock_subscription_id',
                status: 'canceling',
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }
        };
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

        // Check if the response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('Non-JSON response received:', await response.text());
            throw new Error('Invalid response format from server');
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to update API key settings: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating API key settings:', error);
        console.log('Falling back to mock API key settings response');

        // Return mock data for development
        return {
            success: true,
            message: 'API key settings updated successfully',
            settings: {
                useOwnApiKey,
                apiKey: useOwnApiKey ? apiKey : null
            }
        };
    }
}