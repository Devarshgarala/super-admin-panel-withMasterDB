import React, { useEffect, useState } from 'react'

function WorkspaceList({ onAddClick, onOpen, onDelete }) {
  const [workspaces, setWorkspaces] = useState([])

  const load = async () => {
    const res = await fetch('/api/workspaces')
    const data = await res.json()
    setWorkspaces(data)
  }

  useEffect(() => { load() }, [])

  return (
    <div id="workspace-list">
      <button className="btn btn-primary" onClick={onAddClick}>Add New Workspace</button>
      <div id="workspaces-container">
        {workspaces.length === 0 && <p>No workspaces found. Create your first workspace!</p>}
        {workspaces.map(w => (
          <div key={w.id} className="workspace-item">
            <h3>{w.name}</h3>
            <p>Created: {new Date(w.createdAt).toLocaleDateString()}</p>
            <p>Project ID: {w.neonProjectId || 'N/A'}</p>
            <button className="btn btn-primary" onClick={() => onOpen(w.id)}>Open Workspace</button>
            <button className="btn btn-danger" onClick={async () => { await onDelete(w.id); await load() }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function AddWorkspace({ onCancel, onCreated }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const create = async () => {
    if (!name.trim()) { alert('Please enter a workspace name'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed') }
      alert('Workspace created successfully!')
      onCreated()
    } catch (e) {
      alert(`Error creating workspace: ${e.message}`)
    } finally { setLoading(false) }
  }

  return (
    <div id="add-workspace-form">
      <h2><span className="back-arrow" onClick={onCancel}>←</span>Add New Workspace</h2>
      <div className="form-group">
        <label>Workspace Name:</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter workspace name" />
      </div>
      <button className={`btn btn-primary ${loading ? 'loading' : ''}`} disabled={loading} onClick={create}>
        {loading ? 'Creating...' : 'Create Workspace'}
      </button>
      <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      {loading && <div>Creating Neon project... Please wait...</div>}
    </div>
  )
}

function WorkspaceDetail({ id, onBack }) {
  const [data, setData] = useState(null)
  const [view, setView] = useState('list') // list | add-admin | add-user

  const load = async () => {
    const res = await fetch(`/api/workspace-data/${id}`)
    const json = await res.json()
    setData(json)
    if (json.needsSetup) {
      alert('This workspace database needs to be set up. Features may be limited.')
    }
  }

  useEffect(() => { load() }, [id])

  const createAdmin = async (admin) => {
    const res = await fetch(`/api/workspace-data/${id}/admins`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(admin)
    })
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed') }
    await load()
    setView('list')
  }

  const createUser = async (user) => {
    const res = await fetch(`/api/workspace-data/${id}/users`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user)
    })
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed') }
    await load()
    setView('list')
  }

  const deleteAdmin = async (adminId) => {
    if (!confirm('Are you sure you want to delete this admin?')) return
    await fetch(`/api/workspace-data/${id}/admins/${adminId}`, { method: 'DELETE' })
    await load()
  }

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    await fetch(`/api/workspace-data/${id}/users/${userId}`, { method: 'DELETE' })
    await load()
  }

  if (!data) return <div>Loading...</div>

  return (
    <div id="workspace-detail">
      <h2><span className="back-arrow" onClick={onBack}>←</span><span id="workspace-title">{data.workspace.name}</span></h2>

      {view === 'list' && (
        <>
          <div className="data-section">
            <h3>Admins <button className="btn btn-success" onClick={() => setView('add-admin')}>Add Admin</button></h3>
            <div id="admins-container">
              {(!data.admins || data.admins.length === 0) && <p>No admins found. Add the first admin!</p>}
              {(data.admins || []).map(a => (
                <div key={a.id} className="user-item">
                  <div className="user-info">
                    <strong>{a.name}</strong><br />
                    <small>{a.email} - {a.role}</small>
                  </div>
                  <div className="user-actions">
                    <button className="btn btn-danger" onClick={() => deleteAdmin(a.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="data-section">
            <h3>Users <button className="btn btn-success" onClick={() => setView('add-user')}>Add User</button></h3>
            <div id="users-container">
              {(!data.users || data.users.length === 0) && <p>No users found. Add the first user!</p>}
              {(data.users || []).map(u => (
                <div key={u.id} className="user-item">
                  <div className="user-info">
                    <strong>{u.name}</strong><br />
                    <small>{u.email} - {u.role}</small>
                  </div>
                  <div className="user-actions">
                    <button className="btn btn-danger" onClick={() => deleteUser(u.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {view === 'add-admin' && (
        <AddAdmin onBack={() => setView('list')} onSubmit={createAdmin} />
      )}

      {view === 'add-user' && (
        <AddUser onBack={() => setView('list')} onSubmit={createUser} />
      )}
    </div>
  )
}

function AddAdmin({ onBack, onSubmit }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = async () => {
    if (!name || !email || !password) { alert('Please fill in all fields'); return }
    try { await onSubmit({ name, email, password }) } catch (e) { alert(`Error creating admin: ${e.message}`) }
  }

  return (
    <div id="add-admin-form">
      <h2><span className="back-arrow" onClick={onBack}>←</span>Add Admin</h2>
      <div className="form-group"><label>Name:</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Enter admin name" /></div>
      <div className="form-group"><label>Email:</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter admin email" /></div>
      <div className="form-group"><label>Password:</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" /></div>
      <button className="btn btn-primary" onClick={submit}>Create Admin</button>
      <button className="btn btn-secondary" onClick={onBack}>Cancel</button>
    </div>
  )
}

function AddUser({ onBack, onSubmit }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = async () => {
    if (!name || !email) { alert('Please enter name and email'); return }
    try { await onSubmit({ name, email, password: password || null }) } catch (e) { alert(`Error creating user: ${e.message}`) }
  }

  return (
    <div id="add-user-form">
      <h2><span className="back-arrow" onClick={onBack}>←</span>Add User</h2>
      <div className="form-group"><label>Name:</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Enter user name" /></div>
      <div className="form-group"><label>Email:</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter user email" /></div>
      <div className="form-group"><label>Password (Optional):</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" /></div>
      <button className="btn btn-primary" onClick={submit}>Create User</button>
      <button className="btn btn-secondary" onClick={onBack}>Cancel</button>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('list') // list | add | detail
  const [detailId, setDetailId] = useState(null)

  const openWorkspace = (id) => { setDetailId(id); setView('detail') }
  const deleteWorkspace = async (id) => {
    if (!confirm('Are you sure you want to delete this workspace?')) return
    await fetch(`/api/workspaces/${id}`, { method: 'DELETE' })
  }

  return (
    <div className="container">
      <h1>Super Admin Panel</h1>
      {view === 'list' && (
        <WorkspaceList
          onAddClick={() => setView('add')}
          onOpen={openWorkspace}
          onDelete={deleteWorkspace}
        />
      )}
      {view === 'add' && (
        <AddWorkspace
          onCancel={() => setView('list')}
          onCreated={() => setView('list')}
        />
      )}
      {view === 'detail' && (
        <WorkspaceDetail id={detailId} onBack={() => setView('list')} />)
      }
    </div>
  )
}