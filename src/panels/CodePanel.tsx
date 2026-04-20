import { useMemo } from 'react';
import { resolveProjectHtml } from '@/core/htmlExporter';
import { useProjectStore } from '@/store/projectStore';

export function CodePanel() {
  const project = useProjectStore((state) => state.project);

  const generatedHtml = useMemo(() => {
    try {
      return resolveProjectHtml(project);
    } catch (error) {
      return `<!-- Failed to generate HTML:\n${error instanceof Error ? error.message : String(error)}\n-->`;
    }
  }, [project]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Generated index.html</h2>
        <p className="text-xs text-muted-foreground">
          Код обновляется автоматически при изменениях в билдере.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <pre className="min-h-full whitespace-pre-wrap break-words p-4 text-xs leading-5">
          <code>{generatedHtml}</code>
        </pre>
      </div>
    </div>
  );
}
