import React, { useState, useRef, useEffect } from 'react';
import type { Task, TaskGroup as TaskGroupType, TaskStatus } from '../types';
import { formatDate, STATUS_COLORS, createEmptyTask } from '../utils/helpers';

interface TaskGroupProps {
    group: TaskGroupType;
    tasks: Task[];
    onAddTask: (task: Task) => void;
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

interface EditableCellProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: 'text' | 'date';
    autoFocus?: boolean;
}

const EditableCell: React.FC<EditableCellProps> = ({ value, onChange, placeholder, type = 'text', autoFocus }) => {
    const [isEditing, setIsEditing] = useState(autoFocus || false);
    const [tempValue, setTempValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    useEffect(() => {
        setTempValue(value);
    }, [value]);

    const handleBlur = () => {
        setIsEditing(false);
        if (tempValue !== value) {
            onChange(tempValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
        if (e.key === 'Escape') {
            setTempValue(value);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type={type}
                className="inline-edit"
                value={tempValue}
                onChange={e => setTempValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
            />
        );
    }

    return (
        <div
            className="editable-cell"
            onClick={() => setIsEditing(true)}
            style={{ cursor: 'text', minHeight: '20px' }}
        >
            {value || <span style={{ color: 'var(--text-muted)' }}>{placeholder || '-'}</span>}
        </div>
    );
};

export const TaskGroupComponent: React.FC<TaskGroupProps> = ({
    group,
    tasks,
    onAddTask,
    onDeleteTask,
    onUpdateTask,
    onUpdateGroup,
    onDeleteGroup
}) => {
    const [isExpanded, setIsExpanded] = useState(group.isExpanded);
    const [newTaskId, setNewTaskId] = useState<string | null>(null);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
        onUpdateGroup({ ...group, isExpanded: !isExpanded });
    };

    const handleAddEmptyRow = () => {
        const newTask = createEmptyTask(group.id);
        onAddTask(newTask);
        setNewTaskId(newTask.id);
    };

    const handleFieldChange = (task: Task, field: keyof Task, value: string) => {
        onUpdateTask({ ...task, [field]: value });
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

    const formatDateForInput = (dateString: string): string => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch {
            return '';
        }
    };

    return (
        <div className="task-group">
            <div className="group-header" onClick={toggleExpand}>
                <span className={`group-expand ${isExpanded ? 'expanded' : ''}`}>
                    &gt;
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
                    <table className="group-table">
                        <thead>
                            <tr>
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
                                        <EditableCell
                                            value={task.task}
                                            onChange={v => handleFieldChange(task, 'task', v)}
                                            placeholder="Task name..."
                                            autoFocus={task.id === newTaskId}
                                        />
                                    </td>
                                    <td>
                                        {task.owner ? (
                                            <div
                                                className="avatar"
                                                style={{ backgroundColor: getAvatarColor(task.owner) }}
                                                title={task.owner}
                                                onClick={() => {
                                                    const name = prompt('Owner name:', task.owner);
                                                    if (name !== null) handleFieldChange(task, 'owner', name);
                                                }}
                                            >
                                                {getInitials(task.owner)}
                                            </div>
                                        ) : (
                                            <div
                                                className="avatar avatar-placeholder"
                                                onClick={() => {
                                                    const name = prompt('Owner name:');
                                                    if (name) handleFieldChange(task, 'owner', name);
                                                }}
                                            >
                                                ?
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        {task.assign ? (
                                            <div
                                                className="avatar"
                                                style={{ backgroundColor: getAvatarColor(task.assign) }}
                                                title={task.assign}
                                                onClick={() => {
                                                    const name = prompt('Assign to:', task.assign);
                                                    if (name !== null) handleFieldChange(task, 'assign', name);
                                                }}
                                            >
                                                {getInitials(task.assign)}
                                            </div>
                                        ) : (
                                            <div
                                                className="avatar avatar-placeholder"
                                                onClick={() => {
                                                    const name = prompt('Assign to:');
                                                    if (name) handleFieldChange(task, 'assign', name);
                                                }}
                                            >
                                                ?
                                            </div>
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
                                        <span className="date-cell">{formatDate(task.createDate)}</span>
                                    </td>
                                    <td>
                                        <input
                                            type="date"
                                            className="date-input"
                                            value={formatDateForInput(task.estimateDate)}
                                            onChange={e => handleFieldChange(task, 'estimateDate', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <EditableCell
                                            value={task.notes}
                                            onChange={v => handleFieldChange(task, 'notes', v)}
                                            placeholder="Notes..."
                                        />
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
                                                onClick={() => {
                                                    const name = prompt('Reviewer:', task.reviewer);
                                                    if (name !== null) handleFieldChange(task, 'reviewer', name);
                                                }}
                                            >
                                                {getInitials(task.reviewer)}
                                            </div>
                                        ) : (
                                            <div
                                                className="avatar avatar-placeholder"
                                                onClick={() => {
                                                    const name = prompt('Reviewer:');
                                                    if (name) handleFieldChange(task, 'reviewer', name);
                                                }}
                                            >
                                                ?
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <EditableCell
                                            value={task.review}
                                            onChange={v => handleFieldChange(task, 'review', v)}
                                            placeholder="Review..."
                                        />
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => {
                                                if (window.confirm('Are you sure you want to delete this task?')) {
                                                    onDeleteTask(task.id);
                                                }
                                            }}
                                            style={{ color: 'var(--accent-red)' }}
                                        >
                                            x
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {/* Add task row */}
                            <tr className="add-task-row-table" onClick={handleAddEmptyRow}>
                                <td colSpan={11}>
                                    <span style={{ color: 'var(--text-muted)', cursor: 'pointer' }}>+ Add task</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </>
            )}
        </div>
    );
};
