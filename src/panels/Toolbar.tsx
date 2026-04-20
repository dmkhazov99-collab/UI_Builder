/**
 * ============================================
 * MODULE: Toolbar
 * VERSION: 1.4.0
 * ROLE:
 * Верхняя управляющая панель builder workflow.
 *
 * RESPONSIBILITIES:
 * - new / open / save / rename / duplicate / delete project
 * - export html / zip
 * - undo / redo
 * - viewport switching
 * - mode switching (edit / preview / code)
 * - unsaved changes flow
 *
 * DEPENDS ON:
 * - useProjectStore()
 * - projectPersistence
 * - htmlExporter
 *
 * USED BY:
 * - App.tsx
 *
 * RULES:
 * - toolbar управляет workflow, но не рендерит builder content
 * - unsaved changes flow должен оставаться централизованным
 * - открытие и создание новых проектов должны идти через guards
 *
 * SECURITY:
 * - используется только локальный persistence/browser workflow
 * - destructive actions подтверждаются явно
 * ============================================
 */

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Code,
  Copy,
  Download,
  Eye,
  FolderOpen,
  Grid3X3,
  Monitor,
  Pencil,
  Plus,
  Redo,
  Save,
  Search,
  Settings,
  Smartphone,
  Tablet,
  Trash2,
  Undo,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadHTML, downloadProjectBundle } from '@/core/htmlExporter';
import {
  deleteStoredProject,
  listStoredProjects,
  renameStoredProject,
  saveStoredProject,
  type StoredProjectRecord,
} from '@/core/projectPersistence';
import {
  captureProjectSnapshot,
  createNewProject,
  useProjectStore,
} from '@/store/projectStore';

/**
 * ============================================
 * BLOCK: Shared Types
 * VERSION: 1.0.0
 * PURPOSE:
 * Локальные типы toolbar workflow.
 * ============================================
 */
interface PendingAction {
  type: 'new' | 'open';
  record?: StoredProjectRecord;
}

/**
 * ============================================
 * BLOCK: UI Constants
 * VERSION: 1.0.0
 * PURPOSE:
 * Централизация повторяющихся toolbar классов.
 * ============================================
 */
const TOOLBAR_ICON_BUTTON_CLASS =
  'h-9 w-9 text-white/85 hover:text-white hover:bg-white/10';

const TOOLBAR_SEGMENT_BUTTON_CLASS =
  'text-white/70 hover:text-white';

const ACTIVE_SEGMENT_BUTTON_CLASS =
  'bg-white/12 text-white';

const DIALOG_CONTENT_CLASS =
  'bg-[#1A1A1C] border-[#313133] text-white';

const INPUT_CLASS = 'bg-[#111111] border-[#313133] text-white';
const TEXTAREA_CLASS = 'bg-[#111111] border-[#313133] text-white min-h-[96px]';
const OUTLINE_ACTION_CLASS = 'bg-[#171717] border-[#313133] text-white';

/**
 * ============================================
 * BLOCK: Helper Utilities
 * VERSION: 1.0.0
 * PURPOSE:
 * Небольшие локальные pure helpers для toolbar.
 * ============================================
 */
function formatUpdatedAt(value: string): string {
  return new Date(value).toLocaleString();
}

