import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import type { Athlete, IndividualEntry, Meet, RelayEntry } from "../types";
import { buildHy3File } from "../domain/hy3Export";
import { fetchHighSchools } from "../domain/highSchools";

type AdvancedSubTab = "ev3" | "hy3";

interface AdvancedTabProps {
  meet: Meet;
  athletes: Athlete[];
  individualEntries: IndividualEntry[];
  relayEntries: RelayEntry[];
}

function CodeView({ text }: { text: string }) {
  return (
    <Box
      component="pre"
      sx={{
        flex: 1,
        minHeight: 0,
        m: 0,
        p: 1.5,
        overflow: "auto",
        fontFamily: "monospace",
        fontSize: 12,
        bgcolor: "action.hover",
        borderRadius: 1,
        whiteSpace: "pre",
      }}
    >
      {text}
    </Box>
  );
}

function AdvancedTab({ meet, athletes, individualEntries, relayEntries }: AdvancedTabProps) {
  const [subTab, setSubTab] = useState<AdvancedSubTab>("ev3");
  const [hy3Content, setHy3Content] = useState<string | null>(null);
  const [hy3Error, setHy3Error] = useState<string | null>(null);
  const [hy3Loading, setHy3Loading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setHy3Loading(true);
    setHy3Error(null);
    setHy3Content(null);

    const build = (highSchool: Parameters<typeof buildHy3File>[4]) => {
      if (cancelled) return;
      const result = buildHy3File(meet, athletes, individualEntries, relayEntries, highSchool);
      if ("error" in result) {
        setHy3Error(result.error);
      } else {
        setHy3Content(result.content);
      }
      setHy3Loading(false);
    };

    if (!meet.teamCode) {
      build(undefined);
      return;
    }
    fetchHighSchools()
      .then((highSchools) => build(highSchools.find((h) => h.code === meet.teamCode)))
      .catch(() => build(undefined));

    return () => {
      cancelled = true;
    };
    // Deliberately built once per visit to this tab (meet.id), not on every
    // athlete/entry edit made while the tab is not showing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meet.id]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Tabs
        value={subTab}
        onChange={(_, value: AdvancedSubTab) => setSubTab(value)}
        sx={{ borderBottom: 1, borderColor: "divider", minHeight: 36, mb: 1 }}
      >
        <Tab label="EV3 File" value="ev3" sx={{ minHeight: 36 }} />
        <Tab label="HY3 Preview" value="hy3" sx={{ minHeight: 36 }} />
      </Tabs>
      <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        {subTab === "ev3" &&
          (meet.importedEventsRaw ? (
            <CodeView text={meet.importedEventsRaw} />
          ) : (
            <Typography color="text.secondary" sx={{ p: 1 }}>
              No EV3 file has been imported for this meet yet. Import one on the Events tab.
            </Typography>
          ))}
        {subTab === "hy3" &&
          (hy3Loading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1 }}>
              <CircularProgress size={18} />
              <Typography color="text.secondary">Generating HY3 preview...</Typography>
            </Box>
          ) : hy3Error ? (
            <Typography color="text.secondary" sx={{ p: 1 }}>
              {hy3Error}
            </Typography>
          ) : (
            <CodeView text={hy3Content ?? ""} />
          ))}
      </Box>
    </Box>
  );
}

export default AdvancedTab;
