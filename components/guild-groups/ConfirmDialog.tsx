'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const t = useTranslations('GuildGroups');
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2">
            <AlertTriangle
              size={18}
              className={danger ? 'text-red-400' : 'text-accent'}
            />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-muted mb-6 whitespace-pre-line">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#070f1d] text-sm text-muted hover:text-white transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className={`h-10 px-4 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
              danger ? 'bg-red-600 hover:bg-red-500' : 'bg-accent hover:bg-accent/80'
            }`}
          >
            {busy ? t('processing') : confirmLabel ?? t('confirm')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}