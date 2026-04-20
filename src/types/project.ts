/**
 * СИСТЕМА СТАНДАРТА HTML ИНТЕРФЕЙСА
 * Внутренний формат проекта UI Builder
 */

// ============================================
// БАЗОВЫЕ ТИПЫ
// ============================================

export type BlockType = 'block-info' | 'block-button';
export type LibraryCategoryId = 'base' | 'custom';
export type BlockMode = 'clip' | 'scroll' | 'auto' | 'grow';
export type SpanValue = number;
export type RowSpanValue = number;

export const MIN_BLOCK_SPAN = 1;
export const MAX_BLOCK_SPAN = 6;
export const MIN_BLOCK_ROW_SPAN = 1;
export const MAX_BLOCK_ROW_SPAN = 30;

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeSpan(value: number): SpanValue {
  return clampNumber(value, MIN_BLOCK_SPAN, MAX_BLOCK_SPAN);
}

export function normalizeRowSpan(value: number): RowSpanValue {
  return clampNumber(value, MIN_BLOCK_ROW_SPAN, MAX_BLOCK_ROW_SPAN);
}

export function normalizeBlockMode(value?: string): BlockMode {
  return value === 'scroll' || value === 'auto' || value === 'grow' ? value : 'clip';
}

export function normalizeBlockType(value?: string): BlockType {
  return value === 'block-button' ? 'block-button' : 'block-info';
}

// ============================================
// МЕТАИНФОРМАЦИЯ ПРОЕКТА
// ============================================

export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  version: string;
}

// ============================================
// ДИЗАЙН-СИСТЕМА
// ============================================

export interface DesignSystem {
  colors: ColorSystem;
  typography: TypographySystem;
  spacing: SpacingSystem;
  grid: GridSystem;
}

export interface ColorSystem {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgBorder: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
}

export interface TypographySystem {
  h1: TypographyStyle;
  h2: TypographyStyle;
  h3: TypographyStyle;
  textBase: TypographyStyle;
  textSmall: TypographyStyle;
}

export interface TypographyStyle {
  fontSize: string;
  fontWeight: number;
  color?: string;
}

export interface SpacingSystem {
  blockPadding: number;
  gridGap: number;
}

export interface GridSystem {
  maxWidth: number;
  columns: number;
  gap: number;
  rowHeight: number;
  headerHeight: number;
}

// ============================================
// СТРУКТУРА СТРАНИЦЫ
// ============================================

export interface Page {
  id: string;
  name: string;
  order: number;
  sections: Section[];
}

export interface Section {
  id: string;
  name: string;
  description: string;
  order: number;
  header: HeaderIsolator;
  content: ContentIsolator;
}

export interface HeaderIsolator {
  id: string;
  name: string;
  description: string;
  title: string;
  endpoint?: HeaderEndpoint;
}

export interface ContentIsolator {
  id: string;
  name: string;
  description: string;
  blocks: Block[];
  endpoint?: ContentEndpoint;
}

// ============================================
// ENDPOINT'Ы (ТОЧКИ РАСШИРЕНИЯ)
// ============================================

export interface HeaderEndpoint {
  id: string;
  name: string;
  purpose: string;
  html: string;
  css: string;
}

export interface ContentEndpoint {
  id: string;
  name: string;
  purpose: string;
  html: string;
  css: string;
}


export function createDefaultHeaderEndpoint(title = 'Новая секция'): HeaderEndpoint {
  return {
    id: 'header-endpoint-default',
    name: 'header-slot',
    purpose: 'Кастомный HTML для header секции',
    html: `<div class="h1">${title}</div>`,
    css: '',
  };
}

export function createDefaultContentEndpoint(): ContentEndpoint {
  return {
    id: 'content-endpoint-default',
    name: 'content-slot',
    purpose: 'Кастомный HTML для content области секции',
    html: '',
    css: '',
  };
}

// ============================================
// БЛОКИ
// ============================================

export interface Block {
  id: string;
  name: string;
  description: string;
  type: BlockType;
  span: SpanValue;
  rowSpan: RowSpanValue;
  mode: BlockMode;
  content: BlockContent;
  bindings?: Binding[];
  customClasses?: string[];
  customAttributes?: Record<string, string>;
}

export interface BlockContent {
  html: string;
  text?: string;
  children?: BlockChild[];
}

export interface BlockChild {
  id: string;
  type: 'text' | 'heading' | 'icon' | 'group' | 'custom';
  content: string;
  style?: Record<string, string>;
}

