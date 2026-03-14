/**
 * IndexedDB wrapper for projects, autosave, and load.
 */

import { openDB } from 'idb';

const DB_NAME = 'interior-design-db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllProjects() {
  const db = await getDB();
  return db.getAll(STORE_PROJECTS);
}

export async function getProject(id) {
  const db = await getDB();
  return db.get(STORE_PROJECTS, id);
}

export async function putProject(project) {
  const db = await getDB();
  project.updatedAt = Date.now();
  await db.put(STORE_PROJECTS, project);
}

export async function deleteProject(id) {
  const db = await getDB();
  await db.delete(STORE_PROJECTS, id);
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
