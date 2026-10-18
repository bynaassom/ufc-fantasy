import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureShareImage, SHARE_IMAGE_PLACEHOLDER } from "@/lib/share-image";

const image = vi.hoisted(() => ({ getFontEmbedCSS: vi.fn(), toBlob: vi.fn() }));
vi.mock("html-to-image", () => image);

const node = { offsetWidth: 540, offsetHeight: 1100 } as HTMLElement;
beforeEach(() => {
  image.getFontEmbedCSS
    .mockReset()
    .mockResolvedValue("@font-face { font-family: Test; }");
  image.toBlob
    .mockReset()
    .mockResolvedValue(new Blob(["png"], { type: "image/png" }));
  vi.stubGlobal("document", { fonts: { ready: Promise.resolve() } });
  vi.stubGlobal("window", { setTimeout: vi.fn() });
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => callback());
  vi.stubGlobal("getComputedStyle", () => ({
    backgroundColor: "rgb(16, 16, 16)",
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("share image export", () => {
  it("exports at the card's full size and provides a valid fallback for unavailable images", async () => {
    const blob = await captureShareImage(node);
    expect(blob.type).toBe("image/png");
    expect(image.toBlob).toHaveBeenCalledWith(
      node,
      expect.objectContaining({
        width: 540,
        height: 1100,
        pixelRatio: 2,
        imagePlaceholder: SHARE_IMAGE_PLACEHOLDER,
        cacheBust: false,
        includeQueryParams: true,
      }),
    );
    expect(SHARE_IMAGE_PLACEHOLDER).toMatch(/^data:image\//);
  });

  it("still generates the result when a webfont cannot be embedded", async () => {
    image.getFontEmbedCSS.mockRejectedValue(new Error("Blocked font"));
    await expect(captureShareImage(node)).resolves.toBeInstanceOf(Blob);
    expect(image.toBlob).toHaveBeenCalledWith(
      node,
      expect.objectContaining({ skipFonts: true, fontEmbedCSS: "" }),
    );
  });

  it("rejects an empty export so the UI can offer a retry", async () => {
    image.toBlob.mockResolvedValue(new Blob([]));
    await expect(captureShareImage(node)).rejects.toThrow("vazia");
  });

  it("propagates a renderer failure instead of handing the user a broken file", async () => {
    image.toBlob.mockRejectedValue(new Error("Canvas failed"));
    await expect(captureShareImage(node)).rejects.toThrow("Canvas failed");
  });
});
