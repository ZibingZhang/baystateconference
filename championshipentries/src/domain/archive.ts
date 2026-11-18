import type { MeetType, Season } from "../types";

const ARCHIVE_FILES_URL =
  "https://raw.githubusercontent.com/ZibingZhang/baystateconference/master/jekyll/_data/file-browser/sports/swimming-diving/archive/files.json";

/** Root of the hub pages generated per meet type/year/season (see `jekyll/_plugins/meet_sheets_page_generator.rb`). */
const MEETS_PAGE_PATH = "/sports/swimming-diving/meets";

/** Page that previews a single archived file without leaving the site (see `jekyll/_includes/external-file-viewer.html`). */
const EXTERNAL_FILE_VIEWER_PATH = "/resources/external-file/";

/** Shown as the "Back to ..." label on the external file viewer when linked to from this app. */
const BACK_LINK_FROM_NAME = "Championship Entries";

/**
 * Type tags that count as "results" rather than pre-meet or administrative
 * documents. Mirrors `RESULT_TYPE_TAGS` in
 * `jekyll/_plugins/swimming_archive_index_generator.rb`.
 */
const RESULT_TYPE_TAGS = ["results", "team-scores"];

export interface ArchiveFile {
  name: string;
  s3Path: string;
  year: string;
  season: Season;
  tags: string[];
}

/** Links to that meet type/year/season's hub page (or, for Sectional, the season's directory page listing its meets). */
export function meetHubUrl(meetType: MeetType, season: Season, year: string): string {
  return `${MEETS_PAGE_PATH}/${meetType}/${year}/${season}/`;
}

/** Links to the external file viewer for this archived file, with a "Back to Championship Entries" link to the given page. */
export function externalFileViewerUrl(file: ArchiveFile, fromUrl: string): string {
  const params = new URLSearchParams({
    url: file.s3Path,
    name: file.name,
    from: fromUrl,
    fromName: BACK_LINK_FROM_NAME,
  });
  return `${EXTERNAL_FILE_VIEWER_PATH}?${params.toString()}`;
}

/** Fetches the archive's hand-tagged file list and returns only the result-type files for this meet type/season, newest year first. */
export async function fetchArchiveResults(
  meetType: MeetType,
  season: Season,
): Promise<ArchiveFile[]> {
  const response = await fetch(ARCHIVE_FILES_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch archive file list (${response.status})`);
  }
  const data = (await response.json()) as { files: ArchiveFile[] };
  return data.files
    .filter(
      (file) =>
        file.tags.includes(meetType) &&
        file.season === season &&
        file.tags.some((tag) => RESULT_TYPE_TAGS.includes(tag)),
    )
    .sort((a, b) => b.year.localeCompare(a.year) || a.name.localeCompare(b.name));
}
