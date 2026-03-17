import { getTasksByDate, createTask, getProjects, todayStr, formatElapsed } from '../store.js';
import { getElapsed, stopAllTicking } from '../timer.js';
import { renderTaskRow } from '../components/task-row.js';

export async function renderToday(app, container) {
  stopAllTicking();

  const dateStr = todayStr();
  const [tasks, projects] = await Promise.all([
    getTasksByDate(dateStr),
    getProjects(),
  ]);

  const page = document.createElement('div');

  const dayName = new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const totalSecs = tasks.reduce((sum, t) => sum + getElapsed(t), 0);

  page.innerHTML = `
    <div class="page-header">
      <h1>Today</h1>
      <p class="page-sub">${dayName} · ${formatElapsed(totalSecs)} tracked</p>
    </div>
    <div class="quick-add" id="quick-add">
      <input type="text" id="qa-input" placeholder="Add a task… (press Enter)" />
      <select id="qa-project">
        <option value="">No project</option>
        ${projects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}
      </select>
      <button class="btn btn-primary btn-sm" id="qa-btn">Add</button>
    </div>
    <div id="task-sections"></div>
  `;

  container.appendChild(page);

  const sectionsEl = page.querySelector('#task-sections');

  function renderSections() {
    sectionsEl.innerHTML = '';
    const todo = tasks.filter(t => !t.completed && !t.running);
    const inProgress = tasks.filter(t => !t.completed && t.running);
    const done = tasks.filter(t => t.completed);

    if (inProgress.length) renderSection(sectionsEl, 'In Progress', inProgress, tasks);
    renderSection(sectionsEl, 'To Do', todo, tasks);
    if (done.length) renderSection(sectionsEl, 'Done', done, tasks);

    if (tasks.length === 0) {
      sectionsEl.innerHTML = '<div class="empty">No tasks for today. Add one above.</div>';
    }
  }

  function renderSection(parent, label, items, allTasks) {
    const section = document.createElement('div');
    section.className = 'task-section';
    section.innerHTML = `
      <div class="task-section-header">
        ${label}
        <span class="task-section-count">${items.length}</span>
      </div>
    `;
    items.forEach(task => {
      const row = renderTaskRow(task, {
        onUpdate: () => fullRefresh(),
        onDelete: (id) => {
          const idx = tasks.findIndex(t => t.id === id);
          if (idx >= 0) tasks.splice(idx, 1);
          renderSections();
        },
      });
      section.appendChild(row);
    });
    parent.appendChild(section);
  }

  async function fullRefresh() {
    stopAllTicking();
    const fresh = await getTasksByDate(dateStr);
    tasks.length = 0;
    tasks.push(...fresh);
    renderSections();
    const totalSecs = tasks.reduce((sum, t) => sum + getElapsed(t), 0);
    page.querySelector('.page-sub').textContent = `${dayName} · ${formatElapsed(totalSecs)} tracked`;
  }

  // Quick add
  async function addTask() {
    const input = page.querySelector('#qa-input');
    const select = page.querySelector('#qa-project');
    const title = input.value.trim();
    if (!title) return;

    const projectId = select.value || null;
    const task = await createTask(title, dateStr, projectId);
    tasks.push(task);
    input.value = '';
    renderSections();
  }

  page.querySelector('#qa-btn').addEventListener('click', addTask);
  page.querySelector('#qa-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTask(); }
  });

  renderSections();
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
