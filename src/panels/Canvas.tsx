/**
 * ============================================
 * MODULE: Builder Canvas
 * VERSION: 4.2.0
 * ROLE:
 * Центральный визуальный холст builder-интерфейса.
 *
 * RESPONSIBILITIES:
 * - показывать реальный project preview как нижний слой
 * - показывать editor overlay как верхний слой
 * - поддерживать selection без выполнения runtime-логики проекта
 * - читать реальные координаты section/header/content/block из iframe DOM
 * - держать builder и preview в одном визуальном pipeline
 *
 * DEPENDS ON:
 * - useProjectStore()
 * - getProjectPreviewHtml()
 * - cn()
 *
 * USED BY:
 * - App.tsx
 *
 * RULES:
 * - нижний слой рендерит тот же HTML, что preview/code/export
 * - верхний слой отвечает только за editor visualization
 * - selection не должна зависеть от runtime click handlers
 * - builder не должен становиться вторым runtime-движком приложения
 * - клик по preview не должен запускать логику проекта
 * - overlay должен строиться по реальному DOM preview, а не по расчётной сетке
 *
 * SECURITY:
 * - runtime HTML здесь остаётся trusted-only внутри builder workflow
 * - iframe preview используется как визуальная поверхность
 * - пользователь не должен кликать по runtime-элементам внутри iframe
 * ============================================
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';

import { getProjectPreviewHtml } from '@/core/projectRuntimeHtml';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/store/projectStore';
import type { Section, SelectedElement } from '@/types/project';

/**
 * ============================================
 * BLOCK: Shared Constants
 * VERSION: 4.2.0
 * PURPOSE:
 * Централизованные размеры builder canvas и overlay.
 * ============================================
 */
const CANVAS_FRAME_WIDTHS = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
} as const;

const DEFAULT_MIN_PREVIEW_HEIGHT_PX = 320;
const DEFAULT_OVERLAY_LABEL_CLASS = '-top-6 right-0';

/**
 * ============================================
 * BLOCK: DOM Overlay Types
 * VERSION: 1.0.0
 * PURPOSE:
 * Typed map для координат элементов preview DOM.
 * ============================================
 */
type DomRectSnapshot = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type OverlayNodeSnapshot = {
  id: string;
  rect: DomRectSnapshot;
};

type OverlaySnapshotMap = {
  sections: Map<string, OverlayNodeSnapshot>;
  headers: Map<string, OverlayNodeSnapshot>;
  contents: Map<string, OverlayNodeSnapshot>;
  blocks: Map<string, OverlayNodeSnapshot>;
};

/**
 * ============================================
 * BLOCK: Selection Helpers
 * VERSION: 1.0.0
 * PURPOSE:
 * Нормализованные проверки selected element.
 * ============================================
 */
function isSelectedElement(
  selectedElement: SelectedElement | null,
  type: SelectedElement['type'],
  id: string
): boolean {
  return selectedElement?.type === type && selectedElement.id === id;
}

function isPointInsideRect(
  rect: DomRectSnapshot,
  x: number,
  y: number
): boolean {
  return (
    x >= rect.left &&
    x <= rect.left + rect.width &&
    y >= rect.top &&
    y <= rect.top + rect.height
  );
}

function resolveSelectedElementFromPoint(
  snapshot: OverlaySnapshotMap,
  sections: Section[],
  x: number,
  y: number
): SelectedElement | null {
  const blockEntry = Array.from(snapshot.blocks.values()).find((entry) =>
    isPointInsideRect(entry.rect, x, y)
  );

  if (blockEntry) {
    const section = findSectionByBlockId(sections, blockEntry.id);

    return {
      type: 'block',
      id: blockEntry.id,
      parentId: section?.id,
    };
  }

  const contentEntry = Array.from(snapshot.contents.values()).find((entry) =>
    isPointInsideRect(entry.rect, x, y)
  );

  if (contentEntry) {
    const section = findSectionByContentId(sections, contentEntry.id);

    return {
      type: 'content',
      id: contentEntry.id,
      parentId: section?.id,
    };
  }

  const headerEntry = Array.from(snapshot.headers.values()).find((entry) =>
    isPointInsideRect(entry.rect, x, y)
  );

  if (headerEntry) {
    const section = findSectionByHeaderId(sections, headerEntry.id);

    return {
      type: 'header',
      id: headerEntry.id,
      parentId: section?.id,
    };
  }

  const sectionEntry = Array.from(snapshot.sections.values()).find((entry) =>
    isPointInsideRect(entry.rect, x, y)
  );

  if (sectionEntry) {
    return {
      type: 'section',
      id: sectionEntry.id,
    };
  }

  return null;
}

/**
 * ============================================
 * BLOCK: Overlay Snapshot Helpers
 * VERSION: 1.0.0
 * PURPOSE:
 * Чтение реальных DOM bounds из iframe.
 * ============================================
 */
