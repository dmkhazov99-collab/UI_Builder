/**
 * ============================================
 * MODULE: PropertiesPanel
 * VERSION: 5.0.0
 * DESC: Панель свойств с жёсткой системой
 *       стандартов отступов. Без иконок.
 * ============================================
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useProjectStore } from '@/store/projectStore';
import {
  MAX_BLOCK_ROW_SPAN,
  MAX_BLOCK_SPAN,
  createDefaultContentEndpoint,
  createDefaultHeaderEndpoint,
  type Block,
  type BlockMode,
  type BlockType,
  type ColorSystem,
  type ContentIsolator,
  type HeaderIsolator,
  type Page,
  type Project,
  type Section,
  type SelectedElement,
  type ViewMode,
} from '@/types/project';

// ============================================
// SYSTEM STANDARDS
// ============================================

/**
 * ┌─────────────────────────────────────────┐
 * │  SPACING SYSTEM v3.1 — 12px BASE        │
 * │                                         │
 * │  Все зазоры кратны 12px (или 8px        │
 * │  для микро-зазоров внутри блока)        │
 * │                                         │
 * │  Title → Subtitle:      8px             │
 * │  Subtitle → Input:      8px             │
 * │  Input → next Subtitle: 12px            │
 * │  Input → Divider:      12px             │
 * │  Divider → next Title: 12px             │
 * │  Search → first field: 12px             │
 * └─────────────────────────────────────────┘
 */

const STD = {
  block: { gapBefore: 0, gapAfter: 0 },
  title: { gapBefore: 0, gapAfter: 8 },
  subtitle: { gapBefore: 0, gapAfter: 8 },
  field: { gapBefore: 0, gapAfter: 12 },
  divider: { gapBefore: 0, gapAfter: 12 },
} as const;

// ============================================
// Types
// ============================================

type BlockLayout = { x: number; y: number; w: number; h: number };

type ScreenOverride = {
  html?: string;
  visible?: boolean;
  layout?: Partial<BlockLayout>;
};

type ExtBlock = Block & {
  visible?: boolean;
  layout?: BlockLayout;
  runtime?: { css?: string; javascript?: string };
  responsive?: Partial<Record<ViewMode, ScreenOverride>>;
};

type ExtProject = Project & {
  theme?: { dark?: Partial<ColorSystem>; light?: Partial<ColorSystem> };
  exportConfig: Project['exportConfig'] & { mode?: 'single-file' | 'split-files' };
};

type Store = {
  project: Project;
  selectedElement: SelectedElement | null;
  viewMode: ViewMode;
  updateBlock: (pid: string, sid: string, bid: string, u: Partial<ExtBlock> & { layout?: BlockLayout }) => void;
  updateHeader: (pid: string, sid: string, u: Partial<HeaderIsolator>) => void;
  updateSection: (pid: string, sid: string, u: Partial<Section>) => void;
  updateContent: (pid: string, sid: string, u: Partial<ContentIsolator>) => void;
  removeBlock: (pid: string, sid: string, bid: string) => void;
  removeSection: (pid: string, sid: string) => void;
  duplicateSection: (pid: string, sid: string) => void;
  saveBlockToCustomLibrary: (pid: string, sid: string, bid: string) => void;
  duplicateBlock: (pid: string, sid: string, bid: string) => void;
  updateBlockScreen?: (pid: string, sid: string, bid: string, vm: ViewMode, u: ScreenOverride) => void;
  resetBlockScreen?: (pid: string, sid: string, bid: string, vm: ViewMode) => void;
  updateProjectMeta?: (u: Partial<Project['meta']>) => void;
  updateProjectCustomLogic?: (u: Partial<Project['customLogic']>) => void;
  updateProjectDesignSystem?: (u: Partial<Project['designSystem']>) => void;
  updateProjectTheme?: (mode: 'dark' | 'light', u: Partial<ColorSystem>) => void;
  updateProjectExportConfig?: (u: Partial<ExtProject['exportConfig']>) => void;
  currentPageId?: string;
};

type SelBlockCtx = { block: ExtBlock; sectionId: string; pageId: string };
type SelSectionCtx = { section: Section; pageId: string };

// ============================================
// Constants
// ============================================

const PANEL_CLS =
  'panel-surface w-80 min-h-0 overflow-hidden border-l border-[#313133] bg-[#1A1A1C] flex flex-col';

const FOCUS_CLS =
  'outline-none focus-visible:ring-1 focus-visible:ring-[#2A80F4] focus-visible:border-[#2A80F4] selection:bg-[#2A80F4]/35 selection:text-white';

const IN_CLS = `bg-[#111111] border-[#313133] text-white ${FOCUS_CLS}`;
const RO_CLS = 'h-9 bg-[#111111] border-[#313133] text-[#666] text-xs';
const TX_CLS = `bg-[#111111] border-[#313133] text-white resize-none ${FOCUS_CLS} scroll-theme overflow-y-auto`;
const MO_CLS = `bg-[#111111] border-[#313133] text-white font-mono text-xs resize-none ${FOCUS_CLS} scroll-theme overflow-y-auto`;
const BTN_CLS = 'bg-[#111111] border-[#313133] text-[#B0B0B0] hover:text-white text-xs rounded-md';

