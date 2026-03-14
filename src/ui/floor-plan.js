import { getCurrentFloorIndex, setCurrentFloorIndex, setDirty } from '../state.js';
import { getProject, putProject, generateId } from '../db.js';
import { setCurrentProjectName } from './app-shell.js';
import { startAutosave } from '../autosave.js';

const SNAP_DIST = 8;
const ROOM_MIN_SIZE = 20;
const FURNITURE_SIZE = 40;

let selectedRoom = null;
let bgImageCache = null;
let bgImageSrc = null;

export async function renderFloorPlanPage(project) {
  setCurrentProjectName(project.name);
  const content = document.getElementById('app-content');
  if (!content) return;

  const floorIndex = getCurrentFloorIndex();
  const floor = project.floors[floorIndex] ?? project.floors[0];
  if (!floor) return;

  selectedRoom = null;

  content.innerHTML = `
    <div class="fp-layout">
      <div class="fp-center">
        <div class="fp-top-bar">
          <div class="floor-tabs" id="floor-tabs"></div>
          <div class="floor-toolbar" id="floor-toolbar">
            <button type="button" class="btn btn-secondary" id="btn-draw-room">Draw room</button>
            <label class="btn btn-secondary">Background image<input type="file" accept="image/*" id="floor-upload" hidden /></label>
            <button type="button" class="btn btn-ghost" id="btn-clear-bg" title="Remove background image">Clear BG</button>
          </div>
        </div>
        <div class="canvas-wrap" id="canvas-wrap">
          <canvas id="floor-canvas"></canvas>
        </div>
      </div>
      <aside class="fp-sidebar" id="fp-sidebar">
        <section class="sidebar-section">
          <h3>Rooms</h3>
          <div id="room-list"></div>
        </section>
        <section class="sidebar-section" id="room-props" style="display:none;">
          <h3>Selected Room</h3>
          <div id="room-props-content"></div>
        </section>
        <section class="sidebar-section">
          <h3>Furniture</h3>
          <div id="furniture-list"></div>
          <div class="add-furniture-form" id="add-furniture-form">
            <input type="text" id="furniture-title-input" placeholder="Item name" class="input-inline" />
            <select id="furniture-type-select" class="input-inline">
              <option value="note">Note</option>
              <option value="link">Link</option>
              <option value="image">Image</option>
            </select>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-furniture">Add</button>
          </div>
        </section>
      </aside>
    </div>
  `;

  startAutosave(project);
  initFloorTabs(project);
  const redraw = initCanvas(project, floor);
  initToolbar(project, floor, redraw);
  renderRoomList(project, floor, redraw);
  renderFurnitureList(project, floor);
  initAddFurniture(project, floor, redraw);
}

