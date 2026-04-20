import { useMemo } from 'react';
import { Monitor, Tablet, Smartphone, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/store/projectStore';
import { resolveProjectHtml } from '@/core/htmlExporter';

const frameWidths = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
} as const;

const frameLabels = {
  desktop: 'Desktop preview',
  tablet: 'Tablet preview',
  mobile: 'Mobile preview',
} as const;

function injectPreviewRuntime(html: string): string {
  const previewRuntime = `
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
          console.info('[UI Builder Preview] google.script.run mock call:', String(prop), Array.from(arguments));
          return target;
        };
      }
    });
  }
})();
</script>`;

  if (html.includes('</head>')) {
    return html.replace('</head>', `${previewRuntime}\n</head>`);
  }
  return `${previewRuntime}\n${html}`;
}

export function PreviewPanel() {
  const { project, viewMode } = useProjectStore();

  const srcDoc = useMemo(() => injectPreviewRuntime(resolveProjectHtml(project)), [project]);
  const previewKey = useMemo(() => `${viewMode}-${srcDoc.length}-${project.meta.updatedAt}`, [viewMode, srcDoc, project.meta.updatedAt]);
  const frameWidth = frameWidths[viewMode];

  return (
    <div className="flex-1 min-h-0 bg-[#0F1012] overflow-auto">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#111827]/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-white">Preview</div>
            <div className="text-xs text-white/60">
              Режим runtime: без выделения блоков, без drag-and-drop, только поведение готового интерфейса.
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            {viewMode === 'desktop' && <Monitor className="h-4 w-4" />}
            {viewMode === 'tablet' && <Tablet className="h-4 w-4" />}
            {viewMode === 'mobile' && <Smartphone className="h-4 w-4" />}
            <span>{frameLabels[viewMode]}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-2 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => window.dispatchEvent(new Event('resize'))}
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
          <div className="rounded-2xl border border-white/10 bg-white shadow-2xl overflow-hidden">
            <iframe
              key={previewKey}
              title="UI Builder Preview"
              srcDoc={srcDoc}
              sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
              className="block w-full bg-white"
              style={{ minHeight: 'calc(100vh - 220px)', border: 0 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
