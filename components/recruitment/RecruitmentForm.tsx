'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AlertCircle, Loader2, Send } from 'lucide-react';
import {
  type ApplicationAnswer,
  type RecruitmentQuestion,
  type RecruitmentSettings,
} from '@/lib/groups/types';
import { cn } from '@/lib/admin/utils/cn';

interface RecruitmentFormProps {
  settings: RecruitmentSettings;
  onSubmit: (answers: ApplicationAnswer[]) => Promise<void> | void;
  submitLabel: string;
  busy?: boolean;
  externalError?: string;
}

const inputClass =
  'w-full bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors px-3 py-2.5';

function validateQuestion(
  q: RecruitmentQuestion,
  value: string | string[] | undefined,
  t: (key: string, params?: Record<string, string | number | Date>) => string,
): string | null {
  switch (q.type) {
    case 'short_text':
    case 'long_text': {
      const s = typeof value === 'string' ? value.trim() : '';
      if (q.required && !s) return t('fieldRequired');
      if (s && q.config.minLength && s.length < q.config.minLength)
        return t('errMinLength', { min: q.config.minLength });
      if (s && q.config.maxLength && s.length > q.config.maxLength)
        return t('errMaxLength', { max: q.config.maxLength });
      return null;
    }
    case 'number': {
      if (value === undefined || value === null || value === '') {
        return q.required ? t('fieldRequired') : null;
      }
      const n = Number(String(value).replace(/\./g, '').replace(',', '.'));
      if (!Number.isFinite(n)) return t('errInvalidNumber');
      if (q.config.min !== undefined && n < q.config.min)
        return t('errMinValue', { min: q.config.min });
      if (q.config.max !== undefined && n > q.config.max)
        return t('errMaxValue', { max: q.config.max });
      return null;
    }
    case 'single_choice':
    case 'dropdown':
    case 'yes_no':
      if (q.required && !value) return t('errRequiredOption');
      return null;
    case 'multiple_choice': {
      const list = Array.isArray(value) ? value : [];
      if (q.required && list.length === 0) return t('errRequiredOptions');
      return null;
    }
    case 'checkbox':
      if (q.required && value !== 'true') return t('fieldRequired');
      return null;
    default:
      return null;
  }
}

export function RecruitmentForm({
  settings,
  onSubmit,
  submitLabel,
  busy,
  externalError,
}: RecruitmentFormProps) {
  const t = useTranslations('Recruitment');
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    for (const q of settings.questions) {
      const e = validateQuestion(q, answers[q.id], t);
      if (e) errs[q.id] = e;
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const list: ApplicationAnswer[] = [];
    for (const q of settings.questions) {
      const value = answers[q.id];
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value) && value.length === 0) continue;
      list.push({ questionId: q.id, answer: value });
    }
    void onSubmit(list);
  };

  return (
    <div className="space-y-5">
      {settings.message && (
        <div className="rounded-lg border border-[rgba(38,51,86,0.5)] bg-[rgba(10,18,32,0.4)] p-4">
          <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
            {settings.message}
          </p>
        </div>
      )}

      {settings.questions.map((q) => {
        const error = errors[q.id];
        const options = q.config.options ?? [];
        return (
          <div key={q.id}>
            <label className="block text-sm text-white font-medium mb-1.5">
              {q.title}
              {q.required && (
                <span className="text-red-400 ml-0.5">*</span>
              )}
            </label>

            {q.type === 'short_text' && (
              <input
                type="text"
                value={(answers[q.id] as string) ?? ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                className={cn(inputClass, error && 'border-red-500/50')}
              />
            )}

            {q.type === 'long_text' && (
              <textarea
                rows={4}
                value={(answers[q.id] as string) ?? ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                className={cn(inputClass, 'resize-y', error && 'border-red-500/50')}
              />
            )}

            {q.type === 'number' && (
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={(answers[q.id] as string) ?? ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                className={cn(inputClass, error && 'border-red-500/50')}
              />
            )}

            {q.type === 'dropdown' && (
              <select
                value={(answers[q.id] as string) ?? ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                className={cn(inputClass, 'appearance-none', error && 'border-red-500/50')}
              >
                <option value="" className="bg-[#0a1122]">
                  {t('selectOption')}
                </option>
                {options.map((opt) => (
                  <option key={opt} value={opt} className="bg-[#0a1122]">
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {q.type === 'single_choice' && (
              <div className="space-y-2">
                {options.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2.5 cursor-pointer text-sm text-white"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswer(q.id, opt)}
                      className="accent-[#6d28d9]"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {q.type === 'multiple_choice' && (
              <div className="space-y-2">
                {options.map((opt) => {
                  const list = (answers[q.id] as string[] | undefined) ?? [];
                  const checked = list.includes(opt);
                  return (
                    <label
                      key={opt}
                      className="flex items-center gap-2.5 cursor-pointer text-sm text-white"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setAnswer(
                            q.id,
                            checked
                              ? list.filter((o) => o !== opt)
                              : [...list, opt],
                          )
                        }
                        className="accent-[#6d28d9]"
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === 'yes_no' && (
              <div className="flex gap-2">
                {(['yes', 'no'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAnswer(q.id, v)}
                    className={cn(
                      'flex-1 h-10 rounded-lg border text-sm font-medium transition-colors',
                      answers[q.id] === v
                        ? 'bg-accent/15 border-accent/40 text-white'
                        : 'border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-muted hover:text-white',
                    )}
                  >
                    {v === 'yes' ? t('yes') : t('no')}
                  </button>
                ))}
              </div>
            )}

            {q.type === 'checkbox' && (
              <label className="flex items-center gap-2.5 cursor-pointer text-sm text-white">
                <input
                  type="checkbox"
                  checked={answers[q.id] === 'true'}
                  onChange={() =>
                    setAnswer(q.id, answers[q.id] === 'true' ? 'false' : 'true')
                  }
                  className="accent-[#6d28d9]"
                />
                {q.config.text || q.title}
              </label>
            )}

            {error && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                <AlertCircle size={12} /> {error}
              </p>
            )}
          </div>
        );
      })}

      {externalError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} /> {externalError}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={busy}
        className="w-full h-11 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Send size={15} />
        )}
        {busy ? t('submitting') : submitLabel}
      </button>
    </div>
  );
}