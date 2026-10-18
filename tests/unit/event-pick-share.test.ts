import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { example } from "@/components/share/EventResultCard.stories";
import EventPickCard from "@/components/share/EventPickCard";
import { EventPickShareContent } from "@/components/share/EventPickSharePage";

const shareUrl = "https://ufc-fantasy.vercel.app/share/picks/exemplo/naassom";

describe("event pick sharing", () => {
  it("shows chosen fighters, method and round without leaking official results into the picks card", () => {
    const html = renderToStaticMarkup(
      createElement(EventPickCard, {
        data: example,
        siteHost: "ufc-fantasy.vercel.app",
      }),
    );
    expect(html).toContain("Jéssica Andrade");
    expect(html).toContain("vs. Tatiana Suarez");
    expect(html).toContain("KO/TKO · R2");
    expect(html).not.toContain("Venceu:");
    expect(html).not.toContain("Acertou o vencedor");
    expect(html).not.toContain("pontos");
    expect(html).not.toContain("cravadas");
  });
  it("hides picks and sharing controls when the status is private even if the component is given picks", () => {
    const html = renderToStaticMarkup(
      createElement(EventPickShareContent, {
        data: { ...example, status: "not_public_yet" },
        shareUrl,
      }),
    );
    expect(html).toContain("Palpites privados");
    expect(html).not.toContain("Alex Pereira");
    expect(html).not.toContain("Baixar imagem");
    expect(html).not.toContain("Legenda pronta");
  });
  it("uses the same complete caption for the textarea and WhatsApp link", () => {
    const html = renderToStaticMarkup(
      createElement(EventPickShareContent, { data: example, shareUrl }),
    );
    expect(html).toContain("12 palpites para 12 lutas");
    expect(html).toContain("Concorda com meu card?");
    expect(html).toContain(encodeURIComponent(shareUrl));
    expect(html).toContain(shareUrl);
  });
  it("labels unfilled fights instead of truncating the card or inventing a pick", () => {
    const html = renderToStaticMarkup(
      createElement(EventPickCard, {
        data: { ...example, picks: [] },
        siteHost: "ufc-fantasy.vercel.app",
      }),
    );
    expect(html.match(/Sem palpite/g)).toHaveLength(12);
  });
});
