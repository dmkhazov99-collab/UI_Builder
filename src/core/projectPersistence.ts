/**
 * ============================================
 * MODULE: Project Storage Persistence
 * VERSION: 2.1.0
 * ROLE:
 * Локальный persistence-слой для сохранения и
 * чтения проектов UI Builder из browser localStorage.
 *
 * RESPONSIBILITIES:
 * - читать список сохраненных проектов
 * - валидировать и нормализовать storage records
 * - сохранять и обновлять project records
 * - удалять и получать проекты по id
 * - поддерживать responsive project model
 * - мягко переживать грязные и старые storage records
 *
 * DEPENDS ON:
 * - Project type
 * - project domain helpers
 * - window.localStorage
 *
 * USED BY:
 * - project management UI
 * - save/load flows
 * - project selection dialogs
 *
 * RULES:
 * - только persistence logic
 * - без UI-логики
 * - без runtime/export HTML logic
 * - localStorage считается внешней и потенциально грязной границей данных
 *
 * SECURITY:
 * - данные из localStorage не считаются полностью доверенными
 * - перед использованием records проходят минимальную shape-проверку
 * - ошибки чтения/записи не должны ломать builder UI
 * ============================================
 */

import type {
  Block,
  ColorSystem,
  ExportConfig,
  LibraryBlock,
  Page,
  Project,
  ProjectFile,
  ProjectTheme,
  Section,
} from '@/types/project';

import {
  DEFAULT_BLOCK_RUNTIME,
  DEFAULT_COLOR_SYSTEM,
  DEFAULT_EXPORT_CONFIG,
  DEFAULT_GRID_SYSTEM,
  DEFAULT_PROJECT_THEME,
  DEFAULT_TYPOGRAPHY,
  createDefaultContentEndpoint,
  createDefaultHeaderEndpoint,
  normalizeBlock,
  normalizeExportMode,
} from '@/types/project';

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
 * VERSION: 2.0.0
 * PURPOSE:
 * Константы browser persistence слоя.
 * ============================================
 */
const STORAGE_KEY = 'ui-builder-projects-v2';
const LEGACY_STORAGE_KEY = 'ui-builder-projects-v1';
const DEFAULT_PROJECT_NAME = 'Без названия';

/**
 * ============================================
 * BLOCK: Storage Guards And Simple Helpers
 * VERSION: 2.0.0
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

function normalizeText(value?: string): string {
  return (value ?? '').trim();
}

function resolveProjectName(value?: string): string {
  return normalizeText(value) || DEFAULT_PROJECT_NAME;
}

function createLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * ============================================
 * BLOCK: Default Shape Builders
 * VERSION: 2.0.0
 * PURPOSE:
 * Локальные fallback-структуры для грязных storage records.
 * ============================================
 */
function createDefaultFiles(): ProjectFile[] {
  return [
    {
      id: createLocalId(),
      name: 'Index.html',
      type: 'html',
      content: '',
      description: 'Основной HTML-файл проекта',
      isEntry: true,
    },
    {
      id: createLocalId(),
      name: 'Code.gs',
      type: 'gs',
      content: `function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index');
}
`,
      description: 'Главный Google Apps Script файл',
    },
  ];
}

function createFallbackSection(order = 0): Section {
  const title = 'Новая секция';

  return {
    id: createLocalId(),
    name: title,
    description: '',
    order,
    header: {
      id: createLocalId(),
      name: 'Header',
      description: 'Зона заголовка секции',
      title,
      endpoint: createDefaultHeaderEndpoint(title),
    },
    content: {
      id: createLocalId(),
      name: 'Content',
      description: 'Основное содержимое секции',
      blocks: [],
      endpoint: createDefaultContentEndpoint(),
    },
  };
}

function createFallbackPage(order = 0): Page {
  return {
    id: createLocalId(),
    name: 'Главная страница',
    order,
    sections: [createFallbackSection(0)],
  };
}

/**
 * ============================================
 * BLOCK: Block / Library Normalizers
 * VERSION: 2.0.0
 * PURPOSE:
 * Приведение старых и грязных block records к полному Block.
 * ============================================
 */
function normalizeStoredBlock(value?: Partial<Block>): Block {
  const normalized = normalizeBlock({
    ...(value || {}),
    id: value?.id || createLocalId(),
    runtime: value?.runtime || { ...DEFAULT_BLOCK_RUNTIME },
    content: {
      html: typeof value?.content?.html === 'string' ? value.content.html : '',
      text: typeof value?.content?.text === 'string' ? value.content.text : '',
      children: Array.isArray(value?.content?.children)
        ? value.content.children
        : undefined,
    },
  });

  return normalized as Block;
}

function normalizeStoredLibraryBlock(value: Partial<LibraryBlock>): LibraryBlock {
  return {
    id: value.id || createLocalId(),
    categoryId: 'custom',
    name: resolveProjectName(value.name),
    description: typeof value.description === 'string' ? value.description : '',
    preview: typeof value.preview === 'string' ? value.preview : '',
    block: normalizeStoredBlock((value.block || {}) as Partial<Block>),
  };
}

