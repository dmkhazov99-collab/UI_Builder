/**
 * ============================================
 * MODULE: Project Persistence Gateway
 * VERSION: 1.3.0
 * ROLE:
 * Асинхронный gateway для сохранения проектов.
 *
 * RESPONSIBILITIES:
 * - выполнять save/list/get/rename/delete через HTTP API
 * - нормализовать ответы API к StoredProjectRecord
 * - считать remote API единственным источником правды
 *
 * DEPENDS ON:
 * - Project domain model
 * - fetch / browser runtime
 *
 * USED BY:
 * - Toolbar save/open workflow
 *
 * RULES:
 * - public API повторяет persistence use cases, но работает async
 * - remote API обязателен для project management workflow
 * - gateway не должен содержать UI-логику
 *
 * SECURITY:
 * - remote payload считается внешней и потенциально грязной границей
 * - ответы API проходят минимальную shape-проверку
 * - token передается через query/body в соответствии с Apps Script backend
 * ============================================
 */

import type { Project } from '@/types/project';
import {
  DEFAULT_COLOR_SYSTEM,
  DEFAULT_EXPORT_CONFIG,
  DEFAULT_GRID_SYSTEM,
  DEFAULT_PROJECT_THEME,
  DEFAULT_TYPOGRAPHY,
} from '@/types/project';

import type { StoredProjectRecord } from '@/core/projectPersistence';

export type { StoredProjectRecord } from '@/core/projectPersistence';

const REMOTE_API_URL = import.meta.env.VITE_PROJECTS_API_URL?.trim() || '';
const REMOTE_API_TOKEN = import.meta.env.VITE_PROJECTS_API_TOKEN?.trim() || '';
const DEFAULT_PROJECT_NAME = 'Без названия';

type RemoteEnvelope = {
  success?: boolean;
  message?: string;
  error?: string;
  item?: unknown;
  record?: unknown;
  project?: unknown;
  data?: unknown;
  items?: unknown[];
  records?: unknown[];
  projects?: unknown[];
};

function assertRemotePersistenceConfigured(): void {
  if (!REMOTE_API_URL) {
    throw new Error('Remote Projects API не настроен');
  }
}

function createRequestHeaders(method: 'GET' | 'POST'): HeadersInit {
  if (method === 'POST') {
    return {
      'Content-Type': 'text/plain;charset=UTF-8',
    };
  }

  return {};
}

