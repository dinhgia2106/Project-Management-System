import { supabase } from '../lib/supabaseClient';
import type { Task } from '../types';

// Get all tasks
export async function getTasks(): Promise<Task[]> {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
    }

    return data || [];
}

// Get tasks by group ID
export async function getTasksByGroupId(groupId: string): Promise<Task[]> {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('group_id', groupId)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
    }

    return data || [];
}

// Get task by ID
export async function getTaskById(taskId: string): Promise<Task | null> {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

    if (error) {
        console.error('Error fetching task:', error);
        return null;
    }

    return data;
}

// Create task
export async function createTask(
    task: Partial<Task>,
    userId: string
): Promise<Task> {
    const { data, error } = await supabase
        .from('tasks')
        .insert({
            ...task,
            created_by: userId,
            locked_fields: task.locked_fields || {},
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating task:', error);
        throw error;
    }

    // Log the action
    await supabase.rpc('log_audit', {
        p_user_id: userId,
        p_action: 'create',
        p_entity_type: 'task',
        p_entity_id: data.id,
        p_entity_name: data.task,
        p_old_values: null,
        p_new_values: data,
    });

    return data;
}

// Update task
export async function updateTask(
    taskId: string,
    updates: Partial<Task>,
    userId: string,
    userRole: string
): Promise<Task> {
    // Get old values for audit and check locks
    const oldTask = await getTaskById(taskId);

    if (!oldTask) {
        throw new Error('Task not found');
    }

    // If user is member, check for locked fields
    if (userRole === 'member') {
        const lockedFields = oldTask.locked_fields || {};
        const attemptedLockedFields = Object.keys(updates).filter(
            field => lockedFields[field] === true
        );

        if (attemptedLockedFields.length > 0) {
            throw new Error(`Cannot edit locked fields: ${attemptedLockedFields.join(', ')}`);
        }
    }

    const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

    if (error) {
        console.error('Error updating task:', error);
        throw error;
    }

    // Log the action
    await supabase.rpc('log_audit', {
        p_user_id: userId,
        p_action: 'update',
        p_entity_type: 'task',
        p_entity_id: taskId,
        p_entity_name: data.task,
        p_old_values: oldTask,
        p_new_values: updates,
    });

    return data;
}

// Delete task
export async function deleteTask(
    taskId: string,
    userId: string
): Promise<void> {
    const oldTask = await getTaskById(taskId);

    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

    if (error) {
        console.error('Error deleting task:', error);
        throw error;
    }

    // Log the action
    if (oldTask) {
        await supabase.rpc('log_audit', {
            p_user_id: userId,
            p_action: 'delete',
            p_entity_type: 'task',
            p_entity_id: taskId,
            p_entity_name: oldTask.task,
            p_old_values: oldTask,
            p_new_values: null,
        });
    }
}

// Lock a field
export async function lockTaskField(
    taskId: string,
    fieldName: string,
    userId: string
): Promise<Task> {
    const oldTask = await getTaskById(taskId);

    if (!oldTask) {
        throw new Error('Task not found');
    }

    const updatedLockedFields = {
        ...oldTask.locked_fields,
        [fieldName]: true,
    };

    const { data, error } = await supabase
        .from('tasks')
        .update({
            locked_fields: updatedLockedFields,
            locked_by: userId,
        })
        .eq('id', taskId)
        .select()
        .single();

    if (error) {
        console.error('Error locking task field:', error);
        throw error;
    }

    // Log the action
    await supabase.rpc('log_audit', {
        p_user_id: userId,
        p_action: 'lock',
        p_entity_type: 'task',
        p_entity_id: taskId,
        p_entity_name: `${oldTask.task} - ${fieldName}`,
        p_old_values: { locked_fields: oldTask.locked_fields },
        p_new_values: { locked_fields: updatedLockedFields },
    });

    return data;
}

// Unlock a field
export async function unlockTaskField(
    taskId: string,
    fieldName: string,
    userId: string
): Promise<Task> {
    const oldTask = await getTaskById(taskId);

    if (!oldTask) {
        throw new Error('Task not found');
    }

    const updatedLockedFields = {
        ...oldTask.locked_fields,
        [fieldName]: false,
    };

    const { data, error } = await supabase
        .from('tasks')
        .update({
            locked_fields: updatedLockedFields,
        })
        .eq('id', taskId)
        .select()
        .single();

    if (error) {
        console.error('Error unlocking task field:', error);
        throw error;
    }

    // Log the action
    await supabase.rpc('log_audit', {
        p_user_id: userId,
        p_action: 'unlock',
        p_entity_type: 'task',
        p_entity_id: taskId,
        p_entity_name: `${oldTask.task} - ${fieldName}`,
        p_old_values: { locked_fields: oldTask.locked_fields },
        p_new_values: { locked_fields: updatedLockedFields },
    });

    return data;
}

// Check if a field is locked
export function isFieldLocked(task: Task, fieldName: string): boolean {
    return task.locked_fields?.[fieldName] === true;
}

// Get all locked fields for a task
export function getLockedFields(task: Task): string[] {
    return Object.entries(task.locked_fields || {})
        .filter(([, locked]) => locked)
        .map(([field]) => field);
}
