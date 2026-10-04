"use client";

const R = 56;
const CX = 100;
const CY = 82;

function meridian(phase: number) {
  return Array.from({ length: 13 }, (_, k) =>
    (R * Math.abs(Math.cos(((phase + k * 15) * Math.PI) / 180))).toFixed(1),
  ).join(";");
}

const orbit = (rx: number, ry: number) =>
  `M${CX - rx} ${CY}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;

const FINGERS = [
  "M58 178C38 172 30 150 38 128",
  "M76 160C64 140 62 120 68 104",
  "M96 154C92 134 94 118 98 106",
  "M118 154C124 136 126 122 124 110",
  "M138 164C152 148 156 132 152 118",
];

const SPARKS: [number, number, number][] = [
  [26, 38, 0], [176, 30, 0.8], [166, 126, 1.6], [30, 108, 2.1], [150, 8, 1.2],
];

const CSS = `
.hg-float{animation:hg-float 5s ease-in-out infinite}
@keyframes hg-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.hg-ripple{transform-box:fill-box;transform-origin:center;animation:hg-ripple 3.2s ease-out infinite}
@keyframes hg-ripple{0%{transform:scale(.4);opacity:.8}100%{transform:scale(1.5);opacity:0}}
.hg-tw{animation:hg-tw 2.6s ease-in-out infinite}
@keyframes hg-tw{0%,100%{opacity:.1}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.hg-float,.hg-ripple,.hg-tw{animation:none}}
`;

export function HeroGlobe() {
  return (
    <>
      <style>{CSS}</style>
      <svg viewBox="0 0 200 220" className="w-full overflow-visible" aria-hidden>
        <defs>
          <radialGradient id="hg-glow">
            <stop offset="0" stopColor="#4f7bff" stopOpacity=".55" />
            <stop offset="1" stopColor="#4f7bff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hg-body" cx=".35" cy=".3" r=".9">
            <stop offset="0" stopColor="#7aa8ff" />
            <stop offset=".55" stopColor="#3a35d6" />
            <stop offset="1" stopColor="#0a0f40" />
          </radialGradient>
          <linearGradient id="hg-sol" x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#9945ff" />
            <stop offset="1" stopColor="#14f195" />
          </linearGradient>
          <linearGradient id="hg-hand" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#2b55d8" stopOpacity=".45" />
            <stop offset="1" stopColor="#050a28" stopOpacity=".95" />
          </linearGradient>
          <linearGradient id="hg-fade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="220">
            <stop offset=".8" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>
          <mask id="hg-m">
            <rect width="200" height="220" fill="url(#hg-fade)" />
          </mask>
          <filter id="hg-blur"><feGaussianBlur stdDeviation="6" /></filter>
          <filter id="hg-neon" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <circle cx={CX} cy={CY} r={R + 28} fill="url(#hg-glow)" />

        <g className="hg-float">
          <circle cx={CX} cy={CY} r={R} fill="url(#hg-body)" stroke="#38d6ff" strokeOpacity=".7" filter="url(#hg-neon)" />
          {[-60, -30, 0, 30, 60].map((lat) => {
            const rr = R * Math.cos((lat * Math.PI) / 180);
            return (
              <ellipse key={lat} cx={CX} cy={CY - R * Math.sin((lat * Math.PI) / 180)} rx={rr} ry={rr * 0.2}
                fill="none" stroke="#7fd4ff" strokeOpacity=".28" />
            );
          })}
          {[0, 45, 90, 135].map((p) => (
            <ellipse key={p} cx={CX} cy={CY} rx={R} ry={R} fill="none" stroke="#9fdcff" strokeOpacity=".42">
              <animate attributeName="rx" dur="16s" repeatCount="indefinite" values={meridian(p)} />
            </ellipse>
          ))}
          <g transform={`translate(${CX} ${CY}) scale(2.3) translate(-11 -12)`} filter="url(#hg-neon)">
            <path fill="url(#hg-sol)" d="M5 16.5h14.5l-2 2.5H3zM5 5h14.5l-2 2.5H3zM3 10.75h14.5l2 2.5H5z" />
          </g>
          <g transform={`rotate(-20 ${CX} ${CY})`}>
            <ellipse cx={CX} cy={CY} rx={R + 24} ry="20" fill="none" stroke="#38d6ff" strokeOpacity=".55" />
            <circle r="3" fill="#aaf3ff" filter="url(#hg-neon)">
              <animateMotion dur="7s" repeatCount="indefinite" path={orbit(R + 24, 20)} />
            </circle>
          </g>
          <g transform={`rotate(24 ${CX} ${CY})`}>
            <ellipse cx={CX} cy={CY} rx={R + 14} ry="13" fill="none" stroke="#a78bfa" strokeOpacity=".6" />
            <circle r="2.4" fill="#d8c8ff" filter="url(#hg-neon)">
              <animateMotion dur="11s" repeatCount="indefinite" path={orbit(R + 14, 13)} />
            </circle>
          </g>
        </g>

        <ellipse cx={CX} cy="200" rx="46" ry="7" fill="#38d6ff" opacity=".35" filter="url(#hg-blur)" />
        <ellipse className="hg-ripple" cx={CX} cy="200" rx="44" ry="7" fill="none" stroke="#38d6ff" />
        <ellipse className="hg-ripple" style={{ animationDelay: "1.6s" }} cx={CX} cy="200" rx="44" ry="7" fill="none" stroke="#38d6ff" />

        <g mask="url(#hg-m)" filter="url(#hg-neon)">
          <path d="M52 190C50 164 70 150 100 150C130 150 150 164 148 190L140 214H60Z"
            fill="url(#hg-hand)" stroke="#38d6ff" strokeWidth="1.4" />
          {FINGERS.map((d) => (
            <g key={d} fill="none" strokeLinecap="round">
              <path d={d} stroke="#38d6ff" strokeWidth="15" />
              <path d={d} stroke="#07102e" strokeWidth="12" />
            </g>
          ))}
        </g>

        {SPARKS.map(([x, y, delay]) => (
          <circle key={`${x}-${y}`} className="hg-tw" style={{ animationDelay: `${delay}s` }} cx={x} cy={y} r="1.8" fill="#aaf3ff" />
        ))}
      </svg>
    </>
  );
}
