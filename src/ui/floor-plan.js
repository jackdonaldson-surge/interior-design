/**
 * Floor plan page: upload image or build with draw/drag rooms; place furniture.
 * Multi-floor supported. Rendered into #app-content.
 */

import { getCurrentFloorIndex, setCurrentFloorIndex, setDirty } from '../state.js';
import { getProject, putProject, generateId } from '../db.js';
import { setCurrentProjectName } from './app-shell.js';
import { startAutosave } from '../autosave.js';

export async function renderFloorPlanPage(project) {
  setCurrentProjectName(project.name);
  const content = document.getElementById('app-content');
  if (!content) return;

  const floorIndex = getCurrentFloorIndex();
  const floor = project.floors[floorIndex] ?? project.floors[0];
  if (!floor) return;

  content.innerHTML = `
    <h1 class="page-title">Floor plan</h1>
    <div class="floor-tabs" id="floor-tabs"></div>
    <div class="floor-toolbar">
      <label class="btn btn-secondary">Upload image<input type="file" accept="image/*" id="floor-upload" hidden /></label>
      <button type="button" class="btn btn-secondary" id="btn-draw-room">Draw room</button>
      <div class="room-blocks-palette" id="room-blocks-palette"></div>
    </div>
    <div class="canvas-wrap" id="canvas-wrap">
      <canvas id="floor-canvas"></canvas>
    </div>
    <aside class="floor-plan-sidebar" id="floor-sidebar">
      <h3>Rooms</h3>
      <div id="room-list"></div>
      <h3>Furniture</h3>
      <div id="furniture-list"></div>
      <button type="button" class="btn btn-secondary" id="btn-add-furniture" style="margin-top: 8px;">Add furniture</button>
    </aside>
  `;

  startAutosave(project);
  initFloorTabs(content, project);
  const redraw = initCanvas(project, floor);
  initUploadImage(project, floor, redraw);
  initDrawRoom(project, floor, redraw);
  initRoomBlocksPalette(project, floor, redraw);
  initAddFurniture(project, floor, redraw);
  initRoomList(project, floor);
  initFurnitureList(project, floor);
}

function initFloorTabs(content, project) {
  const tabs = document.getElementById('floor-tabs');
  if (!tabs) return;
  const current = getCurrentFloorIndex();
  tabs.innerHTML =
    project.floors
      .map(
        (f, i) =>
          `<button type="button" class="floor-tab ${i === current ? 'active' : ''}" data-index="${i}">Floor ${i + 1}</button>`
      )
      .join('') + '<button type="button" class="floor-tab floor-tab-add" id="floor-add">+ Add floor</button>';

  tabs.querySelectorAll('.floor-tab[data-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index, 10);
      setCurrentFloorIndex(index);
      renderFloorPlanPage(project);
    });
  });

  document.getElementById('floor-add')?.addEventListener('click', () => {
    project.floors.push({
      id: generateId(),
      backgroundImage: null,
      rooms: [],
      furniture: [],
    });
    setCurrentFloorIndex(project.floors.length - 1);
    setDirty();
    renderFloorPlanPage(project);
  });
}

