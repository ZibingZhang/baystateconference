import type { Athlete, ImportedEvent, IndividualEntry, RelayEntry } from "../types";
import { parseSwimTime } from "../hytek/common";
import { isDivingEvent, uniqueEventOptions } from "./ev3";
import { athleteFullName } from "../utils/athleteMatch";

export interface PsychSheetEntry {
  key: string;
  /** Seed rank within the event, 1-based. Undefined for unseeded entries (no time, or NT/SCR/etc), which sort after all ranked entries. */
  rank: number | undefined;
  name: string;
  /** Relay leg names, joined for display under the relay letter. */
  detail?: string;
  classYear?: number | null;
  seedTime: string;
}

export interface PsychSheetGroup {
  eventNumber: number;
  displayName: string;
  relay: boolean;
  scheduledTime: string;
  entries: PsychSheetEntry[];
}

/** Lower is better for swimming, higher is better for diving — negate diving scores so both sort ascending by "best first". */
function rankValue(seedTime: string, diving: boolean): number | undefined {
  const parsed = parseSwimTime(seedTime);
  if (typeof parsed !== "number") return undefined;
  return diving ? -parsed : parsed;
}

/** Ranks and orders entries best-time-first; entries with no usable seed time sort after, alphabetically by name. */
function rankAndSort(
  entries: PsychSheetEntry[],
  rankValueByKey: Map<string, number>,
): PsychSheetEntry[] {
  const seeded = entries.filter((e) => rankValueByKey.has(e.key));
  const unseeded = entries.filter((e) => !rankValueByKey.has(e.key));
  seeded.sort((a, b) => rankValueByKey.get(a.key)! - rankValueByKey.get(b.key)!);
  unseeded.sort((a, b) => a.name.localeCompare(b.name));
  seeded.forEach((e, i) => {
    e.rank = i + 1;
  });
  return [...seeded, ...unseeded];
}

/**
 * Groups individual and relay entries by event, seeded best-time-first (like a
 * printed psych/heat sheet) rather than entry order. Entries with no resolvable
 * athlete (same skip condition as export/`buildEventSummary`) are omitted —
 * they wouldn't swim.
 */
