/**
 * Example Express.js server integration
 * This file shows how to integrate the GitHub API endpoint into an Express.js server
 *
 * Deploy this to the backend server at https://letmetry.cloud
 */

import express from 'express';
import cors from 'cors';
import { handleCreateIssue } from './github-create-issue.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: ['https://letmetry.cloud', 'http://localhost:8080'],
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json({ limit: '100kb' })); // Reasonable limit for text submissions
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// GitHub issue creation endpoint
app.post('/github/create-issue', handleCreateIssue);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`GitHub API server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`GitHub Token configured: ${process.env.GITHUB_TOKEN ? 'Yes' : 'No'}`);
});

export default app;
