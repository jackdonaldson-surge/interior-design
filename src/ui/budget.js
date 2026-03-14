/**
 * Budget page: line items, manual price, totals, autosave.
 */

import { setCurrentProjectName } from './app-shell.js';
import { setDirty } from '../state.js';
import { startAutosave } from '../autosave.js';
import { generateId } from '../db.js';

export async function renderBudgetPage(project) {
  setCurrentProjectName(project.name);
  const content = document.getElementById('app-content');
  if (!content) return;

  const items = project.budgetItems || [];
  const total = items.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);

  content.innerHTML = `
    <h1 class="page-title">Budget</h1>
    <div class="card">
      <table class="budget-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Source / Link</th>
            <th class="price">Price</th>
          </tr>
        </thead>
        <tbody id="budget-tbody">
        </tbody>
      </table>
      <div class="budget-total">Subtotal: $${total.toFixed(2)}</div>
      <div style="margin-top: var(--space-md);">
        <button type="button" class="btn btn-secondary" id="budget-add-line">Add line</button>
      </div>
    </div>
  `;

  const tbody = document.getElementById('budget-tbody');
  items.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" data-index="${index}" data-field="description" value="${escapeAttr(item.description || '')}" placeholder="Item" /></td>
      <td><input type="text" data-index="${index}" data-field="source" value="${escapeAttr(item.source || '')}" placeholder="Link or source" /></td>
      <td class="price"><input type="number" data-index="${index}" data-field="price" value="${escapeAttr(String(item.price ?? ''))}" placeholder="0" min="0" step="0.01" style="width: 6em;" /></td>
    `;
    tbody.appendChild(tr);
  });
  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No budget lines. Add one or add furniture on the Floor plan.</td></tr>';
  }

  tbody.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      const index = parseInt(input.dataset.index, 10);
      const field = input.dataset.field;
      if (project.budgetItems[index]) {
        project.budgetItems[index][field] = input.value;
        setDirty();
        updateBudgetTotal(project);
      }
    });
  });

  function updateBudgetTotal(proj) {
    const total = (proj.budgetItems || []).reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);
    const totalEl = content.querySelector('.budget-total');
    if (totalEl) totalEl.textContent = `Subtotal: $${total.toFixed(2)}`;
  }

  document.getElementById('budget-add-line').addEventListener('click', () => {
    project.budgetItems = project.budgetItems || [];
    project.budgetItems.push({ id: generateId(), description: '', source: '', price: '' });
    setDirty();
    renderBudgetPage(project);
  });

  startAutosave(project);
}

function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
