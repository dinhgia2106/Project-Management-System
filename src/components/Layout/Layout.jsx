import { useAuth } from '../../context/AuthContext'
import { Link, useLocation } from 'react-router-dom'
import './Layout.css'

export default function Layout({ children }) {
    const { profile, signOut, isAdmin, isMod, isAdminOrMod, isPending } = useAuth()
    const location = useLocation()

    if (isPending) {
        return (
            <div className="pending-container">
                <div className="pending-card">
                    <h1>Account Pending</h1>
                    <p>Your account is waiting for admin approval.</p>
                    <p>Please check back later or contact an administrator.</p>
                    <button onClick={signOut} className="btn-secondary">Sign Out</button>
                </div>
            </div>
        )
    }

    const navItems = [
        { path: '/', label: 'Dashboard' },
        { path: '/projects', label: 'Projects' },
        { path: '/activity', label: 'Activity' },
    ]

    if (isAdminOrMod) {
        navItems.push({ path: '/users', label: 'Users' })
    }

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>Scrum PM</h2>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <span className="user-name">{profile?.display_name}</span>
                        <span className={`user-role role-${profile?.role}`}>
                            {profile?.role?.toUpperCase()}
                        </span>
                    </div>
                    <button onClick={signOut} className="btn-logout">Sign Out</button>
                </div>
            </aside>

            <main className="main-content">
                {children}
            </main>
        </div>
    )
}
