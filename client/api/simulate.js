import { calculateDrag } from './physics-engine.js';

/**
 * Vercel Serverless Function for Physics Simulation
 * POST /api/simulate
 */
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { shape, parameters } = req.body;

        if (!shape || !shape.points || !parameters) {
            return res.status(400).json({
                error: 'Invalid input. Need shape.points and parameters.'
            });
        }

        const physicsResults = calculateDrag(shape.points, parameters);
        res.status(200).json(physicsResults);
    } catch (err) {
        console.error('Simulation error:', err);
        res.status(500).json({ error: 'Simulation failed', details: err.message });
    }
}
