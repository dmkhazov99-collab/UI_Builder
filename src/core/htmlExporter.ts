/**
 * ============================================
 * MODULE: HTML Export Pipeline
 * VERSION: 2.4.0
 * ROLE:
 * Единый pipeline генерации runtime/export HTML для UI Builder.
 *
 * RESPONSIBILITIES:
 * - собрать полный HTML-документ из Project
 * - собрать CSS из design system
 * - собрать JS runtime и пользовательскую логику
 * - подготовить HTML для preview/export
 * - сформировать ZIP-бандл проекта
 * - поддерживать single-file и split-files export modes
 * - генерировать responsive block runtime с base + screen variants
 *
 * DEPENDS ON:
 * - Project domain model
 * - Page / Section / Block / HeaderIsolator / ContentIsolator
 * - resolveBlockViewState()
 *
 * USED BY:
 * - projectRuntimeHtml.ts
 * - PreviewPanel
 * - CodePanel
 * - Toolbar export actions
 *
 * RULES:
 * - один источник итогового HTML для preview и export
 * - public API модуля должен оставаться стабильным
 * - пользовательский HTML/CSS/JS не должен ломать pipeline сборки
 * - итоговый single-file export должен работать автономно
 * - split-files export должен быть той же логикой, но другой упаковкой
 * - runtime block DOM contract должен быть стабильным
 * - preview DOM должен иметь стабильные data-якоря для editor overlay
 *
 * SECURITY:
 * - block/content/header endpoint HTML считается trusted-only
 * - custom JS/CSS считается trusted-only
 * - метаданные и служебные поля экранируются
 * ============================================
 */

import type {
  Block,
  ColorSystem,
  Page,
  Project,
  Section,
  ViewMode,
} from '@/types/project';
import { resolveBlockViewState } from '@/types/project';

/**
 * ============================================
 * BLOCK: Shared Constants
 * VERSION: 2.3.0
 * PURPOSE:
 * Общие служебные значения модуля.
 * ============================================
 */
const DEFAULT_HTML_FILENAME = 'ui_builder_project.html';
const DEFAULT_ZIP_FILENAME = 'ui_builder_project.zip';

const DEFAULT_LIGHT_THEME: ColorSystem = {
  bgPrimary: '#F5F7FB',
  bgSecondary: '#FFFFFF',
  bgTertiary: '#EEF3FB',
  bgBorder: '#D8E1F0',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  accent: '#2A80F4',
  success: '#0E9F6E',
  warning: '#D97706',
  error: '#DC2626',
};

const BLOCK_ROOT_CLASS = 'ui-block-root';
const BLOCK_CONTENT_CLASS = 'block-content';

/**
 * ============================================
 * BLOCK: Extended Runtime Types
 * VERSION: 2.1.0
 * PURPOSE:
 * Локальные расширения Project/Block под responsive export.
 * ============================================
 */
type ExportMode = 'single-file' | 'split-files';
type SupportedBlockMode = 'clip' | 'scroll';

type BlockRuntimeConfig = {
  css?: string;
  javascript?: string;
};

