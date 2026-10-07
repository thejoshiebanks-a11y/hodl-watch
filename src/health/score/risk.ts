type Cap = { max: number };

/** The lowest risk level a token can show, given the red flags raised on it. */
export function riskFloor(caps: Cap[] | undefined): "High" | "Moderate" | null {
  if (!caps || caps.length === 0) return null;
  const lowest = Math.min(...caps.map((c) => c.max));
  if (lowest <= 3) return "High";
  if (lowest <= 5.5) return "Moderate";
  return null;
}

/** Raises a risk label when the caps say the group rows undersold the danger. */
export function raiseRiskLabel(label: string, caps: Cap[] | undefined): string {
  const floor = riskFloor(caps);
  if (floor === "High") return "High";
  if (floor === "Moderate" && (label === "Low" || label === "N/A")) return "Moderate";
  return label;
}

/** Same rule for the screen that also needs a colour class. */
export function raiseRiskTone(
  base: [string, string],
  caps: Cap[] | undefined,
): [string, string] {
  const label = raiseRiskLabel(base[0], caps);
  if (label === base[0]) return base;
  return label === "High" ? ["High", "text-red-300"] : ["Moderate", "text-amber-300"];
}
