import React from 'react';
import type { Task, TaskStatus } from '../types';
import { formatDate } from '../utils/helpers';

interface TaskTableProps {
    tasks: Task[];
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => void;
    sortField: keyof Task | null;
    sortDirection: 'asc' | 'desc';
    onSort: (field: keyof Task) => void;
}

const getStatusClass = (status: TaskStatus): string => {
    switch (status) {
        case 'To Do': return 'status-todo';
        case 'In Progress': return 'status-in-progress';
        case 'In Review': return 'status-in-review';
        case 'Done': return 'status-done';
        default: return '';
    }
};

export const TaskTable: React.FC<TaskTableProps> = ({
    tasks,
    onEdit,
    onDelete,
    sortField,
    sortDirection,
    onSort
}) => {
    const getSortClass = (field: keyof Task): string => {
        if (sortField !== field) return 'sortable';
        return sortDirection === 'asc' ? 'sortable sort-asc' : 'sortable sort-desc';
    };

    if (tasks.length === 0) {
        return (
            <div className="empty-state">
                <h3>No tasks found</h3>
                <p>Create your first task to get started</p>
            </div>
        );
    }

    return (
        <div className="table-wrapper">
            <table className="task-table">
                <thead>
                    <tr>
                        <th className={getSortClass('task')} onClick={() => onSort('task')}>
                            Task
                        </th>
                        <th className={getSortClass('userStory')} onClick={() => onSort('userStory')}>
                            User Story
                        </th>
                        <th>Acceptance Criteria</th>
                        <th className={getSortClass('owner')} onClick={() => onSort('owner')}>
                            Owner
                        </th>
                        <th className={getSortClass('assign')} onClick={() => onSort('assign')}>
                            Assign
                        </th>
                        <th className={getSortClass('status')} onClick={() => onSort('status')}>
                            Status
                        </th>
                        <th className={getSortClass('createDate')} onClick={() => onSort('createDate')}>
                            Create Date
                        </th>
                        <th className={getSortClass('estimateDate')} onClick={() => onSort('estimateDate')}>
                            Estimate Date
                        </th>
                        <th>Notes</th>
                        <th>Files</th>
                        <th className={getSortClass('reviewer')} onClick={() => onSort('reviewer')}>
                            Reviewer
                        </th>
                        <th>Review</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map(task => (
                        <tr key={task.id}>
                            <td>
                                <div className="cell-truncate" title={task.task}>
                                    {task.task}
                                </div>
                            </td>
                            <td>
                                <div className="cell-truncate" title={task.userStory}>
                                    {task.userStory}
                                </div>
                            </td>
                            <td>
                                <div className="cell-truncate" title={task.acceptanceCriteria}>
                                    {task.acceptanceCriteria}
                                </div>
                            </td>
                            <td>{task.owner}</td>
                            <td>{task.assign}</td>
                            <td>
                                <span className={`status-badge ${getStatusClass(task.status)}`}>
                                    {task.status}
                                </span>
                            </td>
                            <td>{formatDate(task.createDate)}</td>
                            <td>{formatDate(task.estimateDate)}</td>
                            <td>
                                <div className="cell-truncate" title={task.notes}>
                                    {task.notes}
                                </div>
                            </td>
                            <td>
                                <div className="files-list">
                                    {task.files.slice(0, 2).map(file => (
                                        <span key={file.id} className="file-badge">
                                            {file.name}
                                        </span>
                                    ))}
                                    {task.files.length > 2 && (
                                        <span className="file-badge">+{task.files.length - 2}</span>
                                    )}
                                </div>
                            </td>
                            <td>{task.reviewer}</td>
                            <td>
                                <div className="cell-truncate" title={task.review}>
                                    {task.review}
                                </div>
                            </td>
                            <td>
                                <div className="actions-cell">
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => onEdit(task)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => onDelete(task.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
