type AdminEventLike = {
  id: string;
  event_date: string;
  status?: string | null;
};

export type AdminEventGroup<T extends AdminEventLike> = {
  label: string;
  events: T[];
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "UTC",
});

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function groupAdminEvents<T extends AdminEventLike>(
  events: T[],
  now = new Date(),
): AdminEventGroup<T>[] {
  const currentAndUpcoming = events
    .filter(
      (event) =>
        event.status === "live" ||
        new Date(event.event_date).getTime() >= now.getTime(),
    )
    .sort(
      (left, right) =>
        new Date(left.event_date).getTime() - new Date(right.event_date).getTime(),
    );
  const previous = events
    .filter(
      (event) =>
        event.status !== "live" &&
        new Date(event.event_date).getTime() < now.getTime(),
    )
    .sort(
      (left, right) =>
        new Date(right.event_date).getTime() - new Date(left.event_date).getTime(),
    );

  const groups: AdminEventGroup<T>[] = [];
  if (currentAndUpcoming.length) {
    groups.push({ label: "Atual e próximos", events: currentAndUpcoming });
  }

  for (const event of previous) {
    const date = new Date(event.event_date);
    const label = `Anteriores · ${date.getUTCFullYear()} · ${capitalize(
      monthFormatter.format(date),
    )}`;
    const existing = groups.find((group) => group.label === label);
    if (existing) {
      existing.events.push(event);
    } else {
      groups.push({ label, events: [event] });
    }
  }

  return groups;
}
