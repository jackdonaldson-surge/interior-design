/**
 * Projects list page: list all projects, create new, open project.
 */

import { setCurrentProjectId, setCurrentFloorIndex } from '../state.js';
import { getAllProjects, putProject, generateId } from '../db.js';
import { renderAppShell, setCurrentProjectName } from './app-shell.js';

const defaultProject = () => ({
  id: generateId(),
  name: 'Untitled project',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  floors: [{ id: generateId(), backgroundImage: null, rooms: [], furniture: [] }],
  budgetItems: [],
});

export async function renderProjectsPage() {
  setCurrentProjectId(null);
  const content = document.getElementById('app-content');
  if (!content) return;

  const projects = await getAllProjects();

  content.innerHTML = `
    <h1 class="page-title">Projects</h1>
    <div class="project-list" id="project-list"></div>
    <div style="margin-top: var(--space-lg);">
      <button type="button" class="btn btn-primary" id="btn-new-project">New project</button>
    </div>
  `;

  const listEl = document.getElementById('project-list');
  if (projects.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state card" style="grid-column: 1 / -1;">
        <p>No projects yet.</p>
        <p>Create one to start designing.</p>
      </div>
    `;
  } else {
    listEl.innerHTML = projects
      .map(
        (p) => `
      <article class="project-card card" data-id="${escapeAttr(p.id)}">
        <h3>${escapeHtml(p.name)}</h3>
        <p class="meta">Updated ${formatDate(p.updatedAt)}</p>
      </article>
    `
      )
      .join('');
  }

  listEl.querySelectorAll('.project-card').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      setCurrentProjectId(id);
      setCurrentProjectName(projects.find((p) => p.id === id)?.name);
      window.location.hash = `#/project/${id}/plan`;
    });
  });

  document.getElementById('btn-new-project').addEventListener('click', async () => {
    const project = defaultProject();
    await putProject(project);
    setCurrentProjectId(project.id);
    setCurrentProjectName(project.name);
    window.location.hash = `#/project/${project.id}/plan`;
  });
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
