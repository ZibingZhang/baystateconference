# How To

ChampionshipEntries builds a championship meet's entries: a roster of athletes, their individual and relay entries, and a HY3 file you can hand off to Hy-Tek Meet Manager. Everything below happens inside one meet at a time, and all of your data is saved only in this browser — nothing is uploaded anywhere. See **Managing meets** and **Data & privacy** at the bottom for more on that.

## 1. Create a meet

Click the **+** next to "Meets" in the sidebar, or use **File → New Meet**, then give it a name. The new meet opens with empty Team, Events, Athletes, Individual Entries, and Relay Entries tabs.

Alternatively, click a template under **Meet Templates** in the sidebar (e.g. "2025 Fall Bay State Conference") to preview a ready-made example with its events and entries already filled in. A template is read-only — click its copy icon to turn it into your own editable meet, prefilled with one entry per athlete slot for every event.

## 2. Set the team

On the **Team** tab, search for your school in the Team Code field. This code is required before you can export a HY3 file.

## 3. Import the event list

On the **Events** tab, click **Import EV3 File** and choose the .ev3 file for the meet (exported from Hy-Tek Meet Manager). This is what supplies the event choices used everywhere else in the app — you'll generally want to do this before adding entries. **Clear Import** removes the imported list; existing entries aren't deleted, but you won't be able to add new ones with valid event names until you re-import.

## 4. Add athletes

On the **Athletes** tab, build your roster with first name, last name, gender (G/B/W/M), and class year. You can:

- **Add Athlete** — add one blank row and fill it in.
- **Bulk Add Athletes** — add several blank rows at once.
- **Import CSV** — upload a file or paste spreadsheet data, then map its columns to First Name, Last Name, Gender, and Class Year.
- **Export CSV** — download or copy the current roster.

## 5. Add individual entries

On the **Individual Entries** tab, each row is one athlete's entry in one event: pick the **Event** (from the imported EV3 file), the **Athlete**, and an optional **Seed Time** as `M:SS.hh` or `SS.hh` (e.g. `2:15.30` or `58.21`) — leave it blank for no seed time. Add rows one at a time, or use **Bulk Add Entries** to create a set number of blank entries for one or more events at once (checkboxes let you select by gender group or all events). Import/Export CSV work the same way as on the Athletes tab.

## 6. Add relay entries

The **Relay Entries** tab works the same as Individual Entries, with a **Relay** letter (A–D) and up to four athletes for the relay's legs instead of a single athlete.

## 7. Review and export

The **Advanced** tab shows the raw imported EV3 text and a live preview of the HY3 file that would be generated, useful for double-checking before you export. When you're ready, use **File → Export to HY3** (needs a team code and an imported EV3 file) to download a .hy3 entries file you can bring into Hy-Tek Meet Manager. Any entry whose athlete or event can't be matched (a missing athlete, an incomplete relay leg, or an event not found in the imported file) is skipped, and you'll be told how many were skipped after the download.

## Editing tips

The Athletes, Individual Entries, and Relay Entries grids behave like a spreadsheet:

- Click a cell to edit it; press Enter or Tab, or click away, to save the change.
- Click and drag (or Shift+click) to select a range of cells, then Ctrl/Cmd+C and Ctrl/Cmd+V to copy and paste — including to and from Excel or Google Sheets.
- Arrow keys move between cells; Ctrl/Cmd+Arrow jumps to the edge of a block of filled cells; Shift+Arrow extends the selection.
- Delete or Backspace clears the selected cell(s).
- **Undo** and **Redo** in the top toolbar (or Ctrl+Z / Ctrl+Y) step back and forward through your changes.
- **Clear All** in a grid's toolbar removes every row of that type from the meet.

## Managing meets

The sidebar lists every meet you've created. Click a meet to switch to it, double-click its name to rename it, use the copy icon to duplicate it (including its athletes and entries) as a starting point for a similar meet, and the delete icon to remove it. The current meet and tab are also reflected in the page URL, so you can bookmark or share a link back to a specific meet and tab.

---

## Data & privacy

All meets, athletes, and entries are stored only in this browser's local storage — nothing is sent to a server. That also means clearing your browser's site data will erase everything, so use Export CSV (or Export to HY3) to keep a backup of anything important.