function initFloorTabs(project) {
  const tabs = document.getElementById('floor-tabs');
  if (!tabs) return;
  const current = getCurrentFloorIndex();
  tabs.innerHTML =
    project.floors
      .map((f, i) =>
        `<button type="button" class="floor-tab ${i === current ? 'active' : ''}" data-index="${i}">Floor ${i + 1}</button>`
      )
      .join('') +
    '<button type="button" class="floor-tab floor-tab-add" id="floor-add">+</button>';

  tabs.querySelectorAll('.floor-tab[data-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setCurrentFloorIndex(parseInt(btn.dataset.index, 10));
      renderFloorPlanPage(project);
    });
  });

  document.getElementById('floor-add')?.addEventListener('click', () => {
    project.floors.push({ id: generateId(), backgroundImage: null, rooms: [], furniture: [] });
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
  let scale = 1, panX = 0, panY = 0;
  let mode = 'select'; // select | draw
  let isPanning = false, lastMX = 0, lastMY = 0;
  let drawStart = null, drawCurrent = null;
  let draggingRoom = null, dragOffset = { x: 0, y: 0 };
  let draggingFurniture = null, furnitureDragOffset = { x: 0, y: 0 };

  const W = wrap.clientWidth || 800;
  const H = 600;
  canvas.width = W;
  canvas.height = H;

  function toCanvas(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panX) / scale,
      y: (e.clientY - rect.top - panY) / scale,
    };
  }

  function preloadBg(cb) {
    if (!floor.backgroundImage) { cb(null); return; }
    if (bgImageSrc === floor.backgroundImage && bgImageCache) { cb(bgImageCache); return; }
    const img = new Image();
    img.onload = () => { bgImageCache = img; bgImageSrc = floor.backgroundImage; cb(img); };
    img.onerror = () => cb(null);
    img.src = floor.backgroundImage;
  }

  function redraw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#e8e8ed';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);

    preloadBg((bgImg) => {
      if (bgImg) {
        ctx.globalAlpha = 0.35;
        ctx.drawImage(bgImg, 0, 0);
        ctx.globalAlpha = 1;
      }
      drawGrid();
      drawAllRooms();
      drawAllFurniture();
      if (drawStart && drawCurrent) drawPreviewRect();
      ctx.restore();
    });
  }

  function drawGrid() {
    const gridSize = 20;
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 0.5 / scale;
    const visW = canvas.width / scale + 200;
    const visH = canvas.height / scale + 200;
    for (let x = 0; x < visW; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, visH); ctx.stroke();
    }
    for (let y = 0; y < visH; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(visW, y); ctx.stroke();
    }
  }

  function drawAllRooms() {
    floor.rooms.forEach((room) => {
      const isSelected = selectedRoom && selectedRoom.id === room.id;
      ctx.fillStyle = isSelected ? 'rgba(0,113,227,0.08)' : 'rgba(255,255,255,0.6)';
      ctx.fillRect(room.x, room.y, room.width, room.height);
      ctx.strokeStyle = isSelected ? '#0071e3' : '#1d1d1f';
      ctx.lineWidth = (isSelected ? 2.5 : 1.5) / scale;
      ctx.strokeRect(room.x, room.y, room.width, room.height);

      if (room.label) {
        ctx.font = `600 ${13 / scale}px -apple-system, sans-serif`;
        ctx.fillStyle = isSelected ? '#0071e3' : '#1d1d1f';
        ctx.fillText(room.label, room.x + 6 / scale, room.y + 18 / scale);
      }
      if (room.sqFt) {
        ctx.font = `${11 / scale}px -apple-system, sans-serif`;
        ctx.fillStyle = '#86868b';
        ctx.fillText(`${room.sqFt} sq ft`, room.x + 6 / scale, room.y + 34 / scale);
      }
    });
  }

  function drawAllFurniture() {
    (floor.furniture || []).forEach((item) => {
      const x = item.x ?? 50, y = item.y ?? 50;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#86868b';
      ctx.lineWidth = 1 / scale;
      ctx.fillRect(x, y, FURNITURE_SIZE, FURNITURE_SIZE);
      ctx.strokeRect(x, y, FURNITURE_SIZE, FURNITURE_SIZE);
      if (item.title) {
        ctx.font = `${10 / scale}px sans-serif`;
        ctx.fillStyle = '#1d1d1f';
        ctx.fillText(item.title.slice(0, 8), x + 2, y + 24);
      }
    });
  }

  function drawPreviewRect() {
    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.y - drawStart.y);
    ctx.fillStyle = 'rgba(0,113,227,0.1)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#0071e3';
    ctx.lineWidth = 2 / scale;
    ctx.setLineDash([6 / scale, 4 / scale]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  }

  function hitTestRoom(pt) {
    for (let i = floor.rooms.length - 1; i >= 0; i--) {
      const r = floor.rooms[i];
      if (pt.x >= r.x && pt.x <= r.x + r.width && pt.y >= r.y && pt.y <= r.y + r.height) return r;
    }
    return null;
  }

  function hitTestFurniture(pt) {
    const items = (floor.furniture || []).slice().reverse();
    for (const item of items) {
      const x = item.x ?? 50, y = item.y ?? 50;
      if (pt.x >= x && pt.x <= x + FURNITURE_SIZE && pt.y >= y && pt.y <= y + FURNITURE_SIZE) return item;
    }
    return null;
  }

  function snapRoom(room) {
    floor.rooms.forEach((other) => {
      if (other.id === room.id) return;
      // right edge → left edge
      if (Math.abs((room.x + room.width) - other.x) < SNAP_DIST) room.x = other.x - room.width;
      // left edge → right edge
      if (Math.abs(room.x - (other.x + other.width)) < SNAP_DIST) room.x = other.x + other.width;
      // bottom edge → top edge
      if (Math.abs((room.y + room.height) - other.y) < SNAP_DIST) room.y = other.y - room.height;
      // top edge → bottom edge
      if (Math.abs(room.y - (other.y + other.height)) < SNAP_DIST) room.y = other.y + other.height;
      // align tops
      if (Math.abs(room.y - other.y) < SNAP_DIST) room.y = other.y;
      // align lefts
      if (Math.abs(room.x - other.x) < SNAP_DIST) room.x = other.x;
    });
  }

  // Events
  canvas.addEventListener('mousedown', (e) => {
    const pt = toCanvas(e);

    if (mode === 'draw' && e.button === 0) {
      drawStart = pt;
      drawCurrent = pt;
      return;
    }

    // Check furniture hit first
    const fHit = hitTestFurniture(pt);
    if (fHit && e.button === 0) {
      draggingFurniture = fHit;
      furnitureDragOffset = { x: pt.x - (fHit.x ?? 50), y: pt.y - (fHit.y ?? 50) };
      return;
    }

    // Check room hit
    const hit = hitTestRoom(pt);
    if (hit && e.button === 0) {
      selectedRoom = hit;
      draggingRoom = hit;
      dragOffset = { x: pt.x - hit.x, y: pt.y - hit.y };
      showRoomProps(project, floor, redraw);
      redraw();
      return;
    }

    // Clicked empty space
    if (e.button === 0) {
      selectedRoom = null;
      showRoomProps(project, floor, redraw);
      isPanning = true;
      lastMX = e.clientX;
      lastMY = e.clientY;
      redraw();
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (mode === 'draw' && drawStart) {
      drawCurrent = toCanvas(e);
      redraw();
      return;
    }
    if (draggingRoom) {
      const pt = toCanvas(e);
      draggingRoom.x = pt.x - dragOffset.x;
      draggingRoom.y = pt.y - dragOffset.y;
      snapRoom(draggingRoom);
      setDirty();
      redraw();
      return;
    }
    if (draggingFurniture) {
      const pt = toCanvas(e);
      draggingFurniture.x = Math.max(0, pt.x - furnitureDragOffset.x);
      draggingFurniture.y = Math.max(0, pt.y - furnitureDragOffset.y);
      setDirty();
      redraw();
      return;
    }
    if (isPanning) {
      panX += e.clientX - lastMX;
      panY += e.clientY - lastMY;
      lastMX = e.clientX;
      lastMY = e.clientY;
      redraw();
    }

    // Update cursor
    const pt = toCanvas(e);
    if (mode === 'draw') {
      canvas.style.cursor = 'crosshair';
    } else if (hitTestRoom(pt) || hitTestFurniture(pt)) {
      canvas.style.cursor = 'move';
    } else {
      canvas.style.cursor = 'grab';
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (mode === 'draw' && drawStart && drawCurrent) {
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);
      if (w >= ROOM_MIN_SIZE && h >= ROOM_MIN_SIZE) {
        const roomNum = floor.rooms.length + 1;
        const newRoom = {
          id: generateId(), x, y, width: w, height: h,
          label: `Room ${roomNum}`, widthFt: 0, depthFt: 0, sqFt: 0,
        };
        floor.rooms.push(newRoom);
        selectedRoom = newRoom;
        setDirty();
        renderRoomList(project, floor, redraw);
        showRoomProps(project, floor, redraw);
      }
      drawStart = null;
      drawCurrent = null;
      redraw();
      return;
    }
    draggingRoom = null;
    draggingFurniture = null;
    isPanning = false;
  });

  canvas.addEventListener('mouseleave', () => {
    draggingRoom = null;
    draggingFurniture = null;
    isPanning = false;
    if (drawStart) { drawStart = null; drawCurrent = null; redraw(); }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const oldScale = scale;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.max(0.2, Math.min(4, scale * factor));
    panX = mx - (mx - panX) * (scale / oldScale);
    panY = my - (my - panY) * (scale / oldScale);
    redraw();
  }, { passive: false });

  // Draw mode toggle
  const drawBtn = document.getElementById('btn-draw-room');
  if (drawBtn) {
    drawBtn.addEventListener('click', () => {
      mode = mode === 'draw' ? 'select' : 'draw';
      drawBtn.classList.toggle('active', mode === 'draw');
      canvas.style.cursor = mode === 'draw' ? 'crosshair' : 'grab';
    });
  }

  // Resize
  const resizeObserver = new ResizeObserver(() => {
    canvas.width = wrap.clientWidth || 800;
    redraw();
  });
  resizeObserver.observe(wrap);

  redraw();
  return redraw;
}

