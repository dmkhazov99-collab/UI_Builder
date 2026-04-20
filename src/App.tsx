/**
 * ============================================
 * MODULE: App Root Shell
 * VERSION: 1.0.0
 * ROLE:
 * Корневой UI-shell приложения-конструктора.
 * Собирает верхний layout builder-интерфейса и
 * переключает view-слой в зависимости от текущего режима.
 *
 * RESPONSIBILITIES:
 * - Рендерить общий shell приложения
 * - Подключать toolbar, side panels и active workspace panel
 * - Разводить edit/code/preview режимы на уровне UI-композиции
 * - Подключать глобальный toaster
 *
 * DEPENDS ON:
 * - Toolbar
 * - LibraryPanel
 * - Canvas
 * - PreviewPanel
 * - CodePanel
 * - PropertiesPanel
 * - useProjectStore
 * - Toaster
 *
 * USED BY:
 * - main entrypoint приложения
 *
 * RULES:
 * - Не содержит runtime/export logic
 * - Не знает деталей HTML generation pipeline
 * - Только компоновка root-level UI
 *
 * SECURITY:
 * - Этот модуль не должен напрямую исполнять пользовательский HTML/CSS/JS
 * - Любые unsafe preview/runtime-механики должны оставаться в dedicated preview/runtime слоях
 * ============================================
 */

import { Toolbar } from '@/panels/Toolbar';
import { LibraryPanel } from '@/panels/LibraryPanel';
import { Canvas } from '@/panels/Canvas';
import { PreviewPanel } from '@/panels/PreviewPanel';
import { CodePanel } from '@/panels/CodePanel';
import { PropertiesPanel } from '@/panels/PropertiesPanel';
import { useProjectStore } from '@/store/projectStore';
import { Toaster } from '@/components/ui/sonner';

/**
 * ============================================
 * BLOCK: UI Constants
 * VERSION: 1.0.0
 * PURPOSE:
 * Общие UI-константы root shell уровня.
 * ============================================
 */
const APP_SHELL_CLASS_NAME =
  'h-screen flex flex-col bg-[#0c1016] text-white overflow-hidden ui-builder-shell';

const WORKSPACE_CLASS_NAME = 'flex-1 flex flex-col min-w-0';

const TOASTER_STYLE = {
  background: '#1A1A1C',
  border: '1px solid #313133',
  color: '#FFFFFF',
};

/**
 * ============================================
 * BLOCK: Internal View Composition
 * VERSION: 1.0.0
 * PURPOSE:
 * Изолирует выбор центральной рабочей панели
 * в зависимости от активного режима приложения.
 * ============================================
 */
function ActiveWorkspacePanel() {
  const { mode } = useProjectStore();

  if (mode === 'code') {
    return <CodePanel />;
  }

  if (mode === 'preview') {
    return <PreviewPanel />;
  }

  return <Canvas />;
}

/**
 * ============================================
 * BLOCK: Root Component
 * VERSION: 1.0.0
 * PURPOSE:
 * Собирает корневую композицию builder-интерфейса.
 * ============================================
 */
function App() {
  const { mode } = useProjectStore();

  return (
    <div className={APP_SHELL_CLASS_NAME}>
      <Toolbar />

      <div className="flex-1 flex overflow-hidden">
        {mode === 'edit' && <LibraryPanel />}

        <main className={WORKSPACE_CLASS_NAME}>
          <ActiveWorkspacePanel />
        </main>

        {mode === 'edit' && <PropertiesPanel />}
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: TOASTER_STYLE,
        }}
      />
    </div>
  );
}

export default App;