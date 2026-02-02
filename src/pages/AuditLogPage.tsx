import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { AuditLog, AuditAction, EntityType } from '../types';
import {
    getAuditLogs,
    formatAuditLogMessage,
    getChangedFields,
} from '../services/auditService';

interface AuditLogPageProps {
    onClose: () => void;
}

export function AuditLogPage({ onClose }: AuditLogPageProps) {
    const { isAdmin } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    // Filters
    const [actionFilter, setActionFilter] = useState<AuditAction | ''>('');
    const [entityFilter, setEntityFilter] = useState<EntityType | ''>('');
    const [dateFilter, setDateFilter] = useState<string>('');

    useEffect(() => {
        loadLogs();
    }, [actionFilter, entityFilter, dateFilter]);

    const loadLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: Record<string, unknown> = { limit: 100 };
            if (actionFilter) filters.action = actionFilter;
            if (entityFilter) filters.entityType = entityFilter;
            if (dateFilter) filters.startDate = dateFilter;

            const data = await getAuditLogs(filters);
            setLogs(data);
        } catch (err) {
            setError('Failed to load audit logs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const toggleExpand = (logId: string) => {
        setExpandedLogId(expandedLogId === logId ? null : logId);
    };

    const getActionClass = (action: AuditAction) => {
        switch (action) {
            case 'create': return 'action-create';
            case 'update': return 'action-update';
            case 'delete': return 'action-delete';
            case 'login':
            case 'logout': return 'action-auth';
            case 'approve': return 'action-approve';
            case 'reject': return 'action-reject';
            case 'lock': return 'action-lock';
            case 'unlock': return 'action-unlock';
            default: return '';
        }
    };

    if (!isAdmin) {
        return (
            <div className="audit-page">
                <div className="audit-header">
                    <h2>Access Denied</h2>
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
                <p>You don't have permission to view audit logs.</p>
            </div>
        );
    }

    return (
        <div className="audit-page-overlay">
            <div className="audit-page">
                <div className="audit-header">
                    <h2>Audit Log</h2>
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>

                <div className="audit-filters">
                    <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value as AuditAction | '')}
                        className="audit-filter-select"
                    >
                        <option value="">All Actions</option>
                        <option value="create">Create</option>
                        <option value="update">Update</option>
                        <option value="delete">Delete</option>
                        <option value="login">Login</option>
                        <option value="logout">Logout</option>
                        <option value="approve">Approve</option>
                        <option value="reject">Reject</option>
                        <option value="lock">Lock</option>
                        <option value="unlock">Unlock</option>
                    </select>

                    <select
                        value={entityFilter}
                        onChange={(e) => setEntityFilter(e.target.value as EntityType | '')}
                        className="audit-filter-select"
                    >
                        <option value="">All Entities</option>
                        <option value="task">Task</option>
                        <option value="group">Group</option>
                        <option value="user">User</option>
                        <option value="task_file">File</option>
                    </select>

                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="audit-filter-date"
                    />

                    <button className="btn btn-secondary" onClick={() => {
                        setActionFilter('');
                        setEntityFilter('');
                        setDateFilter('');
                    }}>
                        Clear Filters
                    </button>
                </div>

                {error && <div className="auth-error">{error}</div>}

                {loading ? (
                    <div className="audit-loading">Loading audit logs...</div>
                ) : (
                    <div className="audit-log-list">
                        {logs.length === 0 ? (
                            <div className="audit-empty">No audit logs found</div>
                        ) : (
                            logs.map((log) => (
                                <div key={log.id} className="audit-log-item">
                                    <div
                                        className="audit-log-summary"
                                        onClick={() => toggleExpand(log.id)}
                                    >
                                        <span className={`audit-action ${getActionClass(log.action)}`}>
                                            {log.action.toUpperCase()}
                                        </span>
                                        <span className="audit-message">
                                            {formatAuditLogMessage(log)}
                                        </span>
                                        <span className="audit-time">
                                            {formatDate(log.created_at)}
                                        </span>
                                        <span className="audit-expand">
                                            {expandedLogId === log.id ? '[-]' : '[+]'}
                                        </span>
                                    </div>

                                    {expandedLogId === log.id && (
                                        <div className="audit-log-details">
                                            <div className="audit-detail-row">
                                                <strong>User:</strong> {log.username || 'Unknown'}
                                            </div>
                                            <div className="audit-detail-row">
                                                <strong>Entity Type:</strong> {log.entity_type}
                                            </div>
                                            {log.entity_id && (
                                                <div className="audit-detail-row">
                                                    <strong>Entity ID:</strong> {log.entity_id}
                                                </div>
                                            )}
                                            {(log.old_values || log.new_values) && (
                                                <div className="audit-changes">
                                                    <strong>Changes:</strong>
                                                    <div className="audit-changes-list">
                                                        {getChangedFields(log.old_values, log.new_values).map(
                                                            (change, index) => (
                                                                <div key={index} className="audit-change-item">
                                                                    <span className="change-field">{change.field}:</span>
                                                                    <span className="change-old">
                                                                        {JSON.stringify(change.oldValue) ?? 'null'}
                                                                    </span>
                                                                    <span className="change-arrow">-&gt;</span>
                                                                    <span className="change-new">
                                                                        {JSON.stringify(change.newValue) ?? 'null'}
                                                                    </span>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            )}
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
