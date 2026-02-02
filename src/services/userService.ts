import { supabase } from '../lib/supabaseClient';
import type { User, UserRole, UserStatus } from '../types';

export interface UpdateUserData {
    role?: UserRole;
    status?: UserStatus;
}

// Get all users (admin/mod only due to RLS)
export async function getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching users:', error);
        throw error;
    }

    return data || [];
}

// Get pending users
export async function getPendingUsers(): Promise<User[]> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching pending users:', error);
        throw error;
    }

    return data || [];
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching user:', error);
        return null;
    }

    return data;
}

// Update user (role, status)
export async function updateUser(
    userId: string,
    updates: UpdateUserData,
    currentUserId: string
): Promise<User | null> {
    // Get old values for audit
    const oldUser = await getUserById(userId);

    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating user:', error);
        throw error;
    }

    // Log the action
    if (data && oldUser) {
        await supabase.rpc('log_audit', {
            p_user_id: currentUserId,
            p_action: 'update',
            p_entity_type: 'user',
            p_entity_id: userId,
            p_entity_name: data.username,
            p_old_values: { role: oldUser.role, status: oldUser.status },
            p_new_values: updates,
        });
    }

    return data;
}

// Approve pending user
export async function approveUser(
    userId: string,
    role: UserRole,
    currentUserId: string
): Promise<User | null> {
    const oldUser = await getUserById(userId);

    const { data, error } = await supabase
        .from('users')
        .update({ status: 'active', role })
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error approving user:', error);
        throw error;
    }

    // Log the action
    if (data && oldUser) {
        await supabase.rpc('log_audit', {
            p_user_id: currentUserId,
            p_action: 'approve',
            p_entity_type: 'user',
            p_entity_id: userId,
            p_entity_name: data.username,
            p_old_values: { role: oldUser.role, status: oldUser.status },
            p_new_values: { role, status: 'active' },
        });
    }

    return data;
}

// Reject pending user (delete)
export async function rejectUser(
    userId: string,
    currentUserId: string
): Promise<void> {
    const oldUser = await getUserById(userId);

    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

    if (error) {
        console.error('Error rejecting user:', error);
        throw error;
    }

    // Log the action
    if (oldUser) {
        await supabase.rpc('log_audit', {
            p_user_id: currentUserId,
            p_action: 'reject',
            p_entity_type: 'user',
            p_entity_id: userId,
            p_entity_name: oldUser.username,
            p_old_values: { role: oldUser.role, status: oldUser.status },
            p_new_values: null,
        });
    }
}

// Lock user account
export async function lockUser(
    userId: string,
    currentUserId: string
): Promise<User | null> {
    const oldUser = await getUserById(userId);

    const { data, error } = await supabase
        .from('users')
        .update({ status: 'locked' })
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error locking user:', error);
        throw error;
    }

    // Log the action
    if (data && oldUser) {
        await supabase.rpc('log_audit', {
            p_user_id: currentUserId,
            p_action: 'lock',
            p_entity_type: 'user',
            p_entity_id: userId,
            p_entity_name: data.username,
            p_old_values: { status: oldUser.status },
            p_new_values: { status: 'locked' },
        });
    }

    return data;
}

// Unlock user account
export async function unlockUser(
    userId: string,
    currentUserId: string
): Promise<User | null> {
    const oldUser = await getUserById(userId);

    const { data, error } = await supabase
        .from('users')
        .update({ status: 'active' })
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error unlocking user:', error);
        throw error;
    }

    // Log the action
    if (data && oldUser) {
        await supabase.rpc('log_audit', {
            p_user_id: currentUserId,
            p_action: 'unlock',
            p_entity_type: 'user',
            p_entity_id: userId,
            p_entity_name: data.username,
            p_old_values: { status: oldUser.status },
            p_new_values: { status: 'active' },
        });
    }

    return data;
}

// Delete user permanently
export async function deleteUser(
    userId: string,
    currentUserId: string
): Promise<void> {
    const oldUser = await getUserById(userId);

    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

    if (error) {
        console.error('Error deleting user:', error);
        throw error;
    }

    // Log the action
    if (oldUser) {
        await supabase.rpc('log_audit', {
            p_user_id: currentUserId,
            p_action: 'delete',
            p_entity_type: 'user',
            p_entity_id: userId,
            p_entity_name: oldUser.username,
            p_old_values: { username: oldUser.username, role: oldUser.role, status: oldUser.status },
            p_new_values: null,
        });
    }
}
