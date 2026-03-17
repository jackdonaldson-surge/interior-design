import { getTasksForWeek, formatElapsed, todayStr } from '../store.js';
import { getElapsed } from '../timer.js';

export async function renderWeek(app, container) {
  const today = new Date(todayStr() + 'T12:00:00');
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(monday.getDate() + mondayOffset);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const startStr = fmt(days[0]);
  const endStr = fmt(days[6]);
  const todayISO = todayStr();

  const tasks = await getTasksForWeek(startStr, endStr);
  const byDate = {};
  tasks.forEach(t => {
    if (!byDate[t.date]) byDate[t.date] = [];
    byDate[t.date].push(t);
  });

  const totalWeek = tasks.reduce((s, t) => s + getElapsed(t), 0);

  const page = document.createElement('div');
  page.innerHTML = `
    <div class="page-header">
      <h1>This Week</h1>
      <p class="page-sub">${fmtRange(days[0], days[6])} · ${formatElapsed(totalWeek)} total</p>
    </div>
    <div class="week-grid" id="week-grid"></div>
  `;

  const grid = page.querySelector('#week-grid');

  days.forEach(day => {
    const dateStr = fmt(day);
    const isToday = dateStr === todayISO;
    const dayTasks = byDate[dateStr] || [];
    const dayTotal = dayTasks.reduce((s, t) => s + getElapsed(t), 0);

    const col = document.createElement('div');
    col.className = `week-day ${isToday ? 'today' : ''}`;
    col.innerHTML = `
      <div class="week-day-header">${day.toLocaleDateString(undefined, { weekday: 'short' })}</div>
      <div class="week-day-date">${day.getDate()}</div>
      <div class="week-day-tasks">
        ${dayTasks.length === 0 ? '<span style="font-size:0.75rem;color:var(--text3)">No tasks</span>' : ''}
        ${dayTasks.map(t => `
          <div class="week-task ${t.completed ? 'done' : ''}">
            <span class="project-dot" style="background:${t.projects?.color || '#86868b'};width:6px;height:6px;border-radius:50%;flex-shrink:0;display:inline-block;"></span>
            ${esc(t.title)}
          </div>
        `).join('')}
      </div>
      ${dayTotal > 0 ? `<div class="week-day-total">${formatElapsed(dayTotal)}</div>` : ''}
    `;

    col.addEventListener('click', () => {
      location.hash = `#/day/${dateStr}`;
    });

    grid.appendChild(col);
  });

  container.appendChild(page);
}

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

function fmtRange(a, b) {
  const opts = { month: 'short', day: 'numeric' };
  return `${a.toLocaleDateString(undefined, opts)} – ${b.toLocaleDateString(undefined, opts)}`;
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
