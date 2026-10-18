import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef } from "react";
import { Toaster } from "react-hot-toast";
import ShareActions from "./ShareActions";

function UnavailableImageExample() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="mx-auto max-w-xl space-y-6 p-4">
      <div
        ref={ref}
        style={{
          width: 300,
          padding: 24,
          background: "#141414",
          color: "#fff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/unavailable-event-banner.jpg"
          alt=""
          width="252"
          height="100"
        />
        <h1>Resultado: 24 pontos</h1>
      </div>
      <ShareActions
        cardRef={ref}
        filename="resultado-teste.png"
        shareCaption="Meu resultado: 24 pontos."
        whatsappTextUrl="https://wa.me/?text=Resultado"
      />
      <Toaster />
    </div>
  );
}

export default {
  title: "Share/Export",
  component: UnavailableImageExample,
} satisfies Meta<typeof UnavailableImageExample>;
export const UnavailableImage: StoryObj<typeof UnavailableImageExample> = {};
