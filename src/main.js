/**
 * Entry point: init DB, state, app shell, and hash-based router.
 */

import { renderAppShell } from './ui/app-shell.js';
import { renderProjectsPage } from './ui/projects.js';
import { renderFloorPlanPage } from './ui/floor-plan.js';
import { renderBudgetPage } from './ui/budget.js';
import { getCurrentProjectId, setCurrentProjectId } from './state.js';
import { getProject } from './db.js';

const routes = {
  '': projectsRoute,
  'project/:id/plan': floorPlanRoute,
  'project/:id/budget': budgetRoute,
};

function parseHash() {
  const hash = window.location.hash.slice(1) || '';
  const [path, ...rest] = hash.split('?');
  const segments = path.split('/').filter(Boolean);
  return { segments, path };
}

function matchRoute(segments) {
  for (const [pattern, handler] of Object.entries(routes)) {
    const parts = pattern.split('/').filter(Boolean);
    if (parts.length !== segments.length) continue;
    const params = {};
    let match = true;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith(':')) {
        params[parts[i].slice(1)] = segments[i];
      } else if (parts[i] !== segments[i]) {
        match = false;
        break;
      }
    }
    if (match) return { handler, params };
  }
  return { handler: projectsRoute, params: {} };
}

async function projectsRoute() {
  renderProjectsPage();
}

async function floorPlanRoute(params) {
  const project = await getProject(params.id);
  if (!project) {
    window.location.hash = '';
    return;
  }
  setCurrentProjectId(params.id);
  renderFloorPlanPage(project);
}

async function budgetRoute(params) {
  const project = await getProject(params.id);
  if (!project) {
    window.location.hash = '';
    return;
  }
  setCurrentProjectId(params.id);
  renderBudgetPage(project);
}

async function render() {
  const { segments } = parseHash();
  const { handler, params } = matchRoute(segments);

  renderAppShell();
  const content = document.getElementById('app-content');
  if (content) {
    content.innerHTML = '';
    if (params.id) {
      content.innerHTML = '<div class="loading-state">Loading…</div>';
    }
  }

  await handler(params);
}

window.addEventListener('hashchange', render);
render();
