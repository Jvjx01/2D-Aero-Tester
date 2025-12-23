import mongoose from 'mongoose';
import Test from './Test-model.js';

// MongoDB connection helper
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
        throw new Error('Please define the MONGODB_URI environment variable');
    }

    const connection = await mongoose.connect(MONGODB_URI);
    cachedDb = connection;
    return connection;
}

/**
 * Vercel Serverless Function for Saving Test Results
 * POST /api/save-test
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
        await connectToDatabase();

        const { shape, parameters, results } = req.body;

        // Create new Test document
        const newTest = new Test({
            shape,
            parameters,
            results
        });

        const savedTest = await newTest.save();
        res.status(201).json(savedTest);
    } catch (err) {
        console.error('Save test error:', err);
        res.status(500).json({ error: 'Failed to save test', details: err.message });
    }
}
