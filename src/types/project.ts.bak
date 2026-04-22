/**
 * ============================================
 * MODULE: Project Domain Model
 * VERSION: 2.0.0
 * ROLE:
 * Единая доменная схема UI Builder проекта.
 *
 * RESPONSIBILITIES:
 * - описывать структуру Project
 * - задавать типы builder-сущностей
 * - предоставлять базовые нормализаторы
 * - хранить стандартные design-system значения
 * - закладывать responsive block model для desktop / tablet / mobile
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
 * - один block остаётся одной сущностью для всех экранов
 * - разные экраны используют base state + screen overrides
 *
 * SECURITY:
 * - файл описывает только контракт данных
 * - не содержит исполнения пользовательского кода
 * ============================================
 */

/**
 * ============================================
 * BLOCK: Primitive Domain Types
 * VERSION: 2.0.0
 * PURPOSE:
 * Базовые типы builder-домена.
 * ============================================
 */
export type BlockType = 'block-info' | 'block-button' | 'block-placeholder';
export type LibraryCategoryId = 'base' | 'custom';
export type BlockMode = 'clip' | 'scroll' | 'auto' | 'grow';
export type ViewMode = 'desktop' | 'tablet' | 'mobile';
export type ExportMode = 'single-file' | 'split-files';
export type SpanValue = number;
export type RowSpanValue = number;

export const VIEW_MODES: ViewMode[] = ['desktop', 'tablet', 'mobile'];
export const DEFAULT_VIEW_MODE: ViewMode = 'desktop';

/**
 * ============================================
 * BLOCK: Block Size And Layout Limits
 * VERSION: 2.0.0
 * PURPOSE:
 * Ограничения размеров и координат builder-блоков.
 * ============================================
 */
export const MIN_BLOCK_SPAN = 1;
export const MAX_BLOCK_SPAN = 6;
export const MIN_BLOCK_ROW_SPAN = 1;
export const MAX_BLOCK_ROW_SPAN = 30;
export const MIN_BLOCK_X = 1;
export const MAX_BLOCK_X = 6;
export const MIN_BLOCK_Y = 1;
export const MAX_BLOCK_Y = 999;

/**
 * ============================================
 * BLOCK: Numeric Normalization
 * VERSION: 2.0.0
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

export function normalizeViewMode(value?: string): ViewMode {
  return value === 'tablet' || value === 'mobile' ? value : 'desktop';
}

export function normalizeExportMode(value?: string): ExportMode {
  return value === 'split-files' ? 'split-files' : 'single-file';
}

function normalizeOptionalNumber(
  value: unknown,
  min: number,
  max: number
): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return undefined;

  return clampNumber(numericValue, min, max);
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
 * VERSION: 2.0.0
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

export interface ProjectTheme {
  dark?: Partial<ColorSystem>;
  light?: Partial<ColorSystem>;
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
 * BLOCK: Responsive Block Model
 * VERSION: 2.0.0
 * PURPOSE:
 * Контракт независимого layout/content/visibility одного блока
 * для desktop / tablet / mobile.
 * ============================================
 */
export interface BlockLayout {
  x: number;
  y: number;
  w: SpanValue;
  h: RowSpanValue;
}

export interface BlockRuntime {
  css: string;
  javascript: string;
}

export interface BlockScreenOverride {
  html?: string;
  visible?: boolean;
  layout?: Partial<BlockLayout>;
}

export type BlockResponsiveConfig = Partial<Record<ViewMode, BlockScreenOverride>>;

export interface ResolvedBlockViewState {
  viewMode: ViewMode;
  visible: boolean;
  html: string;
  text: string;
  mode: BlockMode;
  layout: BlockLayout;
}

export const DEFAULT_BLOCK_LAYOUT: BlockLayout = {
  x: 1,
  y: 1,
  w: 2,
  h: 3,
};

export const DEFAULT_BLOCK_VISIBLE = true;

export const DEFAULT_BLOCK_RUNTIME: BlockRuntime = {
  css: '',
  javascript: '',
};

