const BASE58 = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

export function extractMints(text: string): string[] {
  return [...new Set(text.match(BASE58) ?? [])];
}
