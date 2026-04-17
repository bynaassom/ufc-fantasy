"use client";

import { startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  COMPETITIVE_DIVISIONS,
  getWeightClassLabel,
  type CompetitiveDivision,
} from "@/lib/ufc-weight";

export default function DivisionSelector({
  selectedDivision,
}: {
  selectedDivision: CompetitiveDivision;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(nextDivision: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "categoria");
    params.set("division", nextDivision);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="w-full md:w-64">
      <label
        className="block text-xs font-700 uppercase tracking-widest mb-2 font-condensed"
        style={{ color: "var(--text-secondary)" }}
      >
        Ver categoria
      </label>
      <select
        value={selectedDivision}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full px-4 py-3 text-sm"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          fontFamily: "inherit",
          outline: "none",
        }}
      >
        {COMPETITIVE_DIVISIONS.map((division) => (
          <option key={division} value={division}>
            {getWeightClassLabel(division)}
          </option>
        ))}
      </select>
    </div>
  );
}