function createRequestUrl(action: string, params?: Record<string, string>): string {
  assertRemotePersistenceConfigured();

  const baseUrl =
    typeof window !== 'undefined'
      ? new URL(REMOTE_API_URL, window.location.origin)
      : new URL(REMOTE_API_URL);

  baseUrl.searchParams.set('action', action);

  if (REMOTE_API_TOKEN) {
    baseUrl.searchParams.set('token', REMOTE_API_TOKEN);
  }

  Object.entries(params || {}).forEach(([key, value]) => {
    if (!value) return;
    baseUrl.searchParams.set(key, value);
  });

  return baseUrl.toString();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProjectLike(value: unknown): value is Project {
  if (!isPlainObject(value)) return false;

  const meta = value.meta;
  return isPlainObject(meta) && typeof meta.id === 'string';
}

function isStoredProjectRecord(value: unknown): value is StoredProjectRecord {
  if (!isPlainObject(value)) return false;

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

function normalizeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function createPlaceholderProject(meta: {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  version: string;
}): Project {
  return {
    meta,
    designSystem: {
      colors: { ...DEFAULT_COLOR_SYSTEM },
      typography: { ...DEFAULT_TYPOGRAPHY },
      spacing: {
        blockPadding: 12,
        gridGap: 12,
      },
      grid: { ...DEFAULT_GRID_SYSTEM },
    },
    theme: { ...DEFAULT_PROJECT_THEME },
    pages: [],
    componentLibrary: {
      categories: [
        { id: 'base', name: 'Базовые', icon: 'square', order: 0 },
        { id: 'custom', name: 'Custom', icon: 'star', order: 1 },
      ],
      blocks: [],
    },
    assets: [],
    customLogic: {
      javascript: '',
      css: '',
      htmlOverride: '',
      handlers: [],
    },
    files: [],
    bindings: [],
    exportConfig: { ...DEFAULT_EXPORT_CONFIG },
  };
}

function createRecordFromProject(project: Project): StoredProjectRecord {
  return {
    id: project.meta.id,
    name: project.meta.name || DEFAULT_PROJECT_NAME,
    description: project.meta.description || '',
    createdAt: project.meta.createdAt,
    updatedAt: project.meta.updatedAt,
    version: project.meta.version,
    project,
  };
}

function createRecordFromMetadata(value: Record<string, unknown>): StoredProjectRecord | null {
  if (
    typeof value.id !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    typeof value.version !== 'string'
  ) {
    return null;
  }

  const meta = {
    id: value.id,
    name: normalizeText(value.name, DEFAULT_PROJECT_NAME),
    description: normalizeText(value.description),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    version: value.version,
  };

  return {
    ...meta,
    project: createPlaceholderProject(meta),
  };
}

function normalizeRecordLike(value: unknown): StoredProjectRecord | null {
  if (isStoredProjectRecord(value)) {
    return value;
  }

  if (isProjectLike(value)) {
    return createRecordFromProject(value);
  }

  if (!isPlainObject(value)) {
    return null;
  }

  if (isProjectLike(value.project)) {
    const record = createRecordFromProject(value.project);

    return {
      ...record,
      id: typeof value.id === 'string' ? value.id : record.id,
      name: typeof value.name === 'string' ? value.name : record.name,
      description:
        typeof value.description === 'string' ? value.description : record.description,
      createdAt:
        typeof value.createdAt === 'string' ? value.createdAt : record.createdAt,
      updatedAt:
        typeof value.updatedAt === 'string' ? value.updatedAt : record.updatedAt,
      version: typeof value.version === 'string' ? value.version : record.version,
    };
  }

  if (isProjectLike(value.record)) {
    return createRecordFromProject(value.record);
  }

  return createRecordFromMetadata(value);
}

function extractRecord(payload: unknown): StoredProjectRecord | null {
  const directRecord = normalizeRecordLike(payload);
  if (directRecord) return directRecord;

  if (!isPlainObject(payload)) return null;

  const nestedData = isPlainObject(payload.data) ? payload.data : null;

  return (
    normalizeRecordLike(payload.record) ||
    normalizeRecordLike(payload.item) ||
    normalizeRecordLike(payload.project) ||
    normalizeRecordLike(payload.data) ||
    normalizeRecordLike(nestedData?.record) ||
    normalizeRecordLike(nestedData?.item) ||
    normalizeRecordLike(nestedData?.project) ||
    normalizeRecordLike(nestedData)
  );
}

function extractRecords(payload: unknown): StoredProjectRecord[] {
  let source: unknown = [];

  if (Array.isArray(payload)) {
    source = payload;
  } else if (isPlainObject(payload)) {
    if (Array.isArray(payload.records)) {
      source = payload.records;
    } else if (Array.isArray(payload.items)) {
      source = payload.items;
    } else if (Array.isArray(payload.projects)) {
      source = payload.projects;
    } else if (Array.isArray(payload.data)) {
      source = payload.data;
    } else if (isPlainObject(payload.data)) {
      const nested = payload.data as Record<string, unknown>;
      source = nested.records || nested.items || nested.projects || [];
    }
  }

  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((item) => normalizeRecordLike(item))
    .filter((item): item is StoredProjectRecord => Boolean(item))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function readResponsePayload(response: Response): Promise<RemoteEnvelope | unknown> {
  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(rawText || `HTTP ${response.status}`);
  }

  if (!rawText.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawText) as RemoteEnvelope | unknown;
  } catch {
    return { data: rawText };
  }
}

function assertRemotePayload(payload: RemoteEnvelope | unknown): void {
  if (!isPlainObject(payload)) return;

  if (typeof payload.error === 'string' && payload.error.trim()) {
    throw new Error(payload.error);
  }

  if (payload.success === false) {
    throw new Error(
      typeof payload.message === 'string' && payload.message.trim()
        ? payload.message
        : 'Remote persistence request failed.'
    );
  }
}

async function requestRemote(
  action: string,
  method: 'GET' | 'POST',
  options?: {
    params?: Record<string, string>;
    body?: Record<string, unknown>;
  }
): Promise<RemoteEnvelope | unknown> {
  const url = createRequestUrl(action, options?.params);

  const requestBody =
    method === 'POST'
      ? JSON.stringify({
          action,
          ...(REMOTE_API_TOKEN ? { token: REMOTE_API_TOKEN } : {}),
          ...(options?.body || {}),
        })
      : undefined;

  try {
    const response = await fetch(url, {
      method,
      headers: createRequestHeaders(method),
      body: requestBody,
    });

    const payload = await readResponsePayload(response);
    assertRemotePayload(payload);

    return payload;
  } catch (error) {
    console.error(`Remote Projects API ${action} request failed`, error);
    throw error;
  }
}

export async function listStoredProjects(): Promise<StoredProjectRecord[]> {
  assertRemotePersistenceConfigured();
  const payload = await requestRemote('list', 'GET');
  return extractRecords(payload);
}

export async function getStoredProject(projectId: string): Promise<StoredProjectRecord | null> {
  assertRemotePersistenceConfigured();
  const payload = await requestRemote('get', 'GET', {
    params: { id: projectId },
  });

  return extractRecord(payload);
}

export async function saveStoredProject(
  project: Project,
  overrides?: { name?: string; description?: string }
): Promise<StoredProjectRecord> {
  assertRemotePersistenceConfigured();

  const payload = await requestRemote('save', 'POST', {
    body: {
      projectId: project.meta.id,
      name: overrides?.name ?? project.meta.name,
      description: overrides?.description ?? project.meta.description,
      version: project.meta.version,
      project,
    },
  });

  return (
    extractRecord(payload) ||
    (await getStoredProject(project.meta.id)) ||
    createRecordFromProject({
      ...project,
      meta: {
        ...project.meta,
        name: overrides?.name ?? project.meta.name,
        description: overrides?.description ?? project.meta.description,
      },
    })
  );
}

export async function renameStoredProject(
  projectId: string,
  updates: { name?: string; description?: string }
): Promise<StoredProjectRecord | null> {
  assertRemotePersistenceConfigured();

  const payload = await requestRemote('rename', 'POST', {
    body: {
      projectId,
      name: updates.name,
      description: updates.description,
    },
  });

  return extractRecord(payload) || (await getStoredProject(projectId));
}

export async function deleteStoredProject(projectId: string): Promise<void> {
  assertRemotePersistenceConfigured();

  await requestRemote('delete', 'POST', {
    body: {
      projectId,
    },
  });
}
