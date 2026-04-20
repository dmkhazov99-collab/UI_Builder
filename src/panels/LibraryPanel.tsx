/**
 * ЛЕВАЯ ПАНЕЛЬ - Библиотека компонентов
 */

import {
  Layers,
  Square,
  Star,
  Search,
  Sparkles,
  LibraryBig,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProjectStore, cloneBlockForCanvas, createNewBlock } from '@/store/projectStore';

const categories = [
  { id: 'all', name: 'Все', icon: <LibraryBig className="w-4 h-4" /> },
  { id: 'base', name: 'Базовый', icon: <Square className="w-4 h-4" /> },
  { id: 'custom', name: 'Custom', icon: <Star className="w-4 h-4" /> },
] as const;

export function LibraryPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]['id']>('all');
  const libraryTabsHeight = 48;

  const { project, addBlock, selectedElement, removeCustomLibraryBlock } = useProjectStore();

  const page = project.pages[0];
  const customItems = project.componentLibrary.blocks;

  const items = useMemo(() => {
    const baseItem = {
      id: 'base-block-1x1',
      name: 'Базовый блок 1x1',
      description: 'Один универсальный блок. В свойствах можно превратить его в кнопку или сохранить в Custom.',
      preview: '1x1',
      category: 'base' as const,
      block: createNewBlock('block-info', 1, 1),
      isCustom: false,
    };

    const customMapped = customItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || 'Сохранённый пользовательский блок',
      preview: item.preview || `${item.block.span}x${item.block.rowSpan}`,
      category: 'custom' as const,
      block: item.block,
      isCustom: true,
    }));

    return [baseItem, ...customMapped];
  }, [customItems]);

  const filteredItems = items.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const resolveTargetSectionId = () => {
    if (!page) return null;
    if (selectedElement?.type === 'section') return selectedElement.id;
    if ((selectedElement?.type === 'block' || selectedElement?.type === 'content' || selectedElement?.type === 'header') && selectedElement.parentId) {
      return selectedElement.parentId;
    }
    return page.sections[0]?.id ?? null;
  };

  const handleAddBlock = (blockTemplate: ReturnType<typeof createNewBlock>) => {
    if (!page) return;
    const sectionId = resolveTargetSectionId();
    if (!sectionId) return;
    addBlock(page.id, sectionId, cloneBlockForCanvas(blockTemplate));
    toast.success('Блок добавлен на холст');
  };

  const libraryHeaderHeight = 48;

  return (
    <div className="w-64 bg-[#1A1A1C] border-r border-[#313133] flex flex-col min-h-0">
      <div
        className="shrink-0 flex items-center px-4 border-b border-[#313133]"
        style={{ height: `${libraryHeaderHeight}px` }}
      >
        <Layers className="w-4 h-4 text-[#2A80F4] mr-2" />
        <span className="font-medium text-white text-sm">Библиотека</span>
      </div>

      <div className="p-3 border-b border-[#313133] shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B0B0B0]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по библиотеке..."
            className="pl-8 h-9 bg-[#111111] border-[#313133] text-white text-sm placeholder:text-[#666]"
          />
        </div>
      </div>

      <div className="flex border-b border-[#313133] shrink-0">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{ height: `${libraryTabsHeight}px` }}
            className={`flex-1 flex items-center justify-center gap-1 text-xs transition-colors ${
              activeCategory === cat.id
                ? 'text-[#2A80F4] border-b-2 border-[#2A80F4]'
                : 'text-[#B0B0B0] hover:text-white'
            }`}
          >
            {cat.icon}
            <span className="hidden sm:inline">{cat.name}</span>
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group bg-[#111111] hover:bg-[#272728] border border-[#313133] hover:border-[#2A80F4] rounded-lg p-3 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#1A1A1C] rounded flex items-center justify-center text-xs text-[#B0B0B0] font-mono shrink-0">
                  {item.preview}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[#2A80F4]">{item.isCustom ? <Sparkles className="w-4 h-4" /> : <Square className="w-4 h-4" />}</span>
                    <span className="text-white text-sm font-medium truncate">{item.name}</span>
                  </div>
                  <p className="text-[#B0B0B0] text-xs mt-1 line-clamp-2">{item.description}</p>
                </div>
              </div>

              <div className="mt-2 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-7 text-xs text-[#B0B0B0] hover:text-white hover:bg-[#1A1A1C]"
                  onClick={() => handleAddBlock(item.block)}
                >
                  Добавить
                </Button>
                {item.isCustom && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-[#FF4053] hover:text-white hover:bg-[#2A0F14]"
                    onClick={() => {
                      if (window.confirm(`Удалить custom-блок «${item.name}»?`)) {
                        removeCustomLibraryBlock(item.id);
                        toast.success('Custom-блок удалён');
                      }
                    }}
                  >
                    Удалить
                  </Button>
                )}
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-[#B0B0B0] text-sm">
              {activeCategory === 'custom' ? 'В Custom пока ничего нет' : 'Ничего не найдено'}
            </div>
          )}
        </div>
      </ScrollArea>

    </div>
  );
}
