import { driverMetadata } from "../data/driverMetadata";

const OPENF1_BASE_URL = "https://api.openf1.org/v1";
const CACHE_URL = "/season-2026-data.json";
const CANCELED_2026_MEETINGS = new Set(["Bahrain Grand Prix", "Saudi Arabian Grand Prix"]);
const MAX_TELEMETRY_POINTS = 220;
let cachedSeasonData;
const dashboardDataCache = new Map();

// Dashboard selectors use the local 2026 session cache.
// Completed sessions use real OpenF1 lap and car data.
export async function getDashboardData(driverId, sessionId) {
  const seasonData = await getSeasonData();
  const driver = findDriver(driverId, seasonData.drivers);
  const session = findSession(sessionId, seasonData.sessions);

  if (!session) {
    throw new Error("No session is selected.");
  }

  const sessionStatus = getSessionStatus(session);

  if (sessionStatus.type === "future" || sessionStatus.type === "unavailable") {
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

  const realData = await getRealDashboardData(driver, session);

  if (realData.type === "ready") {
    return {
      driver,
      session,
      summary: {
        fastestLap: getFastestLap(realData.lapTimes),
        maxSpeed: getMaxSpeed(realData.telemetry),
      },
      telemetry: realData.telemetry,
      lapTimes: realData.lapTimes,
      dataStatus: {
        source: "OpenF1 real lap and car data",
      },
      sessionStatus: {
        ...sessionStatus,
        message: "This completed session is using real OpenF1 lap times, speed, throttle, and brake data.",
      },
    };
  }

  if (realData.type === "restricted" || realData.type === "error") {
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
        source: "OpenF1 temporarily unavailable",
      },
      sessionStatus: {
        type: "restricted",
        label: "OpenF1 temporarily unavailable",
        message:
          "OpenF1 is temporarily blocking or failing public requests during a live or recently finished session. Try again after the current F1 session window ends.",
      },
    };
  }

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
      source: "OpenF1 data unavailable",
    },
    sessionStatus: {
      type: "unavailable",
      label: "No OpenF1 data yet",
      message: "This session is completed, but OpenF1 did not return usable lap and car data for this driver yet.",
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

async function getRealDashboardData(driver, session) {
  if (!session.sessionKey || !driver.number) {
    return null;
  }

  const cacheKey = `${session.sessionKey}-${driver.number}`;

  if (dashboardDataCache.has(cacheKey)) {
    return dashboardDataCache.get(cacheKey);
  }

  try {
    const [rawTelemetry, rawLapTimes] = await Promise.all([
      fetchOpenF1Json(`/car_data?session_key=${session.sessionKey}&driver_number=${driver.number}`),
      fetchOpenF1Json(`/laps?session_key=${session.sessionKey}&driver_number=${driver.number}`),
    ]);

    const telemetry = normalizeTelemetry(rawTelemetry);
    const lapTimes = normalizeLapTimes(rawLapTimes);

    if (!telemetry.length || !lapTimes.length) {
      const missingData = { type: "missing" };
      dashboardDataCache.set(cacheKey, missingData);
      return missingData;
    }

    const realData = { type: "ready", telemetry, lapTimes };
    dashboardDataCache.set(cacheKey, realData);
    return realData;
  } catch (error) {
    const unavailableData =
      error.status === 401
        ? { type: "restricted", message: error.message }
        : { type: "error", message: error.message };

    dashboardDataCache.set(cacheKey, unavailableData);
    return unavailableData;
  }
}

async function fetchOpenF1Json(path) {
  const response = await fetch(`${OPENF1_BASE_URL}${path}`);

  if (!response.ok) {
    const message = await getOpenF1ErrorMessage(response);
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function getOpenF1ErrorMessage(response) {
  try {
    const body = await response.json();
    return body.detail ?? `OpenF1 request failed: ${response.status}`;
  } catch (error) {
    return `OpenF1 request failed: ${response.status}`;
  }
}

function normalizeTelemetry(rawTelemetry) {
  const usefulPoints = rawTelemetry
    .filter((point) => point.date && Number.isFinite(point.speed))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!usefulPoints.length) {
    return [];
  }

  const firstTime = new Date(usefulPoints[0].date).getTime();

  return downsample(usefulPoints, MAX_TELEMETRY_POINTS).map((point) => ({
    time: Math.round((new Date(point.date).getTime() - firstTime) / 1000),
    speed: Math.round(point.speed),
    throttle: Number(point.throttle ?? 0),
    brake: point.brake ? 100 : 0,
  }));
}

function normalizeLapTimes(rawLapTimes) {
  return rawLapTimes
    .filter((lap) => Number.isFinite(lap.lap_duration) && Number.isFinite(lap.lap_number))
    .sort((a, b) => a.lap_number - b.lap_number)
    .map((lap) => ({
      lap: lap.lap_number,
      lapTime: formatLapTime(lap.lap_duration),
      lapTimeSeconds: lap.lap_duration,
    }));
}

function downsample(items, maxItems) {
  if (items.length <= maxItems) {
    return items;
  }

  const step = (items.length - 1) / (maxItems - 1);

  return Array.from({ length: maxItems }, (_, index) => {
    return items[Math.round(index * step)];
  });
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
      drivers: cache.drivers?.length ? addDriverMetadata(cache.drivers) : driverMetadata,
      sessions: cache.sessions?.length ? removeCanceledSessions(cache.sessions) : [],
    };
  } catch (error) {
    cachedSeasonData = { drivers: driverMetadata, sessions: [] };
  }

  return cachedSeasonData;
}