/**
 * ============================================
 * BLOCK: Deep Project Normalization
 * VERSION: 2.1.0
 * PURPOSE:
 * Минимальная нормализация project shape для persistence boundary.
 *
 * NOTES:
 * Это не UI/store логика.
 * Цель — вернуть безопасный и консистентный Project из localStorage.
 * ============================================
 */
function normalizeTheme(theme?: ProjectTheme): ProjectTheme {
  return {
    dark: { ...(theme?.dark || {}) },
    light: {
      ...(DEFAULT_PROJECT_THEME.light || {}),
      ...(theme?.light || {}),
    },
  };
}

function normalizeExportConfig(exportConfig?: Partial<ExportConfig>): ExportConfig {
  return {
    ...DEFAULT_EXPORT_CONFIG,
    ...(exportConfig || {}),
    mode: normalizeExportMode(exportConfig?.mode),
  };
}

function normalizeColors(colors?: Partial<ColorSystem>): ColorSystem {
  return {
    ...DEFAULT_COLOR_SYSTEM,
    ...(colors || {}),
  };
}

function normalizeFiles(files?: ProjectFile[]): ProjectFile[] {
  const source = Array.isArray(files) && files.length > 0 ? files : createDefaultFiles();

  return source.map((file, index) => ({
    id: file.id || createLocalId(),
    name:
      normalizeText(file.name) ||
      (file.type === 'gs' ? `Script${index + 1}.gs` : `Html${index + 1}.html`),
    type: file.type === 'gs' ? 'gs' : 'html',
    content: typeof file.content === 'string' ? file.content : '',
    description: typeof file.description === 'string' ? file.description : '',
    isEntry: Boolean(file.isEntry) || index === 0,
  }));
}

function normalizePages(pages?: Page[]): Page[] {
  const source = Array.isArray(pages) && pages.length > 0 ? pages : [createFallbackPage(0)];

  return source.map((page, pageIndex): Page => {
    const sections: Section[] =
      Array.isArray(page.sections) && page.sections.length > 0
        ? page.sections.map((section, sectionIndex): Section => {
            const safeTitle =
              normalizeText(section.header?.title) ||
              normalizeText(section.name) ||
              'Новая секция';

            const blocks: Block[] = Array.isArray(section.content?.blocks)
              ? section.content.blocks.map((block) =>
                  normalizeStoredBlock(block as Partial<Block>)
                )
              : [];

            return {
              id: section.id || createLocalId(),
              name: normalizeText(section.name) || safeTitle,
              description:
                typeof section.description === 'string' ? section.description : '',
              order: sectionIndex,
              header: {
                id: section.header?.id || createLocalId(),
                name: normalizeText(section.header?.name) || 'Header',
                description:
                  typeof section.header?.description === 'string'
                    ? section.header.description
                    : 'Зона заголовка секции',
                title: safeTitle,
                endpoint:
                  section.header?.endpoint || createDefaultHeaderEndpoint(safeTitle),
              },
              content: {
                id: section.content?.id || createLocalId(),
                name: normalizeText(section.content?.name) || 'Content',
                description:
                  typeof section.content?.description === 'string'
                    ? section.content.description
                    : 'Основное содержимое секции',
                blocks,
                endpoint:
                  section.content?.endpoint || createDefaultContentEndpoint(),
              },
            };
          })
        : [createFallbackSection(0)];

    return {
      id: page.id || createLocalId(),
      name: normalizeText(page.name) || `Страница ${pageIndex + 1}`,
      order: pageIndex,
      sections,
    };
  });
}

