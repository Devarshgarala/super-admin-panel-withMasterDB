const express = require('express');
const { masterPrisma } = require('../lib/prisma');
const NeonAPI = require('../lib/neon');
const router = express.Router();

const neonAPI = new NeonAPI(process.env.NEON_API_KEY);

// Get all workspaces
router.get('/', async (req, res) => {
    try {
        const workspaces = await masterPrisma.workspace.findMany();
        res.json(workspaces);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new workspace
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Workspace name is required' });
        }

        console.log(`Creating workspace: ${name}`);
        
        // Create new Neon project
        const neonProject = await neonAPI.createProject(name);
        console.log('Neon project created:', neonProject);
        
        // Get database URL
        const databaseUrl = await neonAPI.getDatabaseUrl(neonProject.id);
        console.log('Database URL received');
        
        // Save workspace to master database
        const workspace = await masterPrisma.workspace.create({
            data: { 
                name, 
                databaseUrl: databaseUrl,
                neonProjectId: neonProject.id
            }
        });

        // Setup the workspace database tables immediately
        console.log('Setting up workspace database tables...');
        const { setupWorkspaceDatabase } = require('../lib/workspaceSetup');
        await setupWorkspaceDatabase(databaseUrl);
        console.log('Workspace database setup completed');

        // Mirror into workspace-panel aggregator if configured
        try {
            const { upsertWorkspace } = require('../lib/aggregator');
            await upsertWorkspace(workspace);
        } catch (aggErr) {
            console.warn('Aggregator mirror failed (non-blocking):', aggErr.message);
        }

        console.log(`Workspace created successfully: ${workspace.name}`);
        res.json(workspace);
        
    } catch (error) {
        console.error('Error creating workspace:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Failed to create workspace. Check server logs for details.'
        });
    }
});

// Update workspace database URL
router.put('/:id/database-url', async (req, res) => {
    try {
        const { id } = req.params;
        const { databaseUrl } = req.body;
        
        const workspace = await masterPrisma.workspace.update({
            where: { id },
            data: { databaseUrl }
        });
        
        res.json({ message: 'Database URL updated', workspace });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Setup workspace database (separate endpoint)
router.post('/:id/setup', async (req, res) => {
    try {
        const { id } = req.params;
        
        const workspace = await masterPrisma.workspace.findUnique({
            where: { id }
        });
        
        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }
        
        const { setupWorkspaceDatabase } = require('../lib/workspaceSetup');
        await setupWorkspaceDatabase(workspace.databaseUrl);
        
        res.json({ message: 'Workspace database setup completed' });
    } catch (error) {
        console.error('Error setting up workspace:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete workspace
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Find workspace to get Neon project id
        const workspace = await masterPrisma.workspace.findUnique({ where: { id } });
        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        // Attempt to delete the Neon project first (if present)
        if (workspace.neonProjectId) {
            try {
                await neonAPI.deleteProject(workspace.neonProjectId);
            } catch (neonErr) {
                console.warn('Proceeding after Neon delete failure:', neonErr.message);
            }
        }

        // Mirror deletion into aggregator (best-effort)
        try {
            const { deleteWorkspaceCascade } = require('../lib/aggregator');
            await deleteWorkspaceCascade(id);
        } catch (aggErr) {
            console.warn('Aggregator delete failed (non-blocking):', aggErr.message);
        }

        await masterPrisma.workspace.delete({
            where: { id }
        });
        res.json({ message: 'Workspace deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;