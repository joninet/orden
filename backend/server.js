import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import cron from 'node-cron';
import {
  initDatabase,
  getMembers,
  getMember,
  updateMember,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  bulkSyncTasks,
  savePushSubscription,
  getPushSubscriptions,
  deletePushSubscription,
  getTaskComments,
  addTaskComment
} from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB
initDatabase();

// VAPID keys initialization
const vapidKeysPath = path.join(__dirname, 'vapidKeys.json');
let vapidKeys;

if (fs.existsSync(vapidKeysPath)) {
  vapidKeys = JSON.parse(fs.readFileSync(vapidKeysPath, 'utf8'));
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(vapidKeysPath, JSON.stringify(vapidKeys, null, 2));
  console.log('🔑 Nuevas claves VAPID generadas.');
}

webpush.setVapidDetails(
  'mailto:contacto@limpiezadesplats.app',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const app = express();
app.use(cors());
app.use(express.json());

function getRequestMember(req) {
  return getMember(req.get('x-member-id'));
}

function isAdmin(member) {
  return member?.role === 'admin';
}

function requireAdmin(req, res, next) {
  if (!isAdmin(getRequestMember(req))) {
    return res.status(403).json({ error: 'Solo Joni y Fher pueden modificar la organización.' });
  }
  next();
}

// Serve static frontend files if built
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

// ----------------- API ENDPOINTS -----------------

// Get Public VAPID Key
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Members API
app.get('/api/members', (req, res) => {
  res.json(getMembers());
});

app.put('/api/members/:id', (req, res) => {
  if (!isAdmin(getRequestMember(req))) {
    return res.status(403).json({ error: 'Solo Joni y Fher pueden editar integrantes.' });
  }
  const { id } = req.params;
  const { name, avatar, role } = req.body;
  const updated = updateMember(id, { name, avatar, role });
  if (!updated) return res.status(404).json({ error: 'Integrante no encontrado' });
  res.json(updated);
});

// Tasks API
app.get('/api/tasks', (req, res) => {
  const { day_of_week, shift, member_id } = req.query;
  const tasks = getTasks({ day_of_week, shift, member_id });
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  if (!isAdmin(getRequestMember(req))) {
    return res.status(403).json({ error: 'Solo Joni y Fher pueden agregar tareas.' });
  }
  const { title, description, day_of_week, shift, member_id } = req.body;
  if (!title || day_of_week === undefined || !shift) {
    return res.status(400).json({ error: 'Título, día de la semana y turno son requeridos' });
  }
  const newTask = createTask({ title, description, day_of_week, shift, member_id });
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
  const member = getRequestMember(req);
  const { id } = req.params;
  const task = getTasks().find(item => item.id === parseInt(id));
  if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });

  if (!isAdmin(member)) {
    if (task.member_id !== member?.id || Object.keys(req.body).some(key => key !== 'completed')) {
      return res.status(403).json({ error: 'Solo puedes marcar tus propias tareas como realizadas.' });
    }
  }

  const updatedTask = updateTask(id, req.body);
  if (!updatedTask) {
    return res.status(404).json({ error: 'Tarea no encontrada' });
  }
  res.json(updatedTask);
});

app.delete('/api/tasks/:id', (req, res) => {
  if (!isAdmin(getRequestMember(req))) {
    return res.status(403).json({ error: 'Solo Joni y Fher pueden eliminar tareas.' });
  }
  const { id } = req.params;
  const success = deleteTask(id);
  if (!success) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.json({ success: true });
});

// Bulk update tasks for Sunday planning
app.post('/api/tasks/bulk-sync', requireAdmin, (req, res) => {
  const { tasks } = req.body;
  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: 'Se requiere un arreglo de tareas' });
  }
  const allTasks = bulkSyncTasks(tasks);
  res.json(allTasks);
});

app.get('/api/tasks/:id/comments', (req, res) => {
  res.json(getTaskComments(req.params.id));
});

app.post('/api/tasks/:id/comments', (req, res) => {
  const member = getRequestMember(req);
  const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
  const task = getTasks().find(item => item.id === parseInt(req.params.id));
  if (!member || !task) return res.status(404).json({ error: 'Tarea o integrante no encontrado' });
  if (!isAdmin(member) && task.member_id !== member.id) {
    return res.status(403).json({ error: 'Solo puedes comentar tus propias tareas.' });
  }
  if (!body) return res.status(400).json({ error: 'El comentario no puede estar vacío.' });
  res.status(201).json(addTaskComment(req.params.id, member.id, body));
});

// Save Push Subscription
app.post('/api/subscribe', (req, res) => {
  const { subscription, member_id } = req.body;
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: 'Suscripción inválida' });
  }

  savePushSubscription(member_id, subscription);
  res.status(201).json({ success: true, message: 'Suscripción guardada correctamente' });
});

