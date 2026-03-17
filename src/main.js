import './style.css';
import { supabase } from './supabase.js';
import { renderNav } from './components/nav.js';
import { renderAuth } from './views/auth.js';
import { renderToday } from './views/today.js';
import { renderWeek } from './views/week.js';
import { renderProjects } from './views/projects.js';
import { renderEOD } from './views/eod.js';
import { stopAllTicking } from './timer.js';

const app = document.getElementById('app');

async function getUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

async function render() {
  stopAllTicking();
  app.innerHTML = '';

  const user = await getUser();

  if (!user) {
    renderAuth(app);
    return;
  }

  const layout = document.createElement('div');
  layout.className = 'layout';

  renderNav(layout, user.email);

  const main = document.createElement('div');
  main.className = 'main';
  layout.appendChild(main);

  app.appendChild(layout);

  const hash = location.hash || '#/';

  try {
    if (hash === '#/week') {
      await renderWeek(app, main);
    } else if (hash === '#/projects') {
      await renderProjects(app, main);
    } else if (hash === '#/eod') {
      await renderEOD(app, main);
    } else {
      await renderToday(app, main);
    }
  } catch (err) {
    console.error('View error:', err);
    main.innerHTML = `<div class="error-page"><h2>Something went wrong</h2><pre>${esc(err.message)}</pre><a href="#/" class="btn btn-secondary" style="margin-top:16px">Back to Today</a></div>`;
  }
}

// Auth state changes (login, logout, token refresh)
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    render();
  }
});

window.addEventListener('hashchange', render);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.key === 'n' || e.key === 'N') {
    e.preventDefault();
    location.hash = '#/';
    setTimeout(() => {
      const input = document.getElementById('qa-input');
      if (input) input.focus();
    }, 100);
  }
  if (e.key === 'e' || e.key === 'E') {
    e.preventDefault();
    location.hash = '#/eod';
  }
});

render();

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
