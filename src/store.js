import { supabase } from './supabase.js';

// ── Projects ──

export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getAllProjectsIncArchived() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createProject(name, color = '#0071e3') {
  const { data, error } = await supabase
    .from('projects')
    .insert({ name, color })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(id, fields) {
  const { error } = await supabase
    .from('projects')
    .update(fields)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteProject(id) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Tasks ──

export async function getTasksByDate(date) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, projects(name, color)')
    .eq('date', date)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getTasksForWeek(startDate, endDate) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, projects(name, color)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getTasksByProject(projectId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, projects(name, color)')
    .eq('project_id', projectId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createTask(title, date, projectId = null) {
  const { data: existing } = await supabase
    .from('tasks')
    .select('sort_order')
    .eq('date', date)
    .order('sort_order', { ascending: false })
    .limit(1);
  const nextOrder = existing?.length ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from('tasks')
    .insert({ title, date, project_id: projectId, sort_order: nextOrder })
    .select('*, projects(name, color)')
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(id, fields) {
  const { data, error } = await supabase
    .from('tasks')
    .update(fields)
    .eq('id', id)
    .select('*, projects(name, color)')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTask(id) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Helpers ──

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function formatElapsed(seconds) {
  if (!seconds || seconds < 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function parseTimeInput(str) {
  str = str.trim().toLowerCase();
  let total = 0;
  const hMatch = str.match(/(\d+)\s*h/);
  const mMatch = str.match(/(\d+)\s*m/);
  if (hMatch) total += parseInt(hMatch[1]) * 3600;
  if (mMatch) total += parseInt(mMatch[1]) * 60;
  if (!hMatch && !mMatch) {
    const num = parseInt(str);
    if (!isNaN(num)) total = num * 60;
  }
  return total;
}