export function normalizeBlockLayout(
  value?: Partial<BlockLayout>,
  fallback: Partial<BlockLayout> = DEFAULT_BLOCK_LAYOUT
): BlockLayout {
  const fallbackX =
    normalizeOptionalNumber(fallback.x, MIN_BLOCK_X, MAX_BLOCK_X) ?? DEFAULT_BLOCK_LAYOUT.x;
  const fallbackY =
    normalizeOptionalNumber(fallback.y, MIN_BLOCK_Y, MAX_BLOCK_Y) ?? DEFAULT_BLOCK_LAYOUT.y;
  const fallbackW = normalizeSpan(Number(fallback.w ?? DEFAULT_BLOCK_LAYOUT.w));
  const fallbackH = normalizeRowSpan(Number(fallback.h ?? DEFAULT_BLOCK_LAYOUT.h));

  const x = normalizeOptionalNumber(value?.x, MIN_BLOCK_X, MAX_BLOCK_X) ?? fallbackX;
  const y = normalizeOptionalNumber(value?.y, MIN_BLOCK_Y, MAX_BLOCK_Y) ?? fallbackY;
  const maxWidthForX = MAX_BLOCK_SPAN - x + 1;
  const w = clampNumber(
    Number(value?.w ?? fallbackW),
    MIN_BLOCK_SPAN,
    Math.max(MIN_BLOCK_SPAN, maxWidthForX)
  );
  const h = normalizeRowSpan(Number(value?.h ?? fallbackH));

  return {
    x,
    y,
    w,
    h,
  };
}

