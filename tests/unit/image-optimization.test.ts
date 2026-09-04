import { describe, expect, it } from "vitest";
import { shouldOptimizeRemoteImage } from "@/lib/image-optimization";

describe("shouldOptimizeRemoteImage", () => {
  it.each([
    "https://ufc.com/images/event.jpg",
    "https://www.ufc.com/images/styles/banner/event.jpg?itok=abc",
    "https://ufc.com.br/images/event.jpg",
    "https://www.ufc.com.br/images/event.jpg",
  ])("accepts a current UFC image URL: %s", (url) => {
    expect(shouldOptimizeRemoteImage(url)).toBe(true);
  });

  it.each([
    "http://ufc.com/images/event.jpg",
    "https://ufc.com:444/images/event.jpg",
    "https://ufc.com/assets/event.jpg",
    "https://dmxg5wxfqgb4u.cloudfront.net/images/event.jpg",
    "https://example.com/images/event.jpg",
    "/images/event.jpg",
    "not-a-url",
  ])("keeps an untrusted or legacy image URL direct: %s", (url) => {
    expect(shouldOptimizeRemoteImage(url)).toBe(false);
  });
});