type BlockResponsiveLayout = {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

type BlockScreenOverride = {
  html?: string;
  visible?: boolean;
  layout?: Partial<BlockResponsiveLayout>;
};

type ExtendedBlock = Block & {
  visible?: boolean;
  layout?: BlockResponsiveLayout;
  runtime?: BlockRuntimeConfig;
  responsive?: Partial<Record<ViewMode, BlockScreenOverride>>;
};

type ExtendedProject = Project & {
  theme?: {
    dark?: Partial<ColorSystem>;
    light?: Partial<ColorSystem>;
  };
  exportConfig: Project['exportConfig'] & {
    mode?: ExportMode;
  };
};

type CompiledResources = {
  title: string;
  runtimeCss: string;
  blockCssRegistry: string;
  googleScriptMockJs: string;
  runtimeJs: string;
  blockRegistryJs: string;
  projectCustomJs: string;
  body: string;
};

/**
 * ============================================
 * BLOCK: Public HTML API
 * VERSION: 2.0.0
 * PURPOSE:
 * Публичные функции для генерации и резолва итогового HTML.
 * ============================================
 */
export function generateHTML(project: Project): string {
  const extendedProject = project as ExtendedProject;
  const resources = compileProjectResources(extendedProject);

  return buildSingleFileHtml(resources);
}

export function resolveProjectHtml(project: Project): string {
  const override = project.customLogic?.htmlOverride?.trim();
  return override ? override : generateHTML(project);
}

/**
 * ============================================
 * BLOCK: Project Compilation
 * VERSION: 2.0.0
 * PURPOSE:
 * Сборка итоговых ресурсов проекта перед упаковкой.
 * ============================================
 */
function compileProjectResources(project: ExtendedProject): CompiledResources {
  const title = escapeHtml(project.meta.name || 'UI Builder Project');

  return {
    title,
    runtimeCss: generateRuntimeCss(project),
    blockCssRegistry: generateBlockCssRegistry(project),
    googleScriptMockJs: generateGoogleScriptMockJs(),
    runtimeJs: generateRuntimeJs(),
    blockRegistryJs: generateBlockRegistryJs(project),
    projectCustomJs: generateProjectCustomJs(project.customLogic.javascript || ''),
    body: project.pages.map((page) => generatePage(page)).join('\n\n'),
  };
}

/**
 * ============================================
 * BLOCK: CSS Generation
 * VERSION: 2.4.0
 * PURPOSE:
 * Генерация runtime CSS c dark/light theme tokens
 * и стабильным block DOM contract.
 *
 * NOTES:
 * - grid gap всегда остаётся тем, что задан в design system
 * - block padding всегда остаётся тем, что задан в design system
 * - grid row height всегда остаётся тем, что задан в design system
 * - на меньших экранах адаптируется только max-width контейнера
 * - поддерживаются только режимы block: clip и scroll
 * - clip всегда запрещает внутренний scroll
 * ============================================
 */
function generateRuntimeCss(project: ExtendedProject): string {
  const { designSystem, customLogic } = project;
  const { typography, spacing, grid } = designSystem;

  const darkTheme = {
    ...designSystem.colors,
    ...(project.theme?.dark || {}),
  };

  const lightTheme = {
    ...DEFAULT_LIGHT_THEME,
    ...(project.theme?.light || {}),
  };

  return `/* ============================================
   UI BUILDER RUNTIME CSS
   VERSION: 2.4.0
   ROLE:
   Глобальный runtime-слой проекта.
   ============================================ */

:root {
  color-scheme: dark light;

  /* Grid System */
  --max-width: ${grid.maxWidth}px;
  --header-height: ${grid.headerHeight}px;
  --grid-columns: ${grid.columns};
  --grid-gap: ${grid.gap}px;
  --grid-row: ${grid.rowHeight}px;
  --block-padding: ${spacing.blockPadding}px;

  /* Dark Theme */
  --bg-primary: ${darkTheme.bgPrimary};
  --bg-secondary: ${darkTheme.bgSecondary};
  --bg-tertiary: ${darkTheme.bgTertiary};
  --bg-border: ${darkTheme.bgBorder};
  --text-primary: ${darkTheme.textPrimary};
  --text-secondary: ${darkTheme.textSecondary};
  --accent: ${darkTheme.accent};
  --success: ${darkTheme.success};
  --warning: ${darkTheme.warning};
  --error: ${darkTheme.error};
}

@media (prefers-color-scheme: light) {
  :root {
    --bg-primary: ${lightTheme.bgPrimary};
    --bg-secondary: ${lightTheme.bgSecondary};
    --bg-tertiary: ${lightTheme.bgTertiary};
    --bg-border: ${lightTheme.bgBorder};
    --text-primary: ${lightTheme.textPrimary};
    --text-secondary: ${lightTheme.textSecondary};
    --accent: ${lightTheme.accent};
    --success: ${lightTheme.success};
    --warning: ${lightTheme.warning};
    --error: ${lightTheme.error};
  }
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

html::-webkit-scrollbar,
body::-webkit-scrollbar {
  display: none;
}

body {
  min-height: 100vh;
  overflow-y: auto;
}

.ui-page-root {
  width: 100%;
  min-height: calc(100vh - 48px);
  padding-bottom: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

* {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--border)) var(--bg-border);
}

*::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

*::-webkit-scrollbar-track {
  background: var(--bg-border);
  border-radius: 0;
}

*::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border: 2px solid transparent;
  border-radius: 0;
  background-clip: padding-box;
}

*::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground));
}

/* ============================================
   Typography
   ============================================ */

.h1 { font-size: ${typography.h1.fontSize}; font-weight: ${typography.h1.fontWeight}; }
.h2 { font-size: ${typography.h2.fontSize}; font-weight: ${typography.h2.fontWeight}; }
.h3 { font-size: ${typography.h3.fontSize}; font-weight: ${typography.h3.fontWeight}; }

.text-base { font-size: ${typography.textBase.fontSize}; }
.text-small {
  font-size: ${typography.textSmall.fontSize};
  color: var(--text-secondary);
}

.font-medium { font-weight: 500; }
.font-bold { font-weight: 700; }

/* ============================================
   Layout: Section Isolators
   ============================================ */

.section-shell {
  width: 100%;
  position: relative;
}

.section-header-isolator {
  width: 100%;
  max-width: var(--max-width);
  height: var(--header-height);
  margin: 0 auto;
  display: flex;
  align-items: center;
  position: relative;
}

.section-header-content {
  width: 100%;
}

.section-content-isolator {
  width: 100%;
  max-width: var(--max-width);
  margin: 0 auto;
  position: relative;
}

/* ============================================
   Layout: Grid
   ============================================ */

.grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns), minmax(0, 1fr));
  grid-auto-rows: var(--grid-row);
  gap: var(--grid-gap);
}

/* ============================================
   Block Base
   ============================================ */

.ui-block {
  min-width: 0;
  min-height: 0;
}

.block {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--bg-border);
  border-radius: 12px;
  overflow: hidden;
}

.${BLOCK_ROOT_CLASS} {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.${BLOCK_CONTENT_CLASS} {
  padding: var(--block-padding);
  height: 100%;
  width: 100%;
  min-height: 0;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* block-info */
.block-info {
  /* Base block styles only */
}

/* block-placeholder */
.block-placeholder {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  border-radius: 0;
}

.block-placeholder .${BLOCK_CONTENT_CLASS} {
  padding: 0;
}

/* block-button */
.block-button {
  background: var(--bg-tertiary);
  transition:
    background 0.2s,
    border-color 0.2s,
    transform 0.08s;
}

.block-button:hover {
  background: var(--bg-secondary);
  border-color: var(--accent);
}

.block-button:active {
  transform: scale(0.96);
}

/* Block modes */
.block-clip {
  overflow: hidden;
}

.block-clip .${BLOCK_ROOT_CLASS} {
  overflow: hidden;
}

.block-clip .${BLOCK_CONTENT_CLASS} {
  overflow: hidden;
}

.block-scroll .${BLOCK_ROOT_CLASS} {
  overflow-y: auto;
  overflow-x: hidden;
}

.block-button .${BLOCK_ROOT_CLASS} {
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}

.block-button .${BLOCK_CONTENT_CLASS} {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  word-break: break-word;
  overflow: hidden;
  white-space: normal;
}

.ui-block[data-hidden="true"] {
  display: none !important;
}

/* ============================================
   Project Custom CSS (trusted-only)
   ============================================ */

${customLogic.css || ''}

@media (max-width: 900px) {
  :root {
    --max-width: min(100vw - 24px, ${grid.maxWidth}px);
  }
}
`;
}

function generateBlockCssRegistry(project: ExtendedProject): string {
  const cssChunks = flattenProjectBlocks(project)
    .map((block) => {
      const runtimeCss = getBlockRuntime(block).css.trim();

      if (!runtimeCss) return '';

      return `/* BLOCK CSS: ${block.id} */
${runtimeCss}`;
    })
    .filter(Boolean);

  return cssChunks.join('\n\n');
}

/**
 * ============================================
 * BLOCK: Markup Generation
 * VERSION: 2.4.0
 * PURPOSE:
 * Сборка страницы, секции, изоляторов и responsive blocks.
 *
 * NOTES:
 * Добавлены стабильные data-якоря для editor overlay:
 * - data-section-id
 * - data-header-id
 * - data-content-id
 * - data-block-id
 *
 * Поддерживаются только block modes:
 * - clip
 * - scroll
 * Все остальные режимы нормализуются в clip.
 * ============================================
 */
function generatePage(page: Page): string {
  return page.sections.map((section) => generateSection(section)).join('\n\n');
}

function generateSection(section: Section): string {
  const header = generateHeaderIsolator(section);
  const content = generateContentIsolator(section);

  return `<!-- SECTION -->
<section
  class="section-shell"
  data-section-shell-id="${escapeHtmlAttribute(section.id)}"
>
${indentMultiline(header, 2)}

${indentMultiline(content, 2)}
</section>`;
}

function generateHeaderIsolator(section: Section): string {
  const { header } = section;
  const endpointName = escapeHtmlAttribute(header.endpoint?.name || 'header-endpoint');
  const hasEndpointHtml = Boolean(header.endpoint?.html?.trim());

  const endpointHtml = hasEndpointHtml
    ? `
  <div class="section-header-content header-endpoint ${endpointName}">
    ${header.endpoint!.html}
  </div>`
    : `
  <div class="section-header-content">
    <div class="h1">${escapeHtml(header.title)}</div>
  </div>`;

  const endpointCss = header.endpoint?.css?.trim()
    ? `
<style>
${header.endpoint.css}
</style>`
    : '';

  return `<!-- SECTION HEADER -->
<div
  class="section-header-isolator"
  data-section-id="${escapeHtmlAttribute(section.id)}"
  data-header-id="${escapeHtmlAttribute(header.id)}"
>${endpointHtml}
</div>${endpointCss}`;
}

function generateContentIsolator(section: Section): string {
  const { content } = section;
  const blocksHtml = content.blocks.map((block) => generateBlock(block)).join('\n    ');
  const endpointName = escapeHtmlAttribute(content.endpoint?.name || 'content-endpoint');

  const endpointHtml = content.endpoint?.html?.trim()
    ? `
  <div class="content-endpoint ${endpointName}">
    ${content.endpoint.html}
  </div>`
    : '';

  const endpointCss = content.endpoint?.css?.trim()
    ? `
<style>
${content.endpoint.css}
</style>`
    : '';

  return `<!-- SECTION CONTENT -->
<div
  class="section-content-isolator"
  data-section-id="${escapeHtmlAttribute(section.id)}"
  data-content-id="${escapeHtmlAttribute(content.id)}"
>
  <div class="grid">
    ${blocksHtml}
  </div>${endpointHtml}
</div>${endpointCss}`;
}

function generateBlock(blockInput: Block): string {
  const block = blockInput as ExtendedBlock;
  const desktopState = resolveBlockViewState(block, 'desktop');
  const tabletState = resolveBlockViewState(block, 'tablet');
  const mobileState = resolveBlockViewState(block, 'mobile');

  const resolvedMode = normalizeBlockMode(desktopState.mode);
  const modeClass = resolvedMode === 'scroll' ? ' block-scroll' : ' block-clip';
  const classes = `ui-block block ${block.type}${modeClass}`;
  const blockLabel = escapeHtml(block.content.text || block.name || 'Untitled');
  const comment = `<!-- BLOCK: ${blockLabel} | TYPE: ${block.type} | BASE SIZE: ${desktopState.layout.w}x${desktopState.layout.h} | MODE: ${resolvedMode} -->`;

  const baseTemplate = block.content.html || '';
  const desktopTemplate = getBlockScreenHtml(block, 'desktop');
  const tabletTemplate = getBlockScreenHtml(block, 'tablet');
  const mobileTemplate = getBlockScreenHtml(block, 'mobile');

  return `${comment}
    <div
      class="${classes}"
      data-block-id="${escapeHtmlAttribute(block.id)}"
      data-block-type="${escapeHtmlAttribute(block.type)}"
      data-block-mode="${escapeHtmlAttribute(resolvedMode)}"
      data-visible-desktop="${String(desktopState.visible)}"
      data-visible-tablet="${String(tabletState.visible)}"
      data-visible-mobile="${String(mobileState.visible)}"
      data-layout-desktop="${serializeLayout(desktopState.layout)}"
      data-layout-tablet="${serializeLayout(tabletState.layout)}"
      data-layout-mobile="${serializeLayout(mobileState.layout)}"
      style="grid-column: ${desktopState.layout.x} / span ${desktopState.layout.w}; grid-row: ${desktopState.layout.y} / span ${desktopState.layout.h};"
    >
      <div class="${BLOCK_ROOT_CLASS}"></div>

      <template data-variant="base">
${indentBlockTemplate(baseTemplate)}
      </template>

      <template data-variant="desktop">
${indentBlockTemplate(desktopTemplate)}
      </template>

      <template data-variant="tablet">
${indentBlockTemplate(tabletTemplate)}
      </template>

      <template data-variant="mobile">
${indentBlockTemplate(mobileTemplate)}
      </template>
    </div>`;
}

/**
 * ============================================
 * BLOCK: Runtime JS Generation
 * VERSION: 2.1.0
 * PURPOSE:
 * Сборка базового runtime JS, block registry и project-level JS.
 * ============================================
 */
function generateGoogleScriptMockJs(): string {
  return `(function () {
  if (!window.google) window.google = {};
  if (!window.google.script) window.google.script = {};

  if (!window.google.script.run) {
    const chain = {
      withSuccessHandler: function () { return this; },
      withFailureHandler: function () { return this; },
      withUserObject: function () { return this; }
    };

    window.google.script.run = new Proxy(chain, {
      get: function(target, prop) {
        if (prop in target) return target[prop];

        return function() {
          console.info(
            '[UI Builder Preview] google.script.run mock call:',
            String(prop),
            Array.from(arguments)
          );
          return target;
        };
      }
    });
  }
})();`;
}

function generateRuntimeJs(): string {
  return `(function () {
  'use strict';

  // ============================================
  // UI BUILDER RUNTIME JS
  // VERSION: 2.1.0
  // ROLE:
  // - определять текущий экран
  // - выбирать нужный HTML-вариант блока
  // - применять visibility и layout
  // - монтировать стабильный block DOM contract
  // - запускать block-specific JS
  // ============================================

  const BLOCK_REGISTRY = (window.UIBuilderBlockRegistry =
    window.UIBuilderBlockRegistry || {});

  const BLOCK_ROOT_CLASS = '${BLOCK_ROOT_CLASS}';
  const BLOCK_CONTENT_CLASS = '${BLOCK_CONTENT_CLASS}';

  function resolveScreen() {
    if (window.matchMedia('(max-width: 640px)').matches) return 'mobile';
    if (window.matchMedia('(max-width: 900px)').matches) return 'tablet';
    return 'desktop';
  }

  function parseLayout(value) {
    const fallback = { x: 1, y: 1, w: 1, h: 1 };

    if (!value || typeof value !== 'string') return fallback;

    const parts = value.split(';');
    const result = { ...fallback };

    parts.forEach(function (part) {
      const tokens = part.split(':');
      const key = tokens[0];
      const rawValue = tokens[1];
      const numericValue = Number(rawValue);

      if (!key || !Number.isFinite(numericValue)) return;

      if (key === 'x') result.x = numericValue;
      if (key === 'y') result.y = numericValue;
      if (key === 'w') result.w = numericValue;
      if (key === 'h') result.h = numericValue;
    });

    return result;
  }

  function readVisibility(blockElement, screen) {
    const attrName = 'visible' + screen.charAt(0).toUpperCase() + screen.slice(1);
    const value = blockElement.dataset[attrName];
    return value !== 'false';
  }

  function readLayout(blockElement, screen) {
    const attrName = 'layout' + screen.charAt(0).toUpperCase() + screen.slice(1);
    return parseLayout(blockElement.dataset[attrName]);
  }

  function resolveTemplate(blockElement, screen) {
    const exactTemplate = blockElement.querySelector(
      'template[data-variant="' + screen + '"]'
    );
    const baseTemplate = blockElement.querySelector('template[data-variant="base"]');

    if (exactTemplate && exactTemplate.innerHTML.trim()) {
      return exactTemplate.innerHTML;
    }

    if (baseTemplate && baseTemplate.innerHTML.trim()) {
      return baseTemplate.innerHTML;
    }

    return '';
  }

  function destroyBlockRuntime(blockElement) {
    if (typeof blockElement.__uiBuilderDestroy === 'function') {
      try {
        blockElement.__uiBuilderDestroy();
      } catch (error) {
        console.error('[UI Builder Runtime] destroy error:', error);
      }
    }

    blockElement.__uiBuilderDestroy = undefined;
  }

  function buildBlockContentHtml(blockElement, screen) {
    const resolvedHtml = resolveTemplate(blockElement, screen);
    return '<div class="' + BLOCK_CONTENT_CLASS + '">' + resolvedHtml + '</div>';
  }

  function mountBlock(blockElement, screen) {
    const blockId = blockElement.dataset.blockId || '';
    const root = blockElement.querySelector('.' + BLOCK_ROOT_CLASS);

    if (!root) return;

    destroyBlockRuntime(blockElement);

    const isVisible = readVisibility(blockElement, screen);
    blockElement.dataset.hidden = isVisible ? 'false' : 'true';

    if (!isVisible) {
      root.innerHTML = '';
      return;
    }

    const layout = readLayout(blockElement, screen);
    blockElement.style.gridColumn = layout.x + ' / span ' + layout.w;
    blockElement.style.gridRow = layout.y + ' / span ' + layout.h;

    root.innerHTML = buildBlockContentHtml(blockElement, screen);

    const initializer = BLOCK_REGISTRY[blockId];

    if (typeof initializer === 'function') {
      try {
        const cleanup = initializer({
          blockId: blockId,
          blockElement: blockElement,
          rootElement: root,
          contentElement: root.querySelector('.' + BLOCK_CONTENT_CLASS),
          screen: screen,
        });

        if (typeof cleanup === 'function') {
          blockElement.__uiBuilderDestroy = cleanup;
        }
      } catch (error) {
        console.error('[UI Builder Runtime] init error for block:', blockId, error);
      }
    }
  }

  function mountAllBlocks() {
    const screen = resolveScreen();
    const blocks = document.querySelectorAll('[data-block-id]');

    blocks.forEach(function (blockElement) {
      mountBlock(blockElement, screen);
    });
  }

  let resizeRaf = 0;

  function handleResize() {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(mountAllBlocks);
  }

  document.addEventListener('DOMContentLoaded', mountAllBlocks);
  window.addEventListener('resize', handleResize);
})();`;
}

function generateBlockRegistryJs(project: ExtendedProject): string {
  const registrationChunks = flattenProjectBlocks(project)
    .map((block) => {
      const runtimeJs = getBlockRuntime(block).javascript.trim();

      if (!runtimeJs) return '';

      const indentedRuntimeJs = indentRawCode(runtimeJs, 6);

      return `  // BLOCK JS: ${block.id}
  window.UIBuilderBlockRegistry['${escapeJavaScriptString(block.id)}'] = function initBlock(ctx) {
    const blockElement = ctx.blockElement;
    const rootElement = ctx.rootElement;
    const contentElement = ctx.contentElement;
    const screen = ctx.screen;
    const blockId = ctx.blockId;

    const cleanup = (function () {
${indentedRuntimeJs}
    })();

    return typeof cleanup === 'function' ? cleanup : undefined;
  };`;
    })
    .filter(Boolean)
    .join('\n\n');

  return `(function () {
  'use strict';

  // ============================================
  // BLOCK JS REGISTRY
  // ROLE:
  // Локальная логика блоков.
  // Позже легко выносится в отдельные js-файлы.
  // ============================================

  window.UIBuilderBlockRegistry = window.UIBuilderBlockRegistry || {};

${registrationChunks || '  // Нет block-specific JS в текущем проекте.'}
})();`;
}

function generateProjectCustomJs(customJs: string): string {
  const indentedCustomJs = indentRawCode(customJs, 2);

  return `(function () {
  'use strict';

  // ============================================
  // Project Custom JS
  // ============================================

${indentedCustomJs || '  '}
})();`;
}

/**
 * ============================================
 * BLOCK: HTML Document Builders
 * VERSION: 2.0.0
 * PURPOSE:
 * Генерация single-file и split-files вариантов итогового HTML.
 * ============================================
 */
function buildSingleFileHtml(resources: CompiledResources): string {
  const blockCssStyle = resources.blockCssRegistry.trim()
    ? `
  <style id="ui-builder-block-css">
${indentMultiline(resources.blockCssRegistry, 4)}
  </style>`
    : '';

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${resources.title}</title>

  <style id="ui-builder-runtime-css">
${indentMultiline(resources.runtimeCss, 4)}
  </style>${blockCssStyle}

  <script id="ui-builder-google-script-mock">
${indentMultiline(resources.googleScriptMockJs, 4)}
  </script>
</head>
<body>
  <div class="ui-page-root">
${indentMultiline(resources.body, 4)}
  </div>

  <script id="ui-builder-runtime-js">
${indentMultiline(resources.runtimeJs, 4)}
  </script>

  <script id="ui-builder-block-js">
${indentMultiline(resources.blockRegistryJs, 4)}
  </script>

  <script id="ui-builder-project-custom-js">
${indentMultiline(resources.projectCustomJs, 4)}
  </script>
</body>
</html>`;
}

function buildSplitIndexHtml(resources: CompiledResources): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${resources.title}</title>

  <link rel="stylesheet" href="./styles/runtime.css" />
  <link rel="stylesheet" href="./styles/blocks.css" />

  <script src="./scripts/google-script-mock.js"></script>
</head>
<body>
  <div class="ui-page-root">
${indentMultiline(resources.body, 4)}
  </div>

  <script src="./scripts/runtime.js"></script>
  <script src="./scripts/blocks.js"></script>
  <script src="./scripts/project.js"></script>
</body>
</html>`;
}

/**
 * ============================================
 * BLOCK: Bundle Packaging
 * VERSION: 2.0.0
 * PURPOSE:
 * Формирование состава файлов для split/single ZIP export.
 * ============================================
 */
function getExportMode(project: ExtendedProject): ExportMode {
  return project.exportConfig?.mode === 'split-files' ? 'split-files' : 'single-file';
}

function buildBundleFiles(project: ExtendedProject): Array<{ name: string; content: string }> {
  const resources = compileProjectResources(project);
  const exportMode = getExportMode(project);

  if (exportMode === 'split-files') {
    return [
      { name: 'index.html', content: buildSplitIndexHtml(resources) },
      { name: 'styles/runtime.css', content: resources.runtimeCss },
      { name: 'styles/blocks.css', content: resources.blockCssRegistry || '/* No block-specific CSS */' },
      { name: 'scripts/google-script-mock.js', content: resources.googleScriptMockJs },
      { name: 'scripts/runtime.js', content: resources.runtimeJs },
      { name: 'scripts/blocks.js', content: resources.blockRegistryJs },
      { name: 'scripts/project.js', content: resources.projectCustomJs },
      { name: 'project.json', content: JSON.stringify(project, null, 2) },
      ...project.files.map((file) => ({
        name: `files/${sanitizeFileName(file.name)}`,
        content: file.content || '',
      })),
    ];
  }

  return [
    { name: 'index.html', content: buildSingleFileHtml(resources) },
    { name: 'project.json', content: JSON.stringify(project, null, 2) },
    { name: 'custom/app.js', content: project.customLogic.javascript || '' },
    { name: 'custom/styles.css', content: project.customLogic.css || '' },
    ...project.files.map((file) => ({
      name: `files/${sanitizeFileName(file.name)}`,
      content: file.content || '',
    })),
  ];
}

/**
 * ============================================
 * BLOCK: Block Helpers
 * VERSION: 2.1.0
 * PURPOSE:
 * Извлечение runtime-данных блока для export.
 * ============================================
 */
function flattenProjectBlocks(project: Project): ExtendedBlock[] {
  return project.pages.flatMap((page) =>
    page.sections.flatMap((section) =>
      section.content.blocks.map((block) => block as ExtendedBlock)
    )
  );
}

function getBlockRuntime(block: ExtendedBlock): Required<BlockRuntimeConfig> {
  return {
    css: block.runtime?.css || '',
    javascript: block.runtime?.javascript || '',
  };
}

function getBlockScreenHtml(block: ExtendedBlock, viewMode: ViewMode): string {
  return block.responsive?.[viewMode]?.html || '';
}

function normalizeBlockMode(mode: unknown): SupportedBlockMode {
  return mode === 'scroll' ? 'scroll' : 'clip';
}

function serializeLayout(layout: { x: number; y: number; w: number; h: number }): string {
  return `x:${layout.x};y:${layout.y};w:${layout.w};h:${layout.h}`;
}

function indentBlockTemplate(value: string): string {
  const content = value || '';

  if (!content.trim()) {
    return '        ';
  }

  return indentMultiline(content, 8);
}

function indentRawCode(value: string, spaces: number): string {
  const content = value || '';

  if (!content.trim()) {
    return '';
  }

  return indentMultiline(content, spaces);
}

/**
 * ============================================
 * BLOCK: Escaping Utilities
 * VERSION: 1.1.0
 * PURPOSE:
 * Экранирование служебных строк, метаданных и имён файлов.
 * ============================================
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value).replaceAll(/\s+/g, '-');
}

function escapeJavaScriptString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

function sanitizeFileName(name: string): string {
  const sanitized = name
    .replace(/[/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_')
    .trim();

  return sanitized || 'file';
}

function indentMultiline(value: string, spaces: number): string {
  const padding = ' '.repeat(spaces);
  return (value || '')
    .split('\n')
    .map((line) => `${padding}${line}`)
    .join('\n');
}

function buildHtmlDownloadName(project: Project): string {
  const baseName = sanitizeFileName(project.meta.name || 'ui_builder_project');
  return baseName ? `${baseName}.html` : DEFAULT_HTML_FILENAME;
}

function buildZipDownloadName(project: Project): string {
  const baseName = sanitizeFileName(project.meta.name || 'ui_builder_project');
  return baseName ? `${baseName}.zip` : DEFAULT_ZIP_FILENAME;
}

/**
 * ============================================
 * BLOCK: ZIP Builder
 * VERSION: 1.0.0
 * PURPOSE:
 * Локальная сборка ZIP без внешних зависимостей.
 * ============================================
 */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (let i = 0; i < data.length; i += 1) {
    crc ^= data[i];

    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true);
}

