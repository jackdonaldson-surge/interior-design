import { supabase } from '../supabase.js';

const ICON_TODAY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
const ICON_WEEK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>';
const ICON_PROJECTS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
const ICON_EOD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';

const links = [
  { hash: '#/',         label: 'Today',    icon: ICON_TODAY },
  { hash: '#/week',     label: 'Week',     icon: ICON_WEEK },
  { hash: '#/projects', label: 'Projects', icon: ICON_PROJECTS },
  { hash: '#/eod',      label: 'EOD',      icon: ICON_EOD },
];

export function renderNav(container, userEmail) {
  const nav = document.createElement('nav');
  nav.className = 'nav';

  const current = location.hash || '#/';

  nav.innerHTML = `
    <div class="nav-brand">TimeTracker</div>
    <div class="nav-links">
      ${links.map(l => `
        <a href="${l.hash}" class="nav-link ${current === l.hash || (l.hash !== '#/' && current.startsWith(l.hash)) ? 'active' : ''}">
          ${l.icon}
          ${l.label}
        </a>
      `).join('')}
    </div>
    <div class="nav-user">
      <span>${esc(userEmail)}</span>
      <button id="logout-btn">Sign out</button>
    </div>
  `;

  nav.querySelector('#logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.hash = '#/';
    location.reload();
  });

  container.appendChild(nav);
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}
