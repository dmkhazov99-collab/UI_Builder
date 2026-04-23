/**
 * ============================================
 * MODULE: ToolbarDialogs
 * VERSION: 1.3.0
 * ROLE:
 * Вынесенные диалоговые окна toolbar workflow.
 * ============================================
 */

import {
  AlertTriangle,
  Copy,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { StoredProjectRecord } from '@/core/projectPersistence';

const DIALOG_BASE_CLASS =
  'bg-[#1A1A1C] border-[#313133] text-white shadow-2xl';

const DIALOG_HEADER_CLASS =
  'border-b border-[#313133] px-5 py-4';

const DIALOG_BODY_CLASS =
  'flex w-full flex-col gap-4 px-5 py-4';

const DIALOG_FOOTER_CLASS =
  'flex items-center justify-end gap-2 border-t border-[#313133] px-5 py-4';

const INPUT_CLASS =
  'w-full bg-[#111111] border-[#313133] text-white';

const TEXTAREA_CLASS =
  'w-full min-h-[120px] resize-y bg-[#111111] border-[#313133] text-white';

const OUTLINE_ACTION_CLASS =
  'bg-[#171717] border-[#313133] text-white';

type ProjectActionState = {
  id: string;
  type: 'open' | 'duplicate' | 'delete';
} | null;

function formatUpdatedAt(value: string): string {
  return new Date(value).toLocaleString();
}

function getActionLabel(actionState: ProjectActionState, recordId: string): string | null {
  if (!actionState || actionState.id !== recordId) return null;

  if (actionState.type === 'open') return 'Открываем проект...';
  if (actionState.type === 'duplicate') return 'Дублируем проект...';
  return 'Удаляем проект...';
}

function StoredProjectsList({
  records,
  currentProjectId,
  actionState,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}: {
  records: StoredProjectRecord[];
  currentProjectId: string;
  actionState: ProjectActionState;
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
    <div className="flex flex-col gap-3">
      {records.map((record) => {
        const isCurrent = record.id === currentProjectId;
        const pendingLabel = getActionLabel(actionState, record.id);
        const isBusy = Boolean(pendingLabel);

        return (
          <div
            key={record.id}
            className="rounded-xl border border-[#313133] bg-[#111111] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
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

                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#8A8A8A]">
                  {record.description || 'Без описания'}
                </p>

                <p className="mt-2 text-[11px] text-[#6F6F73]">
                  Обновлён: {formatUpdatedAt(record.updatedAt)}
                </p>

                {pendingLabel ? (
                  <p className="mt-2 text-[11px] text-[#7fb1ff]">{pendingLabel}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className={OUTLINE_ACTION_CLASS}
                  disabled={isBusy}
                  onClick={() => onOpen(record)}
                >
                  {pendingLabel && actionState?.type === 'open' ? 'Открываем...' : 'Открыть'}
                </Button>

                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 bg-[#171717] border-[#313133] text-[#B0B0B0]"
                  disabled={isBusy}
                  onClick={() => onRename(record)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>

                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 bg-[#171717] border-[#313133] text-[#B0B0B0]"
                  disabled={isBusy}
                  onClick={() => onDuplicate(record)}
                >
                  <Copy className="w-4 h-4" />
                </Button>

                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 bg-[#171717] border-[#5c2d35] text-[#ff8d9d] hover:bg-[#2a171b]"
                  disabled={isBusy}
                  onClick={() => onDelete(record.id, record.name)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type ToolbarDialogsProps = {
  currentProjectId: string;

  showNewProjectDialog: boolean;
  onNewProjectDialogChange: (open: boolean) => void;
  newProjectName: string;
  setNewProjectName: (value: string) => void;
  newProjectDescription: string;
  setNewProjectDescription: (value: string) => void;
  onCreateNewProject: () => void;

  showFileDialog: boolean;
  onFileDialogChange: (open: boolean) => void;
  projectSearch: string;
  setProjectSearch: (value: string) => void;
  storedProjects: StoredProjectRecord[];
  filteredProjects: StoredProjectRecord[];
  isProjectsLoading: boolean;
  projectActionState: ProjectActionState;
  onOpenProject: (record: StoredProjectRecord) => void;
  onRenameProject: (record: StoredProjectRecord) => void;
  onDuplicateProject: (record: StoredProjectRecord) => void;
  onDeleteProject: (recordId: string, recordName: string) => void;

  showSaveDialog: boolean;
  onSaveDialogChange: (open: boolean) => void;
  saveProjectName: string;
  setSaveProjectName: (value: string) => void;
  saveProjectDescription: string;
  setSaveProjectDescription: (value: string) => void;
  hasStoredCurrentProject: boolean;
  isProjectSaving: boolean;
  onSaveProject: () => void;

  showUnsavedDialog: boolean;
  onUnsavedDialogChange: (open: boolean) => void;
  onCancelUnsaved: () => void;
  onContinueAfterUnsaved: (nextMode: 'save' | 'discard') => void;

  showRenameDialog: boolean;
  onRenameDialogChange: (open: boolean) => void;
  renameProjectName: string;
  setRenameProjectName: (value: string) => void;
  renameProjectDescription: string;
  setRenameProjectDescription: (value: string) => void;
  isRenameSaving: boolean;
  onConfirmRenameProject: () => void;
};

export function ToolbarDialogs({
  currentProjectId,

  showNewProjectDialog,
  onNewProjectDialogChange,
  newProjectName,
  setNewProjectName,
  newProjectDescription,
  setNewProjectDescription,
  onCreateNewProject,

  showFileDialog,
  onFileDialogChange,
  projectSearch,
  setProjectSearch,
  storedProjects,
  filteredProjects,
  isProjectsLoading,
  projectActionState,
  onOpenProject,
  onRenameProject,
  onDuplicateProject,
  onDeleteProject,

  showSaveDialog,
  onSaveDialogChange,
  saveProjectName,
  setSaveProjectName,
  saveProjectDescription,
  setSaveProjectDescription,
  hasStoredCurrentProject,
  isProjectSaving,
  onSaveProject,

  showUnsavedDialog,
  onUnsavedDialogChange,
  onCancelUnsaved,
  onContinueAfterUnsaved,

  showRenameDialog,
  onRenameDialogChange,
  renameProjectName,
  setRenameProjectName,
  renameProjectDescription,
  setRenameProjectDescription,
  isRenameSaving,
  onConfirmRenameProject,
}: ToolbarDialogsProps) {
  return (
    <>
      <Dialog open={showNewProjectDialog} onOpenChange={onNewProjectDialogChange}>
        <DialogContent className={`${DIALOG_BASE_CLASS} max-w-[560px]`}>
          <div className={DIALOG_HEADER_CLASS}>
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle>Новый проект</DialogTitle>
              <DialogDescription className="max-w-none text-[#B0B0B0] leading-6">
                Создать новый чистый проект. Текущий несохранённый прогресс будет сброшен.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className={DIALOG_BODY_CLASS}>
            <div className="w-full space-y-2">
              <Label htmlFor="project-name">Название проекта</Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder="Мой проект"
                className={INPUT_CLASS}
              />
            </div>

            <div className="w-full space-y-2">
              <Label htmlFor="project-description">Описание</Label>
              <Textarea
                id="project-description"
                value={newProjectDescription}
                onChange={(event) => setNewProjectDescription(event.target.value)}
                placeholder="Для чего нужен этот проект"
                className={TEXTAREA_CLASS}
              />
            </div>
          </div>

          <div className={DIALOG_FOOTER_CLASS}>
            <Button variant="ghost" onClick={() => onNewProjectDialogChange(false)}>
              Отмена
            </Button>

            <Button onClick={onCreateNewProject} className="bg-[#2A80F4] hover:bg-[#1e6fd9]">
              Создать
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFileDialog} onOpenChange={onFileDialogChange}>
        <DialogContent className={`${DIALOG_BASE_CLASS} max-w-[840px]`}>
          <div className={DIALOG_HEADER_CLASS}>
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle>Файл</DialogTitle>
              <DialogDescription className="max-w-none text-[#B0B0B0] leading-6">
                Сохранённые проекты в подключённом хранилище. Можно найти нужный,
                открыть, переименовать, дублировать или удалить.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className={`${DIALOG_BODY_CLASS} gap-3`}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F6F73]" />
              <Input
                value={projectSearch}
                onChange={(event) => setProjectSearch(event.target.value)}
                placeholder="Найти проект по названию или описанию"
                className={`${INPUT_CLASS} pl-9`}
                disabled={isProjectsLoading}
              />
            </div>

            <div className="scroll-theme max-h-[60vh] overflow-y-auto pr-1">
              {isProjectsLoading ? (
                <div className="rounded-xl border border-dashed border-[#313133] bg-[#111111] px-4 py-8 text-center text-[#8A8A8A]">
                  Идёт загрузка проектов...
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#313133] bg-[#111111] px-4 py-8 text-center text-[#8A8A8A]">
                  {storedProjects.length === 0
                    ? 'Пока нет сохранённых проектов.'
                    : 'Поиск ничего не нашёл.'}
                </div>
              ) : (
                <StoredProjectsList
                  records={filteredProjects}
                  currentProjectId={currentProjectId}
                  actionState={projectActionState}
                  onOpen={onOpenProject}
                  onRename={onRenameProject}
                  onDuplicate={onDuplicateProject}
                  onDelete={onDeleteProject}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveDialog} onOpenChange={onSaveDialogChange}>
        <DialogContent className={`${DIALOG_BASE_CLASS} max-w-[560px]`}>
          <div className={DIALOG_HEADER_CLASS}>
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle>Сохранить проект</DialogTitle>
              <DialogDescription className="max-w-none text-[#B0B0B0] leading-6">
                Укажи название проекта. Он сохранится через API
                и появится в меню «Файл».
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className={DIALOG_BODY_CLASS}>
            <div className="w-full space-y-2">
              <Label htmlFor="save-project-name">Название проекта</Label>
              <Input
                id="save-project-name"
                value={saveProjectName}
                onChange={(event) => setSaveProjectName(event.target.value)}
                placeholder="Например, CRM Dashboard"
                className={INPUT_CLASS}
                disabled={isProjectSaving}
              />
            </div>

            <div className="w-full space-y-2">
              <Label htmlFor="save-project-description">Описание</Label>
              <Textarea
                id="save-project-description"
                value={saveProjectDescription}
                onChange={(event) => setSaveProjectDescription(event.target.value)}
                placeholder="Коротко опиши назначение проекта"
                className={TEXTAREA_CLASS}
                disabled={isProjectSaving}
              />
            </div>

            <div className="rounded-lg border border-[#313133] bg-[#111111] px-3 py-2 text-xs leading-5 text-[#8A8A8A]">
              {hasStoredCurrentProject
                ? 'Этот проект уже был сохранён. При сохранении запись обновится.'
                : 'Это будет новая запись в списке проектов.'}
            </div>
          </div>

          <div className={DIALOG_FOOTER_CLASS}>
            <Button variant="ghost" onClick={() => onSaveDialogChange(false)} disabled={isProjectSaving}>
              Отмена
            </Button>

            <Button
              onClick={onSaveProject}
              disabled={isProjectSaving}
              className="bg-[#2A80F4] hover:bg-[#1e6fd9]"
            >
              {isProjectSaving ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showUnsavedDialog} onOpenChange={onUnsavedDialogChange}>
        <DialogContent className={`${DIALOG_BASE_CLASS} max-w-[480px]`}>
          <div className={DIALOG_HEADER_CLASS}>
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#ffcc66]" />
                Есть несохранённые изменения
              </DialogTitle>

              <DialogDescription className="max-w-none text-[#B0B0B0] leading-6">
                Перед продолжением можно быстро сохранить текущий проект
                или открыть новый сценарий без сохранения.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className={DIALOG_FOOTER_CLASS}>
            <Button variant="ghost" onClick={onCancelUnsaved}>
              Отмена
            </Button>

            <Button
              variant="outline"
              className={OUTLINE_ACTION_CLASS}
              onClick={() => onContinueAfterUnsaved('discard')}
            >
              Продолжить без сохранения
            </Button>

            <Button
              className="bg-[#2A80F4] hover:bg-[#1e6fd9]"
              onClick={() => onContinueAfterUnsaved('save')}
            >
              Сохранить и продолжить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenameDialog} onOpenChange={onRenameDialogChange}>
        <DialogContent className={`${DIALOG_BASE_CLASS} max-w-[560px]`}>
          <div className={DIALOG_HEADER_CLASS}>
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle>Переименовать проект</DialogTitle>
              <DialogDescription className="max-w-none text-[#B0B0B0] leading-6">
                Измени название и описание сохранённого проекта.
                Если это текущий проект, шапка обновится сразу.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className={DIALOG_BODY_CLASS}>
            <div className="w-full space-y-2">
              <Label htmlFor="rename-project-name">Название проекта</Label>
              <Input
                id="rename-project-name"
                value={renameProjectName}
                onChange={(event) => setRenameProjectName(event.target.value)}
                className={INPUT_CLASS}
                disabled={isRenameSaving}
              />
            </div>

            <div className="w-full space-y-2">
              <Label htmlFor="rename-project-description">Описание</Label>
              <Textarea
                id="rename-project-description"
                value={renameProjectDescription}
                onChange={(event) => setRenameProjectDescription(event.target.value)}
                className={TEXTAREA_CLASS}
                disabled={isRenameSaving}
              />
            </div>
          </div>

          <div className={DIALOG_FOOTER_CLASS}>
            <Button variant="ghost" onClick={() => onRenameDialogChange(false)} disabled={isRenameSaving}>
              Отмена
            </Button>

            <Button
              className="bg-[#2A80F4] hover:bg-[#1e6fd9]"
              disabled={isRenameSaving}
              onClick={onConfirmRenameProject}
            >
              {isRenameSaving ? 'Сохраняем...' : 'Сохранить изменения'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
