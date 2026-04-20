/**
 * ============================================
 * MODULE: Preview Panel
 * VERSION: 1.2.0
 * ROLE:
 * Изолированно рендерит runtime HTML проекта в iframe.
 *
 * RESPONSIBILITIES:
 * - читать единый HTML source layer
 * - рендерить runtime HTML в iframe
 * - поддерживать desktop/tablet/mobile frame modes
 * - уметь принудительно перемонтировать iframe
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
 * - refresh должен реально remount-ить iframe
 *
 * SECURITY:
 * - preview рендерится только в iframe
 * - allow-same-origin не используется
 * - builder DOM и preview DOM изолированы
 * ============================================
 */

import { useMemo, useState } from 'react';
import { Monitor, RefreshCcw, Smartphone, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getProjectPreviewHtml } from '@/core/projectRuntimeHtml';
import { useProjectStore } from '@/store/projectStore';

const FRAME_WIDTHS = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
} as const;

const FRAME_LABELS = {
  desktop: 'Desktop preview',
  tablet: 'Tablet preview',
  mobile: 'Mobile preview',
} as const;

export function PreviewPanel() {
  const { project, viewMode } = useProjectStore();
  const [refreshToken, setRefreshToken] = useState(0);

  /**
   * ============================================
   * BLOCK: Runtime HTML Source
   * VERSION: 1.0.0
   * PURPOSE:
   * Получить тот же runtime HTML, что показывается в CodePanel.
   * ============================================
   */
  const runtimeHtml = useMemo(() => getProjectPreviewHtml(project), [project]);

  /**
   * ============================================
   * BLOCK: Iframe Identity
   * VERSION: 1.0.0
   * PURPOSE:
   * Формировать стабильный key для реального remount iframe.
   * ============================================
   */
  const iframeKey = useMemo(() => {
    return `${viewMode}-${project.meta.updatedAt}-${runtimeHtml.length}-${refreshToken}`;
  }, [project.meta.updatedAt, refreshToken, runtimeHtml.length, viewMode]);

  const frameWidth = FRAME_WIDTHS[viewMode];
  const frameLabel = FRAME_LABELS[viewMode];

  const handleRefresh = () => {
    setRefreshToken((value) => value + 1);
  };

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#0F1012]">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#111827]/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-white">Preview</div>
            <div className="text-xs text-white/60">
              Режим runtime: builder остаётся изолированным, preview рендерится отдельно.
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/70">
            {viewMode === 'desktop' && <Monitor className="h-4 w-4" />}
            {viewMode === 'tablet' && <Tablet className="h-4 w-4" />}
            {viewMode === 'mobile' && <Smartphone className="h-4 w-4" />}

            <span>{frameLabel}</span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-2 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={handleRefresh}
            >
              <RefreshCcw className="h-4 w-4" />
              Обновить
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-full px-4 py-8">
        <div
          className="mx-auto transition-all duration-300"
          style={{ width: frameWidth, maxWidth: '100%' }}
        >
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
            <iframe
              key={iframeKey}
              title="UI Builder Preview"
              srcDoc={runtimeHtml}
              sandbox="allow-scripts allow-forms allow-modals"
              className="block w-full bg-white"
              style={{ minHeight: 'calc(100vh - 220px)', border: 0 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}