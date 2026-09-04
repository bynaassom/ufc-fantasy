import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FightWithFighters } from "@/types";
import FightCard from "./FightCard";

function portraitData(accent: string, label: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 360">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#252525"/>
          <stop offset="1" stop-color="#080808"/>
        </linearGradient>
      </defs>
      <rect width="320" height="360" fill="url(#bg)"/>
      <circle cx="160" cy="98" r="60" fill="#c7c7c7"/>
      <path d="M62 360c8-112 45-174 98-174s90 62 98 174" fill="#b8b8b8"/>
      <path d="M34 360h252l-30-78H64z" fill="${accent}" opacity=".38"/>
      <text x="160" y="334" text-anchor="middle" fill="white" font-family="Arial" font-size="18" font-weight="700" letter-spacing="2">${label}</text>
    </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const timestamp = "2026-09-04T00:00:00.000Z";

const titleFight: FightWithFighters = {
  id: "preview-main-event",
  event_id: "preview-event",
  fighter_a_id: "fighter-red",
  fighter_b_id: "fighter-blue",
  card_type: "main",
  fight_order: 1,
  weight_class: "Lightweight",
  is_title_fight: true,
  total_rounds: 5,
  result_confirmed: false,
  odds_a: "-135",
  odds_b: "+115",
  fighter_a: {
    id: "fighter-red",
    name: "Rafael Almeida",
    country: "Brasil",
    headshot_url: portraitData("#e8001a", "ALMEIDA"),
    created_at: timestamp,
    updated_at: timestamp,
  },
  fighter_b: {
    id: "fighter-blue",
    name: "Marcus Stone",
    country: "Estados Unidos",
    headshot_url: portraitData("#2878ff", "STONE"),
    created_at: timestamp,
    updated_at: timestamp,
  },
};

const meta = {
  title: "Event/Fight Card",
  component: FightCard,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Card interativo de picks com linguagem de transmissão, corners vermelho e azul e alvos de toque de 44px.",
      },
    },
  },
  decorators: [
    (Story) => (
      <main className="mx-auto min-h-screen max-w-[760px] bg-[var(--bg)] px-4 py-8 sm:px-6">
        <div className="mb-4 border-b border-[var(--border)] pb-3">
          <p className="font-condensed text-[11px] font-900 uppercase tracking-[0.2em] text-[var(--red)]">
            Visual QA
          </p>
          <h1 className="font-condensed text-3xl font-900 uppercase text-[var(--text)]">
            Card principal
          </h1>
        </div>
        <Story />
      </main>
    ),
  ],
  args: {
    fight: titleFight,
    locked: false,
    showAlertControl: false,
  },
} satisfies Meta<typeof FightCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MainEvent: Story = {};

export const Locked: Story = {
  args: {
    locked: true,
    unavailablePicksLabel: "Picks encerrados",
  },
};
