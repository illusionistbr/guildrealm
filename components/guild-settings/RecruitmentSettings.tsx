'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  KeyRound,
  Loader2,
  MessageSquareText,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  type ApplicationAnswer,
  type RecruitmentQuestion,
  type RecruitmentSettings,
} from '@/lib/groups/types';
import { useRecruitmentSettings } from '@/lib/groups/hooks';
import { cn } from '@/lib/admin/utils/cn';
import { ConfirmDialog } from '@/components/guild-groups/ConfirmDialog';
import { RecruitmentQuestionEditor } from './RecruitmentQuestionEditor';
import { RecruitmentForm } from '@/components/recruitment/RecruitmentForm';

interface RecruitmentSettingsProps {
  guildId: string;
}

export function RecruitmentSettings({ guildId }: RecruitmentSettingsProps) {
  const t = useTranslations('Recruitment');
  const { settings, loading, save } = useRecruitmentSettings(guildId);

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [questions, setQuestions] = useState<RecruitmentQuestion[]>([]);
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const hydrated = useRef(false);

  const [editor, setEditor] = useState<{
    open: boolean;
    initial: RecruitmentQuestion | null;
  }>({ open: false, initial: null });
  const [deleteTarget, setDeleteTarget] = useState<RecruitmentQuestion | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    if (settings && !hydrated.current) {
      hydrated.current = true;
      setEnabled(settings.enabled);
      setMessage(settings.message);
      setQuestions([...settings.questions].sort((a, b) => a.order - b.order));
      setPasswordEnabled(settings.passwordEnabled === true);
      setHasPassword(settings.passwordSet === true);
    }
  }, [settings]);

  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.order - b.order),
    [questions],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedQuestions.findIndex((q) => q.id === active.id);
    const newIndex = sortedQuestions.findIndex((q) => q.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(sortedQuestions, oldIndex, newIndex).map(
      (q, index) => ({ ...q, order: index }),
    );
    setQuestions(next);
  };

  const saveQuestion = (question: RecruitmentQuestion) => {
    setQuestions((prev) => {
      const exists = prev.some((q) => q.id === question.id);
      if (exists) {
        return prev.map((q) => (q.id === question.id ? question : q));
      }
      const order =
        prev.length === 0 ? 0 : Math.max(...prev.map((q) => q.order)) + 1;
      return [...prev, { ...question, order }];
    });
    setEditor({ open: false, initial: null });
  };

  const duplicateQuestion = (question: RecruitmentQuestion) => {
    setQuestions((prev) => {
      const order =
        prev.length === 0 ? 0 : Math.max(...prev.map((q) => q.order)) + 1;
      return [
        ...prev,
        {
          ...question,
          id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          order,
        },
      ];
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    if (passwordEnabled && !hasPassword && !passwordInput) {
      setError(t('passwordRequiredError'));
      setSaving(false);
      return;
    }
    if (passwordInput && (passwordInput.length < 4 || passwordInput.length > 64)) {
      setError(t('passwordLengthError'));
      setSaving(false);
      return;
    }
    try {
      const ordered = sortedQuestions.map((q, index) => ({ ...q, order: index }));
      await save({
        enabled,
        message,
        questions: ordered,
        passwordEnabled,
        password: passwordInput,
      });
      setPasswordInput('');
      setHasPassword(passwordEnabled);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(t('saveError'));
    }
    setSaving(false);
  };

  const previewSettings: RecruitmentSettings = {
    enabled: true,
    message,
    questions: sortedQuestions,
  };

  const previewSubmit = async (_answers: ApplicationAnswer[]) => {
    // A prévia não cria candidatura real
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle2 size={16} /> {t('savedSettings')}
        </div>
      )}

      {loading && !hydrated.current ? (
        <div className="flex items-center justify-center py-10 text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <>
          {/* Status */}
          <section className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#070f1d]/60 p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckCircle2 size={14} className="text-accent" />
              {t('sectionRecruitment')}
            </h3>
            <p className="text-xs text-muted mt-1">{t('recruitmentStatusSub')}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 max-w-sm">
              <button
                type="button"
                onClick={() => setEnabled(true)}
                className={cn(
                  'flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-colors',
                  enabled
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-muted hover:text-white',
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    enabled ? 'bg-emerald-400' : 'bg-emerald-500/40',
                  )}
                />
                {t('openLabel')}
              </button>
              <button
                type="button"
                onClick={() => setEnabled(false)}
                className={cn(
                  'flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-colors',
                  !enabled
                    ? 'bg-red-500/15 border-red-500/40 text-red-400'
                    : 'border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-muted hover:text-white',
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    !enabled ? 'bg-red-400' : 'bg-red-500/40',
                  )}
                />
                {t('closedLabel')}
              </button>
            </div>
            <p className="text-xs text-muted mt-2">
              {enabled ? t('openHint') : t('closedHint')}
            </p>
          </section>

          {/* Mensagem */}
          <section className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#070f1d]/60 p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <MessageSquareText size={14} className="text-accent" />
              {t('sectionMessage')}
            </h3>
            <p className="text-xs text-muted mt-1">{t('sectionMessageSub')}</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={5000}
              placeholder={t('messagePlaceholder')}
              className="mt-3 w-full bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors px-3 py-2.5 resize-y"
            />
          </section>

          {/* Senha da guild */}
          <section className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#070f1d]/60 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <KeyRound size={14} className="text-accent" />
                  {t('sectionPassword')}
                </h3>
                <p className="text-xs text-muted mt-1">{t('sectionPasswordSub')}</p>
              </div>
              <button
                type="button"
                onClick={() => setPasswordEnabled(!passwordEnabled)}
                className={cn(
                  'flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-medium transition-colors',
                  passwordEnabled
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-muted hover:text-white',
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    passwordEnabled ? 'bg-emerald-400' : 'bg-emerald-500/40',
                  )}
                />
                {passwordEnabled ? t('passwordOn') : t('passwordOff')}
              </button>
            </div>

            {passwordEnabled && (
              <div className="mt-3 space-y-2">
                <label className="block text-sm text-white font-medium">
                  {hasPassword ? t('passwordLabelReset') : t('passwordLabel')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    maxLength={64}
                    placeholder={
                      hasPassword ? t('passwordKeepPlaceholder') : t('passwordPlaceholder')
                    }
                    className="w-full bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors px-3 py-2.5 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted hover:text-white transition-colors"
                    title={showPassword ? t('hidePassword') : t('showPassword')}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-xs text-muted">{t('passwordHint')}</p>
              </div>
            )}
          </section>

          {/* Perguntas */}
          <section className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#070f1d]/60 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Plus size={14} className="text-accent" />
                  {t('sectionQuestions')}
                </h3>
                <p className="text-xs text-muted mt-1">{t('sectionQuestionsSub')}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[rgba(38,51,86,0.5)] text-xs text-muted hover:text-white hover:border-accent/40 transition-colors"
                >
                  <Eye size={13} /> {t('previewButton')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditor({ open: true, initial: null })}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-accent hover:bg-accent/80 text-white text-sm font-semibold transition-colors"
                >
                  <Plus size={14} /> {t('addQuestion')}
                </button>
              </div>
            </div>

            {sortedQuestions.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-6 text-center text-sm text-muted">
                {t('noQuestions')}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedQuestions.map((q) => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="mt-3 space-y-2">
                    {sortedQuestions.map((question, index) => (
                      <QuestionCard
                        key={question.id}
                        question={question}
                        index={index}
                        onEdit={() =>
                          setEditor({ open: true, initial: question })
                        }
                        onDuplicate={() => duplicateQuestion(question)}
                        onDelete={() => setDeleteTarget(question)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </section>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="w-full h-11 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> {t('savingSettings')}
              </>
            ) : (
              <>
                <Check size={17} /> {t('saveSettings')}
              </>
            )}
          </button>
        </>
      )}

      {editor.open && (
        <RecruitmentQuestionEditor
          initial={editor.initial}
          onSave={saveQuestion}
          onClose={() => setEditor({ open: false, initial: null })}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t('deleteQuestionTitle')}
          message={t('deleteQuestionMessage')}
          danger
          confirmLabel={t('deleteQuestion')}
          onConfirm={() => {
            setQuestions((prev) => prev.filter((q) => q.id !== deleteTarget.id));
          }}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {previewOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center px-4 py-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-6 my-auto max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2">
                <Eye size={18} className="text-accent" />
                {t('previewTitle')}
              </h3>
              <button
                onClick={() => setPreviewOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <RecruitmentForm
              settings={previewSettings}
              onSubmit={previewSubmit}
              submitLabel={t('submitApplication')}
            />
          </motion.div>
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  index,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  question: RecruitmentQuestion;
  index: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations('Recruitment');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#0a1122] px-2.5 py-2.5',
        isDragging && 'opacity-60 border-accent/50',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1 text-muted hover:text-white cursor-grab active:cursor-grabbing shrink-0"
        title={t('dragHint')}
      >
        <GripVertical size={15} />
      </button>
      <span className="text-[10px] text-muted w-4 text-center shrink-0">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{question.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0a1122] border border-[rgba(38,51,86,0.4)] text-muted">
            {t(`type_${question.type}`)}
          </span>
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded border',
              question.required
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'bg-[#0a1122] text-muted border-[rgba(38,51,86,0.4)]',
            )}
          >
            {question.required ? t('requiredBadge') : t('optionalBadge')}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        title={t('editQuestion')}
        className="p-1.5 rounded text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)] transition-colors shrink-0"
      >
        <Pencil size={13} />
      </button>
      <button
        type="button"
        onClick={onDuplicate}
        title={t('duplicateQuestion')}
        className="p-1.5 rounded text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)] transition-colors shrink-0"
      >
        <Copy size={13} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        title={t('deleteQuestion')}
        className="p-1.5 rounded text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}