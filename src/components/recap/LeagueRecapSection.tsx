import type { LeagueRecapStanding } from "@/types";

function movementLabel(movement: string, delta: number): string {
  if (movement === "same") return "=";
  if (movement === "new") return "novo";
  if (movement === "up") return `🔺${delta}`;
  if (movement === "down") return `🔻${delta}`;
  return "—";
}

export default function LeagueRecapSection({
  standings,
}: {
  standings: LeagueRecapStanding[];
}) {
  if (!standings || standings.length === 0) return null;

  return (
    <div className="mt-8 mb-4">
      <h2
        className="font-condensed font-700 text-lg uppercase tracking-widest mb-4"
        style={{ color: "var(--text)" }}
      >
        Suas Ligas
      </h2>

      {standings.map((league) => (
        <div
          key={league.groupId}
          className="mb-4 p-4"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <h3
            className="font-condensed font-700 text-sm uppercase tracking-widest mb-3"
            style={{ color: "var(--red)" }}
          >
            Liga {league.groupName}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    borderBottom: "2px solid var(--red)",
                  }}
                >
                  {["#", "Jogador", "Pts", "Evento", "Mov"].map((h) => (
                    <th
                      key={h}
                      className="font-condensed text-xs uppercase tracking-widest py-2 px-2 text-left"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {league.members.map((m) => (
                  <tr
                    key={m.userId}
                    style={{
                      backgroundColor: m.isCurrentUser
                        ? "rgba(239,68,68,0.05)"
                        : "transparent",
                      borderBottom: "1px solid var(--border-light)",
                    }}
                  >
                    <td className="py-2 px-2 font-condensed font-700" style={{ color: m.isCurrentUser ? "var(--red)" : "var(--text)" }}>
                      {m.isCurrentUser ? "→" : ""}{m.position}
                    </td>
                    <td className="py-2 px-2 font-condensed" style={{ color: "var(--text)" }}>
                      {m.name}
                    </td>
                    <td className="py-2 px-2 font-condensed font-700" style={{ color: "var(--text)" }}>
                      {m.totalPoints}
                    </td>
                    <td className="py-2 px-2 font-condensed font-700" style={{ color: "var(--red)" }}>
                      +{m.eventXp}
                    </td>
                    <td className="py-2 px-2 font-condensed text-xs" style={{ color: "var(--text-muted)" }}>
                      {movementLabel(m.movement, m.movementDelta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
