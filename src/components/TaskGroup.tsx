import React, { useState } from 'react';
import type { Task, TaskGroup as TaskGroupType, TaskStatus } from '../types';
import { formatDate, STATUS_COLORS } from '../utils/helpers';

interface TaskGroupProps {
    group: TaskGroupType;
    tasks: Task[];
    onAddTask: (groupId: string) => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    onUpdateTask: (task: Task) => void;
    onUpdateGroup: (group: TaskGroupType) => void;
    onDeleteGroup: (groupId: string) => void;
}

const getInitials = (name: string): string => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const getAvatarColor = (name: string): string => {
    if (!name) return '#6e7681';
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export const TaskGroupComponent: React.FC<TaskGroupProps> = ({
    group,
    tasks,
    onAddTask,
    onEditTask,
    onDeleteTask,
    onUpdateTask,
    onUpdateGroup,
    onDeleteGroup
}) => {
    const [isExpanded, setIsExpanded] = useState(group.isExpanded);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
        onUpdateGroup({ ...group, isExpanded: !isExpanded });
    };

    const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
        onUpdateTask({ ...task, status: newStatus });
    };

    const formatGroupDates = () => {
        const start = group.startDate ? formatDate(group.startDate) : '';
        const end = group.endDate ? formatDate(group.endDate) : '';
        if (start && end) return `(${start} - ${end})`;
        if (start) return `(${start})`;
        return '';
    };

    return (
        <div className="task-group">
            <div className="group-header" onClick={toggleExpand}>
                <span className={`group-expand ${isExpanded ? 'expanded' : ''}`}>
                    ▶
                </span>
                <div className="group-color" style={{ backgroundColor: group.color }}></div>
                <span className="group-name" style={{ color: group.color }}>{group.name}</span>
                <span className="group-dates">{formatGroupDates()}</span>
                <span className="group-count">{tasks.length}</span>
                <div className="group-actions" onClick={e => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => onDeleteGroup(group.id)}>
                        x
                    </button>
                </div>
            </div>

            {isExpanded && (
                <>
                    {tasks.length > 0 && (
                        <table className="group-table">
                            <thead>
                                <tr>
                                    <th className="col-checkbox"></th>
                                    <th className="col-task">Task</th>
                                    <th className="col-owner">Owner</th>
                                    <th className="col-assign">Assign</th>
                                    <th className="col-status">Status</th>
                                    <th className="col-date">Create date</th>
                                    <th className="col-date">Estimate date</th>
                                    <th className="col-notes">Notes</th>
                                    <th className="col-files">Files</th>
                                    <th className="col-reviewer">Reviewer</th>
                                    <th className="col-review">Review</th>
                                    <th className="col-actions"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map(task => (
                                    <tr key={task.id}>
                                        <td>
                                            <input type="checkbox" className="checkbox" />
                                        </td>
                                        <td>
                                            <div className="task-name">
                                                <span className="task-name-text">{task.task || 'Untitled'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {task.owner ? (
                                                <div
                                                    className="avatar"
                                                    style={{ backgroundColor: getAvatarColor(task.owner) }}
                                                    title={task.owner}
                                                >
                                                    {getInitials(task.owner)}
                                                </div>
                                            ) : (
                                                <div className="avatar avatar-placeholder">?</div>
                                            )}
                                        </td>
                                        <td>
                                            {task.assign ? (
                                                <div
                                                    className="avatar"
                                                    style={{ backgroundColor: getAvatarColor(task.assign) }}
                                                    title={task.assign}
                                                >
                                                    {getInitials(task.assign)}
                                                </div>
                                            ) : (
                                                <div className="avatar avatar-placeholder">?</div>
                                            )}
                                        </td>
                                        <td>
                                            <select
                                                className="status-badge"
                                                value={task.status}
                                                onChange={e => handleStatusChange(task, e.target.value as TaskStatus)}
                                                style={{
                                                    backgroundColor: STATUS_COLORS[task.status].bg,
                                                    color: STATUS_COLORS[task.status].text,
                                                    border: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="Not Started">Not Started</option>
                                                <option value="Working on it">Working on it</option>
                                                <option value="In Review">In Review</option>
                                                <option value="Done">Done</option>
                                            </select>
                                        </td>
                                        <td>
                                            {task.createDate && (
                                                <span className="date-cell">{formatDate(task.createDate)}</span>
                                            )}
                                        </td>
                                        <td>
                                            {task.estimateDate ? (
                                                <span className="date-cell">{formatDate(task.estimateDate)}</span>
                                            ) : (
                                                <span className="date-cell empty">-</span>
                                            )}
                                        </td>
                                        <td>
                                            <span style={{ color: 'var(--text-muted)' }}>
                                                {task.notes ? task.notes.substring(0, 20) + (task.notes.length > 20 ? '...' : '') : '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="files-count">
                                                {task.files.length > 0 ? task.files.length : '-'}
                                            </div>
                                        </td>
                                        <td>
                                            {task.reviewer ? (
                                                <div
                                                    className="avatar"
                                                    style={{ backgroundColor: getAvatarColor(task.reviewer) }}
                                                    title={task.reviewer}
                                                >
                                                    {getInitials(task.reviewer)}
                                                </div>
                                            ) : (
                                                <div className="avatar avatar-placeholder">?</div>
                                            )}
                                        </td>
                                        <td>
                                            <span style={{ color: 'var(--text-muted)' }}>
                                                {task.review || '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => onEditTask(task)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => onDeleteTask(task.id)}
                                                    style={{ color: 'var(--accent-red)' }}
                                                >
                                                    x
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    <div className="add-task-row" onClick={() => onAddTask(group.id)}>
                        <span>+ Add task</span>
                    </div>
                </>
            )}
        </div>
    );
};