function initToolbar(project, floor, redraw) {
  const uploadInput = document.getElementById('floor-upload');
  if (uploadInput) {
    uploadInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        floor.backgroundImage = reader.result;
        bgImageCache = null;
        bgImageSrc = null;
        setDirty();
        redraw();
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });
  }
  document.getElementById('btn-clear-bg')?.addEventListener('click', () => {
    floor.backgroundImage = null;
    bgImageCache = null;
    bgImageSrc = null;
    setDirty();
    redraw();
  });
}

function showRoomProps(project, floor, redraw) {
  const section = document.getElementById('room-props');
  const content = document.getElementById('room-props-content');
  if (!section || !content) return;

  if (!selectedRoom) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  content.innerHTML = `
    <div class="prop-row">
      <label>Name</label>
      <input type="text" id="room-label-input" class="input-inline" value="${esc(selectedRoom.label || '')}" />
    </div>
    <div class="prop-row">
      <label>Width (ft)</label>
      <input type="number" id="room-width-ft" class="input-inline input-sm" value="${selectedRoom.widthFt || ''}" min="0" step="0.5" />
    </div>
    <div class="prop-row">
      <label>Depth (ft)</label>
      <input type="number" id="room-depth-ft" class="input-inline input-sm" value="${selectedRoom.depthFt || ''}" min="0" step="0.5" />
    </div>
    <div class="prop-row">
      <span class="prop-sqft" id="room-sqft">${selectedRoom.sqFt ? selectedRoom.sqFt + ' sq ft' : ''}</span>
    </div>
    <button type="button" class="btn btn-ghost btn-sm text-danger" id="btn-delete-room">Delete room</button>
  `;

  const labelInput = document.getElementById('room-label-input');
  labelInput?.addEventListener('input', () => {
    selectedRoom.label = labelInput.value;
    setDirty();
    redraw();
    renderRoomList(project, floor, redraw);
  });

  const wInput = document.getElementById('room-width-ft');
  const dInput = document.getElementById('room-depth-ft');
  function updateSqFt() {
    selectedRoom.widthFt = parseFloat(wInput.value) || 0;
    selectedRoom.depthFt = parseFloat(dInput.value) || 0;
    selectedRoom.sqFt = Math.round(selectedRoom.widthFt * selectedRoom.depthFt * 100) / 100;
    document.getElementById('room-sqft').textContent = selectedRoom.sqFt ? selectedRoom.sqFt + ' sq ft' : '';
    setDirty();
    renderRoomList(project, floor, redraw);
  }
  wInput?.addEventListener('input', updateSqFt);
  dInput?.addEventListener('input', updateSqFt);

  document.getElementById('btn-delete-room')?.addEventListener('click', () => {
    floor.rooms = floor.rooms.filter((r) => r.id !== selectedRoom.id);
    selectedRoom = null;
    setDirty();
    showRoomProps(project, floor, redraw);
    renderRoomList(project, floor, redraw);
    redraw();
  });
}

