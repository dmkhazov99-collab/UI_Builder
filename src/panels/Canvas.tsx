/**
 * ============================================
 * MODULE: Builder Canvas
 * VERSION: 1.2.0
 * ROLE:
 * Центральный визуальный холст builder-интерфейса.
 *
 * RESPONSIBILITIES:
 * - визуализировать текущую страницу проекта
 * - показывать секции, header/content и блоки
 * - поддерживать selection
 * - не ломать builder UI при росте возможностей проекта
 *
 * DEPENDS ON:
 * - useProjectStore()
 * - Project / Section / Block / SelectedElement
 * - cn()
 *
 * USED BY:
 * - App.tsx
 *
 * RULES:
 * - Canvas только визуализирует builder state
 * - selection не должна зависеть от runtime preview
 * - builder и preview остаются разными слоями
 *
 * SECURITY:
 * - HTML здесь остаётся trusted-only
 * - builder не должен становиться вторым runtime-движком приложения
 * - любые будущие untrusted-сценарии должны идти через sanitization/isolation layer
 * ============================================
 */

import { cn } from '@/lib/utils';
import { useProjectStore } from '@/store/projectStore';
import type { Block, Section, SelectedElement } from '@/types/project';

/**
 * ============================================
 * BLOCK: Shared Constants
 * VERSION: 1.0.0
 * PURPOSE:
 * Централизованные размеры и значения builder-canvas.
 * ============================================
 */
const CANVAS_FRAME_WIDTHS = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
} as const;

const CANVAS_FRAME_LABELS = {
  desktop: 'Desktop (900px)',
  tablet: 'Tablet (768px)',
  mobile: 'Mobile (375px)',
} as const;

const DEFAULT_SECTION_MAX_WIDTH = '900px';
const DEFAULT_HEADER_HEIGHT = '88px';
const DEFAULT_GRID_COLUMNS = 'repeat(6, 1fr)';
const DEFAULT_GRID_ROW = '22px';
const DEFAULT_GRID_GAP = '12px';

/**
 * ============================================
 * BLOCK: Trusted HTML Renderer
 * VERSION: 1.0.0
 * PURPOSE:
 * Единая точка рендера trusted-only HTML внутри builder canvas.
 *
 * NOTES:
 * Это не preview-runtime и не export-runtime.
 * Это только визуализация внутри editor layer.
 * ============================================
 */
interface TrustedHtmlProps {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}

