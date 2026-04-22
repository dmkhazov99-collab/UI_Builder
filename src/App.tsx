/**
 * ============================================
 * MODULE: App Root Shell
 * VERSION: 2.0.0
 * ROLE:
 * Корневой UI-shell приложения-конструктора.
 * Собирает верхний layout builder-интерфейса и
 * переключает view-слой в зависимости от текущего режима.
 *
 * RESPONSIBILITIES:
 * - рендерить общий shell приложения
 * - подключать toolbar, side panels и active workspace panel
 * - разводить edit/code/preview режимы на уровне UI-композиции
 * - подключать глобальный toaster
 * - сохранять единый shell для builder/edit/code/preview режимов
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
 * - не содержит runtime/export logic
 * - не знает деталей HTML generation pipeline
 * - только компоновка root-level UI
 * - project properties отображаются внутри PropertiesPanel
 *   при отсутствии selected element
 *
 * SECURITY:
 * - этот модуль не должен напрямую исполнять пользовательский HTML/CSS/JS
 * - любые unsafe preview/runtime-механики должны оставаться
 *   в dedicated preview/runtime слоях
 * ============================================
 */

import { Toaster } from '@/components/ui/sonner';
import { Canvas } from '@/panels/Canvas';
import { CodePanel } from '@/panels/CodePanel';
import { LibraryPanel } from '@/panels/LibraryPanel';
import { PreviewPanel } from '@/panels/PreviewPanel';
import { PropertiesPanel } from '@/panels/PropertiesPanel';
import { Toolbar } from '@/panels/Toolbar';
import { useProjectStore } from '@/store/projectStore';

/**
 * ============================================
 * BLOCK: UI Constants
 * VERSION: 2.0.0
 * PURPOSE:
 * Общие UI-константы root shell уровня.
 * ============================================
 */
const APP_SHELL_CLASS_NAME =
  'ui-builder-shell h-screen flex flex-col overflow-hidden bg-[var(--surface-canvas)] text-[var(--text-primary)]';

const WORKSPACE_CLASS_NAME =
  'flex-1 flex flex-col min-w-0';

const TOASTER_STYLE = {
  background: '#1A1A1C',
  border: '1px solid #2C2C2C',
  color: 'var(--text-primary)',
  backdropFilter: 'blur(10px)',
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
 * BLOCK: Shell Layout
 * VERSION: 2.0.0
 * PURPOSE:
 * Компоновка root shell с учётом текущего режима.
 * ============================================
 */
function App() {
  const { mode } = useProjectStore();

  return (
    <div className={APP_SHELL_CLASS_NAME}>
      <Toolbar />

      <div className="flex flex-1 overflow-hidden">
        {mode === 'edit' ? <LibraryPanel /> : null}

        <main
          className={`${WORKSPACE_CLASS_NAME} ${mode === 'code' ? 'bg-[#1A1A1C]' : 'bg-[var(--surface-canvas)]'}`}
        >
          <ActiveWorkspacePanel />
        </main>

        {mode === 'edit' ? <PropertiesPanel /> : null}
      </div>

      <Toaster
        position="bottom-center"
        toastOptions={{
          style: TOASTER_STYLE,
        }}
      />
    </div>
  );
}

export default App;