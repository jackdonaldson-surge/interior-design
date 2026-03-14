/**
 * In-memory app state: current project, current floor index, and dirty flag for autosave.
 */

let currentProjectId = null;
let currentFloorIndex = 0;
let dirty = false;
const listeners = new Set();

export function getCurrentProjectId() {
  return currentProjectId;
}

export function setCurrentProjectId(id) {
  if (currentProjectId !== id) {
    currentProjectId = id;
    currentFloorIndex = 0;
    notify();
  }
}

export function getCurrentFloorIndex() {
  return currentFloorIndex;
}

export function setCurrentFloorIndex(index) {
  if (currentFloorIndex !== index) {
    currentFloorIndex = index;
    notify();
  }
}

export function setDirty(value = true) {
  if (dirty !== value) {
    dirty = value;
    notify();
  }
}

export function isDirty() {
  return dirty;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}
