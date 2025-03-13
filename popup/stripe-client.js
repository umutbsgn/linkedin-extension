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
        // Use a mock key for now
        const key = 'pk_test_mock_key';
        console.log('Using mock Stripe publishable key:', key);

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
        // Generate success and cancel URLs
        const baseUrl = API_ENDPOINTS.VERCEL_BACKEND_URL;
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        const successUrl = `${baseUrl}/api/subscriptions/redirect?status=success&session_id=${sessionId}`;
        const cancelUrl = `${baseUrl}/api/subscriptions/redirect?status=canceled&session_id=${sessionId}`;

        console.log('Using mock checkout session');

        // Return mock data with a real Stripe checkout URL
        // This is a placeholder URL that will show a Stripe checkout page
        return {
            sessionId: 'mock_session_id',
            url: 'https://checkout.stripe.com/c/pay/cs_test_mock_checkout_session'
        };
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

        // Open checkout URL in new tab
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
            chrome.tabs.create({ url: url });
        } else {
            window.open(url, '_blank');
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
        console.log('Using mock subscription status');

        // Return mock data
        return {
            subscriptionType: 'trial',
            hasActiveSubscription: false,
            useOwnApiKey: false,
            apiKey: null,
            subscription: null
        };
    } catch (error) {
        console.error('Error getting subscription status:', error);
        throw error;
    }
}

// Cancel subscription
export async function cancelSubscription(token) {
    try {
        console.log('Using mock cancel subscription');

        // Return mock data
        return {
            success: true,
            message: 'Subscription will be canceled at the end of the current billing period',
            subscription: {
                id: 'mock_subscription_id',
                status: 'canceling',
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }
        };
    } catch (error) {
        console.error('Error canceling subscription:', error);
        throw error;
    }
}

// Update API key settings
export async function updateApiKeySettings(token, useOwnApiKey, apiKey = null) {
    try {
        console.log('Using mock update API key settings');

        // Return mock data
        return {
            success: true,
            message: 'API key settings updated successfully',
            settings: {
                useOwnApiKey,
                apiKey: useOwnApiKey ? apiKey : null
            }
        };
    } catch (error) {
        console.error('Error updating API key settings:', error);
        throw error;
    }
}