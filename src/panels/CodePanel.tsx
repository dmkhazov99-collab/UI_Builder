/**
 * ============================================
 * MODULE: Code Panel
 * VERSION: 1.2.0
 * ROLE:
 * Показывает полный runtime HTML проекта в read-only виде.
 *
 * RESPONSIBILITIES:
 * - читать единый HTML source layer
 * - показывать итоговый index.html как текст
 * - автоматически обновляться при изменениях builder state
 *
 * DEPENDS ON:
 * - useProjectStore()
 * - getProjectPreviewHtml()
 *
 * USED BY:
 * - App.tsx
 *
 * RULES:
 * - не содержит собственной логики сборки HTML
 * - не исполняет пользовательский код
 * - показывает тот же HTML, который получает PreviewPanel
 * - не добавляет отдельную "шапку" над кодом
 *
 * SECURITY:
 * - HTML здесь отображается только как текст
 * - никакой dangerouslySetInnerHTML
 * ============================================
 */

import { useMemo } from 'react';
import { getProjectPreviewHtml } from '@/core/projectRuntimeHtml';
import { useProjectStore } from '@/store/projectStore';

export function CodePanel() {
  const project = useProjectStore((state) => state.project);

  /**
   * ============================================
   * BLOCK: Generated Runtime HTML
   * VERSION: 1.0.0
   * PURPOSE:
   * Получить тот же HTML, который идёт в iframe preview.
   * ============================================
   */
  const runtimeHtml = useMemo(() => getProjectPreviewHtml(project), [project]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <div className="min-h-0 flex-1 overflow-auto">
        <pre className="min-h-full whitespace-pre-wrap break-words p-4 text-xs leading-5">
          <code>{runtimeHtml}</code>
        </pre>
      </div>
    </div>
  );
}