export function normalizeBlock<T extends Partial<Block>>(block: T): T & Pick<Block, 'name' | 'description' | 'type' | 'span' | 'rowSpan' | 'mode'> {
  return {
    ...block,
    name: typeof block.name === 'string' && block.name.trim() ? block.name : 'Блок',
    description: typeof block.description === 'string' ? block.description : '',
    type: normalizeBlockType(block.type),
    span: normalizeSpan(Number(block.span ?? 1)),
    rowSpan: normalizeRowSpan(Number(block.rowSpan ?? 1)),
    mode: normalizeBlockMode(block.mode),
  };
}

// ============================================
// БИБЛИОТЕКА КОМПОНЕНТОВ
// ============================================

export interface ComponentLibrary {
  categories: ComponentCategory[];
  blocks: LibraryBlock[];
}

export interface ComponentCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export interface LibraryBlock {
  id: string;
  categoryId: LibraryCategoryId;
  name: string;
  description: string;
  preview: string;
  block: Block;
}

// ============================================
// ЛОГИКА И ПРИВЯЗКИ
// ============================================

export interface CustomLogic {
  javascript: string;
  css: string;
  htmlOverride: string;
  handlers: EventHandler[];
}

export interface ProjectFile {
  id: string;
  name: string;
  type: 'html' | 'gs';
  content: string;
  description?: string;
  isEntry?: boolean;
}

export interface EventHandler {
  id: string;
  blockId: string;
  event: string;
  handler: string;
}

export interface Binding {
  id: string;
  blockId: string;
  type: 'event' | 'data' | 'state';
  target: string;
  action: string;
}

// ============================================
// АССЕТЫ
// ============================================

export interface Asset {
  id: string;
  type: 'image' | 'svg' | 'font';
  name: string;
  data: string;
}

// ============================================
// КОНФИГУРАЦИЯ ЭКСПОРТА
// ============================================

export interface ExportConfig {
  format: 'html';
  includeAssets: boolean;
  minify: boolean;
  inlineStyles: boolean;
  inlineScripts: boolean;
}

// ============================================
// ПОЛНЫЙ ПРОЕКТ
// ============================================

export interface Project {
  meta: ProjectMeta;
  designSystem: DesignSystem;
  pages: Page[];
  componentLibrary: ComponentLibrary;
  assets: Asset[];
  customLogic: CustomLogic;
  files: ProjectFile[];
  bindings: Binding[];
  exportConfig: ExportConfig;
}

// ============================================
// СОСТОЯНИЕ РЕДАКТОРА
// ============================================

export interface EditorState {
  project: Project;
  selectedElement: SelectedElement | null;
  hoveredElement: string | null;
  mode: 'edit' | 'preview' | 'code';
  viewMode: 'desktop' | 'tablet' | 'mobile';
  zoom: number;
  showGrid: boolean;
  showGuides: boolean;
  undoStack: Project[];
  redoStack: Project[];
  activePanel: 'library' | 'properties' | 'code' | 'assets';
  codeTab: 'javascript' | 'css' | 'generated' | 'html' | 'appsScript';
}

export interface SelectedElement {
  type: 'page' | 'section' | 'header' | 'content' | 'block' | 'endpoint';
  id: string;
  parentId?: string;
}

// ============================================
// СТАНДАРТНЫЕ ЗНАЧЕНИЯ
// ============================================

export const DEFAULT_GRID_SYSTEM: GridSystem = {
  maxWidth: 900,
  columns: 6,
  gap: 12,
  rowHeight: 22,
  headerHeight: 88,
};

export const DEFAULT_COLOR_SYSTEM: ColorSystem = {
  bgPrimary: '#111111',
  bgSecondary: '#1A1A1C',
  bgTertiary: '#272728',
  bgBorder: '#313133',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  accent: '#2A80F4',
  success: '#02D15C',
  warning: '#FCA400',
  error: '#FF4053',
};

export const DEFAULT_TYPOGRAPHY: TypographySystem = {
  h1: { fontSize: '28px', fontWeight: 600 },
  h2: { fontSize: '22px', fontWeight: 600 },
  h3: { fontSize: '18px', fontWeight: 600 },
  textBase: { fontSize: '16px', fontWeight: 400 },
  textSmall: { fontSize: '14px', fontWeight: 400, color: '#B0B0B0' },
};
