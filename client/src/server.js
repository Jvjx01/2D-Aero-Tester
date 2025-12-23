const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
// For now, we will use a local MongoDB URI if MONGODB_URI is not provided.
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wind-tunnel';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api', apiRoutes);

// Base route
app.get('/', (req, res) => {
    res.send('Wind Tunnel API Running');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
