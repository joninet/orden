import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { getVapidPublicKey, subscribeToPush, sendTestNotification, urlBase64ToUint8Array } from '../api';

export default function NotificationSetup({ activeMemberId, members }) {
  const [permission, setPermission] = useState(Notification.permission);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const activeMember = members.find(m => m.id === activeMemberId);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [activeMemberId]);

  const checkSubscriptionStatus = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      } catch (e) {
        console.error('Error al verificar suscripción push:', e);
      }
    }
  };

  const enableNotifications = async () => {
    setLoading(true);
    setStatusMsg('');
    setErrorMsg('');

    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Tu navegador o dispositivo no soporta notificaciones Web Push. Puedes agregar la app a tu pantalla de inicio.');
      }

      const resPerm = await Notification.requestPermission();
      setPermission(resPerm);

      if (resPerm !== 'granted') {
        throw new Error('Permiso de notificaciones denegado en tu navegador.');
      }

      // Register SW
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Get VAPID Key
      const vapidKey = await getVapidPublicKey();
      const convertedVapidKey = urlBase64ToUint8Array(vapidKey);

      // Subscribe
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // Send to backend
      await subscribeToPush(subscription.toJSON(), activeMemberId);

      setSubscribed(true);
      setStatusMsg('¡Notificaciones activadas con éxito! Recibirás los avisos a las 09:00 hs y 17:00 hs.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    setLoading(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      const res = await sendTestNotification(activeMemberId, `¡Hola ${activeMember?.name || ''}! Esta es una prueba de notificación en tu celular. 🧹`);
      setStatusMsg(`🎉 Se envió la notificación de prueba (${res.sentCount} dispositivo/s notificado/s). ¡Revisa la barra superior o bloqueo de tu celular!`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notification-banner animate-fade-in">
      <div className="notification-info">
        <div className="notification-icon">
          {subscribed ? <Bell color="var(--accent-emerald)" /> : <BellOff color="var(--accent-amber)" />}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.2rem' }}>
            {subscribed ? '🔔 Notificaciones Activas' : '⚠️ Activar Alertas en Celular'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {subscribed
              ? `Configurado para ${activeMember?.name || 'este dispositivo'}. Alertas programadas: Mañana (09:00 hs) y Tarde (17:00 hs).`
              : 'Presiona el botón para recibir recordatorios automáticos de tus tareas en el celular.'}
          </div>
          {statusMsg && (
            <div style={{ marginTop: '0.5rem', color: '#34d399', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} /> {statusMsg}
            </div>
          )}
          {errorMsg && (
            <div style={{ marginTop: '0.5rem', color: '#f87171', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {!subscribed ? (
          <button className="btn-primary" onClick={enableNotifications} disabled={loading}>
            <Bell size={18} />
            {loading ? 'Activando...' : 'Activar Notificaciones'}
          </button>
        ) : (
          <button className="btn-secondary" onClick={handleSendTest} disabled={loading}>
            <Send size={16} color="var(--accent-sky)" />
            {loading ? 'Enviando...' : 'Probar Notificación Ahora'}
          </button>
        )}
      </div>
    </div>
  );
}
