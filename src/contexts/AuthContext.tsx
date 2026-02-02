import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User, UserRole, UserStatus } from '../types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    signIn: (username: string, password: string) => Promise<{ error: string | null }>;
    signUp: (username: string, password: string, inviteCode?: string) => Promise<{ error: string | null }>;
    signOut: () => void;
    refreshUser: () => Promise<void>;
    isAdmin: boolean;
    isMod: boolean;
    isActive: boolean;
    canManageUsers: boolean;
    canLockCells: boolean;
    canDeleteContent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'pm_session';

interface StoredSession {
    userId: string;
    username: string;
    role: UserRole;
    status: UserStatus;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load session from localStorage
    const loadSession = useCallback(async () => {
        try {
            const sessionStr = localStorage.getItem(SESSION_KEY);
            if (!sessionStr) {
                setUser(null);
                return;
            }

            const session: StoredSession = JSON.parse(sessionStr);

            // Verify session is still valid by fetching user from DB
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.userId)
                .single();

            if (error || !data) {
                localStorage.removeItem(SESSION_KEY);
                setUser(null);
                return;
            }

            setUser(data as User);
        } catch (err) {
            console.error('Error loading session:', err);
            localStorage.removeItem(SESSION_KEY);
            setUser(null);
        }
    }, []);

    // Initialize auth state
    useEffect(() => {
        const init = async () => {
            await loadSession();
            setLoading(false);
        };
        init();
    }, [loadSession]);

    // Sign in with username and password
    const signIn = async (username: string, password: string): Promise<{ error: string | null }> => {
        try {
            setError(null);

            // Call login function in database
            const { data, error: loginError } = await supabase
                .rpc('login_user', {
                    p_username: username,
                    p_password: password,
                });

            if (loginError) {
                const errorMsg = 'Invalid username or password';
                setError(errorMsg);
                return { error: errorMsg };
            }

            if (!data || data.length === 0) {
                const errorMsg = 'Invalid username or password';
                setError(errorMsg);
                return { error: errorMsg };
            }

            const userData = data[0];

            // Check if user is locked
            if (userData.status === 'locked') {
                const errorMsg = 'Your account has been locked. Please contact an administrator.';
                setError(errorMsg);
                return { error: errorMsg };
            }

            // Fetch full user data
            const { data: fullUser, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userData.id)
                .single();

            if (fetchError || !fullUser) {
                const errorMsg = 'Error fetching user data';
                setError(errorMsg);
                return { error: errorMsg };
            }

            // Save session
            const session: StoredSession = {
                userId: fullUser.id,
                username: fullUser.username,
                role: fullUser.role,
                status: fullUser.status,
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            setUser(fullUser as User);

            // Log login action
            await supabase.rpc('log_audit', {
                p_user_id: fullUser.id,
                p_action: 'login',
                p_entity_type: 'user',
                p_entity_id: fullUser.id,
                p_entity_name: fullUser.username,
            });

            return { error: null };
        } catch (err) {
            const errorMsg = 'An unexpected error occurred';
            setError(errorMsg);
            return { error: errorMsg };
        }
    };

    // Sign up with username, password, and optional invite code
    const signUp = async (
        username: string,
        password: string,
        inviteCode?: string
    ): Promise<{ error: string | null }> => {
        try {
            setError(null);

            // Check if username already exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('username', username)
                .single();

            if (existingUser) {
                const errorMsg = 'Username already exists';
                setError(errorMsg);
                return { error: errorMsg };
            }

            // Determine role and status based on invite code
            const adminInviteCode = import.meta.env.VITE_ADMIN_INVITE_CODE;
            const isAdminInvite = inviteCode && inviteCode === adminInviteCode;

            const role: UserRole = isAdminInvite ? 'admin' : 'member';
            const status: UserStatus = isAdminInvite ? 'active' : 'pending';

            // Register user using database function
            const { data, error: registerError } = await supabase
                .rpc('register_user', {
                    p_username: username,
                    p_password: password,
                    p_role: role,
                    p_status: status,
                });

            if (registerError) {
                console.error('Registration error:', registerError);
                setError(registerError.message);
                return { error: registerError.message };
            }

            if (!data || data.length === 0) {
                const errorMsg = 'Registration failed';
                setError(errorMsg);
                return { error: errorMsg };
            }

            return { error: null };
        } catch (err) {
            const errorMsg = 'An unexpected error occurred during registration';
            setError(errorMsg);
            return { error: errorMsg };
        }
    };

    // Sign out
    const signOut = () => {
        // Log logout action before signing out
        if (user) {
            supabase.rpc('log_audit', {
                p_user_id: user.id,
                p_action: 'logout',
                p_entity_type: 'user',
                p_entity_id: user.id,
                p_entity_name: user.username,
            }).catch(console.error);
        }

        localStorage.removeItem(SESSION_KEY);
        setUser(null);
    };

    // Refresh user data
    const refreshUser = async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (!error && data) {
            setUser(data as User);

            // Update session
            const session: StoredSession = {
                userId: data.id,
                username: data.username,
                role: data.role,
                status: data.status,
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }
    };

    // Computed permissions
    const isAdmin = user?.role === 'admin';
    const isMod = user?.role === 'mod';
    const isActive = user?.status === 'active';
    const canManageUsers = isAdmin;
    const canLockCells = isAdmin || isMod;
    const canDeleteContent = isAdmin || isMod;

    const value: AuthContextType = {
        user,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        refreshUser,
        isAdmin,
        isMod,
        isActive,
        canManageUsers,
        canLockCells,
        canDeleteContent,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
