"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function HorizontalEventRail({ children, label }: { children: React.ReactNode; label: string }) {
  const railRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [position, setPosition] = useState({ start: true, end: false });
  const update = useCallback(() => {
    const element = railRef.current;
    if (!element) return;
    const nextPosition = {
      start: element.scrollLeft <= 2,
      end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
    };
    setPosition((current) =>
      current.start === nextPosition.start && current.end === nextPosition.end
        ? current
        : nextPosition,
    );
  }, []);
  const scheduleUpdate = useCallback(() => {
    if (animationFrameRef.current !== null) return;
    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      update();
    });
  }, [update]);
  useEffect(() => {
    const element = railRef.current;
    if (!element) return;
    scheduleUpdate();
    element.addEventListener("scroll", scheduleUpdate, { passive: true });
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(element);
    return () => {
      element.removeEventListener("scroll", scheduleUpdate);
      resizeObserver.disconnect();
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [scheduleUpdate]);
  const scroll = (direction: number) => {
    const element = railRef.current;
    if (!element) return;
    const firstCard = element.firstElementChild as HTMLElement | null;
    const gap = Number.parseFloat(getComputedStyle(element).columnGap || getComputedStyle(element).gap) || 12;
    const cardWidth = firstCard?.getBoundingClientRect().width || element.clientWidth;
    element.scrollBy({ left: direction * (cardWidth + gap), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return <div className="relative">
    <div ref={railRef} className="event-rail" aria-label={label}>{children}</div>
    <button type="button" disabled={position.start} onClick={() => scroll(-1)} aria-label={`Anterior: ${label}`} className="event-rail-arrow event-rail-arrow-left">←</button>
    <button type="button" disabled={position.end} onClick={() => scroll(1)} aria-label={`Próximo: ${label}`} className="event-rail-arrow event-rail-arrow-right">→</button>
  </div>;
}
