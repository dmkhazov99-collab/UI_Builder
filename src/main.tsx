/**
 * ============================================
 * MODULE: Application Bootstrap Entrypoint
 * VERSION: 1.0.0
 * ROLE:
 * Точка входа UI builder приложения.
 * Подключает глобальные стили, создает React root
 * и монтирует корневой App-компонент в DOM.
 *
 * RESPONSIBILITIES:
 * - Подключать глобальные стили приложения
 * - Находить root DOM container
 * - Инициализировать React root
 * - Монтировать App внутри StrictMode
 *
 * DEPENDS ON:
 * - react
 * - react-dom/client
 * - ./index.css
 * - ./App
 *
 * USED BY:
 * - Vite/browser runtime entry
 *
 * RULES:
 * - Не содержит бизнес-логики
 * - Не содержит builder/store/export/runtime деталей
 * - Только bootstrap приложения
 *
 * SECURITY:
 * - Монтирование выполняется только в доверенный root container
 * - Любые unsafe runtime-механики не должны находиться в bootstrap-слое
 * ============================================
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import App from './App';

/**
 * ============================================
 * BLOCK: DOM Bootstrap Helpers
 * VERSION: 1.0.0
 * PURPOSE:
 * Предоставляет минимально явный bootstrap helper
 * для получения корневого DOM-элемента приложения.
 * ============================================
 */
function getApplicationRootElement(): HTMLElement {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('Application root element "#root" was not found.');
  }

  return rootElement;
}

/**
 * ============================================
 * BLOCK: Application Mount
 * VERSION: 1.0.0
 * PURPOSE:
 * Выполняет создание React root и монтирование
 * корневого приложения.
 * ============================================
 */
const applicationRootElement = getApplicationRootElement();
const applicationRoot = createRoot(applicationRootElement);

applicationRoot.render(
  <StrictMode>
    <App />
  </StrictMode>,
);