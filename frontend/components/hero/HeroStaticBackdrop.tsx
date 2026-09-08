/**
 * Static stand-in for the 3D terrain canvas — used whenever WebGL isn't available
 * (caught by HeroCanvasBoundary) or the visitor has `prefers-reduced-motion` set.
 * No external image asset: a layered SVG "mountain range at night" silhouette,
 * so there's no network fetch and it themes exactly with the design tokens.
 */
export function HeroStaticBackdrop({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMax slice"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="hsb-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#05070e" />
            <stop offset="55%" stopColor="#070c16" />
            <stop offset="100%" stopColor="#0a1220" />
          </linearGradient>
          <linearGradient id="hsb-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#101c2e" />
            <stop offset="100%" stopColor="#0a1220" />
          </linearGradient>
          <linearGradient id="hsb-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b1524" />
            <stop offset="100%" stopColor="#060a14" />
          </linearGradient>
          <linearGradient id="hsb-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#050810" />
            <stop offset="100%" stopColor="#03050a" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="100" fill="url(#hsb-sky)" />

        {/* Faint stars */}
        {STAR_POSITIONS.map(([sx, sy, r, o], i) => (
          <circle key={i} cx={sx} cy={sy} r={r} fill="#dceefc" opacity={o} />
        ))}

        {/* Far ridge — snow-tipped */}
        <polygon
          points="0,52 8,44 16,49 24,36 33,46 41,32 50,45 58,38 67,47 76,35 85,44 93,40 100,48 100,100 0,100"
          fill="url(#hsb-far)"
        />
        <polygon
          points="24,36 26,38.5 22,38.5"
          fill="#e6f1fb"
          opacity="0.55"
        />
        <polygon
          points="41,32 43.5,35 38.5,35"
          fill="#e6f1fb"
          opacity="0.5"
        />
        <polygon
          points="76,35 78.5,38 73.5,38"
          fill="#e6f1fb"
          opacity="0.45"
        />

        {/* Mid ridge */}
        <polygon
          points="0,66 10,56 20,62 30,50 42,60 52,48 63,58 74,50 84,60 93,52 100,58 100,100 0,100"
          fill="url(#hsb-mid)"
        />

        {/* Near ridge, darkest */}
        <polygon
          points="0,80 12,70 22,76 34,64 46,74 58,62 70,73 82,66 92,75 100,70 100,100 0,100"
          fill="url(#hsb-near)"
        />

        {/* Ground haze */}
        <rect x="0" y="86" width="100" height="14" fill="#03050a" opacity="0.85" />
      </svg>

      {/* Soft cyan ambient glow, echoing the wireframe map layered on top */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 72% 55%, rgba(34,211,238,0.10), transparent 70%)",
        }}
      />
    </div>
  );
}

// Fixed (not random) so server- and client-rendered markup match exactly.
const STAR_POSITIONS: [number, number, number, number][] = [
  [8, 10, 0.25, 0.8],
  [15, 22, 0.18, 0.6],
  [27, 8, 0.22, 0.7],
  [38, 18, 0.15, 0.5],
  [48, 6, 0.2, 0.75],
  [58, 15, 0.16, 0.55],
  [67, 9, 0.24, 0.8],
  [77, 20, 0.17, 0.6],
  [88, 7, 0.2, 0.7],
  [95, 17, 0.15, 0.5],
  [4, 30, 0.14, 0.45],
  [33, 27, 0.13, 0.4],
  [62, 26, 0.15, 0.5],
  [91, 28, 0.13, 0.4],
];