function TrustedHtml({ html, className, style }: TrustedHtmlProps) {
  return (
    <div
      className={className}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * ============================================
 * BLOCK: Selection Overlay
 * VERSION: 1.0.0
 * PURPOSE:
 * Унифицированный overlay для выделенных builder-элементов.
 * ============================================
 */
function SelectionOverlay({
  label,
  labelClassName = '',
}: {
  label: string;
  labelClassName?: string;
}) {
  return (
    <>
      <div className="absolute inset-0 z-50 pointer-events-none border-2 border-[#2A80F4]" />
      <div
        className={cn(
          'absolute z-50 pointer-events-none rounded bg-[#2A80F4] px-2 py-0.5 text-xs text-white',
          labelClassName
        )}
      >
        {label}
      </div>
    </>
  );
}

/**
 * ============================================
 * BLOCK: Block Component
 * VERSION: 1.1.0
 * PURPOSE:
 * Визуализация блока внутри section content grid.
 * ============================================
 */
interface BlockComponentProps {
  block: Block;
  isSelected: boolean;
  onSelect: () => void;
}

function BlockComponent({ block, isSelected, onSelect }: BlockComponentProps) {
  const modeClass = block.mode !== 'clip' ? `block-${block.mode}` : '';
  const isButton = block.type === 'block-button';

  return (
    <div
      className={cn(
        'relative cursor-pointer transition-all duration-150',
        'block',
        modeClass,
        isSelected && 'ring-2 ring-[#2A80F4] ring-offset-2 ring-offset-[#111111]'
      )}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minHeight: 0,
        background: isButton ? '#272728' : '#1A1A1C',
        color: '#FFFFFF',
        border: `1px solid ${isSelected ? '#2A80F4' : '#313133'}`,
        borderRadius: '12px',
        justifyContent: isButton ? 'center' : undefined,
        alignItems: isButton ? 'center' : undefined,
        gridColumn: `span ${block.span}`,
        gridRow: `span ${block.rowSpan}`,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <TrustedHtml
        className="block-content"
        style={{
          padding: '12px',
          height: block.mode === 'auto' || block.mode === 'grow' ? 'auto' : '100%',
          boxSizing: 'border-box',
          overflowY: isButton ? 'hidden' : block.mode === 'scroll' ? 'auto' : 'hidden',
          overflowX: 'hidden',
          display: isButton ? 'flex' : undefined,
          alignItems: isButton ? 'center' : undefined,
          justifyContent: isButton ? 'center' : undefined,
          textAlign: isButton ? 'center' : undefined,
          width: '100%',
        }}
        html={block.content.html}
      />

      {isSelected && (
        <div className="absolute -left-1 -top-7 rounded bg-[#2A80F4] px-2 py-0.5 text-xs text-white">
          {block.span}x{block.rowSpan}
        </div>
      )}
    </div>
  );
}

/**
 * ============================================
 * BLOCK: Section Component
 * VERSION: 1.2.0
 * PURPOSE:
 * Визуализация секции и её изоляторов внутри builder canvas.
 * ============================================
 */
interface SectionComponentProps {
  section: Section;
  selectedElement: SelectedElement | null;
  onSelectElement: (element: SelectedElement | null) => void;
}

function SectionComponent({
  section,
  selectedElement,
  onSelectElement,
}: SectionComponentProps) {
  const isSectionSelected = selectedElement?.id === section.id;
  const isHeaderSelected = selectedElement?.id === section.header.id;
  const isContentSelected = selectedElement?.id === section.content.id;

  const headerHtml = section.header.endpoint?.html?.trim()
    ? section.header.endpoint.html
    : `<div class="h1 text-white">${section.header.title}</div>`;

  const contentEndpointHtml = section.content.endpoint?.html?.trim() || '';

  return (
    <div
      className="relative z-10 cursor-pointer transition-all duration-150"
      onClick={(event) => {
        event.stopPropagation();
        onSelectElement({ type: 'section', id: section.id });
      }}
    >
      {isSectionSelected && (
        <SelectionOverlay label="Section" labelClassName="-top-6 right-0" />
      )}

      {/* ============================================
          BLOCK: Header Isolator View
          VERSION: 1.0.0
          ============================================ */}
      <div
        className="relative z-10 cursor-pointer transition-all duration-150"
        style={{
          width: '100%',
          maxWidth: DEFAULT_SECTION_MAX_WIDTH,
          height: DEFAULT_HEADER_HEIGHT,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelectElement({
            type: 'header',
            id: section.header.id,
            parentId: section.id,
          });
        }}
      >
        {isHeaderSelected && (
          <SelectionOverlay label="Header" labelClassName="-top-6 right-0" />
        )}

        <TrustedHtml className="section-header-content w-full" html={headerHtml} />
      </div>

      {/* ============================================
          BLOCK: Content Isolator View
          VERSION: 1.0.0
          ============================================ */}
      <div
        className="relative z-10 cursor-pointer transition-all duration-150"
        style={{
          width: '100%',
          maxWidth: DEFAULT_SECTION_MAX_WIDTH,
          margin: '0 auto',
          position: 'relative',
          paddingTop: '0px',
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelectElement({
            type: 'content',
            id: section.content.id,
            parentId: section.id,
          });
        }}
      >
        {isContentSelected && (
          <SelectionOverlay label="Content" labelClassName="-top-6 right-0" />
        )}

        <div
          className="grid"
          style={{
            display: 'grid',
            gridTemplateColumns: DEFAULT_GRID_COLUMNS,
            gridAutoRows: DEFAULT_GRID_ROW,
            gap: DEFAULT_GRID_GAP,
            minHeight: '44px',
          }}
        >
          {section.content.blocks.map((block) => (
            <BlockComponent
              key={block.id}
              block={block}
              isSelected={selectedElement?.id === block.id}
              onSelect={() =>
                onSelectElement({
                  type: 'block',
                  id: block.id,
                  parentId: section.id,
                })
              }
            />
          ))}

          {section.content.blocks.length === 0 && !contentEndpointHtml && (
            <div
              className="col-span-6 row-span-2 flex items-center justify-center rounded-lg border-2 border-dashed border-[#313133] text-sm text-[#666]"
              style={{ minHeight: '56px' }}
            >
              Нажмите + для добавления блока
            </div>
          )}
        </div>

        {contentEndpointHtml && (
          <TrustedHtml
            className="mt-3 rounded-xl border border-[#313133] bg-[#151517] p-3 text-sm text-white"
            html={contentEndpointHtml}
          />
        )}
      </div>
    </div>
  );
}

/**
 * ============================================
 * MODULE: Canvas Root
 * VERSION: 1.2.0
 * ROLE:
 * Корневой компонент builder canvas.
 * ============================================
 */
export function Canvas() {
  const { project, selectedElement, viewMode, selectElement } = useProjectStore();

  /**
   * ============================================
   * BLOCK: Current Page Resolution
   * VERSION: 1.0.0
   * PURPOSE:
   * Пока builder работает с первой страницей проекта.
   * ============================================
   */
  const currentPage = project.pages[0];
  const canvasWidth = CANVAS_FRAME_WIDTHS[viewMode];
  const canvasLabel = CANVAS_FRAME_LABELS[viewMode];

  if (!currentPage) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#111111]">
        <div className="text-center">
          <div className="mb-2 text-lg text-[#666]">Нет страниц</div>
          <div className="text-sm text-[#B0B0B0]">Создайте новый проект</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-auto bg-[#111111]">
      <div
        className="relative z-10 flex min-h-full px-4 py-8 transition-all duration-300"
        style={{
          width: canvasWidth,
          margin: '0 auto',
          alignItems: currentPage.sections.length <= 1 ? 'center' : 'stretch',
        }}
        onClick={() => selectElement(null)}
      >
        <div className="w-full" style={{ margin: '0 auto' }}>
          {currentPage.sections.map((section) => (
            <SectionComponent
              key={section.id}
              section={section}
              selectedElement={selectedElement}
              onSelectElement={selectElement}
            />
          ))}

          {currentPage.sections.length === 0 && (
            <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-dashed border-[#2C3B55] bg-[#121a25] text-center">
              <div className="mb-2 text-lg text-[#9EB6D8]">Нет секций</div>
              <div className="mb-4 text-sm text-[#B0B0B0]">
                Нажмите &quot;Секция&quot; в верхней панели для добавления
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 rounded-lg border border-[#313133] bg-[#1A1A1C] px-3 py-1.5 text-xs text-[#B0B0B0]">
        {canvasLabel}
      </div>
    </div>
  );
}