const SCR_LBLS: Record<ViewMode, string> = {
  desktop: 'Десктоп',
  tablet: 'Планшет',
  mobile: 'Мобильный',
};

const CLR_LBLS: Record<keyof ColorSystem, string> = {
  bgPrimary: 'Фон основной',
  bgSecondary: 'Фон дополнительный',
  bgTertiary: 'Фон третичный',
  bgBorder: 'Граница',
  textPrimary: 'Текст основной',
  textSecondary: 'Текст дополнительный',
  accent: 'Акцент',
  success: 'Успех',
  warning: 'Предупреждение',
  error: 'Ошибка',
};

const DEF_LT: ColorSystem = {
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

const TYPO_KEYS = ['h1', 'h2', 'h3', 'textBase', 'textSmall'] as const;

// ============================================
// Layout primitives
// ============================================

function clamp(n: number, min: number, max: number) {
  return !Number.isFinite(n) ? min : Math.min(max, Math.max(min, Math.round(n)));
}

function normLayout(i: Partial<BlockLayout>): BlockLayout {
  const x = clamp(i.x ?? 1, 1, 6);
  const y = clamp(i.y ?? 1, 1, 999);
  const w = clamp(i.w ?? 2, 1, Math.max(1, 7 - x));
  const h = clamp(i.h ?? 3, 1, MAX_BLOCK_ROW_SPAN);
  return { x, y, w, h };
}

function curPage(p: Project, cid?: string) {
  return cid ? p.pages.find((x) => x.id === cid) : p.pages[0];
}

function selBlockCtx(pg: Page | undefined, el: SelectedElement | null): SelBlockCtx | null {
  if (!el || el.type !== 'block' || !pg) return null;
  for (const s of pg.sections) {
    const b = s.content.blocks.find((x) => x.id === el.id);
    if (b) return { block: b as ExtBlock, sectionId: s.id, pageId: pg.id };
  }
  return null;
}

function selSectionCtx(pg: Page | undefined, el: SelectedElement | null): SelSectionCtx | null {
  if (!el || !pg) return null;
  const s = pg.sections.find(
    (x) => x.id === el.id || x.header.id === el.id || x.content.id === el.id
  );
  return s ? { section: s, pageId: pg.id } : null;
}

function getRuntime(b: ExtBlock) {
  return { css: b.runtime?.css ?? '', javascript: b.runtime?.javascript ?? '' };
}

function getBaseLayout(b: ExtBlock) {
  return normLayout(b.layout ?? { w: 2, h: 3 });
}

function getBaseVisible(b: ExtBlock) {
  return typeof b.visible === 'boolean' ? b.visible : true;
}

function getOverride(b: ExtBlock, vm: ViewMode) {
  return b.responsive?.[vm] ?? {};
}

function getResolvedLayout(b: ExtBlock, vm: ViewMode) {
  return normLayout({ ...getBaseLayout(b), ...(getOverride(b, vm).layout ?? {}) });
}

function getResolvedVisible(b: ExtBlock, vm: ViewMode) {
  const ov = getOverride(b, vm).visible;
  return typeof ov === 'boolean' ? ov : getBaseVisible(b);
}

// ============================================
// UI Primitives (Standardized)
// ============================================

/** Title — block header. mb=8px to Subtitle */
function Title({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginBottom: STD.title.gapAfter }}>
      <h3 className="text-xs font-semibold text-[#B0B0B0] uppercase tracking-wider">
        {children}
      </h3>
    </div>
  );
}

/** Subtitle — field label. mb=8px to Input */
function Subtitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginBottom: STD.subtitle.gapAfter }}>
      <h4 className="text-[11px] font-medium text-[#999]">
        {children}
      </h4>
    </div>
  );
}

/** Field — wraps Subtitle + Input. mb=12px to next element */
function Field({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginBottom: STD.field.gapAfter }}>
      {children}
    </div>
  );
}

/** Divider — horizontal line. to next element */
function Divider() {
  return (
    <div
      style={{
        marginBottom: STD.divider.gapAfter,
        marginLeft: -12,
        marginRight: -12,
      }}
    >
      <div className="h-px bg-[#313133]" />
    </div>
  );
}

/** Block — section with Title + children. Separated by Divider */
function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: STD.block.gapBefore, marginBottom: STD.block.gapAfter }}>
      <Title>{title}</Title>
      {children}
    </div>
  );
}

/**
 * ┌─────────────────────────────────────────┐
 * │  PRIMITIVE: Shell                       │
 * │  Panel container with header            │
 * └─────────────────────────────────────────┘
 */
function Shell({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={PANEL_CLS}>
      <div className="shrink-0 flex items-center px-3 border-b border-[#313133] h-12">
        <span className="font-medium text-white text-sm">{title}</span>
      </div>
      <ScrollArea className="scroll-theme flex-1 min-h-0">
        <div className="p-3">{children}</div>
      </ScrollArea>
      {footer ? (
        <div className="shrink-0 border-t border-[#313133] bg-[#1A1A1C] p-3">{footer}</div>
      ) : null}
    </div>
  );
}