function createZip(files: Array<{ name: string; content: string }>): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);

    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, 0);
    writeUint16(localView, 12, 0);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, data.length);
    writeUint32(localView, 22, data.length);
    writeUint16(localView, 26, nameBytes.length);
    writeUint16(localView, 28, 0);

    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);

    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, 0);
    writeUint16(centralView, 14, 0);
    writeUint32(centralView, 16, crc);
    writeUint32(centralView, 20, data.length);
    writeUint32(centralView, 24, data.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, localOffset);

    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    localOffset += localHeader.length + data.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);

  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);

  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralSize);
  writeUint32(endView, 16, localOffset);
  writeUint16(endView, 20, 0);

  const blobParts = [
    ...localParts.map((part) => part as unknown as BlobPart),
    ...centralParts.map((part) => part as unknown as BlobPart),
    endRecord as unknown as BlobPart,
  ];

  return new Blob(blobParts, { type: 'application/zip' });
}

/**
 * ============================================
 * BLOCK: Download Actions
 * VERSION: 2.0.0
 * PURPOSE:
 * Скачивание HTML и ZIP-бандла проекта.
 * ============================================
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}

export function downloadProjectBundle(project: Project): void {
  const extendedProject = project as ExtendedProject;
  const bundleFiles = buildBundleFiles(extendedProject);
  const zip = createZip(bundleFiles);

  downloadBlob(zip, buildZipDownloadName(project));
}

export function downloadHTML(project: Project): void {
  const html = generateHTML(project);
  const blob = new Blob([html], { type: 'text/html' });

  downloadBlob(blob, buildHtmlDownloadName(project));
}