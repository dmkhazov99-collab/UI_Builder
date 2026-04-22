import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

import type {
  Block,
  BlockLayout,
  BlockScreenOverride,
  BlockType,
  ContentIsolator,
  DesignSystem,
  ExportConfig,
  HeaderIsolator,
  Page,
  Project,
  ProjectFile,
  ProjectTheme,
  RowSpanValue,
  Section,
  SelectedElement,
  SpanValue,
  ViewMode,
} from '@/types/project';

import {
  DEFAULT_BLOCK_RUNTIME,
  DEFAULT_COLOR_SYSTEM,
  DEFAULT_EXPORT_CONFIG,
  DEFAULT_GRID_SYSTEM,
  DEFAULT_PROJECT_THEME,
  DEFAULT_TYPOGRAPHY,
  VIEW_MODES,
  createDefaultContentEndpoint,
  createDefaultHeaderEndpoint,
  normalizeBlock,
  normalizeBlockResponsiveConfig,
  normalizeExportMode,
  normalizeRowSpan,
  normalizeSpan,
  normalizeViewMode,
  resolveBlockViewState,
} from '@/types/project';

// ============================================
// HELPERS: DEFAULT FACTORIES
// ============================================

const createDefaultProjectFiles = (): ProjectFile[] => [
  {
    id: uuidv4(),
    name: 'Index.html',
    type: 'html',
    content: '',
    description: 'Основной HTML-файл проекта',
    isEntry: true,
  },
  {
    id: uuidv4(),
    name: 'Code.gs',
    type: 'gs',
    content: `function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index');
}
`,
    description: 'Главный Google Apps Script файл',
  },
];

const createDefaultComponentLibrary = () => ({
  categories: [
    { id: 'base', name: 'Базовые', icon: 'square', order: 0 },
    { id: 'custom', name: 'Custom', icon: 'star', order: 1 },
  ],
  blocks: [],
});

const createNewSection = (order = 0): Section => ({
  id: uuidv4(),
  name: 'Новая секция',
  description: '',
  order,
  header: {
    id: uuidv4(),
    name: 'Header',
    description: 'Зона заголовка секции',
    title: 'Новая секция',
    endpoint: createDefaultHeaderEndpoint('Новая секция'),
  },
  content: {
    id: uuidv4(),
    name: 'Content',
    description: 'Основное содержимое секции',
    blocks: [],
    endpoint: createDefaultContentEndpoint(),
  },
});

const createNewPage = (order = 0): Page => ({
  id: uuidv4(),
  name: 'Главная страница',
  order,
  sections: [createNewSection(0)],
});

// ============================================
// HELPERS: BLOCK TEMPLATES
// ============================================

const BLOCK_TEMPLATE_CONFIG: Record<
  BlockType,
  {
    name: string;
    html: string;
    text: string;
  }
> = {
  'block-info': {
    name: 'Блок',
    html: '<div class="h3">Новый блок</div><div class="text-small">Описание блока</div>',
    text: 'Новый блок',
  },
  'block-button': {
    name: 'Кнопка',
    html: '<div class="text-base">Кнопка</div>',
    text: 'Кнопка',
  },
  'block-placeholder': {
    name: 'Заглушка',
    html: '',
    text: '',
  },
};

function createBlockLayout(span: SpanValue, rowSpan: RowSpanValue): BlockLayout {
  return {
    x: 1,
    y: 1,
    w: span,
    h: rowSpan,
  };
}

export const createNewBlock = (
  type: BlockType = 'block-info',
  span: SpanValue = 2,
  rowSpan: RowSpanValue = 3
): Block => {
  const template = BLOCK_TEMPLATE_CONFIG[type];
  const normalizedSpan = normalizeSpan(span);
  const normalizedRowSpan = normalizeRowSpan(rowSpan);

  return normalizeBlock({
    id: uuidv4(),
    name: template.name,
    description: '',
    type,
    span: normalizedSpan,
    rowSpan: normalizedRowSpan,
    mode: 'clip',
    visible: true,
    layout: createBlockLayout(normalizedSpan, normalizedRowSpan),
    runtime: { ...DEFAULT_BLOCK_RUNTIME },
    content: {
      html: template.html,
      text: template.text,
    },
    responsive: undefined,
  });
};

function cloneBlockResponsive(block: Block): Block['responsive'] {
  if (!block.responsive) return undefined;

  const clonedResponsive: NonNullable<Block['responsive']> = {};

  VIEW_MODES.forEach((viewMode) => {
    const screen = block.responsive?.[viewMode];
    if (!screen) return;

    clonedResponsive[viewMode] = {
      ...screen,
      layout: screen.layout ? { ...screen.layout } : undefined,
    };
  });

  return normalizeBlockResponsiveConfig(clonedResponsive);
}

