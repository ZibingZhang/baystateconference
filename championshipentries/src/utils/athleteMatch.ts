import type { Athlete } from "../types";
import { newId } from "./id";

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

export interface AthleteImportResolution {
  /** Source athlete id -> id to use in the destination meet (either a reused existing athlete or a newly copied one). */
  idMap: Map<string, string>;
  /** New `Athlete` records the caller still needs to persist alongside the imported entries. */
  newAthletes: Athlete[];
}

/**
 * Resolves the athletes referenced by entries being imported from another
 * meet: reuses a destination athlete that already matches by name and class
 * year, or allocates a copy, so the entries' athlete FKs stay valid in the
 * destination meet. Mirrors `useMeetActions.copyMeet`'s id-remapping
 * pattern, but matches against the destination meet's existing athletes
 * first instead of unconditionally copying.
 */
export function resolveOrCopyAthletesForImport(
  sourceAthleteIds: string[],
  allAthletes: Athlete[],
  destMeetId: string,
): AthleteImportResolution {
  const athleteById = new Map(allAthletes.map((a) => [a.id, a]));
  const destIdByKey = new Map<string, string>();
  for (const a of allAthletes) {
    if (a.meetId !== destMeetId) continue;
    const key = athleteNameYearKey(a);
    if (key && !destIdByKey.has(key)) destIdByKey.set(key, a.id);
  }

  const idMap = new Map<string, string>();
  const newAthletes: Athlete[] = [];
  for (const sourceId of new Set(sourceAthleteIds)) {
    if (!sourceId || idMap.has(sourceId)) continue;
    const source = athleteById.get(sourceId);
    if (!source) continue;
    const key = athleteNameYearKey(source);
    const existingId = key ? destIdByKey.get(key) : undefined;
    if (existingId) {
      idMap.set(sourceId, existingId);
      continue;
    }
    const newAthleteId = newId();
    idMap.set(sourceId, newAthleteId);
    newAthletes.push({ ...source, id: newAthleteId, meetId: destMeetId });
    if (key) destIdByKey.set(key, newAthleteId);
  }
  return { idMap, newAthletes };
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
