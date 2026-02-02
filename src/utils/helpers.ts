import type { Task, TaskStatus, TaskGroup } from '../types';

export const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
};

export const formatDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
};

export const createEmptyTask = (groupId: string): Task => ({
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

export const createEmptyGroup = (): TaskGroup => ({
    id: generateId(),
    name: 'New Group',
    color: '#ec4899',
    startDate: new Date().toISOString(),
    endDate: '',
    isExpanded: true
});

export const STATUS_OPTIONS: TaskStatus[] = ['Not Started', 'Working on it', 'In Review', 'Done'];

export const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
    'Not Started': { bg: '#f97316', text: '#ffffff' },
    'Working on it': { bg: '#06b6d4', text: '#ffffff' },
    'In Review': { bg: '#a855f7', text: '#ffffff' },
    'Done': { bg: '#22c55e', text: '#ffffff' }
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
