# EMISCA award data

Recipient data in this directory comes from EMISCA's own site: `https://sites.google.com/view/emiscaawards/past-recipients`.

The entire recipient history — award name, year, and recipient string, every record, not just the current page — is server-rendered directly into the page's HTML as a plain JSON array, hidden in a `<script>` tag as HTML-entity-escaped text. No JavaScript execution, login, or browser needed — a plain HTTP GET returns it.

## Fetching it

```sh
curl -s "https://sites.google.com/view/emiscaawards/past-recipients?authuser=0" -o past-recipients.html
```

## Extracting the data

```python
import re, html, json

with open("past-recipients.html") as f:
    content = f.read()

# Locate the JSON array literal: search for a known field name, then walk
# outward to find its enclosing `[ ... ]` (bracket-depth matching, since the
# array contains nested objects).
idx = content.find('{&quot;year&quot;')
start = content.rfind('[', 0, idx)
depth = 0
i = start
end = None
while i < len(content):
    if content[i] == '[':
        depth += 1
    elif content[i] == ']':
        depth -= 1
        if depth == 0:
            end = i
            break
    i += 1

data = json.loads(html.unescape(content[start:end + 1]))
# data is now a list of {"year": "...", "award": "...", "recipient": "..."} dicts
```

Each record looks like:

```json
{"year": "2024-25", "award": "Peter Foley Student Athlete of the Year - Girls", "recipient": "Zuri Ferguson (Attleboro); Isabela Teixeira (Acton Boxboro)"}
```

Notes for parsing `recipient`:
- Multiple co-recipients in one record are joined with `;`, or occasionally with `and`/`&`.
- Division/region tags sometimes prefix a name (`"South - ..."`, `"Div I - ..."`).
- The school/org is usually appended after ` - ` or in `(parentheses)`, but hyphenated surnames (e.g. "Ackerman-Vallala") share that same `-` character — don't split on the *first* hyphen blindly, check it's actually a name/school separator.

`year` is sometimes a full range ("2025-2026"), sometimes an abbreviated range ("2024-25"), and sometimes a bare single year ("2025") depending on the award — EMISCA isn't internally consistent about this, so always expand to the full `StartYYYY-EndYYYY` form per the award's own convention rather than assuming one global pattern.

The Hall of Fame roster (`sites.google.com/view/emiscaawards/hall-of-fame`) is a separate page/dataset from Past Recipients and wasn't checked for the same embedded-JSON shortcut — if revisiting that page, check first before falling back to screenshots.
