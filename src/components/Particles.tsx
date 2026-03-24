import { useEffect, useRef, useState } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  colorIndex: number; // 0 = primary, 1 = secondary
}

// Parse CSS HSL var from root (e.g. "84 81% 44%")
const getPrimaryHSL = (): [number, number, number] => {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    const parts = v.split(/\s+/);
    if (parts.length >= 3) {
      return [
        parseFloat(parts[0]),
        parseFloat(parts[1]),
        parseFloat(parts[2]),
      ];
    }
  } catch { /* ignore */ }
  return [84, 81, 44];
};

const getSecondaryHSL = (): [number, number, number] => {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--secondary").trim();
    const parts = v.split(/\s+/);
    if (parts.length >= 3) {
      return [
        parseFloat(parts[0]),
        parseFloat(parts[1]),
        parseFloat(parts[2]),
      ];
    }
  } catch { /* ignore */ }
  return [142, 71, 45];
};

const Particles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Track theme changes via data-theme-id attribute
  const [themeId, setThemeId] = useState(() =>
    document.documentElement.getAttribute("data-theme-id") || "lime"
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeId(document.documentElement.getAttribute("data-theme-id") || "lime");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme-id"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: Particle[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Створюємо частинки
    for (let i = 0; i < 55; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2.5 + 0.5,
        speedY: -(Math.random() * 0.6 + 0.2),
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.6 + 0.1,
        colorIndex: Math.random() > 0.5 ? 0 : 1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Read current theme colors each frame (reactive)
      const [ph, ps, pl] = getPrimaryHSL();
      const [sh, ss, sl] = getSecondaryHSL();

      particles.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.opacity -= 0.0008;

        if (p.y < -10 || p.opacity <= 0) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + 10;
          p.opacity = Math.random() * 0.5 + 0.15;
          p.size = Math.random() * 2.5 + 0.5;
          p.speedY = -(Math.random() * 0.6 + 0.2);
          p.speedX = (Math.random() - 0.5) * 0.3;
          p.colorIndex = Math.random() > 0.5 ? 0 : 1;
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;

        const [h, s, l] = p.colorIndex === 0 ? [ph, ps, pl] : [sh, ss, sl];
        ctx.shadowBlur = p.size * 6;
        ctx.shadowColor = `hsl(${h}, ${s}%, ${l}%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${h}, ${s}%, ${Math.min(l + 20, 90)}%)`;
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  // Re-run when theme changes so colors update immediately
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
};

export default Particles;
