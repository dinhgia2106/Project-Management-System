import React from 'react';
import type { TaskGroup } from '../types';
import { GROUP_COLORS, formatDateForInput } from '../utils/helpers';

interface GroupModalProps {
    group: TaskGroup | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (group: TaskGroup) => void;
}

export const GroupModal: React.FC<GroupModalProps> = ({ group, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = React.useState<TaskGroup | null>(null);

    React.useEffect(() => {
        if (group) {
            setFormData({ ...group });
        }
    }, [group]);

    if (!isOpen || !formData) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            onSave(formData);
        }
    };

    // Support both snake_case and camelCase
    const startDate = formData.start_date || (formData as any).startDate || '';
    const endDate = formData.end_date || (formData as any).endDate || '';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                <div className="modal-header">
                    <h2>{group?.name === 'New Group' ? 'New Group' : 'Edit Group'}</h2>
                    <button className="btn btn-ghost" onClick={onClose}>X</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Group Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., EPIC 1 - User Authentication"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    value={formatDateForInput(startDate)}
                                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>End Date</label>
                                <input
                                    type="date"
                                    value={formatDateForInput(endDate)}
                                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Color</label>
                                <div className="color-picker">
                                    {GROUP_COLORS.map(color => (
                                        <div
                                            key={color}
                                            className={`color-option ${formData.color === color ? 'selected' : ''}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setFormData({ ...formData, color })}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Save Group
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
