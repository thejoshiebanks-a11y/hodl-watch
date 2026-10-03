import { z } from "zod";

const BASE58_PATTERN = /^[1-9A-HJ-NP-Za-km-z]+$/;

export const SolanaMintSchema = z
  .string()
  .trim()
  .min(32, "Mint address is too short")
  .max(44, "Mint address is too long")
  .regex(BASE58_PATTERN, "Invalid Solana mint address");

export function validateSolanaMint(value: string): string {
  return SolanaMintSchema.parse(value);
}
