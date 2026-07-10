"use client";

import { useEffect } from "react";

export function LandingScrollEffects() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    if (prefersReducedMotion.matches) return;

    const revealTargets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-scroll-reveal]"),
    );
    const floatTargets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-scroll-float]"),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.12,
      },
    );

    revealTargets.forEach((target) => observer.observe(target));

    let frameId = 0;

    function updateFloat() {
      frameId = 0;
      const viewportHeight = window.innerHeight || 1;

      floatTargets.forEach((target) => {
        const rect = target.getBoundingClientRect();
        const progress = (rect.top + rect.height / 2 - viewportHeight / 2) / viewportHeight;
        const clamped = Math.max(-1, Math.min(1, progress));
        target.style.setProperty("--scroll-float-y", `${clamped * -18}px`);
      });
    }

    function requestFloatUpdate() {
      if (!frameId) {
        frameId = window.requestAnimationFrame(updateFloat);
      }
    }

    updateFloat();
    window.addEventListener("scroll", requestFloatUpdate, { passive: true });
    window.addEventListener("resize", requestFloatUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", requestFloatUpdate);
      window.removeEventListener("resize", requestFloatUpdate);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return null;
}
