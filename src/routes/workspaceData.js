const express = require('express');
const { masterPrisma } = require('../lib/prisma');
const { dynamicPrismaManager } = require('../lib/dynamicPrisma');
const router = express.Router();

// Get workspace details with users and admins
router.get('/:workspaceId', async (req, res) => {
    try {
        const { workspaceId } = req.params;
        
        const workspace = await masterPrisma.workspace.findUnique({
            where: { id: workspaceId }
        });

        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        const workspaceClient = dynamicPrismaManager.getClient(workspace.databaseUrl);
        
        try {
            const [admins, users] = await Promise.all([
                workspaceClient.admin.findMany(),
                workspaceClient.user.findMany()
            ]);

            res.json({
                workspace,
                admins,
                users
            });
        } catch (dbError) {
            console.log('Workspace DB not initialized:', dbError.message);
            
            // Auto-setup the workspace database if tables don't exist
            if (dbError.message.includes('relation') && dbError.message.includes('does not exist')) {
                try {
                    console.log('Auto-setting up workspace database...');
                    const { setupWorkspaceDatabase } = require('../lib/workspaceSetup');
                    await setupWorkspaceDatabase(workspace.databaseUrl);
                    console.log('Workspace database auto-setup completed');
                    
                    // Try again after setup
                    const [admins, users] = await Promise.all([
                        workspaceClient.admin.findMany(),
                        workspaceClient.user.findMany()
                    ]);
                    
                    res.json({
                        workspace,
                        admins,
                        users,
                        message: 'Database was auto-configured'
                    });
                    
                } catch (setupError) {
                    console.error('Auto-setup failed:', setupError);
                    res.json({
                        workspace,
                        admins: [],
                        users: [],
                        needsSetup: true,
                        error: 'Database setup required'
                    });
                }
            } else {
                res.json({
                    workspace,
                    admins: [],
                    users: [],
                    needsSetup: true
                });
            }
        }
    } catch (error) {
        console.error('Error fetching workspace data:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create admin
router.post('/:workspaceId/admins', async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }

        const workspace = await masterPrisma.workspace.findUnique({
            where: { id: workspaceId }
        });

        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        const workspaceClient = dynamicPrismaManager.getClient(workspace.databaseUrl);
        
        const adminResult = await workspaceClient.admin.create({
            data: { name, email, password }
        });

        const admin = Array.isArray(adminResult) ? adminResult[0] : adminResult;

        // Update aggregator registry tables list (best-effort)
        try {
            const { upsertWorkspace } = require('../lib/aggregator');
            const { listPublicTables } = require('../lib/workspaceIntrospect');
            const tables = await listPublicTables(workspace.databaseUrl);
            await upsertWorkspace(workspace, tables);
        } catch (aggErr) {
            console.warn('Aggregator registry update failed (non-blocking):', aggErr.message);
        }

        res.json(admin);
    } catch (error) {
        console.error('Error creating admin:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create user
router.post('/:workspaceId/users', async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const { name, email, password } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const workspace = await masterPrisma.workspace.findUnique({
            where: { id: workspaceId }
        });

        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        const workspaceClient = dynamicPrismaManager.getClient(workspace.databaseUrl);
        
        const userResult = await workspaceClient.user.create({
            data: { 
                name, 
                email, 
                password: password || null 
            }
        });

        const user = Array.isArray(userResult) ? userResult[0] : userResult;

        // Update aggregator registry tables list (best-effort)
        try {
            const { upsertWorkspace } = require('../lib/aggregator');
            const { listPublicTables } = require('../lib/workspaceIntrospect');
            const tables = await listPublicTables(workspace.databaseUrl);
            await upsertWorkspace(workspace, tables);
        } catch (aggErr) {
            console.warn('Aggregator registry update failed (non-blocking):', aggErr.message);
        }

        res.json(user);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete admin
router.delete('/:workspaceId/admins/:adminId', async (req, res) => {
    try {
        const { workspaceId, adminId } = req.params;

        const workspace = await masterPrisma.workspace.findUnique({
            where: { id: workspaceId }
        });

        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        const workspaceClient = dynamicPrismaManager.getClient(workspace.databaseUrl);
        
        await workspaceClient.admin.delete({
            where: { id: adminId }
        });

        // Update aggregator registry tables list (best-effort)
        try {
            const { upsertWorkspace } = require('../lib/aggregator');
            const { listPublicTables } = require('../lib/workspaceIntrospect');
            const tables = await listPublicTables(workspace.databaseUrl);
            await upsertWorkspace(workspace, tables);
        } catch (aggErr) {
            console.warn('Aggregator registry update failed (non-blocking):', aggErr.message);
        }

        res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
        console.error('Error deleting admin:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete user
router.delete('/:workspaceId/users/:userId', async (req, res) => {
    try {
        const { workspaceId, userId } = req.params;

        const workspace = await masterPrisma.workspace.findUnique({
            where: { id: workspaceId }
        });

        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        const workspaceClient = dynamicPrismaManager.getClient(workspace.databaseUrl);
        
        await workspaceClient.user.delete({
            where: { id: userId }
        });

        // Update aggregator registry tables list (best-effort)
        try {
            const { upsertWorkspace } = require('../lib/aggregator');
            const { listPublicTables } = require('../lib/workspaceIntrospect');
            const tables = await listPublicTables(workspace.databaseUrl);
            await upsertWorkspace(workspace, tables);
        } catch (aggErr) {
            console.warn('Aggregator registry update failed (non-blocking):', aggErr.message);
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;