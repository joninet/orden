import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.join(__dirname, 'db.json');

let dbData = {
  members: [],
  tasks: [],
  push_subscriptions: [],
  nextMemberId: 1,
  nextTaskId: 1,
  nextSubId: 1
};

function saveToFile() {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(dbData, null, 2), 'utf8');
  } catch (err) {
    console.error('Error guardando en db.json:', err);
  }
}

export function initDatabase() {
  if (fs.existsSync(dbFilePath)) {
    try {
      const content = fs.readFileSync(dbFilePath, 'utf8');
      dbData = JSON.parse(content);
      console.log('✅ Base de datos JSON cargada correctamente desde:', dbFilePath);
    } catch (e) {
      console.error('Error leyendo db.json, creando nueva base de datos:', e);
    }
  }

  // Ensure default 4 members: Joni, Fher, Vicky, Nacho
  const defaultMembers = [
    { id: 1, name: 'Joni', avatar: '👨‍💻', role: 'admin' },
    { id: 2, name: 'Fher', avatar: '👩‍🦰', role: 'admin' },
    { id: 3, name: 'Vicky', avatar: '👧', role: 'member' },
    { id: 4, name: 'Nacho', avatar: '👦', role: 'member' }
  ];

  if (!dbData.members || dbData.members.length === 0) {
    dbData.members = defaultMembers;
    dbData.nextMemberId = 5;
    saveToFile();
  } else {
    // If existing names are generic (Papá, Mamá, etc.), update them to the real names
    const namesToUpdate = ['Papá', 'Mamá', 'Hijo 1', 'Hijo 2'];
    let updatedAny = false;
    dbData.members.forEach((m, idx) => {
      if (namesToUpdate.includes(m.name) && defaultMembers[idx]) {
        m.name = defaultMembers[idx].name;
        m.avatar = defaultMembers[idx].avatar;
        updatedAny = true;
      }
    });
    if (updatedAny) saveToFile();
  }

  if (!dbData.tasks) dbData.tasks = [];
  if (!dbData.push_subscriptions) dbData.push_subscriptions = [];
  if (!dbData.nextTaskId) dbData.nextTaskId = dbData.tasks.length + 1;
  if (!dbData.nextSubId) dbData.nextSubId = dbData.push_subscriptions.length + 1;
}

// Members Operations
export function getMembers() {
  return dbData.members;
}

export function updateMember(id, { name, avatar, role }) {
  const member = dbData.members.find(m => m.id === parseInt(id));
  if (!member) return null;
  if (name !== undefined) member.name = name;
  if (avatar !== undefined) member.avatar = avatar;
  if (role !== undefined) member.role = role;
  saveToFile();
  return member;
}

// Tasks Operations
export function getTasks(filters = {}) {
  let list = dbData.tasks.map(t => {
    const member = dbData.members.find(m => m.id === t.member_id);
    return {
      ...t,
      member_name: member ? member.name : 'Sin Asignar',
      member_avatar: member ? member.avatar : '🧹'
    };
  });

  if (filters.day_of_week !== undefined && filters.day_of_week !== '') {
    list = list.filter(t => t.day_of_week === parseInt(filters.day_of_week));
  }
  if (filters.shift) {
    list = list.filter(t => t.shift === filters.shift);
  }
  if (filters.member_id) {
    list = list.filter(t => t.member_id === parseInt(filters.member_id));
  }

  return list.sort((a, b) => a.day_of_week - b.day_of_week || a.id - b.id);
}

export function createTask({ title, description, day_of_week, shift, member_id }) {
  const newTask = {
    id: dbData.nextTaskId++,
    title,
    description: description || '',
    day_of_week: parseInt(day_of_week),
    shift,
    member_id: member_id ? parseInt(member_id) : null,
    completed: 0,
    completed_at: null,
    created_at: new Date().toISOString()
  };

  dbData.tasks.push(newTask);
  saveToFile();

  const member = dbData.members.find(m => m.id === newTask.member_id);
  return {
    ...newTask,
    member_name: member ? member.name : 'Sin Asignar',
    member_avatar: member ? member.avatar : '🧹'
  };
}

export function updateTask(id, data) {
  const taskIndex = dbData.tasks.findIndex(t => t.id === parseInt(id));
  if (taskIndex === -1) return null;

  const task = dbData.tasks[taskIndex];
  if (data.title !== undefined) task.title = data.title;
  if (data.description !== undefined) task.description = data.description;
  if (data.day_of_week !== undefined) task.day_of_week = parseInt(data.day_of_week);
  if (data.shift !== undefined) task.shift = data.shift;
  if (data.member_id !== undefined) task.member_id = data.member_id ? parseInt(data.member_id) : null;
  
  if (data.completed !== undefined) {
    const isCompleted = data.completed ? 1 : 0;
    if (isCompleted && !task.completed) {
      task.completed_at = new Date().toISOString();
    } else if (!isCompleted) {
      task.completed_at = null;
    }
    task.completed = isCompleted;
  }

  saveToFile();

  const member = dbData.members.find(m => m.id === task.member_id);
  return {
    ...task,
    member_name: member ? member.name : 'Sin Asignar',
    member_avatar: member ? member.avatar : '🧹'
  };
}

export function deleteTask(id) {
  const initialLen = dbData.tasks.length;
  dbData.tasks = dbData.tasks.filter(t => t.id !== parseInt(id));
  if (dbData.tasks.length !== initialLen) {
    saveToFile();
    return true;
  }
  return false;
}

export function bulkSyncTasks(newTaskList) {
  dbData.tasks = newTaskList.map((t, idx) => {
    const memberId = t.member_id ? parseInt(t.member_id) : null;
    return {
      id: dbData.nextTaskId++,
      title: t.title,
      description: t.description || '',
      day_of_week: parseInt(t.day_of_week),
      shift: t.shift,
      member_id: memberId,
      completed: t.completed ? 1 : 0,
      completed_at: t.completed ? new Date().toISOString() : null,
      created_at: new Date().toISOString()
    };
  });

  saveToFile();
  return getTasks();
}

// Push Subscriptions Operations
export function savePushSubscription(memberId, subscription) {
  const existingIndex = dbData.push_subscriptions.findIndex(s => s.endpoint === subscription.endpoint);
  
  const subData = {
    id: existingIndex !== -1 ? dbData.push_subscriptions[existingIndex].id : dbData.nextSubId++,
    member_id: memberId ? parseInt(memberId) : null,
    endpoint: subscription.endpoint,
    keys_p256dh: subscription.keys.p256dh,
    keys_auth: subscription.keys.auth,
    created_at: new Date().toISOString()
  };

  if (existingIndex !== -1) {
    dbData.push_subscriptions[existingIndex] = subData;
  } else {
    dbData.push_subscriptions.push(subData);
  }

  saveToFile();
  return subData;
}

export function getPushSubscriptions(memberId = null) {
  if (memberId) {
    return dbData.push_subscriptions.filter(s => s.member_id === parseInt(memberId));
  }
  return dbData.push_subscriptions;
}

export function deletePushSubscription(id) {
  dbData.push_subscriptions = dbData.push_subscriptions.filter(s => s.id !== id);
  saveToFile();
}
