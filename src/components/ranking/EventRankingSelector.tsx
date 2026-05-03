"use client";

import { startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RankingSelectableEvent } from "@/lib/ranking-events";

export default function EventRankingSelector({
  events,
  selectedSlug,
}: {
  events: RankingSelectableEvent[];
  selectedSlug: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(nextSlug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "evento");
    params.set("event", nextSlug);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="w-full md:w-72">
      <label
        className="block text-xs font-700 uppercase tracking-widest mb-2 font-condensed"
        style={{ color: "var(--text-secondary)" }}
      >
        Ver evento
      </label>
      <select
        value={selectedSlug}
        onChange={(event) => handleChange(event.target.value)}
        className="w-full px-4 py-3 text-sm"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          fontFamily: "inherit",
          outline: "none",
        }}
      >
        {events.map((event) => (
          <option key={event.id} value={event.slug}>
            {event.name}
          </option>
        ))}
      </select>
    </div>
  );
}
