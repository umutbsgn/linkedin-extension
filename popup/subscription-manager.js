// Subscription manager for the LinkedIn AI Assistant browser extension
import { getSubscriptionStatus, redirectToCheckout, cancelSubscription, updateApiKeySettings } from './stripe-client.js';

// Create subscription manager
export function createSubscriptionManager(container, supabase, showStatus, loadApiUsage) {
    // Create UI elements
    const subscriptionContainer = document.createElement('div');
    subscriptionContainer.className = 'subscription-container';

    // Add subscription container to parent container
    container.appendChild(subscriptionContainer);

    return {
        // Subscription status
        status: null,

        // Load subscription status
        async loadSubscriptionStatus() {
            try {
                showStatus('Loading subscription status...');

                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    throw new Error('No active session');
                }

                this.status = await getSubscriptionStatus(session.access_token);
                this.renderSubscriptionUI();

                // Load API usage if available
                if (loadApiUsage && typeof loadApiUsage === 'function') {
                    loadApiUsage();
                }

                showStatus('');
            } catch (error) {
                console.error('Error loading subscription status:', error);
                showStatus(`Error: ${error.message}`);

                // Render default UI
                this.status = { subscriptionType: 'trial', hasActiveSubscription: false };
                this.renderSubscriptionUI();
            }
        },

        // Render subscription UI
        renderSubscriptionUI() {
            const { subscriptionType, hasActiveSubscription, subscription, useOwnApiKey, apiKey } = this.status;

            // Clear container
            subscriptionContainer.innerHTML = '';

            // Create subscription header
            const header = document.createElement('h3');
            header.textContent = hasActiveSubscription ? 'Pro Subscription' : 'Trial Account';
            subscriptionContainer.appendChild(header);

            // Create subscription info
            const info = document.createElement('div');
            info.className = 'subscription-info';

            if (hasActiveSubscription) {
                // Pro subscription info
                info.innerHTML = `
                    <p>You have an active Pro subscription.</p>
                    <p>Status: <strong>${subscription.status}</strong></p>
                    <p>Current period ends: <strong>${new Date(subscription.currentPeriodEnd).toLocaleDateString()}</strong></p>
                `;

                // API key settings
                const apiKeyContainer = document.createElement('div');
                apiKeyContainer.className = 'api-key-container';

                const apiKeyToggle = document.createElement('div');
                apiKeyToggle.className = 'api-key-toggle';
                apiKeyToggle.innerHTML = `
                    <label>
                        <input type="checkbox" id="use-own-api-key" ${useOwnApiKey ? 'checked' : ''}>
                        Use my own Anthropic API key
                    </label>
                `;

                const apiKeyInput = document.createElement('div');
                apiKeyInput.className = 'api-key-input';
                apiKeyInput.style.display = useOwnApiKey ? 'block' : 'none';
                apiKeyInput.innerHTML = `
                    <input type="password" id="api-key" placeholder="Enter your Anthropic API key" value="${apiKey || ''}">
                    <button id="save-api-key">Save</button>
                `;

                apiKeyContainer.appendChild(apiKeyToggle);
                apiKeyContainer.appendChild(apiKeyInput);
                info.appendChild(apiKeyContainer);

                // Cancel subscription button
                const cancelButton = document.createElement('button');
                cancelButton.id = 'cancel-subscription';
                cancelButton.className = 'danger-button';
                cancelButton.textContent = 'Cancel Subscription';
                info.appendChild(cancelButton);
            } else {
                // Trial account info
                info.innerHTML = `
                    <p>You are currently using the trial version.</p>
                    <p>Upgrade to Pro for unlimited access and additional features.</p>
                `;

                // Upgrade button
                const upgradeButton = document.createElement('button');
                upgradeButton.id = 'upgrade-subscription';
                upgradeButton.className = 'primary-button';
                upgradeButton.textContent = 'Upgrade to Pro';
                info.appendChild(upgradeButton);
            }

            subscriptionContainer.appendChild(info);

            // Add event listeners
            this.addEventListeners();
        },

        // Add event listeners
        addEventListeners() {
            // Upgrade button
            const upgradeBtn = document.getElementById('upgrade-subscription');
            if (upgradeBtn) {
                upgradeBtn.addEventListener('click', async() => {
                    try {
                        showStatus('Redirecting to checkout...');

                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) {
                            throw new Error('No active session');
                        }

                        await redirectToCheckout(session.access_token);

                        showStatus('');
                    } catch (error) {
                        console.error('Error redirecting to checkout:', error);
                        showStatus(`Error: ${error.message}`);
                    }
                });
            }

            // Cancel subscription button
            const cancelSubscriptionBtn = document.getElementById('cancel-subscription');
            if (cancelSubscriptionBtn) {
                cancelSubscriptionBtn.addEventListener('click', async() => {
                    try {
                        if (!confirm('Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period.')) {
                            return;
                        }

                        showStatus('Canceling subscription...');

                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) {
                            throw new Error('No active session');
                        }

                        await cancelSubscription(session.access_token);

                        // Reload subscription status
                        await this.loadSubscriptionStatus();

                        showStatus('Subscription canceled successfully');
                        setTimeout(() => showStatus(''), 3000);
                    } catch (error) {
                        console.error('Error canceling subscription:', error);
                        showStatus(`Error: ${error.message}`);
                    }
                });
            }

            // API key toggle
            const apiKeyToggle = document.getElementById('use-own-api-key');
            const apiKeyInput = document.querySelector('.api-key-input');
            if (apiKeyToggle && apiKeyInput) {
                apiKeyToggle.addEventListener('change', () => {
                    apiKeyInput.style.display = apiKeyToggle.checked ? 'block' : 'none';
                });
            }

            // Save API key button
            const saveApiKeyBtn = document.getElementById('save-api-key');
            const apiKeyField = document.getElementById('api-key');
            if (saveApiKeyBtn && apiKeyField) {
                saveApiKeyBtn.addEventListener('click', async() => {
                    try {
                        const useOwnApiKey = document.getElementById('use-own-api-key').checked;
                        const apiKey = apiKeyField.value.trim();

                        if (useOwnApiKey && !apiKey) {
                            showStatus('Error: API key is required');
                            return;
                        }

                        showStatus('Saving API key settings...');

                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) {
                            throw new Error('No active session');
                        }

                        await updateApiKeySettings(session.access_token, useOwnApiKey, apiKey);

                        // Reload subscription status
                        await this.loadSubscriptionStatus();

                        showStatus('API key settings saved successfully');
                        setTimeout(() => showStatus(''), 3000);
                    } catch (error) {
                        console.error('Error saving API key settings:', error);
                        showStatus(`Error: ${error.message}`);
                    }
                });
            }
        }
    };
}