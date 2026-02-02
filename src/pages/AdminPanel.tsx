import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { User, UserRole } from '../types';
import {
    getAllUsers,
    getPendingUsers,
    approveUser,
    rejectUser,
    lockUser,
    unlockUser,
    deleteUser,
    updateUser,
} from '../services/userService';

interface AdminPanelProps {
    onClose: () => void;
}

type TabType = 'pending' | 'all';

export function AdminPanel({ onClose }: AdminPanelProps) {
    const { user: currentUser, isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Load users
    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const [pending, all] = await Promise.all([
                getPendingUsers(),
                getAllUsers(),
            ]);
            setPendingUsers(pending);
            setAllUsers(all);
        } catch (err) {
            setError('Failed to load users');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId: string, role: UserRole) => {
        if (!currentUser) return;
        setActionLoading(userId);
        try {
            await approveUser(userId, role, currentUser.id);
            await loadUsers();
        } catch (err) {
            setError('Failed to approve user');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (userId: string) => {
        if (!currentUser) return;
        if (!window.confirm('Are you sure you want to reject this user?')) return;

        setActionLoading(userId);
        try {
            await rejectUser(userId, currentUser.id);
            await loadUsers();
        } catch (err) {
            setError('Failed to reject user');
        } finally {
            setActionLoading(null);
        }
    };

    const handleLock = async (userId: string) => {
        if (!currentUser) return;
        setActionLoading(userId);
        try {
            await lockUser(userId, currentUser.id);
            await loadUsers();
        } catch (err) {
            setError('Failed to lock user');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnlock = async (userId: string) => {
        if (!currentUser) return;
        setActionLoading(userId);
        try {
            await unlockUser(userId, currentUser.id);
            await loadUsers();
        } catch (err) {
            setError('Failed to unlock user');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (userId: string) => {
        if (!currentUser) return;
        if (!window.confirm('Are you sure you want to permanently delete this user?')) return;

        setActionLoading(userId);
        try {
            await deleteUser(userId, currentUser.id);
            await loadUsers();
        } catch (err) {
            setError('Failed to delete user');
        } finally {
            setActionLoading(null);
        }
    };

    const handleChangeRole = async (userId: string, newRole: UserRole) => {
        if (!currentUser) return;
        setActionLoading(userId);
        try {
            await updateUser(userId, { role: newRole }, currentUser.id);
            await loadUsers();
        } catch (err) {
            setError('Failed to change user role');
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'active': return 'badge-success';
            case 'pending': return 'badge-warning';
            case 'locked': return 'badge-danger';
            default: return '';
        }
    };

    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case 'admin': return 'badge-admin';
            case 'mod': return 'badge-mod';
            default: return 'badge-member';
        }
    };

    if (!isAdmin) {
        return (
            <div className="admin-panel">
                <div className="admin-panel-header">
                    <h2>Access Denied</h2>
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
                <p>You don't have permission to access this page.</p>
            </div>
        );
    }

    return (
        <div className="admin-panel-overlay">
            <div className="admin-panel">
                <div className="admin-panel-header">
                    <h2>User Management</h2>
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>

                <div className="admin-tabs">
                    <button
                        className={`admin-tab ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        Pending ({pendingUsers.length})
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        All Users ({allUsers.length})
                    </button>
                </div>

                {error && <div className="auth-error">{error}</div>}

                {loading ? (
                    <div className="admin-loading">Loading users...</div>
                ) : activeTab === 'pending' ? (
                    <div className="admin-user-list">
                        {pendingUsers.length === 0 ? (
                            <div className="admin-empty">No pending users</div>
                        ) : (
                            pendingUsers.map((user) => (
                                <div key={user.id} className="admin-user-card">
                                    <div className="admin-user-info">
                                        <span className="admin-username">{user.username}</span>
                                        <span className={`badge ${getStatusBadgeClass(user.status)}`}>
                                            {user.status}
                                        </span>
                                        <span className="admin-date">
                                            Registered: {formatDate(user.created_at)}
                                        </span>
                                    </div>
                                    <div className="admin-user-actions">
                                        <button
                                            className="btn btn-success btn-sm"
                                            onClick={() => handleApprove(user.id, 'member')}
                                            disabled={actionLoading === user.id}
                                        >
                                            Approve as Member
                                        </button>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleApprove(user.id, 'mod')}
                                            disabled={actionLoading === user.id}
                                        >
                                            Approve as Mod
                                        </button>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleReject(user.id)}
                                            disabled={actionLoading === user.id}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="admin-user-list">
                        {allUsers.length === 0 ? (
                            <div className="admin-empty">No users found</div>
                        ) : (
                            allUsers.map((user) => (
                                <div key={user.id} className="admin-user-card">
                                    <div className="admin-user-info">
                                        <span className="admin-username">{user.username}</span>
                                        <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                                            {user.role}
                                        </span>
                                        <span className={`badge ${getStatusBadgeClass(user.status)}`}>
                                            {user.status}
                                        </span>
                                        <span className="admin-date">
                                            {formatDate(user.created_at)}
                                        </span>
                                    </div>
                                    {user.id !== currentUser?.id && (
                                        <div className="admin-user-actions">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleChangeRole(user.id, e.target.value as UserRole)}
                                                disabled={actionLoading === user.id}
                                                className="admin-role-select"
                                            >
                                                <option value="member">Member</option>
                                                <option value="mod">Mod</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            {user.status === 'locked' ? (
                                                <button
                                                    className="btn btn-success btn-sm"
                                                    onClick={() => handleUnlock(user.id)}
                                                    disabled={actionLoading === user.id}
                                                >
                                                    Unlock
                                                </button>
                                            ) : user.status === 'active' ? (
                                                <button
                                                    className="btn btn-warning btn-sm"
                                                    onClick={() => handleLock(user.id)}
                                                    disabled={actionLoading === user.id}
                                                >
                                                    Lock
                                                </button>
                                            ) : null}
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDelete(user.id)}
                                                disabled={actionLoading === user.id}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
