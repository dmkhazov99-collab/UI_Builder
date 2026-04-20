/**
 * UI BUILDER - Standard Interface Constructor
 * 
 * Локальное приложение-конструктор интерфейсов
 * Система стандартизированной генерации HTML
 */

import { Toolbar } from '@/panels/Toolbar';
import { LibraryPanel } from '@/panels/LibraryPanel';
import { Canvas } from '@/panels/Canvas';
import { PreviewPanel } from '@/panels/PreviewPanel';
import { PropertiesPanel } from '@/panels/PropertiesPanel';
import { CodePanel } from '@/panels/CodePanel';
import { useProjectStore } from '@/store/projectStore';
import { Toaster } from '@/components/ui/sonner';

function App() {
  const { mode } = useProjectStore();

  return (
    <div className="h-screen flex flex-col bg-[#0c1016] text-white overflow-hidden ui-builder-shell">
      {/* Верхняя панель */}
      <Toolbar />

      {/* Основная область */}
      <div className="flex-1 flex overflow-hidden">
        {/* Левая панель - библиотека (только в режиме редактирования) */}
        {mode === 'edit' && <LibraryPanel />}

        {/* Центральная область */}
        <div className="flex-1 flex flex-col min-w-0">
          {mode === 'code' ? (
            <CodePanel />
          ) : mode === 'preview' ? (
            <PreviewPanel />
          ) : (
            <Canvas />
          )}
        </div>

        {/* Правая панель - свойства (только в режиме редактирования) */}
        {mode === 'edit' && <PropertiesPanel />}
      </div>

      {/* Уведомления */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1A1A1C',
            border: '1px solid #313133',
            color: '#FFFFFF',
          },
        }}
      />
    </div>
  );
}

export default App;
