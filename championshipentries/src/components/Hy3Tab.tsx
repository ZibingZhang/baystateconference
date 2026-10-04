import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import type { Athlete, IndividualEntry, Meet, RelayEntry } from "../types";
import { buildHy3File } from "../domain/hy3Export";
import { fetchHighSchools } from "../domain/highSchools";
import CodeView from "./CodeView";

interface Hy3TabProps {
  meet: Meet;
  athletes: Athlete[];
  individualEntries: IndividualEntry[];
  relayEntries: RelayEntry[];
}

function Hy3Tab({ meet, athletes, individualEntries, relayEntries }: Hy3TabProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setContent(null);

    const build = (highSchool: Parameters<typeof buildHy3File>[4]) => {
      if (cancelled) return;
      const result = buildHy3File(meet, athletes, individualEntries, relayEntries, highSchool);
      if ("error" in result) {
        setError(result.error);
      } else {
        setContent(result.content);
      }
      setLoading(false);
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

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1 }}>
        <CircularProgress size={18} />
        <Typography color="text.secondary">Generating HY3 preview...</Typography>
      </Box>
    );
  }
  if (error) {
    return (
      <Typography color="text.secondary" sx={{ p: 1 }}>
        {error}
      </Typography>
    );
  }
  return <CodeView text={content ?? ""} />;
}

export default Hy3Tab;
