let currentWorkspaceId = null;

// Navigation functions
function showWorkspaceList() {
    hideAllViews();
    document.getElementById('workspace-list').classList.remove('hidden');
    loadWorkspaces();
}

function showAddWorkspace() {
    hideAllViews();
    document.getElementById('add-workspace-form').classList.remove('hidden');
    document.getElementById('workspace-name').value = '';
}

function showWorkspaceDetail(workspaceId) {
    hideAllViews();
    document.getElementById('workspace-detail').classList.remove('hidden');
    currentWorkspaceId = workspaceId;
    loadWorkspaceDetail(workspaceId);
}

function showAddAdmin() {
    hideAllViews();
    document.getElementById('add-admin-form').classList.remove('hidden');
    clearAdminForm();
}

function showAddUser() {
    hideAllViews();
    document.getElementById('add-user-form').classList.remove('hidden');
    clearUserForm();
}

function showCurrentWorkspace() {
    if (currentWorkspaceId) {
        showWorkspaceDetail(currentWorkspaceId);
    } else {
        showWorkspaceList();
    }
}

function hideAllViews() {
    const views = ['workspace-list', 'add-workspace-form', 'workspace-detail', 'add-admin-form', 'add-user-form'];
    views.forEach(viewId => {
        document.getElementById(viewId).classList.add('hidden');
    });
}

function clearAdminForm() {
    document.getElementById('admin-name').value = '';
    document.getElementById('admin-email').value = '';
    document.getElementById('admin-password').value = '';
}

function clearUserForm() {
    document.getElementById('user-name').value = '';
    document.getElementById('user-email').value = '';
    document.getElementById('user-password').value = '';
}

// Load all workspaces
async function loadWorkspaces() {
    try {
        const response = await fetch('/api/workspaces');
        const workspaces = await response.json();
        displayWorkspaces(workspaces);
    } catch (error) {
        console.error('Error loading workspaces:', error);
    }
}

// Display workspaces
function displayWorkspaces(workspaces) {
    const container = document.getElementById('workspaces-container');
    container.innerHTML = '';
    
    if (workspaces.length === 0) {
        container.innerHTML = '<p>No workspaces found. Create your first workspace!</p>';
        return;
    }
    
    workspaces.forEach(workspace => {
        const div = document.createElement('div');
        div.className = 'workspace-item';
        div.innerHTML = `
            <h3>${workspace.name}</h3>
            <p>Created: ${new Date(workspace.createdAt).toLocaleDateString()}</p>
            <p>Project ID: ${workspace.neonProjectId || 'N/A'}</p>
            <button class="btn btn-primary" onclick="showWorkspaceDetail('${workspace.id}')">Open Workspace</button>
            <button class="btn btn-danger" onclick="deleteWorkspace('${workspace.id}')">Delete</button>
        `;
        container.appendChild(div);
    });
}

// Load workspace detail
async function loadWorkspaceDetail(workspaceId) {
    try {
        const response = await fetch(`/api/workspace-data/${workspaceId}`);
        const data = await response.json();
        
        document.getElementById('workspace-title').textContent = data.workspace.name;
        displayAdmins(data.admins || []);
        displayUsers(data.users || []);
        
        if (data.needsSetup) {
            alert('This workspace database needs to be set up. Features may be limited.');
        }
    } catch (error) {
        console.error('Error loading workspace detail:', error);
        alert('Error loading workspace details');
    }
}

// Display admins
function displayAdmins(admins) {
    const container = document.getElementById('admins-container');
    container.innerHTML = '';
    
    if (admins.length === 0) {
        container.innerHTML = '<p>No admins found. Add the first admin!</p>';
        return;
    }
    
    admins.forEach(admin => {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.innerHTML = `
            <div class="user-info">
                <strong>${admin.name}</strong><br>
                <small>${admin.email} - ${admin.role}</small>
            </div>
            <div class="user-actions">
                <button class="btn btn-danger" onclick="deleteAdmin('${admin.id}')">Delete</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Display users
function displayUsers(users) {
    const container = document.getElementById('users-container');
    container.innerHTML = '';
    
    if (users.length === 0) {
        container.innerHTML = '<p>No users found. Add the first user!</p>';
        return;
    }
    
    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.innerHTML = `
            <div class="user-info">
                <strong>${user.name}</strong><br>
                <small>${user.email} - ${user.role}</small>
            </div>
            <div class="user-actions">
                <button class="btn btn-danger" onclick="deleteUser('${user.id}')">Delete</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Create new workspace
async function createWorkspace() {
    const name = document.getElementById('workspace-name').value.trim();
    
    if (!name) {
        alert('Please enter a workspace name');
        return;
    }
    
    const createBtn = document.getElementById('create-btn');
    const loadingMsg = document.getElementById('loading-msg');
    createBtn.classList.add('loading');
    createBtn.textContent = 'Creating...';
    createBtn.disabled = true;
    loadingMsg.classList.remove('hidden');
    
    try {
        const response = await fetch('/api/workspaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        
        if (response.ok) {
            alert('Workspace created successfully!');
            showWorkspaceList();
        } else {
            const error = await response.json();
            alert(`Error creating workspace: ${error.error}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error creating workspace. Check console for details.');
    } finally {
        createBtn.classList.remove('loading');
        createBtn.textContent = 'Create Workspace';
        createBtn.disabled = false;
        loadingMsg.classList.add('hidden');
    }
}

// Delete workspace
async function deleteWorkspace(id) {
    if (!confirm('Are you sure you want to delete this workspace?')) return;
    
    try {
        const response = await fetch(`/api/workspaces/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Workspace deleted successfully!');
            loadWorkspaces();
        } else {
            alert('Error deleting workspace');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting workspace');
    }
}

// Placeholder functions for admin/user operations
// Create admin
async function createAdmin() {
    const name = document.getElementById('admin-name').value.trim();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value.trim();
    
    if (!name || !email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        const response = await fetch(`/api/workspace-data/${currentWorkspaceId}/admins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        if (response.ok) {
            alert('Admin created successfully!');
            showCurrentWorkspace();
        } else {
            const error = await response.json();
            alert(`Error creating admin: ${error.error}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error creating admin');
    }
}

// Create user
async function createUser() {
    const name = document.getElementById('user-name').value.trim();
    const email = document.getElementById('user-email').value.trim();
    const password = document.getElementById('user-password').value.trim();
    
    if (!name || !email) {
        alert('Please enter name and email');
        return;
    }
    
    try {
        const response = await fetch(`/api/workspace-data/${currentWorkspaceId}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password: password || null })
        });
        
        if (response.ok) {
            alert('User created successfully!');
            showCurrentWorkspace();
        } else {
            const error = await response.json();
            alert(`Error creating user: ${error.error}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error creating user');
    }
}

// Delete admin
async function deleteAdmin(adminId) {
    if (!confirm('Are you sure you want to delete this admin?')) return;
    
    try {
        const response = await fetch(`/api/workspace-data/${currentWorkspaceId}/admins/${adminId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Admin deleted successfully!');
            showCurrentWorkspace();
        } else {
            alert('Error deleting admin');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting admin');
    }
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        const response = await fetch(`/api/workspace-data/${currentWorkspaceId}/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('User deleted successfully!');
            showCurrentWorkspace();
        } else {
            alert('Error deleting user');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting user');
    }
}
// Load workspaces on page load
document.addEventListener('DOMContentLoaded', showWorkspaceList);