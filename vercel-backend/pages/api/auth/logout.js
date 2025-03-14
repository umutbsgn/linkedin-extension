// Logout endpoint
import authMiddleware from '../middleware/auth';

// Handler function for the logout endpoint
async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Since we're using JWT tokens which are stateless, there's no server-side
        // session to invalidate. The client is responsible for removing the token.
        // This endpoint is mainly for logging purposes and future extensibility.

        // Log the logout event
        console.log(`User logged out: ${req.user.email} (${req.user.userId})`);

        // Return success message
        return res.status(200).json({
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Wrap the handler with the auth middleware
export default authMiddleware(handler);