export function normalizeBlockLayoutOverride(
  value?: Partial<BlockLayout>
): Partial<BlockLayout> | undefined {
  if (!value) return undefined;

  const x = normalizeOptionalNumber(value.x, MIN_BLOCK_X, MAX_BLOCK_X);
  const y = normalizeOptionalNumber(value.y, MIN_BLOCK_Y, MAX_BLOCK_Y);
  const maxWidthForX = MAX_BLOCK_SPAN - (x ?? MIN_BLOCK_X) + 1;
  const w = normalizeOptionalNumber(value.w, MIN_BLOCK_SPAN, Math.max(MIN_BLOCK_SPAN, maxWidthForX));
  const h = normalizeOptionalNumber(value.h, MIN_BLOCK_ROW_SPAN, MAX_BLOCK_ROW_SPAN);

  const normalized: Partial<BlockLayout> = {};

  if (x !== undefined) normalized.x = x;
  if (y !== undefined) normalized.y = y;
  if (w !== undefined) normalized.w = w;
  if (h !== undefined) normalized.h = h;

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function normalizeBlockRuntime(value?: Partial<BlockRuntime>): BlockRuntime {
  return {
    css: typeof value?.css === 'string' ? value.css : '',
    javascript: typeof value?.javascript === 'string' ? value.javascript : '',
  };
}

export function normalizeBlockScreenOverride(
  value?: Partial<BlockScreenOverride>
): BlockScreenOverride | undefined {
  if (!value) return undefined;

  const normalized: BlockScreenOverride = {};

  if (typeof value.html === 'string') {
    normalized.html = value.html;
  }

  if (typeof value.visible === 'boolean') {
    normalized.visible = value.visible;
  }

  const normalizedLayout = normalizeBlockLayoutOverride(value.layout);
  if (normalizedLayout) {
    normalized.layout = normalizedLayout;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function normalizeBlockResponsiveConfig(
  value?: Partial<Record<ViewMode, Partial<BlockScreenOverride>>>
): BlockResponsiveConfig | undefined {
  if (!value) return undefined;

  const normalized: BlockResponsiveConfig = {};

  VIEW_MODES.forEach((viewMode) => {
    const override = normalizeBlockScreenOverride(value[viewMode]);
    if (override) {
      normalized[viewMode] = override;
    }
  });

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function hasBlockScreenOverride(
  block: Pick<Block, 'responsive'>,
  viewMode: ViewMode
): boolean {
  const override = block.responsive?.[viewMode];

  return Boolean(
    override &&
      (typeof override.html === 'string' ||
        typeof override.visible === 'boolean' ||
        (override.layout && Object.keys(override.layout).length > 0))
  );
}

/**
 * ============================================
 * BLOCK: Blocks
 * VERSION: 2.0.0
 * PURPOSE:
 * Контракт builder-блоков и их содержимого.
 *
 * NOTES:
 * - content.html остаётся base HTML по умолчанию
 * - span / rowSpan остаются transitional mirror layout.w / layout.h
 * - responsive хранит screen-specific overrides
 * - runtime хранит локальный CSS и JS блока
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
  visible?: boolean;
  layout?: BlockLayout;
  runtime?: BlockRuntime;
  content: BlockContent;
  responsive?: BlockResponsiveConfig;
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

export function resolveBlockViewState(
  block: Pick<Block, 'content' | 'layout' | 'mode' | 'responsive' | 'visible'>,
  viewMode: ViewMode
): ResolvedBlockViewState {
  const baseLayout = normalizeBlockLayout(block.layout);
  const override = block.responsive?.[viewMode];

  const mergedLayout = normalizeBlockLayout(
    {
      ...baseLayout,
      ...(override?.layout ?? {}),
    },
    baseLayout
  );

  const overrideHtml =
    typeof override?.html === 'string' && override.html.trim() ? override.html : undefined;

  return {
    viewMode,
    visible: typeof override?.visible === 'boolean' ? override.visible : block.visible ?? DEFAULT_BLOCK_VISIBLE,
    html: overrideHtml ?? block.content.html ?? '',
    text: block.content.text ?? '',
    mode: normalizeBlockMode(block.mode),
    layout: mergedLayout,
  };
}

export function normalizeBlock<T extends Partial<Block>>(
  block: T
): T &
  Pick<
    Block,
    'name' | 'description' | 'type' | 'span' | 'rowSpan' | 'mode' | 'content' | 'visible' | 'layout' | 'runtime'
  > & {
    responsive?: BlockResponsiveConfig;
  } {
  const initialSpan = normalizeSpan(Number(block.span ?? block.layout?.w ?? DEFAULT_BLOCK_LAYOUT.w));
  const initialRowSpan = normalizeRowSpan(
    Number(block.rowSpan ?? block.layout?.h ?? DEFAULT_BLOCK_LAYOUT.h)
  );

  const layout = normalizeBlockLayout(block.layout, {
    x: DEFAULT_BLOCK_LAYOUT.x,
    y: DEFAULT_BLOCK_LAYOUT.y,
    w: initialSpan,
    h: initialRowSpan,
  });

  const content: BlockContent = {
    html: typeof block.content?.html === 'string' ? block.content.html : '',
    text: typeof block.content?.text === 'string' ? block.content.text : '',
    children: Array.isArray(block.content?.children) ? block.content.children : undefined,
  };

  return {
    ...block,
    name: typeof block.name === 'string' && block.name.trim() ? block.name : 'Блок',
    description: typeof block.description === 'string' ? block.description : '',
    type: normalizeBlockType(block.type),
    span: layout.w,
    rowSpan: layout.h,
    mode: normalizeBlockMode(block.mode),
    visible: typeof block.visible === 'boolean' ? block.visible : DEFAULT_BLOCK_VISIBLE,
    layout,
    runtime: normalizeBlockRuntime(block.runtime),
    content,
    responsive: normalizeBlockResponsiveConfig(block.responsive),
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
 * VERSION: 2.0.0
 * PURPOSE:
 * Настройки итогового export pipeline.
 * ============================================
 */
export interface ExportConfig {
  format: 'html';
  mode?: ExportMode;
  includeAssets: boolean;
  minify: boolean;
  inlineStyles: boolean;
  inlineScripts: boolean;
}

/**
 * ============================================
 * BLOCK: Root Project Contract
 * VERSION: 2.0.0
 * PURPOSE:
 * Полный контракт проекта UI Builder.
 * ============================================
 */
export interface Project {
  meta: ProjectMeta;
  designSystem: DesignSystem;
  theme?: ProjectTheme;
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
 * VERSION: 2.0.0
 * PURPOSE:
 * Состояние runtime-редактора поверх Project.
 * ============================================
 */
export interface EditorState {
  project: Project;
  selectedElement: SelectedElement | null;
  hoveredElement: string | null;
  mode: 'edit' | 'preview' | 'code';
  viewMode: ViewMode;
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
 * VERSION: 2.0.0
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

export const DEFAULT_LIGHT_COLOR_SYSTEM: ColorSystem = {
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

export const DEFAULT_PROJECT_THEME: ProjectTheme = {
  dark: {},
  light: { ...DEFAULT_LIGHT_COLOR_SYSTEM },
};

export const DEFAULT_TYPOGRAPHY: TypographySystem = {
  h1: { fontSize: '28px', fontWeight: 600 },
  h2: { fontSize: '22px', fontWeight: 600 },
  h3: { fontSize: '18px', fontWeight: 600 },
  textBase: { fontSize: '16px', fontWeight: 400 },
  textSmall: { fontSize: '14px', fontWeight: 400, color: '#B0B0B0' },
};

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  format: 'html',
  mode: 'single-file',
  includeAssets: true,
  minify: false,
  inlineStyles: true,
  inlineScripts: true,
};