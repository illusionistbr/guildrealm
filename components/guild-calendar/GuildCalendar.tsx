'use client';

import { useMemo, useRef, useCallback, useState, forwardRef } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { GuildCalendarEvent, EventType, EVENT_TYPES, EVENT_TYPE_CONFIG } from '@/lib/calendar/types';
import { useGuildEvents } from '@/lib/calendar/hooks';
import { CalendarToolbar } from './CalendarToolbar';
import { EventFilters } from './EventFilters';
import { EventModal } from './EventModal';
import { EventDetails } from './EventDetails';
import { Loader2, CalendarX2 } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FCComponent = dynamic(() => import('@fullcalendar/react').then((m) => m.default), { ssr: false }) as any;
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

interface GuildCalendarProps {
  guildId: string;
  guildName: string;
  uid: string;
  displayName: string;
  isLeader: boolean;
  timezone: number;
}

export function GuildCalendar({
  guildId,
  guildName,
  uid,
  displayName,
  isLeader,
  timezone,
}: GuildCalendarProps) {
  const t = useTranslations('GuildCalendar');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calendarRef = useRef<any>(null);
  const { events, loading, error, createEvent, updateEvent, deleteEvent } =
    useGuildEvents(guildId);

  const [currentView, setCurrentView] = useState<string>('timeGridDay');
  const [currentTitle, setCurrentTitle] = useState('');
  const [activeFilters, setActiveFilters] = useState<EventType[]>(
    Object.values(EVENT_TYPES),
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  const [detailsEvent, setDetailsEvent] =
    useState<GuildCalendarEvent | null>(null);

  const filteredEvents = useMemo(
    () => events.filter((e) => activeFilters.includes(e.type)),
    [events, activeFilters],
  );

  const fcEvents = useMemo(
    () =>
      filteredEvents.map((e) => {
        const cfg = EVENT_TYPE_CONFIG[e.type];
        return {
          id: e.id,
          title: `${cfg.icon} ${e.title}`,
          start: e.start,
          end: e.end,
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          textColor: cfg.color,
          extendedProps: {
            rawEvent: e,
          },
        };
      }),
    [filteredEvents],
  );

  const handleViewChange = useCallback((view: string) => {
    const calApi = calendarRef.current?.getApi();
    if (calApi) {
      calApi.changeView(view);
      setCurrentView(view);
    }
  }, []);

  const handlePrev = useCallback(() => {
    calendarRef.current?.getApi().prev();
  }, []);

  const handleNext = useCallback(() => {
    calendarRef.current?.getApi().next();
  }, []);

  const handleToday = useCallback(() => {
    calendarRef.current?.getApi().today();
  }, []);

  const handleDatesSet = useCallback((arg: { view: { title: string } }) => {
    setCurrentTitle(arg.view.title);
  }, []);

  const handleSelect = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (selectInfo: any) => {
      if (!isLeader) return;
      setModalInitial({
        start: selectInfo.start,
        end: selectInfo.end,
      });
      setModalOpen(true);
    },
    [isLeader],
  );

  const handleEventClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (clickInfo: any) => {
      const raw = clickInfo.event.extendedProps.rawEvent as GuildCalendarEvent;
      setDetailsEvent(raw);
    },
    [],
  );

  const handleEventDrop = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (dropInfo: any) => {
      if (!isLeader) return;
      const raw = dropInfo.event.extendedProps.rawEvent as GuildCalendarEvent;
      try {
        await updateEvent(raw.id, {
          start: dropInfo.event.start!,
          end: dropInfo.event.end || dropInfo.event.start!,
        });
      } catch {
        dropInfo.revert();
      }
    },
    [isLeader, updateEvent],
  );

  const handleEventResize = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (resizeInfo: any) => {
      if (!isLeader) return;
      const raw = resizeInfo.event.extendedProps.rawEvent as GuildCalendarEvent;
      try {
        await updateEvent(raw.id, {
          start: resizeInfo.event.start!,
          end: resizeInfo.event.end!,
        });
      } catch {
        resizeInfo.revert();
      }
    },
    [isLeader, updateEvent],
  );

  const handleCreateEvent = useCallback(
    async (data: Omit<GuildCalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
      await createEvent(data, uid, displayName);
      setModalOpen(false);
      setModalInitial(null);
    },
    [createEvent, uid, displayName],
  );

  const handleUpdateEvent = useCallback(
    async (eventId: string, data: Partial<GuildCalendarEvent>) => {
      await updateEvent(eventId, data);
      setDetailsEvent(null);
    },
    [updateEvent],
  );

  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      await deleteEvent(eventId);
      setDetailsEvent(null);
    },
    [deleteEvent],
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="text-accent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] gap-3">
        <CalendarX2 size={40} className="text-red-400" />
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-3">
      <CalendarToolbar
        currentView={currentView}
        currentTitle={currentTitle}
        isLeader={isLeader}
        onViewChange={handleViewChange}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onCreateEvent={() => {
          setModalInitial(null);
          setModalOpen(true);
        }}
      />

      <EventFilters
        activeFilters={activeFilters}
        onChange={setActiveFilters}
      />

      <div
        className="fc-wrapper flex-1 min-h-0 rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#070f1d] overflow-auto"
        style={{ minHeight: events.length === 0 ? 0 : 500 }}
      >
        <FCComponent
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridDay"
          headerToolbar={false}
          locale="pt-BR"
          allDaySlot={false}
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          slotDuration="01:00:00"
          snapDuration="00:15:00"
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
          nowIndicator={true}
          selectMirror={true}
          selectable={isLeader}
          selectAllow={() => isLeader}
          editable={isLeader}
          eventStartEditable={isLeader}
          eventDurationEditable={isLeader}
          dayMaxEvents={3}
          events={fcEvents}
          select={handleSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          datesSet={handleDatesSet}
          buttonText={{
            today: t('today'),
            month: t('month'),
            week: t('week'),
            day: t('day'),
          }}
          views={{
            timeGridDay: {
              type: 'timeGrid',
              duration: { days: 1 },
              buttonText: t('day'),
            },
            timeGridWeek: {
              type: 'timeGrid',
              duration: { weeks: 1 },
              buttonText: t('week'),
            },
            dayGridMonth: {
              type: 'dayGrid',
              buttonText: t('month'),
            },
          }}
          height="100%"
        />
      </div>

      {modalOpen && (
        <EventModal
          guildId={guildId}
          uid={uid}
          displayName={displayName}
          initialStart={modalInitial?.start ?? null}
          initialEnd={modalInitial?.end ?? null}
          onClose={() => {
            setModalOpen(false);
            setModalInitial(null);
          }}
          onSubmit={handleCreateEvent}
        />
      )}

      {detailsEvent && (
        <EventDetails
          event={detailsEvent}
          uid={uid}
          isLeader={isLeader}
          onClose={() => setDetailsEvent(null)}
          onUpdate={handleUpdateEvent}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
}
