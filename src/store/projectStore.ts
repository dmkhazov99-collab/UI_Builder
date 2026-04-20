import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

import type {
  Project,
  Page,
  Section,
  Block,
  HeaderIsolator,
  ContentIsolator,
  SelectedElement,
  BlockType,
  SpanValue,
  RowSpanValue,
} from '@/types/project';

import {
  DEFAULT_GRID_SYSTEM,
  DEFAULT_COLOR_SYSTEM,
  DEFAULT_TYPOGRAPHY,
  createDefaultHeaderEndpoint,
  createDefaultContentEndpoint,
  normalizeBlock,
  normalizeRowSpan,
  normalizeSpan,
} from '@/types/project';

// ============================================
// СОЗДАНИЕ НОВОГО ПРОЕКТА
// ============================================

const createNewSection = (): Section => ({
  id: uuidv4(),
  name: 'Новая секция',
  description: '',
  order: 0,
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

const createNewPage = (): Page => ({
  id: uuidv4(),
  name: 'Главная страница',
  order: 0,
  sections: [createNewSection()],
});

export const createNewProject = (): Project => ({
  meta: {
    id: uuidv4(),
    name: 'Новый проект',
    description: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0.0',
  },
  designSystem: {
    colors: DEFAULT_COLOR_SYSTEM,
    typography: DEFAULT_TYPOGRAPHY,
    spacing: { blockPadding: 12, gridGap: 12 },
    grid: DEFAULT_GRID_SYSTEM,
  },
  pages: [createNewPage()],
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
  files: [
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
  ],
  bindings: [],
  exportConfig: {
    format: 'html',
    includeAssets: true,
    minify: false,
    inlineStyles: true,
    inlineScripts: true,
  },
});

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

export const createNewBlock = (
  type: BlockType = 'block-info',
  span: SpanValue = 2,
  rowSpan: RowSpanValue = 3
): Block => {
  const template = BLOCK_TEMPLATE_CONFIG[type];

  return normalizeBlock({
    id: uuidv4(),
    name: template.name,
    description: '',
    type,
    span,
    rowSpan,
    mode: 'clip',
    content: {
      html: template.html,
      text: template.text,
    },
  });
};

export const cloneBlockForCanvas = (block: Block): Block =>
  normalizeBlock({
    ...block,
    id: uuidv4(),
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
// ИНТЕРФЕЙС СОСТОЯНИЯ
// ============================================

interface ProjectState {
  project: Project;
  lastSavedSnapshot: string;
  selectedElement: SelectedElement | null;
  hoveredElement: string | null;
  mode: 'edit' | 'preview' | 'code';
  viewMode: 'desktop' | 'tablet' | 'mobile';
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
  setViewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
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

const normalizeProject = (project: Project): Project => ({
  ...project,
  componentLibrary: {
    ...project.componentLibrary,
    blocks: (project.componentLibrary?.blocks ?? []).map((libraryBlock) => ({
      ...libraryBlock,
      categoryId: 'custom',
      block: normalizeBlock(libraryBlock.block),
    })),
  },
  customLogic: {
    javascript: project.customLogic?.javascript || '',
    css: project.customLogic?.css || '',
    htmlOverride: project.customLogic?.htmlOverride || '',
    handlers: project.customLogic?.handlers || [],
  },
  files: (
    project.files ?? [
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
        content:
          "function doGet() {\n  return HtmlService.createHtmlOutputFromFile('Index');\n}\n",
        description: 'Главный Google Apps Script файл',
      },
    ]
  ).map((file, index) => ({
    id: file.id || uuidv4(),
    name:
      file.name ||
      (file.type === 'gs' ? `File${index + 1}.gs` : `File${index + 1}.html`),
    type: file.type === 'gs' ? 'gs' : 'html',
    content: typeof file.content === 'string' ? file.content : '',
    description: file.description || '',
    isEntry: Boolean(file.isEntry) || index === 0,
  })),
  pages: reindexPages(
    project.pages.map((page) => ({
      ...page,
      sections: reindexSections(
        page.sections.map((section) => ({
          ...section,
          name: section.name || section.header?.title || 'Секция',
          description: section.description || '',
          header: {
            ...section.header,
            name: section.header?.name || 'Header',
            description: section.header?.description || 'Зона заголовка секции',
            endpoint:
              section.header?.endpoint ||
              createDefaultHeaderEndpoint(section.header?.title || 'Секция'),
          },
          content: {
            ...section.content,
            name: section.content?.name || 'Content',
            description:
              section.content?.description || 'Основное содержимое секции',
            endpoint:
              section.content?.endpoint || createDefaultContentEndpoint(),
            blocks: section.content.blocks.map((block) => normalizeBlock(block)),
          },
        }))
      ),
    }))
  ),
});

const touchProject = (project: Project): Project => ({
  ...project,
  meta: {
    ...project.meta,
    updatedAt: new Date().toISOString(),
  },
});

const initialProject = createNewProject();

// ============================================
// STORE
// ============================================

export const useProjectStore = create<ProjectState & ProjectActions>((set, get) => ({
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

  updateMeta: (updates) =>
    set((state) => ({
      project: {
        ...state.project,
        meta: {
          ...state.project.meta,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      },
    })),

  // ==========================================
  // СТРАНИЦЫ
  // ==========================================

  addPage: () => {
    get().pushUndo();

    set((state) => {
      const newPage = createNewPage();

      return {
        project: touchProject({
          ...state.project,
          pages: reindexPages([...state.project.pages, newPage]),
        }),
      };
    });
  },

  removePage: (pageId) => {
    get().pushUndo();

    set((state) => ({
      project: touchProject({
        ...state.project,
        pages: reindexPages(state.project.pages.filter((page) => page.id !== pageId)),
      }),
    }));
  },

  updatePage: (pageId, updates) => {
    get().pushUndo();

    set((state) => ({
      project: touchProject({
        ...state.project,
        pages: state.project.pages.map((page) =>
          page.id === pageId ? { ...page, ...updates } : page
        ),
      }),
    }));
  },

  // ==========================================
  // СЕКЦИИ
  // ==========================================

  addSection: (pageId) => {
    get().pushUndo();

    set((state) => {
      const page = state.project.pages.find((p) => p.id === pageId);
      if (!page) return state;

      const newSection = createNewSection();

      return {
        project: touchProject({
          ...state.project,
          pages: state.project.pages.map((pageItem) =>
            pageItem.id === pageId
              ? {
                  ...pageItem,
                  sections: reindexSections([...pageItem.sections, newSection]),
                }
              : pageItem
          ),
        }),
      };
    });
  },

  removeSection: (pageId, sectionId) => {
    get().pushUndo();

    set((state) => ({
      project: touchProject({
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
      }),
      selectedElement:
        state.selectedElement &&
        (state.selectedElement.id === sectionId ||
          state.selectedElement.parentId === sectionId)
          ? null
          : state.selectedElement,
    }));
  },

  duplicateSection: (pageId, sectionId) => {
    get().pushUndo();

    set((state) => {
      const page = state.project.pages.find((p) => p.id === pageId);
      const section = page?.sections.find((s) => s.id === sectionId);

      if (!page || !section) return state;

      const duplicatedSection = cloneSectionForCanvas(section, page.sections.length);

      return {
        project: touchProject({
          ...state.project,
          pages: state.project.pages.map((pageItem) =>
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
        }),
      };
    });
  },

  updateSection: (pageId, sectionId, updates) => {
    get().pushUndo();

    set((state) => ({
      project: touchProject({
        ...state.project,
        pages: state.project.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                sections: page.sections.map((section) =>
                  section.id === sectionId ? { ...section, ...updates } : section
                ),
              }
            : page
        ),
      }),
    }));
  },

  moveSection: (pageId, sectionId, direction) => {
    get().pushUndo();

    set((state) => {
      const page = state.project.pages.find((p) => p.id === pageId);
      if (!page) return state;

      const sections = [...page.sections];
      const index = sections.findIndex((section) => section.id === sectionId);
      if (index === -1) return state;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= sections.length) return state;

      [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];

      return {
        project: touchProject({
          ...state.project,
          pages: state.project.pages.map((pageItem) =>
            pageItem.id === pageId
              ? { ...pageItem, sections: reindexSections(sections) }
              : pageItem
          ),
        }),
      };
    });
  },

  // ==========================================
  // ЗАГОЛОВКИ И КОНТЕНТ
  // ==========================================

  updateHeader: (pageId, sectionId, updates) => {
    get().pushUndo();

    set((state) => ({
      project: touchProject({
        ...state.project,
        pages: state.project.pages.map((page) =>
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
      }),
    }));
  },

  updateContent: (pageId, sectionId, updates) => {
    get().pushUndo();

    set((state) => ({
      project: touchProject({
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
      }),
    }));
  },

  // ==========================================
  // БЛОКИ
  // ==========================================

  addBlock: (pageId, sectionId, block) => {
    get().pushUndo();

    set((state) => ({
      project: touchProject({
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
                          blocks: [...section.content.blocks, normalizeBlock(block)],
                        },
                      }
                    : section
                ),
              }
            : page
        ),
      }),
    }));
  },

  removeBlock: (pageId, sectionId, blockId) => {
    get().pushUndo();

    set((state) => ({
      project: touchProject({
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
      }),
      selectedElement:
        state.selectedElement?.id === blockId ? null : state.selectedElement,
    }));
  },

  updateBlock: (pageId, sectionId, blockId, updates) => {
    get().pushUndo();

    set((state) => ({
      project: touchProject({
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
      }),
    }));
  },

  moveBlock: (pageId, sectionId, blockId, direction) => {
    get().pushUndo();

    set((state) => {
      const page = state.project.pages.find((p) => p.id === pageId);
      if (!page) return state;

      const section = page.sections.find((s) => s.id === sectionId);
      if (!section) return state;

      const blocks = [...section.content.blocks];
      const index = blocks.findIndex((block) => block.id === blockId);
      if (index === -1) return state;

      const sourceBlock = blocks[index];
      let nextSpan = sourceBlock.span;
      let nextRowSpan = sourceBlock.rowSpan;

      if (direction === 'left') {
        nextSpan = normalizeSpan(sourceBlock.span - 1);
      } else if (direction === 'right') {
        nextSpan = normalizeSpan(sourceBlock.span + 1);
      } else if (direction === 'up') {
        nextRowSpan = normalizeRowSpan(sourceBlock.rowSpan - 1);
      } else if (direction === 'down') {
        nextRowSpan = normalizeRowSpan(sourceBlock.rowSpan + 1);
      }

      blocks[index] = normalizeBlock({
        ...sourceBlock,
        span: nextSpan,
        rowSpan: nextRowSpan,
      });

      return {
        project: touchProject({
          ...state.project,
          pages: state.project.pages.map((pageItem) =>
            pageItem.id === pageId
              ? {
                  ...pageItem,
                  sections: pageItem.sections.map((sectionItem) =>
                    sectionItem.id === sectionId
                      ? {
                          ...sectionItem,
                          content: { ...sectionItem.content, blocks },
                        }
                      : sectionItem
                  ),
                }
              : pageItem
          ),
        }),
      };
    });
  },

  duplicateBlock: (pageId, sectionId, blockId) => {
    get().pushUndo();

    set((state) => {
      const page = state.project.pages.find((p) => p.id === pageId);
      const section = page?.sections.find((s) => s.id === sectionId);
      const block = section?.content.blocks.find((b) => b.id === blockId);

      if (!block) return state;

      const duplicated = cloneBlockForCanvas({
        ...block,
        name: `${block.name} копия`,
      });

      return {
        project: touchProject({
          ...state.project,
          pages: state.project.pages.map((pageItem) =>
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
        }),
      };
    });
  },

  saveBlockToCustomLibrary: (pageId, sectionId, blockId) => {
    get().pushUndo();

    set((state) => {
      const page = state.project.pages.find((p) => p.id === pageId);
      const section = page?.sections.find((s) => s.id === sectionId);
      const block = section?.content.blocks.find((b) => b.id === blockId);

      if (!block) return state;

      const libraryBlock = {
        id: uuidv4(),
        categoryId: 'custom' as const,
        name: (block.name || 'Custom блок').trim(),
        description: block.description || 'Сохранённый пользовательский блок',
        preview: `${block.span}x${block.rowSpan}`,
        block: normalizeBlock({
          ...block,
          content: {
            ...block.content,
            children: block.content.children
              ? [...block.content.children]
              : undefined,
          },
        }),
      };

      const sameNameFiltered = state.project.componentLibrary.blocks.filter(
        (item) => item.name !== libraryBlock.name
      );

      return {
        project: touchProject({
          ...state.project,
          componentLibrary: {
            ...state.project.componentLibrary,
            blocks: [...sameNameFiltered, libraryBlock],
          },
        }),
      };
    });
  },

  removeCustomLibraryBlock: (libraryBlockId) => {
    get().pushUndo();

    set((state) => ({
      project: touchProject({
        ...state.project,
        componentLibrary: {
          ...state.project.componentLibrary,
          blocks: state.project.componentLibrary.blocks.filter(
            (item) => item.id !== libraryBlockId
          ),
        },
      }),
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
    get().pushUndo();

    set((state) => {
      const existing = state.project.files.filter((file) => file.type === type).length;
      const extension = type === 'gs' ? '.gs' : '.html';
      const baseName = type === 'gs' ? 'Script' : 'Html';

      const newFile = {
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
        project: touchProject({
          ...state.project,
          files: [...state.project.files, newFile],
        }),
      };
    });
  },

  updateProjectFile: (fileId, updates) => {
    get().pushUndo();

    set((state) => ({
      project: touchProject({
        ...state.project,
        files: state.project.files.map((file) =>
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
      }),
    }));
  },

  removeProjectFile: (fileId) => {
    get().pushUndo();

    set((state) => {
      const target = state.project.files.find((file) => file.id === fileId);
      if (!target || target.isEntry) return state;

      return {
        project: touchProject({
          ...state.project,
          files: state.project.files.filter((file) => file.id !== fileId),
        }),
      };
    });
  },

  // ==========================================
  // UNDO / REDO
  // ==========================================

  pushUndo: () =>
    set((state) => ({
      undoStack: [
        ...state.undoStack.slice(-19),
        JSON.parse(JSON.stringify(state.project)),
      ],
      redoStack: [],
    })),

  undo: () =>
    set((state) => {
      if (state.undoStack.length === 0) return state;

      const prevProject = state.undoStack[state.undoStack.length - 1];

      return {
        project: normalizeProject(prevProject),
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [JSON.parse(JSON.stringify(state.project)), ...state.redoStack],
      };
    }),

  redo: () =>
    set((state) => {
      if (state.redoStack.length === 0) return state;

      const nextProject = state.redoStack[0];

      return {
        project: normalizeProject(nextProject),
        undoStack: [...state.undoStack, JSON.parse(JSON.stringify(state.project))],
        redoStack: state.redoStack.slice(1),
      };
    }),

  // ==========================================
  // ЛОГИКА
  // ==========================================

  updateCustomLogic: (updates) => {
    get().pushUndo();

    set((state) => ({
      project: touchProject({
        ...state.project,
        customLogic: { ...state.project.customLogic, ...updates },
      }),
    }));
  },

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
}));