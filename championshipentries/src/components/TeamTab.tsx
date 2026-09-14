import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { fetchHighSchools } from "../domain/highSchools";
import { filterBySubsequence } from "../utils/subsequenceMatch";
import type { HighSchool } from "../types";

interface TeamTabProps {
  teamCode: string | undefined;
  onUpdate: (teamCode: string) => void;
  readOnly?: boolean;
  onReadOnlyAttempt?: () => void;
}

function TeamTab({ teamCode, onUpdate, readOnly, onReadOnlyAttempt }: TeamTabProps) {
  const [highSchools, setHighSchools] = useState<HighSchool[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHighSchools = () => {
    if (highSchools !== null || loading) return;
    setLoading(true);
    setError(null);
    fetchHighSchools()
      .then(setHighSchools)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load team list.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!teamCode) {
      loadHighSchools();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = teamCode
    ? (highSchools?.find((h) => h.code === teamCode) ?? {
        code: teamCode,
        school: "",
        town: "",
        county: "",
      })
    : null;

  return (
    <Box sx={{ maxWidth: 480 }}>
      <Autocomplete
        options={highSchools ?? []}
        loading={loading}
        value={selected}
        onOpen={loadHighSchools}
        onChange={(_, value) => (readOnly ? onReadOnlyAttempt?.() : onUpdate(value?.code ?? ""))}
        getOptionLabel={(option) =>
          option.school ? `${option.code} - ${option.school}` : option.code
        }
        isOptionEqualToValue={(option, value) => option.code === value.code}
        filterOptions={(options, state) =>
          filterBySubsequence(
            options,
            state.inputValue,
            (option) => `${option.code} - ${option.school}`,
          )
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Team Code"
            slotProps={{
              ...params.slotProps,
              input: {
                ...params.slotProps.input,
                endAdornment: (
                  <>
                    {loading && <CircularProgress color="inherit" size={20} />}
                    {params.slotProps.input.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
      />
      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

export default TeamTab;