// Test Push Notification Endpoint
app.post('/api/notifications/test', async (req, res) => {
  const { member_id, message } = req.body;
  
  const subs = getPushSubscriptions(member_id);

  if (subs.length === 0) {
    return res.status(404).json({ error: 'No se encontraron dispositivos suscritos para este integrante. ¡Presiona "Activar Notificaciones" en tu celular primero!' });
  }

  const payload = JSON.stringify({
    title: '🧹 Limpieza Desplats - Prueba de Alerta',
    body: message || '¡Las notificaciones están funcionando perfectamente en tu celular! 🚀',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    data: { url: '/' }
  });

  let sentCount = 0;
  for (const sub of subs) {
    const pushConfig = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys_p256dh,
        auth: sub.keys_auth
      }
    };
    try {
      await webpush.sendNotification(pushConfig, payload);
      sentCount++;
    } catch (err) {
      console.error('Error enviando push de prueba:', err.message);
      if (err.statusCode === 410 || err.statusCode === 404) {
        deletePushSubscription(sub.id);
      }
    }
  }

  res.json({ success: true, sentCount, totalSubs: subs.length });
});

// ----------------- CRON JOBS FOR SCHEDULED NOTIFICATIONS -----------------

async function sendScheduledShiftNotifications(shiftName, timeLabel, targetDayIndex = null) {
  const appTimeZone = process.env.APP_TIMEZONE || 'America/Argentina/Buenos_Aires';
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentWeekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: appTimeZone
  }).format(new Date());
  const todayIndex = weekdayNames.indexOf(currentWeekday);
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const notificationDayIndex = targetDayIndex ?? todayIndex;
  const notificationType = shiftName ? `turno ${shiftName}` : 'tareas pendientes';
  console.log(`⏰ [CRON] Ejecutando notificación de ${notificationType} (${timeLabel}) para ${dayNames[notificationDayIndex]}`);

  const tasks = getTasks({
    day_of_week: notificationDayIndex,
    ...(shiftName ? { shift: shiftName } : {})
  }).filter(t => t.completed === 0);

  if (tasks.length === 0) {
    console.log(`ℹ️ No hay tareas pendientes para el turno ${shiftName} de hoy.`);
    return;
  }

  // Group tasks by member
  const memberTasksMap = {};
  for (const t of tasks) {
    const mId = t.member_id || 0;
    if (!memberTasksMap[mId]) {
      memberTasksMap[mId] = {
        member_name: t.member_name || 'Sin Asignar',
        member_avatar: t.member_avatar || '🧹',
        tasks: []
      };
    }
    memberTasksMap[mId].tasks.push(t.title);
  }

  const allSubs = getPushSubscriptions();

  for (const [memberIdStr, data] of Object.entries(memberTasksMap)) {
    const mId = parseInt(memberIdStr);
    const targetSubs = mId ? allSubs.filter(s => s.member_id === mId) : allSubs;

    if (targetSubs.length === 0) continue;

    const taskListText = data.tasks.join(', ');
    const shiftTitle = !shiftName
      ? '⚠️ Tarea pendiente del día anterior'
      : shiftName === 'manana' ? '☀️ Turno Mañana (09:00 hs)' : '🌙 Turno Tarde (17:00 hs)';
    
    const payload = JSON.stringify({
      title: `🧹 Tareas de Limpieza - ${data.member_avatar} ${data.member_name}`,
      body: `${shiftTitle}: Tienes pendiente: ${taskListText}`,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      data: { url: '/' }
    });

    for (const sub of targetSubs) {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth
        }
      };
      try {
        await webpush.sendNotification(pushConfig, payload);
        console.log(`✅ Push enviado a ${data.member_name} para turno ${shiftName}`);
      } catch (err) {
        console.error('Error enviando notificación programada:', err.message);
        if (err.statusCode === 410 || err.statusCode === 404) {
          deletePushSubscription(sub.id);
        }
      }
    }
  }
}

// 09:00 AM Cron Job (Mañana)
cron.schedule('0 9 * * *', () => {
  sendScheduledShiftNotifications('manana', '09:00 AM');
}, { timezone: process.env.APP_TIMEZONE || 'America/Argentina/Buenos_Aires' });

// 17:00 PM Cron Job (Tarde)
cron.schedule('0 17 * * *', () => {
  sendScheduledShiftNotifications('tarde', '17:00 PM');
}, { timezone: process.env.APP_TIMEZONE || 'America/Argentina/Buenos_Aires' });

// Revisa a las 08:00 las tareas del día anterior que quedaron sin completar.
cron.schedule('0 8 * * *', () => {
  const timezone = process.env.APP_TIMEZONE || 'America/Argentina/Buenos_Aires';
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentWeekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: timezone
  }).format(new Date());
  const previousDayIndex = (weekdayNames.indexOf(currentWeekday) + 6) % 7;
  sendScheduledShiftNotifications(null, '08:00 AM', previousDayIndex);
}, { timezone: process.env.APP_TIMEZONE || 'America/Argentina/Buenos_Aires' });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
  console.log(`📅 Recordatorios automáticos activos para las 09:00 hs y 17:00 hs.`);
});
