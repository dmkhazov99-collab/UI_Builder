/**
 * ============================================
 * MODULE: Preview Panel
 * VERSION: 2.0.0
 * ROLE:
 * Изолированно рендерит runtime HTML проекта в iframe.
 *
 * RESPONSIBILITIES:
 * - читать единый HTML source layer
 * - рендерить runtime HTML в iframe
 * - поддерживать desktop/tablet/mobile frame modes
 * - использовать тот же self-contained HTML, что показывает CodePanel
 *
 * DEPENDS ON:
 * - useProjectStore()
 * - getProjectPreviewHtml()
 *
 * USED BY:
 * - App.tsx
 *
 * RULES:
 * - preview не должен иметь свой отдельный pipeline сборки HTML
 * - iframe должен рендерить тот же HTML, что показывает CodePanel
 * - preview-panel не должен добавлять отдельную "шапку" над runtime
 * - desktop preview должен занимать всю доступную область панели
 * - смена viewMode должна пересоздавать iframe
 *
 * SECURITY:
 * - preview рендерится только в iframe
 * - allow-same-origin не используется
 * - builder DOM и preview DOM изолированы
 * ============================================
 */

import { useMemo } from 'react';

import { getProjectPreviewHtml } from '@/core/projectRuntimeHtml';
import { useProjectStore } from '@/store/projectStore';

/**
 * ============================================
 * BLOCK: Frame Widths
 * VERSION: 1.0.0
 * PURPOSE:
 * Ширина preview-frame для каждого screen mode.
 * ============================================
 */
const FRAME_WIDTHS = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
} as const;

/**
 * ============================================
 * MODULE: Preview Panel Root
 * VERSION: 2.0.0
 * ROLE:
 * Корневой preview-panel для runtime iframe.
 * ============================================
 */
export function PreviewPanel() {
  const { project, viewMode } = useProjectStore();

  /**
   * ============================================
   * BLOCK: Runtime HTML Source
   * VERSION: 2.0.0
   * PURPOSE:
   * Получить self-contained runtime HTML проекта.
   * ============================================
   */
  const runtimeHtml = useMemo(() => getProjectPreviewHtml(project), [project]);

  /**
   * ============================================
   * BLOCK: Iframe Identity
   * VERSION: 1.1.0
   * PURPOSE:
   * Формировать стабильный key для remount iframe при смене режима
   * или изменении runtime HTML.
   * ============================================
   */
  const iframeKey = useMemo(() => {
    return `${viewMode}-${project.meta.updatedAt}-${runtimeHtml.length}`;
  }, [project.meta.updatedAt, runtimeHtml.length, viewMode]);

  const frameWidth = FRAME_WIDTHS[viewMode];

  return (
    <div className="flex-1 min-h-0 overflow-hidden bg-transparent">
      <div className="flex h-full w-full justify-center overflow-auto bg-transparent">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: frameWidth,
            maxWidth: '100%',
          }}
        >
          <iframe
            key={iframeKey}
            title="UI Builder Preview"
            srcDoc={runtimeHtml}
            sandbox="allow-scripts allow-forms allow-modals"
            className="block h-full w-full bg-transparent"
            style={{ border: 0 }}
          />
        </div>
      </div>
    </div>
  );
}