// ============================================
// Search
// ============================================

function useSearch() {
  const [q, setQ] = useState('');
  const filter = useCallback((label: string) => !q.trim() || label.toLowerCase().includes(q.toLowerCase()), [q]);
  return { q, setQ, filter };
}

function Search({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Поиск свойств..."
        className={`h-9 ${IN_CLS}`}
      />
    </div>
  );
}

// ============================================
// Footer buttons
// ============================================

function BlockFooter({ onSave, onDup, onDel }: { onSave: () => void; onDup: () => void; onDel: () => void }) {
  return (
    <div className="space-y-3">
      <Button variant="outline" size="sm" className={`w-full ${BTN_CLS}`} onClick={onSave}>
        Сохранить в Custom
      </Button>
      <div className="flex gap-3">
        <Button variant="outline" size="sm" className={`flex-1 ${BTN_CLS}`} onClick={onDup}>
          Дублировать
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-[#111111] border-[#FF4053]/30 text-[#FF4053] hover:bg-[#FF4053]/10 rounded-md"
          onClick={onDel}
        >
          Удалить
        </Button>
      </div>
    </div>
  );
}

function SectionFooter({ onDup, onDel }: { onDup: () => void; onDel: () => void }) {
  return (
    <div className="flex gap-3">
      <Button variant="outline" size="sm" className={`flex-1 ${BTN_CLS}`} onClick={onDup}>
        Дублировать секцию
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="bg-[#111111] border-[#FF4053]/30 text-[#FF4053] hover:bg-[#FF4053]/10"
        onClick={onDel}
      >
        Удалить
      </Button>
    </div>
  );
}

// ============================================
// Field: Number + px suffix
// ============================================

function NumField({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
}: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Field>
      <Subtitle>{label}</Subtitle>
      <div className="relative">
        <Input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-9 pr-10 text-sm tabular-nums ${IN_CLS}`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#555] select-none pointer-events-none">
          px
        </span>
      </div>
    </Field>
  );
}

// ============================================
// Field: Hex color + swatch
// ============================================

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const isValid = /^#[0-9A-Fa-f]{6}$/.test(value);
  return (
    <Field>
      <Subtitle>{label}</Subtitle>
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-md border border-[#313133] shrink-0 shadow-inner"
          style={{ backgroundColor: isValid ? value : '#000' }}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-9 text-sm font-mono uppercase ${IN_CLS} ${isValid ? '' : 'border-[#FF4053]/50 text-[#FF4053]'}`}
          maxLength={7}
          spellCheck={false}
        />
      </div>
    </Field>
  );
}

// ============================================
// Layout editor: X/Y/W/H grid
// ============================================

