export type TaskStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done';

export interface TaskFile {
    id: string;
    name: string;
    size: number;
    type: string;
    addedAt: string;
}

export interface Task {
    id: string;
    task: string;
    userStory: string;
    acceptanceCriteria: string;
    owner: string;
    assign: string;
    status: TaskStatus;
    createDate: string;
    estimateDate: string;
    notes: string;
    files: TaskFile[];
    reviewer: string;
    review: string;
}

export interface Column {
    key: keyof Task;
    label: string;
    width: number;
    minWidth: number;
}