function renderRoomList(project, floor, redraw) {
  const el = document.getElementById('room-list');
  if (!el) return;
  if (floor.rooms.length === 0) {
    el.innerHTML = '<p class="empty-hint">Click "Draw room" then drag on the canvas.</p>';
    return;
  }
  const totalSqFt = floor.rooms.reduce((sum, r) => sum + (r.sqFt || 0), 0);
  el.innerHTML = floor.rooms.map((r) => `
    <div class="room-list-item ${selectedRoom?.id === r.id ? 'selected' : ''}" data-id="${esc(r.id)}">
      <span class="room-list-label">${esc(r.label || 'Room')}</span>
      <span class="room-list-sqft">${r.sqFt ? r.sqFt + ' ft²' : ''}</span>
    </div>
  `).join('') +
    (totalSqFt > 0 ? `<div class="room-list-total">${totalSqFt} sq ft total</div>` : '');

  el.querySelectorAll('.room-list-item').forEach((item) => {
    item.addEventListener('click', () => {
      selectedRoom = floor.rooms.find((r) => r.id === item.dataset.id) || null;
      showRoomProps(project, floor, redraw);
      renderRoomList(project, floor, redraw);
      redraw();
    });
  });
}

function renderFurnitureList(project, floor) {
  const el = document.getElementById('furniture-list');
  if (!el) return;
  if (!floor.furniture || floor.furniture.length === 0) {
    el.innerHTML = '<p class="empty-hint">No furniture yet.</p>';
    return;
  }
  el.innerHTML = floor.furniture.map((f) => `
    <div class="furniture-list-item">
      <span>${esc(f.title || 'Item')}</span>
      <button type="button" class="btn-icon btn-delete-furniture" data-id="${esc(f.id)}" title="Remove">&times;</button>
    </div>
  `).join('');
  el.querySelectorAll('.btn-delete-furniture').forEach((btn) => {
    btn.addEventListener('click', () => {
      floor.furniture = floor.furniture.filter((f) => f.id !== btn.dataset.id);
      setDirty();
      renderFurnitureList(project, floor);
    });
  });
}