function createEmptyOverlaySnapshotMap(): OverlaySnapshotMap {
  return {
    sections: new Map(),
    headers: new Map(),
    contents: new Map(),
    blocks: new Map(),
  };
}

function mergeDomRects(rects: DomRectSnapshot[]): DomRectSnapshot | null {
  if (rects.length === 0) return null;

  const top = Math.min(...rects.map((rect) => rect.top));
  const left = Math.min(...rects.map((rect) => rect.left));
  const right = Math.max(...rects.map((rect) => rect.left + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.top + rect.height));

  return {
    top,
    left,
    width: right - left,
    height: bottom - top,
  };
}

function readOverlayNodes(
  doc: Document,
  selector: string,
  dataKey: keyof HTMLElement['dataset'],
  iframeRect: DOMRect,
  surfaceRect: DOMRect
): Map<string, OverlayNodeSnapshot> {
  const result = new Map<string, OverlayNodeSnapshot>();

  doc.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    const id = element.dataset[dataKey];
    if (!id) return;

    const rect = element.getBoundingClientRect();

    result.set(id, {
      id,
      rect: {
        top: iframeRect.top + rect.top - surfaceRect.top,
        left: iframeRect.left + rect.left - surfaceRect.left,
        width: rect.width,
        height: rect.height,
      },
    });
  });

  return result;
}

function collectOverlaySnapshotMap(
  iframe: HTMLIFrameElement,
  surfaceElement: HTMLDivElement
): OverlaySnapshotMap {
  const doc = iframe.contentDocument;
  if (!doc) {
    return createEmptyOverlaySnapshotMap();
  }

  const iframeRect = iframe.getBoundingClientRect();
  const surfaceRect = surfaceElement.getBoundingClientRect();

  const headers = readOverlayNodes(
    doc,
    '[data-header-id]',
    'headerId',
    iframeRect,
    surfaceRect
  );

  const contents = readOverlayNodes(
    doc,
    '[data-content-id]',
    'contentId',
    iframeRect,
    surfaceRect
  );

  const blocks = readOverlayNodes(
    doc,
    '[data-block-id]',
    'blockId',
    iframeRect,
    surfaceRect
  );

  const sections = new Map<string, OverlayNodeSnapshot>();

  doc.querySelectorAll<HTMLElement>('[data-section-shell-id]').forEach((element) => {
    const sectionId = element.dataset.sectionShellId;
    if (!sectionId) return;

    const headerElement = doc.querySelector<HTMLElement>(
      `[data-header-id][data-section-id="${sectionId}"]`
    );
    const contentElement = doc.querySelector<HTMLElement>(
      `[data-content-id][data-section-id="${sectionId}"]`
    );

    const rects: DomRectSnapshot[] = [];

    if (headerElement) {
      const rect = headerElement.getBoundingClientRect();
      rects.push({
        top: iframeRect.top + rect.top - surfaceRect.top,
        left: iframeRect.left + rect.left - surfaceRect.left,
        width: rect.width,
        height: rect.height,
      });
    }

    if (contentElement) {
      const rect = contentElement.getBoundingClientRect();
      rects.push({
        top: iframeRect.top + rect.top - surfaceRect.top,
        left: iframeRect.left + rect.left - surfaceRect.left,
        width: rect.width,
        height: rect.height,
      });
    }

    const mergedRect = mergeDomRects(rects);

    if (!mergedRect) return;

    sections.set(sectionId, {
      id: sectionId,
      rect: mergedRect,
    });
  });

  return {
    sections,
    headers,
    contents,
    blocks,
  };
}


/**
 * ============================================
 * BLOCK: Section Lookup Helpers
 * VERSION: 1.0.0
 * PURPOSE:
 * Поиск parent section для selection payload.
 * ============================================
 */
function findSectionByHeaderId(sections: Section[], headerId: string): Section | null {
  return sections.find((section) => section.header.id === headerId) ?? null;
}

function findSectionByContentId(sections: Section[], contentId: string): Section | null {
  return sections.find((section) => section.content.id === contentId) ?? null;
}

