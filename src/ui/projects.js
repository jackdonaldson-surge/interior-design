import { setCurrentProjectId, setCurrentFloorIndex } from '../state.js';
import { getAllProjects, putProject, deleteProject, generateId } from '../db.js';
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
      .map((p) => `
        <article class="project-card card" data-id="${esc(p.id)}">
          <div class="project-card-header">
            <input type="text" class="project-name-input" data-id="${esc(p.id)}" value="${esc(p.name)}" />
            <button type="button" class="btn-icon btn-delete-project" data-id="${esc(p.id)}" title="Delete project">&times;</button>
          </div>
          <p class="meta">Updated ${formatDate(p.updatedAt)}</p>
          <button type="button" class="btn btn-secondary btn-sm btn-open-project" data-id="${esc(p.id)}">Open</button>
        </article>
      `)
      .join('');
  }

  listEl.querySelectorAll('.project-name-input').forEach((input) => {
    input.addEventListener('change', async () => {
      const p = projects.find((pr) => pr.id === input.dataset.id);
      if (p) {
        p.name = input.value.trim() || 'Untitled';
        await putProject(p);
      }
    });
    input.addEventListener('click', (e) => e.stopPropagation());
  });

  listEl.querySelectorAll('.btn-open-project').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      setCurrentProjectId(id);
      setCurrentProjectName(projects.find((p) => p.id === id)?.name);
      window.location.hash = `#/project/${id}/plan`;
    });
  });

  listEl.querySelectorAll('.btn-delete-project').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this project?')) return;
      await deleteProject(btn.dataset.id);
      await renderProjectsPage();
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
  return new Date(ts).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
