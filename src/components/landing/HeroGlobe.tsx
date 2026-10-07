import type { CSSProperties } from "react";

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

// Robot hand: every joint rotates from a closed pose (c) to an open pose (o), in degrees.
type Joint = { o: number; c: number };
type FingerCfg = { x: number; y: number; w: number; len: [number, number, number]; j: [Joint, Joint, Joint] };

const FINGERS: FingerCfg[] = [
  { x: 77, y: 155, w: 11, len: [21, 18, 14], j: [{ o: -34, c: 8 }, { o: 10, c: 34 }, { o: 14, c: 42 }] },
  { x: 92, y: 152, w: 12, len: [25, 21, 15], j: [{ o: -12, c: 3 }, { o: 10, c: 34 }, { o: 14, c: 42 }] },
  { x: 107, y: 152, w: 12, len: [25, 21, 15], j: [{ o: 12, c: -3 }, { o: -10, c: -34 }, { o: -14, c: -42 }] },
  { x: 122, y: 155, w: 11, len: [21, 18, 14], j: [{ o: 34, c: -8 }, { o: -10, c: -34 }, { o: -14, c: -42 }] },
  { x: 69, y: 184, w: 12, len: [14, 13, 11], j: [{ o: -64, c: -16 }, { o: 14, c: 36 }, { o: 16, c: 42 }] },
];

// Timeline (seconds): hand rises 0-0.9 -> fingers open 1.3-3.9 -> globe rises 2.0-4.8 -> flash 4.2
const CSS = `
.hg-leak{transform-box:fill-box;transform-origin:center;opacity:0;animation:hg-leak 3.4s ease-in-out .4s both}
@keyframes hg-leak{0%{opacity:0;transform:scale(.5)}45%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.9)}}
.hg-rhand{animation:hg-hin .9s ease-out both}
@keyframes hg-hin{0%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:none}}
.hg-j{transform-box:view-box;transform-origin:0 0;rotate:var(--o);animation:hg-open 2.6s cubic-bezier(.55,0,.2,1) 1.3s backwards}
@keyframes hg-open{0%{rotate:var(--c)}100%{rotate:var(--o)}}
.hg-reveal{transform-box:view-box;transform-origin:100px 74px;animation:hg-reveal 2.8s cubic-bezier(.25,.8,.3,1.08) 2s both}
@keyframes hg-reveal{0%{transform:translateY(54px) scale(.06);opacity:0}25%{opacity:1}100%{transform:none;opacity:1}}
.hg-flash{transform-box:fill-box;transform-origin:center;opacity:0;animation:hg-flash 1.3s ease-out 4.2s both}
@keyframes hg-flash{0%{opacity:0;transform:scale(.2)}35%{opacity:1}100%{opacity:0;transform:scale(2.2)}}
.hg-wave{transform-box:fill-box;transform-origin:center;opacity:0;animation:hg-wave 1.5s ease-out 4.3s forwards}
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
.hg-float,.hg-spin,.hg-spin2,.hg-ripple,.hg-tw,.hg-reveal,.hg-flash,.hg-wave,.hg-leak,.hg-rhand,.hg-j{animation:none}
.hg-leak,.hg-flash,.hg-wave{display:none}}
`;

function Seg({ len, w, tip }: { len: number; w: number; tip?: boolean }) {
  return (
    <g>
      <rect x={-w / 2} y={-len} width={w} height={len + 2} rx={w / 2.3}
        fill="url(#hg-metal)" stroke="#7fe3ff" strokeOpacity=".55" strokeWidth=".6" />
      <rect x={-w / 2 + 1.7} y={-len + 2.5} width="1.5" height={Math.max(len - 6, 2)} rx=".75" fill="#fff" opacity=".3" />
      {tip && <circle cy={-len + 4} r="1.7" fill="#7fe8ff" className="hg-tw" />}
      <circle r={w / 2.6} fill="#05080d" stroke="#38d6ff" strokeWidth=".8" />
      <circle r="1.1" fill="#aaf3ff" />
    </g>
  );
}

function Finger({ f }: { f: FingerCfg }) {
  const [l1, l2, l3] = f.len;
  const jv = (k: number) => ({ "--o": `${f.j[k].o}deg`, "--c": `${f.j[k].c}deg` }) as CSSProperties;
  return (
    <g transform={`translate(${f.x} ${f.y})`}>
      <g className="hg-j" style={jv(0)}>
        <Seg len={l1} w={f.w} />
        <g transform={`translate(0 ${-l1})`}>
          <g className="hg-j" style={jv(1)}>
            <Seg len={l2} w={f.w - 1.5} />
            <g transform={`translate(0 ${-l2})`}>
              <g className="hg-j" style={jv(2)}>
                <Seg len={l3} w={f.w - 3} tip />
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}

export function HeroGlobe() {
  return (
    <div className="relative">
      <style>{CSS}</style>
      <svg viewBox="0 0 200 220" className="w-full overflow-visible" aria-hidden>
        <defs>
          <radialGradient id="hg-glow">
            <stop offset="0" stopColor="#1f8bff" stopOpacity=".55" />
            <stop offset="1" stopColor="#1f8bff" stopOpacity="0" />
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
          <linearGradient id="hg-metal" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#9fb2cc" />
            <stop offset=".28" stopColor="#3b485c" />
            <stop offset=".65" stopColor="#111823" />
            <stop offset="1" stopColor="#06090e" />
          </linearGradient>
          <linearGradient id="hg-palm" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#4a586d" />
            <stop offset=".45" stopColor="#151c28" />
            <stop offset="1" stopColor="#05080d" />
          </linearGradient>
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

        <ellipse cx={CX} cy="206" rx="50" ry="8" fill="#38d6ff" opacity=".3" filter="url(#hg-blur)" />

        {/* Robot hand: palm, wrist, then five jointed fingers */}
        <g className="hg-rhand">
          <path
            d="M66 152Q66 150 70 150H130Q134 150 134 152L136 188Q136 196 128 199L124 201V214H76V201L72 199Q64 196 64 188Z"
            fill="url(#hg-palm)" stroke="#7fe3ff" strokeOpacity=".5" strokeWidth=".8"
          />
          <path d="M72 160V190M128 160V190M84 196H116" stroke="#38d6ff" strokeOpacity=".28" strokeWidth=".7" fill="none" />
          <rect x="74" y="201" width="52" height="6" rx="2" fill="#05080d" stroke="#38d6ff" strokeOpacity=".7" strokeWidth=".7" />
          <polygon points="100,166 110,172 110,184 100,190 90,184 90,172" fill="#05080d" stroke="#38d6ff" strokeWidth="1" />
          <circle cx="100" cy="178" r="4" fill="#7fe8ff" filter="url(#hg-neon)" className="hg-tw" />
          {FINGERS.map((f) => (
            <Finger key={`${f.x}-${f.y}`} f={f} />
          ))}
        </g>

        {SPARKS.map(([x, y, delay]) => (
          <circle key={`${x}-${y}`} className="hg-tw" style={{ animationDelay: `${delay}s` }} cx={x} cy={y} r="1.8" fill="#aaf3ff" />
        ))}
      </svg>
    </div>
  );
}
