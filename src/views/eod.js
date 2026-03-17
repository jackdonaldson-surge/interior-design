import { getTasksByDate, formatElapsed, todayStr } from '../store.js';
import { getElapsed } from '../timer.js';

export async function renderEOD(app, container) {
  const dateStr = todayStr();
  const tasks = await getTasksByDate(dateStr);

  const page = document.createElement('div');

  const dayLabel = new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  page.innerHTML = `
    <div class="page-header">
      <h1>EOD Summary</h1>
      <p class="page-sub">${dayLabel}</p>
    </div>
    <div style="margin-bottom:var(--s-md);display:flex;gap:var(--s-sm);align-items:center;">
      <label style="font-size:0.875rem;color:var(--text2);display:flex;align-items:center;gap:6px;">
        <input type="checkbox" id="eod-include-incomplete" />
        Include incomplete tasks
      </label>
    </div>
    <div class="eod-preview" id="eod-text"></div>
    <div class="eod-actions">
      <button class="btn btn-primary" id="eod-copy">Copy to clipboard</button>
    </div>
    <div class="copy-toast" id="copy-toast">Copied to clipboard</div>
  `;

  container.appendChild(page);

  const textEl = page.querySelector('#eod-text');
  const checkbox = page.querySelector('#eod-include-incomplete');

  function buildSummary(includeIncomplete) {
    const filtered = includeIncomplete ? tasks : tasks.filter(t => t.completed);
    if (filtered.length === 0) {
      return 'No tasks to show.';
    }

    let lines = [`EOD Summary — ${dayLabel}`, ''];
    let totalSecs = 0;

    filtered.forEach(t => {
      const elapsed = getElapsed(t);
      totalSecs += elapsed;
      const projectLabel = t.projects?.name || 'One-off';
      const status = t.completed ? '' : ' (in progress)';
      lines.push(`[${projectLabel}] ${t.title} (${formatElapsed(elapsed)})${status}`);
    });

    lines.push('');
    lines.push(`Total: ${formatElapsed(totalSecs)}`);
    return lines.join('\n');
  }

  function refresh() {
    textEl.textContent = buildSummary(checkbox.checked);
  }

  checkbox.addEventListener('change', refresh);
  refresh();

  page.querySelector('#eod-copy').addEventListener('click', async () => {
    const text = buildSummary(checkbox.checked);
    try {
      await navigator.clipboard.writeText(text);
      const toast = page.querySelector('#copy-toast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      const toast = page.querySelector('#copy-toast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }
  });
}
