import React, { useState } from 'react';
import { User, RefreshCw, Edit2, Check, X } from 'lucide-react';
import { updateMember } from '../api';

export default function ProfileSelector({ members, activeMemberId, onSelectMember, onMemberUpdated }) {
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  const activeMember = members.find(m => m.id === activeMemberId) || members[0];

  const startEdit = (m, e) => {
    e.stopPropagation();
    setEditingId(m.id);
    setEditName(m.name);
    setEditAvatar(m.avatar);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (m, e) => {
    e.stopPropagation();
    try {
      const updated = await updateMember(m.id, { name: editName, avatar: editAvatar, role: m.role }, activeMemberId);
      onMemberUpdated(updated);
      setEditingId(null);
    } catch (err) {
      alert('Error guardando integrante: ' + err.message);
    }
  };

  if (!showSwitchMenu && activeMember) {
    return (
      <div
        className="glass-card user-selector-bar animate-fade-in"
        style={{ padding: '0.75rem 1.25rem', marginBottom: '1.25rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.4rem' }}>{activeMember.avatar}</span>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>DISPOSITIVO CONFIGURADO PARA</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>{activeMember.name}</div>
          </div>
        </div>

        <button
          className="btn-secondary btn-sm"
          onClick={() => setShowSwitchMenu(true)}
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
        >
          <RefreshCw size={13} /> Cambiar Perfil
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card user-selector-bar animate-fade-in" style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <User size={18} color="var(--accent-indigo)" />
        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Seleccionar Perfil:</span>
      </div>

      <div className="user-chips">
        {members.map((m) => {
          const isActive = m.id === activeMemberId;
          const isEditing = editingId === m.id;

          if (isEditing) {
            return (
              <div key={m.id} className="user-chip active" style={{ padding: '0.3rem 0.6rem' }}>
                <input
                  type="text"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  style={{ width: '32px', textAlign: 'center', background: 'transparent', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px' }}
                />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: '80px', background: 'transparent', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.85rem' }}
                />
                <button onClick={(e) => saveEdit(m, e)} style={{ background: 'none', color: '#10b981', padding: '2px' }} title="Guardar">
                  <Check size={16} />
                </button>
                <button onClick={cancelEdit} style={{ background: 'none', color: '#f43f5e', padding: '2px' }} title="Cancelar">
                  <X size={16} />
                </button>
              </div>
            );
          }

          return (
            <div
              key={m.id}
              className={`user-chip ${isActive ? 'active' : ''}`}
              onClick={() => {
                onSelectMember(m.id);
                setShowSwitchMenu(false);
              }}
            >
              <span className="user-avatar">{m.avatar}</span>
              <span>{m.name}</span>
              {members.find(member => member.id === activeMemberId)?.role === 'admin' && (
                <button
                  onClick={(e) => startEdit(m, e)}
                  style={{ background: 'none', color: 'var(--text-dim)', padding: '2px', marginLeft: '4px' }}
                  title="Editar nombre/emoji"
                >
                  <Edit2 size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setShowSwitchMenu(false)}
        style={{ background: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
      >
        Ocultar
      </button>
    </div>
  );
}
