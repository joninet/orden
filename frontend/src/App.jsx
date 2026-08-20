import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, CheckSquare, BarChart3, RefreshCw } from 'lucide-react';
import { fetchMembers, fetchTasks } from './api';
import ProfileSelector from './components/ProfileSelector';
import NotificationSetup from './components/NotificationSetup';
import DailyView from './components/DailyView';
import SundayPlanner from './components/SundayPlanner';
import WeeklyOverview from './components/WeeklyOverview';
import OnboardingModal from './components/OnboardingModal';

const USER_STORAGE_KEY = 'limpieza_user_id';

export default function App() {
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'planner' | 'stats'
  const [members, setMembers] = useState([]);
  const [activeMemberId, setActiveMemberId] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();

    // Register Service Worker for PWA Push Notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('SW registration warning:', err);
      });
    }
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [membersData, tasksData] = await Promise.all([
        fetchMembers(),
        fetchTasks()
      ]);
      setMembers(membersData);

      // Check saved user in localStorage
      const savedUserId = localStorage.getItem(USER_STORAGE_KEY);
      if (savedUserId && membersData.some(m => m.id === parseInt(savedUserId))) {
        setActiveMemberId(parseInt(savedUserId));
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
      }

      setTasks(tasksData);
    } catch (err) {
      console.error('Error cargando datos iniciales:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMember = (id) => {
    setActiveMemberId(id);
    localStorage.setItem(USER_STORAGE_KEY, id);
    setShowOnboarding(false);
  };

  const reloadTasks = async () => {
    try {
      const tasksData = await fetchTasks();
      setTasks(tasksData);
    } catch (err) {
      console.error('Error recargando tareas:', err);
    }
  };

  const handleMemberUpdated = (updatedMember) => {
    setMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
    reloadTasks();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '0.75rem' }}>
        <RefreshCw className="animate-spin" size={24} color="var(--accent-indigo)" />
        <span style={{ fontWeight: 600 }}>Cargando Limpieza Desplats...</span>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* First Time Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal
          members={members}
          onSelectMember={handleSelectMember}
        />
      )}

      {/* App Header & Navigation */}
      <div className="glass-card navbar">
        <div className="brand">
          <div className="brand-icon">🧹</div>
          <div>
            <div className="brand-title">Limpieza Desplats</div>
            <div className="brand-subtitle">Organización del Hogar</div>
          </div>
        </div>

        <div className="nav-tabs">
          <button
            className={`nav-btn ${activeTab === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveTab('daily')}
          >
            <CheckSquare size={16} /> Hoy & Turnos
          </button>

          <button
            className={`nav-btn ${activeTab === 'planner' ? 'active' : ''}`}
            onClick={() => setActiveTab('planner')}
          >
            <Calendar size={16} /> Reunión Domingo
          </button>

          <button
            className={`nav-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <BarChart3 size={16} /> Estadísticas
          </button>
        </div>
      </div>

      {/* Profile Switcher */}
      <ProfileSelector
        members={members}
        activeMemberId={activeMemberId}
        onSelectMember={handleSelectMember}
        onMemberUpdated={handleMemberUpdated}
      />

      {/* Push Notification Setup & Test Banner */}
      {activeMemberId && (
        <NotificationSetup
          activeMemberId={activeMemberId}
          members={members}
        />
      )}

      {/* Tab Content */}
      {activeTab === 'daily' && (
        <DailyView
          tasks={tasks}
          members={members}
          activeMemberId={activeMemberId}
          onTasksChanged={reloadTasks}
        />
      )}

      {activeTab === 'planner' && (
        <SundayPlanner
          initialTasks={tasks}
          members={members}
          onPlannerSaved={() => {
            reloadTasks();
            setActiveTab('daily');
          }}
        />
      )}

      {activeTab === 'stats' && (
        <WeeklyOverview
          tasks={tasks}
          members={members}
        />
      )}
    </div>
  );
}
