import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import './Users.css'

export default function Users() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const { isAdmin, profile } = useAuth()

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setUsers(data || [])
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    const approveUser = async (userId) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: 'active', approved_by: profile.id })
                .eq('id', userId)

            if (error) throw error

            await supabase.rpc('log_activity', {
                p_action: 'approve_user',
                p_target_type: 'user',
                p_target_id: userId,
                p_details: {}
            })

            fetchUsers()
        } catch (error) {
            console.error('Error approving user:', error)
        }
    }

    const rejectUser = async (userId) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: 'blocked' })
                .eq('id', userId)

            if (error) throw error
            fetchUsers()
        } catch (error) {
            console.error('Error rejecting user:', error)
        }
    }

    const toggleMod = async (userId, currentRole) => {
        const newRole = currentRole === 'mod' ? 'member' : 'mod'
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId)

            if (error) throw error

            await supabase.rpc('log_activity', {
                p_action: newRole === 'mod' ? 'grant_mod' : 'revoke_mod',
                p_target_type: 'user',
                p_target_id: userId,
                p_details: {}
            })

            fetchUsers()
        } catch (error) {
            console.error('Error updating role:', error)
        }
    }

    const filteredUsers = users.filter(user => {
        if (filter === 'all') return true
        if (filter === 'pending') return user.status === 'pending'
        if (filter === 'active') return user.status === 'active'
        return true
    })

    const pendingCount = users.filter(u => u.status === 'pending').length

    if (loading) {
        return (
            <div className="users">
                <header className="page-header">
                    <h1>User Management</h1>
                </header>
                <p className="loading">Loading users...</p>
            </div>
        )
    }

    return (
        <div className="users">
            <header className="page-header">
                <h1>User Management</h1>
                <p>Manage team members and permissions</p>
            </header>

            <div className="users-toolbar">
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All ({users.length})
                    </button>
                    <button
                        className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilter('pending')}
                    >
                        Pending ({pendingCount})
                    </button>
                    <button
                        className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
                        onClick={() => setFilter('active')}
                    >
                        Active
                    </button>
                </div>
            </div>

            <div className="users-list">
                {filteredUsers.length === 0 ? (
                    <div className="empty-state">
                        <p>No users found.</p>
                    </div>
                ) : (
                    filteredUsers.map(user => (
                        <div key={user.id} className="user-card">
                            <div className="user-info">
                                <span className="user-name">{user.display_name}</span>
                                <span className="user-email">{user.email}</span>
                                <div className="user-badges">
                                    <span className={`badge role-${user.role}`}>{user.role}</span>
                                    <span className={`badge status-${user.status}`}>{user.status}</span>
                                </div>
                            </div>

                            <div className="user-actions">
                                {user.status === 'pending' && isAdmin && (
                                    <>
                                        <button
                                            className="btn-approve"
                                            onClick={() => approveUser(user.id)}
                                        >
                                            Approve
                                        </button>
                                        <button
                                            className="btn-reject"
                                            onClick={() => rejectUser(user.id)}
                                        >
                                            Reject
                                        </button>
                                    </>
                                )}

                                {user.status === 'active' && user.role !== 'admin' && isAdmin && user.id !== profile.id && (
                                    <button
                                        className="btn-toggle-mod"
                                        onClick={() => toggleMod(user.id, user.role)}
                                    >
                                        {user.role === 'mod' ? 'Revoke Mod' : 'Grant Mod'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
