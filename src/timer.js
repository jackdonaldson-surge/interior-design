import { updateTask } from './store.js';

const ticking = new Map();

export function getElapsed(task) {
  let total = task.elapsed || 0;
  if (task.running && task.timer_start) {
    const started = new Date(task.timer_start).getTime();
    const delta = Math.floor((Date.now() - started) / 1000);
    total += Math.max(0, delta);
  }
  return total;
}

export async function startTimer(task) {
  const now = new Date().toISOString();
  task.running = true;
  task.timer_start = now;
  await updateTask(task.id, { running: true, timer_start: now });
}

export async function stopTimer(task) {
  const additional = task.timer_start
    ? Math.floor((Date.now() - new Date(task.timer_start).getTime()) / 1000)
    : 0;
  const newElapsed = (task.elapsed || 0) + Math.max(0, additional);

  task.elapsed = newElapsed;
  task.running = false;
  task.timer_start = null;

  await updateTask(task.id, {
    elapsed: newElapsed,
    running: false,
    timer_start: null,
  });
}

export async function toggleTimer(task) {
  if (task.running) {
    await stopTimer(task);
  } else {
    await startTimer(task);
  }
}

export function startTicking(taskId, callback) {
  stopTicking(taskId);
  const interval = setInterval(callback, 1000);
  ticking.set(taskId, interval);
}

export function stopTicking(taskId) {
  const interval = ticking.get(taskId);
  if (interval) {
    clearInterval(interval);
    ticking.delete(taskId);
  }
}

export function stopAllTicking() {
  for (const [id, interval] of ticking) {
    clearInterval(interval);
  }
  ticking.clear();
}
