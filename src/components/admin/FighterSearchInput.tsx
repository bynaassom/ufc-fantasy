"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface FighterData {
  name: string;
  headshot_url: string;
  country: string;
  candidates?: string[];
  ufc_url?: string;
  source?: string;
}

interface Props {
  label: string; // "Lutador A" / "Lutador B"
  value: FighterData;
  onChange: (data: FighterData) => void;
}

// ─────────────────────────────────────────────────────────────
// Verifica se uma URL de imagem carrega (testa no browser)
// ─────────────────────────────────────────────────────────────
function probeImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

export default function FighterSearchInput({ label, value, onChange }: Props) {
  const [query, setQuery] = useState(value.name || "");
  const [loading, setLoading] = useState(false);
  const [probing, setProbing] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "found" | "notfound" | "manual"
  >("idle");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Quando nome muda, dispara busca com debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setStatus("idle");
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchFighter(query.trim());
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function searchFighter(name: string) {
    setLoading(true);
    setStatus("idle");
    try {
      const res = await fetch(
        `/api/fighter-search?name=${encodeURIComponent(name)}`,
      );
      const data = await res.json();

      if (data.headshot_url) {
        // Encontrado server-side
        onChange({
          name,
          headshot_url: data.headshot_url,
          country: data.country || "",
        });
        setStatus("found");
      } else if (data.candidates?.length) {
        // Fallback: testa candidatos no browser
        setProbing(true);
        const found = await probeFirstWorking(data.candidates);
        setProbing(false);
        if (found) {
          onChange({
            name,
            headshot_url: found,
            country: data.country || "",
            ufc_url: data.ufc_url,
          });
          setStatus("found");
        } else {
          onChange({
            name,
            headshot_url: "",
            country: data.country || "",
            ufc_url: data.ufc_url,
          });
          setStatus("notfound");
        }
      } else {
        setStatus("notfound");
      }
    } catch {
      setStatus("notfound");
    } finally {
      setLoading(false);
    }
  }

  async function probeFirstWorking(urls: string[]): Promise<string | null> {
    // Testa em paralelo em grupos de 5
    for (let i = 0; i < urls.length; i += 5) {
      const batch = urls.slice(i, i + 5);
      const results = await Promise.all(
        batch.map(async (url) => ({
          url,
          ok: await probeImage(url),
        })),
      );
      const working = results.find((r) => r.ok);
      if (working) return working.url;
    }
    return null;
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    transition: "border-color 0.15s",
  };

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        backgroundColor: "var(--bg-card)",
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2"
        style={{
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--bg-elevated)",
        }}
      >
        <span
          className="font-condensed font-700 text-xs uppercase tracking-widest"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </span>
      </div>

      <div className="p-3 space-y-3">
        {/* Nome */}
        <div>
          <label
            className="block text-xs font-condensed font-700 uppercase tracking-widest mb-1.5"
            style={{ color: "var(--text-muted)" }}
          >
            Nome completo
          </label>
          <div className="relative">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onChange({ ...value, name: e.target.value });
              }}
              placeholder="Ex: Charles Oliveira"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            {/* Status indicator */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {(loading || probing) && (
                <div
                  className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{
                    borderColor: "var(--red)",
                    borderTopColor: "transparent",
                  }}
                />
              )}
              {!loading && !probing && status === "found" && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  style={{ color: "#22c55e" }}
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
              {!loading && !probing && status === "notfound" && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ color: "var(--text-muted)" }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              )}
            </div>
          </div>

          {/* Feedback */}
          {status === "found" && (
            <p
              className="text-xs mt-1 font-condensed font-700 uppercase tracking-widest"
              style={{ color: "#22c55e" }}
            >
              Headshot encontrado automaticamente
            </p>
          )}
          {status === "notfound" && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Headshot não encontrado — cole uma URL manualmente abaixo
            </p>
          )}
          {probing && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Verificando fotos disponíveis…
            </p>
          )}
        </div>

        {/* Headshot preview + URL manual */}
        <div className="flex gap-3 items-start">
          {/* Preview */}
          <div
            className="flex-shrink-0 w-16 h-16 overflow-hidden rounded-full"
            style={{
              border: "2px solid var(--border)",
              backgroundColor: "var(--bg-elevated)",
            }}
          >
            {value.headshot_url ? (
              <img
                src={value.headshot_url}
                alt={value.name}
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
          </div>

          {/* URL manual */}
          <div className="flex-1">
            <label
              className="block text-xs font-condensed font-700 uppercase tracking-widest mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              URL da foto {status === "found" ? "(automática)" : "(manual)"}
            </label>
            <input
              value={value.headshot_url}
              onChange={(e) => {
                onChange({ ...value, headshot_url: e.target.value });
                setStatus("manual");
              }}
              placeholder="https://..."
              style={{ ...inputStyle, fontSize: "11px", padding: "8px 10px" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
        </div>

        {/* País */}
        <div>
          <label
            className="block text-xs font-condensed font-700 uppercase tracking-widest mb-1.5"
            style={{ color: "var(--text-muted)" }}
          >
            País
          </label>
          <input
            value={value.country}
            onChange={(e) => onChange({ ...value, country: e.target.value })}
            placeholder="Ex: Brasil"
            style={{ ...inputStyle, padding: "8px 12px" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>
      </div>
    </div>
  );
}
