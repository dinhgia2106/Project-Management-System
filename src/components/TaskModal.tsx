import React from 'react';
import type { Task } from '../types';
import { STATUS_OPTIONS } from '../utils/helpers';

interface TaskModalProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Task) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ task, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = React.useState<Task | null>(null);

    React.useEffect(() => {
        if (task) {
            setFormData({ ...task, files: task.files || [] });
        }
    }, [task]);

    if (!isOpen || !formData) return null;

    const handleChange = (field: keyof Task, value: string) => {
        setFormData(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            onSave(formData);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0 && formData) {
            const newFiles = Array.from(files).map(file => ({
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                task_id: formData.id,
                name: file.name,
                size: file.size,
                type: file.type,
                added_at: new Date().toISOString()
            }));
            setFormData(prev => prev ? {
                ...prev,
                files: [...(prev.files || []), ...newFiles]
            } : null);
        }
    };

    const removeFile = (fileId: string) => {
        setFormData(prev => prev ? {
            ...prev,
            files: (prev.files || []).filter(f => f.id !== fileId)
        } : null);
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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{task?.task ? 'Edit Task' : 'New Task'}</h2>
                    <button className="btn btn-ghost" onClick={onClose}>X</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Task Name *</label>
                                <input
                                    type="text"
                                    value={formData.task}
                                    onChange={e => handleChange('task', e.target.value)}
                                    placeholder="Enter task name"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label>Owner</label>
                                <input
                                    type="text"
                                    value={formData.owner}
                                    onChange={e => handleChange('owner', e.target.value)}
                                    placeholder="Task owner"
                                />
                            </div>

                            <div className="form-group">
                                <label>Assign To</label>
                                <input
                                    type="text"
                                    value={formData.assign}
                                    onChange={e => handleChange('assign', e.target.value)}
                                    placeholder="Assigned person"
                                />
                            </div>

                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    value={formData.status}
                                    onChange={e => handleChange('status', e.target.value)}
                                >
                                    {STATUS_OPTIONS.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Estimate Date</label>
                                <input
                                    type="date"
                                    value={formatDateForInput(formData.estimate_date || '')}
                                    onChange={e => handleChange('estimate_date', e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label>Reviewer</label>
                                <input
                                    type="text"
                                    value={formData.reviewer}
                                    onChange={e => handleChange('reviewer', e.target.value)}
                                    placeholder="Reviewer name"
                                />
                            </div>

                            <div className="form-group">
                                <label>Review</label>
                                <input
                                    type="text"
                                    value={formData.review}
                                    onChange={e => handleChange('review', e.target.value)}
                                    placeholder="Review status"
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => handleChange('notes', e.target.value)}
                                    placeholder="Additional notes..."
                                    rows={3}
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Files ({(formData.files || []).length})</label>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    style={{ padding: '8px' }}
                                />
                                {(formData.files || []).length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                        {(formData.files || []).map(file => (
                                            <div
                                                key={file.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '4px 8px',
                                                    background: 'var(--bg-tertiary)',
                                                    borderRadius: '4px',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                <span>{file.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(file.id)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--accent-red)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    x
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Save Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
