/**
 * ЦЕНТРАЛЬНЫЙ ХОЛСТ - Визуальное редактирование
 */

import { useProjectStore } from '@/store/projectStore';
import { cn } from '@/lib/utils';
import type { Block, Section, SelectedElement } from '@/types/project';

// ============================================
// КОМПОНЕНТ БЛОКА
// ============================================

interface BlockComponentProps {
  block: Block;
  pageId: string;
  isSelected: boolean;
  onSelect: () => void;
}

function BlockComponent({
  block,
  isSelected,
  onSelect,
}: BlockComponentProps) {
  const modeClass = block.mode !== 'clip' ? `block-${block.mode}` : '';
  const isButton = block.type === 'block-button';

  const content = (
    <div
      className={cn(
        'relative transition-all duration-150',
        'block',
        modeClass,
        isSelected && 'ring-2 ring-[#2A80F4] ring-offset-2 ring-offset-[#111111]',
        'cursor-pointer'
      )}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        background: isButton ? '#272728' : '#1A1A1C',
        color: '#FFFFFF',
        border: `1px solid ${isSelected ? '#2A80F4' : '#313133'}`,
        borderRadius: '12px',
        minHeight: 0,
        justifyContent: isButton ? 'center' : undefined,
        alignItems: isButton ? 'center' : undefined,
        gridColumn: `span ${block.span}`,
        gridRow: `span ${block.rowSpan}`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <div
        className="block-content"
        style={{
          padding: '12px',
          height: block.mode === 'auto' || block.mode === 'grow' ? 'auto' : '100%',
          boxSizing: 'border-box',
          overflowY:
            isButton
              ? 'hidden'
              : block.mode === 'scroll'
                ? 'auto'
                : 'hidden',
          overflowX: 'hidden',
          pointerEvents: 'none',
          userSelect: 'none',
          display: isButton ? 'flex' : undefined,
          alignItems: isButton ? 'center' : undefined,
          justifyContent: isButton ? 'center' : undefined,
          textAlign: isButton ? 'center' : undefined,
          width: '100%',
        }}
        dangerouslySetInnerHTML={{ __html: block.content.html }}
      />

      {/* Индикатор размера */}
      {isSelected && (
        <div className="absolute -top-7 -left-1 bg-[#2A80F4] text-white text-xs px-2 py-0.5 rounded">
          {block.span}x{block.rowSpan}
        </div>
      )}
    </div>
  );

  return content;
}

// ============================================
// OVERLAY ВЫДЕЛЕНИЯ
// ============================================

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
          'absolute bg-[#2A80F4] text-white text-xs px-2 py-0.5 rounded z-50 pointer-events-none',
          labelClassName
        )}
      >
        {label}
      </div>
    </>
  );
}

// ============================================
// КОМПОНЕНТ СЕКЦИИ
// ============================================

interface SectionComponentProps {
  section: Section;
  pageId: string;
  selectedElement: SelectedElement | null;
  onSelectElement: (element: SelectedElement | null) => void;
}

