import type { Athlete, AthleteEventLimits, IndividualEntry, RelayEntry } from "../types";
import { athleteFullName } from "../utils/athleteMatch";

interface AthleteEventCount {
  individual: number;
  relay: number;
}

/** Tallies how many individual/relay events each athlete is entered in, counting each relay entry at most once per athlete even if (erroneously) listed on more than one leg. */
function countAthleteEvents(
  individualEntries: IndividualEntry[],
  relayEntries: RelayEntry[],
): Map<string, AthleteEventCount> {
  const counts = new Map<string, AthleteEventCount>();
  const bump = (athleteId: string, field: keyof AthleteEventCount) => {
    const count = counts.get(athleteId) ?? { individual: 0, relay: 0 };
    count[field] += 1;
    counts.set(athleteId, count);
  };

  for (const entry of individualEntries) {
    if (entry.athleteId) bump(entry.athleteId, "individual");
  }
  for (const entry of relayEntries) {
    const legAthleteIds = new Set(
      [entry.leg1AthleteId, entry.leg2AthleteId, entry.leg3AthleteId, entry.leg4AthleteId].filter(
        Boolean,
      ),
    );
    for (const athleteId of legAthleteIds) bump(athleteId, "relay");
  }

  return counts;
}

/** Which of an athlete's over-limit categories a violation applies to, each holding the same human-readable reason — a total-limit violation sets both, an individual- or relay-only violation sets just the one it applies to. */
export interface AthleteOverLimitCategories {
  individual?: string;
  relay?: string;
}

/** Describes why an athlete is over one or more of the meet's per-athlete event limits, split by which count(s) the violation applies to. Empty if they aren't over any limit. */
function describeOverLimitCategories(
  athleteName: string,
  count: AthleteEventCount,
  limits: Partial<AthleteEventLimits> | undefined,
): AthleteOverLimitCategories {
  if (!limits) return {};
  const total = count.individual + count.relay;
  const individualViolation =
    limits.maxIndividualEventsPerAthlete !== undefined &&
    count.individual > limits.maxIndividualEventsPerAthlete;
  const relayViolation =
    limits.maxRelayEventsPerAthlete !== undefined && count.relay > limits.maxRelayEventsPerAthlete;
  const totalViolation =
    limits.maxTotalEventsPerAthlete !== undefined && total > limits.maxTotalEventsPerAthlete;

  const violations: string[] = [];
  if (individualViolation) {
    violations.push(
      `${count.individual} individual events (max ${limits.maxIndividualEventsPerAthlete})`,
    );
  }
  if (relayViolation) {
    violations.push(`${count.relay} relay events (max ${limits.maxRelayEventsPerAthlete})`);
  }
  if (totalViolation) {
    violations.push(`${total} total events (max ${limits.maxTotalEventsPerAthlete})`);
  }
  if (violations.length === 0) return {};

  const message = `${athleteName} is entered in ${violations.join(", ")}`;
  const categories: AthleteOverLimitCategories = {};
  if (individualViolation || totalViolation) categories.individual = message;
  if (relayViolation || totalViolation) categories.relay = message;
  return categories;
}

/**
 * Maps each over-limit athlete's id to their violated categories (individual
 * and/or relay), for flagging only the count column(s) a violation actually
 * applies to (e.g. the Athletes roster's Individual/Relay Events columns).
 * Athletes within the limits are absent from the map.
 */
export function buildAthleteOverLimitCategoriesById(
  athletes: Athlete[],
  individualEntries: IndividualEntry[],
  relayEntries: RelayEntry[],
  limits: Partial<AthleteEventLimits> | undefined,
): Map<string, AthleteOverLimitCategories> {
  const counts = countAthleteEvents(individualEntries, relayEntries);
  const result = new Map<string, AthleteOverLimitCategories>();
  for (const athlete of athletes) {
    const categories = describeOverLimitCategories(
      athleteFullName(athlete),
      counts.get(athlete.id) ?? { individual: 0, relay: 0 },
      limits,
    );
    if (categories.individual || categories.relay) result.set(athlete.id, categories);
  }
  return result;
}

/**
 * Maps each over-limit athlete's id to a human-readable reason, for flagging
 * their entries wherever athletes are shown as a single combined badge
 * (By Event summary, entry grids). Athletes within the limits are absent
 * from the map.
 */
export function buildAthleteOverLimitDetailById(
  athletes: Athlete[],
  individualEntries: IndividualEntry[],
  relayEntries: RelayEntry[],
  limits: Partial<AthleteEventLimits> | undefined,
): Map<string, string> {
  const result = new Map<string, string>();
  for (const [athleteId, categories] of buildAthleteOverLimitCategoriesById(
    athletes,
    individualEntries,
    relayEntries,
    limits,
  )) {
    result.set(athleteId, (categories.individual ?? categories.relay) as string);
  }
  return result;
}
