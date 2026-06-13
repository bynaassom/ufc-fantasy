"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { adminGet, adminSend, inp, sel, lbl, focus, blur } from "../shared";
import BadgeIcon from "@/components/badges/BadgeIcon";
import type { Badge, BadgeCategory } from "@/types";

const ICON_OPTIONS = [
  "target", "calendar", "flame", "crosshair", "star",
  "eye", "trending-up", "shield", "trophy", "crown",
];

const CATEGORY_OPTIONS: { value: BadgeCategory; label: string }[] = [
  { value: "volume", label: "Volume" },
  { value: "accuracy", label: "Precisão" },
  { value: "streak", label: "Sequência" },
  { value: "challenge", label: "Desafios" },
  { value: "special", label: "Especiais" },
];

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export default function BadgesTab({ subTab }: { subTab: string }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    category: "volume" as BadgeCategory,
    icon_name: "target",
    tier: 1,
    sort_order: 0,
  });

  const loadBadges = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGet<{ badges: Badge[] }>("/api/admin/badges");
      setBadges(data.badges);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  function resetForm() {
    setForm({ name: "", slug: "", description: "", category: "volume", icon_name: "target", tier: 1, sort_order: 0 });
    setEditingId(null);
  }

  function editBadge(badge: Badge) {
    setForm({
      name: badge.name,
      slug: badge.slug,
      description: badge.description,
      category: badge.category,
      icon_name: badge.icon_name,
      tier: badge.tier,
      sort_order: badge.sort_order,
    });
    setEditingId(badge.id);
  }

  async function handleSave() {
    if (!form.name || !form.description) {
      toast.error("Preencha nome e descrição");
      return;
    }
    if (saving) return;

    setSaving(true);
    try {
      const slug = form.slug || slugify(form.name);

      if (editingId) {
        await adminSend(`/api/admin/badges/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({ ...form, slug }),
        });
        toast.success("Badge atualizado!");
      } else {
        await adminSend("/api/admin/badges", {
          method: "POST",
          body: JSON.stringify({ ...form, slug }),
        });
        toast.success("Badge criado!");
      }

      resetForm();
      await loadBadges();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(id: string) {
    try {
      await adminSend(`/api/admin/badges/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: true }),
      });
      toast.success("Badge arquivado!");
      setDeletingId(null);
      await loadBadges();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: editingId ? prev.slug : slugify(name),
    }));
  }

  if (editingId || subTab === "badges-novo") {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-condensed font-900 text-base uppercase tracking-widest" style={{ color: "var(--text)" }}>
            {editingId ? "EDITAR BADGE" : "NOVO BADGE"}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={resetForm}
              className="text-xs font-condensed font-700 uppercase tracking-widest px-4 py-2"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              {editingId ? "CANCELAR" : "LIMPAR"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div>
              <label className={lbl}>NOME</label>
              <input
                style={inp}
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={focus}
                onBlur={blur}
                placeholder="Ex: Lenda do UFC"
              />
            </div>

            <div>
              <label className={lbl}>SLUG (automático)</label>
              <input
                style={{ ...inp, color: "var(--text-muted)" }}
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: slugify(e.target.value) }))}
                onFocus={focus}
                onBlur={blur}
                placeholder="lenda_do_ufc"
              />
            </div>

            <div>
              <label className={lbl}>DESCRIÇÃO</label>
              <textarea
                style={{ ...inp, minHeight: 80, resize: "vertical" }}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                onFocus={focus}
                onBlur={blur}
                placeholder="Ex: Alcance 50 eventos participados"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>CATEGORIA</label>
                <select
                  style={sel}
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as BadgeCategory }))}
                  onFocus={focus}
                  onBlur={blur}
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={lbl}>ÍCONE</label>
                <select
                  style={sel}
                  value={form.icon_name}
                  onChange={(e) => setForm((p) => ({ ...p, icon_name: e.target.value }))}
                  onFocus={focus}
                  onBlur={blur}
                >
                  {ICON_OPTIONS.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>TIER</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  style={inp}
                  value={form.tier}
                  onChange={(e) => setForm((p) => ({ ...p, tier: Number(e.target.value) }))}
                  onFocus={focus}
                  onBlur={blur}
                />
              </div>

              <div>
                <label className={lbl}>ORDEM</label>
                <input
                  type="number"
                  min={0}
                  style={inp}
                  value={form.sort_order}
                  onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                  onFocus={focus}
                  onBlur={blur}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full font-condensed font-700 text-sm uppercase tracking-widest py-3 transition-all active:scale-[0.98]"
              style={{ backgroundColor: "var(--red)", color: "#fff", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "SALVANDO..." : editingId ? "SALVAR ALTERAÇÕES" : "CRIAR BADGE"}
            </button>
          </div>

          <div>
            <label className={lbl}>PREVIEW</label>
            <div
              className="flex flex-col items-center justify-center gap-3 p-8"
              style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            >
              <div style={{ color: "var(--red)", width: 48, height: 48 }}>
                <BadgeIcon iconName={form.icon_name} size={48} />
              </div>
              <p className="font-condensed font-900 text-sm uppercase tracking-widest text-center" style={{ color: "var(--text)" }}>
                {form.name || "NOME DO BADGE"}
              </p>
              <p className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>
                {form.description || "Descrição do badge"}
              </p>
              <div className="flex gap-2 text-[10px] font-condensed font-700 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                <span>{CATEGORY_OPTIONS.find((o) => o.value === form.category)?.label}</span>
                <span>·</span>
                <span>Tier {form.tier}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-condensed font-900 text-base uppercase tracking-widest" style={{ color: "var(--text)" }}>
          BADGES ({badges.length})
        </h3>
      </div>

      {!badges.length ? (
        <div className="p-6 text-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhum badge cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div style={{ color: "var(--red)", flexShrink: 0 }}>
                <BadgeIcon iconName={badge.icon_name} size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-condensed font-700 text-sm uppercase tracking-widest truncate" style={{ color: "var(--text)" }}>
                  {badge.name}
                </p>
                <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                  <span>{badge.slug}</span>
                  <span className="mx-1">·</span>
                  <span style={{ color: "var(--text-secondary)" }}>{badge.description}</span>
                  {badge.archived && (
                    <span className="ml-2" style={{ color: "var(--red)" }}>[ARQUIVADO]</span>
                  )}
                </p>
                {badge.criteria_description && (
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    Critério: {badge.criteria_description}
                  </p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => editBadge(badge)}
                  className="text-[10px] font-condensed font-700 uppercase tracking-widest px-3 py-1.5 transition-all"
                  style={{ color: "var(--text)", border: "1px solid var(--border)" }}
                >
                  EDITAR
                </button>
                {deletingId === badge.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleArchive(badge.id)}
                      className="text-[10px] font-condensed font-700 uppercase tracking-widest px-3 py-1.5 transition-all"
                      style={{ color: "#fff", backgroundColor: "var(--red)" }}
                    >
                      CONFIRMAR
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="text-[10px] font-condensed font-700 uppercase tracking-widest px-3 py-1.5 transition-all"
                      style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
                    >
                      CANCELAR
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeletingId(badge.id)}
                    className="text-[10px] font-condensed font-700 uppercase tracking-widest px-3 py-1.5 transition-all"
                    style={{ color: "var(--red)", border: "1px solid var(--red)" }}
                  >
                    ARQUIVAR
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
