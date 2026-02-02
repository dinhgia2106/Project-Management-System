import React, { useState, useRef, useEffect } from 'react';
import type { Task, TaskGroup as TaskGroupType, TaskStatus, User, UserRole } from '../types';
import { formatDate, STATUS_COLORS, STATUS_OPTIONS } from '../utils/helpers';

interface TaskGroupProps {
    group: TaskGroupType;
    tasks: Task[];
    currentUser: User | null;
    userRole: UserRole;
    allUsers: User[];
    onAddTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    onUpdateTask: (task: Task) => void;
    onUpdateGroup: (group: TaskGroupType) => void;
    onDeleteGroup: (groupId: string) => void;
    onEditGroup: (group: TaskGroupType) => void;
    canDeleteTask: boolean;
    canDeleteGroup: boolean;
    // Lock field handlers
    onLockField?: (taskId: string, fieldName: string) => void;
    onUnlockField?: (taskId: string, fieldName: string) => void;
    // Drag and drop props
    onDragStart?: (e: React.DragEvent, groupId: string) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragEnter?: (e: React.DragEvent, groupId: string) => void;
    onDragLeave?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent, groupId: string) => void;
    isDragOver?: boolean;
}

// Get initials from first and last word (e.g., "Trần Đình Gia" → "TG")
const getInitials = (name: string): string => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
    disabled?: boolean;
}

const EditableCell: React.FC<EditableCellProps> = ({ value, onChange, placeholder, type = 'text', autoFocus, disabled }) => {
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

    if (disabled) {
        return (
            <div className="editable-cell disabled" style={{ cursor: 'not-allowed', opacity: 0.6 }}>
                {value || <span style={{ color: 'var(--text-muted)' }}>{placeholder || '-'}</span>}
            </div>
        );
    }

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

// LockableCell wrapper component - shows lock button on hover for admin/mod
interface LockableCellProps {
    taskId: string;
    fieldName: string;
    isLocked: boolean;
    isAdminOrMod: boolean;
    onLock?: (taskId: string, fieldName: string) => void;
    onUnlock?: (taskId: string, fieldName: string) => void;
    children: React.ReactNode;
}

const LockableCell: React.FC<LockableCellProps> = ({
    taskId,
    fieldName,
    isLocked,
    isAdminOrMod,
    onLock,
    onUnlock,
    children
}) => {
    const handleToggleLock = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isLocked) {
            onUnlock?.(taskId, fieldName);
        } else {
            onLock?.(taskId, fieldName);
        }
    };

    return (
        <div className={`lockable-cell ${isLocked ? 'is-locked' : ''}`}>
            {children}
            {isAdminOrMod && (
                <button
                    className={`lock-btn ${isLocked ? 'locked' : ''}`}
                    onClick={handleToggleLock}
                    title={isLocked ? 'Unlock this field' : 'Lock this field'}
                >
                    {isLocked ? '\u{1F513}' : '\u{1F512}'}
                </button>
            )}
            {isLocked && !isAdminOrMod && (
                <span className="lock-indicator" title="This field is locked">{'\u{1F512}'}</span>
            )}
        </div>
    );
};

