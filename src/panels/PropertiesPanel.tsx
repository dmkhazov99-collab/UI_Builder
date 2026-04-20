/**
 * ПРАВАЯ ПАНЕЛЬ - Свойства выбранного элемента
 */

import type { ReactNode } from 'react';
import {
  Settings,
  Type,
  Layout,
  MousePointer,
  Code,
  Trash2,
  Copy,
  FileText,
  AlignVerticalJustifyStart,
  Star,
  PanelsTopLeft,
  Rows3,
  Box,
} from 'lucide-react';
import { toast } from 'sonner';

import { useProjectStore } from '@/store/projectStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MAX_BLOCK_ROW_SPAN,
  MAX_BLOCK_SPAN,
  createDefaultHeaderEndpoint,
  createDefaultContentEndpoint,
  type BlockType,
  type BlockMode,
} from '@/types/project';

type Direction = 'up' | 'down' | 'left' | 'right';

type PanelShellProps = {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  headerHeight?: number;
};

const PANEL_CLASS =
  'panel-surface w-80 bg-[#1A1A1C] border-l border-[#313133] flex flex-col min-h-0 overflow-hidden';

const FOCUS_SELECTION_CLASS =
  'outline-none focus-visible:ring-1 focus-visible:ring-[#2A80F4] focus-visible:border-[#2A80F4] selection:bg-[#2A80F4]/35 selection:text-white';

const INPUT_CLASS =
  `bg-[#111111] border-[#313133] text-white ${FOCUS_SELECTION_CLASS}`;

const READONLY_INPUT_CLASS =
  'h-8 bg-[#111111] border-[#313133] text-[#666] text-xs';

const TEXTAREA_SCROLL_CLASS = 'scroll-theme overflow-y-auto';

const TEXTAREA_CLASS =
  `bg-[#111111] border-[#313133] text-white resize-none ${FOCUS_SELECTION_CLASS} ${TEXTAREA_SCROLL_CLASS}`;

const MONO_TEXTAREA_CLASS =
  `bg-[#111111] border-[#313133] text-white font-mono text-xs resize-none ${FOCUS_SELECTION_CLASS} ${TEXTAREA_SCROLL_CLASS}`;

const BUTTON_CLASS =
  'bg-[#111111] border-[#313133] text-[#B0B0B0] hover:text-white';

function SectionDivider() {
  return <div className="-mx-4 h-px bg-[#313133]" />;
}

