// API endpoint for handling Stripe webhook events
import Stripe from 'stripe';
import { getStripeSecretKey, getStripeWebhookSecret, initSupabase } from './utils';
import { buffer } from 'micro';

// Disable body parsing, need the raw body for webhook signature verification
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get the raw body for webhook signature verification
        const stripePayload = await buffer(req);
        const stripePayloadString = stripePayload.toString();

        // Get Stripe configuration
        const stripeSecretKey = await getStripeSecretKey();
        const stripeWebhookSecret = await getStripeWebhookSecret();

        // Initialize Stripe
        const stripe = new Stripe(stripeSecretKey);

        // Get the Stripe signature from headers
        const sig = req.headers['stripe-signature'];
        if (!sig) {
            return res.status(400).json({ error: 'Missing Stripe signature' });
        }

        // Verify webhook signature
        let event;
        try {
            event = stripe.webhooks.constructEvent(stripePayloadString, sig, stripeWebhookSecret);
        } catch (err) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return res.status(400).json({ error: `Webhook Error: ${err.message}` });
        }

        // Initialize Supabase
        const supabase = initSupabase();

        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed':
                {
                    const session = event.data.object;
                    const userId = session.metadata.userId;
                    const subscriptionId = session.subscription;

                    // Get subscription details from Stripe
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

                    // Create subscription record in database
                    const { error } = await supabase
                    .from('user_subscriptions')
                    .insert([{
                        user_id: userId,
                        subscription_type: 'pro',
                        stripe_customer_id: session.customer,
                        stripe_subscription_id: subscriptionId,
                        status: subscription.status,
                        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
                    }]);

                    if (error) {
                        console.error('Error creating subscription record:', error);
                        return res.status(500).json({ error: 'Failed to create subscription record' });
                    }

                    console.log(`Subscription created for user ${userId}`);
                    break;
                }

            case 'customer.subscription.updated':
                {
                    const subscription = event.data.object;
                    const subscriptionId = subscription.id;

                    // Update subscription record in database
                    const { error } = await supabase
                    .from('user_subscriptions')
                    .update({
                        status: subscription.status,
                        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('stripe_subscription_id', subscriptionId);

                    if (error) {
                        console.error('Error updating subscription record:', error);
                        return res.status(500).json({ error: 'Failed to update subscription record' });
                    }

                    console.log(`Subscription ${subscriptionId} updated`);
                    break;
                }

            case 'customer.subscription.deleted':
                {
                    const subscription = event.data.object;
                    const subscriptionId = subscription.id;

                    // Mark subscription as canceled in database
                    const { error } = await supabase
                    .from('user_subscriptions')
                    .update({
                        status: 'canceled',
                        updated_at: new Date().toISOString()
                    })
                    .eq('stripe_subscription_id', subscriptionId);

                    if (error) {
                        console.error('Error marking subscription as canceled:', error);
                        return res.status(500).json({ error: 'Failed to mark subscription as canceled' });
                    }

                    console.log(`Subscription ${subscriptionId} canceled`);
                    break;
                }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        // Acknowledge receipt of the event
        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('Error handling webhook:', error);
        return res.status(500).json({ error: error.message });
    }
}