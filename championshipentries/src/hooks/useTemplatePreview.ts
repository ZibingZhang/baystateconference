import { useEffect, useMemo, useState } from "react";
import type { AppData, ImportedEvent, IndividualEntry, Meet, RelayEntry } from "../types";
import { uniqueEventNames } from "../ev3";
import {
  MEET_TEMPLATES,
  buildTemplateIndividualEntries,
  buildTemplateRelayEntries,
  fetchTemplateEvents,
  templateFileName,
} from "../meetTemplates";
import { newId } from "../id";

export const TEMPLATE_READ_ONLY_MESSAGE =
  "This is a template and cannot be edited. Make a copy of it into a new meet first.";

interface History {
  update: (updater: (prev: AppData) => AppData) => void;
}

type TemplateFetchState =
  | { templateId: string; status: "error"; message: string }
  | { templateId: string; status: "ready"; events: ImportedEvent[] }
  | null;

/**
 * Owns previewing a meet template: fetching its EV3 events, deriving the
 * read-only entries/event options shown while previewing, and copying the
 * template into a real (editable) meet.
 */
export function useTemplatePreview(
  history: History,
  callbacks: {
    setSelectedMeetId: (id: string | null) => void;
    setHowToOpen: (open: boolean) => void;
    showInfo: (dialog: { title: string; message: string }) => void;
  },
) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateFetchState, setTemplateFetchState] = useState<TemplateFetchState>(null);

  const selectedTemplate = MEET_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? null;
  const templateData: { status: "loading" } | TemplateFetchState = !selectedTemplate
    ? null
    : templateFetchState?.templateId === selectedTemplate.id
      ? templateFetchState
      : { status: "loading" };

  useEffect(() => {
    if (!selectedTemplate) return;
    let cancelled = false;
    fetchTemplateEvents(selectedTemplate.ev3Url)
      .then(({ events }) => {
        if (!cancelled)
          setTemplateFetchState({ templateId: selectedTemplate.id, status: "ready", events });
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
    setSelectedTemplateId(id);
    callbacks.setSelectedMeetId(null);
    callbacks.setHowToOpen(false);
  };

  const clearTemplate = () => setSelectedTemplateId(null);

  const copyTemplateToMeet = (templateId: string) => {
    const template = MEET_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    fetchTemplateEvents(template.ev3Url)
      .then(({ events, rawText }) => {
        const newMeetId = newId();
        const meet: Meet = {
          id: newMeetId,
          name: template.name,
          importedEventsFileName: templateFileName(template.ev3Url),
          importedEvents: events,
          importedEventsRaw: rawText,
        };
        const newIndividualEntries = buildTemplateIndividualEntries(
          newMeetId,
          events,
          template.genderFilter,
          newId,
        );
        const newRelayEntries = buildTemplateRelayEntries(
          newMeetId,
          events,
          template.genderFilter,
          newId,
        );
        history.update((prev) => ({
          ...prev,
          meets: [...prev.meets, meet],
          individualEntries: [...prev.individualEntries, ...newIndividualEntries],
          relayEntries: [...prev.relayEntries, ...newRelayEntries],
        }));
        setSelectedTemplateId(null);
        callbacks.setSelectedMeetId(newMeetId);
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
    );
  }, [selectedTemplate, templateEvents]);
  const templateRelayEntries = useMemo<RelayEntry[]>(() => {
    if (!selectedTemplate || !templateEvents) return [];
    return buildTemplateRelayEntries(
      selectedTemplate.id,
      templateEvents,
      selectedTemplate.genderFilter,
      newId,
    );
  }, [selectedTemplate, templateEvents]);
  const templateIndividualEventOptions = templateEvents
    ? uniqueEventNames(templateEvents, false)
    : undefined;
  const templateRelayEventOptions = templateEvents
    ? uniqueEventNames(templateEvents, true)
    : undefined;

  return {
    selectedTemplateId,
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
