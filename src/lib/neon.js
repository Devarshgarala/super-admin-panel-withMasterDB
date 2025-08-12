const axios = require('axios');

const NEON_API_BASE = 'https://console.neon.tech/api/v2';

class NeonAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    async createProject(projectName, retries = 3) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`Creating Neon project (attempt ${attempt}/${retries}): ${projectName}`);
                
                const response = await axios.post(
                    `${NEON_API_BASE}/projects`,
                    {
                        project: {
                            name: projectName,
                            org_id: process.env.NEON_ORG_ID
                        }
                    },
                    { 
                        headers: this.headers,
                        timeout: 30000
                    }
                );
                
                console.log('Neon project created successfully');
                return response.data.project;
                
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error.code || error.message);
                
                if (attempt === retries) {
                    throw new Error(`Failed to create Neon project after ${retries} attempts: ${error.response?.data?.message || error.message}`);
                }
                
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    async getDatabaseUrl(projectId) {
        try {
            console.log(`Getting connection string for project: ${projectId}`);
            
            // Get connection URI directly
            const response = await axios.get(
                `${NEON_API_BASE}/projects/${projectId}/connection_uri`,
                { 
                    headers: this.headers,
                    params: {
                        database_name: 'neondb',
                        role_name: 'neondb_owner'
                    }
                }
            );
            
            if (response.data && response.data.uri) {
                console.log('Got connection string successfully');
                return response.data.uri;
            }
            
            throw new Error('No connection URI in response');
            
        } catch (error) {
            console.error('Error getting connection URI:', error.response?.data || error.message);
            
            // Fallback: try to get project details and construct URL
            try {
                const projectResponse = await axios.get(
                    `${NEON_API_BASE}/projects/${projectId}`,
                    { headers: this.headers }
                );
                
                const project = projectResponse.data.project;
                console.log('Project details:', project);
                
                // Wait a bit for the project to be fully ready
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                throw new Error('Unable to get database connection string. Please check your Neon project manually.');
                
            } catch (fallbackError) {
                throw new Error('Failed to get database connection string');
            }
        }
    }

    async deleteProject(projectId) {
        try {
            console.log(`Deleting Neon project: ${projectId}`);
            await axios.delete(
                `${NEON_API_BASE}/projects/${projectId}`,
                { headers: this.headers }
            );
            console.log('Neon project deleted successfully');
            return true;
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            console.error('Error deleting Neon project:', message);
            throw new Error(`Failed to delete Neon project: ${message}`);
        }
    }
}

module.exports = NeonAPI;