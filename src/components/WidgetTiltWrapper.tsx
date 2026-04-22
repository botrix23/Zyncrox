"use client";

import { useEffect, useRef } from "react";

interface WidgetTiltWrapperProps {
  children: React.ReactNode;
}

export function WidgetTiltWrapper({ children }: WidgetTiltWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const cur = useRef({ rx: 0, ry: 0 });
  const target = useRef({ rx: 0, ry: 0 });
  const isHovering = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const tilt = tiltRef.current;
    if (!container || !tilt) return;

    function onMove(e: MouseEvent) {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      target.current = { rx: -dy * 8, ry: dx * 10 };
      isHovering.current = true;
    }

    function onLeave() {
      target.current = { rx: 0, ry: 0 };
      isHovering.current = false;
    }

    function lerp(a: number, b: number, t: number) {
      return a + (b - a) * t;
    }

    function tick() {
      cur.current.rx = lerp(cur.current.rx, target.current.rx, 0.08);
      cur.current.ry = lerp(cur.current.ry, target.current.ry, 0.08);
      if (tilt) {
        if (isHovering.current || Math.abs(cur.current.rx) > 0.01 || Math.abs(cur.current.ry) > 0.01) {
          tilt.style.transform = `rotateX(${cur.current.rx}deg) rotateY(${cur.current.ry}deg)`;
          tilt.style.animation = 'none';
        } else {
          tilt.style.transform = '';
          tilt.style.animation = '';
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', onLeave);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      container.removeEventListener('mousemove', onMove);
      container.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center"
      style={{ perspective: '1200px' }}
    >
      {/* Glow */}
      <div
        className="absolute w-[560px] h-[560px] rounded-full pointer-events-none z-0 animate-glow-pulse"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%)' }}
      />

      {/* Tilt container */}
      <div
        ref={tiltRef}
        className="relative z-10 w-full animate-widget-float"
        style={{ transformStyle: 'preserve-3d', maxWidth: 610 }}
      >
        {children}
      </div>
    </div>
  );
}
