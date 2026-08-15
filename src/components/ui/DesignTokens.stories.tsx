import type { Meta, StoryObj } from "@storybook/react-vite";

const colors = [
  ["Ação / UFC", "--red"],
  ["Sucesso", "--green"],
  ["Fundo", "--bg"],
  ["Card", "--bg-card"],
  ["Elevado", "--bg-elevated"],
  ["Texto", "--text"],
  ["Texto secundário", "--text-secondary"],
  ["Borda", "--border"],
] as const;

function DesignTokens() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-10 border-l-[3px] pl-4" style={{ borderColor: "var(--red)" }}>
        <p className="font-condensed text-xs font-800 uppercase tracking-[0.24em]" style={{ color: "var(--red)" }}>
          Fundação visual
        </p>
        <h1 className="mt-1 font-condensed text-4xl font-900 uppercase tracking-tight">
          UFC Fantasy UI
        </h1>
        <p className="mt-2 max-w-xl text-sm" style={{ color: "var(--text-secondary)" }}>
          Alto contraste, geometria reta e vermelho reservado para ação, estado e hierarquia.
        </p>
      </div>

      <section aria-labelledby="palette-title">
        <h2 id="palette-title" className="mb-4 font-condensed text-sm font-900 uppercase tracking-widest">
          Paleta semântica
        </h2>
        <div className="grid grid-cols-2 gap-px border sm:grid-cols-4" style={{ backgroundColor: "var(--border)", borderColor: "var(--border)" }}>
          {colors.map(([label, token]) => (
            <div key={token} className="p-3" style={{ backgroundColor: "var(--bg-card)" }}>
              <div className="mb-3 h-16 border" style={{ backgroundColor: `var(${token})`, borderColor: "var(--border)" }} />
              <p className="font-condensed text-xs font-800 uppercase tracking-wide">{label}</p>
              <code className="text-[11px]" style={{ color: "var(--text-muted)" }}>{token}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t pt-6" style={{ borderColor: "var(--border)" }} aria-labelledby="type-title">
        <h2 id="type-title" className="mb-5 font-condensed text-sm font-900 uppercase tracking-widest">Tipografia e hierarquia</h2>
        <div className="space-y-5">
          <p className="font-condensed text-5xl font-900 uppercase leading-none">Fight night</p>
          <p className="font-condensed text-2xl font-800 uppercase tracking-wide">UFC 330 · Card principal</p>
          <p className="font-condensed text-xs font-700 uppercase tracking-[0.24em]" style={{ color: "var(--text-secondary)" }}>Rótulo de seção</p>
          <p className="max-w-2xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            Texto de apoio permanece sóbrio e legível. A tipografia condensada concentra títulos, números, navegação e estados competitivos.
          </p>
        </div>
      </section>
    </main>
  );
}

const meta = {
  title: "Foundation/Design Tokens",
  component: DesignTokens,
} satisfies Meta<typeof DesignTokens>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Foundation: Story = {};