function findSectionByBlockId(sections: Section[], blockId: string): Section | null {
  return (
    sections.find((section) =>
      section.content.blocks.some((block) => block.id === blockId)
    ) ?? null
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
  labelClassName = DEFAULT_OVERLAY_LABEL_CLASS,
}: {
  label: string;
  labelClassName?: string;
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 z-50 pointer-events-none border-2 border-[#2A80F4]"
      />
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
 * BLOCK: Preview Surface
 * VERSION: 4.2.0
 * PURPOSE:
 * Реальный runtime preview как нижний слой canvas.
 *
 * NOTES:
 * - использует тот же HTML, что code/export preview pipeline
 * - сам не участвует в selection UI
 * - отдаёт наружу актуальную высоту iframe и DOM snapshot
 * ============================================
 */
interface PreviewSurfaceProps {
  html: string;
  frameWidth: string;
  previewHeight: number;
  surfaceRef: RefObject<HTMLDivElement | null>;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  onHeightChange: (height: number) => void;
  onSnapshotChange: (snapshot: OverlaySnapshotMap) => void;
}

function PreviewSurface({
  html,
  frameWidth,
  previewHeight,
  surfaceRef,
  iframeRef,
  onHeightChange,
  onSnapshotChange,
}: PreviewSurfaceProps) {
  useEffect(() => {
    const iframe = iframeRef.current;
    const surface = surfaceRef.current;

    if (!iframe || !surface) return;

    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let rafId = 0;

    const updateGeometry = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      const body = doc.body;
      const htmlElement = doc.documentElement;

      const nextHeight = Math.max(
        body?.scrollHeight || 0,
        body?.offsetHeight || 0,
        htmlElement?.scrollHeight || 0,
        htmlElement?.offsetHeight || 0
      );

      onHeightChange(Math.max(nextHeight, DEFAULT_MIN_PREVIEW_HEIGHT_PX));
      onSnapshotChange(collectOverlaySnapshotMap(iframe, surface));
    };

    const scheduleGeometryUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateGeometry);
    };

    const handleLoad = () => {
      scheduleGeometryUpdate();

      const doc = iframe.contentDocument;
      if (!doc) return;

      if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => {
          scheduleGeometryUpdate();
        });

        if (doc.documentElement) resizeObserver.observe(doc.documentElement);
        if (doc.body) resizeObserver.observe(doc.body);
      }

      mutationObserver = new MutationObserver(() => {
        scheduleGeometryUpdate();
      });

      if (doc.documentElement) {
        mutationObserver.observe(doc.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });
      }
    };



    iframe.addEventListener('load', handleLoad);
    window.addEventListener('resize', scheduleGeometryUpdate);
    window.addEventListener('scroll', scheduleGeometryUpdate, true);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      window.removeEventListener('resize', scheduleGeometryUpdate);
      window.removeEventListener('scroll', scheduleGeometryUpdate, true);

      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [
    html,
    iframeRef,
    onHeightChange,
    onSnapshotChange,
    surfaceRef,
  ]);

  return (
    <iframe
      ref={iframeRef}
      title="Builder Preview Surface"
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      className="relative z-0 block w-full border-0 bg-[#111111]"
      style={{
        width: frameWidth,
        height: `${previewHeight}px`,
        minHeight: `${DEFAULT_MIN_PREVIEW_HEIGHT_PX}px`,
        pointerEvents: 'none',
      }}
    />
  );
}

/**
 * ============================================
 * BLOCK: Overlay Box
 * VERSION: 1.0.0
 * PURPOSE:
 * Универсальный визуальный прямоугольник над preview DOM.
 * ============================================
 */
interface OverlayBoxProps {
  rect: DomRectSnapshot;
  isSelected: boolean;
  label?: string;
  labelClassName?: string;
  className?: string;
}

function OverlayBox({
  rect,
  isSelected,
  label,
  labelClassName = DEFAULT_OVERLAY_LABEL_CLASS,
  className,
}: OverlayBoxProps) {
  if (!isSelected || !label) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute z-20 pointer-events-none transition-all duration-150',
        className
      )}
      style={{
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      }}
    >
      <SelectionOverlay
        label={label}
        labelClassName={labelClassName}
      />
    </div>
  );
}

/**
 * ============================================
 * BLOCK: Editor Overlay
 * VERSION: 4.2.0
 * PURPOSE:
 * Верхний editor layer над real preview surface.
 *
 * NOTES:
 * - ловит только builder interactions
 * - рисует selection по реальным iframe DOM bounds
 * ============================================
 */
interface EditorOverlayProps {
  selectedElement: SelectedElement | null;
  snapshot: OverlaySnapshotMap;
  sections: Section[];
  minHeight: number;
  onSelectElement: (element: SelectedElement | null) => void;
}

