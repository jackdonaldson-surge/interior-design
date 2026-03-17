import { getProjects, createProject, updateProject, deleteProject, getTasksByProject } from '../store.js';

const COLORS = ['#0071e3', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5856d6', '#007aff', '#ff2d55', '#a2845e'];

export async function renderProjects(app, container) {
  const projects = await getProjects();

  const page = document.createElement('div');
  page.innerHTML = `
    <div class="page-header">
      <h1>Projects</h1>
      <p class="page-sub">${projects.length} project${projects.length !== 1 ? 's' : ''}</p>
    </div>
    <div class="project-list" id="project-list"></div>
    <div style="margin-top:var(--s-lg);">
      <button class="btn btn-primary" id="new-project-btn">+ New project</button>
    </div>
  `;

  const listEl = page.querySelector('#project-list');

  async function renderList() {
    listEl.innerHTML = '';
    if (projects.length === 0) {
      listEl.innerHTML = '<div class="empty">No projects yet. Create one to organize your tasks.</div>';
      return;
    }

    for (const p of projects) {
      const row = document.createElement('div');
      row.className = 'project-row';
      row.innerHTML = `
        <input type="color" class="project-color-pick" value="${p.color}" data-action="color" />
        <input type="text" class="project-name-input" value="${esc(p.name)}" data-action="name" />
        <span class="project-task-count" data-action="count">…</span>
        <button class="btn-icon" data-action="archive" title="Archive">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
        </button>
        <button class="btn-icon btn-danger" data-action="delete" title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;

      // Load task count async
      getTasksByProject(p.id).then(tasks => {
        const countEl = row.querySelector('[data-action="count"]');
        if (countEl) countEl.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;
      });

      row.querySelector('[data-action="name"]').addEventListener('change', async (e) => {
        const name = e.target.value.trim();
        if (name && name !== p.name) {
          p.name = name;
          await updateProject(p.id, { name });
        }
      });

      row.querySelector('[data-action="color"]').addEventListener('input', async (e) => {
        p.color = e.target.value;
        await updateProject(p.id, { color: p.color });
      });

      row.querySelector('[data-action="archive"]').addEventListener('click', async () => {
        await updateProject(p.id, { archived: true });
        const idx = projects.indexOf(p);
        if (idx >= 0) projects.splice(idx, 1);
        renderList();
        page.querySelector('.page-sub').textContent = `${projects.length} project${projects.length !== 1 ? 's' : ''}`;
      });

      row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        if (!confirm(`Delete "${p.name}" and all its tasks?`)) return;
        await deleteProject(p.id);
        const idx = projects.indexOf(p);
        if (idx >= 0) projects.splice(idx, 1);
        renderList();
        page.querySelector('.page-sub').textContent = `${projects.length} project${projects.length !== 1 ? 's' : ''}`;
      });

      listEl.appendChild(row);
    }
  }

  page.querySelector('#new-project-btn').addEventListener('click', async () => {
    const color = COLORS[projects.length % COLORS.length];
    const p = await createProject('New project', color);
    projects.push(p);
    renderList();
    page.querySelector('.page-sub').textContent = `${projects.length} project${projects.length !== 1 ? 's' : ''}`;
    setTimeout(() => {
      const inputs = listEl.querySelectorAll('.project-name-input');
      const last = inputs[inputs.length - 1];
      if (last) { last.focus(); last.select(); }
    }, 50);
  });

  await renderList();
  container.appendChild(page);
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
