import { useEffect, useState } from "react";

/** Subtle accent glow that trails the cursor. Desktop only, pointer-events off. */
export function CursorGlow() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    let frame = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setPos({ x: e.clientX, y: e.clientY }));
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  if (!pos) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-40 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07] blur-3xl"
      style={{
        left: pos.x,
        top: pos.y,
        background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
      }}
    />
  );
}
