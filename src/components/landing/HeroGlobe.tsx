import type { CSSProperties } from "react";

// Tune the photo hands here (percent of the hero box).
const HAND_WIDTH = 84;
const HAND_BOTTOM = -6;
const WRIST_X = 38.8; // wrist centre as % of the photo width

const CX = 100;
const CY = 74;
const R = 50;

function meridian(phase: number) {
  return Array.from({ length: 13 }, (_, k) =>
    (R * Math.abs(Math.cos(((phase + k * 15) * Math.PI) / 180))).toFixed(1),
  ).join(";");
}

const orbit = (rx: number, ry: number) =>
  `M${CX - rx} ${CY}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;

const NODES: [number, number][] = [[80, 54], [118, 48], [128, 84], [86, 98], [102, 70]];
const ARCS: [number, number][] = [[0, 4], [4, 1], [1, 2], [4, 3]];
const SPARKS: [number, number, number][] = [
  [24, 34, 0], [178, 28, 0.8], [172, 130, 1.6], [26, 112, 2.1], [150, 6, 1.2],
];

// Timeline (seconds): fist 0-1 -> hand opens 1.1-4.9 -> globe rises 2.0-4.8 -> flash 4.2
const CSS = `
.hg-leak{transform-box:fill-box;transform-origin:center;opacity:0;animation:hg-leak 3.4s ease-in-out .4s both}
@keyframes hg-leak{0%{opacity:0;transform:scale(.5)}45%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.9)}}
.hg-fist{transform-origin:${WRIST_X}% 100%;animation:hg-fist 3.4s cubic-bezier(.4,0,.2,1) 1s both}
@keyframes hg-fist{0%{opacity:1;scale:1 1}55%{opacity:.8}100%{opacity:0;scale:1.14 1.06}}
.hg-hand{transform-origin:${WRIST_X}% 100%;animation:hg-hand 3.8s cubic-bezier(.4,0,.2,1) 1.1s both}
@keyframes hg-hand{0%{opacity:0;scale:.5 .8;rotate:-5deg}35%{opacity:.55}70%{opacity:1}100%{opacity:1;scale:1 1;rotate:0deg}}
.hg-reveal{transform-box:view-box;transform-origin:100px 74px;animation:hg-reveal 2.8s cubic-bezier(.25,.8,.3,1.08) 2s both}
@keyframes hg-reveal{0%{transform:translateY(54px) scale(.06);opacity:0}25%{opacity:1}100%{transform:none;opacity:1}}
.hg-flash{transform-box:fill-box;transform-origin:center;opacity:0;animation:hg-flash 1.3s ease-out 4.2s both}
@keyframes hg-flash{0%{opacity:0;transform:scale(.2)}35%{opacity:1}100%{opacity:0;transform:scale(2.2)}}
.hg-wave{transform-box:fill-box;transform-origin:center;opacity:0;animation:hg-wave 1.5s ease-out 4.3s both}
@keyframes hg-wave{0%{opacity:.9;transform:scale(.3)}100%{opacity:0;transform:scale(2.4)}}
.hg-float{animation:hg-float 5s ease-in-out infinite}
@keyframes hg-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.hg-spin,.hg-spin2{transform-box:fill-box;transform-origin:center;animation:hg-spin 26s linear infinite}
.hg-spin2{animation-duration:34s;animation-direction:reverse}
@keyframes hg-spin{to{transform:rotate(360deg)}}
.hg-ripple{transform-box:fill-box;transform-origin:center;animation:hg-ripple 3.2s ease-out infinite}
@keyframes hg-ripple{0%{transform:scale(.4);opacity:.9}100%{transform:scale(2.2);opacity:0}}
.hg-tw{animation:hg-tw 2.6s ease-in-out infinite}
@keyframes hg-tw{0%,100%{opacity:.1}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){
.hg-float,.hg-spin,.hg-spin2,.hg-ripple,.hg-tw,.hg-reveal,.hg-hand,.hg-flash,.hg-wave,.hg-leak{animation:none}
.hg-fist,.hg-leak,.hg-flash,.hg-wave{display:none}}
`;

const handStyle: CSSProperties = {
  position: "absolute",
  left: `${(100 - HAND_WIDTH) / 2}%`,
  bottom: `${HAND_BOTTOM}%`,
  width: `${HAND_WIDTH}%`,
  pointerEvents: "none",
  WebkitMaskImage: "linear-gradient(to bottom, #000 68%, transparent 100%)",
  maskImage: "linear-gradient(to bottom, #000 68%, transparent 100%)",
  filter: "drop-shadow(0 0 8px rgba(56,214,255,0.55)) saturate(1.05) contrast(1.05)",
};

export function HeroGlobe() {
  return (
    <div className="relative">
      <style>{CSS}</style>
      <svg viewBox="0 0 200 220" className="w-full overflow-visible" aria-hidden>
        <defs>
          <radialGradient id="hg-glow">
            <stop offset="0" stopColor="#4f7bff" stopOpacity=".55" />
            <stop offset="1" stopColor="#4f7bff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hg-body" cx=".35" cy=".3" r=".9">
            <stop offset="0" stopColor="#4aa8ff" />
            <stop offset=".45" stopColor="#1b3fd0" />
            <stop offset="1" stopColor="#060b36" />
          </radialGradient>
          <linearGradient id="hg-sol" x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#9945ff" />
            <stop offset="1" stopColor="#14f195" />
          </linearGradient>
          <linearGradient id="hg-scan" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#38d6ff" stopOpacity="0" />
            <stop offset=".5" stopColor="#7fe8ff" stopOpacity=".5" />
            <stop offset="1" stopColor="#38d6ff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="hg-flash">
            <stop offset="0" stopColor="#fff" stopOpacity=".95" />
            <stop offset=".4" stopColor="#7fe8ff" stopOpacity=".55" />
            <stop offset="1" stopColor="#38d6ff" stopOpacity="0" />
          </radialGradient>
          <clipPath id="hg-clip">
            <circle cx={CX} cy={CY} r={R} />
          </clipPath>
          <filter id="hg-blur"><feGaussianBlur stdDeviation="6" /></filter>
          <filter id="hg-neon" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <circle className="hg-leak" cx={CX} cy="122" r="46" fill="url(#hg-glow)" />

        <g className="hg-reveal">
          <circle cx={CX} cy={CY} r={R + 30} fill="url(#hg-glow)" />
          <g className="hg-float">
            <circle cx={CX} cy={CY} r={R + 5} fill="none" stroke="#38d6ff" strokeOpacity=".25" />
            <circle cx={CX} cy={CY} r={R} fill="url(#hg-body)" stroke="#7fe3ff" strokeOpacity=".8" filter="url(#hg-neon)" />
            {[-60, -30, 0, 30, 60].map((lat) => {
              const rr = R * Math.cos((lat * Math.PI) / 180);
              return (
                <ellipse key={lat} cx={CX} cy={CY - R * Math.sin((lat * Math.PI) / 180)} rx={rr} ry={rr * 0.2}
                  fill="none" stroke="#7fd4ff" strokeOpacity=".3" />
              );
            })}
            {[0, 45, 90, 135].map((p) => (
              <ellipse key={p} cx={CX} cy={CY} rx={R} ry={R} fill="none" stroke="#9fdcff" strokeOpacity=".42">
                <animate attributeName="rx" dur="16s" repeatCount="indefinite" values={meridian(p)} />
              </ellipse>
            ))}

            <g clipPath="url(#hg-clip)">
              <rect x={CX - R} y={CY - R} width={2 * R} height="16" fill="url(#hg-scan)">
                <animate attributeName="y" values={`${CY - R};${CY + R - 16};${CY - R}`} dur="5s" repeatCount="indefinite" />
              </rect>
              {ARCS.map(([a, b]) => (
                <path key={`${a}-${b}`}
                  d={`M${NODES[a][0]} ${NODES[a][1]}Q${(NODES[a][0] + NODES[b][0]) / 2} ${(NODES[a][1] + NODES[b][1]) / 2 - 12} ${NODES[b][0]} ${NODES[b][1]}`}
                  fill="none" stroke="#aaf3ff" strokeOpacity=".7" strokeDasharray="3 3">
                  <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1.2s" repeatCount="indefinite" />
                </path>
              ))}
              {NODES.map(([x, y], i) => (
                <g key={i}>
                  <circle className="hg-ripple" style={{ animationDelay: `${i * 0.5}s` }} cx={x} cy={y} r="3" fill="none" stroke="#38d6ff" />
                  <circle cx={x} cy={y} r="2" fill="#aaf3ff" />
                </g>
              ))}
            </g>

            <g transform={`translate(${CX} ${CY}) scale(2) translate(-11 -12)`} opacity=".9" filter="url(#hg-neon)">
              <path fill="url(#hg-sol)" d="M5 16.5h14.5l-2 2.5H3zM5 5h14.5l-2 2.5H3zM3 10.75h14.5l2 2.5H5z" />
            </g>

            <circle className="hg-spin" cx={CX} cy={CY} r={R + 10} fill="none" stroke="#38d6ff" strokeOpacity=".55" strokeDasharray="2 5 10 5" />
            <circle className="hg-spin2" cx={CX} cy={CY} r={R + 16} fill="none" stroke="#a78bfa" strokeOpacity=".5" strokeDasharray="1 4" />

            <g transform={`rotate(-20 ${CX} ${CY})`}>
              <ellipse cx={CX} cy={CY} rx={R + 24} ry="20" fill="none" stroke="#38d6ff" strokeOpacity=".5" />
              <circle r="3" fill="#aaf3ff" filter="url(#hg-neon)">
                <animateMotion dur="7s" repeatCount="indefinite" path={orbit(R + 24, 20)} />
              </circle>
            </g>
            <g transform={`rotate(24 ${CX} ${CY})`}>
              <ellipse cx={CX} cy={CY} rx={R + 14} ry="13" fill="none" stroke="#a78bfa" strokeOpacity=".55" />
              <circle r="2.4" fill="#d8c8ff" filter="url(#hg-neon)">
                <animateMotion dur="11s" repeatCount="indefinite" path={orbit(R + 14, 13)} />
              </circle>
            </g>
          </g>
        </g>

        <circle className="hg-flash" cx={CX} cy={CY} r="46" fill="url(#hg-flash)" />
        <circle className="hg-wave" cx={CX} cy={CY} r="50" fill="none" stroke="#7fe8ff" strokeWidth="1.5" />

        <ellipse cx={CX} cy="204" rx="50" ry="8" fill="#38d6ff" opacity=".3" filter="url(#hg-blur)" />

        {SPARKS.map(([x, y, delay]) => (
          <circle key={`${x}-${y}`} className="hg-tw" style={{ animationDelay: `${delay}s` }} cx={x} cy={y} r="1.8" fill="#aaf3ff" />
        ))}
      </svg>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hg-fist" src="/hand-closed.webp" alt="" style={handStyle} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hg-hand" src="/hand.webp" alt="" style={handStyle} />
    </div>
  );
}