export function buildPsychSheet(
  importedEvents: ImportedEvent[],
  athletes: Athlete[],
  individualEntries: IndividualEntry[],
  relayEntries: RelayEntry[],
): PsychSheetGroup[] {
  const athleteById = new Map(athletes.map((a) => [a.id, a]));

  const individualGroups: PsychSheetGroup[] = uniqueEventOptions(importedEvents, false).map(
    (option) => {
      const event = importedEvents.find((e) => e.eventNumber === option.eventNumber);
      const diving = event !== undefined && isDivingEvent(event);
      const rankValueByKey = new Map<string, number>();
      const entries: PsychSheetEntry[] = individualEntries
        .filter((e) => e.event === option.eventNumber)
        .flatMap((e) => {
          const athlete = athleteById.get(e.athleteId);
          if (!athlete) return [];
          const value = rankValue(e.seedTime, diving);
          if (value !== undefined) rankValueByKey.set(e.id, value);
          return [
            {
              key: e.id,
              rank: undefined,
              name: athleteFullName(athlete),
              classYear: athlete.classYear,
              seedTime: e.seedTime || "NT",
            },
          ];
        });
      return {
        eventNumber: option.eventNumber,
        displayName: option.name,
        relay: false,
        scheduledTime: event?.scheduledTime ?? "",
        entries: rankAndSort(entries, rankValueByKey),
      };
    },
  );

  const relayGroups: PsychSheetGroup[] = uniqueEventOptions(importedEvents, true).map((option) => {
    const event = importedEvents.find((e) => e.eventNumber === option.eventNumber);
    const rankValueByKey = new Map<string, number>();
    const entries: PsychSheetEntry[] = relayEntries
      .filter((e) => e.event === option.eventNumber)
      .flatMap((e) => {
        const legAthleteIds = [e.leg1AthleteId, e.leg2AthleteId, e.leg3AthleteId, e.leg4AthleteId];
        const relayAthleteIds = Array.from(new Set(legAthleteIds.filter(Boolean)));
        const complete =
          relayAthleteIds.length > 0 && relayAthleteIds.every((id) => athleteById.has(id));
        if (!complete) return [];
        const legNames = legAthleteIds.map((id) =>
          id ? athleteFullName(athleteById.get(id)!) : "—",
        );
        const value = rankValue(e.seedTime, false);
        if (value !== undefined) rankValueByKey.set(e.id, value);
        return [
          {
            key: e.id,
            rank: undefined,
            name: `Relay ${e.relayLetter || "?"}`,
            detail: legNames.join(", "),
            seedTime: e.seedTime || "NT",
          },
        ];
      });
    return {
      eventNumber: option.eventNumber,
      displayName: option.name,
      relay: true,
      scheduledTime: event?.scheduledTime ?? "",
      entries: rankAndSort(entries, rankValueByKey),
    };
  });

  return [...individualGroups, ...relayGroups].sort((a, b) => a.eventNumber - b.eventNumber);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderEntryRow(entry: PsychSheetEntry): string {
  return `
    <tr>
      <td class="rank">${entry.rank ?? "—"}</td>
      <td class="name">
        ${escapeHtml(entry.name)}
        ${entry.detail ? `<div class="detail">${escapeHtml(entry.detail)}</div>` : ""}
      </td>
      <td class="classyear">${entry.classYear ?? ""}</td>
      <td class="time">${escapeHtml(entry.seedTime)}</td>
    </tr>`;
}

function renderEventSection(group: PsychSheetGroup): string {
  const rows = group.entries.length
    ? group.entries.map(renderEntryRow).join("")
    : `<tr><td colspan="4" class="empty">No entries</td></tr>`;
  return `
    <section class="event">
      <h2>
        #${group.eventNumber} — ${escapeHtml(group.displayName)}
        ${group.scheduledTime ? `<span class="slot">${escapeHtml(group.scheduledTime)}</span>` : ""}
      </h2>
      <table>
        <thead>
          <tr><th>Seed</th><th>Name</th><th>Class</th><th>Time</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

/** Builds a standalone, self-contained HTML document for the psych sheet — rendered in its own print window rather than the app's MUI theme, so it can use plain high-contrast print styling. */
export function buildPsychSheetHtml(meetName: string, groups: PsychSheetGroup[]): string {
  const printedAt = new Date().toLocaleString();
  const sections = groups.map(renderEventSection).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(meetName)} — Psych Sheet</title>
<style>
  :root { color-scheme: light; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    color: #000;
    margin: 0 auto;
    padding: 24px;
    max-width: 8.5in;
    box-sizing: border-box;
  }
  header { margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 8px; }
  header h1 { font-size: 20px; margin: 0; }
  header p { margin: 2px 0 0; font-size: 12px; color: #444; }
  .event { page-break-inside: avoid; margin-bottom: 18px; }
  .event h2 { font-size: 14px; margin: 0 0 4px; border-bottom: 1px solid #999; padding-bottom: 2px; }
  .event h2 .slot { float: right; font-weight: normal; color: #555; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 2px 6px; vertical-align: top; }
  thead th { border-bottom: 1px solid #000; font-size: 11px; text-transform: uppercase; color: #333; }
  td.rank, th:nth-child(1) { width: 40px; }
  td.classyear, th:nth-child(3) { width: 60px; }
  td.time, th:nth-child(4) { width: 80px; text-align: right; }
  .detail { font-size: 10.5px; color: #555; }
  .empty { color: #777; font-style: italic; }
  @page { size: letter; margin: 0.5in; }
  @media print {
    body { max-width: none; padding: 0; }
  }
</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(meetName)} — Psych Sheet</h1>
    <p>Printed ${escapeHtml(printedAt)}</p>
  </header>
  ${sections}
</body>
</html>`;
}

/** Opens the psych sheet in a new browser tab and triggers the print dialog — a plain document rather than a MUI dialog, so it prints cleanly without the app's chrome. */
export function printPsychSheet(meetName: string, groups: PsychSheetGroup[]): void {
  const html = buildPsychSheetHtml(meetName, groups);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
