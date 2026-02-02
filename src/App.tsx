import React, { useState, useMemo } from 'react';
import type { TaskStatus, LegacyTask, LegacyTaskGroup } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { createEmptyGroup } from './utils/helpers';
import { TaskGroupComponent } from './components/TaskGroup';
import { GroupModal } from './components/GroupModal';
import { AdminPanel } from './pages/AdminPanel';
import { AuditLogPage } from './pages/AuditLogPage';
import { useAuth } from './contexts/AuthContext';

// Use legacy types while we transition to Supabase
type Task = LegacyTask;
type TaskGroup = LegacyTaskGroup;

function App() {
  const { user, signOut, isAdmin, isMod } = useAuth();

  const [tasks, setTasks] = useLocalStorage<Task[]>('scrum-tasks', []);
  const [groups, setGroups] = useLocalStorage<TaskGroup[]>('scrum-groups', []);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TaskGroup | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'All'>('All');

  // Drag and drop state
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(task =>
        task.task.toLowerCase().includes(query) ||
        task.owner.toLowerCase().includes(query) ||
        task.assign.toLowerCase().includes(query) ||
        task.notes.toLowerCase().includes(query)
      );
    }

    if (filterStatus !== 'All') {
      result = result.filter(task => task.status === filterStatus);
    }

    return result;
  }, [tasks, searchQuery, filterStatus]);

  const getTasksForGroup = (groupId: string) => {
    return filteredTasks.filter(task => task.groupId === groupId);
  };

  // Group handlers
  const handleAddGroup = () => {
    setEditingGroup(createEmptyGroup());
    setIsGroupModalOpen(true);
  };

  const handleEditGroup = (group: TaskGroup) => {
    setEditingGroup(group);
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = (group: TaskGroup) => {
    const existingIndex = groups.findIndex(g => g.id === group.id);
    if (existingIndex >= 0) {
      const newGroups = [...groups];
      newGroups[existingIndex] = group;
      setGroups(newGroups);
    } else {
      setGroups([...groups, group]);
    }
    setIsGroupModalOpen(false);
    setEditingGroup(null);
  };

  const handleUpdateGroup = (group: TaskGroup) => {
    const newGroups = groups.map(g => g.id === group.id ? group : g);
    setGroups(newGroups);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (window.confirm('Delete this group and all its tasks?')) {
      setGroups(groups.filter(g => g.id !== groupId));
      setTasks(tasks.filter(t => t.groupId !== groupId));
    }
  };

  // Drag and drop handlers for group reordering
  const handleDragStart = (e: React.DragEvent, groupId: string) => {
    setDraggedGroupId(groupId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', groupId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    if (draggedGroupId && draggedGroupId !== groupId) {
      setDragOverGroupId(groupId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the group entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverGroupId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();

    if (!draggedGroupId || draggedGroupId === targetGroupId) {
      setDraggedGroupId(null);
      setDragOverGroupId(null);
      return;
    }

    const draggedIndex = groups.findIndex(g => g.id === draggedGroupId);
    const targetIndex = groups.findIndex(g => g.id === targetGroupId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedGroupId(null);
      setDragOverGroupId(null);
      return;
    }

    // Reorder groups
    const newGroups = [...groups];
    const [draggedGroup] = newGroups.splice(draggedIndex, 1);
    newGroups.splice(targetIndex, 0, draggedGroup);

    setGroups(newGroups);
    setDraggedGroupId(null);
    setDragOverGroupId(null);
  };

  const handleDragEnd = () => {
    setDraggedGroupId(null);
    setDragOverGroupId(null);
  };

  // Task handlers
  const handleAddTask = (task: Task) => {
    setTasks([...tasks, task]);
  };

  const handleUpdateTask = (task: Task) => {
    const newTasks = tasks.map(t => t.id === task.id ? task : t);
    setTasks(newTasks);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  // Export/Import
  const handleExport = () => {
    const data = { groups, tasks };
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scrum-project-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (imported.groups && imported.tasks) {
            setGroups(imported.groups);
            setTasks(imported.tasks);
          }
        } catch (error) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const getRoleBadge = () => {
    if (isAdmin) return <span className="role-badge role-admin">Admin</span>;
    if (isMod) return <span className="role-badge role-mod">Mod</span>;
    return <span className="role-badge role-member">Member</span>;
  };

  return (
    <div className="app" onDragEnd={handleDragEnd}>
      <header className="header">
        <div className="header-left">
          <h1>Project Management</h1>
        </div>
        <div className="header-actions">
          <div className="user-info">
            <span className="user-name">{user?.username}</span>
            {getRoleBadge()}
          </div>
          {isAdmin && (
            <button
              className="btn btn-secondary"
              onClick={() => setIsAdminPanelOpen(true)}
            >
              Users
            </button>
          )}
          {(isAdmin || isMod) && (
            <button
              className="btn btn-secondary"
              onClick={() => setIsAuditLogOpen(true)}
            >
              Audit Log
            </button>
          )}
          <label className="btn btn-secondary">
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
          <button className="btn btn-secondary" onClick={handleExport}>
            Export
          </button>
          <button className="btn btn-ghost" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </header>

      <div className="toolbar">
        <button className="btn btn-primary" onClick={handleAddGroup}>
          + New Group
        </button>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="btn btn-secondary"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as TaskStatus | 'All')}
        >
          <option value="All">All Status</option>
          <option value="Not Started">Not Started</option>
          <option value="Working on it">Working on it</option>
          <option value="In Review">In Review</option>
          <option value="Done">Done</option>
        </select>
      </div>

      <div className="main-content">
        {groups.length === 0 ? (
          <div className="empty-state">
            <h3>No groups yet</h3>
            <p>Create your first group to start managing tasks</p>
            <button className="btn btn-primary" onClick={handleAddGroup}>
              + Create Group
            </button>
          </div>
        ) : (
          groups.map(group => (
            <TaskGroupComponent
              key={group.id}
              group={group}
              tasks={getTasksForGroup(group.id)}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
              onUpdateTask={handleUpdateTask}
              onUpdateGroup={handleUpdateGroup}
              onDeleteGroup={handleDeleteGroup}
              onEditGroup={handleEditGroup}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              isDragOver={dragOverGroupId === group.id}
            />
          ))
        )}
      </div>

      <GroupModal
        group={editingGroup}
        isOpen={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false);
          setEditingGroup(null);
        }}
        onSave={handleSaveGroup}
      />

      {isAdminPanelOpen && (
        <AdminPanel onClose={() => setIsAdminPanelOpen(false)} />
      )}

      {isAuditLogOpen && (
        <AuditLogPage onClose={() => setIsAuditLogOpen(false)} />
      )}
    </div>
  );
}

export default App;