function initCanvas(project, floor) {
  const wrap = document.getElementById('canvas-wrap');
  const canvas = document.getElementById('floor-canvas');
  if (!wrap || !canvas) return () => {};

  const ctx = canvas.getContext('2d');
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let lastX = 0;
  let lastY = 0;

  const width = 800;
  const height = 600;
  canvas.width = width;
  canvas.height = height;

  function drawRooms() {
    floor.rooms.forEach((room) => {
      ctx.strokeStyle = '#1d1d1f';
      ctx.lineWidth = 2 / scale;
      ctx.strokeRect(room.x, room.y, room.width, room.height);
      if (room.label) {
        ctx.font = `${14 / scale}px sans-serif`;
        ctx.fillStyle = '#1d1d1f';
        ctx.fillText(room.label, room.x + 4, room.y + 18);
      }
    });
  }

  function drawFurniture() {
    (floor.furniture || []).forEach((item) => {
      const x = item.x ?? 50;
      const y = item.y ?? 50;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#86868b';
      ctx.lineWidth = 1 / scale;
      ctx.fillRect(x, y, 40, 40);
      ctx.strokeRect(x, y, 40, 40);
      if (item.imageDataUrl) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, x, y, 40, 40);
        };
        img.src = item.imageDataUrl;
      }
      if (item.title) {
        ctx.font = `${10 / scale}px sans-serif`;
        ctx.fillStyle = '#1d1d1f';
        ctx.fillText(item.title.slice(0, 8), x + 2, y + 24);
      }
    });
  }

  function redraw() {
    ctx.fillStyle = '#e8e8ed';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);

    if (floor.backgroundImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        drawRooms();
        drawFurniture();
      };
      img.src = floor.backgroundImage;
    } else {
      drawRooms();
      drawFurniture();
    }
    ctx.restore();
  }

  wrap.addEventListener('mousedown', (e) => {
    if (e.button === 0 && !wrap._drawMode) {
      isPanning = true;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });
  wrap.addEventListener('mousemove', (e) => {
    if (isPanning) {
      panX += e.clientX - lastX;
      panY += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      redraw();
    }
  });
  wrap.addEventListener('mouseup', () => (isPanning = false));
  wrap.addEventListener('mouseleave', () => (isPanning = false));
  wrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.max(0.25, Math.min(3, scale * factor));
    redraw();
  }, { passive: false });

  let draggingFurniture = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  wrap.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || wrap._drawMode) return;
    const rect = canvas.getBoundingClientRect();
    const t = wrap._getTransform?.() || { panX: 0, panY: 0, scale: 1 };
    const mx = (e.clientX - rect.left - t.panX) / t.scale;
    const my = (e.clientY - rect.top - t.panY) / t.scale;
    const items = (floor.furniture || []).slice().reverse();
    for (const item of items) {
      const x = item.x ?? 50;
      const y = item.y ?? 50;
      if (mx >= x && mx <= x + 40 && my >= y && my <= y + 40) {
        draggingFurniture = item;
        dragOffsetX = mx - x;
        dragOffsetY = my - y;
        e.preventDefault();
        break;
      }
    }
    if (!draggingFurniture) {
      isPanning = true;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });
  wrap.addEventListener('mousemove', (e) => {
    if (draggingFurniture) {
      const rect = canvas.getBoundingClientRect();
      const t = wrap._getTransform?.() || { panX: 0, panY: 0, scale: 1 };
      const mx = (e.clientX - rect.left - t.panX) / t.scale;
      const my = (e.clientY - rect.top - t.panY) / t.scale;
      draggingFurniture.x = Math.max(0, mx - dragOffsetX);
      draggingFurniture.y = Math.max(0, my - dragOffsetY);
      setDirty();
      redraw();
      return;
    }
    if (isPanning) {
      panX += e.clientX - lastX;
      panY += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      redraw();
    }
  });
  wrap.addEventListener('mouseup', () => {
    draggingFurniture = null;
    isPanning = false;
  });
  wrap.addEventListener('mouseleave', () => {
    draggingFurniture = null;
    isPanning = false;
  });

  redraw();
  wrap._getTransform = () => ({ panX, panY, scale });
  return redraw;
}

function initUploadImage(project, floor, redraw) {
  const input = document.getElementById('floor-upload');
  if (!input) return;
  input.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      floor.backgroundImage = reader.result;
      setDirty();
      redraw();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });
}

