'use client';

import { useTranslations } from 'next-intl';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  LayoutGrid,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/admin/utils/cn';

interface CalendarToolbarProps {
  currentView: string;
  currentTitle: string;
  isLeader: boolean;
  onViewChange: (view: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onCreateEvent: () => void;
}

const VIEW_OPTIONS = [
  { key: 'timeGridDay', label: 'day', icon: Clock },
  { key: 'timeGridWeek', label: 'week', icon: Calendar },
  { key: 'dayGridMonth', label: 'month', icon: LayoutGrid },
];

export function CalendarToolbar({
  currentView,
  currentTitle,
  isLeader,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onCreateEvent,
}: CalendarToolbarProps) {
  const t = useTranslations('GuildCalendar');

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-muted hover:text-white hover:border-accent/50 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={onToday}
          className="h-9 px-3 flex items-center justify-center rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-xs font-medium text-muted hover:text-white hover:border-accent/50 transition-colors"
        >
          {t('today')}
        </button>
        <button
          onClick={onNext}
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-muted hover:text-white hover:border-accent/50 transition-colors"
        >
          <ChevronRight size={16} />
        </button>

        <h2 className="text-sm font-heading font-semibold text-white ml-2">
          {currentTitle}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#0a1122] overflow-hidden">
          {VIEW_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onViewChange(key)}
              className={cn(
                'h-9 px-3 flex items-center gap-1.5 text-xs font-medium transition-colors',
                currentView === key
                  ? 'bg-accent text-white'
                  : 'text-muted hover:text-white hover:bg-[rgba(38,51,86,0.3)]',
              )}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{t(label)}</span>
            </button>
          ))}
        </div>

        {isLeader && (
          <button
            onClick={onCreateEvent}
            className="h-9 px-3 flex items-center gap-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">{t('createEvent')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
