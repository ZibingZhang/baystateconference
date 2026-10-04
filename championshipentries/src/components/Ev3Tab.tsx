import Typography from "@mui/material/Typography";
import CodeView from "./CodeView";

interface Ev3TabProps {
  importedEventsRaw: string | undefined;
}

function Ev3Tab({ importedEventsRaw }: Ev3TabProps) {
  if (!importedEventsRaw) {
    return (
      <Typography color="text.secondary" sx={{ p: 1 }}>
        No EV3 file has been imported for this meet yet. Import one on the Events tab.
      </Typography>
    );
  }
  return <CodeView text={importedEventsRaw} />;
}

export default Ev3Tab;
