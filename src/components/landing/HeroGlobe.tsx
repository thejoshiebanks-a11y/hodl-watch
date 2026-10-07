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
  { x: 78, y: 156, w: 12, len: [26, 19, 13], j: [{ o: -30, c: 8 }, { o: 10, c: 34 }, { o: 14, c: 42 }] },
  { x: 93, y: 156, w: 12.5, len: [29, 20, 15], j: [{ o: -10, c: 3 }, { o: 10, c: 34 }, { o: 14, c: 42 }] },
  { x: 108, y: 156, w: 12, len: [27, 19, 13], j: [{ o: 10, c: -3 }, { o: -10, c: -34 }, { o: -14, c: -42 }] },
  { x: 122, y: 156, w: 10.5, len: [22, 15, 11], j: [{ o: 30, c: -8 }, { o: -10, c: -34 }, { o: -14, c: -42 }] },
  { x: 68, y: 188, w: 14, len: [17, 15, 12], j: [{ o: -62, c: -14 }, { o: 14, c: 36 }, { o: 16, c: 42 }] },
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

// One tapered chrome segment with a rounded cap. Its base is tucked under the previous segment's cap.
function Seg({ len, wb, wt }: { len: number; wb: number; wt: number }) {
  const r = wt / 2;
  const top = -len + r;
  const d = `M${-wb / 2} 0L${-r} ${top}A${r} ${r} 0 0 1 ${r} ${top}L${wb / 2} 0A${wb / 2} ${wb / 2} 0 0 1 ${-wb / 2} 0Z`;
  return (
    <g>
      <path d={d} fill="url(#hg-metal)" stroke="#8fdcff" strokeOpacity=".4" strokeWidth=".5" />
      <path d={`M${-wb * 0.2} -2L${-wt * 0.2} ${top + 1}`} stroke="#fff" strokeOpacity=".28" strokeWidth="1" strokeLinecap="round" />
      <path d={`M${wb * 0.12} -3L${wt * 0.12} ${top}`} stroke="#38d6ff" strokeOpacity=".5" strokeWidth=".7" strokeLinecap="round" />
    </g>
  );
}

