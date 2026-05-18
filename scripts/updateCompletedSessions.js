import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OPENF1_BASE_URL = "https://api.openf1.org/v1";
const YEAR = 2026;
const CANCELED_MEETINGS = new Set(["Bahrain Grand Prix", "Saudi Arabian Grand Prix"]);

// This is the file the website reads when it builds.
// The GitHub Action runs this script and refreshes the file automatically.
const outputPath = join(projectRoot(), "public", "openf1-2026-cache.json");

async function main() {
  const previousCache = await readExistingCache();
  const previousCompleted = new Set(
    (previousCache?.sessions ?? []).filter((session) => session.status === "completed").map((session) => session.id)
  );

  // OpenF1 gives us sessions and meetings separately, so we fetch both.
  const [rawSessions, rawMeetings] = await Promise.all([
    fetchJson(`${OPENF1_BASE_URL}/sessions?year=${YEAR}`),
    fetchJson(`${OPENF1_BASE_URL}/meetings?year=${YEAR}`),
  ]);

  // Combine session data with meeting names, then mark each session as completed or scheduled.
  const meetingsByKey = new Map(rawMeetings.map((meeting) => [meeting.meeting_key, meeting]));
  const sessions = rawSessions
    .map((session) => normalizeSession(session, meetingsByKey))
    .filter(Boolean)
    .filter((session) => !CANCELED_MEETINGS.has(session.name))
    .sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart));

  // Driver lists can change during a season, so use the latest completed session.
  const latestCompletedSession = [...sessions].reverse().find((session) => session.status === "completed");
  const drivers = latestCompletedSession ? await fetchDriversForSession(latestCompletedSession.sessionKey) : previousCache?.drivers ?? [];

  const completedSessions = sessions.filter((session) => session.status === "completed");
  const newlyCompleted = completedSessions.filter((session) => !previousCompleted.has(session.id));

  const nextCache = {
    season: YEAR,
    source: "OpenF1",
    sourceUrl: OPENF1_BASE_URL,
    updatedAt: new Date().toISOString(),
    completedSessionCount: completedSessions.length,
    sessions,
    drivers,
  };

  // Save the updated cache so the website can use it without calling OpenF1 from the browser.
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(nextCache, null, 2)}\n`);

  console.log(`Updated ${sessions.length} sessions.`);
  console.log(`Completed sessions: ${completedSessions.length}.`);
  console.log(`Drivers: ${drivers.length}.`);

  if (newlyCompleted.length) {
    console.log("Newly completed sessions:");
    newlyCompleted.forEach((session) => {
      console.log(`- ${session.name} - ${session.type}`);
    });
  } else {
    console.log("No newly completed sessions since the last cache update.");
  }
}

async function fetchDriversForSession(sessionKey) {
  const rawDrivers = await fetchJson(`${OPENF1_BASE_URL}/drivers?session_key=${sessionKey}`);

  return rawDrivers.map(normalizeDriver).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OpenF1 request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function readExistingCache() {
  try {
    return JSON.parse(await readFile(outputPath, "utf-8"));
  } catch (error) {
    return null;
  }
}

function normalizeSession(session, meetingsByKey) {
  if (!session.session_key || !session.session_name) {
    return null;
  }

  const meeting = meetingsByKey.get(session.meeting_key);
  const dateEnd = session.date_end ?? "";

  return {
    id: String(session.session_key),
    sessionKey: session.session_key,
    meetingKey: session.meeting_key,
    name: meeting?.meeting_name ?? buildMeetingName(session),
    type: session.session_name,
    location: session.location ?? session.country_name ?? "Unknown",
    country: session.country_name ?? "",
    dateStart: session.date_start ?? "",
    dateEnd,
    status: isCompleted(dateEnd) ? "completed" : "scheduled",
  };
}

function normalizeDriver(driver) {
  if (!driver.driver_number || !driver.full_name) {
    return null;
  }

  return {
    id: driver.name_acronym,
    name: formatDriverName(driver),
    number: driver.driver_number,
    team: driver.team_name ?? "Unknown team",
    color: driver.team_colour ? `#${driver.team_colour}` : "#d6d9df",
  };
}

function buildMeetingName(session) {
  if (session.country_name) {
    return `${session.country_name} Grand Prix`;
  }

  return session.circuit_short_name ?? `${YEAR} Formula 1 Session`;
}

function formatDriverName(driver) {
  if (driver.first_name && driver.last_name) {
    return `${driver.first_name} ${driver.last_name}`;
  }

  return driver.full_name;
}

function isCompleted(dateEnd) {
  if (!dateEnd) {
    return false;
  }

  return new Date(dateEnd).getTime() <= Date.now();
}

function projectRoot() {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
