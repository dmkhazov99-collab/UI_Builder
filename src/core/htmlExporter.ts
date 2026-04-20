/**
 * ============================================
 * MODULE: HTML Export Pipeline
 * VERSION: 1.2.0
 * ROLE:
 * Единый pipeline генерации runtime/export HTML для UI Builder.
 *
 * RESPONSIBILITIES:
 * - собрать полный HTML-документ из Project
 * - собрать CSS из design system
 * - собрать JS runtime и пользовательскую логику
 * - подготовить HTML для preview/export
 * - сформировать ZIP-бандл проекта
 *
 * DEPENDS ON:
 * - Project domain model
 * - Page / Section / Block / HeaderIsolator / ContentIsolator
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
 *
 * SECURITY:
 * - block/content/header endpoint HTML считается trusted-only
 * - custom JS/CSS считается trusted-only
 * - метаданные и служебные поля экранируются
 * ============================================
 */

import type {
  Block,
  ContentIsolator,
  HeaderIsolator,
  Page,
  Project,
  Section,
} from '@/types/project';

/**
 * ============================================
 * BLOCK: Shared Constants
 * VERSION: 1.0.0
 * PURPOSE:
 * Общие служебные значения модуля.
 * ============================================
 */
const DEFAULT_HTML_FILENAME = 'ui_builder_project.html';
const DEFAULT_ZIP_FILENAME = 'ui_builder_project.zip';

/**
 * ============================================
 * BLOCK: Public HTML API
 * VERSION: 1.1.0
 * PURPOSE:
 * Публичные функции для генерации и резолва итогового HTML.
 * ============================================
 */
export function generateHTML(project: Project): string {
  const { meta, designSystem, pages, customLogic } = project;

  const css = generateCSS(designSystem, customLogic.css);
  const body = pages.map((page) => generatePage(page)).join('\n\n');
  const js = generateJS(customLogic.javascript);
  const title = escapeHtml(meta.name || 'UI Builder Project');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
${css}
  </style>
</head>
<body>

${body}

<script>
${js}
</script>
</body>
</html>`;
}

export function resolveProjectHtml(project: Project): string {
  const override = project.customLogic?.htmlOverride?.trim();
  return override ? override : generateHTML(project);
}

/**
 * ============================================
 * BLOCK: CSS Generation
 * VERSION: 1.1.0
 * PURPOSE:
 * Генерация полного inline CSS для runtime/export документа.
 * ============================================
 */
function generateCSS(
  designSystem: Project['designSystem'],
  customCSS: string
): string {
  const { colors, typography, spacing, grid } = designSystem;

  return `/* ============================================
   UI BUILDER RUNTIME CSS
   VERSION: 1.1.0
   ============================================ */

:root {
  /* Grid System */
  --max-width: ${grid.maxWidth}px;
  --header-height: ${grid.headerHeight}px;
  --grid-columns: ${grid.columns};
  --grid-gap: ${grid.gap}px;
  --grid-row: ${grid.rowHeight}px;
  --block-padding: ${spacing.blockPadding}px;

  /* Colors */
  --bg-primary: ${colors.bgPrimary};
  --bg-secondary: ${colors.bgSecondary};
  --bg-tertiary: ${colors.bgTertiary};
  --bg-border: ${colors.bgBorder};
  --text-primary: ${colors.textPrimary};
  --text-secondary: ${colors.textSecondary};
  --accent: ${colors.accent};
  --success: ${colors.success};
  --warning: ${colors.warning};
  --error: ${colors.error};
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
}

body {
  min-height: 100vh;
  padding-bottom: 48px;
}

* {
  scrollbar-width: thin;
  scrollbar-color: rgba(109, 144, 214, 0.55) rgba(9, 13, 20, 0.25);
}

*::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

*::-webkit-scrollbar-track {
  background: rgba(9, 13, 20, 0.25);
  border-radius: 999px;
}

*::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(93, 140, 227, 0.78), rgba(65, 105, 180, 0.78));
  border: 2px solid rgba(9, 13, 20, 0.25);
  border-radius: 999px;
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
  grid-template-columns: repeat(var(--grid-columns), 1fr);
  grid-auto-rows: var(--grid-row);
  gap: var(--grid-gap);
}

.span-1 { grid-column: span 1; }
.span-2 { grid-column: span 2; }
.span-3 { grid-column: span 3; }
.span-4 { grid-column: span 4; }
.span-5 { grid-column: span 5; }
.span-6 { grid-column: span 6; }

.row-span-1 { grid-row: span 1; }
.row-span-2 { grid-row: span 2; }
.row-span-3 { grid-row: span 3; }
.row-span-4 { grid-row: span 4; }
.row-span-5 { grid-row: span 5; }
.row-span-6 { grid-row: span 6; }

/* ============================================
   Block Base
   ============================================ */

