/* ==========================================================================
   ThreatGauge — a circular 0..100 threat-score gauge drawn with pure SVG.
   Color shifts blue -> amber -> red as the score rises.
   No charting library required.
   ========================================================================== */

import type { RiskCategory } from "@/lib/types";

interface ThreatGaugeProps {
  score: number; // 0..100
  category: RiskCategory;
  size?: number;
}

/** Pick the stroke color for a given score. */
function scoreColor(score: number): string {
  if (score >= 80) return "hsl(0 84% 60%)"; // critical / red
  if (score >= 55) return "hsl(0 72% 55%)"; // high risk / red
  if (score >= 30) return "hsl(38 95% 56%)"; // suspicious / amber
  return "hsl(199 89% 55%)"; // low / blue
}

export function ThreatGauge({ score, category, size = 200 }: ThreatGaugeProps) {
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // We draw a 270-degree arc (three-quarter circle) for a gauge look.
  const arc = 0.75;
  const dash = circumference * arc;
  const progress = dash * (score / 100);
  const color = scoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-[225deg]">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(217 33% 18%)"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          style={{
            transition: "stroke-dasharray 1s ease-out",
            filter: `drop-shadow(0 0 8px ${color})`,
          }}
        />
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-extrabold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          / 100
        </span>
        <span className="mt-1 text-sm font-semibold" style={{ color }}>
          {category}
        </span>
      </div>
    </div>
  );
}
