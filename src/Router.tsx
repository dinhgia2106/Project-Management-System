import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import App from './App';

type AuthPage = 'login' | 'register';

export function AppRouter() {
    const { user, loading, isActive, signOut } = useAuth();
    const [authPage, setAuthPage] = useState<AuthPage>('login');

    // Show loading state
    if (loading) {
        return (
            <div className="app-loading">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    // Show auth pages if not logged in
    if (!user) {
        if (authPage === 'login') {
            return <LoginPage onSwitchToRegister={() => setAuthPage('register')} />;
        }
        return <RegisterPage onSwitchToLogin={() => setAuthPage('login')} />;
    }

    // Show pending message if user is not active
    if (!isActive) {
        return (
            <div className="pending-page">
                <div className="pending-container">
                    <h1>Account Pending</h1>
                    <p>Your account is waiting for administrator approval.</p>
                    <p>Please check back later or contact an administrator.</p>
                    <button
                        className="btn btn-secondary"
                        onClick={() => signOut()}
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    // Show main app if logged in and active
    return <App />;
}
