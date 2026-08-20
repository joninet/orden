const API_BASE = '/api';

export async function fetchMembers() {
  const res = await fetch(`${API_BASE}/members`);
  if (!res.ok) throw new Error('Error al obtener integrantes');
  return res.json();
}

export async function updateMember(id, data) {
  const res = await fetch(`${API_BASE}/members/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al actualizar integrante');
  return res.json();
}

export async function fetchTasks(filters = {}) {
  const params = new URLSearchParams();
  if (filters.day_of_week !== undefined) params.append('day_of_week', filters.day_of_week);
  if (filters.shift) params.append('shift', filters.shift);
  if (filters.member_id) params.append('member_id', filters.member_id);

  const res = await fetch(`${API_BASE}/tasks?${params.toString()}`);
  if (!res.ok) throw new Error('Error al obtener tareas');
  return res.json();
}

export async function createTask(taskData) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData),
  });
  if (!res.ok) throw new Error('Error al crear tarea');
  return res.json();
}

export async function updateTask(id, taskData) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData),
  });
  if (!res.ok) throw new Error('Error al actualizar tarea');
  return res.json();
}

export async function deleteTask(id) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Error al eliminar tarea');
  return res.json();
}

export async function bulkSyncTasks(tasks) {
  const res = await fetch(`${API_BASE}/tasks/bulk-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks }),
  });
  if (!res.ok) throw new Error('Error al sincronizar tareas');
  return res.json();
}

export async function getVapidPublicKey() {
  const res = await fetch(`${API_BASE}/vapid-public-key`);
  if (!res.ok) throw new Error('Error al obtener clave VAPID');
  const data = await res.json();
  return data.publicKey;
}

export async function subscribeToPush(subscription, memberId) {
  const res = await fetch(`${API_BASE}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription, member_id: memberId }),
  });
  if (!res.ok) throw new Error('Error al guardar suscripción push');
  return res.json();
}

export async function sendTestNotification(memberId, message) {
  const res = await fetch(`${API_BASE}/notifications/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ member_id: memberId, message }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al enviar notificación de prueba');
  }
  return res.json();
}

// Convert VAPID base64 string to Uint8Array for PushManager
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
