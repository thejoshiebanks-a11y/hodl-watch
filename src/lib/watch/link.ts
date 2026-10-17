/** Only these two kinds of link are ever shown from an alert. */
export function alertLink(
  url: string | undefined,
): { href: string; label: string } | null {
  if (typeof url !== "string") return null;
  if (url.startsWith("https://solscan.io/tx/")) {
    return { href: url, label: "View tx ↗" };
  }
  if (url.startsWith("https://x.com/")) {
    return { href: url, label: "Open post ↗" };
  }
  return null;
}
