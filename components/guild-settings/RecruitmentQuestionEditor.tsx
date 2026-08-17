'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Plus, Shield, Trash2, X } from 'lucide-react';
import {
  RECRUITMENT_QUESTION_TYPES,
  type RecruitmentQuestion,
  type RecruitmentQuestionType,
} from '@/lib/groups/types';
import { cn } from '@/lib/admin/utils/cn';

interface RecruitmentQuestionEditorProps {
  initial: RecruitmentQuestion | null;
  onSave: (question: RecruitmentQuestion) => void;
  onClose: () => void;
}

const inputClass =
  'w-full h-10 px-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors';

export function RecruitmentQuestionEditor({
  initial,
  onSave,
  onClose,
}: RecruitmentQuestionEditorProps) {
  const t = useTranslations('Recruitment');

  const [title, setTitle] = useState(initial?.title ?? '');
  const [type, setType] = useState<RecruitmentQuestionType>(
    initial?.type ?? 'short_text',
  );
  const [required, setRequired] = useState(initial?.required ?? false);
  const [minLength, setMinLength] = useState<number | ''>(
    initial?.config.minLength ?? '',
  );
  const [maxLength, setMaxLength] = useState<number | ''>(
    initial?.config.maxLength ?? '',
  );
  const [min, setMin] = useState<number | ''>(initial?.config.min ?? '');
  const [max, setMax] = useState<number | ''>(initial?.config.max ?? '');
  const [options, setOptions] = useState<string[]>(
    initial?.config.options ?? [''],
  );
  const [checkText, setCheckText] = useState(initial?.config.text ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const typeLabels = RECRUITMENT_QUESTION_TYPES.map((ty) => ({
    value: ty,
    label: t(`type_${ty}`),
  }));

  const updateOption = (index: number, value: string) =>
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));

  const removeOption = (index: number) =>
    setOptions((prev) => prev.filter((_, i) => i !== index));

  const handleSave = () => {
    setError('');
    if (!title.trim()) {
      setError(t('questionNameRequired'));
      return;
    }
    if (
      (type === 'single_choice' ||
        type === 'multiple_choice' ||
        type === 'dropdown') &&
      options.filter((o) => o.trim()).length === 0
    ) {
      setError(t('optionRequired'));
      return;
    }
    setSaving(true);

    const config: RecruitmentQuestion['config'] = {};
    if (type === 'short_text' || type === 'long_text') {
      if (minLength !== '') config.minLength = Number(minLength);
      if (maxLength !== '') config.maxLength = Number(maxLength);
    }
    if (type === 'number') {
      if (min !== '') config.min = Number(min);
      if (max !== '') config.max = Number(max);
    }
    if (
      type === 'single_choice' ||
      type === 'multiple_choice' ||
      type === 'dropdown'
    ) {
      config.options = options
        .map((o) => o.trim())
        .filter((o) => o.length > 0);
    }
    if (type === 'checkbox') {
      config.text = checkText.trim();
    }

    onSave({
      id: initial?.id ?? `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      title: title.trim(),
      required,
      order: initial?.order ?? 0,
      config,
    });
  };

  const showTextLimits = type === 'short_text' || type === 'long_text';
  const showNumberLimits = type === 'number';
  const showOptions =
    type === 'single_choice' ||
    type === 'multiple_choice' ||
    type === 'dropdown';
  const showCheckText = type === 'checkbox';

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center px-4 py-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-6 my-auto"
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2">
            <Shield size={18} className="text-accent" />
            {initial ? t('editQuestionTitle') : t('newQuestionTitle')}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1">
              {t('questionLabel')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('questionPlaceholder')}
              maxLength={300}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">
              {t('typeLabel')}
            </label>
            <div className="relative">
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as RecruitmentQuestionType)
                }
                className={cn(inputClass, 'appearance-none pr-8')}
              >
                {typeLabels.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#0a1122]">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showTextLimits && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">
                  {t('minLengthLabel')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={minLength}
                  onChange={(e) =>
                    setMinLength(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">
                  {t('maxLengthLabel')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={maxLength}
                  onChange={(e) =>
                    setMaxLength(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {showNumberLimits && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">
                  {t('minValueLabel')}
                </label>
                <input
                  type="number"
                  value={min}
                  onChange={(e) =>
                    setMin(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">
                  {t('maxValueLabel')}
                </label>
                <input
                  type="number"
                  value={max}
                  onChange={(e) =>
                    setMax(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {showOptions && (
            <div>
              <label className="block text-xs text-muted mb-1">
                {t('optionsLabel')}
              </label>
              <div className="space-y-2">
                {options.map((opt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={t('optionPlaceholder')}
                      maxLength={200}
                      className={cn(inputClass, 'flex-1')}
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      disabled={options.length === 1}
                      className="p-2 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                      title={t('removeOption')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setOptions((prev) => [...prev, ''])}
                className="mt-2 inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-[rgba(38,51,86,0.5)] text-xs text-muted hover:text-white hover:border-accent/40 transition-colors"
              >
                <Plus size={13} /> {t('addOption')}
              </button>
            </div>
          )}

          {showCheckText && (
            <div>
              <label className="block text-xs text-muted mb-1">
                {t('checkboxTextLabel')}
              </label>
              <input
                type="text"
                value={checkText}
                onChange={(e) => setCheckText(e.target.value)}
                placeholder={t('checkboxTextPlaceholder')}
                maxLength={300}
                className={inputClass}
              />
            </div>
          )}

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="accent-[#6d28d9]"
            />
            <span className="text-sm text-white">{t('requiredLabel')}</span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-10 rounded-lg bg-accent hover:bg-accent/80 text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {t('saveQuestion')}
            </button>
            <button
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-[rgba(38,51,86,0.5)] text-sm text-muted hover:text-white transition-colors"
            >
              {t('cancelLabel')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}