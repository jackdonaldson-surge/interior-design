import { supabase } from '../supabase.js';

export function renderAuth(app) {
  const page = document.createElement('div');
  page.className = 'auth-page';
  page.innerHTML = `
    <div class="auth-card">
      <h1>TimeTracker</h1>
      <p class="subtitle">Track your day, own your time.</p>
      <form id="auth-form">
        <input type="email" id="auth-email" placeholder="you@example.com" required autocomplete="email" />
        <button type="submit" class="btn btn-primary" style="width:100%">Send magic link</button>
      </form>
      <div id="auth-feedback"></div>
    </div>
  `;

  app.appendChild(page);

  page.querySelector('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = page.querySelector('#auth-email').value.trim();
    const feedback = page.querySelector('#auth-feedback');
    const btn = page.querySelector('button[type="submit"]');

    if (!email) return;

    btn.disabled = true;
    btn.textContent = 'Sending…';
    feedback.innerHTML = '';

    const redirectTo = location.origin + (import.meta.env.BASE_URL || '/');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    btn.disabled = false;
    btn.textContent = 'Send magic link';

    if (error) {
      feedback.innerHTML = `<div class="auth-err">${esc(error.message)}</div>`;
    } else {
      feedback.innerHTML = `<div class="auth-msg">Check your email for a login link.</div>`;
    }
  });
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}
