import { useEffect, useState } from "react";
import { MEET_TABS, type MeetTab } from "../constants/meetTabs";

/**
 * Keeps the selected meet, active tab, and How To page in sync with the
 * `meet`/`tab`/`view` URL query params, so a link/refresh lands back on the
 * same place. `view=howto` marks the How To page; `tab` is dropped from the
 * URL while it's open since it doesn't apply.
 */
export function useMeetUrlState() {
  const [selectedMeetId, setSelectedMeetId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("meet"),
  );
  const [activeTab, setActiveTabState] = useState<MeetTab>(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    return MEET_TABS.includes(tab as MeetTab) ? (tab as MeetTab) : "team";
  });
  const [tabParamCleared, setTabParamCleared] = useState(false);
  const [howToOpen, setHowToOpen] = useState(
    () => new URLSearchParams(window.location.search).get("view") === "howto",
  );

  const setActiveTab = (tab: MeetTab) => {
    setTabParamCleared(false);
    setActiveTabState(tab);
  };
  const clearTab = () => setTabParamCleared(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedMeetId) {
      params.set("meet", selectedMeetId);
    } else {
      params.delete("meet");
    }
    if (howToOpen) {
      params.set("view", "howto");
    } else {
      params.delete("view");
    }
    if (howToOpen || tabParamCleared) {
      params.delete("tab");
    } else {
      params.set("tab", activeTab);
    }
    const search = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`,
    );
  }, [selectedMeetId, activeTab, howToOpen, tabParamCleared]);

  return {
    selectedMeetId,
    setSelectedMeetId,
    activeTab,
    setActiveTab,
    clearTab,
    howToOpen,
    setHowToOpen,
  };
}
