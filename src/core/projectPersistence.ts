/**
 * ============================================
 * MODULE: Project Storage Persistence
 * VERSION: 1.0.0
 * ROLE:
 * Локальный persistence-слой для сохранения и
 * чтения проектов UI builder из browser localStorage.
 *
 * RESPONSIBILITIES:
 * - Читать список сохраненных проектов
 * - Валидировать и нормализовать storage records
 * - Сохранять и обновлять project records
 * - Удалять и получать проекты по id
 *
 * DEPENDS ON:
 * - Project type
 * - window.localStorage
 *
 * USED BY:
 * - project management UI
 * - save/load flows
 * - project selection dialogs
 *
 * RULES:
 * - Только persistence logic
 * - Без UI-логики
 * - Без runtime/export HTML logic
 * - localStorage считается внешней и потенциально грязной границей данных
 *
 * SECURITY:
 * - Данные из localStorage не считаются полностью доверенными
 * - Перед использованием records проходят минимальную shape-проверку
 * - Ошибки чтения/записи не должны ломать builder UI
 * ============================================
 */

import type { Project } from '@/types/project';

/**
 * ============================================
 * BLOCK: Shared Types
 * VERSION: 1.0.0
 * PURPOSE:
 * Публичные и внутренние типы persistence-слоя.
 * ============================================
 */
export interface StoredProjectRecord {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  project: Project;
}

interface StoredProjectTextUpdates {
  name?: string;
  description?: string;
}

/**
 * ============================================
 * BLOCK: Storage Constants
 * VERSION: 1.0.0
 * PURPOSE:
 * Константы browser persistence слоя.
 * ============================================
 */
const STORAGE_KEY = 'ui-builder-projects-v1';
const DEFAULT_PROJECT_NAME = 'Без названия';

/**
 * ============================================
 * BLOCK: Storage Guards And Normalizers
 * VERSION: 1.0.0
 * PURPOSE:
 * Проверки среды, shape-валидация storage records
 * и нормализация текстовых полей.
 * ============================================
 */
function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProjectLike(value: unknown): value is Project {
  if (!isPlainObject(value)) {
    return false;
  }

  const meta = value.meta;

  return isPlainObject(meta) && typeof meta.id === 'string';
}

function isStoredProjectRecord(value: unknown): value is StoredProjectRecord {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    typeof value.version === 'string' &&
    isProjectLike(value.project)
  );
}

function normalizeText(value?: string): string {
  return (value ?? '').trim();
}

function resolveProjectName(value?: string): string {
  return normalizeText(value) || DEFAULT_PROJECT_NAME;
}

/**
 * ============================================
 * BLOCK: Internal Storage IO
 * VERSION: 1.0.0
 * PURPOSE:
 * Безопасное чтение и запись массива project records
 * из browser localStorage.
 * ============================================
 */
function readAll(): StoredProjectRecord[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isStoredProjectRecord);
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore cleanup failures to keep UI stable.
    }

    return [];
  }
}

function writeAll(records: StoredProjectRecord[]): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage write failures to avoid breaking the builder UI.
  }
}

/**
 * ============================================
 * BLOCK: Record Builders
 * VERSION: 1.0.0
 * PURPOSE:
 * Сборка новых и обновленных persistence records
 * без неявной мутации исходных объектов.
 * ============================================
 */
function createStoredProjectRecord(
  project: Project,
  overrides?: StoredProjectTextUpdates,
): StoredProjectRecord {
  const now = new Date().toISOString();
  const name = resolveProjectName(overrides?.name ?? project.meta.name);
  const description = normalizeText(overrides?.description ?? project.meta.description);

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

  return {
    id: nextProject.meta.id,
    name,
    description,
    createdAt: nextProject.meta.createdAt,
    updatedAt: nextProject.meta.updatedAt,
    version: nextProject.meta.version,
    project: nextProject,
  };
}

function updateStoredProjectRecord(
  record: StoredProjectRecord,
  updates: StoredProjectTextUpdates,
): StoredProjectRecord {
  const now = new Date().toISOString();
  const name = resolveProjectName(updates.name ?? record.name);
  const description = normalizeText(updates.description ?? record.description);

  const nextProject: Project = {
    ...record.project,
    meta: {
      ...record.project.meta,
      name,
      description,
      updatedAt: now,
    },
  };

  return {
    ...record,
    name,
    description,
    updatedAt: now,
    project: nextProject,
  };
}

/**
 * ============================================
 * BLOCK: Public API
 * VERSION: 1.0.0
 * PURPOSE:
 * Публичный persistence API для работы с
 * сохраненными проектами builder.
 * ============================================
 */
export function listStoredProjects(): StoredProjectRecord[] {
  return [...readAll()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function renameStoredProject(
  projectId: string,
  updates: StoredProjectTextUpdates,
): StoredProjectRecord | null {
  const records = readAll();
  const targetRecord = records.find((item) => item.id === projectId);

  if (!targetRecord) {
    return null;
  }

  const nextRecord = updateStoredProjectRecord(targetRecord, updates);
  const nextRecords = records.map((item) => (item.id === projectId ? nextRecord : item));

  writeAll(nextRecords);

  return nextRecord;
}

export function saveStoredProject(
  project: Project,
  overrides?: StoredProjectTextUpdates,
): StoredProjectRecord {
  const nextRecord = createStoredProjectRecord(project, overrides);
  const nextRecords = readAll().filter((item) => item.id !== nextRecord.id);

  nextRecords.push(nextRecord);
  writeAll(nextRecords);

  return nextRecord;
}

export function deleteStoredProject(projectId: string): void {
  const nextRecords = readAll().filter((item) => item.id !== projectId);

  writeAll(nextRecords);
}

export function getStoredProject(projectId: string): StoredProjectRecord | null {
  return readAll().find((item) => item.id === projectId) ?? null;
}