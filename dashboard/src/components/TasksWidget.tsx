import React, { useState } from 'react';
import { Trash2, Plus, Calendar, CheckCircle2, Circle } from 'lucide-react';

interface Task {
  id: number;
  text: string;
  category: string;
  completed: boolean;
  dueDate: string;
}

export const TasksWidget: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, text: 'Deploy update to staging servers', category: 'DevOps', completed: true, dueDate: 'Today' },
    { id: 2, text: 'Review feedback on dashboard layout mockups', category: 'Design', completed: false, dueDate: 'Tomorrow' },
    { id: 3, text: 'Audit security logs for access filters', category: 'Security', completed: false, dueDate: 'August 12' },
    { id: 4, text: 'Prepare documentation slides for final demo', category: 'Content', completed: false, dueDate: 'August 15' },
  ]);

  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Design');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('all');

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask: Task = {
      id: Date.now(),
      text: newTaskText,
      category: newTaskCategory,
      completed: false,
      dueDate: 'Soon',
    };

    setTasks([...tasks, newTask]);
    setNewTaskText('');
  };

  const filteredTasks = tasks.filter(t => {
    if (activeFilter === 'active') return !t.completed;
    if (activeFilter === 'completed') return t.completed;
    return true;
  });

  const completionPercent = tasks.length > 0 
    ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)
    : 0;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }} className="glass-panel">
      
      {/* Title & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '20px' }}>Task Workspace</h3>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Keep track of active milestones</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{completionPercent}%</span>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Completed</div>
        </div>
      </div>

      {/* Dynamic Progress Bar */}
      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
        <div 
          style={{ 
            width: `${completionPercent}%`, 
            height: '100%', 
            background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))',
            transition: 'width 0.4s ease'
          }} 
        />
      </div>

      {/* Task Creation Form */}
      <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="Add a new task milestone..."
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 16px',
            background: 'rgba(0,0,0,0.1)',
            border: '1px solid var(--border-panel)',
            borderRadius: '10px',
            color: 'var(--text-title)',
            outline: 'none',
            fontSize: '14px'
          }}
        />
        <select
          value={newTaskCategory}
          onChange={(e) => setNewTaskCategory(e.target.value)}
          style={{
            padding: '10px 12px',
            background: 'var(--bg-app)',
            border: '1px solid var(--border-panel)',
            borderRadius: '10px',
            color: 'var(--text-title)',
            outline: 'none',
            fontSize: '14px',
            width: '120px'
          }}
        >
          <option value="Design">Design</option>
          <option value="DevOps">DevOps</option>
          <option value="Security">Security</option>
          <option value="Content">Content</option>
        </select>
        <button
          type="submit"
          style={{
            background: 'var(--accent-purple)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}
        >
          <Plus size={20} />
        </button>
      </form>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-panel)', paddingBottom: '10px' }}>
        {(['all', 'active', 'completed'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: '8px',
              background: activeFilter === filter ? 'rgba(0, 242, 254, 0.1)' : 'transparent',
              color: activeFilter === filter ? 'var(--accent-cyan)' : 'var(--text-main)',
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'capitalize'
            }}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
        {filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '14px' }}>
            No tasks found.
          </div>
        ) : (
          filteredTasks.map((t) => (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-panel)',
                transition: 'var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-panel)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => toggleTask(t.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    color: t.completed ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {t.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span 
                    style={{ 
                      fontSize: '14px', 
                      color: t.completed ? 'var(--text-muted)' : 'var(--text-title)',
                      textDecoration: t.completed ? 'line-through' : 'none'
                    }}
                  >
                    {t.text}
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span 
                      style={{ 
                        fontSize: '10px', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.05)',
                        color: t.category === 'DevOps' ? '#f59e0b' : (t.category === 'Security' ? '#ef4444' : '#10b981')
                      }}
                    >
                      {t.category}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} />
                      {t.dueDate}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteTask(t.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'red'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
