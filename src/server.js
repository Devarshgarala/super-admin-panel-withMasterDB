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
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspace-data', workspaceDataRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});