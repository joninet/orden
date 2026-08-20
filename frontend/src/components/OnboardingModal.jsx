import React from 'react';
import { UserCheck, Sparkles, Bell } from 'lucide-react';

export default function OnboardingModal({ members, onSelectMember }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(11, 15, 25, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
      className="animate-fade-in"
    >
      <div
        className="glass-card"
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: '2rem 1.75rem',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          border: '1px solid var(--border-highlight)'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 1.25rem',
            boxShadow: '0 8px 25px var(--accent-indigo-glow)'
          }}
        >
          🧹
        </div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.4rem' }}>
          ¡Bienvenido a Limpieza Desplats!
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
          ¿Quién está usando este celular? Guarda tu perfil para recibir <b>únicamente tus notificaciones</b> a las 09:00 hs y 17:00 hs.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectMember(m.id)}
              className="glass-card-interactive"
              style={{
                padding: '1.25rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.6rem',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.04)',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{m.avatar}</span>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>{m.name}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyCenter: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          <Bell size={14} color="var(--accent-indigo)" /> Tu elección quedará guardada en este dispositivo.
        </div>
      </div>
    </div>
  );
}
