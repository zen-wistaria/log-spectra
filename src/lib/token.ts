import { randomBytes } from "node:crypto";

/**
 * Generate a secure random API token (64-character hex string).
 */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}
