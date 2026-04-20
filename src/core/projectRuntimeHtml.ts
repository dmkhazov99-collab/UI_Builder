/**
 * ============================================
 * MODULE: Project Runtime HTML Resolver
 * VERSION: 1.0.0
 * ROLE:
 * Единый источник runtime HTML для code preview,
 * iframe preview и будущего export pipeline.
 *
 * RESPONSIBILITIES:
 * - собрать полный HTML проекта
 * - при необходимости встроить preview-runtime
 * - вернуть безопасный fallback при ошибке генерации
 *
 * DEPENDS ON:
 * - Project
 * - resolveProjectHtml()
 *
 * USED BY:
 * - CodePanel
 * - PreviewPanel
 *
 * RULES:
 * - builder и preview не должны собирать HTML разными путями
 * - весь runtime HTML должен идти через этот модуль
 *
 * SECURITY:
 * - preview-runtime добавляется только для iframe preview
 * - HTML здесь считается trusted-only внутри builder workflow
 * ============================================
 */

import type { Project } from '@/types/project';
import { resolveProjectHtml } from '@/core/htmlExporter';

const PREVIEW_RUNTIME_SNIPPET = `
<script>
(function () {
  if (!window.google) window.google = {};
  if (!window.google.script) window.google.script = {};

  if (!window.google.script.run) {
    const chain = {
      withSuccessHandler: function () { return this; },
      withFailureHandler: function () { return this; },
      withUserObject: function () { return this; }
    };

    window.google.script.run = new Proxy(chain, {
      get: function(target, prop) {
        if (prop in target) return target[prop];

        return function() {
          console.info(
            '[UI Builder Preview] google.script.run mock call:',
            String(prop),
            Array.from(arguments)
          );
          return target;
        };
      }
    });
  }
})();
</script>
`.trim();

function injectPreviewRuntime(html: string): string {
  if (html.includes('</head>')) {
    return html.replace('</head>', `${PREVIEW_RUNTIME_SNIPPET}\n</head>`);
  }

  return `${PREVIEW_RUNTIME_SNIPPET}\n${html}`;
}

function buildGenerationErrorHtml(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return `<!-- Failed to generate project HTML:
${message}
-->`;
}

/**
 * ============================================
 * BLOCK: Base HTML Resolution
 * VERSION: 1.0.0
 * PURPOSE:
 * Получить основной итоговый HTML проекта без preview-runtime.
 * ============================================
 */
export function getProjectBaseHtml(project: Project): string {
  try {
    return resolveProjectHtml(project);
  } catch (error) {
    return buildGenerationErrorHtml(error);
  }
}

/**
 * ============================================
 * BLOCK: Preview Runtime HTML
 * VERSION: 1.0.0
 * PURPOSE:
 * Получить HTML для iframe preview с подключённым preview-runtime.
 * ============================================
 */
export function getProjectPreviewHtml(project: Project): string {
  return injectPreviewRuntime(getProjectBaseHtml(project));
}