import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureShareImage, SHARE_IMAGE_PLACEHOLDER } from "@/lib/share-image";

const image = vi.hoisted(() => ({
  getFontEmbedCSS: vi.fn(),
  toBlob: vi.fn(),
  toCanvas: vi.fn(),
}));
vi.mock("html-to-image", () => image);

const node = {
  offsetWidth: 540,
  offsetHeight: 1100,
  querySelectorAll: () => [],
} as unknown as HTMLElement;
beforeEach(() => {
  image.toCanvas.mockReset();
  image.getFontEmbedCSS
    .mockReset()
    .mockResolvedValue("@font-face { font-family: Test; }");
  image.toBlob
    .mockReset()
    .mockResolvedValue(new Blob(["png"], { type: "image/png" }));
  vi.stubGlobal("document", { fonts: { ready: Promise.resolve() } });
  vi.stubGlobal("window", { setTimeout: vi.fn(), clearTimeout: vi.fn() });
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => callback());
  vi.stubGlobal("getComputedStyle", () => ({
    backgroundColor: "rgb(16, 16, 16)",
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("share image export", () => {
  function rasterCard(position = "50% 25%") {
    const photo = {
      naturalWidth: 1080,
      naturalHeight: 720,
      decode: vi.fn().mockResolvedValue(undefined),
      src: "",
      crossOrigin: "",
    };
    vi.stubGlobal(
      "Image",
      class {
        constructor() {
          return photo;
        }
      },
    );
    const raster = {
      src: "/banner.jpg",
      currentSrc: "/banner.jpg",
      decode: vi.fn().mockResolvedValue(undefined),
      getBoundingClientRect: () => ({
        left: 10,
        top: 120,
        width: 270,
        height: 152,
      }),
    };
    const card = {
      ...node,
      querySelectorAll: () => [raster],
      getBoundingClientRect: () => ({
        left: 10,
        top: 20,
        width: 270,
        height: 550,
      }),
    } as unknown as HTMLElement;
    vi.stubGlobal("getComputedStyle", (element: unknown) =>
      element === raster
        ? { objectPosition: position }
        : { backgroundColor: "rgb(16, 16, 16)" },
    );
    const context = {
      save: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
      restore: vi.fn(),
    };
    const canvas = {
      width: 1080,
      height: 2200,
      getContext: () => context,
      toBlob: vi.fn((callback: BlobCallback) =>
        callback(new Blob(["png"], { type: "image/png" })),
      ),
    };
    image.toCanvas.mockResolvedValue(canvas);
    return { card, raster, photo, context, canvas };
  }

  it("composites the banner outside foreignObject, preserving crop and preview scale", async () => {
    const { card, raster, photo, context } = rasterCard();
    await expect(captureShareImage(card)).resolves.toBeInstanceOf(Blob);
    const options = image.toCanvas.mock.calls[0][1];
    expect(options.filter(raster)).toBe(false);
    expect(options.filter(card)).toBe(true);
    expect(photo.crossOrigin).toBe("anonymous");
    expect(context.rect).toHaveBeenCalledWith(0, 400, 1080, 608);
    expect(context.drawImage).toHaveBeenCalledWith(photo, 0, 372, 1080, 720);
    expect(image.toBlob).not.toHaveBeenCalled();
  });

  it("keeps the card export available when an external banner blocks CORS", async () => {
    const { card, photo, context } = rasterCard();
    photo.decode.mockRejectedValue(new Error("Banner blocked"));
    await expect(captureShareImage(card)).resolves.toBeInstanceOf(Blob);
    expect(context.drawImage).not.toHaveBeenCalled();
  });

  it("does not leave the export waiting forever on a stalled banner", async () => {
    const { card, photo, context } = rasterCard();
    photo.decode.mockReturnValue(new Promise(() => {}));
    const capture = captureShareImage(card);
    await vi.waitFor(() => expect(photo.decode).toHaveBeenCalled());
    const timeout = vi
      .mocked(window.setTimeout)
      .mock.calls.at(-1)![0] as () => void;
    timeout();
    await expect(capture).resolves.toBeInstanceOf(Blob);
    expect(context.drawImage).not.toHaveBeenCalled();
  });

  it("rejects an empty canvas export after compositing", async () => {
    const { card, canvas } = rasterCard();
    canvas.toBlob.mockImplementation((callback: BlobCallback) =>
      callback(null),
    );
    await expect(captureShareImage(card)).rejects.toThrow("vazia");
  });

  it("waits for the banner to decode before exporting the card", async () => {
    let loaded!: () => void;
    const ready = new Promise<void>((resolve) => {
      loaded = resolve;
    });
    const decode = vi.fn(() => ready);
    const card = {
      ...node,
      querySelectorAll: (selector: string) =>
        selector === "img" ? [{ decode }] : [],
    } as unknown as HTMLElement;
    const capture = captureShareImage(card);
    await vi.waitFor(() => expect(decode).toHaveBeenCalled());
    expect(image.toBlob).not.toHaveBeenCalled();
    loaded();
    await expect(capture).resolves.toBeInstanceOf(Blob);
  });

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