function getFastestLap(lapTimes) {
  const fastestLap = lapTimes.reduce((fastest, current) => {
    return current.lapTimeSeconds < fastest.lapTimeSeconds ? current : fastest;
  }, lapTimes[0]);

  return fastestLap?.lapTime ?? "--";
}

function getMaxSpeed(telemetry) {
  if (!telemetry.length) {
    return null;
  }

  return Math.max(...telemetry.map((point) => point.speed));
}

function getSessionStatus(session) {
  if (session.status === "completed") {
    return {
      type: "completed",
      label: "Completed session",
      message: "This session is marked complete in the local OpenF1 cache.",
    };
  }

  const endDate = session.dateEnd ? new Date(session.dateEnd) : null;

  if (endDate && endDate.getTime() > Date.now()) {
    return {
      type: "future",
      label: "Session not completed",
      message: `This session ends on ${formatDate(endDate)}. Telemetry and lap times are hidden until the session is complete.`,
    };
  }

  return {
    type: "unavailable",
    label: "Session unavailable",
    message: "This session is missing a completion time in the 2026 session cache.",
  };
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatLapTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds - minutes * 60).toFixed(3).padStart(6, "0");
  return `${minutes}:${seconds}`;
}

function findDriver(driverId, driverOptions) {
  return driverOptions.find((item) => item.id === driverId) ?? driverMetadata.find((item) => item.id === driverId) ?? driverOptions[0] ?? driverMetadata[0];
}

function findSession(sessionId, sessionOptions) {
  return sessionOptions.find((item) => item.id === sessionId) ?? sessionOptions[0];
}

function addDriverMetadata(driverOptions) {
  return driverOptions.map((driver) => {
    const metadata = driverMetadata.find((item) => item.id === driver.id || item.number === driver.number);

    return {
      ...driver,
      name: driver.name || metadata?.name || driver.id,
      team: driver.team && driver.team !== "Unknown team" ? driver.team : metadata?.team ?? "Unknown team",
      color: driver.color && driver.color !== "#d6d9df" ? driver.color : metadata?.color ?? "#d6d9df",
    };
  });
}

function removeCanceledSessions(sessionOptions) {
  return sessionOptions.filter((session) => !CANCELED_2026_MEETINGS.has(session.name));
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
