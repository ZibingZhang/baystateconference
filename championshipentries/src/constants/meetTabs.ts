export type AdvancedSubTab = "ev3" | "hy3" | "settings";

export type MeetTab =
  | "team"
  | "events"
  | "athletes"
  | "individual"
  | "relay"
  | "summary"
  | AdvancedSubTab;

export const MEET_TABS: MeetTab[] = [
  "team",
  "events",
  "athletes",
  "individual",
  "relay",
  "summary",
  "ev3",
  "hy3",
  "settings",
];

/** The tabs shown in the top-level Tabs bar: the EV3/HY3/Settings sub-tabs are grouped under "advanced". */
export type TopLevelMeetTab = Exclude<MeetTab, AdvancedSubTab> | "advanced";

export function isAdvancedSubTab(tab: MeetTab): tab is AdvancedSubTab {
  return tab === "ev3" || tab === "hy3" || tab === "settings";
}

export function topLevelTabFor(tab: MeetTab): TopLevelMeetTab {
  return isAdvancedSubTab(tab) ? "advanced" : tab;
}
