import type { AppData } from "../types";
import { newId } from "../utils/id";

interface MeetCrudConfig<T extends { id: string; meetId: string }> {
  get: (data: AppData) => T[];
  set: (prev: AppData, items: T[]) => AppData;
}

interface History {
  update: (updater: (prev: AppData) => AppData) => void;
}

/**
 * Generic CRUD for one meet-scoped collection (athletes / individual entries /
 * relay entries). Owns only the mechanical part — stamping `id`/`meetId` onto
 * new items, splicing into the right collection, replacing/removing by id.
 * Entity-specific rules (referential-integrity guards, confirm dialogs,
 * per-event fan-out) stay as thin wrappers at the call site.
 */
export function useMeetCrud<T extends { id: string; meetId: string }>(
  history: History,
  selectedMeetId: string | null,
  config: MeetCrudConfig<T>,
) {
  const addMany = (items: Omit<T, "id" | "meetId">[]) => {
    if (!selectedMeetId) return;
    const newItems = items.map((item) => ({ ...item, id: newId(), meetId: selectedMeetId }) as T);
    history.update((prev) => config.set(prev, [...config.get(prev), ...newItems]));
  };

  const update = (updated: T) => {
    history.update((prev) =>
      config.set(
        prev,
        config.get(prev).map((x) => (x.id === updated.id ? updated : x)),
      ),
    );
  };

  const deleteById = (id: string) => {
    history.update((prev) =>
      config.set(
        prev,
        config.get(prev).filter((x) => x.id !== id),
      ),
    );
  };

  const clearForMeet = (keepIds?: Set<string>) => {
    history.update((prev) =>
      config.set(
        prev,
        config.get(prev).filter((x) => x.meetId !== selectedMeetId || keepIds?.has(x.id)),
      ),
    );
  };

  /** Reorders this meet's items to match `orderedIds`, leaving other meets' items in place. */
  const reorder = (orderedIds: string[]) => {
    history.update((prev) => {
      const items = config.get(prev);
      const byId = new Map(items.map((item) => [item.id, item]));
      const reordered = orderedIds.map((id) => byId.get(id)).filter((item): item is T => !!item);
      let i = 0;
      return config.set(
        prev,
        items.map((item) => (item.meetId === selectedMeetId ? reordered[i++] : item)),
      );
    });
  };

  return { addMany, update, deleteById, clearForMeet, reorder };
}
