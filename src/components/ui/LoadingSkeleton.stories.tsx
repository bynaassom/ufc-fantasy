import type { Meta, StoryObj } from "@storybook/react-vite";
import { PageSkeleton } from "./LoadingSkeleton";

const meta = {
  title: "Feedback/Loading Skeleton",
  component: PageSkeleton,
  parameters: {
    docs: {
      description: {
        component:
          "Estados de carregamento estruturais do UFC Fantasy. Cada preset preserva a hierarquia da tela final para reduzir mudanças de layout.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "landing",
        "home",
        "event",
        "ranking",
        "profile",
        "recap",
        "challenge",
        "league",
        "admin",
        "list",
      ],
    },
  },
  args: {
    variant: "home",
    lines: 5,
  },
} satisfies Meta<typeof PageSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Home: Story = { args: { variant: "home" } };
export const Evento: Story = { args: { variant: "event" } };
export const Ranking: Story = { args: { variant: "ranking" } };
export const Perfil: Story = { args: { variant: "profile" } };
export const Recap: Story = { args: { variant: "recap" } };
export const Desafio: Story = { args: { variant: "challenge" } };
export const Admin: Story = { args: { variant: "admin" } };
export const Landing: Story = { args: { variant: "landing" } };
