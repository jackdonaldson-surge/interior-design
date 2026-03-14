/**
 * Debounced autosave: when state is dirty, persist current project after a short delay.
 */

import { subscribe, isDirty, setDirty } from './state.js';
import { putProject } from './db.js';
import { showSaving } from './ui/app-shell.js';

const DEBOUNCE_MS = 500;
let timeoutId = null;
let currentProjectRef = null;

export function startAutosave(project) {
  currentProjectRef = project;
  if (timeoutId) clearTimeout(timeoutId);
  subscribe(performSaveIfNeeded);
  performSaveIfNeeded();
}

function performSaveIfNeeded() {
  if (!currentProjectRef || !isDirty()) return;
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(async () => {
    timeoutId = null;
    showSaving();
    try {
      await putProject(currentProjectRef);
      setDirty(false);
    } finally {
      // UI updates via subscribe
    }
  }, DEBOUNCE_MS);
}
