import React, { useState } from 'react';
import { Sun, Moon, CheckSquare, Square, Plus, Trash2, Calendar, User, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { createTask, updateTask, deleteTask } from '../api';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];

export default function DailyView({ tasks, members, activeMemberId, onTasksChanged }) {
  const currentDayIndex = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(currentDayIndex);
  const [filterMyTasks, setFilterMyTasks] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newShift, setNewShift] = useState('manana');
  const [newMemberId, setNewMemberId] = useState(activeMemberId || members[0]?.id || 1);

  const activeMember = members.find(m => m.id === activeMemberId);

  const filteredTasks = tasks.filter(t => {
    if (t.day_of_week !== selectedDay) return false;
    if (filterMyTasks && t.member_id !== activeMemberId) return false;
    return true;
  });

  const mananaTasks = filteredTasks.filter(t => t.shift === 'manana');
  const tardeTasks = filteredTasks.filter(t => t.shift === 'tarde');

  const toggleTaskCompleted = async (task) => {
    const nextState = !task.completed;
    if (nextState) {
      // Trigger festive confetti effect
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.75 }
      });
    }

    try {
      await updateTask(task.id, { completed: nextState });
      onTasksChanged();
    } catch (err) {
      alert('Error al actualizar tarea: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    try {
      await deleteTask(id);
      onTasksChanged();
    } catch (err) {
      alert('Error al eliminar tarea: ' + err.message);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await createTask({
        title: newTitle.trim(),
        day_of_week: selectedDay,
        shift: newShift,
        member_id: newMemberId
      });
      setNewTitle('');
      setShowAddForm(false);
      onTasksChanged();
    } catch (err) {
      alert('Error al crear tarea: ' + err.message);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Days Tabs Header */}
      <div className="glass-card" style={{ padding: '0.75rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '0.5rem', minWidth: 'max-content' }}>
          {WEEK_DAYS.map((dayIndex) => {
            const dayName = DAYS[dayIndex];
            const isToday = dayIndex === currentDayIndex;
            const isSelected = dayIndex === selectedDay;
            return (
              <button
                key={dayName}
                onClick={() => setSelectedDay(dayIndex)}
                style={{
                  padding: '0.6rem 1.1rem',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  border: isSelected ? '1px solid var(--accent-indigo)' : '1px solid transparent',
                  background: isSelected ? 'rgba(99, 102, 241, 0.2)' : (isToday ? 'rgba(255,255,255,0.06)' : 'transparent'),
                  color: isSelected ? '#fff' : (isToday ? 'var(--accent-indigo)' : 'var(--text-muted)'),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <span className="day-label-full">{dayName}</span>
                <span className="day-label-short">{dayName.slice(0, 3)}</span>
                {isToday && <span style={{ fontSize: '0.65rem', background: 'var(--accent-indigo)', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>Hoy</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            {DAYS[selectedDay]}
          </h2>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            ({filteredTasks.filter(t => t.completed).length}/{filteredTasks.length} completadas)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className={`btn-secondary btn-sm ${filterMyTasks ? 'active' : ''}`}
            onClick={() => setFilterMyTasks(!filterMyTasks)}
            style={{
              borderColor: filterMyTasks ? 'var(--accent-indigo)' : 'var(--border-color)',
              background: filterMyTasks ? 'rgba(99, 102, 241, 0.2)' : undefined
            }}
          >
            <User size={14} />
            {filterMyTasks ? `Solo ${activeMember?.name || 'mías'}` : 'Ver de Todos'}
          </button>

          <button className="btn-primary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={16} /> Agregar Tarea
          </button>
        </div>
      </div>

      {/* Add Quick Task Inline Form */}
      {showAddForm && (
        <form onSubmit={handleCreateTask} className="glass-card animate-fade-in" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={16} color="var(--accent-indigo)" /> Nueva Tarea para el {DAYS[selectedDay]}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Nombre de la Tarea</label>
              <input
                type="text"
                placeholder="ej. Limpiar espejo del baño"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '10px', color: '#fff', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Turno del Día</label>
              <select
                value={newShift}
                onChange={(e) => setNewShift(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '10px', color: '#fff', fontSize: '0.9rem' }}
              >
                <option value="manana">☀️ Mañana (09:00 hs)</option>
                <option value="tarde">🌙 Tarde (17:00 hs)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Asignar a</label>
              <select
                value={newMemberId}
                onChange={(e) => setNewMemberId(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '10px', color: '#fff', fontSize: '0.9rem' }}
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.avatar} {m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setShowAddForm(false)}>Cancelar</button>
            <button type="submit" className="btn-primary btn-sm">Guardar Tarea</button>
          </div>
        </form>
      )}

      {/* Shifts Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Morning Shift */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div className="day-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sun color="#f59e0b" size={22} />
              <div>
                <span className="shift-badge manana">☀️ Turno Mañana</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Aviso automático a las 09:00 hs</div>
              </div>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>
              {mananaTasks.length} tarea/s
            </span>
          </div>

          {mananaTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
              No hay tareas asignadas para la mañana de este día. ✨
            </div>
          ) : (
            mananaTasks.map(t => (
              <div key={t.id} className={`glass-card-interactive task-item ${t.completed ? 'completed' : ''}`}>
                <div className={`task-checkbox ${t.completed ? 'checked' : ''}`} onClick={() => toggleTaskCompleted(t)}>
                  {t.completed && <CheckSquare size={18} />}
                </div>

                <div className="task-content" onClick={() => toggleTaskCompleted(t)} style={{ cursor: 'pointer' }}>
                  <div className="task-title">{t.title}</div>
                  <div className="task-meta">
                    <span className="member-tag">
                      {t.member_avatar} {t.member_name}
                    </span>
                    {t.completed_at && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>
                        ✓ Listo
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(t.id)}
                  style={{ background: 'none', color: 'var(--text-dim)', opacity: 0.6, padding: '4px' }}
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Afternoon Shift */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div className="day-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Moon color="#c084fc" size={22} />
              <div>
                <span className="shift-badge tarde">🌙 Turno Tarde</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Aviso automático a las 17:00 hs</div>
              </div>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c084fc' }}>
              {tardeTasks.length} tarea/s
            </span>
          </div>

          {tardeTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
              No hay tareas asignadas para la tarde de este día. ✨
            </div>
          ) : (
            tardeTasks.map(t => (
              <div key={t.id} className={`glass-card-interactive task-item ${t.completed ? 'completed' : ''}`}>
                <div className={`task-checkbox ${t.completed ? 'checked' : ''}`} onClick={() => toggleTaskCompleted(t)}>
                  {t.completed && <CheckSquare size={18} />}
                </div>

                <div className="task-content" onClick={() => toggleTaskCompleted(t)} style={{ cursor: 'pointer' }}>
                  <div className="task-title">{t.title}</div>
                  <div className="task-meta">
                    <span className="member-tag">
                      {t.member_avatar} {t.member_name}
                    </span>
                    {t.completed_at && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>
                        ✓ Listo
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(t.id)}
                  style={{ background: 'none', color: 'var(--text-dim)', opacity: 0.6, padding: '4px' }}
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
