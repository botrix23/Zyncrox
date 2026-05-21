"use client";

import { useEffect, useRef } from "react";

export function LandingCursorGlow() {
  const blobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const blob = blobRef.current;
    if (!blob) return;

    let raf: number;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let cx = tx;
    let cy = ty;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      cx = lerp(cx, tx, 0.06);
      cy = lerp(cy, ty, 0.06);
      if (blob) {
        blob.style.left = cx + "px";
        blob.style.top = cy + "px";
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={blobRef}
      aria-hidden
      className="pointer-events-none fixed z-[1] hidden lg:block w-[700px] h-[700px] rounded-full"
      style={{
        background:
          "radial-gradient(circle, rgba(139,92,246,0.13) 0%, rgba(109,40,217,0.06) 40%, transparent 70%)",
        transform: "translate(-50%, -50%)",
        left: "50%",
        top: "50%",
        willChange: "left, top",
        filter: "blur(0px)",
      }}
    />
  );
}
