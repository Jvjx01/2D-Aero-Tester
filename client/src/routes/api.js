const express = require('express');
const router = express.Router();
const Test = require('../models/Test');
const { calculateDrag } = require('../physics/engine');

// POST /api/simulate
router.post('/simulate', (req, res) => {
    try {
        const { shape, parameters } = req.body;
        if (!shape || !shape.points || !parameters) {
            return res.status(400).json({ error: 'Invalid input. Need shape.points and parameters.' });
        }

        const physicsResults = calculateDrag(shape.points, parameters);
        res.json(physicsResults);
    } catch (err) {
        console.error('Simulation error:', err);
        res.status(500).json({ error: 'Simulation failed' });
    }
});

// POST /api/save-test
router.post('/save-test', async (req, res) => {
    try {
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
        res.status(500).json({ error: 'Failed to save test' });
    }
});

// GET /api/tests
router.get('/tests', async (req, res) => {
    try {
        const tests = await Test.find().sort({ createdAt: -1 }).limit(10);
        res.json(tests);
    } catch (err) {
        console.error('Get tests error:', err);
        res.status(500).json({ error: 'Failed to retrieve tests' });
    }
});

module.exports = router;
