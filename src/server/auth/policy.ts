import type { DataPlaneAuthPolicy } from "../../config/types.js";

export type AuthCategory = "deny" | "public" | "conditional" | "protected";

function normalizePath(path: string): string {
  const q = path.indexOf("?");
  return (q >= 0 ? path.slice(0, q) : path).trim() || "/";
}

function matchesPrefix(path: string, prefix: string): boolean {
  const p = normalizePath(path);
  const pref = prefix.trim() || "/";

  if (pref === "/") {
    return p === "/";
  }

  if (!pref.startsWith("/")) {
    // Require canonical prefixes in config; treat malformed as non-match.
    return false;
  }

  return p === pref || p.startsWith(`${pref}/`);
}

function anyMatch(path: string, prefixes: string[]): boolean {
  for (const prefix of prefixes) {
    if (matchesPrefix(path, prefix)) return true;
  }
  return false;
}

export function categorizeRequestPath(path: string, policy: DataPlaneAuthPolicy): AuthCategory {
  if (anyMatch(path, policy.denyPrefixes)) return "deny";
  if (anyMatch(path, policy.publicPrefixes)) return "public";
  if (anyMatch(path, policy.conditionalPrefixes)) return "conditional";
  if (anyMatch(path, policy.protectedPrefixes)) return "protected";

  // Default: protected when auth is enabled
  return "protected";
}
