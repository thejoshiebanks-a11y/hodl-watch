// App icon + notification badge, drawn from the same hexagon-H mark as the header logo.

const MARK = `<path d="M24 2.5 42.5 13v22L24 45.5 5.5 35V13z" fill="url(#f)"/><path d="M24 2.5 42.5 13v22L24 45.5 5.5 35V13z" stroke="url(#g)" stroke-width="1.6"/><path d="M17 14v20M31 14v20" stroke="url(#g)" stroke-width="3.6" stroke-linecap="round"/><path d="M17 25h4.5l2.5-6 3 11 2-5H31" stroke="url(#g)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;

const GRID = Array.from({ length: 15 }, (_, i) => {
  const p = 32 * (i + 1);
  return `M${p} 0V512M0 ${p}H512`;
}).join("");

function uri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Full-bleed app icon: deep navy, faint grid, cyan glow and radar rings behind the mark. */
export function hodlIconDataUri(scale = 6.6, rings = true): string {
  const off = 256 - 24 * scale;
  return uri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none"><defs>` +
      `<linearGradient id="g" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse"><stop stop-color="#7ff3ff"/><stop offset="1" stop-color="#1f8bff"/></linearGradient>` +
      `<linearGradient id="f" x1="24" y1="2" x2="24" y2="46" gradientUnits="userSpaceOnUse"><stop stop-color="#19232f"/><stop offset="1" stop-color="#04070b"/></linearGradient>` +
      `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="512" gradientUnits="userSpaceOnUse"><stop stop-color="#08143a"/><stop offset="1" stop-color="#02040c"/></linearGradient>` +
      `<radialGradient id="glow" cx="256" cy="256" r="250" gradientUnits="userSpaceOnUse"><stop stop-color="#1f8bff" stop-opacity=".55"/><stop offset=".55" stop-color="#1f8bff" stop-opacity=".14"/><stop offset="1" stop-color="#1f8bff" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="vig" cx="256" cy="256" r="360" gradientUnits="userSpaceOnUse"><stop offset=".45" stop-color="#02040c" stop-opacity="0"/><stop offset="1" stop-color="#02040c" stop-opacity=".9"/></radialGradient>` +
      `</defs>` +
      `<rect width="512" height="512" fill="url(#bg)"/>` +
      `<path d="${GRID}" stroke="#38d6ff" stroke-opacity=".07" stroke-width="1"/>` +
      `<rect width="512" height="512" fill="url(#glow)"/>` +
      (rings
        ? `<path d="M256 22 458 139v234L256 490 54 373V139z" stroke="#38d6ff" stroke-opacity=".22" stroke-width="2"/>` +
          `<path d="M256 62 424 159v194L256 450 88 353V159z" stroke="#38d6ff" stroke-opacity=".12" stroke-width="2"/>`
        : "") +
      `<rect width="512" height="512" fill="url(#vig)"/>` +
      `<g transform="translate(${off} ${off}) scale(${scale})">${MARK}</g></svg>`,
  );
}

/** Android notification badge: only the shape matters, so it is plain white on transparent. */
export const hodlBadgeDataUri = uri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48" fill="none">` +
    `<path d="M24 2.5 42.5 13v22L24 45.5 5.5 35V13z" stroke="#fff" stroke-width="3"/>` +
    `<path d="M17 14v20M31 14v20" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>` +
    `<path d="M17 25h4.5l2.5-6 3 11 2-5H31" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
);
