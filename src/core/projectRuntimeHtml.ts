/**
 * ============================================
 * MODULE: Project Runtime HTML Resolver
 * VERSION: 2.1.0
 * ROLE:
 * Единый источник runtime HTML для code preview,
 * iframe preview и будущего export pipeline.
 *
 * RESPONSIBILITIES:
 * - собрать полный HTML проекта
 * - вернуть единый self-contained runtime HTML
 * - вернуть безопасный fallback при ошибке генерации
 *
 * DEPENDS ON:
 * - Project
 * - resolveProjectHtml()
 *
 * USED BY:
 * - CodePanel
 * - PreviewPanel
 * - будущий PreviewSurface
 *
 * RULES:
 * - builder и preview не должны собирать HTML разными путями
 * - весь runtime HTML должен идти через этот модуль
 * - отдельный preview-runtime больше не инжектится вторым слоем
 * - google.script preview mock должен приезжать из exporter
 * - этот модуль не должен дублировать exporter pipeline
 *
 * SECURITY:
 * - HTML здесь считается trusted-only внутри builder workflow
 * - модуль не должен дублировать runtime/export pipeline
 * ============================================
 */

import { resolveProjectHtml } from '@/core/htmlExporter';
import type { Project } from '@/types/project';

/**
 * ============================================
 * BLOCK: Error Fallback HTML
 * VERSION: 2.0.0
 * PURPOSE:
 * Построить безопасный HTML fallback на случай ошибки генерации.
 * ============================================
 */
function buildGenerationErrorHtml(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HTML generation error</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #111111;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    body {
      padding: 24px;
    }

    .runtime-error {
      max-width: 960px;
      margin: 0 auto;
      border: 1px solid rgba(255, 64, 83, 0.35);
      background: rgba(255, 64, 83, 0.08);
      border-radius: 12px;
      padding: 16px;
    }

    .runtime-error__title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .runtime-error__message {
      white-space: pre-wrap;
      word-break: break-word;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      line-height: 1.6;
      color: #ffb8c0;
    }
  </style>
</head>
<body>
  <div class="runtime-error">
    <div class="runtime-error__title">Не удалось сгенерировать runtime HTML</div>
    <div class="runtime-error__message">${escapeHtml(message)}</div>
  </div>
</body>
</html>`;
}

/**
 * ============================================
 * BLOCK: Escape Helper
 * VERSION: 1.0.0
 * PURPOSE:
 * Экранирование текста ошибки для fallback HTML.
 * ============================================
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * ============================================
 * BLOCK: Base HTML Resolution
 * VERSION: 2.1.0
 * PURPOSE:
 * Получить основной итоговый HTML проекта.
 *
 * NOTES:
 * Exporter уже обязан возвращать self-contained HTML:
 * - runtime CSS
 * - block CSS registry
 * - google.script preview mock
 * - runtime JS
 * - block JS registry
 * - project custom JS
 *
 * IMPORTANT:
 * Этот слой не добавляет дополнительный runtime,
 * не патчит HTML после exporter и не меняет pipeline.
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
 * VERSION: 2.1.0
 * PURPOSE:
 * Получить HTML для iframe preview.
 *
 * NOTES:
 * На текущем этапе preview использует тот же самый self-contained
 * HTML, что и code/export pipeline.
 * Дополнительная инъекция runtime здесь не допускается.
 * ============================================
 */
export function getProjectPreviewHtml(project: Project): string {
  return getProjectBaseHtml(project);
}