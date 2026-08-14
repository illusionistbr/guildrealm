'use client';

import { useTranslations } from 'next-intl';
import { EventType, EVENT_TYPES, EVENT_TYPE_CONFIG } from '@/lib/calendar/types';
import { cn } from '@/lib/admin/utils/cn';

interface EventFiltersProps {
  activeFilters: EventType[];
  onChange: (filters: EventType[]) => void;
}

export function EventFilters({ activeFilters, onChange }: EventFiltersProps) {
  const toggle = (type: EventType) => {
    if (activeFilters.includes(type)) {
      onChange(activeFilters.filter((f) => f !== type));
    } else {
      onChange([...activeFilters, type]);
    }
  };

  const allActive = activeFilters.length === Object.values(EVENT_TYPES).length;

  return (
    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
      <button
        onClick={() =>
          onChange(
            allActive
              ? []
              : Object.values(EVENT_TYPES),
          )
        }
        className={cn(
          'h-7 px-2.5 flex items-center gap-1 rounded-md text-[10px] font-semibold uppercase tracking-wide border transition-colors',
          allActive
            ? 'bg-accent/15 border-accent/40 text-accent'
            : 'border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-muted hover:text-white',
        )}
      >
        {'\u2713'} All
      </button>
      {(Object.entries(EVENT_TYPE_CONFIG) as [EventType, typeof EVENT_TYPE_CONFIG[EventType]][]).map(
        ([type, cfg]) => (
          <button
            key={type}
            onClick={() => toggle(type)}
            className={cn(
              'h-7 px-2.5 flex items-center gap-1 rounded-md text-[10px] font-semibold border transition-colors',
              activeFilters.includes(type)
                ? 'border-opacity-40 text-opacity-100'
                : 'border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-muted opacity-50 hover:opacity-80',
            )}
            style={
              activeFilters.includes(type)
                ? {
                    backgroundColor: cfg.bg,
                    borderColor: cfg.border,
                    color: cfg.color,
                  }
                : undefined
            }
          >
            <span>{cfg.icon}</span>
            <span className="hidden sm:inline">{cfg.label}</span>
          </button>
        ),
      )}
    </div>
  );
}