function normalizeProjectForStorage(project: Project): Project {
  const now = new Date().toISOString();

  const categories =
    Array.isArray(project.componentLibrary?.categories) &&
    project.componentLibrary.categories.length > 0
      ? project.componentLibrary.categories
      : [
          { id: 'base', name: 'Базовые', icon: 'square', order: 0 },
          { id: 'custom', name: 'Custom', icon: 'star', order: 1 },
        ];

  const libraryBlocks: LibraryBlock[] = Array.isArray(project.componentLibrary?.blocks)
    ? project.componentLibrary.blocks.map((libraryBlock) =>
        normalizeStoredLibraryBlock(libraryBlock)
      )
    : [];

  return {
    ...project,
    meta: {
      id: project.meta?.id || createLocalId(),
      name: resolveProjectName(project.meta?.name),
      description: normalizeText(project.meta?.description),
      createdAt: project.meta?.createdAt || now,
      updatedAt: project.meta?.updatedAt || now,
      version: project.meta?.version || '2.0.0',
    },
    designSystem: {
      colors: normalizeColors(project.designSystem?.colors),
      typography: {
        h1: {
          ...DEFAULT_TYPOGRAPHY.h1,
          ...(project.designSystem?.typography?.h1 || {}),
        },
        h2: {
          ...DEFAULT_TYPOGRAPHY.h2,
          ...(project.designSystem?.typography?.h2 || {}),
        },
        h3: {
          ...DEFAULT_TYPOGRAPHY.h3,
          ...(project.designSystem?.typography?.h3 || {}),
        },
        textBase: {
          ...DEFAULT_TYPOGRAPHY.textBase,
          ...(project.designSystem?.typography?.textBase || {}),
        },
        textSmall: {
          ...DEFAULT_TYPOGRAPHY.textSmall,
          ...(project.designSystem?.typography?.textSmall || {}),
        },
      },
      spacing: {
        blockPadding: project.designSystem?.spacing?.blockPadding ?? 12,
        gridGap: project.designSystem?.spacing?.gridGap ?? 12,
      },
      grid: {
        ...DEFAULT_GRID_SYSTEM,
        ...(project.designSystem?.grid || {}),
      },
    },
    theme: normalizeTheme(project.theme),
    pages: normalizePages(project.pages),
    componentLibrary: {
      categories,
      blocks: libraryBlocks,
    },
    assets: Array.isArray(project.assets) ? project.assets : [],
    customLogic: {
      javascript: project.customLogic?.javascript || '',
      css: project.customLogic?.css || '',
      htmlOverride: project.customLogic?.htmlOverride || '',
      handlers: Array.isArray(project.customLogic?.handlers)
        ? project.customLogic.handlers
        : [],
    },
    files: normalizeFiles(project.files),
    bindings: Array.isArray(project.bindings) ? project.bindings : [],
    exportConfig: normalizeExportConfig(project.exportConfig),
  };
}

function normalizeStoredProjectRecord(record: StoredProjectRecord): StoredProjectRecord {
  const normalizedProject = normalizeProjectForStorage(record.project);

  return {
    id: normalizedProject.meta.id,
    name: resolveProjectName(record.name || normalizedProject.meta.name),
    description: normalizeText(
      record.description || normalizedProject.meta.description
    ),
    createdAt: record.createdAt || normalizedProject.meta.createdAt,
    updatedAt: record.updatedAt || normalizedProject.meta.updatedAt,
    version: record.version || normalizedProject.meta.version,
    project: {
      ...normalizedProject,
      meta: {
        ...normalizedProject.meta,
        name: resolveProjectName(record.name || normalizedProject.meta.name),
        description: normalizeText(
          record.description || normalizedProject.meta.description
        ),
        createdAt: record.createdAt || normalizedProject.meta.createdAt,
        updatedAt: record.updatedAt || normalizedProject.meta.updatedAt,
        version: record.version || normalizedProject.meta.version,
      },
    },
  };
}

/**
 * ============================================
 * BLOCK: Internal Storage IO
 * VERSION: 2.0.0
 * PURPOSE:
 * Безопасное чтение и запись массива project records
 * из browser localStorage.
 * ============================================
 */
function readStorageKey(key: string): StoredProjectRecord[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isStoredProjectRecord)
      .map((record) => normalizeStoredProjectRecord(record));
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore cleanup failures to keep UI stable.
    }

    return [];
  }
}

function readAll(): StoredProjectRecord[] {
  const currentRecords = readStorageKey(STORAGE_KEY);

  if (currentRecords.length > 0) {
    return currentRecords;
  }

  const legacyRecords = readStorageKey(LEGACY_STORAGE_KEY);

  if (legacyRecords.length > 0) {
    writeAll(legacyRecords);

    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Ignore cleanup failures.
    }
  }

  return legacyRecords;
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
 * VERSION: 2.0.0
 * PURPOSE:
 * Сборка новых и обновленных persistence records
 * без неявной мутации исходных объектов.
 * ============================================
 */
function createStoredProjectRecord(
  project: Project,
  overrides?: StoredProjectTextUpdates
): StoredProjectRecord {
  const now = new Date().toISOString();
  const name = resolveProjectName(overrides?.name ?? project.meta.name);
  const description = normalizeText(overrides?.description ?? project.meta.description);

  const nextProject = normalizeProjectForStorage({
    ...project,
    meta: {
      ...project.meta,
      name,
      description,
      createdAt: project.meta.createdAt || now,
      updatedAt: now,
    },
  });

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
  updates: StoredProjectTextUpdates
): StoredProjectRecord {
  const now = new Date().toISOString();
  const name = resolveProjectName(updates.name ?? record.name);
  const description = normalizeText(updates.description ?? record.description);

  const nextProject = normalizeProjectForStorage({
    ...record.project,
    meta: {
      ...record.project.meta,
      name,
      description,
      updatedAt: now,
    },
  });

  return {
    ...record,
    id: nextProject.meta.id,
    name,
    description,
    updatedAt: now,
    version: nextProject.meta.version,
    project: nextProject,
  };
}

/**
 * ============================================
 * BLOCK: Public API
 * VERSION: 2.0.0
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
  updates: StoredProjectTextUpdates
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
  overrides?: StoredProjectTextUpdates
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