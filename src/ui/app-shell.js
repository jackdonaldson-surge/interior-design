/**
 * App shell: header (title, saved indicator), sidebar nav.
 */

import { getCurrentProjectId, subscribe, isDirty } from '../state.js';
import { getProject } from '../db.js';

let currentProjectName = '';
let unsubscribe = null;

export function renderAppShell() {
  if (unsubscribe) unsubscribe();
  const header = document.getElementById('app-header');
  if (!header) return;

  const projectId = getCurrentProjectId();
  const projectLink = projectId ? `#/project/${projectId}/plan` : '#/';

  header.innerHTML = `
    <div class="header-left">
      <a href="#/" class="logo">Interior Design</a>
      ${projectId ? `<span class="header-sep">/</span><a href="${projectLink}" class="project-name">${escapeHtml(currentProjectName) || 'Project'}</a>` : ''}
    </div>
    <div class="header-right">
      <span id="saved-indicator" class="saved-indicator">${isDirty() ? 'Unsaved' : 'Saved'}</span>
    </div>
  `;

  const main = document.getElementById('app-main');
  if (!main) return;

  main.innerHTML = '';
  main.className = 'app-main';

  const nav = document.createElement('nav');
  nav.className = 'nav-sidebar';
  const planHash = projectId ? `#/project/${projectId}/plan` : '#/';
  const budgetHash = projectId ? `#/project/${projectId}/budget` : '#/';
  const currentHash = window.location.hash.slice(1) || '';
  nav.innerHTML = `
    <a href="#/" class="${!currentHash ? 'active' : ''}">Projects</a>
    <a href="${planHash}" class="${currentHash.includes('/plan') ? 'active' : ''}">Floor plan</a>
    <a href="${budgetHash}" class="${currentHash.includes('/budget') ? 'active' : ''}">Budget</a>
  `;
  main.appendChild(nav);

  const content = document.createElement('div');
  content.className = 'content-area';
  content.id = 'app-content';
  main.appendChild(content);

  unsubscribe = subscribe(async () => {
    updateSavedIndicator();
    const id = getCurrentProjectId();
    if (id && !currentProjectName) {
      const p = await getProject(id);
      if (p) {
        currentProjectName = p.name;
        const nameEl = header.querySelector('.project-name');
        if (nameEl) nameEl.textContent = p.name;
      }
    }
  });
}


export function setCurrentProjectName(name) {
  currentProjectName = name || '';
}

function updateSavedIndicator() {
  const el = document.getElementById('saved-indicator');
  if (!el) return;
  el.textContent = isDirty() ? 'Unsaved' : 'Saved';
  el.classList.toggle('saved', !isDirty());
  el.classList.toggle('saving', false);
}

export function showSaving() {
  const el = document.getElementById('saved-indicator');
  if (el) {
    el.textContent = 'Saving…';
    el.classList.add('saving');
  }
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
