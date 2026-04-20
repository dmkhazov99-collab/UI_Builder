/**
 * ============================================
 * MODULE: Project Domain Model
 * VERSION: 1.3.0
 * ROLE:
 * Единая доменная схема UI Builder проекта.
 *
 * RESPONSIBILITIES:
 * - описывать структуру Project
 * - задавать типы builder-сущностей
 * - предоставлять базовые нормализаторы
 * - хранить стандартные design-system значения
 *
 * DEPENDS ON:
 * - none
 *
 * USED BY:
 * - projectStore
 * - Canvas
 * - PropertiesPanel
 * - htmlExporter
 * - persistence layer
 *
 * RULES:
 * - доменные типы должны оставаться стабильными
 * - helper-функции не должны содержать UI/runtime логики
 * - нормализаторы должны быть pure
 *
 * SECURITY:
 * - файл описывает только контракт данных
 * - не содержит исполнения пользовательского кода
 * ============================================
 */

/**
 * ============================================
 * BLOCK: Primitive Domain Types
 * VERSION: 1.0.0
 * PURPOSE:
 * Базовые типы builder-домена.
 * ============================================
 */
export type BlockType = 'block-info' | 'block-button' | 'block-placeholder';
export type LibraryCategoryId = 'base' | 'custom';
export type BlockMode = 'clip' | 'scroll' | 'auto' | 'grow';
export type SpanValue = number;
export type RowSpanValue = number;

/**
 * ============================================
 * BLOCK: Block Size Limits
 * VERSION: 1.0.0
 * PURPOSE:
 * Ограничения размеров builder-блоков.
 * ============================================
 */
export const MIN_BLOCK_SPAN = 1;
export const MAX_BLOCK_SPAN = 6;
export const MIN_BLOCK_ROW_SPAN = 1;
export const MAX_BLOCK_ROW_SPAN = 30;

/**
 * ============================================
 * BLOCK: Numeric Normalization
 * VERSION: 1.0.0
 * PURPOSE:
 * Унификация числовых значений builder-структуры.
 * ============================================
 */
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
  if (value === 'block-button') return 'block-button';
  if (value === 'block-placeholder') return 'block-placeholder';
  return 'block-info';
}

/**
 * ============================================
 * BLOCK: Project Metadata
 * VERSION: 1.0.0
 * PURPOSE:
 * Метаданные проекта.
 * ============================================
 */
export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  version: string;
}

/**
 * ============================================
 * BLOCK: Design System
 * VERSION: 1.0.0
 * PURPOSE:
 * Контракт визуальной системы проекта.
 * ============================================
 */
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

/**
 * ============================================
 * BLOCK: Page Structure
 * VERSION: 1.0.0
 * PURPOSE:
 * Основная иерархия страницы builder-проекта.
 * ============================================
 */
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

/**
 * ============================================
 * BLOCK: Extension Endpoints
 * VERSION: 1.0.0
 * PURPOSE:
 * Точки расширения header/content областей.
 * ============================================
 */
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

/**
 * ============================================
 * BLOCK: Blocks
 * VERSION: 1.1.0
 * PURPOSE:
 * Контракт builder-блоков и их содержимого.
 * ============================================
 */
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

export function normalizeBlock<T extends Partial<Block>>(
  block: T
): T &
  Pick<Block, 'name' | 'description' | 'type' | 'span' | 'rowSpan' | 'mode'> {
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

/**
 * ============================================
 * BLOCK: Component Library
 * VERSION: 1.0.0
 * PURPOSE:
 * Пользовательская и базовая библиотека блоков.
 * ============================================
 */
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

/**
 * ============================================
 * BLOCK: Custom Logic And Bindings
 * VERSION: 1.0.0
 * PURPOSE:
 * Пользовательская логика, файлы и data/event bindings.
 * ============================================
 */
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

/**
 * ============================================
 * BLOCK: Assets
 * VERSION: 1.0.0
 * PURPOSE:
 * Встроенные проектные ассеты.
 * ============================================
 */
export interface Asset {
  id: string;
  type: 'image' | 'svg' | 'font';
  name: string;
  data: string;
}

/**
 * ============================================
 * BLOCK: Export Configuration
 * VERSION: 1.0.0
 * PURPOSE:
 * Настройки итогового export pipeline.
 * ============================================
 */
export interface ExportConfig {
  format: 'html';
  includeAssets: boolean;
  minify: boolean;
  inlineStyles: boolean;
  inlineScripts: boolean;
}

/**
 * ============================================
 * BLOCK: Root Project Contract
 * VERSION: 1.0.0
 * PURPOSE:
 * Полный контракт проекта UI Builder.
 * ============================================
 */
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

/**
 * ============================================
 * BLOCK: Editor State
 * VERSION: 1.0.0
 * PURPOSE:
 * Состояние runtime-редактора поверх Project.
 * ============================================
 */
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

/**
 * ============================================
 * BLOCK: Default Design System Values
 * VERSION: 1.0.0
 * PURPOSE:
 * Стандартные значения builder design system.
 * ============================================
 */
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