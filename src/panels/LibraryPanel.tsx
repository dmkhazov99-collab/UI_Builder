/**
 * ============================================
 * MODULE: Library Panel
 * VERSION: 1.3.0
 * ROLE:
 * Левая панель библиотеки builder-компонентов.
 *
 * RESPONSIBILITIES:
 * - показывать базовые и custom блоки
 * - фильтровать библиотеку по типу и поиску
 * - добавлять блок в активную или первую доступную секцию
 * - удалять custom шаблоны из пользовательской библиотеки
 *
 * DEPENDS ON:
 * - useProjectStore()
 * - createNewBlock()
 * - cloneBlockForCanvas()
 *
 * USED BY:
 * - App.tsx
 *
 * RULES:
 * - панель не рендерит builder content
 * - панель только создаёт/добавляет шаблоны
 * - если активная секция не определена, используется первая доступная
 *
 * SECURITY:
 * - пользовательский HTML здесь не исполняется
 * - custom library хранит только builder templates
 * ============================================
 */

import { useMemo, useState } from 'react';
import { Blocks, Plus, Search, Square, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cloneBlockForCanvas, createNewBlock, useProjectStore } from '@/store/projectStore';
import type { SelectedElement } from '@/types/project';

/**
 * ============================================
 * BLOCK: Shared Types
 * VERSION: 1.0.0
 * PURPOSE:
 * Локальные типы панели библиотеки.
 * ============================================
 */
type LibraryFilter = 'all' | 'base' | 'custom';

type BaseLibraryItem = {
  id: string;
  category: 'base';
  name: string;
  description: string;
  preview: string;
  create: () => ReturnType<typeof createNewBlock>;
};

type CustomLibraryItem = {
  id: string;
  category: 'custom';
  name: string;
  description: string;
  preview: string;
  blockId: string;
};

type LibraryItem = BaseLibraryItem | CustomLibraryItem;

/**
 * ============================================
 * BLOCK: UI Constants
 * VERSION: 1.0.0
 * PURPOSE:
 * Централизация повторяющихся классов панели.
 * ============================================
 */
const PANEL_CLASS =
  'panel-surface w-80 min-h-0 overflow-hidden border-r border-[#313133] bg-[#1A1A1C] flex flex-col';

const SEARCH_INPUT_CLASS =
  'h-9 bg-[#111111] border-[#313133] text-white placeholder:text-[#6F6F73]';

const FILTER_BUTTON_BASE_CLASS =
  'h-8 px-3 text-xs border-[#313133] bg-[#111111] text-[#B0B0B0] hover:text-white hover:bg-[#181818]';

const FILTER_BUTTON_ACTIVE_CLASS =
  'bg-[#2A80F4]/15 text-white border-[#2A80F4]/40 hover:bg-[#2A80F4]/20';

const CARD_CLASS = 'rounded-xl border border-[#313133] bg-[#111111] p-3';

/**
 * ============================================
 * BLOCK: Base Inventory
 * VERSION: 1.1.0
 * PURPOSE:
 * Стандартные builder-блоки, доступные всегда.
 * ============================================
 */
const BASE_LIBRARY_ITEMS: BaseLibraryItem[] = [
  {
    id: 'base-info',
    category: 'base',
    name: 'Информационный блок',
    description: 'Обычный контентный блок для текста и HTML-содержимого.',
    preview: '1×1 • info',
    create: () => createNewBlock('block-info', 1, 1),
  },
  {
    id: 'base-button',
    category: 'base',
    name: 'Кнопка',
    description: 'Интерактивный button-style блок с центровкой содержимого.',
    preview: '1×1 • button',
    create: () => createNewBlock('block-button', 1, 1),
  },
];

/**
 * ============================================
 * BLOCK: Helper Utilities
 * VERSION: 1.1.0
 * PURPOSE:
 * Локальные pure helper-функции панели библиотеки.
 * ============================================
 */
function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

