import type { Task, TaskStatus } from '../types';

export const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

export const formatDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
};

export const createEmptyTask = (): Task => ({
    id: generateId(),
    task: '',
    userStory: '',
    acceptanceCriteria: '',
    owner: '',
    assign: '',
    status: 'To Do',
    createDate: new Date().toISOString(),
    estimateDate: '',
    notes: '',
    files: [],
    reviewer: '',
    review: ''
});

export const STATUS_OPTIONS: TaskStatus[] = ['To Do', 'In Progress', 'In Review', 'Done'];

export const STATUS_COLORS: Record<TaskStatus, string> = {
    'To Do': '#6b7280',
    'In Progress': '#3b82f6',
    'In Review': '#f59e0b',
    'Done': '#10b981'
};
