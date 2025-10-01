import { openDB } from 'idb';

const DB_NAME = 'balik-suling';
const STORE = 'offline';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    },
  });
}

export async function saveOffline(item) {
  const db = await getDB();
  await db.put(STORE, { ...item, savedAt: Date.now() });
}

export async function getOffline(id) {
  const db = await getDB();
  return await db.get(STORE, id);
}

export async function getAllOffline() {
  const db = await getDB();
  return await db.getAll(STORE);
}

export async function removeOffline(id) {
  const db = await getDB();
  await db.delete(STORE, id);
}
