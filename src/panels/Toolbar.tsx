/**
 * ============================================
 * MODULE: Toolbar
 * VERSION: 1.5.0
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
 * - ToolbarDialogs
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
  Code,
  Download,
  Eye,
  FolderOpen,
  Grid3X3,
  Monitor,
  Plus,
  Redo,
  Save,
  Settings,
  Smartphone,
  Tablet,
  Undo,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { downloadHTML, downloadProjectBundle } from '@/core/htmlExporter';
import {
  deleteStoredProject,
  listStoredProjects,
  renameStoredProject,
  saveStoredProject,
  type StoredProjectRecord,
} from '@/core/projectPersistence';
import { ToolbarDialogs } from '@/panels/ToolbarDialogs';
import {
  captureProjectSnapshot,
  createNewProject,
  useProjectStore,
} from '@/store/projectStore';

interface PendingAction {
  type: 'new' | 'open';
  record?: StoredProjectRecord;
}

const TOOLBAR_ICON_BUTTON_CLASS =
  'h-9 w-9 text-white/85 hover:text-white hover:bg-white/10';

const TOOLBAR_SEGMENT_BUTTON_CLASS =
  'text-white/70 hover:text-white';

const ACTIVE_SEGMENT_BUTTON_CLASS =
  'bg-white/12 text-white';

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

  const refreshStoredProjects = () => {
    setStoredProjects(listStoredProjects());
  };

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

  const handleExportHtml = () => {
    downloadHTML(project);
    toast.success('HTML экспортирован');
  };

  const handleExportBundle = () => {
    downloadProjectBundle(project);
    toast.success('ZIP-пакет проекта экспортирован');
  };

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
          </div>
        </div>
      </div>

      <Separator
        orientation="vertical"
        className="h-6 bg-white/20"
        style={{ marginLeft: 123, marginRight: 0 }}
      />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={TOOLBAR_ICON_BUTTON_CLASS}
          onClick={() => handleNewProjectDialogChange(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={TOOLBAR_ICON_BUTTON_CLASS}
          onClick={() => handleFileDialogChange(true)}
        >
          <FolderOpen className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={TOOLBAR_ICON_BUTTON_CLASS}
          onClick={() => handleSaveDialogChange(true)}
        >
          <Save className="w-4 h-4" />
        </Button>
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

      <ToolbarDialogs
        currentProjectId={project.meta.id}
        showNewProjectDialog={showNewProjectDialog}
        onNewProjectDialogChange={handleNewProjectDialogChange}
        newProjectName={newProjectName}
        setNewProjectName={setNewProjectName}
        newProjectDescription={newProjectDescription}
        setNewProjectDescription={setNewProjectDescription}
        onCreateNewProject={handleNewProject}
        showFileDialog={showFileDialog}
        onFileDialogChange={handleFileDialogChange}
        projectSearch={projectSearch}
        setProjectSearch={setProjectSearch}
        storedProjects={storedProjects}
        filteredProjects={filteredProjects}
        onOpenProject={requestOpenProject}
        onRenameProject={openRenameDialog}
        onDuplicateProject={handleDuplicateProject}
        onDeleteProject={handleDeleteProject}
        showSaveDialog={showSaveDialog}
        onSaveDialogChange={handleSaveDialogChange}
        saveProjectName={saveProjectName}
        setSaveProjectName={setSaveProjectName}
        saveProjectDescription={saveProjectDescription}
        setSaveProjectDescription={setSaveProjectDescription}
        hasStoredCurrentProject={hasStoredCurrentProject}
        onSaveProject={handleSaveProject}
        showUnsavedDialog={showUnsavedDialog}
        onUnsavedDialogChange={setShowUnsavedDialog}
        onCancelUnsaved={() => {
          setPendingAction(null);
          setShowUnsavedDialog(false);
        }}
        onContinueAfterUnsaved={handleContinueAfterUnsaved}
        showRenameDialog={showRenameDialog}
        onRenameDialogChange={handleRenameDialogChange}
        renameProjectName={renameProjectName}
        setRenameProjectName={setRenameProjectName}
        renameProjectDescription={renameProjectDescription}
        setRenameProjectDescription={setRenameProjectDescription}
        onConfirmRenameProject={handleRenameProject}
      />
    </div>
  );
}