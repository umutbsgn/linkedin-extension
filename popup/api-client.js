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
            console.log(`Making ${method} request to: ${url}`);

            const headers = await this.createHeaders(includeAuth);
            console.log('Request headers:', headers);

            const requestOptions = {
                method,
                headers
            };

            if (body) {
                requestOptions.body = JSON.stringify(body);
                console.log('Request body:', JSON.stringify(body, null, 2));
            }

            console.log('Sending request with options:', requestOptions);
            const response = await fetch(url, requestOptions);
            console.log(`Response status: ${response.status} ${response.statusText}`);

            // Handle authentication errors
            if (response.status === 401) {
                console.error('Authentication error:', response.statusText);
                await this.clearToken();
                throw new Error(`Authentication failed (401): ${response.statusText}. Please log in again.`);
            }

            // Handle other errors
            if (!response.ok) {
                let errorMessage = `Status: ${response.status} ${response.statusText}`;
                let errorDetails = '';

                try {
                    const errorData = await response.json();
                    console.error('Error response data:', errorData);
                    errorMessage += ` - ${errorData.error || errorData.message || 'Unknown error'}`;
                    errorDetails = JSON.stringify(errorData, null, 2);
                } catch (parseError) {
                    console.error('Error parsing error response:', parseError);
                    const errorText = await response.text().catch(() => '');
                    errorDetails = errorText || 'No response body';
                }

                const error = new Error(`API request failed: ${errorMessage}`);
                error.status = response.status;
                error.details = errorDetails;
                error.url = url;
                throw error;
            }

            // Parse response
            const data = await response.json();
            console.log('Response data:', JSON.stringify(data, null, 2));
            return data;
        } catch (error) {
            console.error(`API request error for ${endpoint}:`, error);
            // Add more context to the error
            if (!error.url) {
                error.url = endpoint.startsWith('http') ? endpoint : API_ENDPOINTS[endpoint] || endpoint;
            }
            throw error;
        }
    }

    // Authentication methods
    async login(email, password) {
        try {
            console.log(`Attempting login for email: ${email}`);
            console.log(`Using login endpoint: ${API_ENDPOINTS.LOGIN}`);

            const data = await this.request(API_ENDPOINTS.LOGIN, {
                method: 'POST',
                body: { email, password },
                includeAuth: false
            });

            // Handle Supabase response format
            if (data.access_token) {
                console.log('Login successful, received access token');
                await this.setToken(data.access_token);
                return { success: true, user: data.user };
            } else if (data.error) {
                console.error('Login error from server:', data.error);
                throw new Error(data.error_description || data.error || 'Login failed');
            } else {
                console.error('Login response missing access token:', data);
                throw new Error('No token received from server');
            }
        } catch (error) {
            console.error('Login error:', error);
            // Add more context to the error
            if (error.message.includes('API request failed')) {
                console.error('API request details:', {
                    endpoint: API_ENDPOINTS.LOGIN,
                    error: error.message,
                    status: error.status,
                    details: error.details,
                    url: error.url
                });
            }
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

            // Handle Supabase response format
            if (data.id) {
                return { success: true, message: 'Registration successful. Please check your email to confirm your account.' };
            } else if (data.error) {
                throw new Error(data.error_description || data.error || 'Registration failed');
            } else {
                return { success: true, message: data.message || 'Registration successful' };
            }
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
            // Get user ID from token
            const token = await this.getToken();
            if (!token) {
                throw new Error('Authentication required');
            }

            // Decode the JWT token to get the user ID
            const payload = token.split('.')[1];
            if (!payload) {
                throw new Error('Invalid token format');
            }

            // Decode the base64 payload
            const decodedPayload = JSON.parse(atob(payload));
            const userId = decodedPayload.sub || decodedPayload.user_id;

            if (!userId) {
                throw new Error('User ID not found in token');
            }

            // Format the request for the Supabase endpoint
            const response = await this.request(API_ENDPOINTS.USER_SETTINGS, {
                method: 'POST',
                body: {
                    userId,
                    token,
                    action: 'get'
                }
            });

            // If we get an array, return the first item
            if (Array.isArray(response) && response.length > 0) {
                return response[0];
            }

            // Otherwise, return the response as is
            return response;
        } catch (error) {
            console.error('Get user profile error:', error);
            throw error;
        }
    }

    async updateUserSettings(settings) {
        try {
            // Get user ID from token
            const token = await this.getToken();
            if (!token) {
                throw new Error('Authentication required');
            }

            // Decode the JWT token to get the user ID
            // JWT tokens are in the format: header.payload.signature
            // We need the payload part which is the second part
            const payload = token.split('.')[1];
            if (!payload) {
                throw new Error('Invalid token format');
            }

            // Decode the base64 payload
            const decodedPayload = JSON.parse(atob(payload));
            const userId = decodedPayload.sub || decodedPayload.user_id;

            if (!userId) {
                throw new Error('User ID not found in token');
            }

            // Format the request for the Supabase endpoint
            return await this.request(API_ENDPOINTS.USER_SETTINGS, {
                method: 'POST',
                body: {
                    userId,
                    token,
                    action: 'update',
                    data: settings
                }
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