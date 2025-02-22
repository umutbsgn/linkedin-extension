// posthog-init.js

import posthog from '../lib/posthog/posthog.js';

const POSTHOG_API_KEY = 'phc_xhWdv89FeaL8iaT13O5A8CL9zo6kyCGzRFCtihoZKUB';
const POSTHOG_API_HOST = 'https://eu.i.posthog.com';

export function initPostHog() {
    if (typeof posthog === 'undefined') {
        console.error('PostHog library not loaded');
        return;
    }

    try {
        posthog.init(POSTHOG_API_KEY, {
            api_host: POSTHOG_API_HOST,
            person_profiles: 'identified_only',
            loaded: function(posthog) {
                console.log('PostHog loaded successfully');
            },
        });

        console.log('PostHog initialized with API Key:', POSTHOG_API_KEY);
        console.log('PostHog API Host:', POSTHOG_API_HOST);
    } catch (error) {
        console.error('Error initializing PostHog:', error);
    }
}