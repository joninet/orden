import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.join(__dirname, 'db.json');
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

let persistQueue = Promise.resolve();
let dbData = {
  members: [], tasks: [], task_templates: [], push_subscriptions: [], comments: [],
  nextMemberId: 1, nextTaskId: 1, nextSubId: 1, nextCommentId: 1
};

const defaultMembers = [
  { id: 1, name: 'Joni', avatar: '👨‍💻', role: 'admin' },
  { id: 2, name: 'Fher', avatar: '👩‍🦰', role: 'admin' },
  { id: 3, name: 'Vicky', avatar: '👧', role: 'member' },
  { id: 4, name: 'Nacho', avatar: '👦', role: 'member' }
];

function loadFileDatabase() {
  if (!fs.existsSync(dbFilePath)) return;
  try {
    dbData = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
  } catch (error) {
    console.error('Error leyendo db.json:', error);
  }
}

function normalizeDatabase() {
  dbData.members ||= [];
  dbData.tasks ||= [];
  dbData.task_templates ||= [];
  dbData.push_subscriptions ||= [];
  dbData.comments ||= [];
  dbData.nextMemberId ||= Math.max(0, ...dbData.members.map(item => item.id)) + 1;
  dbData.nextTaskId ||= Math.max(0, ...dbData.tasks.map(item => item.id)) + 1;
  dbData.nextSubId ||= Math.max(0, ...dbData.push_subscriptions.map(item => item.id)) + 1;
  dbData.nextCommentId ||= Math.max(0, ...dbData.comments.map(item => item.id)) + 1;
}

function saveToFile() {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(dbData, null, 2), 'utf8');
  } catch (error) {
    console.error('Error guardando en db.json:', error);
  }
}

