"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { readApiResponse } from "@/lib/api";
import type { EnrichedGroup } from "@/types";
import CopyInviteButton from "@/components/groups/CopyInviteButton";

export default function GroupsClient({ groups }: { groups: EnrichedGroup[] }) {
  const [list, setList] = useState(groups);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    const fd = new FormData(e.currentTarget);
    try {
      const group = await readApiResponse<any>(
        await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fd.get("name"),
            description: fd.get("description") || null,
          }),
        }),
      );
      const enriched: EnrichedGroup = {
        ...group,
        member_count: 1,
        champion: null,
        my_rank: 1,
      };
      setList((prev) => [enriched, ...prev]);
      setShowCreate(false);
      toast.success("Liga criada!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar liga.");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setJoining(true);
    const fd = new FormData(e.currentTarget);
    try {
      const group = await readApiResponse<any>(
        await fetch("/api/groups/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: fd.get("code") }),
        }),
      );
      const enriched: EnrichedGroup = {
        ...group,
        member_count: 1,
        champion: null,
        my_rank: 1,
      };
      setList((prev) => [enriched, ...prev]);
      setShowJoin(false);
      toast.success("Entrou na liga!");
    } catch (err: any) {
      toast.error(err.message || "Código inválido.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div>
      {/* Action buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => { setShowCreate(true); setShowJoin(false); }}
          className="px-5 py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white"
          style={{ backgroundColor: "var(--red)" }}
        >
          Criar liga
        </button>
        <button
          onClick={() => { setShowJoin(true); setShowCreate(false); }}
          className="px-5 py-3 font-condensed font-900 text-sm uppercase tracking-widest"
          style={{
            color: "var(--text)",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          Entrar com código
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="p-4 mb-6 space-y-3"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <label
            htmlFor="league-name"
            className="block font-condensed font-700 text-xs uppercase tracking-widest"
            style={{ color: "var(--text-secondary)" }}
          >
            Nome da liga
          </label>
          <input
            id="league-name"
            name="name"
            placeholder="Nome da liga"
            required
            maxLength={50}
            className="w-full px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--bg)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
          />
          <label
            htmlFor="league-description"
            className="block font-condensed font-700 text-xs uppercase tracking-widest"
            style={{ color: "var(--text-secondary)" }}
          >
            Descrição <span className="normal-case tracking-normal">(opcional)</span>
          </label>
          <input
            id="league-description"
            name="description"
            placeholder="Descrição (opcional)"
            maxLength={200}
            className="w-full px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--bg)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 font-condensed font-900 text-xs uppercase tracking-widest text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--red)" }}
            >
              {creating ? "Criando..." : "Criar"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Join form */}
      {showJoin && (
        <form
          onSubmit={handleJoin}
          className="p-4 mb-6 space-y-3"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <label htmlFor="league-code" className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Digite o código de 8 caracteres da liga:
          </label>
          <input
            id="league-code"
            name="code"
            placeholder="Ex: ABC123XY"
            required
            minLength={8}
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="w-full px-3 py-2 text-sm font-mono uppercase"
            style={{
              backgroundColor: "var(--bg)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={joining}
              className="px-4 py-2 font-condensed font-900 text-xs uppercase tracking-widest text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--red)" }}
            >
              {joining ? "Entrando..." : "Entrar"}
            </button>
            <button
              type="button"
              onClick={() => setShowJoin(false)}
              className="px-4 py-2 text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Group list */}
      {list.length === 0 ? (
        <div
          className="p-8 text-center"
          style={{ color: "var(--text-secondary)" }}
        >
          <p className="font-condensed font-900 text-lg uppercase">Nenhuma liga ainda</p>
          <p className="text-sm mt-2">
            Crie uma liga ou entre com um código de convite.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((g) => (
            <div
              key={g.id}
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderLeft: "3px solid var(--red)",
              }}
            >
              <Link
                href={`/ligas/${g.id}`}
                className="block p-4 hover-bg-elevated transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-condensed font-900 uppercase tracking-wide truncate"
                      style={{ color: "var(--text)" }}
                    >
                      {g.name}
                    </p>
                    {g.description && (
                      <p className="text-sm mt-1 truncate" style={{ color: "var(--text-secondary)" }}>
                        {g.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="font-condensed font-900 text-lg leading-none" style={{ color: "var(--red)" }}>
                      {g.member_count}
                    </p>
                    <p className="font-condensed font-700 text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                      membros
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  {g.my_rank && (
                    <span className="font-condensed font-700 uppercase tracking-widest">
                      Seu rank: #{g.my_rank}
                    </span>
                  )}
                  {g.champion && (
                    <span className="font-condensed font-700 uppercase tracking-widest">
                      Líder: {g.champion.nickname} · {g.champion.total_points} pts
                    </span>
                  )}
                </div>
              </Link>

              <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
                <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                  {g.invite_code}
                </span>
                <CopyInviteButton inviteCode={g.invite_code} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
