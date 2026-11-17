import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import {
  fetchArchiveResults,
  externalFileViewerUrl,
  archiveYearUrl,
  type ArchiveFile,
} from "../domain/archive";
import { findMeetTemplate } from "../domain/meetTemplates";

interface ArchiveTabProps {
  sourceTemplateId: string | undefined;
}

function ArchiveTab({ sourceTemplateId }: ArchiveTabProps) {
  const [files, setFiles] = useState<ArchiveFile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const template = findMeetTemplate(sourceTemplateId);
  const meetType = template?.meetType;
  const season = template?.season;

  useEffect(() => {
    if (!meetType || !season) return;
    let cancelled = false;
    const load = () => {
      setLoading(true);
      setError(null);
      fetchArchiveResults(meetType, season)
        .then((result) => {
          if (!cancelled) setFiles(result);
        })
        .catch((err: unknown) => {
          if (!cancelled)
            setError(err instanceof Error ? err.message : "Failed to load archive.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [meetType, season]);

  if (!meetType || !season) {
    return (
      <Typography color="text.secondary" sx={{ p: 1 }}>
        This meet isn't associated with a conference, sectional, or state template, so there's no
        archive to show.
      </Typography>
    );
  }

  if (loading) {
    return (
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" sx={{ p: 1 }}>
        {error}
      </Typography>
    );
  }

  if (!files || files.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ p: 1 }}>
        No archived results found.
      </Typography>
    );
  }

  const filesByYear = new Map<string, ArchiveFile[]>();
  for (const file of files) {
    const group = filesByYear.get(file.year) ?? [];
    group.push(file);
    filesByYear.set(file.year, group);
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>School Year</TableCell>
            <TableCell>Results</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[...filesByYear.entries()].map(([year, yearFiles]) => (
            <TableRow key={year}>
              <TableCell sx={{ whiteSpace: "nowrap", verticalAlign: "top" }}>
                <Link href={archiveYearUrl(meetType, season, year)} target="_blank" rel="noopener">
                  {year}
                </Link>
              </TableCell>
              <TableCell>
                {yearFiles.map((file, index) => (
                  <Box key={file.s3Path} sx={{ mt: index > 0 ? 0.5 : 0 }}>
                    <Link
                      href={externalFileViewerUrl(file, window.location.href)}
                      target="_blank"
                      rel="noopener"
                    >
                      {file.name}
                    </Link>
                  </Box>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export default ArchiveTab;