function createDuplicatedProject(record: StoredProjectRecord) {
  return {
    ...record.project,
    meta: {
      ...record.project.meta,
      id: crypto.randomUUID(),
      name: `${record.project.meta.name} копия`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * ============================================
 * BLOCK: File Dialog List
 * VERSION: 1.0.0
 * PURPOSE:
 * Визуализация списка сохранённых проектов.
 * ============================================
 */
function StoredProjectsList({
  records,
  currentProjectId,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}: {
  records: StoredProjectRecord[];
  currentProjectId: string;
  onOpen: (record: StoredProjectRecord) => void;
  onRename: (record: StoredProjectRecord) => void;
  onDuplicate: (record: StoredProjectRecord) => void;
  onDelete: (recordId: string, recordName: string) => void;
}) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#313133] bg-[#111111] px-4 py-8 text-center text-[#8A8A8A]">
        Пока нет сохранённых проектов.
      </div>
    );
  }

  return (
    <>
      {records.map((record) => {
        const isCurrent = record.id === currentProjectId;

        return (
          <div
            key={record.id}
            className="rounded-xl border border-[#313133] bg-[#111111] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-medium text-white">
                    {record.name}
                  </h3>

                  {isCurrent ? (
                    <span className="rounded-full border border-[#2A80F4]/30 bg-[#2A80F4]/20 px-2 py-0.5 text-[10px] text-[#7fb1ff]">
                      Текущий
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 line-clamp-2 text-xs text-[#8A8A8A]">
                  {record.description || 'Без описания'}
                </p>

                <p className="mt-2 text-[11px] text-[#6F6F73]">
                  Обновлён: {formatUpdatedAt(record.updatedAt)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className={OUTLINE_ACTION_CLASS}
                  onClick={() => onOpen(record)}
                >
                  Открыть
                </Button>

                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 bg-[#171717] border-[#313133] text-[#B0B0B0]"
                  onClick={() => onRename(record)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>

                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 bg-[#171717] border-[#313133] text-[#B0B0B0]"
                  onClick={() => onDuplicate(record)}
                >
                  <Copy className="w-4 h-4" />
                </Button>

                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 bg-[#171717] border-[#5c2d35] text-[#ff8d9d] hover:bg-[#2a171b]"
                  onClick={() => onDelete(record.id, record.name)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

/**
 * ============================================
 * MODULE: Toolbar Root
 * VERSION: 1.4.0
 * ROLE:
 * Корневой координатор toolbar workflow.
 * ============================================
 */
export function Toolbar() {
  const {
    project,
    mode,
    viewMode,
    undoStack,
    redoStack,
    setMode,
    setViewMode,
    undo,
    redo,
    addSection,
    resetProject,
    updateMeta,
    setProject,
    lastSavedSnapshot,
    markProjectSaved,
  } = useProjectStore();

  /**
   * ============================================
   * BLOCK: Local Dialog State
   * VERSION: 1.0.0
   * PURPOSE:
   * Управление состоянием диалогов и локальных форм toolbar.
   * ============================================
   */
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const [saveProjectName, setSaveProjectName] = useState(project.meta.name || '');
  const [saveProjectDescription, setSaveProjectDescription] = useState(
    project.meta.description || ''
  );

  const [storedProjects, setStoredProjects] = useState<StoredProjectRecord[]>([]);
  const [projectSearch, setProjectSearch] = useState('');

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const [renameTarget, setRenameTarget] = useState<StoredProjectRecord | null>(null);
  const [renameProjectName, setRenameProjectName] = useState('');
  const [renameProjectDescription, setRenameProjectDescription] = useState('');

  /**
   * ============================================
   * BLOCK: Derived State
   * VERSION: 1.0.0
   * PURPOSE:
   * Производные значения для workflow и UI.
   * ============================================
   */
  const currentPage = project.pages[0];
  const currentSnapshot = useMemo(() => captureProjectSnapshot(project), [project]);
  const hasUnsavedChanges = currentSnapshot !== lastSavedSnapshot;

  const hasStoredCurrentProject = useMemo(
    () => storedProjects.some((item) => item.id === project.meta.id),
    [project.meta.id, storedProjects]
  );

  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();

    if (!query) {
      return storedProjects;
    }

    return storedProjects.filter((record) =>
      [record.name, record.description].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [projectSearch, storedProjects]);

  /**
   * ============================================
   * BLOCK: Unsaved Changes Guard
   * VERSION: 1.0.0
   * PURPOSE:
   * Предотвращение случайного закрытия вкладки при несохранённых изменениях.
   * ============================================
   */
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  /**
   * ============================================
   * BLOCK: Persistence Helpers
   * VERSION: 1.0.0
   * PURPOSE:
   * Локальные helper-операции для persistence workflow.
   * ============================================
   */
  const refreshStoredProjects = () => {
    setStoredProjects(listStoredProjects());
  };

  /**
   * ============================================
   * BLOCK: Dialog Lifecycle Handlers
   * VERSION: 1.0.0
   * PURPOSE:
   * Синхронизация состояния форм при открытии/закрытии диалогов.
   * ============================================
   */
  const handleNewProjectDialogChange = (open: boolean) => {
    setShowNewProjectDialog(open);

    if (open) {
      setNewProjectName('');
      setNewProjectDescription('');
    }
  };

  const handleFileDialogChange = (open: boolean) => {
    setShowFileDialog(open);

    if (open) {
      refreshStoredProjects();
    }
  };

  const handleSaveDialogChange = (open: boolean) => {
    setShowSaveDialog(open);

    if (open) {
      setSaveProjectName(project.meta.name || '');
      setSaveProjectDescription(project.meta.description || '');
    }
  };

  const handleRenameDialogChange = (open: boolean) => {
    setShowRenameDialog(open);

    if (!open) {
      setRenameTarget(null);
    }
  };

  /**
   * ============================================
   * BLOCK: Export Actions
   * VERSION: 1.0.0
   * PURPOSE:
   * Действия экспорта HTML/ZIP проекта.
   * ============================================
   */
  const handleExportHtml = () => {
    downloadHTML(project);
    toast.success('HTML экспортирован');
  };

  const handleExportBundle = () => {
    downloadProjectBundle(project);
    toast.success('ZIP-пакет проекта экспортирован');
  };

  /**
   * ============================================
   * BLOCK: Project Lifecycle Actions
   * VERSION: 1.1.0
   * PURPOSE:
   * Создание, сохранение, открытие, дублирование, удаление и rename проекта.
   * ============================================
   */
  const executeNewProject = () => {
    const name = newProjectName.trim() || 'Новый проект';
    const description = newProjectDescription.trim();

    const freshProject = createNewProject();

    resetProject();
    updateMeta({
      id: freshProject.meta.id,
      createdAt: freshProject.meta.createdAt,
      updatedAt: freshProject.meta.updatedAt,
      name,
      description,
    });

    markProjectSaved();
    toast.success('Новый проект создан');

    setNewProjectName('');
    setNewProjectDescription('');
    setShowNewProjectDialog(false);
  };

  const handleNewProject = () => {
    if (hasUnsavedChanges) {
      setPendingAction({ type: 'new' });
      setShowUnsavedDialog(true);
      return;
    }

    executeNewProject();
  };

  const handleSaveProject = () => {
    const name = saveProjectName.trim() || 'Без названия';
    const description = saveProjectDescription.trim();

    const record = saveStoredProject(project, { name, description });

    setProject(record.project);
    markProjectSaved(record.project);
    setShowSaveDialog(false);

    refreshStoredProjects();
    toast.success('Проект сохранён');

    return record;
  };

  const executeOpenProject = (record: StoredProjectRecord) => {
    setProject(record.project);
    markProjectSaved(record.project);

    setShowFileDialog(false);
    setPendingAction(null);

    toast.success(`Проект «${record.name}» открыт`);
  };

  const requestOpenProject = (record: StoredProjectRecord) => {
    if (hasUnsavedChanges) {
      setPendingAction({ type: 'open', record });
      setShowUnsavedDialog(true);
      return;
    }

    executeOpenProject(record);
  };

  const handleDuplicateProject = (record: StoredProjectRecord) => {
    saveStoredProject(createDuplicatedProject(record));
    refreshStoredProjects();
    toast.success('Проект продублирован');
  };

  const handleDeleteProject = (recordId: string, recordName: string) => {
    if (!window.confirm(`Удалить проект «${recordName}»?`)) return;

    deleteStoredProject(recordId);
    refreshStoredProjects();
    toast.success('Проект удалён');
  };

  const openRenameDialog = (record: StoredProjectRecord) => {
    setRenameTarget(record);
    setRenameProjectName(record.name);
    setRenameProjectDescription(record.description);
    setShowRenameDialog(true);
  };

  const handleRenameProject = () => {
    if (!renameTarget) return;

    const updated = renameStoredProject(renameTarget.id, {
      name: renameProjectName,
      description: renameProjectDescription,
    });

    if (updated && updated.id === project.meta.id) {
      setProject(updated.project);
      markProjectSaved(updated.project);
    }

    refreshStoredProjects();
    setShowRenameDialog(false);
    setRenameTarget(null);

    toast.success('Проект переименован');
  };

  /**
   * ============================================
   * BLOCK: Unsaved Flow Actions
   * VERSION: 1.0.0
   * PURPOSE:
   * Продолжение сценариев new/open после решения пользователя по unsaved state.
   * ============================================
   */
  const handleContinueAfterUnsaved = (nextMode: 'save' | 'discard') => {
    const action = pendingAction;
    if (!action) return;

    if (nextMode === 'save') {
      const saved = saveStoredProject(project, {
        name: project.meta.name || 'Без названия',
        description: project.meta.description || '',
      });

      setProject(saved.project);
      markProjectSaved(saved.project);
      refreshStoredProjects();

      toast.success('Проект сохранён перед переключением');
    }

    if (action.type === 'new') {
      executeNewProject();
    }

    if (action.type === 'open' && action.record) {
      executeOpenProject(action.record);
    }

    setPendingAction(null);
    setShowUnsavedDialog(false);
  };

  /**
   * ============================================
   * BLOCK: Builder Actions
   * VERSION: 1.0.0
   * PURPOSE:
   * Действия, связанные с текущим builder canvas.
   * ============================================
   */
  const handleAddSection = () => {
    if (!currentPage) return;

    addSection(currentPage.id);
    toast.success('Секция добавлена');
  };

  return (
    <div className="h-14 bg-[#1769d2] border-b border-white/15 flex items-center px-4 gap-2 shadow-[0_10px_30px_rgba(23,105,210,0.22)]">
      <div className="mr-[43px] flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/15">
          <Grid3X3 className="w-5 h-5 text-white" />
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">UI Генератор</div>

          <div className="flex items-center gap-2">
            <div className="max-w-[220px] truncate text-[11px] text-white/70">
              {project.meta.name}
            </div>

            {hasUnsavedChanges ? (
              <span className="text-[10px] text-white/80">• не сохранён</span>
            ) : null}
          </div>
        </div>
      </div>

      <Separator orientation="vertical" className="h-6 bg-white/20" />

      <div className="flex items-center gap-1">
        <Dialog open={showNewProjectDialog} onOpenChange={handleNewProjectDialogChange}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className={TOOLBAR_ICON_BUTTON_CLASS}>
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>

          <DialogContent className={`${DIALOG_CONTENT_CLASS} max-w-lg`}>
            <DialogHeader>
              <DialogTitle>Новый проект</DialogTitle>
              <DialogDescription className="text-[#B0B0B0]">
                Создать новый чистый проект. Текущий несохранённый прогресс будет сброшен.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Название проекта</Label>
                <Input
                  id="project-name"
                  value={newProjectName}
                  onChange={(event) => setNewProjectName(event.target.value)}
                  placeholder="Мой проект"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-description">Описание</Label>
                <Textarea
                  id="project-description"
                  value={newProjectDescription}
                  onChange={(event) => setNewProjectDescription(event.target.value)}
                  placeholder="Для чего нужен этот проект"
                  className={TEXTAREA_CLASS}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowNewProjectDialog(false)}>
                  Отмена
                </Button>

                <Button onClick={handleNewProject} className="bg-[#2A80F4] hover:bg-[#1e6fd9]">
                  Создать
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showFileDialog} onOpenChange={handleFileDialogChange}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className={TOOLBAR_ICON_BUTTON_CLASS}>
              <FolderOpen className="w-4 h-4" />
            </Button>
          </DialogTrigger>

          <DialogContent className={`${DIALOG_CONTENT_CLASS} max-w-2xl`}>
            <DialogHeader>
              <DialogTitle>Файл</DialogTitle>
              <DialogDescription className="text-[#B0B0B0]">
                Сохранённые проекты в этом браузере. Можно найти нужный, открыть,
                переименовать, дублировать или удалить.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F6F73]" />
                <Input
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                  placeholder="Найти проект по названию или описанию"
                  className={`${INPUT_CLASS} pl-9`}
                />
              </div>

              <div className="scroll-theme max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                {filteredProjects.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#313133] bg-[#111111] px-4 py-8 text-center text-[#8A8A8A]">
                    {storedProjects.length === 0
                      ? 'Пока нет сохранённых проектов.'
                      : 'Поиск ничего не нашёл.'}
                  </div>
                ) : (
                  <StoredProjectsList
                    records={filteredProjects}
                    currentProjectId={project.meta.id}
                    onOpen={requestOpenProject}
                    onRename={openRenameDialog}
                    onDuplicate={handleDuplicateProject}
                    onDelete={handleDeleteProject}
                  />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showSaveDialog} onOpenChange={handleSaveDialogChange}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className={TOOLBAR_ICON_BUTTON_CLASS}>
              <Save className="w-4 h-4" />
            </Button>
          </DialogTrigger>

          <DialogContent className={`${DIALOG_CONTENT_CLASS} max-w-lg`}>
            <DialogHeader>
              <DialogTitle>Сохранить проект</DialogTitle>
              <DialogDescription className="text-[#B0B0B0]">
                Укажи название проекта. Он сохранится в локальном хранилище браузера
                и появится в меню «Файл».
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="save-project-name">Название проекта</Label>
                <Input
                  id="save-project-name"
                  value={saveProjectName}
                  onChange={(event) => setSaveProjectName(event.target.value)}
                  placeholder="Например, CRM Dashboard"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="save-project-description">Описание</Label>
                <Textarea
                  id="save-project-description"
                  value={saveProjectDescription}
                  onChange={(event) => setSaveProjectDescription(event.target.value)}
                  placeholder="Коротко опиши назначение проекта"
                  className={TEXTAREA_CLASS}
                />
              </div>

              <div className="rounded-lg border border-[#313133] bg-[#111111] px-3 py-2 text-xs text-[#8A8A8A]">
                {hasStoredCurrentProject
                  ? 'Этот проект уже был сохранён. При сохранении запись обновится.'
                  : 'Это будет новая запись в списке проектов.'}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowSaveDialog(false)}>
                  Отмена
                </Button>

                <Button
                  onClick={handleSaveProject}
                  className="bg-[#2A80F4] hover:bg-[#1e6fd9]"
                >
                  Сохранить
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Separator orientation="vertical" className="h-6 bg-white/20" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={TOOLBAR_ICON_BUTTON_CLASS}
          onClick={undo}
          disabled={undoStack.length === 0}
        >
          <Undo className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={TOOLBAR_ICON_BUTTON_CLASS}
          onClick={redo}
          disabled={redoStack.length === 0}
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 bg-white/20" />

      <Button
        variant="ghost"
        size="sm"
        className="h-9 gap-2 text-white/85 hover:text-white hover:bg-white/10"
        onClick={handleAddSection}
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Секция</span>
      </Button>

      <Separator orientation="vertical" className="h-6 bg-white/20" />

      <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#0b4fa8] p-1">
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${viewMode === 'desktop' ? ACTIVE_SEGMENT_BUTTON_CLASS : TOOLBAR_SEGMENT_BUTTON_CLASS}`}
          onClick={() => setViewMode('desktop')}
        >
          <Monitor className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${viewMode === 'tablet' ? ACTIVE_SEGMENT_BUTTON_CLASS : TOOLBAR_SEGMENT_BUTTON_CLASS}`}
          onClick={() => setViewMode('tablet')}
        >
          <Tablet className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${viewMode === 'mobile' ? ACTIVE_SEGMENT_BUTTON_CLASS : TOOLBAR_SEGMENT_BUTTON_CLASS}`}
          onClick={() => setViewMode('mobile')}
        >
          <Smartphone className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 bg-white/20" />

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={TOOLBAR_ICON_BUTTON_CLASS}>
            <Download className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="bg-[#1A1A1C] border-[#313133] text-white"
        >
          <DropdownMenuItem
            className="focus:bg-white/10 focus:text-white"
            onClick={handleExportHtml}
          >
            Экспорт HTML
          </DropdownMenuItem>

          <DropdownMenuItem
            className="focus:bg-white/10 focus:text-white"
            onClick={handleExportBundle}
          >
            Скачать ZIP проекта
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="mr-[24px] h-6 bg-white/20" />

      <div className="mr-[14px] flex items-center gap-1 rounded-lg border border-white/10 bg-[#0b4fa8] p-1">
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-3 gap-2 ${mode === 'edit' ? ACTIVE_SEGMENT_BUTTON_CLASS : TOOLBAR_SEGMENT_BUTTON_CLASS}`}
          onClick={() => setMode('edit')}
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Edit</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-3 gap-2 ${mode === 'preview' ? ACTIVE_SEGMENT_BUTTON_CLASS : TOOLBAR_SEGMENT_BUTTON_CLASS}`}
          onClick={() => setMode('preview')}
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Preview</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-3 gap-2 ${mode === 'code' ? ACTIVE_SEGMENT_BUTTON_CLASS : TOOLBAR_SEGMENT_BUTTON_CLASS}`}
          onClick={() => setMode('code')}
        >
          <Code className="w-4 h-4" />
          <span className="hidden sm:inline">Code</span>
        </Button>
      </div>

      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className={`${DIALOG_CONTENT_CLASS} max-w-md`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#ffcc66]" />
              Есть несохранённые изменения
            </DialogTitle>

            <DialogDescription className="text-[#B0B0B0]">
              Перед продолжением можно быстро сохранить текущий проект
              или открыть новый сценарий без сохранения.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setPendingAction(null);
                setShowUnsavedDialog(false);
              }}
            >
              Отмена
            </Button>

            <Button
              variant="outline"
              className={OUTLINE_ACTION_CLASS}
              onClick={() => handleContinueAfterUnsaved('discard')}
            >
              Продолжить без сохранения
            </Button>

            <Button
              className="bg-[#2A80F4] hover:bg-[#1e6fd9]"
              onClick={() => handleContinueAfterUnsaved('save')}
            >
              Сохранить и продолжить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenameDialog} onOpenChange={handleRenameDialogChange}>
        <DialogContent className={`${DIALOG_CONTENT_CLASS} max-w-lg`}>
          <DialogHeader>
            <DialogTitle>Переименовать проект</DialogTitle>
            <DialogDescription className="text-[#B0B0B0]">
              Измени название и описание сохранённого проекта.
              Если это текущий проект, шапка обновится сразу.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="rename-project-name">Название проекта</Label>
              <Input
                id="rename-project-name"
                value={renameProjectName}
                onChange={(event) => setRenameProjectName(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rename-project-description">Описание</Label>
              <Textarea
                id="rename-project-description"
                value={renameProjectDescription}
                onChange={(event) => setRenameProjectDescription(event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowRenameDialog(false)}>
                Отмена
              </Button>

              <Button
                className="bg-[#2A80F4] hover:bg-[#1e6fd9]"
                onClick={handleRenameProject}
              >
                Сохранить изменения
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}