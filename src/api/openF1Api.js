import { createMockLapTimes, createMockTelemetry, drivers, getMockDriverSummary, sessions } from "../data/mockTelemetry";

const OPENF1_BASE_URL = "https://api.openf1.org/v1";
const CACHE_URL = "/openf1-2026-cache.json";
let cachedSeasonData;

// Dashboard selectors use the local 2026 cache. Chart data is generated locally
// so every driver/session always has beginner-friendly sample data.
export async function getDashboardData(driverId, sessionId) {
  await wait(500);

  const seasonData = await getSeasonData();
  const driver = findDriver(driverId, seasonData.drivers);
  const session = findSession(sessionId, seasonData.sessions);
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
      sessions: cache.sessions?.length ? cache.sessions : sessions,
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

function findDriver(driverId, driverOptions) {
  return driverOptions.find((item) => item.id === driverId) ?? drivers.find((item) => item.id === driverId) ?? drivers[0];
}

function findSession(sessionId, sessionOptions) {
  return sessionOptions.find((item) => item.id === sessionId) ?? sessions.find((item) => item.id === sessionId) ?? sessions[0];
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
