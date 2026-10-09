# How To

ChampionshipEntries builds a championship meet's entries: a roster of athletes, their individual and relay entries, and a HY3 file you can hand off to Hy-Tek Meet Manager.
Everything below happens inside one meet at a time, and all of your data is saved only in this browser — nothing is uploaded anywhere.
See **Managing meets** and **Data & privacy** at the bottom for more on that.

---

## 1. Create a meet

Click a template under **Meet Templates** in the sidebar (e.g. "2026 Fall State Championships") to preview a ready-made template with its events and entries already stubbed.
A template is read-only — click its copy icon (or use **File → Copy Template**) to turn it into your own editable meet.
Copying a template automatically imports its EV3 event file and stubs a certain number individual and relay entries as a starting point.

Alternatively, click the **+** next to "Meets" in the sidebar, or use **File → New Meet**, then give it a name.
The new meet opens with empty Team, Events, Athletes, Individual Entries, and Relay Entries tabs.

## 2. Set the team

On the **Team** tab, search for your school in the Team Code field.

## 3. Import the event list

If you started from a meet template, this is already done for you — the template's EV3 file is imported automatically when you copy it.

On the **Events** tab, click **Import EV3 File** and choose the .ev3 file for the meet (exported from Hy-Tek Meet Manager).
This is what supplies the event choices used everywhere else in the app — you'll generally want to do this before adding entries.

## 4. Add athletes

On the **Athletes** tab, build your roster with first name, last name, gender (G/B/W/M), and class year.
You can:

- **Add Athlete** — add one blank row and fill it in.
- **Bulk Add Athletes** — add several blank rows at once.
- **Import CSV** — upload a file or paste spreadsheet data, then map its columns to First Name, Last Name, Gender, and Class Year.
- **Import from Another Meet** — copy athletes from another meet you're working on.

## 5. Add individual entries

On the **Individual Entries** tab, each row is one athlete's entry in one event: pick the **Event** (from the imported EV3 file), the **Athlete**, and an optional **Seed Time** as `M:SS.hh` or `SS.hh` (e.g. `2:15.30` or `58.21`) — leave it blank for no seed time.

## 6. Add relay entries

The **Relay Entries** tab works the same as Individual Entries, with a **Relay** letter (A–D).

## 7. Review and export

The **By Event** tab groups entries by event instead of by type, so you can see at a glance which events are empty, over their entry limit, or have duplicate/over-limit entries flagged.

When you're ready, use **File → Export to HY3** (needs a team code and an imported EV3 file).
A review panel opens first, flagging events over their entry limit, duplicate individual/relay entries, and entries that will be skipped (a missing athlete, an incomplete relay leg, or an event not found in the imported file) — skipped entries are left out of the file, while duplicates and over-limit entries are exported as-is.
Fix what you want to fix, then click **Export** (or **Export Anyway**) to download the .hy3 entries file you can bring into Hy-Tek Meet Manager.

---

## Editing tips

The Athletes, Individual Entries, and Relay Entries grids behave like a spreadsheet:

- Click a cell to edit it; press Enter or Tab, or click away, to save the change.
- Click and drag (or Shift+click) to select a range of cells, then Ctrl/Cmd+C and Ctrl/Cmd+V to copy and paste — including to and from Excel or Google Sheets.
- Arrow keys move between cells; Ctrl/Cmd+Arrow jumps to the edge of a block of filled cells; Shift+Arrow extends the selection.
- Delete or Backspace clears the selected cell(s).
- **Undo** and **Redo** in the top toolbar (or Ctrl+Z / Ctrl+Y) step back and forward through your changes.
- **Clear All** in a grid's toolbar removes every row of that type from the meet.

## Managing meets

The sidebar lists every meet you've created.
Click a meet to switch to it, double-click its name to rename it, and use the delete icon to remove it.
**File → Copy Meet** duplicates the current meet (including its athletes and entries) as a starting point for a similar meet.
The current meet and tab are also reflected in the page URL, so you can bookmark it.

## Data & privacy

All meets, athletes, and entries are stored only in this browser's local storage — nothing is sent to a server.
That also means clearing your browser's site data will erase everything, so keep a backup of anything important.
**File → Export Meet Backup** saves the current meet (team, athletes, and all entries) as a JSON file, and **File → Import Meet** loads that file back in as a new meet — on this browser or another device entirely.
**File → Export All Data** does the same for every meet at once, and **File → Import All Data** loads a full backup back in; if any meets collide by id with ones you already have, you'll be asked whether to keep or replace each one.
Export CSV (or Export to HY3) works too, for just the roster or HY3 file.