// User Dropdown Component for selecting users
interface UserDropdownProps {
    value: string;
    users: User[];
    onChange: (username: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

// Get display name for a username from users list
const getDisplayName = (username: string, users: User[]): string => {
    const user = users.find(u => u.username === username);
    return user?.display_name || username;
};

const UserDropdown: React.FC<UserDropdownProps> = ({ value, users, onChange, placeholder = 'Select user', disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (username: string) => {
        onChange(username);
        setIsOpen(false);
    };

    const activeUsers = users.filter(u => u.status === 'active');
    const displayName = value ? getDisplayName(value, users) : '';

    if (disabled) {
        return (
            <div className="user-dropdown disabled" style={{ cursor: 'not-allowed' }}>
                {value ? (
                    <div
                        className="avatar"
                        style={{ backgroundColor: getAvatarColor(displayName), opacity: 0.6 }}
                        title={`${displayName} (Disabled)`}
                    >
                        {getInitials(displayName)}
                    </div>
                ) : (
                    <div className="avatar avatar-placeholder" style={{ opacity: 0.6 }}>
                        -
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="user-dropdown" ref={dropdownRef}>
            <div
                className="user-dropdown-trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                {value ? (
                    <div
                        className="avatar"
                        style={{ backgroundColor: getAvatarColor(displayName) }}
                        title={displayName}
                    >
                        {getInitials(displayName)}
                    </div>
                ) : (
                    <div className="avatar avatar-placeholder" title={placeholder}>
                        ?
                    </div>
                )}
            </div>
            {isOpen && (
                <div className="user-dropdown-menu">
                    {/* Clear option */}
                    <div
                        className="user-dropdown-option"
                        onClick={() => handleSelect('')}
                    >
                        <div className="avatar avatar-placeholder" style={{ width: 24, height: 24, fontSize: 10 }}>
                            -
                        </div>
                        <span className="user-dropdown-name">Clear</span>
                    </div>
                    {activeUsers.map(user => (
                        <div
                            key={user.id}
                            className={`user-dropdown-option ${value === user.username ? 'selected' : ''}`}
                            onClick={() => handleSelect(user.username)}
                        >
                            <div
                                className="avatar"
                                style={{
                                    backgroundColor: getAvatarColor(user.display_name || user.username),
                                    width: 24,
                                    height: 24,
                                    fontSize: 10
                                }}
                            >
                                {getInitials(user.display_name || user.username)}
                            </div>
                            <span className="user-dropdown-name">{user.display_name || user.username}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Custom Status Dropdown with colored options and permission control
interface StatusDropdownProps {
    value: TaskStatus;
    onChange: (status: TaskStatus) => void;
    canSelectDone: boolean;
}

const StatusDropdown: React.FC<StatusDropdownProps> = ({ value, onChange, canSelectDone }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (status: TaskStatus) => {
        if (status === 'Done' && !canSelectDone) {
            alert('Only the reviewer can mark task as Done');
            return;
        }
        onChange(status);
        setIsOpen(false);
    };

    const availableOptions = STATUS_OPTIONS.filter(status => {
        if (status === 'Done' && !canSelectDone) return false;
        return true;
    });

    return (
        <div className="status-dropdown" ref={dropdownRef}>
            <div
                className="status-dropdown-trigger"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    backgroundColor: STATUS_COLORS[value].bg,
                    color: STATUS_COLORS[value].text
                }}
            >
                {value}
            </div>
            {isOpen && (
                <div className="status-dropdown-menu">
                    {availableOptions.map(status => (
                        <div
                            key={status}
                            className="status-dropdown-option"
                            onClick={() => handleSelect(status)}
                            style={{
                                backgroundColor: STATUS_COLORS[status].bg,
                                color: STATUS_COLORS[status].text
                            }}
                        >
                            {status}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const TaskGroupComponent: React.FC<TaskGroupProps> = ({
    group,
    tasks,
    currentUser,
    userRole,
    allUsers,
    onAddTask,
    onDeleteTask,
    onUpdateTask,
    onUpdateGroup,
    onDeleteGroup,
    onEditGroup,
    canDeleteTask,
    canDeleteGroup,
    onLockField,
    onUnlockField,
    onDragStart,
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDrop,
    isDragOver
}) => {
    const isExpanded = group.is_expanded ?? (group as any).isExpanded ?? true;
    const [expanded, setExpanded] = useState(isExpanded);
    const [newTaskId, setNewTaskId] = useState<string | null>(null);

    const isAdminOrMod = userRole === 'admin' || userRole === 'mod';

    const toggleExpand = () => {
        const newExpanded = !expanded;
        setExpanded(newExpanded);
        onUpdateGroup({ ...group, is_expanded: newExpanded });
    };

    const handleAddEmptyRow = () => {
        const newTask: Partial<Task> = {
            group_id: group.id,
            task: '',
            owner: currentUser?.username || '', // Auto-set owner to current user
            assign: '',
            user_story: '',
            acceptance_criteria: '',
            status: 'Not Started',
            create_date: new Date().toISOString().split('T')[0],
            estimate_date: null,
            notes: '',
            reviewer: '',
            review: '',
        };
        onAddTask(newTask as Task);
    };

    const handleFieldChange = (task: Task, field: keyof Task, value: string | null) => {
        onUpdateTask({ ...task, [field]: value });
    };

    const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
        onUpdateTask({ ...task, status: newStatus });
    };

    const canEditReviewer = isAdminOrMod;

    const canEditReview = (task: Task): boolean => {
        if (!currentUser) return false;
        return task.reviewer.toLowerCase() === currentUser.username.toLowerCase();
    };

    const canSelectDone = (task: Task): boolean => {
        if (!currentUser) return false;
        return task.reviewer.toLowerCase() === currentUser.username.toLowerCase();
    };

    const formatGroupDates = () => {
        const startDate = group.start_date || (group as any).startDate;
        const endDate = group.end_date || (group as any).endDate;
        const start = startDate ? formatDate(startDate) : '';
        const end = endDate ? formatDate(endDate) : '';
        if (start && end) return `(${start} - ${end})`;
        if (start) return `(${start})`;
        return '';
    };

    const formatDateForInput = (dateString: string | null): string => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch {
            return '';
        }
    };

    return (
        <div
            className={`task-group ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={onDragOver}
            onDragEnter={(e) => onDragEnter?.(e, group.id)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop?.(e, group.id)}
        >
            <div className="group-header" onClick={toggleExpand}>
                <div
                    className="group-drag-handle"
                    draggable
                    onDragStart={(e) => {
                        e.stopPropagation();
                        onDragStart?.(e, group.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to reorder"
                >
                    ::
                </div>
                <span className={`group-expand ${expanded ? 'expanded' : ''}`}>
                    &gt;
                </span>
                <div className="group-color" style={{ backgroundColor: group.color }}></div>
                <span className="group-name" style={{ color: group.color }}>{group.name}</span>
                <span className="group-dates">{formatGroupDates()}</span>
                <span className="group-count">{tasks.length}</span>
                <div className="group-actions" onClick={e => e.stopPropagation()}>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onEditGroup(group)}
                        title="Edit group"
                    >
                        Edit
                    </button>
                    {canDeleteGroup && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => onDeleteGroup(group.id)}
                            style={{ color: 'var(--accent-red)' }}
                            title="Delete group"
                        >
                            x
                        </button>
                    )}
                </div>
            </div>

            {expanded && (
                <>
                    <table className="group-table">
                        <thead>
                            <tr>
                                <th className="col-task">Task</th>
                                <th className="col-owner">Owner</th>
                                <th className="col-assign">Assign</th>
                                <th className="col-story">User Story</th>
                                <th className="col-criteria">Acceptance Criteria</th>
                                <th className="col-status">Status</th>
                                <th className="col-date">Create date</th>
                                <th className="col-date">Estimate date</th>
                                <th className="col-notes">Notes</th>
                                <th className="col-reviewer">Reviewer</th>
                                <th className="col-review">Review</th>
                                <th className="col-actions"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(task => {
                                const isFieldLocked = (field: string) => task.locked_fields?.[field] === true;
                                const isMemberAndLocked = (field: string) => !isAdminOrMod && isFieldLocked(field);

                                return (
                                    <tr key={task.id}>
                                        <td>
                                            <LockableCell
                                                taskId={task.id}
                                                fieldName="task"
                                                isLocked={isFieldLocked('task')}
                                                isAdminOrMod={isAdminOrMod}
                                                onLock={onLockField}
                                                onUnlock={onUnlockField}
                                            >
                                                <EditableCell
                                                    value={task.task}
                                                    onChange={v => handleFieldChange(task, 'task', v)}
                                                    placeholder="Task name..."
                                                    autoFocus={task.id === newTaskId}
                                                    disabled={isMemberAndLocked('task')}
                                                />
                                            </LockableCell>
                                        </td>
                                        <td>
                                            {/* Owner: Display-only avatar of creator */}
                                            {task.owner ? (() => {
                                                const ownerDisplayName = getDisplayName(task.owner, allUsers);
                                                return (
                                                    <div
                                                        className="avatar"
                                                        style={{ backgroundColor: getAvatarColor(ownerDisplayName), cursor: 'default' }}
                                                        title={ownerDisplayName}
                                                    >
                                                        {getInitials(ownerDisplayName)}
                                                    </div>
                                                );
                                            })() : (
                                                <div className="avatar avatar-placeholder" style={{ cursor: 'default' }}>
                                                    -
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {/* Assign: User dropdown */}
                                            <LockableCell
                                                taskId={task.id}
                                                fieldName="assign"
                                                isLocked={isFieldLocked('assign')}
                                                isAdminOrMod={isAdminOrMod}
                                                onLock={onLockField}
                                                onUnlock={onUnlockField}
                                            >
                                                <UserDropdown
                                                    value={task.assign}
                                                    users={allUsers}
                                                    onChange={v => handleFieldChange(task, 'assign', v)}
                                                    placeholder="Assign to..."
                                                    disabled={isMemberAndLocked('assign')}
                                                />
                                            </LockableCell>
                                        </td>
                                        <td>
                                            <LockableCell
                                                taskId={task.id}
                                                fieldName="user_story"
                                                isLocked={isFieldLocked('user_story')}
                                                isAdminOrMod={isAdminOrMod}
                                                onLock={onLockField}
                                                onUnlock={onUnlockField}
                                            >
                                                <EditableCell
                                                    value={task.user_story || ''}
                                                    onChange={v => handleFieldChange(task, 'user_story', v)}
                                                    placeholder="User story..."
                                                    disabled={isMemberAndLocked('user_story')}
                                                />
                                            </LockableCell>
                                        </td>
                                        <td>
                                            <LockableCell
                                                taskId={task.id}
                                                fieldName="acceptance_criteria"
                                                isLocked={isFieldLocked('acceptance_criteria')}
                                                isAdminOrMod={isAdminOrMod}
                                                onLock={onLockField}
                                                onUnlock={onUnlockField}
                                            >
                                                <EditableCell
                                                    value={task.acceptance_criteria || ''}
                                                    onChange={v => handleFieldChange(task, 'acceptance_criteria', v)}
                                                    placeholder="Acceptance criteria..."
                                                    disabled={isMemberAndLocked('acceptance_criteria')}
                                                />
                                            </LockableCell>
                                        </td>
                                        <td>
                                            <LockableCell
                                                taskId={task.id}
                                                fieldName="status"
                                                isLocked={isFieldLocked('status')}
                                                isAdminOrMod={isAdminOrMod}
                                                onLock={onLockField}
                                                onUnlock={onUnlockField}
                                            >
                                                <StatusDropdown
                                                    value={task.status}
                                                    onChange={newStatus => handleStatusChange(task, newStatus)}
                                                    canSelectDone={canSelectDone(task)}
                                                />
                                            </LockableCell>
                                        </td>
                                        <td>
                                            <span className="date-cell">{formatDate(task.create_date)}</span>
                                        </td>
                                        <td>
                                            <LockableCell
                                                taskId={task.id}
                                                fieldName="estimate_date"
                                                isLocked={isFieldLocked('estimate_date')}
                                                isAdminOrMod={isAdminOrMod}
                                                onLock={onLockField}
                                                onUnlock={onUnlockField}
                                            >
                                                <input
                                                    type="date"
                                                    className="date-input"
                                                    value={formatDateForInput(task.estimate_date)}
                                                    onChange={e => handleFieldChange(task, 'estimate_date', e.target.value || null)}
                                                    disabled={isMemberAndLocked('estimate_date')}
                                                />
                                            </LockableCell>
                                        </td>
                                        <td>
                                            <LockableCell
                                                taskId={task.id}
                                                fieldName="notes"
                                                isLocked={isFieldLocked('notes')}
                                                isAdminOrMod={isAdminOrMod}
                                                onLock={onLockField}
                                                onUnlock={onUnlockField}
                                            >
                                                <EditableCell
                                                    value={task.notes}
                                                    onChange={v => handleFieldChange(task, 'notes', v)}
                                                    placeholder="Notes..."
                                                    disabled={isMemberAndLocked('notes')}
                                                />
                                            </LockableCell>
                                        </td>
                                        <td>
                                            {/* Reviewer: User dropdown - lockable */}
                                            <LockableCell
                                                taskId={task.id}
                                                fieldName="reviewer"
                                                isLocked={isFieldLocked('reviewer')}
                                                isAdminOrMod={isAdminOrMod}
                                                onLock={onLockField}
                                                onUnlock={onUnlockField}
                                            >
                                                <UserDropdown
                                                    value={task.reviewer}
                                                    users={allUsers}
                                                    onChange={v => handleFieldChange(task, 'reviewer', v)}
                                                    placeholder="Reviewer..."
                                                    disabled={isMemberAndLocked('reviewer')}
                                                />
                                            </LockableCell>
                                        </td>
                                        <td>
                                            <EditableCell
                                                value={task.review}
                                                onChange={v => handleFieldChange(task, 'review', v)}
                                                placeholder="Review..."
                                                disabled={!canEditReview(task)}
                                            />
                                        </td>
                                        <td>
                                            {canDeleteTask && (
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
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}{/* Add task row */}
                            <tr className="add-task-row-table" onClick={handleAddEmptyRow}>
                                <td colSpan={12}>
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
