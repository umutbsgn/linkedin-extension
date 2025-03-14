// Authentication middleware for API routes
import jwt from 'jsonwebtoken';

// Secret key for JWT token verification
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function verifyToken(token) {
    try {
        // Verify the token and return the decoded data
        const decoded = jwt.verify(token, JWT_SECRET);
        return { valid: true, data: decoded };
    } catch (error) {
        console.error('Token verification error:', error);
        return { valid: false, error: error.message };
    }
}

export default function authMiddleware(handler) {
    return async(req, res) => {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Get authorization header
        const authHeader = req.headers.authorization;

        // Check if authorization header exists and has the correct format
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
        }

        // Extract token from header
        const token = authHeader.substring(7);

        // Verify token
        const { valid, data, error } = verifyToken(token);

        if (!valid) {
            return res.status(401).json({ error: `Unauthorized: ${error}` });
        }

        // Add user data to request object
        req.user = data;

        // Call the original handler
        return handler(req, res);
    };
}