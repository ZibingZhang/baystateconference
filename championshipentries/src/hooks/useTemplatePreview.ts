import { useEffect, useMemo, useState } from "react";
import type { AppData, ImportedEvent, IndividualEntry, Meet, RelayEntry } from "../types";
import { uniqueEventOptions } from "../domain/ev3";
import {
  buildTemplateIndividualEntries,
  buildTemplateRelayEntries,
  fetchTemplateEvents,
  findMeetTemplate,
} from "../domain/meetTemplates";
import { newId, newMeetId } from "../utils/id";

export const TEMPLATE_READ_ONLY_MESSAGE =
  "This is a template and cannot be edited. Make a copy of it into a new meet first.";

interface History {
  update: (updater: (prev: AppData) => AppData) => void;
}

type TemplateFetchState =
  | { templateId: string; status: "error"; message: string }
  | { templateId: string; status: "ready"; events: ImportedEvent[]; rawText: string }
  | null;

/**
 * Owns previewing a meet template: fetching its EV3 events, deriving the
 * read-only entries/event options shown while previewing, and copying the
 * template into a real (editable) meet.
 */
export function useTemplatePreview(
  history: History,
  selectedTemplateId: string | null,
  callbacks: {
    setSelectedTemplateId: (id: string | null) => void;
    setSelectedMeetId: (id: string | null) => void;
    setView: (view: "howto" | "about" | null) => void;
    showInfo: (dialog: { title: string; message: string }) => void;
  },
) {
  const [templateFetchState, setTemplateFetchState] = useState<TemplateFetchState>(null);

  const selectedTemplate = findMeetTemplate(selectedTemplateId ?? undefined);
  const templateData: { status: "loading" } | TemplateFetchState = !selectedTemplate
    ? null
    : templateFetchState?.templateId === selectedTemplate.id
      ? templateFetchState
      : { status: "loading" };

  useEffect(() => {
    if (!selectedTemplate) return;
    let cancelled = false;
    fetchTemplateEvents(selectedTemplate.ev3Url)
      .then(({ events, rawText }) => {
        if (!cancelled)
          setTemplateFetchState({
            templateId: selectedTemplate.id,
            status: "ready",
            events,
            rawText,
          });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setTemplateFetchState({
            templateId: selectedTemplate.id,
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load template events.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTemplate]);

  const handleReadOnlyAttempt = () =>
    callbacks.showInfo({ title: "Template", message: TEMPLATE_READ_ONLY_MESSAGE });

  const selectTemplate = (id: string) => {
    callbacks.setSelectedTemplateId(id);
    callbacks.setSelectedMeetId(null);
    callbacks.setView(null);
  };

  const clearTemplate = () => callbacks.setSelectedTemplateId(null);

  const copyTemplateToMeet = (templateId: string, meetName?: string) => {
    const template = findMeetTemplate(templateId);
    if (!template) return;
    fetchTemplateEvents(template.ev3Url)
      .then(({ events, rawText }) => {
        const createdMeetId = newMeetId();
        const meet: Meet = {
          id: createdMeetId,
          name: meetName?.trim() || template.name,
          sourceTemplateId: template.id,
          importedEventsFileName: template.eventsFileName,
          importedEventsRaw: rawText,
          maxIndividualEventsPerAthlete: template.maxIndividualEventsPerAthlete,
          maxRelayEventsPerAthlete: template.maxRelayEventsPerAthlete,
          maxTotalEventsPerAthlete: template.maxTotalEventsPerAthlete,
          individualEventEntryLimit: template.individualEventEntryLimit,
          relayEventEntryLimit: template.relayEventEntryLimit,
        };
        const newIndividualEntries = buildTemplateIndividualEntries(
          createdMeetId,
          events,
          template.genderFilter,
          newId,
          template.individualEntryStubsPerEvent,
        );
        const newRelayEntries = buildTemplateRelayEntries(
          createdMeetId,
          events,
          template.genderFilter,
          newId,
          template.relayEntryStubsPerEvent,
        );
        history.update((prev) => ({
          ...prev,
          meets: [...prev.meets, meet],
          individualEntries: [...prev.individualEntries, ...newIndividualEntries],
          relayEntries: [...prev.relayEntries, ...newRelayEntries],
        }));
        callbacks.setSelectedTemplateId(null);
        callbacks.setSelectedMeetId(createdMeetId);
      })
      .catch((err: unknown) => {
        callbacks.showInfo({
          title: "Copy Failed",
          message: err instanceof Error ? err.message : "Failed to load template events.",
        });
      });
  };

  const templateEvents = templateData?.status === "ready" ? templateData.events : undefined;
  const templateIndividualEntries = useMemo<IndividualEntry[]>(() => {
    if (!selectedTemplate || !templateEvents) return [];
    return buildTemplateIndividualEntries(
      selectedTemplate.id,
      templateEvents,
      selectedTemplate.genderFilter,
      newId,
      selectedTemplate.individualEntryStubsPerEvent,
    );
  }, [selectedTemplate, templateEvents]);
  const templateRelayEntries = useMemo<RelayEntry[]>(() => {
    if (!selectedTemplate || !templateEvents) return [];
    return buildTemplateRelayEntries(
      selectedTemplate.id,
      templateEvents,
      selectedTemplate.genderFilter,
      newId,
      selectedTemplate.relayEntryStubsPerEvent,
    );
  }, [selectedTemplate, templateEvents]);
  const templateIndividualEventOptions = templateEvents
    ? uniqueEventOptions(templateEvents, false)
    : undefined;
  const templateRelayEventOptions = templateEvents
    ? uniqueEventOptions(templateEvents, true)
    : undefined;

  return {
    selectedTemplate,
    templateData,
    templateIndividualEntries,
    templateRelayEntries,
    templateIndividualEventOptions,
    templateRelayEventOptions,
    selectTemplate,
    clearTemplate,
    copyTemplateToMeet,
    handleReadOnlyAttempt,
  };
}