async function writeToPostgres() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE comments, push_subscriptions, tasks, task_templates, members RESTART IDENTITY CASCADE');
    for (const member of dbData.members) await client.query('INSERT INTO members (id, name, avatar, role) VALUES ($1, $2, $3, $4)', [member.id, member.name, member.avatar, member.role]);
    for (const task of dbData.tasks) await client.query('INSERT INTO tasks (id, title, description, day_of_week, shift, member_id, completed, completed_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [task.id, task.title, task.description, task.day_of_week, task.shift, task.member_id, task.completed, task.completed_at, task.created_at]);
    for (const template of dbData.task_templates) await client.query('INSERT INTO task_templates (id, title, icon, created_at) VALUES ($1,$2,$3,$4)', [template.id, template.title, template.icon, template.created_at]);
    for (const subscription of dbData.push_subscriptions) await client.query('INSERT INTO push_subscriptions (id, member_id, endpoint, keys_p256dh, keys_auth, created_at) VALUES ($1,$2,$3,$4,$5,$6)', [subscription.id, subscription.member_id, subscription.endpoint, subscription.keys_p256dh, subscription.keys_auth, subscription.created_at]);
    for (const comment of dbData.comments) await client.query('INSERT INTO comments (id, task_id, member_id, body, created_at) VALUES ($1,$2,$3,$4,$5)', [comment.id, comment.task_id, comment.member_id, comment.body, comment.created_at]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function saveDatabase() {
  if (!pool) {
    saveToFile();
    return;
  }
  persistQueue = persistQueue.then(() => writeToPostgres()).catch(error => console.error('Error guardando en PostgreSQL:', error));
}

async function loadPostgresDatabase() {
  const result = await pool.query(`
    SELECT
      (SELECT COALESCE(json_agg(row_to_json(item)), '[]') FROM (SELECT * FROM members ORDER BY id) item) AS members,
      (SELECT COALESCE(json_agg(row_to_json(item)), '[]') FROM (SELECT * FROM tasks ORDER BY id) item) AS tasks,
      (SELECT COALESCE(json_agg(row_to_json(item)), '[]') FROM (SELECT * FROM task_templates ORDER BY id) item) AS task_templates,
      (SELECT COALESCE(json_agg(row_to_json(item)), '[]') FROM (SELECT * FROM push_subscriptions ORDER BY id) item) AS push_subscriptions,
      (SELECT COALESCE(json_agg(row_to_json(item)), '[]') FROM (SELECT * FROM comments ORDER BY id) item) AS comments
  `);
  dbData = { ...dbData, ...result.rows[0] };
  normalizeDatabase();
}

export async function initDatabase() {
  if (pool) await loadPostgresDatabase();
  else {
    loadFileDatabase();
    normalizeDatabase();
  }
  if (dbData.members.length === 0) {
    dbData.members = defaultMembers;
    dbData.nextMemberId = 5;
    saveDatabase();
  }
  console.log(pool ? '✅ Base de datos PostgreSQL cargada correctamente.' : `✅ Base de datos JSON cargada desde: ${dbFilePath}`);
}

export function getMembers() { return dbData.members; }
export function getMember(id) { return dbData.members.find(member => member.id === parseInt(id)); }

export function updateMember(id, { name, avatar, role }) {
  const member = getMember(id);
  if (!member) return null;
  if (name !== undefined) member.name = name;
  if (avatar !== undefined) member.avatar = avatar;
  if (role !== undefined) member.role = role;
  saveDatabase();
  return member;
}

export function getTasks(filters = {}) {
  let list = dbData.tasks.map(task => {
    const member = getMember(task.member_id);
    return { ...task, member_name: member?.name || 'Sin Asignar', member_avatar: member?.avatar || '🧹', comments: getTaskComments(task.id) };
  });
  if (filters.day_of_week !== undefined && filters.day_of_week !== '') list = list.filter(task => task.day_of_week === parseInt(filters.day_of_week));
  if (filters.shift) list = list.filter(task => task.shift === filters.shift);
  if (filters.member_id) list = list.filter(task => task.member_id === parseInt(filters.member_id));
  return list.sort((a, b) => a.day_of_week - b.day_of_week || a.id - b.id);
}

export function createTask({ title, description, day_of_week, shift, member_id }) {
  const task = { id: dbData.nextTaskId++, title, description: description || '', day_of_week: parseInt(day_of_week), shift, member_id: member_id ? parseInt(member_id) : null, completed: 0, completed_at: null, created_at: new Date().toISOString() };
  dbData.tasks.push(task);
  saveDatabase();
  const member = getMember(task.member_id);
  return { ...task, member_name: member?.name || 'Sin Asignar', member_avatar: member?.avatar || '🧹' };
}

export function getTaskTemplates() { return [...dbData.task_templates].sort((a, b) => a.title.localeCompare(b.title)); }

export function createTaskTemplate({ title, icon }) {
  const normalizedTitle = title.trim();
  const existing = dbData.task_templates.find(template => template.title.toLowerCase() === normalizedTitle.toLowerCase());
  if (existing) return existing;
  const template = { id: dbData.task_templates.length ? Math.max(...dbData.task_templates.map(item => item.id)) + 1 : 1, title: normalizedTitle, icon: icon || '🧹', created_at: new Date().toISOString() };
  dbData.task_templates.push(template);
  saveDatabase();
  return template;
}

export function deleteTaskTemplate(id) {
  const initialLength = dbData.task_templates.length;
  dbData.task_templates = dbData.task_templates.filter(template => template.id !== parseInt(id));
  if (dbData.task_templates.length === initialLength) return false;
  saveDatabase();
  return true;
}

export function updateTask(id, data) {
  const task = dbData.tasks.find(item => item.id === parseInt(id));
  if (!task) return null;
  if (data.title !== undefined) task.title = data.title;
  if (data.description !== undefined) task.description = data.description;
  if (data.day_of_week !== undefined) task.day_of_week = parseInt(data.day_of_week);
  if (data.shift !== undefined) task.shift = data.shift;
  if (data.member_id !== undefined) task.member_id = data.member_id ? parseInt(data.member_id) : null;
  if (data.completed !== undefined) {
    const completed = data.completed ? 1 : 0;
    task.completed_at = completed && !task.completed ? new Date().toISOString() : completed ? task.completed_at : null;
    task.completed = completed;
  }
  saveDatabase();
  const member = getMember(task.member_id);
  return { ...task, member_name: member?.name || 'Sin Asignar', member_avatar: member?.avatar || '🧹' };
}

export function deleteTask(id) {
  const initialLength = dbData.tasks.length;
  dbData.tasks = dbData.tasks.filter(task => task.id !== parseInt(id));
  if (dbData.tasks.length === initialLength) return false;
  saveDatabase();
  return true;
}

export function getTaskComments(taskId) {
  return dbData.comments.filter(comment => comment.task_id === parseInt(taskId)).map(comment => ({ ...comment, member_name: getMember(comment.member_id)?.name || 'Integrante' })).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

export function addTaskComment(taskId, memberId, body) {
  const comment = { id: dbData.nextCommentId++, task_id: parseInt(taskId), member_id: parseInt(memberId), body: body.trim(), created_at: new Date().toISOString() };
  dbData.comments.push(comment);
  saveDatabase();
  return { ...comment, member_name: getMember(memberId)?.name || 'Integrante' };
}

export function bulkSyncTasks(newTaskList) {
  dbData.tasks = newTaskList.map(task => {
    const memberId = task.member_id ? parseInt(task.member_id) : null;
    const taskId = task.id ? parseInt(task.id) : dbData.nextTaskId++;
    if (taskId >= dbData.nextTaskId) dbData.nextTaskId = taskId + 1;
    return { id: taskId, title: task.title, description: task.description || '', day_of_week: parseInt(task.day_of_week), shift: task.shift, member_id: memberId, completed: task.completed ? 1 : 0, completed_at: task.completed ? new Date().toISOString() : null, created_at: new Date().toISOString() };
  });
  saveDatabase();
  return getTasks();
}

export function savePushSubscription(memberId, subscription) {
  const existing = dbData.push_subscriptions.find(item => item.endpoint === subscription.endpoint);
  const data = { id: existing?.id || dbData.nextSubId++, member_id: memberId ? parseInt(memberId) : null, endpoint: subscription.endpoint, keys_p256dh: subscription.keys.p256dh, keys_auth: subscription.keys.auth, created_at: new Date().toISOString() };
  if (existing) Object.assign(existing, data); else dbData.push_subscriptions.push(data);
  saveDatabase();
  return data;
}

export function getPushSubscriptions(memberId = null) { return memberId ? dbData.push_subscriptions.filter(item => item.member_id === parseInt(memberId)) : dbData.push_subscriptions; }

export function deletePushSubscription(id) {
  dbData.push_subscriptions = dbData.push_subscriptions.filter(item => item.id !== id);
  saveDatabase();
}
