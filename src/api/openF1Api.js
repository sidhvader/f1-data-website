import { createMockLapTimes, createMockTelemetry, drivers, getMockDriverSummary, sessions } from "../data/mockTelemetry";

const OPENF1_BASE_URL = "https://api.openf1.org/v1";
const CACHE_URL = "/openf1-2026-cache.json";
const CANCELED_2026_MEETINGS = new Set(["Bahrain Grand Prix", "Saudi Arabian Grand Prix"]);
let cachedSeasonData;

// Dashboard selectors use the local 2026 cache. Past sessions get local sample
// chart data; future sessions are schedule-only so the app does not pretend
// real telemetry exists before a race weekend happens.
export async function getDashboardData(driverId, sessionId) {
  await wait(500);

  const seasonData = await getSeasonData();
  const driver = findDriver(driverId, seasonData.drivers);
  const session = findSession(sessionId, seasonData.sessions);
  const sessionStatus = getSessionStatus(session);

  if (sessionStatus.type === "future") {
    return {
      driver,
      session,
      summary: {
        fastestLap: "--",
        maxSpeed: null,
      },
      telemetry: [],
      lapTimes: [],
      dataStatus: {
        source: "Schedule only",
      },
      sessionStatus,
    };
  }

  const telemetry = createMockTelemetry(driver.id);
  const lapTimes = createMockLapTimes(driver.id, session);
  const summary = getMockDriverSummary(driver.id);

  return {
    driver,
    session,
    summary: {
      ...summary,
      fastestLap: getFastestLap(lapTimes),
      maxSpeed: Math.max(...telemetry.map((point) => point.speed)),
    },
    telemetry,
    lapTimes,
    dataStatus: {
      source: "Local sample telemetry and lap times",
    },
    sessionStatus,
  };
}

export async function getDrivers() {
  await wait(150);
  const seasonData = await getSeasonData();
  return seasonData.drivers;
}

export async function getSessions() {
  await wait(150);
  const seasonData = await getSeasonData();
  return seasonData.sessions;
}

export function getOpenF1BaseUrl() {
  return OPENF1_BASE_URL;
}

async function getSeasonData() {
  if (cachedSeasonData) {
    return cachedSeasonData;
  }

  try {
    const response = await fetch(CACHE_URL);

    if (!response.ok) {
      throw new Error("OpenF1 cache is not available.");
    }

    const cache = await response.json();

    cachedSeasonData = {
      drivers: cache.drivers?.length ? cache.drivers : drivers,
      sessions: cache.sessions?.length ? removeCanceledSessions(cache.sessions) : sessions,
    };
  } catch (error) {
    cachedSeasonData = { drivers, sessions };
  }

  return cachedSeasonData;
}

function getFastestLap(lapTimes) {
  const fastestLap = lapTimes.reduce((fastest, current) => {
    return current.lapTimeSeconds < fastest.lapTimeSeconds ? current : fastest;
  }, lapTimes[0]);

  return fastestLap?.lapTime ?? "--";
}

function getSessionStatus(session) {
  const startDate = session.dateStart ? new Date(session.dateStart) : null;

  if (startDate && startDate.getTime() > Date.now()) {
    return {
      type: "future",
      label: "Future session",
      message: `This session starts on ${formatDate(startDate)}. Real telemetry and lap times are not available yet.`,
    };
  }

  return {
    type: "sample",
    label: "Sample data",
    message: "This dashboard is showing local sample telemetry and lap times for this completed or undated session.",
  };
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function findDriver(driverId, driverOptions) {
  return driverOptions.find((item) => item.id === driverId) ?? drivers.find((item) => item.id === driverId) ?? drivers[0];
}

function findSession(sessionId, sessionOptions) {
  return sessionOptions.find((item) => item.id === sessionId) ?? sessions.find((item) => item.id === sessionId) ?? sessions[0];
}

function removeCanceledSessions(sessionOptions) {
  return sessionOptions.filter((session) => !CANCELED_2026_MEETINGS.has(session.name));
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