function SectionComponent({
  section,
  pageId,
  selectedElement,
  onSelectElement,
}: SectionComponentProps) {
  const isSectionSelected = selectedElement?.id === section.id;
  const isHeaderSelected = selectedElement?.id === section.header.id;
  const isContentSelected = selectedElement?.id === section.content.id;

  return (
    <div
      className={cn(
        'cursor-pointer transition-all duration-150 relative z-10'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelectElement({ type: 'section', id: section.id });
      }}
    >
      {isSectionSelected && (
        <SelectionOverlay label="Section" labelClassName="-top-6 right-0" />
      )}

      {/* ЗАГОЛОВОЧНЫЙ ИЗОЛЯТОР */}
      <div
        className={cn(
          'cursor-pointer transition-all duration-150 relative z-10'
        )}
        style={{
          width: '100%',
          maxWidth: '900px',
          height: '88px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectElement({ type: 'header', id: section.header.id, parentId: section.id });
        }}
      >
        {isHeaderSelected && (
          <SelectionOverlay label="Header" labelClassName="-top-6 right-0" />
        )}

        <div
          className="section-header-content w-full"
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
          dangerouslySetInnerHTML={{
            __html: section.header.endpoint?.html?.trim()
              ? section.header.endpoint.html
              : `<div class="h1 text-white">${section.header.title}</div>`,
          }}
        />
      </div>

      {/* КОНТЕНТНЫЙ ИЗОЛЯТОР */}
      <div
        className={cn(
          'cursor-pointer transition-all duration-150 relative z-10'
        )}
        style={{
          width: '100%',
          maxWidth: '900px',
          margin: '0 auto',
          position: 'relative',
          paddingTop: '0px',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectElement({ type: 'content', id: section.content.id, parentId: section.id });
        }}
      >
        {isContentSelected && (
          <SelectionOverlay label="Content" labelClassName="-top-6 right-0" />
        )}

        {/* СЕТКА */}
        <div
          className="grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gridAutoRows: '22px',
            gap: '12px',
            minHeight: '44px',
          }}
        >
          {section.content.blocks.map((block) => (
            <BlockComponent
              key={block.id}
              block={block}
              pageId={pageId}
              isSelected={selectedElement?.id === block.id}
              onSelect={() =>
                onSelectElement({ type: 'block', id: block.id, parentId: section.id })
              }
            />
          ))}

          {/* Пустое состояние */}
          {section.content.blocks.length === 0 && !section.content.endpoint?.html?.trim() && (
            <div
              className="col-span-6 row-span-2 flex items-center justify-center text-[#666] text-sm border-2 border-dashed border-[#313133] rounded-lg"
              style={{ minHeight: '56px' }}
            >
              Нажмите + для добавления блока
            </div>
          )}
        </div>

        {section.content.endpoint?.html?.trim() && (
          <div
            className="mt-3 rounded-xl border border-[#313133] bg-[#151517] p-3 text-sm text-white"
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
            }}
            dangerouslySetInnerHTML={{ __html: section.content.endpoint.html }}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// ГЛАВНЫЙ КОМПОНЕНТ ХОЛСТА
// ============================================

export function Canvas() {
  const {
    project,
    selectedElement,
    viewMode,
    selectElement,
  } = useProjectStore();

  const currentPage = project.pages[0];

  const canvasWidth = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  }[viewMode];

  if (!currentPage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#111111]">
        <div className="text-center">
          <div className="text-[#666] text-lg mb-2">Нет страниц</div>
          <div className="text-[#B0B0B0] text-sm">Создайте новый проект</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#111111] overflow-auto relative">
      {/* Контейнер холста */}
      <div
        className="min-h-full px-4 py-8 relative z-10 transition-all duration-300 flex"
        style={{
          width: canvasWidth,
          margin: '0 auto',
          alignItems: currentPage.sections.length <= 1 ? 'center' : 'stretch',
        }}
        onClick={() => selectElement(null)}
      >
        <div className="w-full" style={{ margin: '0 auto' }}>
          {/* Секции */}
          {currentPage.sections.map((section) => (
            <SectionComponent
              key={section.id}
              section={section}
              pageId={currentPage.id}
              selectedElement={selectedElement}
              onSelectElement={selectElement}
            />
          ))}

          {/* Пустое состояние */}
          {currentPage.sections.length === 0 && (
            <div className="flex flex-col items-center justify-center h-96 text-center rounded-2xl border border-dashed border-[#2C3B55] bg-[#121a25]">
              <div className="text-[#9EB6D8] text-lg mb-2">Нет секций</div>
              <div className="text-[#B0B0B0] text-sm mb-4">
                Нажмите "Секция" в верхней панели для добавления
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Индикатор режима просмотра */}
      <div className="absolute bottom-4 right-4 bg-[#1A1A1C] border border-[#313133] rounded-lg px-3 py-1.5 text-xs text-[#B0B0B0]">
        {viewMode === 'desktop' && 'Desktop (900px)'}
        {viewMode === 'tablet' && 'Tablet (768px)'}
        {viewMode === 'mobile' && 'Mobile (375px)'}
      </div>
    </div>
  );
}