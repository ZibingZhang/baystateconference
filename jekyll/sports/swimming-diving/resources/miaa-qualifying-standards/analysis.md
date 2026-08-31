---
layout: page
title: MIAA Qualifying Standards Analysis
permalink: /sports/swimming-diving/resources/miaa-qualifying-standards/analysis/
breadcrumb: Analysis
exclude_from_directory: true
---

Every MIAA qualifying-standards document carries a note that times are "based on the availability of an 8 - 10 lane pool" and "may be adjusted" when a meet is held elsewhere. In practice this means the time printed as "Meet Qualifying" in a specific meet's official results can differ from the standard published in the pre-season "Qualifying Standards" document for that same division and event — the results reflect whatever was actually enforced at that meet's host pool, not necessarily the season's baseline standard. This dataset targets the pre-season published standard wherever one could be found; a meet's own results were used only as a fallback when no pre-season document was available.

Where both a pre-season standards document and a post-season meet-results document were available for the same year/division, they matched exactly in every case except the ones below. Division I/II State standards have matched between the two document types in every year checked (2021-2022, 2022-2023, 2023-2024), which tracks with State meets running at a fixed venue rather than a rotating Sectional host; every discrepancy found was at the Sectional level.

To settle which value was actually enforced, we went to the meet's own entrant list: a relay's *seed* time (its regular-season entry time, not how it happened to finish that day) tells you what the meet's software would have checked against the standard. If the slowest-seeded entrant in the field sits just a hair under one candidate value and there's a wide, suspiciously empty gap up to the other, the tighter one was almost certainly the real cut — a genuine, looser standard should have drawn in at least one slower team from that gap. For the 2023-2024 Fall rows, we instead had each Sectional's own **meet program** (the pre-meet heat sheet, a separate document from both the pre-season table and the post-meet results) — and it states its own "Meet Qualifying" line independent of either.

| School Year | Season | Division | Event | Candidate A | Candidate B | Value used | Resolved via |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2021-2022 | Winter (Girls) | South Sectional | 200 Medley Relay | 2:05.65 (pre-season) | 2:03.47 (post-season) | **2:03.47** | Slowest seed 2:02.25 — 1.22s under B, 3.40s under A |
| 2021-2022 | Winter (Girls) | South Sectional | 500 Freestyle | 5:55.73 (pre-season) | 5:43.48 (post-season) | **5:43.48** | Slowest seed 5:42.90 — 0.58s under B, 12.83s under A |
| 2021-2022 | Winter (Girls) | South Sectional | 200 Freestyle Relay | 1:52.42 (pre-season) | 1:49.80 (post-season) | **1:49.80** | Slowest seed 1:49.74 — 0.06s under B, 2.68s under A |
| 2021-2022 | Winter (Girls) | South Sectional | 400 Freestyle Relay | 4:13.24 (pre-season) | 4:04.66 (post-season) | **4:04.66** | Slowest seed 4:02.57 — 2.09s under B, 10.67s under A |
| 2023-2024 | Fall (Girls & Boys) | North Sectional | 50 Freestyle | 27.12 (standalone table) | 27.22 (results doc) | **27.22** | North Sectional meet program prints "Meet Qualifying: 27.22" for both sexes |
| 2023-2024 | Fall (Girls & Boys) | North Sectional | 100 Freestyle | 1:00.34 (standalone table) | 59.93 (results doc) | **59.93** | North Sectional meet program prints "Meet Qualifying: 59.93" for both sexes |
| 2023-2024 | Fall (Girls & Boys) | South Sectional | Diving | 183 x 2 (standalone table) | 180 x 2 (results doc) | **180 x 2** | South Sectional meet program prints "Meet Qualifying: 180.00" for both sexes |