export const cloneBlockForCanvas = (block: Block): Block =>
  normalizeBlock({
    ...block,
    id: uuidv4(),
    layout: block.layout ? { ...block.layout } : undefined,
    runtime: block.runtime ? { ...block.runtime } : { ...DEFAULT_BLOCK_RUNTIME },
    responsive: cloneBlockResponsive(block),
    content: {
      ...block.content,
      children: block.content.children ? [...block.content.children] : undefined,
    },
    bindings: block.bindings ? [...block.bindings] : undefined,
    customClasses: block.customClasses ? [...block.customClasses] : undefined,
    customAttributes: block.customAttributes ? { ...block.customAttributes } : undefined,
  });

export const cloneSectionForCanvas = (section: Section, order: number): Section => ({
  ...section,
  id: uuidv4(),
  name: `${section.name} копия`,
  order,
  header: {
    ...section.header,
    id: uuidv4(),
    endpoint: section.header.endpoint
      ? { ...section.header.endpoint }
      : createDefaultHeaderEndpoint(section.header.title),
  },
  content: {
    ...section.content,
    id: uuidv4(),
    blocks: section.content.blocks.map((block) => cloneBlockForCanvas(block)),
    endpoint: section.content.endpoint
      ? { ...section.content.endpoint }
      : createDefaultContentEndpoint(),
  },
});

// ============================================
// HELPERS: PROJECT NORMALIZATION
// ============================================

function cloneProjectForHistory(project: Project): Project {
  return JSON.parse(JSON.stringify(project)) as Project;
}

const reindexPages = (pages: Page[]): Page[] =>
  pages.map((page, index) => ({
    ...page,
    order: index,
  }));

const reindexSections = (sections: Section[]): Section[] =>
  sections.map((section, index) => ({
    ...section,
    order: index,
  }));

function normalizeTheme(theme?: ProjectTheme): ProjectTheme {
  return {
    dark: { ...(theme?.dark || {}) },
    light: {
      ...(DEFAULT_PROJECT_THEME.light || {}),
      ...(theme?.light || {}),
    },
  };
}

function normalizeFiles(files?: Project['files']): Project['files'] {
  const source = files?.length ? files : createDefaultProjectFiles();

  return source.map((file, index) => ({
    id: file.id || uuidv4(),
    name:
      file.name ||
      (file.type === 'gs' ? `File${index + 1}.gs` : `File${index + 1}.html`),
    type: file.type === 'gs' ? 'gs' : 'html',
    content: typeof file.content === 'string' ? file.content : '',
    description: file.description || '',
    isEntry: Boolean(file.isEntry) || index === 0,
  }));
}

function mergeTypographySystem(
  current: DesignSystem['typography'],
  updates?: Partial<DesignSystem['typography']>
): DesignSystem['typography'] {
  if (!updates) return current;

  return {
    h1: { ...current.h1, ...(updates.h1 || {}) },
    h2: { ...current.h2, ...(updates.h2 || {}) },
    h3: { ...current.h3, ...(updates.h3 || {}) },
    textBase: { ...current.textBase, ...(updates.textBase || {}) },
    textSmall: { ...current.textSmall, ...(updates.textSmall || {}) },
  };
}

