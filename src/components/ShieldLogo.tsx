/* ==========================================================================
   ShieldLogo — the Cyber Shield brand mark.
   Pure inline SVG (no image files): a shield containing an aviation wing and
   an email envelope, with an animated scanning line sweeping across it.
   `size` controls the pixel dimensions; `animated` toggles the scan sweep.
   ========================================================================== */

interface ShieldLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export function ShieldLogo({ size = 40, animated = true, className }: ShieldLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label="Cyber Shield logo"
    >
      <defs>
        {/* Blue gradient = trusted / secure */}
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(199 89% 62%)" />
          <stop offset="100%" stopColor="hsl(199 89% 42%)" />
        </linearGradient>
        {/* Clip so the scan line stays inside the shield */}
        <clipPath id="shieldClip">
          <path d="M32 4 L56 13 V30 C56 45 46 55 32 60 C18 55 8 45 8 30 V13 Z" />
        </clipPath>
      </defs>

      {/* Shield body */}
      <path
        d="M32 4 L56 13 V30 C56 45 46 55 32 60 C18 55 8 45 8 30 V13 Z"
        fill="url(#shieldGrad)"
        opacity="0.18"
        stroke="hsl(199 89% 55%)"
        strokeWidth="2"
      />

      <g clipPath="url(#shieldClip)">
        {/* Aviation wing (angled chevrons) */}
        <g stroke="hsl(199 89% 70%)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.9">
          <path d="M18 24 L40 24" />
          <path d="M22 30 L42 30" />
          <path d="M26 36 L44 36" />
        </g>

        {/* Email envelope */}
        <g transform="translate(20 38)">
          <rect x="0" y="0" width="24" height="16" rx="2" fill="none" stroke="hsl(199 89% 80%)" strokeWidth="2" />
          <path d="M0 2 L12 10 L24 2" fill="none" stroke="hsl(199 89% 80%)" strokeWidth="2" />
        </g>

        {/* Animated scanning line */}
        {animated && (
          <rect x="0" width="64" height="3" fill="hsl(199 89% 75%)" opacity="0.9">
            <animate
              attributeName="y"
              values="6;56;6"
              dur="2.4s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;1;0"
              dur="2.4s"
              repeatCount="indefinite"
            />
          </rect>
        )}
      </g>
    </svg>
  );
}
