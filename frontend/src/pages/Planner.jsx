import React, { useState, useEffect, useMemo } from 'react';
import {
  Columns,
  Calendar,
  BarChart3,
  Plus,
  MoreHorizontal,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Circle,
  X,
  Trash2,
  Edit2
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { plannerApi } from '../api/index.js';

// ── Helpers ───────────────────────────────────────────────────

const PRIORITIES = {
  low: { label: 'Low', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  high: { label: 'High', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const STATUSES = [
  { id: 'todo', label: 'To Do', icon: <Circle size={14} /> },
  { id: 'doing', label: 'In Progress', icon: <AlertCircle size={14} /> },
  { id: 'done', label: 'Completed', icon: <CheckCircle2 size={14} /> },
];

export default function Planner() {
  const { selectedProjectId, projects, toast } = useApp();
  const [view, setView] = useState('kanban'); // kanban, calendar, timeline
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);

  const selectedProject = useMemo(() =>
    projects.find(p => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  useEffect(() => {
    if (selectedProjectId) {
      fetchTasks();
    }
  }, [selectedProjectId]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await plannerApi.get(selectedProjectId);
      setTasks(res.tasks || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveTasks(newTasks) {
    try {
      await plannerApi.save(selectedProjectId, newTasks);
      setTasks(newTasks);
    } catch (err) {
      toast('Failed to save changes', 'error');
    }
  }

  function handleAddTask() {
    setCurrentTask({
      id: Date.now().toString(),
      title: '',
      desc: '',
      status: 'todo',
      priority: 'medium',
      date: new Date().toISOString().split('T')[0],
      duration: 1
    });
    setIsModalOpen(true);
  }

  function handleEditTask(task) {
    setCurrentTask(task);
    setIsModalOpen(true);
  }

  function handleDeleteTask(taskId) {
    const newTasks = tasks.filter(t => t.id !== taskId);
    saveTasks(newTasks);
    toast('Task deleted');
  }

  function handleSaveTask(e) {
    e.preventDefault();
    let newTasks;
    if (tasks.find(t => t.id === currentTask.id)) {
      newTasks = tasks.map(t => t.id === currentTask.id ? currentTask : t);
    } else {
      newTasks = [...tasks, currentTask];
    }
    saveTasks(newTasks);
    setIsModalOpen(false);
    toast(tasks.find(t => t.id === currentTask.id) ? 'Task updated' : 'Task added');
  }

  function moveTask(taskId, newStatus) {
    const newTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    saveTasks(newTasks);
  }

  if (!selectedProjectId) {
    return (
      <div className="planner-page empty">
        <div className="empty-state">
          <Calendar size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
          <h2>Select a project to start planning</h2>
          <p>Task management, calendars, and timelines specific to each repository.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="planner-page">
      <header className="planner-header">
        <div className="planner-title">
          <div className="project-badge">
            {selectedProject?.icon || '📁'} {selectedProject?.name}
          </div>
          <h1>Project Planner</h1>
        </div>

        <div className="planner-controls">
          <div className="view-switcher">
            <button
              className={view === 'kanban' ? 'active' : ''}
              onClick={() => setView('kanban')}
            >
              <Columns size={16} /> Kanban
            </button>
            <button
              className={view === 'calendar' ? 'active' : ''}
              onClick={() => setView('calendar')}
            >
              <Calendar size={16} /> Calendar
            </button>
            <button
              className={view === 'timeline' ? 'active' : ''}
              onClick={() => setView('timeline')}
            >
              <BarChart3 size={16} /> Timeline
            </button>
          </div>

          <button className="btn btn-primary" onClick={handleAddTask}>
            <Plus size={16} /> Add Task
          </button>
        </div>
      </header>

      <main className="planner-content">
        {loading ? (
          <div className="loading-state"><div className="spinner" /></div>
        ) : (
          <div className="view-container">
            {view === 'kanban' && (
              <KanbanView
                tasks={tasks}
                onMove={moveTask}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            )}
            {view === 'calendar' && (
              <CalendarView tasks={tasks} onEdit={handleEditTask} />
            )}
            {view === 'timeline' && (
              <TimelineView tasks={tasks} onEdit={handleEditTask} />
            )}
          </div>
        )}
      </main>

      {/* Task Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card task-modal">
            <div className="modal-header">
              <h2>{tasks.find(t => t.id === currentTask.id) ? 'Edit Task' : 'New Task'}</h2>
            </div>
            <form onSubmit={handleSaveTask}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={currentTask.title}
                  required
                  onChange={e => setCurrentTask({ ...currentTask, title: e.target.value })}
                  placeholder="What needs to be done?"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={currentTask.status}
                    onChange={e => setCurrentTask({ ...currentTask, status: e.target.value })}
                  >
                    {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={currentTask.priority}
                    onChange={e => setCurrentTask({ ...currentTask, priority: e.target.value })}
                  >
                    {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={currentTask.date}
                    onChange={e => setCurrentTask({ ...currentTask, date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Duration (days)</label>
                  <input
                    type="number"
                    min="1"
                    value={currentTask.duration}
                    onChange={e => setCurrentTask({ ...currentTask, duration: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={currentTask.desc}
                  onChange={e => setCurrentTask({ ...currentTask, desc: e.target.value })}
                  placeholder="Add more details..."
                  rows={3}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .planner-page {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 24px;
          color: var(--text-main);
        }
        .planner-page.empty {
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .planner-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 32px;
        }
        .planner-title h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 4px 0 0 0;
          background: #fff;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .project-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .planner-controls {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .view-switcher {
          display: flex;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          padding: 4px;
          border-radius: 10px;
        }
        .view-switcher button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          transition: all 0.2s;
        }
        .view-switcher button:hover {
          color: #fff;
        }
        .view-switcher button.active {
          background: var(--accent);
          color: #000;
          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
        }
        .planner-content {
          flex: 1;
          min-height: 0;
        }
        .view-container {
          height: 100%;
        }

        /* Task Cards */
        .task-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .task-card:hover {
          border-color: var(--border-hover);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }
        .task-priority {
          display: inline-block;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        .task-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 6px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .task-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 12px;
        }
        .task-date {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-muted);
        }
        .task-actions {
          display: flex;
          gap: 4px;
          opacity: 1;
          transition: opacity 0.2s;
        }
        .task-card:hover .task-actions {
          opacity: 1;
        }
        .task-actions button {
          padding: 4px;
          color: white;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .task-actions button:hover {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }
        .task-actions button.delete:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .task-modal {
          width: 480px;
          max-width: 90vw;
          padding: 24px;
        }
        .form-row {
          display: flex;
          gap: 16px;
        }
        .form-row .form-group {
          flex: 1;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 6px;
        }
        .form-group input, 
        .form-group select, 
        .form-group textarea {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 12px;
          color: #fff;
          font-size: 14px;
        }
        .form-group textarea {
          resize: vertical;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
      `}</style>
    </div>
  );
}

// ── View Sub-components ──────────────────────────────────────

function KanbanView({ tasks, onMove, onEdit, onDelete }) {
  return (
    <div className="kanban-grid">
      {STATUSES.map(status => (
        <div key={status.id} className="kanban-col">
          <div className="col-header">
            <div className="col-title">
              {status.icon}
              {status.label}
              <span className="count">{tasks.filter(t => t.status === status.id).length}</span>
            </div>
          </div>
          <div className="col-tasks">
            {tasks.filter(t => t.status === status.id).map(task => (
              <div key={task.id} className="task-card" onClick={() => onEdit(task)}>
                <span className="task-priority" style={{ color: PRIORITIES[task.priority].color, background: PRIORITIES[task.priority].bg }}>
                  {PRIORITIES[task.priority].label}
                </span>
                <div className="task-title">{task.title}</div>
                {task.desc && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{task.desc.slice(0, 60)}...</div>}
                <div className="task-footer">
                  <div className="task-date"><Clock size={12} /> {task.date}</div>
                  <div className="task-actions" onClick={e => e.stopPropagation()}>
                    <button onClick={() => onDelete(task.id)}><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
            {tasks.filter(t => t.status === status.id).length === 0 && (
              <div className="empty-col">No tasks</div>
            )}
          </div>
        </div>
      ))}

      <style>{`
        .kanban-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          height: 100%;
        }
        .kanban-col {
          display: flex;
          flex-direction: column;
          background: rgba(255,255,255,0.02);
          border-radius: 16px;
          border: 1px solid var(--border);
          overflow: hidden;
        }
        .col-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }
        .col-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 15px;
        }
        .col-title .count {
          font-size: 11px;
          background: rgba(255,255,255,0.1);
          padding: 2px 8px;
          border-radius: 20px;
          color: var(--text-muted);
        }
        .col-tasks {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
        }
        .empty-col {
          padding: 40px 0;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

function CalendarView({ tasks, onEdit }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();

    const result = [];
    // Padding for first week
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
      result.push(null);
    }
    for (let i = 1; i <= days; i++) {
      result.push(new Date(year, month, i));
    }
    return result;
  }, [currentMonth]);

  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  }
  function prevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  }

  return (
    <div className="calendar-view">
      <div className="cal-header">
        <h2 className="month-name">
          {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="cal-nav">
          <button onClick={prevMonth}><ChevronLeft size={18} /></button>
          <button onClick={() => setCurrentMonth(new Date())}>Today</button>
          <button onClick={nextMonth}><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="cal-grid">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="weekday-label">{d}</div>
        ))}
        {daysInMonth.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="cal-cell empty" />;

          const dateStr = date.toISOString().split('T')[0];
          const dayTasks = tasks.filter(t => t.date === dateStr);
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <div key={dateStr} className={`cal-cell${isToday ? ' today' : ''}`}>
              <div className="cell-num">{date.getDate()}</div>
              <div className="cell-tasks">
                {dayTasks.map(t => (
                  <div
                    key={t.id}
                    className="cal-task-pill"
                    style={{ background: PRIORITIES[t.priority].bg, color: PRIORITIES[t.priority].color }}
                    onClick={() => onEdit(t)}
                  >
                    {t.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .calendar-view {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .cal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .month-name {
          font-size: 20px;
          font-weight: 700;
        }
        .cal-nav {
          display: flex;
          gap: 12px;
        }
        .cal-nav button {
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .cal-nav button:hover {
          border-color: var(--accent);
          background: rgba(var(--accent-rgb), 0.1);
        }
        .cal-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          grid-template-rows: auto repeat(6, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }
        .weekday-label {
          background: rgba(255,255,255,0.02);
          padding: 10px;
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .cal-cell {
          background: var(--bg-card);
          padding: 10px;
          min-height: 100px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .cal-cell.empty {
          background: var(--bg-main);
        }
        .cal-cell.today .cell-num {
          background: var(--accent);
          color: #fff;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .cell-num {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .cal-task-pill {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
          border: 1px solid transparent;
        }
        .cal-task-pill:hover {
          filter: brightness(1.2);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}

function TimelineView({ tasks, onEdit }) {
  const sortedTasks = useMemo(() =>
    [...tasks].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [tasks]
  );

  const stats = useMemo(() => {
    if (!tasks.length) return null;
    const start = new Date(Math.min(...tasks.map(t => new Date(t.date))));
    const end = new Date(Math.max(...tasks.map(t => {
      const d = new Date(t.date);
      d.setDate(d.getDate() + (t.duration || 1));
      return d;
    })));

    // Add 2 days padding
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() + 1);

    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return { start, end, totalDays };
  }, [tasks]);

  if (!tasks.length) {
    return (
      <div className="empty-state" style={{ padding: 60 }}>
        <h2>No timeline data available</h2>
        <p>Add tasks with durations to see them on the timeline.</p>
      </div>
    );
  }

  return (
    <div className="timeline-view">
      <div className="timeline-grid">
        <div className="timeline-header-row">
          <div className="task-name-col">Task</div>
          <div className="timeline-bar-col">
            <div className="timeline-weeks">
              {/* Day headers could go here */}
              Range: {stats.start.toLocaleDateString()} to {stats.end.toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="timeline-rows">
          {sortedTasks.map(task => {
            const taskStart = new Date(task.date);
            const offset = Math.ceil((taskStart - stats.start) / (1000 * 60 * 60 * 24));
            const width = task.duration || 1;
            const percentWidth = (width / stats.totalDays) * 100;
            const percentOffset = (offset / stats.totalDays) * 100;

            return (
              <div key={task.id} className="timeline-row" onClick={() => onEdit(task)}>
                <div className="task-name-col">
                  <div className="task-name-label">{task.title}</div>
                  <div className="task-status-label">{task.status}</div>
                </div>
                <div className="timeline-bar-col">
                  <div
                    className="task-bar"
                    style={{
                      left: `${percentOffset}%`,
                      width: `${percentWidth}%`,
                      backgroundColor: PRIORITIES[task.priority].color
                    }}
                  >
                    <span className="task-bar-label">{task.duration}d</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .timeline-view {
          height: 100%;
          overflow: auto;
        }
        .timeline-grid {
          display: flex;
          flex-direction: column;
          min-width: 800px;
        }
        .timeline-header-row {
          display: flex;
          border-bottom: 2px solid var(--border);
          padding-bottom: 12px;
          margin-bottom: 12px;
        }
        .task-name-col {
          width: 200px;
          flex-shrink: 0;
          font-weight: 700;
          font-size: 13px;
          color: var(--text-muted);
        }
        .timeline-bar-col {
          flex: 1;
          position: relative;
        }
        .timeline-header-row .timeline-bar-col {
          font-size: 11px;
          color: var(--text-muted);
          text-align: center;
        }
        .timeline-row {
          display: flex;
          align-items: center;
          height: 54px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transition: background 0.2s;
          cursor: pointer;
        }
        .timeline-row:hover {
          background: rgba(255,255,255,0.02);
        }
        .task-name-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-main);
        }
        .task-status-label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .task-bar {
          position: absolute;
          height: 24px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: all 0.3s;
        }
        .task-bar-label {
          font-size: 9px;
          font-weight: 800;
          color: #fff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
}