.block {
  display: flex;
  flex-direction: column;
  width: 100%;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--bg-border);
  border-radius: 12px;
}

.block-content {
  padding: var(--block-padding);
  height: 100%;
  box-sizing: border-box;
}

/* block-info */
.block-info {
  /* Base block styles only */
}

/* block-button */
.block-button {
  cursor: pointer;
  justify-content: center;
  align-items: center;
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
  /* Default mode */
}

.block-scroll .block-content {
  overflow-y: auto;
  overflow-x: hidden;
}

.block-button .block-content {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  word-break: break-word;
  overflow: hidden;
  white-space: normal;
}

.block-auto,
.block-grow {
  height: auto;
}

.block-auto .block-content,
.block-grow .block-content {
  height: auto;
}

/* Extension points */
.header-endpoint,
.content-endpoint {
  position: relative;
}

/* ============================================
   Custom CSS (trusted-only)
   ============================================ */

${customCSS || ''}

@media (max-width: 900px) {
  :root {
    --max-width: min(100vw - 24px, var(--max-width));
    --grid-gap: 8px;
    --block-padding: 10px;
  }

  .grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  :root {
    --grid-gap: 6px;
    --grid-row: 20px;
  }
}
`;
}

/**
 * ============================================
 * BLOCK: Markup Generation
 * VERSION: 1.1.0
 * PURPOSE:
 * Сборка страницы, секции, изоляторов и блоков.
 * ============================================
 */
function generatePage(page: Page): string {
  return page.sections.map((section) => generateSection(section)).join('\n\n');
}

function generateSection(section: Section): string {
  const header = generateHeaderIsolator(section.header);
  const content = generateContentIsolator(section.content);

  return `${header}

${content}`;
}

function generateHeaderIsolator(header: HeaderIsolator): string {
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
<div class="section-header-isolator">${endpointHtml}
</div>${endpointCss}`;
}

function generateContentIsolator(content: ContentIsolator): string {
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
<div class="section-content-isolator">
  <div class="grid">
    ${blocksHtml}
  </div>${endpointHtml}
</div>${endpointCss}`;
}

function generateBlock(block: Block): string {
  const modeClass = block.mode !== 'clip' ? ` block-${block.mode}` : '';
  const classes = `block ${block.type}${modeClass}`;
  const tag = block.type === 'block-button' ? 'button' : 'div';
  const typeAttr = block.type === 'block-button' ? ' type="button"' : '';
  const blockLabel = escapeHtml(block.content.text || block.name || 'Untitled');
  const comment = `<!-- BLOCK: ${blockLabel} | TYPE: ${block.type} | SIZE: span-${block.span} row-span-${block.rowSpan} | MODE: ${block.mode} -->`;
  const styleAttr = ` style="grid-column: span ${block.span}; grid-row: span ${block.rowSpan};"`;

  return `${comment}
    <${tag} class="${classes}"${typeAttr}${styleAttr}>
      <div class="block-content">
        ${block.content.html}
      </div>
    </${tag}>`;
}

/**
 * ============================================
 * BLOCK: Runtime JS Generation
 * VERSION: 1.0.0
 * PURPOSE:
 * Сборка базового runtime JS и пользовательской логики.
 * ============================================
 */
function generateJS(customJS: string): string {
  const indentedCustomJS = (customJS || '')
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

  return `(function() {
  'use strict';

  // ============================================
  // UI BUILDER RUNTIME JS
  // VERSION: 1.0.0
  // ============================================

  document.addEventListener('DOMContentLoaded', function() {
    initializeBlocks();
  });

  function initializeBlocks() {
    const buttons = document.querySelectorAll('.block-button');

    buttons.forEach(function(button) {
      button.addEventListener('click', function(event) {
        console.log('Button clicked:', event.currentTarget);
      });
    });
  }

  // ============================================
  // Custom JS (trusted-only)
  // ============================================

${indentedCustomJS}

})();`;
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

function sanitizeFileName(name: string): string {
  const sanitized = name
    .replace(/[/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_')
    .trim();

  return sanitized || 'file';
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
 * VERSION: 1.1.0
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
  const bundleFiles = [
    { name: 'index.html', content: generateHTML(project) },
    { name: 'project.json', content: JSON.stringify(project, null, 2) },
    { name: 'custom/app.js', content: project.customLogic.javascript || '' },
    { name: 'custom/styles.css', content: project.customLogic.css || '' },
    ...project.files.map((file) => ({
      name: `files/${sanitizeFileName(file.name)}`,
      content: file.content || '',
    })),
  ];

  const zip = createZip(bundleFiles);
  downloadBlob(zip, buildZipDownloadName(project));
}

export function downloadHTML(project: Project): void {
  const html = generateHTML(project);
  const blob = new Blob([html], { type: 'text/html' });

  downloadBlob(blob, buildHtmlDownloadName(project));
}