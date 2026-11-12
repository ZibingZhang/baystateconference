// Builds this BSC sheet's PDF client-side from the `events` data embedded
// by _layouts/bsc-sheet.html, by generating a .tex document and compiling
// it via Siglum's WASM pdfTeX engine (https://github.com/SiglumProject/siglum),
// then replaces this page with the result. Uses LaTeX's `multicols` to
// balance columns by actual rendered height, rather than the manual
// entries-length heuristic the earlier pdfmake version needed (see
// jekyll/_pdfmake-backup/).
(function () {
  var script = document.currentScript;
  var title = script.getAttribute("data-title");
  var mode = script.getAttribute("data-sheet-kind");

  var SIGLUM_ENGINE_URL = "https://cdn.jsdelivr.net/npm/@siglum/engine@0.2.2/+esm";

  // Escapes every interpolated value before it lands in the .tex source -
  // a stray LaTeX special character can corrupt a table or fail the whole
  // compile. \ must go first since every other replacement contains one.
  var TEX_ESCAPES = [
    [/\\/g, "\\textbackslash{}"],
    [/\{/g, "\\{"],
    [/\}/g, "\\}"],
    [/\$/g, "\\$"],
    [/&/g, "\\&"],
    [/#/g, "\\#"],
    [/\^/g, "\\textasciicircum{}"],
    [/_/g, "\\_"],
    [/~/g, "\\textasciitilde{}"],
    [/%/g, "\\%"],
  ];

  function tex(value) {
    var text = String(value == null ? "" : value);
    TEX_ESCAPES.forEach(function (pair) {
      text = text.replace(pair[0], pair[1]);
    });
    return text;
  }

  function name(entry) {
    var last = entry["Last Name"], first = entry["First Name"];
    if (!last && !first) return "";
    return tex(last) + ", " + tex(first);
  }

  function finalsCell(entry, scoreKey, qualifierInline, exhibitionAllowed) {
    var status = entry["Status"];
    if (status === "DQ" || status === "SCR") return status;
    var text = tex(entry[scoreKey]);
    if (exhibitionAllowed !== false && entry["Exhibition"] === "True") text = "x" + text;
    if (qualifierInline && entry["Qualifier"]) text += " " + tex(entry["Qualifier"]);
    return text;
  }

  // A score of 0 prints as a blank cell, not "0" - readers scan this
  // column for who scored.
  function pointsCell(entry) {
    var points = entry["Points"];
    if (points == null || points === "" || Number(points) === 0) return "";
    return tex(points);
  }

  // Fixed point-widths shared by every row, so columns line up across
  // tables regardless of each table's own content (see fixedBox/flexBox).
  var PLACE_W = 18; // Place/Lane
  var YEAR_W = 14; // Yr
  var CODE_W = 26; // School/Team (4-letter code)
  var TIME_W = 44; // Seed/Finals time or diving score; wider than a bare
  // time needs, to leave room for the leading "x" an exhibition swim gets
  var QUAL_W = 20; // Qualifier code
  var RELAY_W = 24; // Relay letter/designation
  var POINTS_W = 16; // Points scored (results mode only)
  var EVENT_NUM_W = 54; // "Event " + a 1-2 digit number, in eventHeading

  // Explicit \fontsize (not \large) so headings render exactly 1pt above
  // the 8pt body text, independent of the document's base size.
  var HEADER_FONT = "\\fontsize{9}{10.8}\\selectfont";

  // A fixed-width field (times/scores right-aligned so digits line up on
  // the ones place), or (w === null) a flexible one that soaks up whatever
  // \linewidth - the engine's own computed column width - has left after
  // the fixed fields on the same line.
  function fixedBox(w, text, align) {
    return "\\makebox[" + w + "pt][" + (align || "l") + "]{" + text + "}";
  }

  function flexBox(fixedTotal, text) {
    return "\\makebox[\\dimexpr\\linewidth-" + fixedTotal + "pt\\relax][l]{" + text + "}";
  }

  // One line of fields, each {w: <pt number> | null, text}; at most one
  // field should have w === null. Deliberately not a tabular/longtable/
  // supertabular row - those become a single box multicols can't split
  // across columns, which is the uneven-column problem this rewrite exists
  // to fix. Plain \\-terminated \makebox lines are ordinary breakable
  // paragraph content instead, which multicols balances correctly.
  // `brk` is the line-break token: "\\\\" normally, "\\\\[Npt]" for extra
  // space below a row, or "\\par" for a header row followed by \hrule
  // (a "\\\\" there would leave a phantom blank line pushing \hrule too
  // far below the header text).
  // \makebox fields sit flush against each other with no gap by default,
  // so FIELD_GAP adds a small space after every field (folded into the
  // flexible field's own width budget so the line still totals \linewidth).
  var FIELD_GAP = 3;

  function fieldLine(fields, brk) {
    var fixedTotal = fields.reduce(function (sum, f) { return f.w != null ? sum + f.w : sum; }, 0) + fields.length * FIELD_GAP;
    var text = fields.map(function (f) {
      var box = f.w != null ? fixedBox(f.w, f.text, f.align) : flexBox(fixedTotal, f.text);
      return box + "\\hspace{" + FIELD_GAP + "pt}";
    }).join("");
    return text + (brk != null ? brk : "\\\\") + "\n";
  }

  // Seed/Finals time or diving score field - right-aligned (see fixedBox)
  // so times line up on the ones place.
  function timeField(text) {
    return { w: TIME_W, text: text, align: "r" };
  }

  // Returns { header, rows } rather than one string so eventBlock can glue
  // the heading to just the first row. `firstRowBrk`, if given, overrides
  // row 0's line-break token (see fieldLine's `brk`) for the row ending
  // right before a \end{minipage}.
  function individualOrDivingTable(entries, mode, seedKey, finalsKey, exhibitionAllowed, firstRowBrk) {
    var header;
    if (mode === "results") {
      // No Seed field - a results sheet is read after the fact, so Points
      // is more useful there. No "Place"/"Pl" label - it overflows
      // PLACE_W or reads as redundant.
      header = [{ w: PLACE_W, text: "" }, { w: null, text: "Name" }, { w: YEAR_W, text: "Yr" }, { w: CODE_W, text: "School" }, { w: TIME_W, text: "Finals" }, { w: QUAL_W, text: "Qual" }, { w: POINTS_W, text: "Pts" }];
    } else if (mode === "heat") {
      header = [{ w: PLACE_W, text: "Lane" }, { w: null, text: "Name" }, { w: YEAR_W, text: "Yr" }, { w: CODE_W, text: "School" }, { w: TIME_W, text: "Seed" }];
    } else {
      header = [{ w: null, text: "Name" }, { w: YEAR_W, text: "Yr" }, { w: CODE_W, text: "School" }, { w: TIME_W, text: "Seed" }];
    }

    // \vspace subtracts \prevdepth (the header line's measured depth, which
    // varies with descenders like "Relay") so \hrule sits a consistent
    // distance below the header text regardless of which header it is.
    // The \fontsize group must stay open past that \vspace, or closing it
    // first would reset \prevdepth before the \vspace reads it.
    var headerBlock = "{" + HEADER_FONT + fieldLine(header, "\\par") + "\\vspace{\\dimexpr 1.5pt-\\prevdepth\\relax}\\hrule\n\\vspace{3pt}}\n";
    var rows = entries.map(function (entry, idx) {
      var fields = [];
      if (mode === "results") fields.push({ w: PLACE_W, text: tex(entry["Place"]) });
      if (mode === "heat") fields.push({ w: PLACE_W, text: tex(entry["Lane"]) });
      fields.push({ w: null, text: name(entry) }, { w: YEAR_W, text: tex(entry["Year"]) }, { w: CODE_W, text: tex(entry["School"]) });
      if (mode !== "results") fields.push(timeField(tex(entry[seedKey])));
      if (mode === "results") {
        fields.push(timeField(finalsCell(entry, finalsKey, false, exhibitionAllowed)), { w: QUAL_W, text: tex(entry["Qualifier"]) }, { w: POINTS_W, text: pointsCell(entry) });
      }
      return fieldLine(fields, idx === 0 && firstRowBrk != null ? firstRowBrk : "\\\\");
    });

    return { header: headerBlock, rows: rows };
  }

  // Each squad's 4 swimmers below its row: "N) Last, First Age", 2 per
  // line (1&3 left, 2&4 right) via 2 side-by-side minipages. `brk` extends
  // extra space below so squads read as distinct blocks, overridable for
  // the row ending right before a \end{minipage} (see individualOrDivingTable's
  // firstRowBrk).
  function relaySwimmersLine(entry, brk) {
    var legs = [];
    for (var i = 1; i <= 4; i++) {
      var last = entry["Last Name " + i];
      if (!last) continue;
      legs.push(i + ") " + tex(last) + ", " + tex(entry["First Name " + i]) + " " + tex(entry["Year " + i]));
    }
    var left = [legs[0], legs[2]].filter(Boolean).join("\\\\");
    var right = [legs[1], legs[3]].filter(Boolean).join("\\\\");
    return "\\begin{minipage}[t]{0.5\\linewidth}\\raggedright " + left + "\\end{minipage}%\n" +
      "\\begin{minipage}[t]{0.5\\linewidth}\\raggedright " + right + "\\end{minipage}" + (brk != null ? brk : "\\\\[5pt]") + "\n";
  }

  // Team, not Seed/Finals, is the flexible field - a relay row has no
  // naturally-long field like Name, so whichever field is last must be
  // fixed-width (the flex box's leftover space needs something fixed to
  // its right to anchor against). Putting Team first and flexible pushes
  // Relay/Seed/Finals/Pts into a block pinned at the column's right edge.
  function relayTable(entries, mode, firstRowBrk) {
    var header;
    if (mode === "results") {
      header = [{ w: PLACE_W, text: "" }, { w: null, text: "Team" }, { w: RELAY_W, text: "Relay" }, { w: TIME_W, text: "Finals" }, { w: QUAL_W, text: "Qual" }, { w: POINTS_W, text: "Pts" }];
    } else if (mode === "heat") {
      header = [{ w: PLACE_W, text: "Lane" }, { w: null, text: "Team" }, { w: RELAY_W, text: "Relay" }, { w: TIME_W, text: "Seed" }];
    } else {
      header = [{ w: null, text: "Team" }, { w: RELAY_W, text: "Relay" }, { w: TIME_W, text: "Seed" }];
    }

    // See individualOrDivingTable's headerBlock for why \vspace subtracts
    // \prevdepth and the \fontsize group stays open across it.
    var headerBlock = "{" + HEADER_FONT + fieldLine(header, "\\par") + "\\vspace{\\dimexpr 1.5pt-\\prevdepth\\relax}\\hrule\n\\vspace{3pt}}\n";
    var rows = entries.map(function (entry, idx) {
      var fields;
      if (mode === "results") {
        fields = [{ w: PLACE_W, text: tex(entry["Place"]) }, { w: null, text: tex(entry["Team"]) }, { w: RELAY_W, text: tex(entry["Relay"]) }, timeField(finalsCell(entry, "Finals Time", false)), { w: QUAL_W, text: tex(entry["Qualifier"]) }, { w: POINTS_W, text: pointsCell(entry) }];
      } else if (mode === "heat") {
        fields = [{ w: PLACE_W, text: tex(entry["Lane"]) }, { w: null, text: tex(entry["Team"]) }, { w: RELAY_W, text: tex(entry["Relay"]) }, timeField(tex(entry["Seed Time"]))];
      } else {
        fields = [{ w: null, text: tex(entry["Team"]) }, { w: RELAY_W, text: tex(entry["Relay"]) }, timeField(tex(entry["Seed Time"]))];
      }
      // Swimmer legs only print on the results sheet - heat/psych sheets
      // seed heats before the meet is swum, so a squad's 4 swimmers aren't
      // settled yet. The firstRowBrk override is applied on whichever call
      // produces row 0's actual last token: relaySwimmersLine in results
      // mode (with its own default [5pt] gap re-added after the override,
      // so row 0's spacing still matches every other row).
      var isFirst = idx === 0 && firstRowBrk != null;
      // \\* (not \\), on the results sheet, so a column/page break can't
      // land between a squad's place/time/points line and its names - \\*
      // is \\ plus \nobreak, and unlike wrapping the pair in a minipage
      // (which was tried and reverted - it broke the normal \baselineskip
      // spacing between every squad in a way that needed its own fragile
      // depth correction) a bare penalty doesn't touch spacing at all,
      // it only forbids breaking at that one point.
      var line = fieldLine(fields, mode === "results" ? "\\\\*" : isFirst ? firstRowBrk : "\\\\");
      if (mode === "results") line += relaySwimmersLine(entry, isFirst ? firstRowBrk + "\\vspace{5pt}" : "\\\\[5pt]");
      return line;
    });

    return { header: headerBlock, rows: rows };
  }

  function tableFor(event, entries, mode, firstRowBrk) {
    if (event.kind === "relay") return relayTable(entries, mode, firstRowBrk);
    if (event.kind === "diving") return individualOrDivingTable(entries, mode, "Seed Score", "Finals Score", false, firstRowBrk);
    return individualOrDivingTable(entries, mode, "Seed Time", "Finals Time", true, firstRowBrk);
  }

  // Concatenates a { header, rows } table back into one flat string, for
  // callers (just the heat-sheet path below) that don't need to split off
  // the first row from the rest.
  function renderTable(table) {
    return table.header + table.rows.join("");
  }

  // "Event N" sits in a fixed-width box (same tab-stop idiom as every
  // table row's own fields) rather than before a literal "---" separator,
  // so the event name starts at the same x position under "Event 1" as it
  // does under "Event 23".
  function eventHeading(event) {
    return "{" + HEADER_FONT + "\\bfseries \\makebox[" + EVENT_NUM_W + "pt][l]{Event " + tex(event.event_num) + "}" +
      tex(event.gender_label) + " " + tex(event.event_name) + "}\\par\\smallskip\n";
  }

  // Highest lane number used anywhere in the meet's swimming heats (not
  // diving, which has no real lanes), so every heat can be padded to it.
  function maxSwimLanes(events) {
    var max = 0;
    events.forEach(function (event) {
      if (event.kind === "diving") return;
      (event.entries || []).forEach(function (group) {
        (group.entries || []).forEach(function (entry) {
          var lane = parseInt(entry["Lane"], 10);
          if (!isNaN(lane) && lane > max) max = lane;
        });
      });
    });
    return max;
  }

  // Pads `entries` out to lane 1..maxLanes so an unused lane still prints
  // (as a blank row) rather than looking like a missing row.
  function padLanes(entries, maxLanes) {
    var byLane = {};
    entries.forEach(function (entry) { byLane[entry["Lane"]] = entry; });
    var padded = [];
    for (var lane = 1; lane <= maxLanes; lane++) {
      padded.push(byLane[String(lane)] || { "Lane": String(lane) });
    }
    return padded;
  }

  function eventBlock(event, mode, maxLanes) {
    if (mode === "heat-sheet") {
      var flightLabel = event.kind === "diving" ? "Flight " : "Heat ";
      var totalHeats = event.entries.length;
      // Each heat is its own minipage so it always lands intact in one
      // column - multicols can't break inside a box, only between
      // paragraph lines. The event heading goes inside heat 0's minipage
      // so a column/page break can't strand it apart from heat 1.
      return event.entries.map(function (group, heatIdx) {
        var entries = event.kind === "diving" ? group.entries : padLanes(group.entries, maxLanes);
        return "\\begin{minipage}{\\linewidth}\n" +
          (heatIdx === 0 ? eventHeading(event) : "") +
          "{\\bfseries " + flightLabel + tex(group.heat) + " of " + totalHeats + "}\\par\\smallskip\n" +
          renderTable(tableFor(event, entries, "heat")) +
          "\\end{minipage}\\par\\bigskip\n";
      }).join("");
    }
    // Heading + table header + first row are wrapped in one minipage so a
    // column/page break can't strand the heading with none of its results.
    // Later rows are left out of the box, free to spill into the next
    // column/page on their own - a relay row's own place/time/points line
    // can't be separated from its names-and-splits block either, but
    // that's handled with a \nobreak penalty in relayTable (see \\* there)
    // rather than another box: boxing every row was tried and reverted, it
    // broke the normal \baselineskip spacing between every squad in a way
    // that needed its own fragile depth correction, where a bare penalty
    // doesn't touch spacing at all - it only forbids breaking at one point.
    var table = tableFor(event, event.entries, mode, "\\par");
    var firstRow = table.rows.length ? table.rows[0] : "";
    var laterRows = table.rows.slice(1).join("");
    // A minipage box's reported depth doesn't match an ordinary text
    // line's depth, so the automatic \baselineskip-based gap LaTeX computes
    // for the line that follows the box (row 2) comes out visibly tighter
    // than every other row-to-row gap (which has no box in the way).
    //
    // \dp\strutbox looks like the fix (it's "the depth a normal line would
    // have"), but \strutbox only reflects that if something has called
    // \strut to refresh it - this document never does, so it can hold a
    // stale depth from a wholly different font/size and made the gap
    // *worse* in testing. \settodepth instead re-typesets row 1's own
    // content right there in the live font and measures its actual depth,
    // then feeds that to \prevdepth, so row 2's \baselineskip calculation
    // uses the same input every other row-to-row transition does -
    // regardless of engine/font build and regardless of whether this
    // particular row's content even has descenders.
    //
    // The content handed to \settodepth must have row 1's own trailing
    // break token(s) stripped first: \par (or \par\vspace{5pt}, which a
    // *relay* row on the results sheet adds after its swimmer-names block)
    // is a vertical-mode command and can't appear inside the \hbox
    // \settodepth builds to do the measuring.
    var depthFix = firstRow
      ? "\\settodepth{\\eventrowdepth}{" + firstRow.replace(/\\par(?:\\vspace\{5pt\})?\s*$/, "") + "}\\prevdepth=\\eventrowdepth\n"
      : "";
    return "\\begin{minipage}{\\linewidth}\n" + eventHeading(event) + table.header + firstRow +
      "\\end{minipage}\\par\n" + depthFix + laterRows + "\\par\\bigskip\n";
  }

  // /Title expects PDFDocEncoding or UTF-16BE, not UTF-8 - raw UTF-8 here
  // renders as mojibake in the viewer's tab title. The only non-ASCII
  // character in a title is the en dash, so just fold it to a hyphen
  // rather than encoding the whole string.
  function pdfInfoEscape(value) {
    return String(value)
      .replace(/–/g, "-")
      .replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  // mathptmx (pdfTeX's usual Times substitute) fails to load under
  // Siglum's package fetch; Siglum's XeLaTeX (needed for a real TrueType
  // font like Tinos) fails on any document at all, even with no custom
  // fonts. tgtermes works under plain pdfLaTeX, so use that instead.
  function buildTexDocument(events, mode, title) {
    var maxLanes = mode === "heat-sheet" ? maxSwimLanes(events) : 0;
    var body = events.map(function (event) { return eventBlock(event, mode, maxLanes); }).join("");

    return [
      "\\documentclass[8pt]{extarticle}",
      "\\usepackage[T1]{fontenc}",
      "\\usepackage{tgtermes}",
      "\\usepackage[margin=0.5in]{geometry}",
      "\\usepackage{multicol}",
      // Scratch register eventBlock uses to measure a boxed event's first
      // row so the gap to its second row can be corrected (see eventBlock).
      "\\newdimen\\eventrowdepth",
      "\\setlength{\\parindent}{0pt}",
      "\\pagestyle{empty}",
      "\\pdfinfo{ /Title (" + pdfInfoEscape(title) + ") }",
      "\\begin{document}",
      "\\begin{center}\\LARGE\\bfseries " + tex(title) + "\\end{center}\\bigskip",
      // Without this, multicol stretches/shrinks interline and paragraph
      // glue to make column heights match, so the same table's spacing
      // (e.g. header-to-\hrule gap) varies column to column. \raggedcolumns
      // leaves leftover height as blank space instead.
      "\\raggedcolumns",
      "\\begin{multicols}{2}",
      body,
      "\\end{multicols}",
      "\\end{document}",
      "",
    ].join("\n");
  }

  function showError() {
    var el = document.querySelector(".bsc-sheet-redirect-error");
    if (el) el.hidden = false;
  }

  var data = JSON.parse(document.getElementById("bsc-sheet-data").textContent);
  var texSource = buildTexDocument(data, mode, title);

  import(/* webpackIgnore: true */ SIGLUM_ENGINE_URL)
    .then(function (mod) {
      return mod.resolveRuntime().then(function (runtime) {
        var compiler = new mod.SiglumCompiler(runtime);
        return compiler.init().then(function () {
          return compiler.compile(texSource, { engine: "pdflatex" });
        });
      });
    })
    .then(function (result) {
      if (!result.success) {
        console.error("LaTeX compile failed", result.log);
        throw new Error("LaTeX compile failed");
      }
      var blob = new Blob([result.pdf], { type: "application/pdf" });
      location.replace(URL.createObjectURL(blob));
    })
    .catch(function (err) {
      console.error("Failed to build PDF", err);
      showError();
    });
})();
