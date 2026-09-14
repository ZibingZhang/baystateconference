import { useEffect, useState } from "react";
import type { AppData } from "./types";

const STORAGE_KEY = "championshipentries:data";

const emptyData: AppData = {
  meets: [],
  athletes: [],
  individualEntries: [],
  relayEntries: [],
};

function loadData(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyData;
  try {
    return { ...emptyData, ...JSON.parse(raw) };
  } catch {
    return emptyData;
  }
}

export function useAppData() {
  const [data, setData] = useState<AppData>(loadData);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  return [data, setData] as const;
}
