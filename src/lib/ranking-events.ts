export type RankingSelectableEvent = {
  id: string;
  name: string;
  slug: string;
  event_date: string;
};

export function resolveRankingEventSelection({
  currentEvent,
  completedEvents,
  selectedSlug,
  completedLimit = 7,
}: {
  currentEvent: RankingSelectableEvent | null;
  completedEvents: RankingSelectableEvent[];
  selectedSlug?: string;
  completedLimit?: number;
}) {
  const recentCompletedEvents = completedEvents.slice(0, completedLimit);
  const selectableEvents = [
    ...(currentEvent ? [currentEvent] : []),
    ...recentCompletedEvents.filter((event) => event.id !== currentEvent?.id),
  ];

  return {
    selectableEvents,
    selectedEvent:
      selectableEvents.find((event) => event.slug === selectedSlug) ||
      selectableEvents[0] ||
      null,
  };
}
