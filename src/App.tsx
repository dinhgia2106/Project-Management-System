import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { TaskStatus, TaskGroup, Task } from './types';
import { useAuth } from './contexts/AuthContext';
import { AdminPanel } from './pages/AdminPanel';
import { AuditLogPage } from './pages/AuditLogPage';
import { TaskGroupComponent } from './components/TaskGroup';
import { GroupModal } from './components/GroupModal';
import { supabase } from './lib/supabaseClient';

function App() {
  const { user, signOut, isAdmin, isMod } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TaskGroup | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'All'>('All');

  // Drag and drop state
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  // Load data from Supabase
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('task_groups')
        .select('*')
        .order('sort_order', { ascending: true });

      if (groupsError) {
        console.error('Error loading groups:', groupsError);
      } else {
        setGroups(groupsData || []);
      }

      // Load tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('sort_order', { ascending: true });

      if (tasksError) {
        console.error('Error loading tasks:', tasksError);
      } else {
        setTasks(tasksData || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    return filteredTasks.filter(task => task.group_id === groupId);
  };

  // Group handlers
  const handleAddGroup = () => {
    const newGroup: Partial<TaskGroup> = {
      name: 'New Group',
      color: '#ec4899',
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      is_expanded: true,
      sort_order: groups.length,
    };
    setEditingGroup(newGroup as TaskGroup);
    setIsGroupModalOpen(true);
  };

  const handleEditGroup = (group: TaskGroup) => {
    setEditingGroup(group);
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async (group: TaskGroup) => {
    try {
      if (group.id) {
        // Update existing group
        const { error } = await supabase
          .from('task_groups')
          .update({
            name: group.name,
            color: group.color,
            start_date: group.start_date,
            end_date: group.end_date,
            is_expanded: group.is_expanded,
          })
          .eq('id', group.id);

        if (error) {
          console.error('Error updating group:', error);
          return;
        }
      } else {
        // Create new group
        const { error } = await supabase
          .from('task_groups')
          .insert({
            name: group.name,
            color: group.color,
            start_date: group.start_date,
            end_date: group.end_date,
            is_expanded: group.is_expanded,
            sort_order: groups.length,
            created_by: user?.id,
          });

        if (error) {
          console.error('Error creating group:', error);
          return;
        }
      }

      await loadData();
    } catch (err) {
      console.error('Error saving group:', err);
    }

    setIsGroupModalOpen(false);
    setEditingGroup(null);
  };

  const handleUpdateGroup = async (group: TaskGroup) => {
    try {
      const { error } = await supabase
        .from('task_groups')
        .update({
          name: group.name,
          color: group.color,
          start_date: group.start_date,
          end_date: group.end_date,
          is_expanded: group.is_expanded,
        })
        .eq('id', group.id);

      if (error) {
        console.error('Error updating group:', error);
        return;
      }

      // Update local state
      setGroups(groups.map(g => g.id === group.id ? group : g));
    } catch (err) {
      console.error('Error updating group:', err);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Delete this group and all its tasks?')) return;

    try {
      const { error } = await supabase
        .from('task_groups')
        .delete()
        .eq('id', groupId);

      if (error) {
        console.error('Error deleting group:', error);
        return;
      }

      await loadData();
    } catch (err) {
      console.error('Error deleting group:', err);
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
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverGroupId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetGroupId: string) => {
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

    // Reorder groups locally
    const newGroups = [...groups];
    const [draggedGroup] = newGroups.splice(draggedIndex, 1);
    newGroups.splice(targetIndex, 0, draggedGroup);

    // Update sort_order in database
    for (let i = 0; i < newGroups.length; i++) {
      await supabase
        .from('task_groups')
        .update({ sort_order: i })
        .eq('id', newGroups[i].id);
    }

    setGroups(newGroups);
    setDraggedGroupId(null);
    setDragOverGroupId(null);
  };

  const handleDragEnd = () => {
    setDraggedGroupId(null);
    setDragOverGroupId(null);
  };

  // Task handlers
  const handleAddTask = async (task: Task) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          group_id: task.group_id,
          task: task.task || '',
          owner: task.owner || '',
          assign: task.assign || '',
          user_story: task.user_story || '',
          acceptance_criteria: task.acceptance_criteria || '',
          status: task.status || 'Not Started',
          create_date: task.create_date || new Date().toISOString().split('T')[0],
          estimate_date: task.estimate_date || null,
          notes: task.notes || '',
          reviewer: task.reviewer || '',
          review: task.review || '',
          sort_order: tasks.filter(t => t.group_id === task.group_id).length,
          locked_fields: {},
          created_by: user?.id,
        });

      if (error) {
        console.error('Error adding task:', error);
        return;
      }

      await loadData();
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  const handleUpdateTask = async (task: Task) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          task: task.task,
          owner: task.owner,
          assign: task.assign,
          user_story: task.user_story,
          acceptance_criteria: task.acceptance_criteria,
          status: task.status,
          estimate_date: task.estimate_date || null,
          notes: task.notes,
          reviewer: task.reviewer,
          review: task.review,
        })
        .eq('id', task.id);

      if (error) {
        console.error('Error updating task:', error);
        return;
      }

      // Update local state immediately for responsiveness
      setTasks(tasks.map(t => t.id === task.id ? task : t));
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error('Error deleting task:', error);
        return;
      }

      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  // Export/Import
  const handleExport = () => {
    const data = { groups, tasks };
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `project-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (imported.groups && imported.tasks) {
            // Import groups
            for (const group of imported.groups) {
              await supabase.from('task_groups').insert({
                name: group.name,
                color: group.color,
                start_date: group.start_date || group.startDate,
                end_date: group.end_date || group.endDate,
                is_expanded: group.is_expanded ?? group.isExpanded ?? true,
                sort_order: group.sort_order ?? 0,
                created_by: user?.id,
              });
            }
            // Note: Tasks import needs group ID mapping - simplified here
            await loadData();
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

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading data...</p>
      </div>
    );
  }

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
        <button className="btn btn-ghost" onClick={loadData} title="Refresh">
          Refresh
        </button>
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
              currentUser={user}
              userRole={user?.role || 'member'}
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
