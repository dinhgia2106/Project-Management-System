import { supabase } from '../lib/supabaseClient';
import type { TaskGroup } from '../types';

// Get all task groups
export async function getTaskGroups(): Promise<TaskGroup[]> {
    const { data, error } = await supabase
        .from('task_groups')
        .select('*')
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Error fetching task groups:', error);
        throw error;
    }

    return data || [];
}

// Get task group by ID
export async function getTaskGroupById(groupId: string): Promise<TaskGroup | null> {
    const { data, error } = await supabase
        .from('task_groups')
        .select('*')
        .eq('id', groupId)
        .single();

    if (error) {
        console.error('Error fetching task group:', error);
        return null;
    }

    return data;
}

// Create task group
export async function createTaskGroup(
    group: Partial<TaskGroup>,
    userId: string
): Promise<TaskGroup> {
    const { data, error } = await supabase
        .from('task_groups')
        .insert({
            ...group,
            created_by: userId,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating task group:', error);
        throw error;
    }

    // Log the action
    await supabase.rpc('log_audit', {
        p_user_id: userId,
        p_action: 'create',
        p_entity_type: 'group',
        p_entity_id: data.id,
        p_entity_name: data.name,
        p_old_values: null,
        p_new_values: data,
    });

    return data;
}

// Update task group
export async function updateTaskGroup(
    groupId: string,
    updates: Partial<TaskGroup>,
    userId: string
): Promise<TaskGroup> {
    // Get old values for audit
    const oldGroup = await getTaskGroupById(groupId);

    const { data, error } = await supabase
        .from('task_groups')
        .update(updates)
        .eq('id', groupId)
        .select()
        .single();

    if (error) {
        console.error('Error updating task group:', error);
        throw error;
    }

    // Log the action
    await supabase.rpc('log_audit', {
        p_user_id: userId,
        p_action: 'update',
        p_entity_type: 'group',
        p_entity_id: groupId,
        p_entity_name: data.name,
        p_old_values: oldGroup,
        p_new_values: updates,
    });

    return data;
}

// Delete task group
export async function deleteTaskGroup(
    groupId: string,
    userId: string
): Promise<void> {
    const oldGroup = await getTaskGroupById(groupId);

    const { error } = await supabase
        .from('task_groups')
        .delete()
        .eq('id', groupId);

    if (error) {
        console.error('Error deleting task group:', error);
        throw error;
    }

    // Log the action
    if (oldGroup) {
        await supabase.rpc('log_audit', {
            p_user_id: userId,
            p_action: 'delete',
            p_entity_type: 'group',
            p_entity_id: groupId,
            p_entity_name: oldGroup.name,
            p_old_values: oldGroup,
            p_new_values: null,
        });
    }
}

// Reorder task groups
export async function reorderTaskGroups(
    groupIds: string[],
    userId: string
): Promise<void> {
    const updates = groupIds.map((id, index) => ({
        id,
        sort_order: index,
    }));

    for (const update of updates) {
        const { error } = await supabase
            .from('task_groups')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id);

        if (error) {
            console.error('Error reordering task groups:', error);
            throw error;
        }
    }

    // Log the reorder action
    await supabase.rpc('log_audit', {
        p_user_id: userId,
        p_action: 'update',
        p_entity_type: 'group',
        p_entity_id: null,
        p_entity_name: 'Group order',
        p_old_values: null,
        p_new_values: { order: groupIds },
    });
}