function initAddFurniture(project, floor, redraw) {
  const btn = document.getElementById('btn-add-furniture');
  const titleInput = document.getElementById('furniture-title-input');
  const typeSelect = document.getElementById('furniture-type-select');
  if (!btn || !titleInput || !typeSelect) return;

  btn.addEventListener('click', () => {
    const title = titleInput.value.trim() || 'Item';
    const type = typeSelect.value;
    const item = { id: generateId(), type, title, x: 100 + (floor.furniture?.length || 0) * 50, y: 100 };

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
          pushFurniture(project, floor, item, redraw);
          titleInput.value = '';
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }

    if (type === 'link') {
      const url = window.prompt('URL (Amazon, eBay, etc.):');
      if (url) item.url = url;
    }

    pushFurniture(project, floor, item, redraw);
    titleInput.value = '';
  });
}

function pushFurniture(project, floor, item, redraw) {
  floor.furniture = floor.furniture || [];
  project.budgetItems = project.budgetItems || [];
  const budgetItem = { id: generateId(), description: item.title, source: item.url || '', price: '', furnitureId: item.id };
  project.budgetItems.push(budgetItem);
  item.budgetItemId = budgetItem.id;
  floor.furniture.push(item);
  setDirty();
  redraw();
  renderFurnitureList(project, floor);
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