function resolveTargetSectionId(
  selectedElement: SelectedElement | null,
  currentPage: ReturnType<typeof useProjectStore.getState>['project']['pages'][number] | undefined
): string | null {
  if (!currentPage) return null;

  if (!selectedElement) {
    return currentPage.sections[0]?.id ?? null;
  }

  if (selectedElement.type === 'section') {
    return selectedElement.id;
  }

  if (
    selectedElement.type === 'header' ||
    selectedElement.type === 'content' ||
    selectedElement.type === 'block'
  ) {
    return selectedElement.parentId ?? currentPage.sections[0]?.id ?? null;
  }

  return currentPage.sections[0]?.id ?? null;
}

/**
 * ============================================
 * BLOCK: Filter Segment Button
 * VERSION: 1.0.0
 * PURPOSE:
 * Переключение фильтров all/base/custom.
 * ============================================
 */
function FilterSegmentButton({
  label,
  value,
  currentValue,
  onClick,
}: {
  label: string;
  value: LibraryFilter;
  currentValue: LibraryFilter;
  onClick: (value: LibraryFilter) => void;
}) {
  const isActive = currentValue === value;

  return (
    <Button
      variant="outline"
      size="sm"
      className={`${FILTER_BUTTON_BASE_CLASS} ${isActive ? FILTER_BUTTON_ACTIVE_CLASS : ''}`}
      onClick={() => onClick(value)}
    >
      {label}
    </Button>
  );
}

/**
 * ============================================
 * BLOCK: Library Card
 * VERSION: 1.0.0
 * PURPOSE:
 * Карточка одного элемента библиотеки.
 * ============================================
 */