function PanelShell({
  title,
  children,
  footer,
  headerHeight = 48,
}: PanelShellProps) {
  return (
    <div className={PANEL_CLASS}>
      <div
        className="shrink-0 flex items-center px-4 border-b border-[#313133]"
        style={{ height: `${headerHeight}px` }}
      >
        <Settings className="w-4 h-4 text-[#2A80F4] mr-2" />
        <span className="font-medium text-white text-sm">{title}</span>
      </div>

      <ScrollArea className="scroll-theme flex-1 min-h-0">
        <div className="p-4 space-y-6">
          {children}
        </div>
      </ScrollArea>

      {footer ? (
        <div className="shrink-0 border-t border-[#313133] bg-[#1A1A1C] p-4">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function EmptyStatePanel() {
  return (
    <div className={PANEL_CLASS}>
      <div className="h-12 shrink-0 flex items-center px-4 border-b border-[#313133]">
        <Settings className="w-4 h-4 text-[#2A80F4] mr-2" />
        <span className="font-medium text-white text-sm">Свойства</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <MousePointer className="w-12 h-12 text-[#313133] mx-auto mb-4" />
          <p className="text-[#B0B0B0] text-sm">
            Выберите элемент на холсте для редактирования свойств
          </p>
        </div>
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const {
    project,
    selectedElement,
    updateBlock,
    updateHeader,
    updateSection,
    updateContent,
    removeBlock,
    removeSection,
    duplicateSection,
    moveBlock,
    saveBlockToCustomLibrary,
    duplicateBlock,
  } = useProjectStore();

  const currentPage = project.pages[0];

  const selectedBlock = (() => {
    if (!selectedElement || selectedElement.type !== 'block' || !currentPage) {
      return null;
    }

    for (const section of currentPage.sections) {
      const block = section.content.blocks.find((b) => b.id === selectedElement.id);

      if (block) {
        return {
          block,
          sectionId: section.id,
          pageId: currentPage.id,
        };
      }
    }

    return null;
  })();

  const selectedSection = (() => {
    if (!selectedElement || !currentPage) return null;

    const section = currentPage.sections.find(
      (s) =>
        s.id === selectedElement.id ||
        s.header.id === selectedElement.id ||
        s.content.id === selectedElement.id
    );

    if (!section) return null;

    return {
      section,
      pageId: currentPage.id,
    };
  })();

  const selectedType = selectedElement?.type;

  const handleUpdateBlock = (updates: Parameters<typeof updateBlock>[3]) => {
    if (!selectedBlock) return;

    updateBlock(
      selectedBlock.pageId,
      selectedBlock.sectionId,
      selectedBlock.block.id,
      updates
    );
  };

  const handleUpdateSection = (updates: Parameters<typeof updateSection>[2]) => {
    if (!selectedSection) return;

    updateSection(selectedSection.pageId, selectedSection.section.id, updates);
  };

  const handleUpdateHeader = (updates: Parameters<typeof updateHeader>[2]) => {
    if (!selectedSection) return;

    updateHeader(selectedSection.pageId, selectedSection.section.id, updates);
  };

  const handleUpdateContent = (updates: Parameters<typeof updateContent>[2]) => {
    if (!selectedSection) return;

    updateContent(selectedSection.pageId, selectedSection.section.id, updates);
  };

  const handleRemoveBlock = () => {
    if (!selectedBlock) return;

    removeBlock(
      selectedBlock.pageId,
      selectedBlock.sectionId,
      selectedBlock.block.id
    );
  };

  const handleRemoveSection = () => {
    if (!selectedSection) return;

    removeSection(
      selectedSection.pageId,
      selectedSection.section.id
    );

    toast.success('Секция удалена');
  };

  const handleDuplicateSection = () => {
    if (!selectedSection) return;

    duplicateSection(
      selectedSection.pageId,
      selectedSection.section.id
    );

    toast.success('Секция продублирована');
  };

  const handleMoveBlock = (direction: Direction) => {
    if (!selectedBlock) return;

    moveBlock(
      selectedBlock.pageId,
      selectedBlock.sectionId,
      selectedBlock.block.id,
      direction
    );
  };

  const handleSaveToCustom = () => {
    if (!selectedBlock) return;

    saveBlockToCustomLibrary(
      selectedBlock.pageId,
      selectedBlock.sectionId,
      selectedBlock.block.id
    );

    toast.success('Блок сохранён в Custom');
  };

  const handleDuplicateBlock = () => {
    if (!selectedBlock) return;

    duplicateBlock(
      selectedBlock.pageId,
      selectedBlock.sectionId,
      selectedBlock.block.id
    );

    toast.success('Блок продублирован');
  };

  const renderBlockFooter = () => (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        className={`w-full ${BUTTON_CLASS}`}
        onClick={handleSaveToCustom}
      >
        <Star className="w-3 h-3 mr-1" />
        Сохранить в избранное
      </Button>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className={`flex-1 ${BUTTON_CLASS}`}
          onClick={handleDuplicateBlock}
        >
          <Copy className="w-3 h-3 mr-1" />
          Дублировать
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="bg-[#111111] border-[#FF4053]/30 text-[#FF4053] hover:bg-[#FF4053]/10"
          onClick={handleRemoveBlock}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );

  const renderSectionFooter = () => (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        className={`flex-1 ${BUTTON_CLASS}`}
        onClick={handleDuplicateSection}
      >
        <Copy className="w-3 h-3 mr-1" />
        Дублировать секцию
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="bg-[#111111] border-[#FF4053]/30 text-[#FF4053] hover:bg-[#FF4053]/10"
        onClick={handleRemoveSection}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );

  const renderBlockPanel = () => {
    if (!selectedBlock) return null;

    const block = selectedBlock.block;

    const handleContentHtmlChange = (value: string) => {
      handleUpdateBlock({
        content: {
          ...block.content,
          html: value,
        },
      });
    };

    return (
      <PanelShell
        title="Свойства блока"
        footer={renderBlockFooter()}
      >
        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs">ID блока</Label>
          <Input
            value={block.id}
            readOnly
            className={READONLY_INPUT_CLASS}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs flex items-center gap-2">
            <FileText className="w-3 h-3" />
            Название блока
          </Label>
          <Input
            value={block.name}
            onChange={(e) => handleUpdateBlock({ name: e.target.value })}
            className={`h-9 ${INPUT_CLASS}`}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs">Описание</Label>
          <Textarea
            value={block.description}
            onChange={(e) => handleUpdateBlock({ description: e.target.value })}
            className={`min-h-20 ${TEXTAREA_CLASS}`}
          />
        </div>

        <SectionDivider />

        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs flex items-center gap-2">
            <Type className="w-3 h-3" />
            Тип блока
          </Label>

          <Select
            value={block.type}
            onValueChange={(value) =>
              handleUpdateBlock({ type: value as BlockType })
            }
          >
            <SelectTrigger className={`h-9 ${INPUT_CLASS}`}>
              <SelectValue />
            </SelectTrigger>

            <SelectContent className="bg-[#1A1A1C] border-[#313133]">
              <SelectItem value="block-info" className="text-white">
                Обычный блок
              </SelectItem>
              <SelectItem value="block-button" className="text-white">
                Кнопка
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs flex items-center gap-2">
            <AlignVerticalJustifyStart className="w-3 h-3" />
            Поведение контента
          </Label>

          <Select
            value={block.mode}
            onValueChange={(value) =>
              handleUpdateBlock({ mode: value as BlockMode })
            }
          >
            <SelectTrigger className={`h-9 ${INPUT_CLASS}`}>
              <SelectValue />
            </SelectTrigger>

            <SelectContent className="bg-[#1A1A1C] border-[#313133]">
              <SelectItem value="clip" className="text-white">
                Обрезать
              </SelectItem>
              {block.type !== 'block-button' && (
                <SelectItem value="scroll" className="text-white">
                  Внутренний скролл
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs flex items-center gap-2">
            <Layout className="w-3 h-3" />
            Размер блока
          </Label>

          <div className="grid grid-cols-4 gap-1">
            <Button
              variant="outline"
              size="sm"
              className={`h-8 ${BUTTON_CLASS}`}
              onClick={() => handleMoveBlock('left')}
              disabled={block.span <= 1}
            >
              ←
            </Button>

            <Button
              variant="outline"
              size="sm"
              className={`h-8 ${BUTTON_CLASS}`}
              onClick={() => handleMoveBlock('right')}
              disabled={block.span >= MAX_BLOCK_SPAN}
            >
              →
            </Button>

            <Button
              variant="outline"
              size="sm"
              className={`h-8 ${BUTTON_CLASS}`}
              onClick={() => handleMoveBlock('up')}
              disabled={block.rowSpan <= 1}
            >
              ↑
            </Button>

            <Button
              variant="outline"
              size="sm"
              className={`h-8 ${BUTTON_CLASS}`}
              onClick={() => handleMoveBlock('down')}
              disabled={block.rowSpan >= MAX_BLOCK_ROW_SPAN}
            >
              ↓
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs flex items-center gap-2">
            <Code className="w-3 h-3" />
            HTML содержимое
          </Label>

          <Textarea
            value={block.content.html}
            onChange={(e) => handleContentHtmlChange(e.target.value)}
            className={`min-h-32 ${MONO_TEXTAREA_CLASS}`}
          />
        </div>
      </PanelShell>
    );
  };

  const renderSectionPanel = () => {
    if (!selectedSection) return null;

    const section = selectedSection.section;

    return (
      <PanelShell
        title="Свойства секции"
        headerHeight={48}
        footer={renderSectionFooter()}
      >
        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs">ID секции</Label>
          <Input
            value={section.id}
            readOnly
            className={READONLY_INPUT_CLASS}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs flex items-center gap-2">
            <PanelsTopLeft className="w-3 h-3" />
            Название секции
          </Label>
          <Input
            value={section.name}
            onChange={(e) => handleUpdateSection({ name: e.target.value })}
            className={`h-9 ${INPUT_CLASS}`}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs">Описание секции</Label>
          <Textarea
            value={section.description}
            onChange={(e) => handleUpdateSection({ description: e.target.value })}
            className={`min-h-24 ${TEXTAREA_CLASS}`}
          />
        </div>

        <SectionDivider />

        <div className="space-y-2 text-xs text-[#B0B0B0]">
          <div className="flex justify-between">
            <span>Header title</span>
            <span className="text-white">{section.header.title || '—'}</span>
          </div>

          <div className="flex justify-between">
            <span>Блоков внутри</span>
            <span className="text-white">{section.content.blocks.length}</span>
          </div>

          <div className="flex justify-between">
            <span>Порядок</span>
            <span className="text-white">{section.order + 1}</span>
          </div>
        </div>
      </PanelShell>
    );
  };

  const renderHeaderPanel = () => {
    if (!selectedSection) return null;

    const section = selectedSection.section;
    const endpoint =
      section.header.endpoint || createDefaultHeaderEndpoint(section.header.title);

    const handleHeaderTitleChange = (value: string) => {
      handleUpdateHeader({
        title: value,
        endpoint: {
          ...endpoint,
          html: endpoint.html?.trim()
            ? endpoint.html
            : `<div class="h1">${value}</div>`,
        },
      });
    };

    return (
      <PanelShell title="Свойства header">
        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs">ID header</Label>
          <Input
            value={section.header.id}
            readOnly
            className={READONLY_INPUT_CLASS}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs flex items-center gap-2">
            <Box className="w-3 h-3" />
            Название
          </Label>
          <Input
            value={section.header.name}
            onChange={(e) => handleUpdateHeader({ name: e.target.value })}
            className={`h-9 ${INPUT_CLASS}`}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs">Описание</Label>
          <Textarea
            value={section.header.description}
            onChange={(e) => handleUpdateHeader({ description: e.target.value })}
            className={`min-h-20 ${TEXTAREA_CLASS}`}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs">Заголовок</Label>
          <Input
            value={section.header.title}
            onChange={(e) => handleHeaderTitleChange(e.target.value)}
            className={`h-9 ${INPUT_CLASS}`}
          />
        </div>

        <SectionDivider />

        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs">HTML header</Label>
          <Textarea
            value={endpoint.html || ''}
            onChange={(e) =>
              handleUpdateHeader({
                endpoint: { ...endpoint, html: e.target.value },
              })
            }
            className={`min-h-32 ${MONO_TEXTAREA_CLASS}`}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs">CSS header</Label>
          <Textarea
            value={endpoint.css || ''}
            onChange={(e) =>
              handleUpdateHeader({
                endpoint: { ...endpoint, css: e.target.value },
              })
            }
            className={`min-h-24 ${MONO_TEXTAREA_CLASS}`}
          />
        </div>
      </PanelShell>
    );
  };

  const renderContentPanel = () => {
    if (!selectedSection) return null;

    const section = selectedSection.section;
    const endpoint = section.content.endpoint || createDefaultContentEndpoint();

    return (
      <PanelShell title="Свойства content">
        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs">ID content</Label>
          <Input
            value={section.content.id}
            readOnly
            className={READONLY_INPUT_CLASS}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs flex items-center gap-2">
            <Rows3 className="w-3 h-3" />
            Название
          </Label>
          <Input
            value={section.content.name}
            onChange={(e) => handleUpdateContent({ name: e.target.value })}
            className={`h-9 ${INPUT_CLASS}`}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs">Описание</Label>
          <Textarea
            value={section.content.description}
            onChange={(e) => handleUpdateContent({ description: e.target.value })}
            className={`min-h-20 ${TEXTAREA_CLASS}`}
          />
        </div>

        <div className="space-y-2 text-xs text-[#B0B0B0]">
          <div className="flex justify-between">
            <span>Блоков внутри</span>
            <span className="text-white">{section.content.blocks.length}</span>
          </div>
        </div>

        <SectionDivider />

        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs">HTML content</Label>
          <Textarea
            value={endpoint.html || ''}
            onChange={(e) =>
              handleUpdateContent({
                endpoint: { ...endpoint, html: e.target.value },
              })
            }
            className={`min-h-32 ${MONO_TEXTAREA_CLASS}`}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[#B0B0B0] text-xs">CSS content</Label>
          <Textarea
            value={endpoint.css || ''}
            onChange={(e) =>
              handleUpdateContent({
                endpoint: { ...endpoint, css: e.target.value },
              })
            }
            className={`min-h-24 ${MONO_TEXTAREA_CLASS}`}
          />
        </div>
      </PanelShell>
    );
  };

  const renderFallbackPanel = () => (
    <PanelShell title="Свойства">
      <p className="text-[#B0B0B0] text-sm">
        Элемент выбран, но для него пока нет отдельной панели.
      </p>
    </PanelShell>
  );

  if (!selectedElement) {
    return <EmptyStatePanel />;
  }

  if (selectedBlock) {
    return renderBlockPanel();
  }

  if (!selectedSection) {
    return null;
  }

  switch (selectedType) {
    case 'section':
      return renderSectionPanel();
    case 'header':
      return renderHeaderPanel();
    case 'content':
      return renderContentPanel();
    default:
      return renderFallbackPanel();
  }
}