For the four Winter 2021-2022 rows, every slowest-in-the-field seed lands within about two seconds of Candidate B (the meet's own results doc) and several seconds clear of Candidate A (the pre-season Format PDF) — consistent across four independent events, strong enough to trust the results doc over the Format PDF here. This means the pre-season Format PDF for 2021-2022 winter is now known to be wrong for at least one Sectional (Girls South), despite matching every Division I/II State value exactly.

For the three Fall 2023-2024 rows, the standalone "2023 Fall Qualifying Standards" table turned out to be the odd one out: both Sectionals' own meet programs — generated independently of the results documents, before the meets happened — state the same "Meet Qualifying" values the results documents did, not the table's. Two independent documents beat one, so those values now match what was originally extracted from the results docs.

### Girls/Boys North Sectional, Winter 2021-2022 — flagged but not corrected

North Sectional's own results document has no "Meet Qualifying" line at all (only the State Division I/II cuts it cites), and — unlike South's — no seed-time column either, so neither method above could be applied directly. Its 500 Freestyle and 400 Freestyle Relay values, inherited from the same Format PDF now known to be unreliable at the Sectional level, show a suspicious pattern: the *entire actual field*, in both events and both sexes, finished 11-15 seconds faster than the stated cutoff.

That's real evidence something is off, but not enough to safely correct it: using each field's slowest actual finish as a floor produced values *faster* than that season's own Division I/II State cuts for the same events — structurally backwards, since a Sectional cut always has to be looser than State. That most likely means the results document's field is smaller or otherwise unrepresentative for these two events (500 Free in particular draws a thin field at the high school level), not that the floor itself is trustworthy. With no seed times, no Format PDF alternative, and no other document to check against, there's nothing to correct these to, so they're left at the Format PDF's original values with this caveat rather than replaced with a worse guess.

Central/West Sectional (both sexes) has no results document in the archive at all that season, so its Format PDF values couldn't be checked by either method above — but they are independently confirmed by a *Daily Hampshire Gazette* article ([June 4, 2020](https://gazettenet.com/2020/06/04/miaa-swimming-and-diving-committee-approves-statewide-alignments-2020-21-winter-qualifying-standards-34621791/)) covering the MIAA committee's vote on qualifying standards, which lists the exact same 24 values (both sexes, all 12 events) as the ones adopted for 2020-21 — one season earlier than 2021-2022's Format PDF, meaning the standard simply held for two years running, a pattern seen elsewhere in this dataset.

### 2019-2020 and 2020-2021 Central/West Sectional, from a newspaper article

That same article also gives the *previous* season's (2019-2020) standards for comparison, filling a gap the archive has no other source for at all — no Central/West Sectional results document survives for 2019-2020 in the S3 archive, unlike North/South Sectional and Division I/II State, which do. Both years were added using this article as the sole source:
- **2019-2020** Winter Central/West Sectional, both sexes (the article's "previous season" column)
- **2020-2021** Winter Central/West Sectional, both sexes (the article's newly-approved column) — this is the only 2020-2021 data in the whole dataset. Every other 2020-2021 row was removed earlier for being an unverifiable placeholder copied from that year's Fall standards, and no archived tournament results exist for winter 2020-2021 at all (consistent with COVID disruption that season) — so while this standard was formally approved by the MIAA committee, whether a real meet was ever held to enforce it is unknown.

No pre-season standards document could be found for the following, so their values rest on meet-results documents alone and carry the same unverified risk as the rows above:
- Winter 2022-2023, Girls (all divisions) — Boys that same season matched a pre-season document with zero discrepancies, which is some reassurance, but Girls wasn't independently checked.
- Winter 2023-2024, both sexes, all Sectional divisions.
- Fall 2022-2023, Boys Division I State, 50 Freestyle — filled in from the Division II State value on the assumption the two divisions share a standard; 2023-2024's pre-season document showed that assumption fails for exactly this event (23.22 for Division I vs. 24.00 for Division II), so this one value is suspect.

## 2004-2005 through 2019-2020

These years come entirely from post-season meet-results documents in the archive — no pre-season standards document was available for any of them, so every value here carries the same "may have been adjusted for a specific meet's host pool" risk described above, with no way to cross-check it.

The division names themselves changed over time and are preserved as printed rather than mapped onto the modern North/South/Central-West scheme:
- **Fall** was Girls-only through 2011-2012 (no Boys division existed); Girls & Boys combined sectionals begin in 2012-2013. Some years used a single undifferentiated **State** division before the Division I/Division II split existed for that division that year.
- **Winter** ran Central/South, North, and West (or a combined Western Mass) Sectionals through 2016-2017, switching to today's North/South/Central-West naming starting 2017-2018.

Two things specific to this range worth knowing:
- Where a results document had a hole in it — a specific event's line just isn't in the archived text for one sex — and the *other* sex's line for the same event/year/division was present, that value was copied across. This is only safe for **Fall Sectional standards**, where a meet's entry bar is confirmed identical for Girls and Boys in every one of 112 directly-checked cases; it was never applied across the Girls-only/Boys era boundary (pre-2012-2013), and never applied to State-level standards, which do differ by sex.
- One value was excluded outright as almost certainly a typo in the original document: 2004-2005 Fall Girls North Sectional 50 Freestyle cites a "State" cut of 56.75 seconds, physically impossible for that event.
- Ten cells (mostly 2011-2012 Fall Girls Division II State) had two Sectional documents citing different values for the same state cut, with no dedicated state-results document available to break the tie; those were left blank rather than guessed.