function LibraryCard({
  item,
  onAdd,
  onDeleteCustom,
}: {
  item: LibraryItem;
  onAdd: (item: LibraryItem) => void;
  onDeleteCustom: (blockId: string) => void;
}) {
  const isCustom = item.category === 'custom';

  return (
    <div className={CARD_CLASS}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isCustom ? (
              <Star className="h-4 w-4 shrink-0 text-[#f5c96a]" />
            ) : (
              <Square className="h-4 w-4 shrink-0 text-[#7fb1ff]" />
            )}

            <div className="truncate text-sm font-medium text-white">{item.name}</div>
          </div>

          <div className="mt-1 text-[11px] text-[#7F8792]">{item.preview}</div>
        </div>

        {isCustom ? (
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-[#5c2d35] bg-[#171717] text-[#ff8d9d] hover:bg-[#2a171b]"
            onClick={() => onDeleteCustom(item.blockId)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <p className="mb-3 text-xs leading-5 text-[#B0B0B0]">{item.description}</p>

      <Button
        variant="outline"
        size="sm"
        className="w-full border-[#313133] bg-[#171717] text-white hover:bg-[#1e1e1f]"
        onClick={() => onAdd(item)}
      >
        <Plus className="mr-2 h-4 w-4" />
        Добавить
      </Button>
    </div>
  );
}

/**
 * ============================================
 * MODULE: Library Panel Root
 * VERSION: 1.3.0
 * ROLE:
 * Корневой координатор builder library panel.
 * ============================================
 */
export function LibraryPanel() {
  const { project, selectedElement, addBlock, removeCustomLibraryBlock } = useProjectStore();

  const [searchValue, setSearchValue] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('all');

  /**
   * ============================================
   * BLOCK: Current Page Resolution
   * VERSION: 1.0.0
   * PURPOSE:
   * Пока builder работает с первой страницей проекта.
   * ============================================
   */
  const currentPage = project.pages[0];

  /**
   * ============================================
   * BLOCK: Custom Inventory Mapping
   * VERSION: 1.0.0
   * PURPOSE:
   * Преобразование project.componentLibrary в UI-элементы панели.
   * ============================================
   */
  const customItems: CustomLibraryItem[] = useMemo(() => {
    return project.componentLibrary.blocks.map((item) => ({
      id: item.id,
      category: 'custom',
      name: item.name,
      description: item.description || 'Пользовательский сохранённый блок',
      preview: item.preview || `${item.block.span}×${item.block.rowSpan}`,
      blockId: item.id,
    }));
  }, [project.componentLibrary.blocks]);

  /**
   * ============================================
   * BLOCK: Filtered Items
   * VERSION: 1.1.0
   * PURPOSE:
   * Объединение base/custom inventory и фильтрация по поиску.
   * ============================================
   */
  const items = useMemo<LibraryItem[]>(() => {
    const source =
      filter === 'base'
        ? BASE_LIBRARY_ITEMS
        : filter === 'custom'
          ? customItems
          : [...BASE_LIBRARY_ITEMS, ...customItems];

    const query = normalizeSearchValue(searchValue);

    if (!query) return source;

    return source.filter((item) =>
      [item.name, item.description, item.preview].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [customItems, filter, searchValue]);

  /**
   * ============================================
   * BLOCK: Add Action
   * VERSION: 1.1.0
   * PURPOSE:
   * Добавление library item в выбранную или первую доступную секцию.
   * ============================================
   */
  const handleAddItem = (item: LibraryItem) => {
    if (!currentPage) {
      toast.error('Нет активной страницы для добавления блока');
      return;
    }

    const targetSectionId = resolveTargetSectionId(selectedElement, currentPage);

    if (!targetSectionId) {
      toast.error('Нет доступной секции для добавления блока');
      return;
    }

    let nextBlock;

    if (item.category === 'base') {
      nextBlock = item.create();
    } else {
      const source = project.componentLibrary.blocks.find(
        (libraryBlock) => libraryBlock.id === item.blockId
      );

      if (!source) {
        toast.error('Custom блок не найден');
        return;
      }

      nextBlock = cloneBlockForCanvas(source.block);
    }

    addBlock(currentPage.id, targetSectionId, nextBlock);
    toast.success(`Блок «${item.name}» добавлен`);
  };

  /**
   * ============================================
   * BLOCK: Delete Custom Action
   * VERSION: 1.0.0
   * PURPOSE:
   * Удаление custom шаблона из пользовательской библиотеки.
   * ============================================
   */
  const handleDeleteCustom = (blockId: string) => {
    removeCustomLibraryBlock(blockId);
    toast.success('Custom блок удалён');
  };

  return (
    <div className={PANEL_CLASS}>
      <div className="h-12 shrink-0 flex items-center px-4 border-b border-[#313133]">
        <Blocks className="w-4 h-4 text-[#2A80F4] mr-2" />
        <span className="font-medium text-white text-sm">Библиотека</span>
      </div>

      <div className="shrink-0 border-b border-[#313133] p-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F6F73]" />
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Поиск блоков"
            className={`${SEARCH_INPUT_CLASS} pl-9`}
          />
        </div>

        <div className="flex items-center gap-2">
          <FilterSegmentButton
            label="Все"
            value="all"
            currentValue={filter}
            onClick={setFilter}
          />
          <FilterSegmentButton
            label="Базовые"
            value="base"
            currentValue={filter}
            onClick={setFilter}
          />
          <FilterSegmentButton
            label="Custom"
            value="custom"
            currentValue={filter}
            onClick={setFilter}
          />
        </div>
      </div>

      <ScrollArea className="scroll-theme flex-1 min-h-0">
        <div className="p-4 space-y-3">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#313133] bg-[#111111] px-4 py-8 text-center">
              <div className="mb-2 text-sm text-white">Ничего не найдено</div>
              <div className="text-xs text-[#8A8A8A]">
                Попробуй изменить фильтр или поисковый запрос.
              </div>
            </div>
          ) : (
            items.map((item) => (
              <LibraryCard
                key={item.id}
                item={item}
                onAdd={handleAddItem}
                onDeleteCustom={handleDeleteCustom}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}