function LayoutEd({
  label,
  layout,
  onChange,
}: {
  label: string;
  layout: BlockLayout;
  onChange: (u: Partial<BlockLayout>) => void;
}) {
  const fields: { key: 'x' | 'y' | 'w' | 'h'; label: string; subtitle: string; max: number }[] = [
    { key: 'x', label: 'X', subtitle: 'col', max: 6 },
    { key: 'y', label: 'Y', subtitle: 'row', max: 999 },
    { key: 'w', label: 'W', subtitle: 'span', max: MAX_BLOCK_SPAN },
    { key: 'h', label: 'H', subtitle: 'span', max: MAX_BLOCK_ROW_SPAN },
  ];

  return (
    <Field>
      <Subtitle>{label}</Subtitle>
      <div className="grid grid-cols-4 gap-3">
        {fields.map((f) => (
          <div key={f.key} className="space-y-3 min-w-0">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-semibold text-[#777]">{f.label}</span>
              <span className="text-[9px] text-[#3A3A3C]">{f.subtitle}</span>
            </div>
            <Input
              type="number"
              min={1}
              max={f.max}
              value={layout[f.key]}
              onChange={(e) =>
                onChange({ [f.key]: Number(e.target.value) } as Partial<BlockLayout>)
              }
              className={`h-8 text-xs text-center tabular-nums px-1 ${IN_CLS}`}
            />
          </div>
        ))}
      </div>
    </Field>
  );
}

function BaseLayoutPad({
  layout,
  onChange,
}: {
  layout: BlockLayout;
  onChange: (u: Partial<BlockLayout>) => void;
}) {
  const move = useCallback(
    (dx: number, dy: number) => {
      const next = normLayout({
        ...layout,
        x: layout.x + dx,
        y: layout.y + dy,
      });
      onChange({ x: next.x, y: next.y });
    },
    [layout, onChange]
  );

  const resize = useCallback(
    (dw: number, dh: number) => {
      const next = normLayout({
        ...layout,
        w: layout.w + dw,
        h: layout.h + dh,
      });
      onChange({ w: next.w, h: next.h });
    },
    [layout, onChange]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        !!target &&
        (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable
        );

      if (isTypingTarget) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();

      switch (key) {
        case 'arrowup':
          event.preventDefault();
          move(0, -1);
          break;
        case 'arrowdown':
          event.preventDefault();
          move(0, 1);
          break;
        case 'arrowleft':
          event.preventDefault();
          move(-1, 0);
          break;
        case 'arrowright':
          event.preventDefault();
          move(1, 0);
          break;
        case 'w':
        case 'ц':
          event.preventDefault();
          resize(0, -1);
          break;
        case 's':
        case 'ы':
          event.preventDefault();
          resize(0, 1);
          break;
        case 'a':
        case 'ф':
          event.preventDefault();
          resize(-1, 0);
          break;
        case 'd':
        case 'в':
          event.preventDefault();
          resize(1, 0);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [move, resize]);

  return (
    <div className="space-y-3">
      <div>
        <Subtitle>Расположение</Subtitle>
        <div className="grid grid-cols-4 gap-3">
          <Button
            type="button"
            variant="outline"
            className={`h-9 flex items-center justify-center ${BTN_CLS}`}
            onClick={() => move(0, -1)}
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="outline"
            className={`h-9 flex items-center justify-center ${BTN_CLS}`}
            onClick={() => move(0, 1)}
          >
            ↓
          </Button>
          <Button
            type="button"
            variant="outline"
            className={`h-9 flex items-center justify-center ${BTN_CLS}`}
            onClick={() => move(-1, 0)}
          >
            ←
          </Button>
          <Button
            type="button"
            variant="outline"
            className={`h-9 flex items-center justify-center ${BTN_CLS}`}
            onClick={() => move(1, 0)}
          >
            →
          </Button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Subtitle>Размер</Subtitle>
        <div className="grid grid-cols-4 gap-3">
          <Button
            type="button"
            variant="outline"
            className={`h-9 flex items-center justify-center ${BTN_CLS}`}
            onClick={() => resize(1, 0)}
          >
            →
          </Button>
          <Button
            type="button"
            variant="outline"
            className={`h-9 flex items-center justify-center ${BTN_CLS}`}
            onClick={() => resize(-1, 0)}
          >
            ←
          </Button>
          <Button
            type="button"
            variant="outline"
            className={`h-9 flex items-center justify-center ${BTN_CLS}`}
            onClick={() => resize(0, 1)}
          >
            ↓
          </Button>
          <Button
            type="button"
            variant="outline"
            className={`h-9 flex items-center justify-center ${BTN_CLS}`}
            onClick={() => resize(0, -1)}
          >
            ↑
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Screen override card
// ============================================

function ScreenCard({
  block,
  screen,
  currentViewMode,
  onUpdate,
  onReset,
}: {
  block: ExtBlock;
  screen: ViewMode;
  currentViewMode: ViewMode;
  onUpdate: (vm: ViewMode, u: ScreenOverride) => void;
  onReset: (vm: ViewMode) => void;
}) {
  const ov = useMemo(() => getOverride(block, screen), [block, screen]);
  const layout = useMemo(() => getResolvedLayout(block, screen), [block, screen]);
  const visible = useMemo(() => getResolvedVisible(block, screen), [block, screen]);
  const isActive = currentViewMode === screen;
  const hasOv = typeof ov.html === 'string' || typeof ov.visible === 'boolean' || !!Object.keys(ov.layout ?? {}).length;

  const handleLayout = useCallback(
    (u: Partial<BlockLayout>) => onUpdate(screen, { layout: { ...(ov.layout ?? {}), ...u } }),
    [onUpdate, screen, ov.layout]
  );

  return (
    <div className="space-y-3 rounded-md border border-[#313133] bg-[#111111] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-white">{SCR_LBLS[screen]}</div>
            {isActive && (
              <span className="rounded-md bg-[#2A80F4]/15 px-2 py-1 text-[10px] font-medium text-[#8FB4FF]">
                Активен
              </span>
            )}
          </div>
          {hasOv && (
            <div className="text-[11px] text-[#7F8792]">
              Есть переопределение
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className={`h-8 ${BTN_CLS}`} onClick={() => onReset(screen)}>
            Сбросить
          </Button>
        </div>
      </div>

      <div style={{ marginTop: 7 }}>
        <Field>
          <Subtitle>Видимость</Subtitle>
          <Select value={visible ? 'visible' : 'hidden'} onValueChange={(v) => onUpdate(screen, { visible: v === 'visible' })}>
            <SelectTrigger className={`h-9 ${IN_CLS}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1C] border-[#313133]">
              <SelectItem value="visible" className="text-white">Видим</SelectItem>
              <SelectItem value="hidden" className="text-white">Скрыт</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <LayoutEd label="Предопределенное расположение" layout={layout} onChange={handleLayout} />

      <div style={{ marginTop: 44 }}>
        <Field>
          <Subtitle>Предопределенный HTML</Subtitle>
          <Textarea
            value={ov.html ?? ''}
            onChange={(e) => onUpdate(screen, { html: e.target.value })}
            className={`min-h-28 ${MO_CLS}`}
          />
        </Field>
      </div>
    </div>
  );
}

// ============================================
// Panel: Project
// ============================================

function ProjectPanel({
  project,
  onMeta,
  onLogic,
  onDesign,
  onTheme,
  onExport,
}: {
  project: ExtProject;
  onMeta: (u: Partial<Project['meta']>) => void;
  onLogic: (u: Partial<Project['customLogic']>) => void;
  onDesign: (u: Partial<Project['designSystem']>) => void;
  onTheme: (m: 'dark' | 'light', u: Partial<ColorSystem>) => void;
  onExport: (u: Partial<ExtProject['exportConfig']>) => void;
}) {
  const { q, setQ, filter } = useSearch();

  const dark = useMemo(
    () => ({ ...project.designSystem.colors, ...(project.theme?.dark ?? {}) }),
    [project.designSystem.colors, project.theme?.dark]
  );
  const light = useMemo(
    () => ({ ...DEF_LT, ...(project.theme?.light ?? {}) }),
    [project.theme?.light]
  );
  const mode = project.exportConfig.mode ?? 'single-file';

  return (
    <Shell title="Свойства проекта">
      <Search value={q} onChange={setQ} />

      {filter('ID проекта') && (
        <Field>
          <Subtitle>ID проекта</Subtitle>
          <Input value={project.meta.id} readOnly className={RO_CLS} />
        </Field>
      )}

      {filter('Название') && (
        <Field>
          <Subtitle>Название проекта</Subtitle>
          <Input value={project.meta.name} onChange={(e) => onMeta({ name: e.target.value })} className={`h-9 ${IN_CLS}`} />
        </Field>
      )}

      {filter('Описание') && (
        <Field>
          <Subtitle>Описание проекта</Subtitle>
          <Textarea
            value={project.meta.description}
            onChange={(e) => onMeta({ description: e.target.value })}
            className={`min-h-24 ${TX_CLS}`}
          />
        </Field>
      )}

      <Divider />

      <Block title="Экспорт">
        <Field>
          <Subtitle>Режим экспорта</Subtitle>
          <Select value={mode} onValueChange={(v) => onExport({ mode: v as 'single-file' | 'split-files' })}>
            <SelectTrigger className={`h-9 ${IN_CLS}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1C] border-[#313133]">
              <SelectItem value="single-file" className="text-white">Один файл</SelectItem>
              <SelectItem value="split-files" className="text-white">Разделённые файлы</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Block>

      <Divider />

      <Block title="Типографика">
        <div className="space-y-3">
          {TYPO_KEYS.map((key) => (
            <NumField
              key={key}
              label={key}
              value={parseInt(project.designSystem.typography[key].fontSize, 10) || 0}
              onChange={(v) =>
                onDesign({
                  typography: {
                    ...project.designSystem.typography,
                    [key]: { ...project.designSystem.typography[key], fontSize: `${v}px` },
                  },
                })
              }
              min={8}
              max={120}
            />
          ))}
        </div>
      </Block>

      <Divider />

      <Block title="Тёмная тема">
        <div className="space-y-3">
          {Object.entries(CLR_LBLS).map(([key, label]) => (
            <ColorField
              key={`d-${key}`}
              label={label}
              value={dark[key as keyof ColorSystem] ?? '#000000'}
              onChange={(v) => onTheme('dark', { [key]: v } as Partial<ColorSystem>)}
            />
          ))}
        </div>
      </Block>

      <Block title="Светлая тема">
        <div className="space-y-3">
          {Object.entries(CLR_LBLS).map(([key, label]) => (
            <ColorField
              key={`l-${key}`}
              label={label}
              value={light[key as keyof ColorSystem] ?? '#000000'}
              onChange={(v) => onTheme('light', { [key]: v } as Partial<ColorSystem>)}
            />
          ))}
        </div>
      </Block>

      <Divider />

      <Block title="Глобальный CSS">
        <Field>
          <Textarea value={project.customLogic.css} onChange={(e) => onLogic({ css: e.target.value })} className={`min-h-40 ${MO_CLS}`} />
        </Field>
      </Block>

      <Block title="Глобальный JS">
        <Field>
          <Textarea value={project.customLogic.javascript} onChange={(e) => onLogic({ javascript: e.target.value })} className={`min-h-40 ${MO_CLS}`} />
        </Field>
      </Block>
    </Shell>
  );
}

// ============================================
// Panel: Block
// ============================================

function BlockPanel({
  ctx,
  viewMode,
  onUpdate,
  onUpdateScreen,
  onResetScreen,
  onSave,
  onDup,
  onDel,
}: {
  ctx: SelBlockCtx;
  viewMode: ViewMode;
  onUpdate: (u: Partial<ExtBlock> & { layout?: BlockLayout }) => void;
  onUpdateScreen: (vm: ViewMode, u: ScreenOverride) => void;
  onResetScreen: (vm: ViewMode) => void;
  onSave: () => void;
  onDup: () => void;
  onDel: () => void;
}) {
  const { block } = ctx;
  const rt = getRuntime(block);
  const baseLayout = getBaseLayout(block);
  const { q, setQ, filter } = useSearch();

  const setHtml = useCallback(
    (v: string) => onUpdate({ content: { ...block.content, html: v } }),
    [onUpdate, block.content]
  );
  const setLayout = useCallback(
    (u: Partial<BlockLayout>) => onUpdate({ layout: normLayout({ ...baseLayout, ...u }) }),
    [onUpdate, baseLayout]
  );
  const setJs = useCallback(
    (v: string) => onUpdate({ runtime: { ...rt, javascript: v } }),
    [onUpdate, rt]
  );

  return (
    <Shell
      title="Свойства блока"
      footer={<BlockFooter onSave={onSave} onDup={onDup} onDel={onDel} />}
    >
      <Search value={q} onChange={setQ} />

      {filter('ID блока') && (
        <Field>
          <Subtitle>ID блока</Subtitle>
          <Input value={block.id} readOnly className={RO_CLS} />
        </Field>
      )}

      {filter('Название') && (
        <Field>
          <Subtitle>Название блока</Subtitle>
          <Input value={block.name} onChange={(e) => onUpdate({ name: e.target.value })} className={`h-9 ${IN_CLS}`} />
        </Field>
      )}

      {filter('Описание') && (
        <Field>
          <Subtitle>Описание</Subtitle>
          <Textarea value={block.description} onChange={(e) => onUpdate({ description: e.target.value })} className={`min-h-20 ${TX_CLS}`} />
        </Field>
      )}

      <Divider />

      <Block title="Тип и поведение">
        {filter('Тип блока') && (
          <Field>
            <Subtitle>Тип блока</Subtitle>
            <Select value={block.type} onValueChange={(v) => onUpdate({ type: v as BlockType })}>
              <SelectTrigger className={`h-9 ${IN_CLS}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1C] border-[#313133]">
                <SelectItem value="block-info" className="text-white">Обычный блок</SelectItem>
                <SelectItem value="block-button" className="text-white">Кнопка</SelectItem>
                <SelectItem value="block-placeholder" className="text-white">Заглушка</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}

        {filter('Поведение') && (
          <Field>
            <Subtitle>Поведение контента</Subtitle>
            <Select
              value={block.mode === 'scroll' ? 'scroll' : 'clip'}
              onValueChange={(v) => onUpdate({ mode: v as BlockMode })}
            >
              <SelectTrigger className={`h-9 ${IN_CLS}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1C] border-[#313133]">
                <SelectItem value="clip" className="text-white">Обрезать</SelectItem>
                {block.type !== 'block-button' && (
                  <SelectItem value="scroll" className="text-white">Внутренний скролл</SelectItem>
                )}
              </SelectContent>
            </Select>
          </Field>
        )}
      </Block>

      <Divider />

      <Block title="Базовое состояние">
        {filter('Расположение') && (
          <BaseLayoutPad layout={baseLayout} onChange={setLayout} />
        )}

        <div style={{ marginTop: 21 }}>
          <Field>
            <Subtitle>Базовый HTML</Subtitle>
            <Textarea value={block.content.html} onChange={(e) => setHtml(e.target.value)} className={`min-h-36 ${MO_CLS}`} />
          </Field>
        </div>

        <Field>
          <Subtitle>JavaScript</Subtitle>
          <Textarea value={rt.javascript} onChange={(e) => setJs(e.target.value)} className={`min-h-28 ${MO_CLS}`} />
        </Field>
      </Block>

      <Divider />

      <Block title="Переопределения экранов">
        <div className="space-y-3">
          {(['desktop', 'tablet', 'mobile'] as ViewMode[]).map((s) => (
            <ScreenCard
              key={s}
              block={block}
              screen={s}
              currentViewMode={viewMode}
              onUpdate={onUpdateScreen}
              onReset={onResetScreen}
            />
          ))}
        </div>
      </Block>

    </Shell>
  );
}

// ============================================
// Panel: Section
// ============================================

function SectionPanel({
  ctx,
  onUpdate,
  onDup,
  onDel,
}: {
  ctx: SelSectionCtx;
  onUpdate: (u: Partial<Section>) => void;
  onDup: () => void;
  onDel: () => void;
}) {
  const { section } = ctx;
  return (
    <Shell
      title="Свойства секции"
      footer={<SectionFooter onDup={onDup} onDel={onDel} />}
    >
      <Field>
        <Subtitle>ID секции</Subtitle>
        <Input value={section.id} readOnly className={RO_CLS} />
      </Field>

      <Field>
        <Subtitle>Название секции</Subtitle>
        <Input value={section.name} onChange={(e) => onUpdate({ name: e.target.value })} className={`h-9 ${IN_CLS}`} />
      </Field>

      <Field>
        <Subtitle>Описание секции</Subtitle>
        <Textarea value={section.description} onChange={(e) => onUpdate({ description: e.target.value })} className={`min-h-24 ${TX_CLS}`} />
      </Field>

      <Divider />

      <Field>
        <div className="space-y-3">
          <div className="flex justify-between text-xs text-[#B0B0B0]">
            <span>Заголовок хедера</span>
            <span className="text-white">{section.header.title || '—'}</span>
          </div>
          <div className="flex justify-between text-xs text-[#B0B0B0]">
            <span>Блоков внутри</span>
            <span className="text-white">{section.content.blocks.length}</span>
          </div>
          <div className="flex justify-between text-xs text-[#B0B0B0]">
            <span>Порядок</span>
            <span className="text-white">{section.order + 1}</span>
          </div>
        </div>
      </Field>
    </Shell>
  );
}

// ============================================
// Panel: Header
// ============================================

function HeaderPanel({
  ctx,
  onUpdate,
}: {
  ctx: SelSectionCtx;
  onUpdate: (u: Partial<HeaderIsolator>) => void;
}) {
  const { section } = ctx;
  const ep = useMemo(() => section.header.endpoint || createDefaultHeaderEndpoint(section.header.title), [section.header]);

  const setTitle = useCallback(
    (v: string) =>
      onUpdate({
        title: v,
        endpoint: { ...ep, html: ep.html?.trim() ? ep.html : `<div class="h1">${v}</div>` },
      }),
    [onUpdate, ep]
  );

  return (
    <Shell title="Свойства хедера">
      <Field>
        <Subtitle>ID хедера</Subtitle>
        <Input value={section.header.id} readOnly className={RO_CLS} />
      </Field>

      <Field>
        <Subtitle>Название</Subtitle>
        <Input value={section.header.name} onChange={(e) => onUpdate({ name: e.target.value })} className={`h-9 ${IN_CLS}`} />
      </Field>

      <Field>
        <Subtitle>Описание</Subtitle>
        <Textarea value={section.header.description} onChange={(e) => onUpdate({ description: e.target.value })} className={`min-h-20 ${TX_CLS}`} />
      </Field>

      <Field>
        <Subtitle>Заголовок</Subtitle>
        <Input value={section.header.title} onChange={(e) => setTitle(e.target.value)} className={`h-9 ${IN_CLS}`} />
      </Field>

      <Divider />

      <Field>
        <Subtitle>HTML хедера</Subtitle>
        <Textarea
          value={ep.html ?? ''}
          onChange={(e) => onUpdate({ endpoint: { ...ep, html: e.target.value } })}
          className={`min-h-32 ${MO_CLS}`}
        />
      </Field>

      <Field>
        <Subtitle>CSS хедера</Subtitle>
        <Textarea
          value={ep.css ?? ''}
          onChange={(e) => onUpdate({ endpoint: { ...ep, css: e.target.value } })}
          className={`min-h-24 ${MO_CLS}`}
        />
      </Field>
    </Shell>
  );
}

// ============================================
// Panel: Content
// ============================================

function ContentPanel({
  ctx,
  onUpdate,
}: {
  ctx: SelSectionCtx;
  onUpdate: (u: Partial<ContentIsolator>) => void;
}) {
  const { section } = ctx;
  const ep = useMemo(() => section.content.endpoint || createDefaultContentEndpoint(), [section.content]);

  return (
    <Shell title="Свойства контента">
      <Field>
        <Subtitle>ID контента</Subtitle>
        <Input value={section.content.id} readOnly className={RO_CLS} />
      </Field>

      <Field>
        <Subtitle>Название</Subtitle>
        <Input value={section.content.name} onChange={(e) => onUpdate({ name: e.target.value })} className={`h-9 ${IN_CLS}`} />
      </Field>

      <Field>
        <Subtitle>Описание</Subtitle>
        <Textarea value={section.content.description} onChange={(e) => onUpdate({ description: e.target.value })} className={`min-h-20 ${TX_CLS}`} />
      </Field>

      <Field>
        <div className="flex justify-between text-xs text-[#B0B0B0]">
          <span>Блоков внутри</span>
          <span className="text-white">{section.content.blocks.length}</span>
        </div>
      </Field>

      <Divider />

      <Field>
        <Subtitle>HTML контента</Subtitle>
        <Textarea
          value={ep.html ?? ''}
          onChange={(e) => onUpdate({ endpoint: { ...ep, html: e.target.value } })}
          className={`min-h-32 ${MO_CLS}`}
        />
      </Field>

      <Field>
        <Subtitle>CSS контента</Subtitle>
        <Textarea
          value={ep.css ?? ''}
          onChange={(e) => onUpdate({ endpoint: { ...ep, css: e.target.value } })}
          className={`min-h-24 ${MO_CLS}`}
        />
      </Field>
    </Shell>
  );
}

// ============================================
// Fallback
// ============================================

function Fallback({ type }: { type?: string }) {
  return (
    <Shell title="Свойства">
      <p className="text-[#B0B0B0] text-sm">Элемент выбран, но для него пока нет отдельной панели.</p>
      {type && <p className="text-[#7F8792] text-xs mt-2">Тип: {type}</p>}
    </Shell>
  );
}

// ============================================
// Root
// ============================================

export function PropertiesPanel() {
  const store = useProjectStore() as Store;
  const {
    project,
    selectedElement,
    viewMode,
    updateBlock,
    updateBlockScreen,
    resetBlockScreen,
    updateHeader,
    updateSection,
    updateContent,
    updateProjectMeta,
    updateProjectCustomLogic,
    updateProjectDesignSystem,
    updateProjectTheme,
    updateProjectExportConfig,
    removeBlock,
    removeSection,
    duplicateSection,
    saveBlockToCustomLibrary,
    duplicateBlock,
    currentPageId,
  } = store;

  const extProject = project as ExtProject;
  const page = useMemo(() => curPage(project, currentPageId), [project, currentPageId]);
  const selB = useMemo(() => selBlockCtx(page, selectedElement), [page, selectedElement]);
  const selS = useMemo(() => selSectionCtx(page, selectedElement), [page, selectedElement]);

  const hUpdateBlock = useCallback(
    (u: Partial<ExtBlock> & { layout?: BlockLayout }) => {
      if (!selB) return;
      updateBlock(selB.pageId, selB.sectionId, selB.block.id, u);
    },
    [selB, updateBlock]
  );

  const hUpdateScreen = useCallback(
    (vm: ViewMode, u: ScreenOverride) => {
      if (!selB || !updateBlockScreen) return;
      updateBlockScreen(selB.pageId, selB.sectionId, selB.block.id, vm, u);
    },
    [selB, updateBlockScreen]
  );

  const hResetScreen = useCallback(
    (vm: ViewMode) => {
      if (!selB || !resetBlockScreen) return;
      resetBlockScreen(selB.pageId, selB.sectionId, selB.block.id, vm);
      toast.success(`${SCR_LBLS[vm]} переопределение сброшено`);
    },
    [selB, resetBlockScreen]
  );

  const hUpdateSection = useCallback(
    (u: Partial<Section>) => {
      if (!selS) return;
      updateSection(selS.pageId, selS.section.id, u);
    },
    [selS, updateSection]
  );

  const hUpdateHeader = useCallback(
    (u: Partial<HeaderIsolator>) => {
      if (!selS) return;
      updateHeader(selS.pageId, selS.section.id, u);
    },
    [selS, updateHeader]
  );

  const hUpdateContent = useCallback(
    (u: Partial<ContentIsolator>) => {
      if (!selS) return;
      updateContent(selS.pageId, selS.section.id, u);
    },
    [selS, updateContent]
  );

  const hDelBlock = useCallback(() => {
    if (!selB) return;
    removeBlock(selB.pageId, selB.sectionId, selB.block.id);
  }, [selB, removeBlock]);

  const hDelSection = useCallback(() => {
    if (!selS) return;
    removeSection(selS.pageId, selS.section.id);
    toast.success('Секция удалена');
  }, [selS, removeSection]);

  const hDupSection = useCallback(() => {
    if (!selS) return;
    duplicateSection(selS.pageId, selS.section.id);
    toast.success('Секция продублирована');
  }, [selS, duplicateSection]);

  const hSaveCustom = useCallback(() => {
    if (!selB) return;
    saveBlockToCustomLibrary(selB.pageId, selB.sectionId, selB.block.id);
    toast.success('Блок сохранён в избранное');
  }, [selB, saveBlockToCustomLibrary]);

  const hDupBlock = useCallback(() => {
    if (!selB) return;
    duplicateBlock(selB.pageId, selB.sectionId, selB.block.id);
    toast.success('Блок продублирован');
  }, [selB, duplicateBlock]);

  // No selection → project panel
  if (!selectedElement) {
    return (
      <ProjectPanel
        project={extProject}
        onMeta={(u) => updateProjectMeta?.(u)}
        onLogic={(u) => updateProjectCustomLogic?.(u)}
        onDesign={(u) => updateProjectDesignSystem?.(u)}
        onTheme={(m, u) => updateProjectTheme?.(m, u)}
        onExport={(u) => updateProjectExportConfig?.(u)}
      />
    );
  }

  // Block selected
  if (selB) {
    return (
      <BlockPanel
        ctx={selB}
        viewMode={viewMode}
        onUpdate={hUpdateBlock}
        onUpdateScreen={hUpdateScreen}
        onResetScreen={hResetScreen}
        onSave={hSaveCustom}
        onDup={hDupBlock}
        onDel={hDelBlock}
      />
    );
  }

  // No section resolved
  if (!selS) return null;

  // Section-level elements
  switch (selectedElement.type) {
    case 'section':
      return (
        <SectionPanel
          ctx={selS}
          onUpdate={hUpdateSection}
          onDup={hDupSection}
          onDel={hDelSection}
        />
      );
    case 'header':
      return (
        <HeaderPanel ctx={selS} onUpdate={hUpdateHeader} />
      );
    case 'content':
      return (
        <ContentPanel ctx={selS} onUpdate={hUpdateContent} />
      );
    default:
      return <Fallback type={selectedElement.type} />;
  }
}