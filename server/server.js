require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const apiRoutes = require('./routes/api');
const { db } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', apiRoutes);

// Serve static frontend assets (index.html, style.css, script.js, assets/)
const rootDir = path.join(__dirname, '..');
app.use(express.static(rootDir));

// SPA fallback for frontend root
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(rootDir, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
        success: false,
        error: 'An internal server error occurred.'
    });
});

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Lucid Stem Node.js Server running on port ${PORT}`);
    console.log(`📡 REST API endpoint available at http://localhost:${PORT}/api`);
    console.log(`====================================================`);
});
