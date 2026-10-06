import type { Athlete } from "../types";

export function athleteFullName(a: { firstName: string; lastName: string }): string {
  return `${a.firstName} ${a.lastName}`.trim();
}

function athletesNamed(name: string, athletes: Athlete[]): Athlete[] {
  const target = name.trim().toLowerCase();
  return athletes.filter((a) => athleteFullName(a).toLowerCase() === target);
}

/**
 * Resolves a freeform "First Last" name (as typed in a CSV import) to the
 * one athlete it unambiguously matches, for columns that reference an
 * athlete by id but are imported by name.
 */
export function findAthleteIdByName(name: string, athletes: Athlete[]): string | undefined {
  const matches = athletesNamed(name, athletes);
  return matches.length === 1 ? matches[0].id : undefined;
}

/** Key identifying "this name and class year" — two athletes sharing it are an unlikely but possible same-name coincidence worth flagging. */
export function athleteNameYearKey(a: Athlete): string | undefined {
  const name = athleteFullName(a).toLowerCase();
  return name !== "" && a.classYear !== null ? `${name}|${a.classYear}` : undefined;
}

export function athleteNameMatchError(name: string, athletes: Athlete[]): string | undefined {
  const target = name.trim();
  if (target === "") return "Athlete name is required.";
  const matches = athletesNamed(target, athletes);
  if (matches.length === 0) return `No athlete named "${target}" found.`;
  if (matches.length > 1)
    return `Multiple athletes named "${target}" — cannot determine which to use.`;
  return undefined;
}