function EditorOverlay({
  selectedElement,
  snapshot,
  sections,
  minHeight,
  onSelectElement,
}: EditorOverlayProps) {
  const sectionEntries = Array.from(snapshot.sections.values());
  const headerEntries = Array.from(snapshot.headers.values());
  const contentEntries = Array.from(snapshot.contents.values());
  const blockEntries = Array.from(snapshot.blocks.values());

  return (
    <div
      className="absolute left-0 top-0 z-10 w-full pointer-events-auto"
      style={{ height: `${minHeight}px` }}
      onMouseDown={(event) => {
        const nextSelectedElement = resolveSelectedElementFromPoint(
          snapshot,
          sections,
          event.nativeEvent.offsetX,
          event.nativeEvent.offsetY
        );

        onSelectElement(nextSelectedElement);
      }}
      onDoubleClick={(event) => {
        const nextSelectedElement = resolveSelectedElementFromPoint(
          snapshot,
          sections,
          event.nativeEvent.offsetX,
          event.nativeEvent.offsetY
        );

        if (nextSelectedElement?.type === 'block') {
          const section = findSectionByBlockId(sections, nextSelectedElement.id);

          if (section) {
            onSelectElement({
              type: 'content',
              id: section.content.id,
              parentId: section.id,
            });
            return;
          }
        }

        if (nextSelectedElement?.type === 'content') {
          const section = findSectionByContentId(sections, nextSelectedElement.id);

          if (section) {
            onSelectElement({
              type: 'section',
              id: section.id,
            });
            return;
          }
        }

        if (nextSelectedElement?.type === 'header') {
          const section = findSectionByHeaderId(sections, nextSelectedElement.id);

          if (section) {
            onSelectElement({
              type: 'section',
              id: section.id,
            });
            return;
          }
        }

        onSelectElement(nextSelectedElement);
      }}
    >
      {sectionEntries.map((entry) => (
        <OverlayBox
          key={`section-${entry.id}`}
          rect={entry.rect}
          isSelected={isSelectedElement(selectedElement, 'section', entry.id)}
          label="Section"
        />
      ))}

      {headerEntries.map((entry) => (
        <OverlayBox
          key={`header-${entry.id}`}
          rect={entry.rect}
          isSelected={isSelectedElement(selectedElement, 'header', entry.id)}
          label="Header"
        />
      ))}

      {contentEntries.map((entry) => (
        <OverlayBox
          key={`content-${entry.id}`}
          rect={entry.rect}
          isSelected={isSelectedElement(selectedElement, 'content', entry.id)}
          label="Content"
        />
      ))}

      {blockEntries.map((entry) => (
        <OverlayBox
          key={`block-${entry.id}`}
          rect={entry.rect}
          isSelected={isSelectedElement(selectedElement, 'block', entry.id)}
          label="Block"
          className="rounded-xl"
        />
      ))}
    </div>
  );
}

/**
 * ============================================
 * MODULE: Canvas Root
 * VERSION: 4.2.0
 * ROLE:
 * Корневой компонент builder canvas.
 *
 * ARCHITECTURE:
 * - Layer 1: real preview surface
 * - Layer 2: DOM-driven editor overlay
 * ============================================
 */
export function Canvas() {
  const { project, selectedElement, viewMode, selectElement } = useProjectStore();

  const [previewHeight, setPreviewHeight] = useState(DEFAULT_MIN_PREVIEW_HEIGHT_PX);
  const [canvasViewportHeight, setCanvasViewportHeight] = useState(
    DEFAULT_MIN_PREVIEW_HEIGHT_PX
  );
  const [overlaySnapshot, setOverlaySnapshot] = useState<OverlaySnapshotMap>(
    createEmptyOverlaySnapshotMap()
  );

  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const currentPage = project.pages[0];
  const canvasWidth = CANVAS_FRAME_WIDTHS[viewMode];
  const previewHtml = useMemo(() => getProjectPreviewHtml(project), [project]);
  const frameHeight = Math.max(previewHeight, canvasViewportHeight);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      selectElement(null);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectElement]);

  useEffect(() => {
    const root = canvasViewportRef.current;
    if (!root) return;

    const updateViewportHeight = () => {
      const nextHeight = Math.max(
        root.clientHeight - 64,
        DEFAULT_MIN_PREVIEW_HEIGHT_PX
      );

      setCanvasViewportHeight(nextHeight);
    };

    updateViewportHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateViewportHeight();
    });

    resizeObserver.observe(root);
    window.addEventListener('resize', updateViewportHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateViewportHeight);
    };
  }, []);

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
    <div
      ref={canvasViewportRef}
      className="relative flex-1 min-h-0 bg-[#111111]"
    >
      <ScrollArea className="h-full">
        <div
          className="relative px-4 py-8 transition-all duration-300"
          style={{
            width: canvasWidth,
            margin: '0 auto',
          }}
        >
          <div
            ref={surfaceRef}
            className="relative w-full"
            style={{
              minHeight: `${frameHeight}px`,
              margin: '0 auto',
            }}
          >
            <PreviewSurface
              html={previewHtml}
              frameWidth="100%"
              previewHeight={frameHeight}
              surfaceRef={surfaceRef}
              iframeRef={iframeRef}
              onHeightChange={setPreviewHeight}
              onSnapshotChange={setOverlaySnapshot}
            />

            <EditorOverlay
              selectedElement={selectedElement}
              snapshot={overlaySnapshot}
              sections={currentPage.sections}
              minHeight={frameHeight}
              onSelectElement={selectElement}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}