function Finger({ f }: { f: FingerCfg }) {
  const [l1, l2, l3] = f.len;
  const W = f.w;
  const s1 = { wb: W, wt: W * 0.86 };
  const s2 = { wb: W * 0.84, wt: W * 0.74 };
  const s3 = { wb: W * 0.72, wt: W * 0.62 };
  const top1 = -l1 + s1.wt / 2;
  const top2 = -l2 + s2.wt / 2;
  const jv = (k: number) => ({ "--o": `${f.j[k].o}deg`, "--c": `${f.j[k].c}deg` }) as CSSProperties;
  return (
    <g transform={`translate(${f.x} ${f.y})`}>
      <g className="hg-j" style={jv(0)}>
        <g transform={`translate(0 ${top1})`}>
          <g className="hg-j" style={jv(1)}>
            <g transform={`translate(0 ${top2})`}>
              <g className="hg-j" style={jv(2)}>
                <Seg len={l3} {...s3} />
              </g>
            </g>
            <Seg len={l2} {...s2} />
          </g>
        </g>
        <Seg len={l1} {...s1} />
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
            <stop stopColor="#0b1119" />
            <stop offset=".18" stopColor="#56677e" />
            <stop offset=".36" stopColor="#c9d7e8" />
            <stop offset=".52" stopColor="#3a475a" />
            <stop offset=".78" stopColor="#0d131c" />
            <stop offset="1" stopColor="#04070b" />
          </linearGradient>
          <linearGradient id="hg-palm" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#52627a" />
            <stop offset=".35" stopColor="#1a2230" />
            <stop offset="1" stopColor="#05080d" />
          </linearGradient>
          <radialGradient id="hg-core">
            <stop stopColor="#bff6ff" stopOpacity=".95" />
            <stop offset=".45" stopColor="#38d6ff" stopOpacity=".55" />
            <stop offset="1" stopColor="#38d6ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hg-rock" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#1f3047" />
            <stop offset=".45" stopColor="#0a111b" />
            <stop offset="1" stopColor="#03050a" stopOpacity="0" />
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

        {/* Distant ridge behind the hand */}
        <g opacity=".65">
          <path d="M-10 206L8 198L22 190L36 197L50 193L64 199L80 197L100 199L120 197L136 199L150 192L166 186L180 194L196 199L210 204V232H-10Z" fill="url(#hg-rock)" />
          <path d="M-10 206L8 198L22 190L36 197L50 193L64 199L80 197L100 199L120 197L136 199L150 192L166 186L180 194L196 199L210 204" fill="none" stroke="#38d6ff" strokeOpacity=".35" strokeWidth=".7" strokeLinejoin="round" />
        </g>

        {/* Robot hand: palm, wrist, jointed chrome fingers, knuckle guard */}
        <g transform="translate(100 214) scale(1.1) translate(-100 -214)">
          <g className="hg-rhand">
            <path
              d="M67 157Q66 150 73 150H127Q134 150 133 157L131 184Q130 196 122 202H78Q70 196 69 184Z"
              fill="url(#hg-palm)" stroke="#8fdcff" strokeOpacity=".45" strokeWidth=".7"
            />
            <path d="M73 150Q70 160 72 176M127 150Q130 160 128 176" stroke="#fff" strokeOpacity=".1" strokeWidth="2" fill="none" />
            <path d="M76 166H124M80 192H120" stroke="#38d6ff" strokeOpacity=".22" strokeWidth=".6" fill="none" />
            <path d="M76 202H124L121 214H79Z" fill="url(#hg-palm)" stroke="#8fdcff" strokeOpacity=".4" strokeWidth=".6" />
            <path d="M78 206H122M79 210H121" stroke="#38d6ff" strokeOpacity=".3" strokeWidth=".6" />
            {FINGERS.slice(0, 4).map((f) => (
              <Finger key={`${f.x}-${f.y}`} f={f} />
            ))}
            <rect x="68" y="150" width="64" height="11" rx="5.5" fill="url(#hg-palm)" stroke="#8fdcff" strokeOpacity=".5" strokeWidth=".7" />
            <path d="M74 155.5H126" stroke="#38d6ff" strokeOpacity=".35" strokeWidth=".7" strokeLinecap="round" />
            <Finger f={FINGERS[4]} />
            <ellipse cx="72" cy="191" rx="7.5" ry="9.5" transform="rotate(-18 72 191)" fill="url(#hg-palm)" stroke="#8fdcff" strokeOpacity=".45" strokeWidth=".7" />
            <circle cx="100" cy="178" r="11" fill="url(#hg-core)" className="hg-tw" />
            <circle cx="100" cy="178" r="7.5" fill="none" stroke="#7fe8ff" strokeOpacity=".7" strokeWidth=".8" />
          </g>
        </g>

        {/* Rocky ground the hand rises from */}
        <g>
          <path d="M-10 214L2 208L14 204L28 195L40 201L52 204L64 207L78 205L90 208L100 204L112 208L124 205L138 207L150 203L162 200L174 193L188 200L200 206L210 210V232H-10Z" fill="url(#hg-rock)" />
          <path d="M-10 214L2 208L14 204L28 195L40 201L52 204L64 207L78 205L90 208L100 204L112 208L124 205L138 207L150 203L162 200L174 193L188 200L200 206L210 210" fill="none" stroke="#38d6ff" strokeOpacity=".6" strokeWidth=".9" strokeLinejoin="round" />
          <path d="M28 195L34 214M40 201L36 218M64 207L60 221M138 207L144 222M162 200L158 216M174 193L180 212" stroke="#38d6ff" strokeOpacity=".14" strokeWidth=".6" />
        </g>

        {SPARKS.map(([x, y, delay]) => (
          <circle key={`${x}-${y}`} className="hg-tw" style={{ animationDelay: `${delay}s` }} cx={x} cy={y} r="1.8" fill="#aaf3ff" />
        ))}
      </svg>
    </div>
  );
}
