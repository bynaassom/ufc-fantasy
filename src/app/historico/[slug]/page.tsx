"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";
import FightCard from "@/components/event/FightCard";
import { formatEventDate } from "@/lib/utils";
import { FightWithFighters, Pick, Profile } from "@/types";

export default function HistoricoEventoPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [event, setEvent] = useState<any>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [score, setScore] = useState<{
    total_points: number;
    perfect_picks: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const sb = createClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const [
        { data: prof },
        { data: ev },
        { data: userPicks },
        { data: userScore },
      ] = await Promise.all([
        sb.from("profiles").select("*").eq("id", user.id).single(),
        sb
          .from("events")
          .select(
            `
          id, name, slug, event_date, location, status,
          fights (
            *,
            fighter_a:fighters!fights_fighter_a_id_fkey(*),
            fighter_b:fighters!fights_fighter_b_id_fkey(*),
            winner:fighters!fights_winner_id_fkey(*)
          )
        `,
          )
          .eq("slug", slug)
          .single(),
        sb.from("picks").select("*").eq("user_id", user.id),
        sb
          .from("event_scores")
          .select("total_points, perfect_picks")
          .eq("user_id", user.id)
          .single(),
      ]);

      if (!ev) {
        router.push("/historico");
        return;
      }

      setProfile(prof);
      setEvent(ev);
      setPicks((userPicks || []).filter((p: Pick) => p.event_id === ev.id));
      setScore(userScore);
      setLoading(false);
    }
    load();
  }, [slug, router]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--red)" }}
        />
      </div>
    );
  }

  if (!event) return null;

  // Ordena lutas: main card primeiro (order asc), depois prelims (order asc)
  const fights: FightWithFighters[] = [...(event.fights || [])].sort(
    (a: any, b: any) => {
      if (a.card_type !== b.card_type) return a.card_type === "main" ? -1 : 1;
      return a.fight_order - b.fight_order;
    },
  );

  const mainCard = fights.filter((f: any) => f.card_type === "main");
  const prelims = fights.filter((f: any) => f.card_type === "preliminary");

  return (
    <div
      className="min-h-screen pb-24 md:pb-10"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <Navbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/historico")}
            className="flex items-center gap-2 font-condensed font-600 text-xs uppercase tracking-widest mb-4 transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Histórico
          </button>

          <h1
            className="font-condensed font-900 text-2xl uppercase tracking-wide"
            style={{ color: "var(--text)" }}
          >
            {event.name}
          </h1>
          <p
            className="font-condensed font-600 text-xs uppercase tracking-widest mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            {formatEventDate(event.event_date)}
            {event.location && ` · ${event.location}`}
          </p>

          {/* Pontuação do usuário */}
          {score ? (
            <div
              className="flex items-center gap-6 mt-4 px-5 py-3"
              style={{
                backgroundColor: "var(--bg-card)",
                borderLeft: "3px solid var(--red)",
              }}
            >
              <div>
                <p
                  className="font-condensed font-600 text-xs uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                >
                  Seus pontos
                </p>
                <p
                  className="font-condensed font-900 text-2xl"
                  style={{ color: "var(--red)" }}
                >
                  {score.total_points}
                </p>
              </div>
              {score.perfect_picks > 0 && (
                <div>
                  <p
                    className="font-condensed font-600 text-xs uppercase tracking-widest"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Cravadas
                  </p>
                  <p
                    className="font-condensed font-900 text-2xl"
                    style={{ color: "var(--text)" }}
                  >
                    {score.perfect_picks}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div
              className="mt-4 px-5 py-3"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <p
                className="font-condensed font-600 text-xs uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}
              >
                Você não fez picks neste evento
              </p>
            </div>
          )}
        </div>

        {/* Main Card */}
        {mainCard.length > 0 && (
          <section className="mb-8">
            <div className="red-line mb-4">
              <span className="section-title text-sm">CARD PRINCIPAL</span>
            </div>
            <div className="space-y-3">
              {mainCard.map((fight) => (
                <FightCard
                  key={fight.id}
                  fight={fight}
                  existingPick={picks.find((p) => p.fight_id === fight.id)}
                  locked={true}
                  onPickChange={() => {}}
                />
              ))}
            </div>
          </section>
        )}

        {/* Prelims */}
        {prelims.length > 0 && (
          <section>
            <div className="red-line mb-4">
              <span className="section-title text-sm">PRELIMINARES</span>
            </div>
            <div className="space-y-3">
              {prelims.map((fight) => (
                <FightCard
                  key={fight.id}
                  fight={fight}
                  existingPick={picks.find((p) => p.fight_id === fight.id)}
                  locked={true}
                  onPickChange={() => {}}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
