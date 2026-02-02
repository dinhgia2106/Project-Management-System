import { supabase } from '../lib/supabaseClient';
import type { AuditLog, AuditAction, EntityType } from '../types';

export interface AuditLogFilters {
    userId?: string;
    action?: AuditAction;
    entityType?: EntityType;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}

// Get audit logs with filters
export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLog[]> {
    let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

    if (filters.userId) {
        query = query.eq('user_id', filters.userId);
    }

    if (filters.action) {
        query = query.eq('action', filters.action);
    }

    if (filters.entityType) {
        query = query.eq('entity_type', filters.entityType);
    }

    if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
    }

    if (filters.limit) {
        query = query.limit(filters.limit);
    }

    if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching audit logs:', error);
        throw error;
    }

    return data || [];
}

// Get audit logs for a specific entity
export async function getAuditLogsForEntity(
    entityType: EntityType,
    entityId: string
): Promise<AuditLog[]> {
    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching audit logs for entity:', error);
        throw error;
    }

    return data || [];
}

// Get audit logs for a specific user
export async function getAuditLogsForUser(userId: string): Promise<AuditLog[]> {
    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching audit logs for user:', error);
        throw error;
    }

    return data || [];
}

// Get recent audit logs (last N entries)
export async function getRecentAuditLogs(limit: number = 50): Promise<AuditLog[]> {
    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching recent audit logs:', error);
        throw error;
    }

    return data || [];
}

// Format audit log for display
export function formatAuditLogMessage(log: AuditLog): string {
    const username = log.username || 'Unknown user';
    const entityName = log.entity_name || log.entity_id || 'unknown';

    switch (log.action) {
        case 'create':
            return `${username} created ${log.entity_type} "${entityName}"`;
        case 'update':
            return `${username} updated ${log.entity_type} "${entityName}"`;
        case 'delete':
            return `${username} deleted ${log.entity_type} "${entityName}"`;
        case 'login':
            return `${username} logged in`;
        case 'logout':
            return `${username} logged out`;
        case 'approve':
            return `${username} approved user "${entityName}"`;
        case 'reject':
            return `${username} rejected user "${entityName}"`;
        case 'lock':
            return `${username} locked ${log.entity_type} "${entityName}"`;
        case 'unlock':
            return `${username} unlocked ${log.entity_type} "${entityName}"`;
        default:
            return `${username} performed ${log.action} on ${log.entity_type}`;
    }
}

// Get changes between old and new values
export function getChangedFields(
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
    const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];

    if (!oldValues && !newValues) return changes;

    const allKeys = new Set([
        ...Object.keys(oldValues || {}),
        ...Object.keys(newValues || {}),
    ]);

    for (const key of allKeys) {
        const oldVal = oldValues?.[key];
        const newVal = newValues?.[key];

        // Skip internal fields
        if (['id', 'created_at', 'updated_at', 'created_by'].includes(key)) continue;

        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes.push({ field: key, oldValue: oldVal, newValue: newVal });
        }
    }

    return changes;
}
