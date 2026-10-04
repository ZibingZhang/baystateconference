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

/** Describes why an athlete is over one of the meet's per-athlete event limits, or undefined if they aren't. */
function describeOverLimit(
  athleteName: string,
  count: AthleteEventCount,
  limits: Partial<AthleteEventLimits> | undefined,
): string | undefined {
  if (!limits) return undefined;
  const total = count.individual + count.relay;
  const violations: string[] = [];
  if (
    limits.maxIndividualEventsPerAthlete !== undefined &&
    count.individual > limits.maxIndividualEventsPerAthlete
  ) {
    violations.push(
      `${count.individual} individual events (max ${limits.maxIndividualEventsPerAthlete})`,
    );
  }
  if (
    limits.maxRelayEventsPerAthlete !== undefined &&
    count.relay > limits.maxRelayEventsPerAthlete
  ) {
    violations.push(`${count.relay} relay events (max ${limits.maxRelayEventsPerAthlete})`);
  }
  if (limits.maxTotalEventsPerAthlete !== undefined && total > limits.maxTotalEventsPerAthlete) {
    violations.push(`${total} total events (max ${limits.maxTotalEventsPerAthlete})`);
  }
  if (violations.length === 0) return undefined;
  return `${athleteName} is entered in ${violations.join(", ")}`;
}

/**
 * Maps each over-limit athlete's id to a human-readable reason, for flagging
 * their entries wherever athletes are shown (By Event summary, entry grids).
 * Athletes within the limits are absent from the map.
 */
export function buildAthleteOverLimitDetailById(
  athletes: Athlete[],
  individualEntries: IndividualEntry[],
  relayEntries: RelayEntry[],
  limits: Partial<AthleteEventLimits> | undefined,
): Map<string, string> {
  const counts = countAthleteEvents(individualEntries, relayEntries);
  const result = new Map<string, string>();
  for (const athlete of athletes) {
    const detail = describeOverLimit(
      athleteFullName(athlete),
      counts.get(athlete.id) ?? { individual: 0, relay: 0 },
      limits,
    );
    if (detail !== undefined) result.set(athlete.id, detail);
  }
  return result;
}
