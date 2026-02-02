export type TaskStatus = 'Not Started' | 'Working on it' | 'Stucking' | 'In Review' | 'Done';

export interface TaskFile {
    id: string;
    name: string;
    size: number;
    type: string;
    addedAt: string;
}

export interface Task {
    id: string;
    groupId: string;
    task: string;
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

export interface TaskGroup {
    id: string;
    name: string;
    color: string;
    startDate: string;
    endDate: string;
    isExpanded: boolean;
}
