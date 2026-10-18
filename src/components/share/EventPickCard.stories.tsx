import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toaster } from "react-hot-toast";
import { example } from "./EventResultCard.stories";
import { EventPickShareContent } from "./EventPickSharePage";
import type { PickCardData } from "./EventPickCard";

export const pickExample: PickCardData = {
  ...example,
  event: {
    ...example.event,
    status: "live",
    banner_image_url:
      "https://ufc.com/images/styles/background_image_xl/s3/2025-08/100425-ufc-320-ankalaev-vs-pereira-2-EVENT-ART.jpg?h=d1cb525d&itok=40mg6y4N",
  },
};
const meta = {
  title: "Share/Event Picks",
  component: EventPickShareContent,
  args: {
    data: pickExample,
    shareUrl: "https://ufc-fantasy.vercel.app/share/picks/exemplo/naassom",
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
          "Dados fictícios para conferir picks e exportação com banner no Safari e Chrome.",
      },
    },
  },
} satisfies Meta<typeof EventPickShareContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const WithBanner: Story = {};
export const Incomplete: Story = {
  args: { data: { ...pickExample, picks: pickExample.picks.slice(0, 3) } },
};
export const Private: Story = {
  args: { data: { ...pickExample, status: "not_public_yet" } },
};
export const Empty: Story = { args: { data: { ...pickExample, picks: [] } } };
export const LongNames: Story = {
  args: {
    data: {
      ...pickExample,
      profile: { nickname: "CampeãoDosPalpitesDoOctógono" },
    },
  },
};
export const UnavailableBanner: Story = {
  args: {
    data: {
      ...pickExample,
      event: {
        ...pickExample.event,
        banner_image_url: "/unavailable-banner.jpg",
      },
    },
  },
};
