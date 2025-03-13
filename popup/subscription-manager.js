// Subscription manager for the LinkedIn AI Assistant browser extension
import { getSubscriptionStatus, redirectToCheckout, cancelSubscription, updateApiKeySettings } from './stripe-client.js';

// Constants
const SUBSCRIPTION_TYPES = {
    TRIAL: 'trial',
    PRO: 'pro'
};

const MODELS = {
    HAIKU: 'Claude Haiku',
    SONNET: 'Claude Sonnet'
};

// Create subscription manager
export function createSubscriptionManager(container, supabase, showStatus, trackEvent, loadApiUsage) {
    return {
        // Reference to the container
        container,

        // Reference to the content div
        content: null,

        // Subscription status
        status: null,

        // Initialize the subscription manager
        initialize() {
            // Create content div
            this.content = document.createElement('div');
            this.content.className = 'subscription-content';
            this.container.appendChild(this.content);

            // Show loading message
            this.content.innerHTML = '<div class="loading-message">Loading subscription status...</div>';

            // Load subscription status
            this.loadSubscriptionStatus();
        },

        // Load subscription status
        async loadSubscriptionStatus() {
            try {
                // Get the auth token
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    console.error('No active session');
                    this.renderUnauthenticatedUI();
                    return;
                }

                // Show loading state
                this.content.innerHTML = '<div class="loading-message">Loading subscription status...</div>';

                // Get the subscription status
                this.status = await getSubscriptionStatus(session.access_token);

                // Render the UI
                this.renderSubscriptionUI();

                // Refresh API usage display
                if (loadApiUsage && typeof loadApiUsage === 'function') {
                    await loadApiUsage();
                }
            } catch (error) {
                console.error('Error loading subscription status:', error);
                this.content.innerHTML = `<div class="error-message">Error loading subscription status: ${error.message}</div>`;
            }
        },

        // Render unauthenticated UI
        renderUnauthenticatedUI() {
            this.content.innerHTML = `
                <div class="subscription-container">
                    <div class="subscription-header">
                        <h2>Subscription</h2>
                    </div>
                    <div class="subscription-message">
                        <p>Please log in to view your subscription status.</p>
                    </div>
                </div>
            `;
        },

        // Render subscription UI
        renderSubscriptionUI() {
            if (!this.status) {
                this.content.innerHTML = '<div class="error-message">No subscription status available</div>';
                return;
            }

            const { subscriptionType, hasActiveSubscription, useOwnApiKey, subscription } = this.status;

            // Determine the subscription status text and class
            let statusText = 'Free Trial';
            let statusClass = 'trial';
            let featuresHtml = '';
            let actionsHtml = '';

            if (subscriptionType === SUBSCRIPTION_TYPES.PRO) {
                statusText = 'Pro';
                statusClass = 'pro';

                // Add features for Pro subscription
                featuresHtml = `
                    <div class="subscription-features">
                        <h3>Pro Features</h3>
                        <ul>
                            <li>✅ 500 ${MODELS.HAIKU} API calls per month</li>
                            <li>✅ 500 ${MODELS.SONNET} API calls per month</li>
                            <li>✅ Use your own Anthropic API key</li>
                        </ul>
                    </div>
                `;

                // Add actions for Pro subscription
                if (hasActiveSubscription) {
                    // Show subscription details and cancel button
                    const endDate = subscription ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'Unknown';

                    actionsHtml = `
                        <div class="subscription-actions">
                            <div class="subscription-details">
                                <p>Your subscription will ${subscription && subscription.cancelAtPeriodEnd ? 'end' : 'renew'} on ${endDate}.</p>
                            </div>
                            <button id="cancelSubscriptionBtn" class="danger-button">Cancel Subscription</button>
                        </div>
                    `;
                }

                // Add API key settings for Pro users
                const apiKeySettingsHtml = `
                    <div class="api-key-settings">
                        <h3>API Key Settings</h3>
                        <div class="api-key-toggle">
                            <label>
                                <input type="checkbox" id="useOwnApiKeyToggle" ${useOwnApiKey ? 'checked' : ''}>
                                Use my own Anthropic API key
                            </label>
                        </div>
                        <div class="api-key-input" style="display: ${useOwnApiKey ? 'block' : 'none'}">
                            <input type="password" id="apiKeyInput" placeholder="Enter your Anthropic API key" value="${this.status.apiKey || ''}">
                            <button id="saveApiKeyBtn" class="primary-button">Save</button>
                        </div>
                    </div>
                `;

                featuresHtml += apiKeySettingsHtml;
            } else {
                // Add features for Trial subscription
                featuresHtml = `
                    <div class="subscription-features">
                        <h3>Trial Features</h3>
                        <ul>
                            <li>✅ 50 ${MODELS.HAIKU} API calls per month</li>
                            <li>❌ No access to ${MODELS.SONNET}</li>
                            <li>❌ Cannot use your own API key</li>
                        </ul>
                    </div>
                    
                    <div class="subscription-features">
                        <h3>Pro Features</h3>
                        <ul>
                            <li>✅ 500 ${MODELS.HAIKU} API calls per month</li>
                            <li>✅ 500 ${MODELS.SONNET} API calls per month</li>
                            <li>✅ Use your own Anthropic API key</li>
                        </ul>
                    </div>
                `;

                // Add upgrade button for Trial subscription
                actionsHtml = `
                    <div class="subscription-actions">
                        <button id="upgradeBtn" class="primary-button">Upgrade to Pro for €10/month</button>
                    </div>
                `;
            }

            // Render the subscription UI
            this.content.innerHTML = `
                <div class="subscription-container">
                    <div class="subscription-header">
                        <h2>Subscription</h2>
                        <div class="subscription-status ${statusClass}">
                            <span>${statusText}</span>
                        </div>
                    </div>
                    
                    ${featuresHtml}
                    ${actionsHtml}
                </div>
            `;

            // Add event listeners
            this.addEventListeners();
        },

        // Add event listeners
        addEventListeners() {
            // Upgrade button
            const upgradeBtn = this.content.querySelector('#upgradeBtn');
            if (upgradeBtn) {
                upgradeBtn.addEventListener('click', async() => {
                    try {
                        // Disable button and show loading state
                        upgradeBtn.disabled = true;
                        upgradeBtn.textContent = 'Redirecting to checkout...';

                        // Track upgrade click event for analytics
                        if (trackEvent) {
                            trackEvent('Subscription_Upgrade_Click');
                        }

                        // Get the auth token from Supabase
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) {
                            throw new Error('No active session');
                        }

                        try {
                            // Redirect to Stripe checkout
                            await redirectToCheckout(session.access_token);
                        } catch (checkoutError) {
                            console.error('Checkout error details:', checkoutError);

                            // Show user-friendly error message
                            if (checkoutError.message.includes('Invalid response format from server')) {
                                showStatus('Server error: Could not create checkout session. Please try again later or contact support.', 'error');
                            } else {
                                showStatus(`Error: ${checkoutError.message}`, 'error');
                            }
                        }
                    } catch (error) {
                        console.error('Error upgrading subscription:', error);
                        showStatus(`Error: ${error.message}`, 'error');
                    } finally {
                        // Reset button state
                        upgradeBtn.disabled = false;
                        upgradeBtn.textContent = 'Upgrade to Pro for €10/month';
                    }
                });
            }

            // Cancel subscription button
            const cancelBtn = this.content.querySelector('#cancelSubscriptionBtn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', async() => {
                    try {
                        // Confirm cancellation
                        if (!confirm('Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period.')) {
                            return;
                        }

                        // Disable button and show loading state
                        cancelBtn.disabled = true;
                        cancelBtn.textContent = 'Canceling...';

                        // Track cancel click event for analytics
                        if (trackEvent) {
                            trackEvent('Subscription_Cancel_Click');
                        }

                        // Get the auth token from Supabase
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) {
                            throw new Error('No active session');
                        }

                        // Cancel subscription
                        const result = await cancelSubscription(session.access_token);

                        // Show success message
                        showStatus('Subscription canceled. You will have access until the end of your current billing period.', 'success');

                        // Reload subscription status
                        await this.loadSubscriptionStatus();
                    } catch (error) {
                        console.error('Error canceling subscription:', error);
                        showStatus(`Error: ${error.message}`, 'error');
                    } finally {
                        // Reset button state if it still exists
                        if (cancelBtn) {
                            cancelBtn.disabled = false;
                            cancelBtn.textContent = 'Cancel Subscription';
                        }
                    }
                });
            }

            // API key toggle
            const apiKeyToggle = this.content.querySelector('#useOwnApiKeyToggle');
            const apiKeyInput = this.content.querySelector('.api-key-input');
            if (apiKeyToggle && apiKeyInput) {
                apiKeyToggle.addEventListener('change', () => {
                    apiKeyInput.style.display = apiKeyToggle.checked ? 'block' : 'none';
                });
            }

            // Save API key button
            const saveApiKeyBtn = this.content.querySelector('#saveApiKeyBtn');
            if (saveApiKeyBtn) {
                saveApiKeyBtn.addEventListener('click', async() => {
                    try {
                        // Disable button and show loading state
                        saveApiKeyBtn.disabled = true;
                        saveApiKeyBtn.textContent = 'Saving...';

                        // Get form values
                        const useOwnApiKey = this.content.querySelector('#useOwnApiKeyToggle').checked;
                        const apiKey = this.content.querySelector('#apiKeyInput').value.trim();

                        // Validate API key if using own key
                        if (useOwnApiKey && !apiKey) {
                            showStatus('Please enter your Anthropic API key', 'error');
                            return;
                        }

                        // Get the auth token from Supabase
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) {
                            throw new Error('No active session');
                        }

                        // Update API key settings
                        const result = await updateApiKeySettings(session.access_token, useOwnApiKey, apiKey);

                        // Show success message
                        showStatus('API key settings updated successfully', 'success');

                        // Reload subscription status
                        await this.loadSubscriptionStatus();
                    } catch (error) {
                        console.error('Error updating API key settings:', error);
                        showStatus(`Error: ${error.message}`, 'error');
                    } finally {
                        // Reset button state if it still exists
                        if (saveApiKeyBtn) {
                            saveApiKeyBtn.disabled = false;
                            saveApiKeyBtn.textContent = 'Save';
                        }
                    }
                });
            }
        }
    };
}