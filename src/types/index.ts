// Task Status
export type TaskStatus = 'Not Started' | 'Working on it' | 'Stucking' | 'In Review' | 'Done';

// User Role and Status
export type UserRole = 'admin' | 'mod' | 'member';
export type UserStatus = 'pending' | 'active' | 'locked';

// Audit Action Types
export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'approve' | 'reject' | 'lock' | 'unlock';
export type EntityType = 'task' | 'group' | 'user' | 'task_file';

// User interface
export interface User {
    id: string;
    username: string;
    role: UserRole;
    status: UserStatus;
    created_at: string;
    updated_at: string;
}

// Task File interface
export interface TaskFile {
    id: string;
    task_id: string;
    name: string;
    size: number;
    type: string;
    url?: string;
    added_by?: string;
    added_at: string;
}

// Task interface
export interface Task {
    id: string;
    group_id: string;
    task: string;
    owner: string;
    assign: string;
    user_story: string;
    acceptance_criteria: string;
    status: TaskStatus;
    create_date: string;
    estimate_date: string | null;
    notes: string;
    reviewer: string;
    review: string;
    sort_order: number;
    locked_fields: Record<string, boolean>;
    locked_by?: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
    files?: TaskFile[];
}

// Task Group interface
export interface TaskGroup {
    id: string;
    name: string;
    color: string;
    start_date: string | null;
    end_date: string | null;
    is_expanded: boolean;
    sort_order: number;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

// Audit Log interface
export interface AuditLog {
    id: string;
    user_id: string | null;
    username: string | null;
    action: AuditAction;
    entity_type: EntityType;
    entity_id: string | null;
    entity_name: string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}

// Legacy types for backward compatibility during migration
export interface LegacyTaskFile {
    id: string;
    name: string;
    size: number;
    type: string;
    addedAt: string;
}

export interface LegacyTask {
    id: string;
    groupId: string;
    task: string;
    owner: string;
    assign: string;
    status: TaskStatus;
    createDate: string;
    estimateDate: string;
    notes: string;
    files: LegacyTaskFile[];
    reviewer: string;
    review: string;
}

export interface LegacyTaskGroup {
    id: string;
    name: string;
    color: string;
    startDate: string;
    endDate: string;
    isExpanded: boolean;
}

// Conversion helpers
export function convertLegacyTask(legacy: LegacyTask): Partial<Task> {
    return {
        id: legacy.id,
        group_id: legacy.groupId,
        task: legacy.task,
        owner: legacy.owner,
        assign: legacy.assign,
        status: legacy.status,
        create_date: legacy.createDate,
        estimate_date: legacy.estimateDate || null,
        notes: legacy.notes,
        reviewer: legacy.reviewer,
        review: legacy.review,
        locked_fields: {},
    };
}

export function convertLegacyGroup(legacy: LegacyTaskGroup): Partial<TaskGroup> {
    return {
        id: legacy.id,
        name: legacy.name,
        color: legacy.color,
        start_date: legacy.startDate || null,
        end_date: legacy.endDate || null,
        is_expanded: legacy.isExpanded,
    };
}
