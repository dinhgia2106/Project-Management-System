import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import './Activity.css'

export default function Activity() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchLogs()
    }, [])

    const fetchLogs = async () => {
        try {
            const { data, error } = await supabase
                .from('activity_logs')
                .select(`
          *,
          user:profiles!activity_logs_user_id_fkey(display_name, email)
        `)
                .order('created_at', { ascending: false })
                .limit(100)

            if (error) throw error
            setLogs(data || [])
        } catch (error) {
            console.error('Error fetching activity logs:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatAction = (action) => {
        const actions = {
            create_project: 'Created project',
            update_project: 'Updated project',
            delete_project: 'Deleted project',
            create_sprint: 'Created sprint',
            update_sprint: 'Updated sprint',
            create_task: 'Created task',
            update_task: 'Updated task',
            approve_user: 'Approved user',
            reject_user: 'Rejected user',
            grant_mod: 'Granted mod role',
            revoke_mod: 'Revoked mod role',
            lock_field: 'Locked field',
            unlock_field: 'Unlocked field',
        }
        return actions[action] || action
    }

    const formatDate = (date) => {
        return new Date(date).toLocaleString()
    }

    if (loading) {
        return (
            <div className="activity">
                <header className="page-header">
                    <h1>Activity History</h1>
                </header>
                <p className="loading">Loading activity...</p>
            </div>
        )
    }

    return (
        <div className="activity">
            <header className="page-header">
                <h1>Activity History</h1>
                <p>Team activity and changes log</p>
            </header>

            <div className="activity-list">
                {logs.length === 0 ? (
                    <div className="empty-state">
                        <p>No activity recorded yet.</p>
                    </div>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className="activity-item">
                            <div className="activity-content">
                                <span className="activity-user">{log.user?.display_name}</span>
                                <span className="activity-action">{formatAction(log.action)}</span>
                                {log.details?.name && (
                                    <span className="activity-target">"{log.details.name}"</span>
                                )}
                            </div>
                            <span className="activity-time">{formatDate(log.created_at)}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
