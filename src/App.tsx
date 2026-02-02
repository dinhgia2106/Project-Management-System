import React, { useState, useMemo } from 'react';
import type { Task, TaskStatus } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { createEmptyTask, STATUS_OPTIONS } from './utils/helpers';
import { TaskTable } from './components/TaskTable';
import { TaskModal } from './components/TaskModal';

function App() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('scrum-tasks', []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'All'>('All');
  const [sortField, setSortField] = useState<keyof Task | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(task =>
        task.task.toLowerCase().includes(query) ||
        task.userStory.toLowerCase().includes(query) ||
        task.owner.toLowerCase().includes(query) ||
        task.assign.toLowerCase().includes(query) ||
        task.notes.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (filterStatus !== 'All') {
      result = result.filter(task => task.status === filterStatus);
    }

    // Sort
    if (sortField) {
      result.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortDirection === 'asc' ? comparison : -comparison;
        }
        return 0;
      });
    }

    return result;
  }, [tasks, searchQuery, filterStatus, sortField, sortDirection]);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'To Do').length,
      inProgress: tasks.filter(t => t.status === 'In Progress').length,
      inReview: tasks.filter(t => t.status === 'In Review').length,
      done: tasks.filter(t => t.status === 'Done').length
    };
  }, [tasks]);

  const handleAddTask = () => {
    setEditingTask(createEmptyTask());
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = (task: Task) => {
    const existingIndex = tasks.findIndex(t => t.id === task.id);
    if (existingIndex >= 0) {
      const newTasks = [...tasks];
      newTasks[existingIndex] = task;
      setTasks(newTasks);
    } else {
      setTasks([...tasks, task]);
    }
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      setTasks(tasks.filter(t => t.id !== taskId));
    }
  };

  const handleSort = (field: keyof Task) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(tasks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scrum-tasks-${new Date().toISOString().split('T')[0]}.json`;
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
          if (Array.isArray(imported)) {
            setTasks(imported);
          }
        } catch (error) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Scrum Project Management</h1>
        <div className="header-actions">
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
          <button className="btn btn-primary" onClick={handleAddTask}>
            + Add Task
          </button>
        </div>
      </header>

      <div className="stats-bar">
        <div className="stat-item">
          <span>Total:</span>
          <span className="stat-count">{stats.total}</span>
        </div>
        <div className="stat-item">
          <span>To Do:</span>
          <span className="stat-count">{stats.todo}</span>
        </div>
        <div className="stat-item">
          <span>In Progress:</span>
          <span className="stat-count">{stats.inProgress}</span>
        </div>
        <div className="stat-item">
          <span>In Review:</span>
          <span className="stat-count">{stats.inReview}</span>
        </div>
        <div className="stat-item">
          <span>Done:</span>
          <span className="stat-count">{stats.done}</span>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as TaskStatus | 'All')}
        >
          <option value="All">All Status</option>
          {STATUS_OPTIONS.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <div className="table-container">
        <TaskTable
          tasks={filteredAndSortedTasks}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      </div>

      <TaskModal
        task={editingTask}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
      />
    </div>
  );
}

export default App;
