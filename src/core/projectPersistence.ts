import type { Project } from '@/types/project';

const STORAGE_KEY = 'ui-builder-projects-v1';

export interface StoredProjectRecord {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  project: Project;
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readAll(): StoredProjectRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredProjectRecord[];
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function writeAll(records: StoredProjectRecord[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function listStoredProjects(): StoredProjectRecord[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function renameStoredProject(projectId: string, updates: { name?: string; description?: string }) {
  const records = readAll();
  const target = records.find((item) => item.id === projectId);
  if (!target) return null;

  const now = new Date().toISOString();
  const name = (updates.name ?? target.name).trim() || 'Без названия';
  const description = (updates.description ?? target.description).trim();

  target.name = name;
  target.description = description;
  target.updatedAt = now;
  target.project = {
    ...target.project,
    meta: {
      ...target.project.meta,
      name,
      description,
      updatedAt: now,
    },
  };

  writeAll(records);
  return target;
}

export function saveStoredProject(project: Project, overrides?: { name?: string; description?: string }) {
  const name = (overrides?.name ?? project.meta.name ?? '').trim() || 'Без названия';
  const description = (overrides?.description ?? project.meta.description ?? '').trim();
  const now = new Date().toISOString();

  const nextProject: Project = {
    ...project,
    meta: {
      ...project.meta,
      name,
      description,
      createdAt: project.meta.createdAt || now,
      updatedAt: now,
    },
  };

  const record: StoredProjectRecord = {
    id: nextProject.meta.id,
    name,
    description,
    createdAt: nextProject.meta.createdAt,
    updatedAt: nextProject.meta.updatedAt,
    version: nextProject.meta.version,
    project: nextProject,
  };

  const records = readAll();
  const filtered = records.filter((item) => item.id !== record.id);
  filtered.push(record);
  writeAll(filtered);

  return record;
}

export function deleteStoredProject(projectId: string) {
  const records = readAll().filter((item) => item.id !== projectId);
  writeAll(records);
}

export function getStoredProject(projectId: string) {
  return readAll().find((item) => item.id === projectId) ?? null;
}
