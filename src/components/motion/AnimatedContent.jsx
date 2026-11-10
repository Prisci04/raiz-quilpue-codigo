"use client";

import { useEffect, useRef } from "react";

// Lightweight adaptation of React Bits' Animated Content scroll reveal.
// https://reactbits.dev/animations/animated-content
// Native animation/observer replace GSAP for this single, restrained effect.
export default function AnimatedContent({ as: Tag = "div", children, className = "", delay = 0, distance = 12, duration = 420, ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element || !window.IntersectionObserver || !element.animate) return;
    let animation;
    let revealed = false;
    const finish = () => {
      revealed = true;
      animation?.cancel();
      observer.disconnect();
    };
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || revealed) return;
      revealed = true;
      observer.disconnect();
      if (preference.matches || element.contains(document.activeElement)) return;
      animation = element.animate(
        [{ opacity: 0.35, transform: `translateY(${distance}px)` }, { opacity: 1, transform: "none" }],
        { duration, delay, fill: "backwards", easing: "cubic-bezier(0.2, 0.65, 0.3, 1)" },
      );
    }, { threshold: 0.08 });
    // Content remains visible in SSR, without JS, and when reduced motion is set.
    if (!preference.matches) observer.observe(element);
    element.addEventListener("focusin", finish);
    preference.addEventListener("change", finish);
    return () => {
      observer.disconnect();
      animation?.cancel();
      element.removeEventListener("focusin", finish);
      preference.removeEventListener("change", finish);
    };
  }, [delay, distance, duration]);

  return <Tag ref={ref} className={className} data-animated-content="" {...props}>{children}</Tag>;
}
