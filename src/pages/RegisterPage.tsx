import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface RegisterPageProps {
    onSwitchToLogin: () => void;
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
    const { signUp, loading, error } = useAuth();
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        setSuccessMessage(null);

        // Validation
        if (!username.trim()) {
            setLocalError('Please enter a username');
            return;
        }

        if (username.trim().length < 3) {
            setLocalError('Username must be at least 3 characters');
            return;
        }

        if (!password) {
            setLocalError('Please enter a password');
            return;
        }

        if (password.length < 6) {
            setLocalError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }

        setIsSubmitting(true);
        const result = await signUp(
            username.trim(),
            password,
            displayName.trim() || username.trim(),
            inviteCode.trim() || undefined
        );
        setIsSubmitting(false);

        if (result.error) {
            setLocalError(result.error);
        } else {
            // Check if this was an admin registration (with invite code)
            const adminInviteCode = import.meta.env.VITE_ADMIN_INVITE_CODE;
            if (inviteCode.trim() === adminInviteCode) {
                setSuccessMessage('Account created successfully! You are now an admin. You can sign in.');
            } else {
                setSuccessMessage('Account created! Please wait for an administrator to approve your account.');
            }
            // Clear form
            setUsername('');
            setDisplayName('');
            setPassword('');
            setConfirmPassword('');
            setInviteCode('');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <h1 className="auth-title">Project Management</h1>
                <h2 className="auth-subtitle">Create Account</h2>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Choose a username (for login)"
                            autoComplete="username"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="displayName">Display Name</label>
                        <input
                            id="displayName"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your full name"
                            disabled={isSubmitting}
                        />
                        <small className="form-hint">
                            This name will be shown in avatars and dropdowns
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-input-wrapper">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Create a password"
                                autoComplete="new-password"
                                disabled={isSubmitting}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <div className="password-input-wrapper">
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm your password"
                                autoComplete="new-password"
                                disabled={isSubmitting}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                tabIndex={-1}
                            >
                                {showConfirmPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="inviteCode">Invite Code (Optional)</label>
                        <input
                            id="inviteCode"
                            type="text"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            placeholder="Enter invite code if you have one"
                            disabled={isSubmitting}
                        />
                        <small className="form-hint">
                            Leave empty if you don't have an invite code
                        </small>
                    </div>

                    {(localError || error) && (
                        <div className="auth-error">
                            {localError || error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="auth-success">
                            {successMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary auth-submit"
                        disabled={isSubmitting || loading}
                    >
                        {isSubmitting ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account?{' '}
                    <button
                        type="button"
                        className="auth-switch-link"
                        onClick={onSwitchToLogin}
                    >
                        Sign In
                    </button>
                </p>
            </div>
        </div>
    );
}
