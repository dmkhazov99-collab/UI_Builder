/**
 * ============================================
 * MODULE: Code Panel
 * VERSION: 2.0.0
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
 * - getProjectBaseHtml()
 *
 * USED BY:
 * - App.tsx
 *
 * RULES:
 * - не содержит собственной логики сборки HTML
 * - не исполняет пользовательский код
 * - показывает тот же self-contained HTML, что идёт в export pipeline
 * - не добавляет отдельную "шапку" над кодом
 *
 * SECURITY:
 * - HTML здесь отображается только как текст
 * - никакой dangerouslySetInnerHTML
 * ============================================
 */

import { useMemo } from 'react';

import { getProjectBaseHtml } from '@/core/projectRuntimeHtml';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProjectStore } from '@/store/projectStore';

/**
 * ============================================
 * MODULE: Code Panel Root
 * VERSION: 2.0.0
 * ROLE:
 * Корневой read-only viewer итогового index.html.
 * ============================================
 */
export function CodePanel() {
  const project = useProjectStore((state) => state.project);

  /**
   * ============================================
   * BLOCK: Generated Runtime HTML
   * VERSION: 2.0.0
   * PURPOSE:
   * Получить итоговый self-contained HTML проекта.
   * ============================================
   */
  const runtimeHtml = useMemo(() => getProjectBaseHtml(project), [project]);

return (
  <div className="flex h-full min-h-0 flex-col bg-[#111111]">
    <ScrollArea className="min-h-0 flex-1 bg-[#111111]">
      <pre className="min-h-full whitespace-pre-wrap break-words bg-[#111111] p-4 font-mono text-xs leading-5 text-[#FFFFFF]">
        <code>{runtimeHtml}</code>
      </pre>
    </ScrollArea>
  </div>
);
}