function initDrawRoom(project, floor, redraw) {
  const btn = document.getElementById('btn-draw-room');
  const canvas = document.getElementById('floor-canvas');
  const wrap = document.getElementById('canvas-wrap');
  if (!btn || !canvas || !wrap) return;

  let drawMode = false;
  let startX = 0;
  let startY = 0;

  btn.addEventListener('click', () => {
    drawMode = !drawMode;
    wrap._drawMode = drawMode;
    btn.classList.toggle('active', drawMode);
  });

  wrap.addEventListener('mousedown', (e) => {
    if (!drawMode || e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const t = wrap._getTransform?.() || { panX: 0, panY: 0, scale: 1 };
    startX = (e.clientX - rect.left - t.panX) / t.scale;
    startY = (e.clientY - rect.top - t.panY) / t.scale;
  });
  wrap.addEventListener('mouseup', (e) => {
    if (!drawMode || e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const t = wrap._getTransform?.() || { panX: 0, panY: 0, scale: 1 };
    const endX = (e.clientX - rect.left - t.panX) / t.scale;
    const endY = (e.clientY - rect.top - t.panY) / t.scale;
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const w = Math.max(20, Math.abs(endX - startX));
    const h = Math.max(20, Math.abs(endY - startY));
    const label = prompt('Room label (e.g. Living room):') || 'Room';
    const widthFt = prompt('Width (feet):', '12') || '10';
    const depthFt = prompt('Depth (feet):', '15') || '10';
    const sqFt = parseFloat(widthFt) * parseFloat(depthFt) || 100;
    floor.rooms = floor.rooms || [];
    floor.rooms.push({ id: generateId(), x, y, width: w, height: h, label, widthFt: parseFloat(widthFt), depthFt: parseFloat(depthFt), sqFt });
    setDirty();
    redraw();
    initRoomList(project, floor);
  });
}

const ROOM_BLOCKS = [
  { w: 10, h: 10, label: '10×10' },
  { w: 12, h: 12, label: '12×12' },
  { w: 12, h: 15, label: '12×15' },
  { w: 15, h: 15, label: '15×15' },
  { w: 10, h: 12, label: '10×12' },
];

function initRoomBlocksPalette(project, floor, redraw) {
  const palette = document.getElementById('room-blocks-palette');
  if (!palette) return;
  palette.innerHTML = ROOM_BLOCKS.map(
    (b) => `<button type="button" class="room-block-btn" data-w="${b.w}" data-h="${b.h}" data-label="${escapeAttr(b.label)}">${escapeHtml(b.label)}</button>`
  ).join('');
  palette.querySelectorAll('.room-block-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const w = parseInt(btn.dataset.w, 10);
      const h = parseInt(btn.dataset.h, 10);
      const label = btn.dataset.label || `${w}×${h}`;
      const sqFt = w * h;
      const pixelW = 40;
      const pixelH = 40;
      const x = 50 + (floor.rooms?.length ?? 0) * 60;
      const y = 50;
      floor.rooms = floor.rooms || [];
      floor.rooms.push({
        id: generateId(),
        x,
        y,
        width: pixelW * (w / 10),
        height: pixelH * (h / 10),
        label,
        widthFt: w,
        depthFt: h,
        sqFt,
      });
      setDirty();
      redraw();
      initRoomList(project, floor);
    });
  });
}

function initAddFurniture(project, floor, redraw) {
  const btn = document.getElementById('btn-add-furniture');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const type = prompt('Type: image, note, or link?', 'note')?.toLowerCase() || 'note';
    const title = prompt('Title:', 'Item') || 'Item';
    let item = { id: generateId(), type, title, x: 100, y: 100 };
    if (type === 'link') {
      item.url = prompt('URL (Amazon, eBay, etc.):', '') || '';
    }
    if (type === 'note') {
      item.description = prompt('Description (optional):', '') || '';
    }
    if (type === 'image') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          item.imageDataUrl = reader.result;
          floor.furniture = floor.furniture || [];
          const budgetId = addBudgetLineForFurniture(project, item);
          item.budgetItemId = budgetId;
          floor.furniture.push(item);
          setDirty();
          redraw();
          initFurnitureList(project, floor);
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }
    floor.furniture = floor.furniture || [];
    const budgetId = addBudgetLineForFurniture(project, item);
    item.budgetItemId = budgetId;
    floor.furniture.push(item);
    setDirty();
    redraw();
    initFurnitureList(project, floor);
  });
}

function addBudgetLineForFurniture(project, item) {
  project.budgetItems = project.budgetItems || [];
  const budgetItem = {
    id: generateId(),
    description: item.title,
    source: item.url || '',
    price: '',
    furnitureId: item.id,
  };
  project.budgetItems.push(budgetItem);
  return budgetItem.id;
}

function initRoomList(project, floor) {
  const el = document.getElementById('room-list');
  if (!el) return;
  const totalSqFt = floor.rooms.reduce((sum, r) => sum + (r.sqFt || 0), 0);
  el.innerHTML = `
    ${floor.rooms.length === 0 ? '<p class="empty-state">No rooms yet. Draw or drag rooms on the canvas.</p>' : ''}
    ${floor.rooms.map((r) => `<div>${escapeHtml(r.label || 'Room')}: ${r.sqFt || 0} sq ft</div>`).join('')}
    ${totalSqFt > 0 ? `<div><strong>Total: ${totalSqFt} sq ft</strong></div>` : ''}
  `;
}

function initFurnitureList(project, floor) {
  const el = document.getElementById('furniture-list');
  if (!el) return;
  el.innerHTML = `
    ${floor.furniture.length === 0 ? '<p class="empty-state">No furniture. Add from Floor plan tools.</p>' : ''}
    ${floor.furniture.map((f) => `<div>${escapeHtml(f.title || 'Item')}</div>`).join('')}
  `;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
