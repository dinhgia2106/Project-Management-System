import { useAuth } from '../../context/AuthContext'
import './Dashboard.css'

export default function Dashboard() {
    const { profile, isAdmin, isMod } = useAuth()

    return (
        <div className="dashboard">
            <header className="page-header">
                <h1>Dashboard</h1>
                <p>Welcome back, {profile?.display_name}!</p>
            </header>

            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-value">0</span>
                    <span className="stat-label">Active Projects</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">0</span>
                    <span className="stat-label">Active Sprints</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">0</span>
                    <span className="stat-label">My Tasks</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">0</span>
                    <span className="stat-label">Completed Today</span>
                </div>
            </div>

            {(isAdmin || isMod) && (
                <section className="quick-actions">
                    <h2>Quick Actions</h2>
                    <div className="actions-grid">
                        <button className="action-btn">Create Project</button>
                        <button className="action-btn">Create Sprint</button>
                        {isAdmin && <button className="action-btn">Manage Users</button>}
                    </div>
                </section>
            )}

            <section className="recent-activity">
                <h2>Recent Activity</h2>
                <div className="activity-empty">
                    <p>No recent activity to display.</p>
                </div>
            </section>
        </div>
    )
}
