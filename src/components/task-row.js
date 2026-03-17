import { updateTask, deleteTask, formatElapsed, parseTimeInput } from '../store.js';
import { getElapsed, toggleTimer, stopTimer, startTicking, stopTicking } from '../timer.js';

export function renderTaskRow(task, { onUpdate, onDelete }) {
  const row = document.createElement('div');
  row.className = `task-row ${task.completed ? 'completed' : ''}`;
  row.dataset.id = task.id;

  const projectName = task.projects?.name || null;
  const projectColor = task.projects?.color || '#86868b';

  row.innerHTML = `
    <div class="task-check ${task.completed ? 'checked' : ''}" data-action="check">
      ${task.completed ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
    </div>
    <div class="task-body">
      <input class="task-title-input" value="${esc(task.title)}" data-action="title" />
      <div class="task-meta">
        ${projectName ? `<span class="task-project-tag"><span class="project-dot" style="background:${esc(projectColor)}"></span>${esc(projectName)}</span>` : ''}
      </div>
    </div>
    <div class="task-timer">
      <span class="timer-display ${task.running ? 'running' : ''}" data-action="edit-time">${formatElapsed(getElapsed(task))}</span>
      <button class="play-btn ${task.running ? 'running' : ''}" data-action="toggle-timer" title="${task.running ? 'Pause' : 'Start'}">
        ${task.running ? pauseIcon() : playIcon()}
      </button>
    </div>
    <div class="task-actions">
      <button class="btn-icon btn-danger" data-action="delete" title="Delete">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;

  // Start live ticking if running
  if (task.running) {
    startTicking(task.id, () => {
      const display = row.querySelector('.timer-display');
      if (display) display.textContent = formatElapsed(getElapsed(task));
    });
  }

  // Check/uncheck
  row.querySelector('[data-action="check"]').addEventListener('click', async () => {
    if (!task.completed) {
      if (task.running) await stopTimer(task);
      task.completed = true;
      task.completed_at = new Date().toISOString();
      await updateTask(task.id, { completed: true, completed_at: task.completed_at, running: false, timer_start: null, elapsed: task.elapsed });
    } else {
      task.completed = false;
      task.completed_at = null;
      await updateTask(task.id, { completed: false, completed_at: null });
    }
    stopTicking(task.id);
    onUpdate();
  });

  // Title edit
  const titleInput = row.querySelector('[data-action="title"]');
  titleInput.addEventListener('change', async () => {
    const newTitle = titleInput.value.trim();
    if (newTitle && newTitle !== task.title) {
      task.title = newTitle;
      await updateTask(task.id, { title: newTitle });
    }
  });

  // Toggle timer
  row.querySelector('[data-action="toggle-timer"]').addEventListener('click', async () => {
    if (task.completed) return;
    await toggleTimer(task);
    stopTicking(task.id);
    onUpdate();
  });

  // Click timer display to edit manually
  row.querySelector('[data-action="edit-time"]').addEventListener('click', () => {
    const display = row.querySelector('[data-action="edit-time"]');
    const current = formatElapsed(getElapsed(task));
    display.outerHTML = `<input class="timer-edit-input" value="${current}" data-action="save-time" />`;
    const input = row.querySelector('[data-action="save-time"]');
    input.focus();
    input.select();

    async function save() {
      const parsed = parseTimeInput(input.value);
      if (task.running) await stopTimer(task);
      task.elapsed = parsed;
      task.running = false;
      task.timer_start = null;
      await updateTask(task.id, { elapsed: parsed, running: false, timer_start: null });
      stopTicking(task.id);
      onUpdate();
    }

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); save(); }
      if (e.key === 'Escape') { onUpdate(); }
    });
  });

  // Delete
  row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
    stopTicking(task.id);
    await deleteTask(task.id);
    onDelete(task.id);
  });

  return row;
}

function playIcon() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>';
}

function pauseIcon() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
