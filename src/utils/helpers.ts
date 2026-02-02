import type { TaskStatus, TaskGroup, Task, LegacyTask, LegacyTaskGroup } from '../types';

export const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
};

export const formatDateForInput = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
};

// Create empty task using legacy format for local state
export const createEmptyTask = (groupId: string): LegacyTask => ({
    id: generateId(),
    groupId,
    task: '',
    owner: '',
    assign: '',
    status: 'Not Started',
    createDate: new Date().toISOString(),
    estimateDate: '',
    notes: '',
    files: [],
    reviewer: '',
    review: ''
});

// Create task for Supabase format
export const createEmptyTaskForDB = (groupId: string): Partial<Task> => ({
    group_id: groupId,
    task: '',
    owner: '',
    assign: '',
    status: 'Not Started',
    create_date: new Date().toISOString().split('T')[0],
    estimate_date: null,
    notes: '',
    reviewer: '',
    review: '',
    locked_fields: {},
    sort_order: 0,
});

// Create empty group using legacy format for local state
export const createEmptyGroup = (): LegacyTaskGroup => ({
    id: generateId(),
    name: 'New Group',
    color: '#ec4899',
    startDate: new Date().toISOString(),
    endDate: '',
    isExpanded: true
});

// Create group for Supabase format
export const createEmptyGroupForDB = (): Partial<TaskGroup> => ({
    name: 'New Group',
    color: '#ec4899',
    start_date: new Date().toISOString().split('T')[0],
    end_date: null,
    is_expanded: true,
    sort_order: 0,
});

export const STATUS_OPTIONS: TaskStatus[] = ['Not Started', 'Working on it', 'Stucking', 'In Review', 'Done'];

export const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
    'Not Started': { bg: '#323338', text: '#ffffff' },
    'Working on it': { bg: '#fdab3d', text: '#ffffff' },
    'Stucking': { bg: '#e2445c', text: '#ffffff' },
    'In Review': { bg: '#a25ddc', text: '#ffffff' },
    'Done': { bg: '#00c875', text: '#ffffff' }
};

export const GROUP_COLORS = [
    '#ec4899', // pink
    '#8b5cf6', // purple
    '#3b82f6', // blue
    '#06b6d4', // cyan
    '#22c55e', // green
    '#f59e0b', // amber
    '#ef4444', // red
];

// Lockable field names for tasks
export const LOCKABLE_FIELDS = [
    'task',
    'owner',
    'assign',
    'status',
    'estimate_date',
    'notes',
    'reviewer',
    'review',
] as const;

export type LockableField = typeof LOCKABLE_FIELDS[number];
