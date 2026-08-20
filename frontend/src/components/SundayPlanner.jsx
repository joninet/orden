import React, { useState } from 'react';
import { Calendar, Plus, Trash2, Save, Sparkles, RefreshCw, Sun, Moon } from 'lucide-react';
import { bulkSyncTasks } from '../api';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];

const PRESETS = [
  { title: '🚽 Limpiar Baño', shift: 'manana' },
  { title: '🍳 Limpiar Cocina', shift: 'tarde' },
  { title: '🗑️ Sacar Basura', shift: 'tarde' },
  { title: '🍽️ Lavar Platos', shift: 'manana' },
  { title: '🧹 Pasar Aspiradora / Trapo', shift: 'manana' },
  { title: '🛋️ Ordenar Livings', shift: 'tarde' },
  { title: '🧺 Lavar Ropa', shift: 'manana' },
  { title: '🪟 Limpiar Vidrios', shift: 'tarde' },
  { title: '🛒 Hacer Compras', shift: 'manana' },
  { title: '🪴 Regar Plantas', shift: 'tarde' }
];

export default function SundayPlanner({ initialTasks, members, onPlannerSaved }) {
  const [plannerTasks, setPlannerTasks] = useState(
    initialTasks.map(t => ({
      id: t.id,
      title: t.title,
      day_of_week: t.day_of_week,
      shift: t.shift,
      member_id: t.member_id,
      completed: t.completed
    }))
  );

  const [saving, setSaving] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [targetDay, setTargetDay] = useState(1); // Lunes default
  const [targetShift, setTargetShift] = useState('manana');
  const [targetMember, setTargetMember] = useState(members[0]?.id || 1);

  const addPresetToDay = (preset, dayIndex) => {
    const defaultMemberId = members[(plannerTasks.length) % members.length]?.id || members[0]?.id;
    setPlannerTasks(prev => [
      ...prev,
      {
        title: preset.title,
        day_of_week: dayIndex,
        shift: preset.shift,
        member_id: defaultMemberId,
        completed: 0
      }
    ]);
  };

  const addCustomTask = (e) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    setPlannerTasks(prev => [
      ...prev,
      {
        title: customTitle.trim(),
        day_of_week: parseInt(targetDay),
        shift: targetShift,
        member_id: parseInt(targetMember),
        completed: 0
      }
    ]);
    setCustomTitle('');
  };

  const removePlannerTask = (index) => {
    setPlannerTasks(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateTaskMember = (index, memberId) => {
    setPlannerTasks(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], member_id: parseInt(memberId) };
      return updated;
    });
  };

  const updateTaskShift = (index, shift) => {
    setPlannerTasks(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], shift };
      return updated;
    });
  };

  const handleSavePlanner = async () => {
    setSaving(true);
    try {
      await bulkSyncTasks(plannerTasks);
      alert('🎉 ¡Organización semanal guardada exitosamente! Todos recibirán sus alertas automáticas.');
      onPlannerSaved();
    } catch (err) {
      alert('Error guardando planificación: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const clearAllTasks = () => {
    if (confirm('¿Deseas vaciar la grilla para empezar la organización del domingo desde cero?')) {
      setPlannerTasks([]);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header Banner */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
            <Calendar color="var(--accent-indigo)" /> 🗓️ Reunión de Domingo - Planificador Semanal
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Júntense los domingos para repartir las tareas de la semana entre los 4 integrantes (Mañana 09:00 hs / Tarde 17:00 hs).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary btn-sm" onClick={clearAllTasks}>
            <RefreshCw size={14} /> Empezar de Cero
          </button>
          <button className="btn-primary" onClick={handleSavePlanner} disabled={saving}>
            <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Organización'}
          </button>
        </div>
      </div>

      {/* Preset Tasks Quick Buttons */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Sparkles size={16} color="#f59e0b" /> Tareas Rápidas Recomendadas (Haz clic para agregar al Lunes)
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              className="btn-secondary btn-sm"
              onClick={() => addPresetToDay(preset, 1)}
              style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
            >
              <Plus size={12} /> {preset.title}
            </button>
          ))}
        </div>
      </div>

      {/* Add Custom Task Box */}
      <form onSubmit={addCustomTask} className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>➕ Agregar Tarea Personalizada</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Nombre de Tarea</label>
            <input
              type="text"
              placeholder="ej. Ordenar alacena"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Día</label>
            <select
              value={targetDay}
              onChange={(e) => setTargetDay(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
            >
              {WEEK_DAYS.map(dayIndex => (
                <option key={DAYS[dayIndex]} value={dayIndex}>{DAYS[dayIndex]}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Turno</label>
            <select
              value={targetShift}
              onChange={(e) => setTargetShift(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
            >
              <option value="manana">☀️ Mañana (09:00 hs)</option>
              <option value="tarde">🌙 Tarde (17:00 hs)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Responsable</label>
            <select
              value={targetMember}
              onChange={(e) => setTargetMember(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.avatar} {m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <button type="submit" className="btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
              <Plus size={14} /> Añadir a la Grilla
            </button>
          </div>
        </div>
      </form>

      {/* 7 Days Grid */}
      <div className="planner-grid">
        {WEEK_DAYS.map(dayIndex => {
          const dayName = DAYS[dayIndex];
          const dayTasks = plannerTasks.map((t, index) => ({ ...t, index })).filter(t => t.day_of_week === dayIndex);

          return (
            <div key={dayName} className="glass-card day-card">
              <div className="day-header">
                <span className="day-title">{dayName}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {dayTasks.length} tareas
                </span>
              </div>

              {dayTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  Sin tareas asignadas.
                </div>
              ) : (
                dayTasks.map((t) => (
                  <div key={t.index} className="glass-card-interactive" style={{ padding: '0.75rem', marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.title}</div>
                      <button
                        onClick={() => removePlannerTask(t.index)}
                        style={{ background: 'none', color: '#f43f5e', opacity: 0.7, padding: '2px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select
                        value={t.shift}
                        onChange={(e) => updateTaskShift(t.index, e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.3rem 0.4rem',
                          background: 'rgba(15,23,42,0.6)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: t.shift === 'manana' ? '#fbbf24' : '#c084fc',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      >
                        <option value="manana">☀️ Mañana</option>
                        <option value="tarde">🌙 Tarde</option>
                      </select>

                      <select
                        value={t.member_id || ''}
                        onChange={(e) => updateTaskMember(t.index, e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.3rem 0.4rem',
                          background: 'rgba(15,23,42,0.6)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '0.75rem'
                        }}
                      >
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.avatar} {m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
