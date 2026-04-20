/**
 * СИСТЕМА СТАНДАРТА HTML ИНТЕРФЕЙСА
 * Генератор HTML-экспорта
 * 
 * Этот модуль отвечает за преобразование внутренней модели проекта
 * в единый самодостаточный HTML-файл по строгому стандарту.
 */

import type { Project, Page, Section, Block, HeaderIsolator, ContentIsolator } from '@/types/project';

// ============================================
// ГЕНЕРАЦИЯ ПОЛНОГО HTML-ДОКУМЕНТА
// ============================================

export function generateHTML(project: Project): string {
  const { meta, designSystem, pages, customLogic } = project;
  
  const css = generateCSS(designSystem, customLogic.css);
  const body = pages.map((page) => generatePage(page)).join('\n');
  const js = generateJS(customLogic.javascript);
  
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${meta.name}</title>
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

// ============================================
// ГЕНЕРАЦИЯ CSS
// ============================================

function generateCSS(designSystem: Project['designSystem'], customCSS: string): string {
  const { colors, typography, spacing, grid } = designSystem;
  
  return `/* ============================================
   СИСТЕМА СТАНДАРТА HTML ИНТЕРФЕЙСА
   Автоматически сгенерировано UI Builder
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

html, body {
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
   ТИПОГРАФИКА
   ============================================ */

.h1 { font-size: ${typography.h1.fontSize}; font-weight: ${typography.h1.fontWeight}; }
.h2 { font-size: ${typography.h2.fontSize}; font-weight: ${typography.h2.fontWeight}; }
.h3 { font-size: ${typography.h3.fontSize}; font-weight: ${typography.h3.fontWeight}; }

.text-base  { font-size: ${typography.textBase.fontSize}; }
.text-small { 
  font-size: ${typography.textSmall.fontSize}; 
  color: var(--text-secondary); 
}

.font-medium { font-weight: 500; }
.font-bold   { font-weight: 700; }

/* ============================================
   ВНЕШНЯЯ СЕТКА: СЕКЦИИ И ИЗОЛЯТОРЫ
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
   ВНУТРЕННЯЯ МОДУЛЬНАЯ СЕТКА
   ============================================ */

.grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns), 1fr);
  grid-auto-rows: var(--grid-row);
  gap: var(--grid-gap);
}

/* Span Classes */
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
   БЛОКИ
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

/* ============================================
   ТИПЫ БЛОКОВ
   ============================================ */

/* block-info: Информационный блок */
.block-info {
  /* Использует базовые стили блока */
}

/* block-button: Интерактивная кнопка */
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

/* ============================================
   РЕЖИМЫ БЛОКОВ
   ============================================ */

/* clip: Стандартный режим (по умолчанию) */
.block-clip {
  /* Нет дополнительных стилей */
}

/* scroll: Прокрутка внутри блока */
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

/* auto: Автоматическая высота по содержимому */
.block-auto,
.block-grow {
  height: auto;
}

.block-auto .block-content,
.block-grow .block-content {
  height: auto;
}

/* ============================================
   ENDPOINT'Ы (ТОЧКИ РАСШИРЕНИЯ)
   ============================================ */

.header-endpoint,
.content-endpoint {
  position: relative;
}

/* ============================================
   ПОЛЬЗОВАТЕЛЬСКИЕ СТИЛИ
   ============================================ */

${customCSS}


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

// ============================================
// ГЕНЕРАЦИЯ СТРАНИЦЫ
// ============================================

function generatePage(page: Page): string {
  return page.sections.map((section) => generateSection(section)).join('\n\n');
}

// ============================================
// ГЕНЕРАЦИЯ СЕКЦИИ
// ============================================

function generateSection(section: Section): string {
  const header = generateHeaderIsolator(section.header);
  const content = generateContentIsolator(section.content);
  
  return `${header}

${content}`;
}

// ============================================
// ГЕНЕРАЦИЯ ЗАГОЛОВОЧНОГО ИЗОЛЯТОРА
// ============================================

function generateHeaderIsolator(header: HeaderIsolator): string {
  const hasEndpointHtml = Boolean(header.endpoint?.html?.trim());
  const endpointHtml = hasEndpointHtml
    ? `\n  <div class="section-header-content header-endpoint ${header.endpoint!.name}">\n    ${header.endpoint!.html}\n  </div>`
    : `\n  <div class="section-header-content">\n    <div class="h1">${escapeHtml(header.title)}</div>\n  </div>`;

  const endpointCss = header.endpoint?.css?.trim()
    ? `\n<style>\n${header.endpoint.css}\n</style>`
    : '';

  return `<!-- SECTION HEADER -->\n<div class="section-header-isolator">${endpointHtml}\n</div>${endpointCss}`;
}

// ============================================
// ГЕНЕРАЦИЯ КОНТЕНТНОГО ИЗОЛЯТОРА
// ============================================

function generateContentIsolator(content: ContentIsolator): string {
  const blocksHtml = content.blocks.map((block) => generateBlock(block)).join('\n    ');
  
  const endpointHtml = content.endpoint?.html?.trim()
    ? `\n  <div class="content-endpoint ${content.endpoint.name}">\n    ${content.endpoint.html}\n  </div>`
    : '';

  const endpointCss = content.endpoint?.css?.trim()
    ? `\n<style>\n${content.endpoint.css}\n</style>`
    : '';

  return `<!-- SECTION CONTENT -->\n<div class="section-content-isolator">\n  <div class="grid">\n    ${blocksHtml}\n  </div>${endpointHtml}\n</div>${endpointCss}`;
}

// ============================================
// ГЕНЕРАЦИЯ БЛОКА
// ============================================

function generateBlock(block: Block): string {
  const modeClass = block.mode !== 'clip' ? ` block-${block.mode}` : '';
  const classes = `block ${block.type}${modeClass}`;
  const tag = block.type === 'block-button' ? 'button' : 'div';
  const typeAttr = block.type === 'block-button' ? ' type="button"' : '';
  
  // Генерируем комментарий документации
  const comment = `<!-- BLOCK: ${escapeHtml(block.content.text || 'Untitled')} | TYPE: ${block.type} | SIZE: span-${block.span} row-span-${block.rowSpan} | MODE: ${block.mode} -->`;
  
  const styleAttr = ` style="grid-column: span ${block.span}; grid-row: span ${block.rowSpan};"`;
  return `${comment}\n    <${tag} class="${classes}"${typeAttr}${styleAttr}>\n      <div class="block-content">\n        ${block.content.html}\n      </div>\n    </${tag}>`;
}

// ============================================
// ГЕНЕРАЦИЯ JAVASCRIPT
// ============================================

function generateJS(customJS: string): string {
  return `(function() {
  'use strict';
  
  // ============================================
  // СИСТЕМА СТАНДАРТА HTML ИНТЕРФЕЙСА
  // Автоматически сгенерировано UI Builder
  // ============================================
  
  // Инициализация при загрузке DOM
  document.addEventListener('DOMContentLoaded', function() {
    initializeBlocks();
  });
  
  function initializeBlocks() {
    // Инициализация кнопок
    const buttons = document.querySelectorAll('.block-button');
    buttons.forEach(function(button) {
      button.addEventListener('click', function(e) {
        // Базовая обработка клика
        console.log('Button clicked:', e.currentTarget);
      });
    });
  }
  
  // ============================================
  // ПОЛЬЗОВАТЕЛЬСКАЯ ЛОГИКА
  // ============================================
  
${customJS.split('\n').map(line => '  ' + line).join('\n')}
  
})();`;
}

// ============================================
// УТИЛИТЫ
// ============================================

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


function sanitizeFileName(name: string): string {
  return name.replace(/[/:*?"<>|]+/g, '-').replace(/\s+/g, '_');
}

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

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
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

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
  downloadBlob(zip, `${project.meta.name.replace(/\s+/g, '_') || 'ui_builder_project'}.zip`);
}

// ============================================
// ЭКСПОРТ ФАЙЛА
// ============================================

export function downloadHTML(project: Project): void {
  const html = generateHTML(project);
  const blob = new Blob([html], { type: 'text/html' });
  downloadBlob(blob, `${project.meta.name.replace(/\s+/g, '_')}.html`);
}


export function resolveProjectHtml(project: Project): string {
  const override = project.customLogic?.htmlOverride?.trim();
  return override ? override : generateHTML(project);
}
