import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toaster } from "react-hot-toast";
import { EventResultShareContent } from "./EventResultSharePage";
import type { ResultCardData } from "./EventResultCard";

const timestamp = "2026-10-18T01:00:00Z";
const names = [
  ["Alex Pereira", "Magomed Ankalaev"],
  ["Charles Oliveira", "Mateusz Gamrot"],
  ["Jéssica Andrade", "Tatiana Suarez"],
  ["Caio Borralho", "Jared Cannonier"],
  ["Renato Moicano", "Beneil Dariush"],
  ["Amanda Ribas", "Virna Jandiroba"],
  ["Michel Pereira", "Anthony Hernandez"],
  ["Bruna Brasil", "Molly McCann"],
  ["Gabriel Bonfim", "Santiago Ponzinibbio"],
  ["Jean Silva", "Bryce Mitchell"],
  ["Diego Lopes", "Brian Ortega"],
  ["Carlos Prates", "Neil Magny"],
];
export const example: ResultCardData = {
  event: {
    id: "example",
    name: "UFC 320 · Noite de gigantes",
    slug: "evento-demonstracao",
    is_bonus: false,
    event_date: timestamp,
    picks_lock_at: timestamp,
    picks_open_at: null,
    status: "completed",
    created_at: timestamp,
    updated_at: timestamp,
    fights: names.map(([a, b], index) => ({
      id: `fight-${index}`,
      event_id: "example",
      fighter_a_id: `a-${index}`,
      fighter_b_id: `b-${index}`,
      fighter_a: {
        id: `a-${index}`,
        name: a,
        created_at: timestamp,
        updated_at: timestamp,
      },
      fighter_b: {
        id: `b-${index}`,
        name: b,
        created_at: timestamp,
        updated_at: timestamp,
      },
      card_type: index < 5 ? "main" : "preliminary",
      fight_order: index,
      weight_class: "Lightweight",
      total_rounds: 3,
      is_title_fight: false,
      winner_id: index % 3 === 2 ? `b-${index}` : `a-${index}`,
      result_confirmed: true,
      result_method: index % 2 ? "decision" : "knockout",
      result_round: 2,
    })),
  },
  profile: { nickname: "Naassom" },
  picks: names.map((_, index) => ({
    id: `pick-${index}`,
    user_id: "example",
    event_id: "example",
    fight_id: `fight-${index}`,
    picked_winner_id: `a-${index}`,
    picked_method: index % 2 ? "decision" : "knockout",
    picked_round: 2,
    is_confirmed: true,
    points_winner: index % 3 === 2 ? 0 : 1,
    points_method: index % 3 === 2 ? 0 : 1,
    points_round: index % 3 === 2 ? 0 : 1,
    total_points: index % 3 === 2 ? 0 : 3,
    created_at: timestamp,
    updated_at: timestamp,
  })),
  score: { total_points: 24, perfect_picks: 8 },
  rank: 3,
  status: "public",
};
const meta = {
  title: "Share/Event Result",
  component: EventResultShareContent,
  args: {
    data: example,
    shareUrl: "https://ufc-fantasy.vercel.app/share/event/exemplo/naassom",
  },
  decorators: [
    (Story) => (
      <>
        <Story />
        <Toaster />
      </>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Dados fictícios para verificar o card e o download da imagem.",
      },
    },
  },
} satisfies Meta<typeof EventResultShareContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Completed: Story = {};
export const UnavailableBanner: Story = {
  args: {
    data: {
      ...example,
      event: {
        ...example.event,
        banner_image_url: "/unavailable-event-banner.jpg",
      },
    },
  },
};
export const LongNames: Story = {
  args: {
    data: {
      ...example,
      profile: { nickname: "CampeãoDosPalpitesDoOctógono" },
      event: {
        ...example.event,
        name: "UFC Fight Night: Um nome de evento muito longo para conferir o card",
        fights: [
          ...example.event.fights,
          ...example.event.fights
            .slice(0, 4)
            .map((fight, i) => ({
              ...fight,
              id: `extra-${i}`,
              fight_order: 20 + i,
            })),
        ],
      },
    },
  },
};
export const Private: Story = {
  args: {
    data: {
      ...example,
      status: "not_public_yet",
      picks: [],
      score: null,
      rank: null,
    },
  },
};
