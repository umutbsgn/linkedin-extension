// API client for communicating with Vercel backend
import { API_ENDPOINTS } from '../config.js';

class ApiClient {
    constructor() {
        this.token = null;
        this.initialized = false;
    }

    // Initialize the client
    async initialize() {
        if (this.initialized) return;

        try {
            // Try to get token from storage
            const result = await chrome.storage.local.get(['vercelAuthToken']);
            this.token = result.vercelAuthToken || null;
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing API client:', error);
            throw error;
        }
    }

    // Set authentication token
    async setToken(token) {
        this.token = token;
        try {
            await chrome.storage.local.set({ vercelAuthToken: token });
            console.log('Auth token saved to storage');
        } catch (error) {
            console.error('Error saving auth token:', error);
            throw error;
        }
    }

    // Clear authentication token
    async clearToken() {
        this.token = null;
        try {
            await chrome.storage.local.remove('vercelAuthToken');
            console.log('Auth token removed from storage');
        } catch (error) {
            console.error('Error removing auth token:', error);
            throw error;
        }
    }

    // Get authentication token
    async getToken() {
        if (!this.initialized) {
            await this.initialize();
        }
        return this.token;
    }

    // Check if user is authenticated
    async isAuthenticated() {
        const token = await this.getToken();
        return !!token;
    }

    // Create headers for API requests
    async createHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (includeAuth) {
            const token = await this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        const { method = 'GET', body, includeAuth = true } = options;

        try {
            const url = endpoint.startsWith('http') ? endpoint : API_ENDPOINTS[endpoint] || endpoint;
            const headers = await this.createHeaders(includeAuth);

            const requestOptions = {
                method,
                headers
            };

            if (body) {
                requestOptions.body = JSON.stringify(body);
            }

            const response = await fetch(url, requestOptions);

            // Handle authentication errors
            if (response.status === 401) {
                console.error('Authentication error:', response.statusText);
                await this.clearToken();
                throw new Error('Authentication failed. Please log in again.');
            }

            // Handle other errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || response.statusText;
                throw new Error(`API request failed: ${response.status} - ${errorMessage}`);
            }

            // Parse response
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`API request error for ${endpoint}:`, error);
            throw error;
        }
    }

    // Authentication methods
    async login(email, password) {
        try {
            const data = await this.request(API_ENDPOINTS.LOGIN, {
                method: 'POST',
                body: { email, password },
                includeAuth: false
            });

            if (data.token) {
                await this.setToken(data.token);
                return { success: true, user: data.user };
            } else {
                throw new Error('No token received from server');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async register(email, password) {
        try {
            const data = await this.request(API_ENDPOINTS.REGISTER, {
                method: 'POST',
                body: { email, password },
                includeAuth: false
            });

            return { success: true, message: data.message };
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await this.request(API_ENDPOINTS.LOGOUT, {
                method: 'POST'
            });

            await this.clearToken();
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            // Still clear token even if request fails
            await this.clearToken();
            throw error;
        }
    }

    // User methods
    async getUserProfile() {
        try {
            return await this.request(API_ENDPOINTS.USER_PROFILE);
        } catch (error) {
            console.error('Get user profile error:', error);
            throw error;
        }
    }

    async updateUserSettings(settings) {
        try {
            return await this.request(API_ENDPOINTS.USER_SETTINGS, {
                method: 'POST',
                body: settings
            });
        } catch (error) {
            console.error('Update user settings error:', error);
            throw error;
        }
    }

    // Anthropic API methods
    async analyzeText(text, systemPrompt) {
        try {
            return await this.request(API_ENDPOINTS.ANALYZE, {
                method: 'POST',
                body: { text, systemPrompt }
            });
        } catch (error) {
            console.error('Analyze text error:', error);
            throw error;
        }
    }

    // Subscription methods
    async getSubscriptionStatus() {
        try {
            return await this.request(API_ENDPOINTS.SUBSCRIPTION_STATUS);
        } catch (error) {
            console.error('Get subscription status error:', error);
            throw error;
        }
    }

    async createCheckoutSession(successUrl, cancelUrl) {
        try {
            return await this.request(API_ENDPOINTS.CREATE_CHECKOUT, {
                method: 'POST',
                body: { successUrl, cancelUrl }
            });
        } catch (error) {
            console.error('Create checkout session error:', error);
            throw error;
        }
    }

    async cancelSubscription() {
        try {
            return await this.request(API_ENDPOINTS.CANCEL_SUBSCRIPTION, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Cancel subscription error:', error);
            throw error;
        }
    }

    // Configuration methods
    async getPostHogApiKey() {
        try {
            return await this.request(API_ENDPOINTS.POSTHOG_API_KEY, {
                includeAuth: false
            });
        } catch (error) {
            console.error('Get PostHog API key error:', error);
            throw error;
        }
    }

    async getPostHogApiHost() {
        try {
            return await this.request(API_ENDPOINTS.POSTHOG_API_HOST, {
                includeAuth: false
            });
        } catch (error) {
            console.error('Get PostHog API host error:', error);
            throw error;
        }
    }

    // Health check method
    async healthCheck() {
        try {
            const url = `${API_ENDPOINTS.VERCEL_BACKEND_URL}/api/healthcheck`;
            return await this.request(url, {
                includeAuth: false
            });
        } catch (error) {
            console.error('Health check error:', error);
            throw error;
        }
    }
}

// Create and export a singleton instance
const apiClient = new ApiClient();
export default apiClient;