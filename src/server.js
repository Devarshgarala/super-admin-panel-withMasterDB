const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const workspaceRoutes = require('./routes/workspaces');
const workspaceDataRoutes = require('./routes/workspaceData');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspace-data', workspaceDataRoutes);

// Static serving: prefer React build if available, else fall back to /public
const reactBuildPath = path.join(__dirname, '../client/dist');
const publicPath = path.join(__dirname, '../public');

try {
    app.use(express.static(reactBuildPath));
    app.get('/', (req, res) => {
        res.sendFile(path.join(reactBuildPath, 'index.html'));
    });
    // SPA fallback for React Router
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) return next();
        res.sendFile(path.join(reactBuildPath, 'index.html'));
    });
} catch (e) {
    app.use(express.static(publicPath));
    app.get('/', (req, res) => {
        res.sendFile(path.join(publicPath, 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});