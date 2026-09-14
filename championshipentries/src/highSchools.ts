import type { HighSchool } from "./types";

const HIGH_SCHOOLS_CSV_URL =
  "https://raw.githubusercontent.com/ZibingZhang/baystateconference/master/resources/miaa/high-schools.csv";

export function parseHighSchoolsCsv(text: string): HighSchool[] {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  return lines
    .slice(1)
    .map((line) => {
      const [code, school, town, county] = line.split(",").map((field) => field.trim());
      return { code, school, town, county };
    })
    .filter((highSchool) => highSchool.code);
}

export async function fetchHighSchools(): Promise<HighSchool[]> {
  const response = await fetch(HIGH_SCHOOLS_CSV_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch high school list (${response.status})`);
  }
  return parseHighSchoolsCsv(await response.text());
}