function normalizeDesignSystem(designSystem?: Project['designSystem']): Project['designSystem'] {
  const source = designSystem || {
    colors: DEFAULT_COLOR_SYSTEM,
    typography: DEFAULT_TYPOGRAPHY,
    spacing: { blockPadding: 12, gridGap: 12 },
    grid: DEFAULT_GRID_SYSTEM,
  };

  return {
    colors: {
      ...DEFAULT_COLOR_SYSTEM,
      ...(source.colors || {}),
    },
    typography: mergeTypographySystem(DEFAULT_TYPOGRAPHY, source.typography || {}),
    spacing: {
      blockPadding: source.spacing?.blockPadding ?? 12,
      gridGap: source.spacing?.gridGap ?? 12,
    },
    grid: {
      ...DEFAULT_GRID_SYSTEM,
      ...(source.grid || {}),
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

function normalizeProject(project: Project): Project {
  const normalizedPages =
    project.pages?.length > 0
      ? reindexPages(
          project.pages.map((page) => ({
            ...page,
            name: page.name || 'Страница',
            sections: reindexSections(
              (page.sections || []).map((section) => ({
                ...section,
                name: section.name || section.header?.title || 'Секция',
                description: section.description || '',
                header: {
                  ...section.header,
                  id: section.header?.id || uuidv4(),
                  name: section.header?.name || 'Header',
                  description: section.header?.description || 'Зона заголовка секции',
                  title: section.header?.title || 'Новая секция',
                  endpoint:
                    section.header?.endpoint ||
                    createDefaultHeaderEndpoint(section.header?.title || 'Новая секция'),
                },
                content: {
                  ...section.content,
                  id: section.content?.id || uuidv4(),
                  name: section.content?.name || 'Content',
                  description:
                    section.content?.description || 'Основное содержимое секции',
                  endpoint:
                    section.content?.endpoint || createDefaultContentEndpoint(),
                  blocks: (section.content?.blocks || []).map((block) =>
                    normalizeBlock(block)
                  ),
                },
              }))
            ),
          }))
        )
      : [createNewPage(0)];

  const normalizedLibraryBlocks = (project.componentLibrary?.blocks || []).map(
    (libraryBlock) => ({
      ...libraryBlock,
      categoryId: 'custom' as const,
      preview: libraryBlock.preview || '',
      block: normalizeBlock(libraryBlock.block),
    })
  );

  return {
    ...project,
    meta: {
      ...project.meta,
      id: project.meta?.id || uuidv4(),
      name: project.meta?.name || 'Новый проект',
      description: project.meta?.description || '',
      createdAt: project.meta?.createdAt || new Date().toISOString(),
      updatedAt: project.meta?.updatedAt || new Date().toISOString(),
      version: project.meta?.version || '2.0.0',
    },
    designSystem: normalizeDesignSystem(project.designSystem),
    theme: normalizeTheme(project.theme),
    componentLibrary: {
      categories:
        project.componentLibrary?.categories?.length > 0
          ? project.componentLibrary.categories
          : createDefaultComponentLibrary().categories,
      blocks: normalizedLibraryBlocks,
    },
    customLogic: {
      javascript: project.customLogic?.javascript || '',
      css: project.customLogic?.css || '',
      htmlOverride: project.customLogic?.htmlOverride || '',
      handlers: project.customLogic?.handlers || [],
    },
    files: normalizeFiles(project.files),
    pages: normalizedPages,
    assets: project.assets || [],
    bindings: project.bindings || [],
    exportConfig: normalizeExportConfig(project.exportConfig),
  };
}

const touchProject = (project: Project): Project => ({
  ...project,
  meta: {
    ...project.meta,
    updatedAt: new Date().toISOString(),
  },
});

// ============================================
// СОЗДАНИЕ НОВОГО ПРОЕКТА
// ============================================

export const createNewProject = (): Project =>
  normalizeProject({
    meta: {
      id: uuidv4(),
      name: 'Новый проект',
      description: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '2.0.0',
    },
    designSystem: {
      colors: DEFAULT_COLOR_SYSTEM,
      typography: DEFAULT_TYPOGRAPHY,
      spacing: { blockPadding: 12, gridGap: 12 },
      grid: DEFAULT_GRID_SYSTEM,
    },
    theme: {
      ...DEFAULT_PROJECT_THEME,
    },
    pages: [createNewPage(0)],
    componentLibrary: createDefaultComponentLibrary(),
    assets: [],
    customLogic: {
      javascript: '',
      css: '',
      htmlOverride: '',
      handlers: [],
    },
    files: createDefaultProjectFiles(),
    bindings: [],
    exportConfig: {
      ...DEFAULT_EXPORT_CONFIG,
    },
  });

// ============================================
// ИНТЕРФЕЙС СОСТОЯНИЯ
// ============================================

interface ProjectState {
  project: Project;
  lastSavedSnapshot: string;
  selectedElement: SelectedElement | null;
  hoveredElement: string | null;
  mode: 'edit' | 'preview' | 'code';
  viewMode: ViewMode;
  showGrid: boolean;
  undoStack: Project[];
  redoStack: Project[];
  activePanel: 'library' | 'properties' | 'code' | 'assets';
  codeTab: 'javascript' | 'css' | 'generated' | 'html' | 'appsScript';
}

export const captureProjectSnapshot = (project: Project): string =>
  JSON.stringify({
    ...project,
    meta: {
      ...project.meta,
      updatedAt: '',
    },
  });

interface ProjectActions {
  // Проект
  setProject: (project: Project) => void;
  markProjectSaved: (project?: Project) => void;
  updateMeta: (updates: Partial<Project['meta']>) => void;
  updateProjectMeta: (updates: Partial<Project['meta']>) => void;
  updateProjectCustomLogic: (updates: Partial<Project['customLogic']>) => void;
  updateProjectDesignSystem: (updates: Partial<Project['designSystem']>) => void;
  updateProjectTheme: (
    themeMode: keyof ProjectTheme,
    updates: Partial<Project['designSystem']['colors']>
  ) => void;
  updateProjectExportConfig: (updates: Partial<Project['exportConfig']>) => void;

  // Страницы
  addPage: () => void;
  removePage: (pageId: string) => void;
  updatePage: (pageId: string, updates: Partial<Page>) => void;

  // Секции
  addSection: (pageId: string) => void;
  removeSection: (pageId: string, sectionId: string) => void;
  duplicateSection: (pageId: string, sectionId: string) => void;
  updateSection: (pageId: string, sectionId: string, updates: Partial<Section>) => void;
  moveSection: (pageId: string, sectionId: string, direction: 'up' | 'down') => void;

  // Заголовки и контент
  updateHeader: (pageId: string, sectionId: string, updates: Partial<HeaderIsolator>) => void;
  updateContent: (pageId: string, sectionId: string, updates: Partial<ContentIsolator>) => void;

  // Блоки
  addBlock: (pageId: string, sectionId: string, block: Block) => void;
  removeBlock: (pageId: string, sectionId: string, blockId: string) => void;
  updateBlock: (
    pageId: string,
    sectionId: string,
    blockId: string,
    updates: Partial<Block>
  ) => void;
  updateBlockScreen: (
    pageId: string,
    sectionId: string,
    blockId: string,
    viewMode: ViewMode,
    updates: Partial<BlockScreenOverride>
  ) => void;
  resetBlockScreen: (
    pageId: string,
    sectionId: string,
    blockId: string,
    viewMode: ViewMode
  ) => void;
  moveBlock: (
    pageId: string,
    sectionId: string,
    blockId: string,
    direction: 'up' | 'down' | 'left' | 'right'
  ) => void;
  duplicateBlock: (pageId: string, sectionId: string, blockId: string) => void;
  saveBlockToCustomLibrary: (pageId: string, sectionId: string, blockId: string) => void;
  removeCustomLibraryBlock: (libraryBlockId: string) => void;

  // Выделение
  selectElement: (element: SelectedElement | null) => void;
  setHoveredElement: (id: string | null) => void;

  // Режимы
  setMode: (mode: 'edit' | 'preview' | 'code') => void;
  setViewMode: (mode: ViewMode) => void;
  toggleGrid: () => void;

  // Панели
  setActivePanel: (panel: 'library' | 'properties' | 'code' | 'assets') => void;
  setCodeTab: (tab: 'javascript' | 'css' | 'generated' | 'html' | 'appsScript') => void;
  addProjectFile: (type: 'html' | 'gs') => void;
  updateProjectFile: (
    fileId: string,
    updates: { name?: string; content?: string; description?: string }
  ) => void;
  removeProjectFile: (fileId: string) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  pushUndo: () => void;

  // Логика
  updateCustomLogic: (updates: Partial<Project['customLogic']>) => void;

  // Сброс
  resetProject: () => void;
}

const initialProject = createNewProject();

// ============================================
// STORE
// ============================================

export const useProjectStore = create<ProjectState & ProjectActions>((set) => {
  const pushUndoSnapshot = () =>
    set((state) => ({
      undoStack: [...state.undoStack.slice(-19), cloneProjectForHistory(state.project)],
      redoStack: [],
    }));

  const applyProjectUpdate = (updater: (project: Project) => Project) =>
    set((state) => ({
      project: touchProject(normalizeProject(updater(state.project))),
    }));

  const applyMetaUpdates = (updates: Partial<Project['meta']>) => {
    pushUndoSnapshot();

    set((state) => ({
      project: touchProject(
        normalizeProject({
          ...state.project,
          meta: {
            ...state.project.meta,
            ...updates,
          },
        })
      ),
    }));
  };

  const applyCustomLogicUpdates = (updates: Partial<Project['customLogic']>) => {
    pushUndoSnapshot();

    set((state) => ({
      project: touchProject(
        normalizeProject({
          ...state.project,
          customLogic: {
            ...state.project.customLogic,
            ...updates,
          },
        })
      ),
    }));
  };

  const applyDesignSystemUpdates = (updates: Partial<Project['designSystem']>) => {
    pushUndoSnapshot();

    set((state) => ({
      project: touchProject(
        normalizeProject({
          ...state.project,
          designSystem: {
            ...state.project.designSystem,
            ...updates,
            colors: {
              ...state.project.designSystem.colors,
              ...(updates.colors || {}),
            },
            typography: mergeTypographySystem(
              state.project.designSystem.typography,
              updates.typography || {}
            ),
            spacing: {
              ...state.project.designSystem.spacing,
              ...(updates.spacing || {}),
            },
            grid: {
              ...state.project.designSystem.grid,
              ...(updates.grid || {}),
            },
          },
        })
      ),
    }));
  };

  const applyThemeUpdates = (
    themeMode: keyof ProjectTheme,
    updates: Partial<Project['designSystem']['colors']>
  ) => {
    pushUndoSnapshot();

    set((state) => ({
      project: touchProject(
        normalizeProject({
          ...state.project,
          theme: {
            ...normalizeTheme(state.project.theme),
            [themeMode]: {
              ...(normalizeTheme(state.project.theme)[themeMode] || {}),
              ...updates,
            },
          },
        })
      ),
    }));
  };

  const applyExportConfigUpdates = (updates: Partial<Project['exportConfig']>) => {
    pushUndoSnapshot();

    set((state) => ({
      project: touchProject(
        normalizeProject({
          ...state.project,
          exportConfig: {
            ...state.project.exportConfig,
            ...updates,
          },
        })
      ),
    }));
  };

  return {
    // Начальное состояние
    project: initialProject,
    lastSavedSnapshot: captureProjectSnapshot(initialProject),
    selectedElement: null,
    hoveredElement: null,
    mode: 'edit',
    viewMode: 'desktop',
    showGrid: true,
    undoStack: [],
    redoStack: [],
    activePanel: 'library',
    codeTab: 'javascript',

    // ==========================================
    // ПРОЕКТ
    // ==========================================

    setProject: (project) => {
      const normalized = normalizeProject(project);

      set({
        project: normalized,
        selectedElement: null,
        hoveredElement: null,
        undoStack: [],
        redoStack: [],
        lastSavedSnapshot: captureProjectSnapshot(normalized),
      });
    },

    markProjectSaved: (project) =>
      set((state) => ({
        lastSavedSnapshot: captureProjectSnapshot(project ?? state.project),
      })),

    updateMeta: applyMetaUpdates,
    updateProjectMeta: applyMetaUpdates,
    updateProjectCustomLogic: applyCustomLogicUpdates,
    updateProjectDesignSystem: applyDesignSystemUpdates,
    updateProjectTheme: applyThemeUpdates,
    updateProjectExportConfig: applyExportConfigUpdates,

    // ==========================================
    // СТРАНИЦЫ
    // ==========================================

    addPage: () => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => ({
        ...project,
        pages: reindexPages([...project.pages, createNewPage(project.pages.length)]),
      }));
    },

    removePage: (pageId) => {
      pushUndoSnapshot();

      set((state) => ({
        project: touchProject(
          normalizeProject({
            ...state.project,
            pages: reindexPages(state.project.pages.filter((page) => page.id !== pageId)),
          })
        ),
        selectedElement:
          state.selectedElement?.id === pageId ? null : state.selectedElement,
      }));
    },

    updatePage: (pageId, updates) => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => ({
        ...project,
        pages: project.pages.map((page) =>
          page.id === pageId ? { ...page, ...updates } : page
        ),
      }));
    },

    // ==========================================
    // СЕКЦИИ
    // ==========================================

    addSection: (pageId) => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => ({
        ...project,
        pages: project.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                sections: reindexSections([
                  ...page.sections,
                  createNewSection(page.sections.length),
                ]),
              }
            : page
        ),
      }));
    },

    removeSection: (pageId, sectionId) => {
      pushUndoSnapshot();

      set((state) => ({
        project: touchProject(
          normalizeProject({
            ...state.project,
            pages: state.project.pages.map((page) =>
              page.id === pageId
                ? {
                    ...page,
                    sections: reindexSections(
                      page.sections.filter((section) => section.id !== sectionId)
                    ),
                  }
                : page
            ),
          })
        ),
        selectedElement:
          state.selectedElement &&
          (state.selectedElement.id === sectionId ||
            state.selectedElement.parentId === sectionId)
            ? null
            : state.selectedElement,
      }));
    },

    duplicateSection: (pageId, sectionId) => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => {
        const page = project.pages.find((item) => item.id === pageId);
        const section = page?.sections.find((item) => item.id === sectionId);

        if (!page || !section) return project;

        const duplicatedSection = cloneSectionForCanvas(section, page.sections.length);

        return {
          ...project,
          pages: project.pages.map((pageItem) =>
            pageItem.id === pageId
              ? {
                  ...pageItem,
                  sections: reindexSections([
                    ...pageItem.sections,
                    duplicatedSection,
                  ]),
                }
              : pageItem
          ),
        };
      });
    },

    updateSection: (pageId, sectionId, updates) => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => ({
        ...project,
        pages: project.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                sections: page.sections.map((section) =>
                  section.id === sectionId ? { ...section, ...updates } : section
                ),
              }
            : page
        ),
      }));
    },

    moveSection: (pageId, sectionId, direction) => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => {
        const page = project.pages.find((item) => item.id === pageId);
        if (!page) return project;

        const sections = [...page.sections];
        const index = sections.findIndex((section) => section.id === sectionId);
        if (index === -1) return project;

        const nextIndex = direction === 'up' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= sections.length) return project;

        [sections[index], sections[nextIndex]] = [sections[nextIndex], sections[index]];

        return {
          ...project,
          pages: project.pages.map((pageItem) =>
            pageItem.id === pageId
              ? { ...pageItem, sections: reindexSections(sections) }
              : pageItem
          ),
        };
      });
    },

    // ==========================================
    // ЗАГОЛОВКИ И КОНТЕНТ
    // ==========================================

    updateHeader: (pageId, sectionId, updates) => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => ({
        ...project,
        pages: project.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                sections: page.sections.map((section) =>
                  section.id === sectionId
                    ? {
                        ...section,
                        name:
                          typeof updates.title === 'string'
                            ? updates.title || section.name
                            : section.name,
                        header: {
                          ...section.header,
                          ...updates,
                          endpoint: {
                            ...(section.header.endpoint ||
                              createDefaultHeaderEndpoint(section.header.title)),
                            ...(updates.endpoint || {}),
                          },
                        },
                      }
                    : section
                ),
              }
            : page
        ),
      }));
    },

    updateContent: (pageId, sectionId, updates) => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => ({
        ...project,
        pages: project.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                sections: page.sections.map((section) =>
                  section.id === sectionId
                    ? {
                        ...section,
                        content: {
                          ...section.content,
                          ...updates,
                          endpoint: {
                            ...(section.content.endpoint ||
                              createDefaultContentEndpoint()),
                            ...(updates.endpoint || {}),
                          },
                        },
                      }
                    : section
                ),
              }
            : page
        ),
      }));
    },

    // ==========================================
    // БЛОКИ
    // ==========================================

    addBlock: (pageId, sectionId, block) => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => ({
        ...project,
        pages: project.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                sections: page.sections.map((section) =>
                  section.id === sectionId
                    ? {
                        ...section,
                        content: {
                          ...section.content,
                          blocks: [...section.content.blocks, normalizeBlock(block)],
                        },
                      }
                    : section
                ),
              }
            : page
        ),
      }));
    },

    removeBlock: (pageId, sectionId, blockId) => {
      pushUndoSnapshot();

      set((state) => ({
        project: touchProject(
          normalizeProject({
            ...state.project,
            pages: state.project.pages.map((page) =>
              page.id === pageId
                ? {
                    ...page,
                    sections: page.sections.map((section) =>
                      section.id === sectionId
                        ? {
                            ...section,
                            content: {
                              ...section.content,
                              blocks: section.content.blocks.filter(
                                (block) => block.id !== blockId
                              ),
                            },
                          }
                        : section
                    ),
                  }
                : page
            ),
          })
        ),
        selectedElement:
          state.selectedElement?.id === blockId ? null : state.selectedElement,
      }));
    },

    updateBlock: (pageId, sectionId, blockId, updates) => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => ({
        ...project,
        pages: project.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                sections: page.sections.map((section) =>
                  section.id === sectionId
                    ? {
                        ...section,
                        content: {
                          ...section.content,
                          blocks: section.content.blocks.map((block) =>
                            block.id === blockId
                              ? normalizeBlock({ ...block, ...updates })
                              : normalizeBlock(block)
                          ),
                        },
                      }
                    : section
                ),
              }
            : page
        ),
      }));
    },

    updateBlockScreen: (pageId, sectionId, blockId, viewMode, updates) => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => ({
        ...project,
        pages: project.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                sections: page.sections.map((section) =>
                  section.id === sectionId
                    ? {
                        ...section,
                        content: {
                          ...section.content,
                          blocks: section.content.blocks.map((block) => {
                            if (block.id !== blockId) {
                              return normalizeBlock(block);
                            }

                            const currentOverride = block.responsive?.[viewMode] || {};
                            const nextOverride: BlockScreenOverride = {
                              ...currentOverride,
                              ...updates,
                              layout: {
                                ...(currentOverride.layout || {}),
                                ...(updates.layout || {}),
                              },
                            };

                            const nextResponsive = {
                              ...(block.responsive || {}),
                              [viewMode]: nextOverride,
                            };

                            return normalizeBlock({
                              ...block,
                              responsive: nextResponsive,
                            });
                          }),
                        },
                      }
                    : section
                ),
              }
            : page
        ),
      }));
    },

    resetBlockScreen: (pageId, sectionId, blockId, viewMode) => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => ({
        ...project,
        pages: project.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                sections: page.sections.map((section) =>
                  section.id === sectionId
                    ? {
                        ...section,
                        content: {
                          ...section.content,
                          blocks: section.content.blocks.map((block) => {
                            if (block.id !== blockId) {
                              return normalizeBlock(block);
                            }

                            const nextResponsive = { ...(block.responsive || {}) };
                            delete nextResponsive[viewMode];

                            return normalizeBlock({
                              ...block,
                              responsive:
                                Object.keys(nextResponsive).length > 0
                                  ? nextResponsive
                                  : undefined,
                            });
                          }),
                        },
                      }
                    : section
                ),
              }
            : page
        ),
      }));
    },

    moveBlock: (pageId, sectionId, blockId, direction) => {
      pushUndoSnapshot();

      set((state) => {
        const activeViewMode = normalizeViewMode(state.viewMode);

        const nextProject = touchProject(
          normalizeProject({
            ...state.project,
            pages: state.project.pages.map((page) =>
              page.id === pageId
                ? {
                    ...page,
                    sections: page.sections.map((section) =>
                      section.id === sectionId
                        ? {
                            ...section,
                            content: {
                              ...section.content,
                              blocks: section.content.blocks.map((block) => {
                                if (block.id !== blockId) {
                                  return normalizeBlock(block);
                                }

                                const resolved = resolveBlockViewState(block, activeViewMode);
                                let nextW = resolved.layout.w;
                                let nextH = resolved.layout.h;

                                if (direction === 'left') {
                                  nextW = normalizeSpan(resolved.layout.w - 1);
                                } else if (direction === 'right') {
                                  nextW = normalizeSpan(resolved.layout.w + 1);
                                } else if (direction === 'up') {
                                  nextH = normalizeRowSpan(resolved.layout.h - 1);
                                } else if (direction === 'down') {
                                  nextH = normalizeRowSpan(resolved.layout.h + 1);
                                }

                                if (activeViewMode === 'desktop') {
                                  return normalizeBlock({
                                    ...block,
                                    span: nextW,
                                    rowSpan: nextH,
                                    layout: {
                                      ...(block.layout || createBlockLayout(block.span, block.rowSpan)),
                                      w: nextW,
                                      h: nextH,
                                    },
                                  });
                                }

                                const nextResponsive = {
                                  ...(block.responsive || {}),
                                  [activeViewMode]: {
                                    ...(block.responsive?.[activeViewMode] || {}),
                                    layout: {
                                      ...(block.responsive?.[activeViewMode]?.layout || {}),
                                      x: resolved.layout.x,
                                      y: resolved.layout.y,
                                      w: nextW,
                                      h: nextH,
                                    },
                                  },
                                };

                                return normalizeBlock({
                                  ...block,
                                  responsive: nextResponsive,
                                });
                              }),
                            },
                          }
                        : section
                    ),
                  }
                : page
            ),
          })
        );

        return {
          project: nextProject,
        };
      });
    },

    duplicateBlock: (pageId, sectionId, blockId) => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => {
        const page = project.pages.find((item) => item.id === pageId);
        const section = page?.sections.find((item) => item.id === sectionId);
        const block = section?.content.blocks.find((item) => item.id === blockId);

        if (!block) return project;

        const duplicated = cloneBlockForCanvas({
          ...block,
          name: `${block.name} копия`,
        });

        return {
          ...project,
          pages: project.pages.map((pageItem) =>
            pageItem.id === pageId
              ? {
                  ...pageItem,
                  sections: pageItem.sections.map((sectionItem) =>
                    sectionItem.id === sectionId
                      ? {
                          ...sectionItem,
                          content: {
                            ...sectionItem.content,
                            blocks: [...sectionItem.content.blocks, duplicated],
                          },
                        }
                      : sectionItem
                  ),
                }
              : pageItem
          ),
        };
      });
    },

    saveBlockToCustomLibrary: (pageId, sectionId, blockId) => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => {
        const page = project.pages.find((item) => item.id === pageId);
        const section = page?.sections.find((item) => item.id === sectionId);
        const block = section?.content.blocks.find((item) => item.id === blockId);

        if (!block) return project;

        const previewWidth = block.layout?.w ?? block.span;
        const previewHeight = block.layout?.h ?? block.rowSpan;

        const libraryBlock = {
          id: uuidv4(),
          categoryId: 'custom' as const,
          name: (block.name || 'Custom блок').trim(),
          description: block.description || 'Сохранённый пользовательский блок',
          preview: `${previewWidth}×${previewHeight}`,
          block: normalizeBlock({
            ...block,
            layout: block.layout ? { ...block.layout } : undefined,
            runtime: block.runtime ? { ...block.runtime } : { ...DEFAULT_BLOCK_RUNTIME },
            responsive: cloneBlockResponsive(block),
            content: {
              ...block.content,
              children: block.content.children ? [...block.content.children] : undefined,
            },
          }),
        };

        const sameNameFiltered = project.componentLibrary.blocks.filter(
          (item) => item.name !== libraryBlock.name
        );

        return {
          ...project,
          componentLibrary: {
            ...project.componentLibrary,
            blocks: [...sameNameFiltered, libraryBlock],
          },
        };
      });
    },

    removeCustomLibraryBlock: (libraryBlockId) => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => ({
        ...project,
        componentLibrary: {
          ...project.componentLibrary,
          blocks: project.componentLibrary.blocks.filter(
            (item) => item.id !== libraryBlockId
          ),
        },
      }));
    },

    // ==========================================
    // ВЫДЕЛЕНИЕ
    // ==========================================

    selectElement: (element) => set({ selectedElement: element }),
    setHoveredElement: (id) => set({ hoveredElement: id }),

    // ==========================================
    // РЕЖИМЫ
    // ==========================================

    setMode: (mode) => set({ mode }),
    setViewMode: (viewMode) => set({ viewMode }),
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

    // ==========================================
    // ПАНЕЛИ
    // ==========================================

    setActivePanel: (activePanel) => set({ activePanel }),
    setCodeTab: (codeTab) => set({ codeTab }),

    addProjectFile: (type) => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => {
        const existing = project.files.filter((file) => file.type === type).length;
        const extension = type === 'gs' ? '.gs' : '.html';
        const baseName = type === 'gs' ? 'Script' : 'Html';

        const newFile: ProjectFile = {
          id: uuidv4(),
          name: `${baseName}${existing + 1}${extension}`,
          type,
          content:
            type === 'gs'
              ? `function myFunction() {
  Logger.log('Hello from Apps Script');
}
`
              : '<div class="text-base">Новый HTML файл</div>',
          description:
            type === 'gs'
              ? 'Пользовательский Apps Script файл'
              : 'Пользовательский HTML файл',
          isEntry: false,
        };

        return {
          ...project,
          files: [...project.files, newFile],
        };
      });
    },

    updateProjectFile: (fileId, updates) => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => ({
        ...project,
        files: project.files.map((file) =>
          file.id === fileId
            ? {
                ...file,
                ...updates,
                name:
                  typeof updates.name === 'string' && updates.name.trim()
                    ? updates.name
                    : file.name,
                content:
                  typeof updates.content === 'string'
                    ? updates.content
                    : file.content,
                description:
                  typeof updates.description === 'string'
                    ? updates.description
                    : file.description,
              }
            : file
        ),
      }));
    },

    removeProjectFile: (fileId) => {
      pushUndoSnapshot();

      applyProjectUpdate((project) => {
        const target = project.files.find((file) => file.id === fileId);
        if (!target || target.isEntry) return project;

        return {
          ...project,
          files: project.files.filter((file) => file.id !== fileId),
        };
      });
    },

    // ==========================================
    // UNDO / REDO
    // ==========================================

    pushUndo: pushUndoSnapshot,

    undo: () =>
      set((state) => {
        if (state.undoStack.length === 0) return state;

        const previousProject = state.undoStack[state.undoStack.length - 1];

        return {
          project: normalizeProject(previousProject),
          undoStack: state.undoStack.slice(0, -1),
          redoStack: [cloneProjectForHistory(state.project), ...state.redoStack],
        };
      }),

    redo: () =>
      set((state) => {
        if (state.redoStack.length === 0) return state;

        const nextProject = state.redoStack[0];

        return {
          project: normalizeProject(nextProject),
          undoStack: [...state.undoStack, cloneProjectForHistory(state.project)],
          redoStack: state.redoStack.slice(1),
        };
      }),

    // ==========================================
    // ЛОГИКА
    // ==========================================

    updateCustomLogic: applyCustomLogicUpdates,

    // ==========================================
    // СБРОС
    // ==========================================

    resetProject: () => {
      const freshProject = createNewProject();

      set({
        project: freshProject,
        lastSavedSnapshot: captureProjectSnapshot(freshProject),
        selectedElement: null,
        hoveredElement: null,
        undoStack: [],
        redoStack: [],
      });
    },
  };
});