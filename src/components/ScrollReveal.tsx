"use client";

import { useEffect, useRef, useState, ReactNode, CSSProperties } from "react";

export type RevealVariant = "fade-up" | "fade-down" | "fade-left" | "fade-right" | "zoom-in" | "fade";

interface ScrollRevealProps {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;       // ms
  duration?: number;    // ms
  threshold?: number;   // 0–1
  className?: string;
  style?: CSSProperties;
  as?: keyof JSX.IntrinsicElements;
}

const HIDDEN: Record<RevealVariant, CSSProperties> = {
  "fade-up":    { opacity: 0, transform: "translateY(32px)" },
  "fade-down":  { opacity: 0, transform: "translateY(-24px)" },
  "fade-left":  { opacity: 0, transform: "translateX(32px)" },
  "fade-right": { opacity: 0, transform: "translateX(-32px)" },
  "zoom-in":    { opacity: 0, transform: "scale(0.92)" },
  "fade":       { opacity: 0, transform: "none" },
};

export function ScrollReveal({
  children,
  variant = "fade-up",
  delay = 0,
  duration = 650,
  threshold = 0.12,
  className,
  style,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  const currentStyle: CSSProperties = {
    transition: `opacity ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    ...(visible ? { opacity: 1, transform: "none" } : HIDDEN[variant]),
    ...style,
  };

  return (
    <div ref={ref} className={className} style={currentStyle}>
      {children}
    </div>
  );
}
