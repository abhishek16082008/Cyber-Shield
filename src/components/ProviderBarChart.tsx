/* ==========================================================================
   ProviderBarChart — signal contribution by provider, drawn on a <canvas>.
   Horizontal layout: provider name on the left, bar extending right, value at
   the end. Horizontal bars keep long provider names readable with no overlap.
   No charting library. Redraws on data change; DPR-aware for crisp rendering.
   ========================================================================== */

import { useEffect, useRef } from "react";
import type { ProviderResult } from "@/lib/types";

interface ProviderBarChartProps {
  providers: ProviderResult[];
  height?: number;
}

export function ProviderBarChart({ providers, height }: ProviderBarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rowH = 34;
  const padTop = 8;
  const padBottom = 8;
  const chartHeight = height ?? providers.length * rowH + padTop + padBottom;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Crisp rendering on high-DPI screens.
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;
    canvas.width = cssWidth * dpr;
    canvas.height = chartHeight * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssWidth, chartHeight);

    // Theme colors from CSS variables (keeps chart on-brand).
    const style = getComputedStyle(document.documentElement);
    const secure = `hsl(${style.getPropertyValue("--secure")})`;
    const warn = `hsl(${style.getPropertyValue("--warn")})`;
    const threat = `hsl(${style.getPropertyValue("--threat")})`;
    const fg = `hsl(${style.getPropertyValue("--foreground")})`;
    const muted = `hsl(${style.getPropertyValue("--muted-foreground")})`;
    const track = `hsl(${style.getPropertyValue("--secondary")})`;

    const labelW = Math.min(150, cssWidth * 0.42); // left name column
    const valueW = 34; // right value column
    const barMaxW = cssWidth - labelW - valueW - 8;
    const maxScore = 100;

    providers.forEach((p, i) => {
      const rowY = padTop + i * rowH;
      const cy = rowY + rowH / 2;
      const value = Math.max(0, Math.min(maxScore, p.score));
      const dimmed = p.status !== "ok";

      // --- Provider name (right-aligned) ---
      ctx.fillStyle = dimmed ? muted : fg;
      ctx.font = "600 12px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(p.provider, labelW - 10, cy - (dimmed ? 5 : 0), labelW - 12);

      // Status note under dimmed providers.
      if (dimmed) {
        ctx.fillStyle = warn;
        ctx.font = "500 9px Inter, sans-serif";
        ctx.fillText(
          p.status === "not_configured" ? "not configured" : p.status,
          labelW - 10,
          cy + 8,
          labelW - 12,
        );
      }

      // --- Track ---
      const barH = 10;
      const barY = cy - barH / 2;
      ctx.fillStyle = track;
      roundRect(ctx, labelW, barY, barMaxW, barH, 5);
      ctx.fill();

      // --- Value bar ---
      const w = Math.max(2, (value / maxScore) * barMaxW);
      const color = value >= 40 ? threat : value >= 20 ? warn : secure;
      ctx.globalAlpha = dimmed ? 0.35 : 1;
      ctx.fillStyle = color;
      roundRect(ctx, labelW, barY, w, barH, 5);
      ctx.fill();
      ctx.globalAlpha = 1;

      // --- Value number ---
      ctx.fillStyle = muted;
      ctx.font = "600 12px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(String(value), labelW + barMaxW + 8, cy);
    });
  }, [providers, chartHeight]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: chartHeight }}
      role="img"
      aria-label="Horizontal bar chart of signal contribution by provider"
    />
  );
}

/** Draw a rounded rectangle path (no fill/stroke — caller decides). */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
