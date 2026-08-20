import React from 'react';
import { Award, CheckCircle, Clock, PieChart, ShieldCheck } from 'lucide-react';

export default function WeeklyOverview({ tasks, members }) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const memberStats = members.map(m => {
    const memberTasks = tasks.filter(t => t.member_id === m.id);
    const memberDone = memberTasks.filter(t => t.completed).length;
    const rate = memberTasks.length > 0 ? Math.round((memberDone / memberTasks.length) * 100) : 0;
    return {
      ...m,
      total: memberTasks.length,
      done: memberDone,
      pending: memberTasks.length - memberDone,
      rate
    };
  });

  return (
    <div className="animate-fade-in">
      {/* Top Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justify: 'center' }}>
            <PieChart color="var(--accent-indigo)" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Progreso Semanal</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{completionRate}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{completedTasks} de {totalTasks} tareas</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justify: 'center' }}>
            <CheckCircle color="var(--accent-emerald)" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tareas Listas</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{completedTasks}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>¡Excelente trabajo en equipo!</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justify: 'center' }}>
            <Clock color="var(--accent-amber)" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pendientes</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-amber)' }}>{totalTasks - completedTasks}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Por realizar en los turnos</div>
          </div>
        </div>
      </div>

      {/* Members Leaderboard & Progress */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award color="#fbbf24" size={20} /> Cumplimiento por Integrante
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {memberStats.map(m => (
            <div key={m.id} className="glass-card-interactive" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>{m.avatar}</span>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{m.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem', color: m.rate === 100 ? 'var(--accent-emerald)' : '#fff' }}>
                    {m.done} / {m.total} tareas
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    ({m.rate}%)
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${m.rate}%`,
                    background: m.rate === 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    borderRadius: '10px',
                    transition: 'width 0.5s ease'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
