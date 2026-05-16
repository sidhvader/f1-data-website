export const drivers = [
  {
    id: "RUS",
    name: "George Russell",
    number: 63,
    team: "Mercedes",
    color: "#00d2be",
    paceOffset: 3,
  },
  {
    id: "ANT",
    name: "Kimi Antonelli",
    number: 12,
    team: "Mercedes",
    color: "#00d2be",
    paceOffset: 0,
  },
  {
    id: "LEC",
    name: "Charles Leclerc",
    number: 16,
    team: "Ferrari",
    color: "#e10600",
    paceOffset: 2,
  },
  {
    id: "HAM",
    name: "Lewis Hamilton",
    number: 44,
    team: "Ferrari",
    color: "#e10600",
    paceOffset: 1,
  },
  {
    id: "NOR",
    name: "Lando Norris",
    number: 1,
    team: "McLaren",
    color: "#ff8000",
    paceOffset: 4,
  },
  {
    id: "PIA",
    name: "Oscar Piastri",
    number: 81,
    team: "McLaren",
    color: "#ff8000",
    paceOffset: 3,
  },
  {
    id: "VER",
    name: "Max Verstappen",
    number: 3,
    team: "Red Bull Racing",
    color: "#3671c6",
    paceOffset: 5,
  },
  {
    id: "HAD",
    name: "Isack Hadjar",
    number: 6,
    team: "Red Bull Racing",
    color: "#3671c6",
    paceOffset: 1,
  },
  {
    id: "GAS",
    name: "Pierre Gasly",
    number: 10,
    team: "Alpine",
    color: "#2293d1",
    paceOffset: -1,
  },
  {
    id: "COL",
    name: "Franco Colapinto",
    number: 43,
    team: "Alpine",
    color: "#2293d1",
    paceOffset: -2,
  },
  {
    id: "OCO",
    name: "Esteban Ocon",
    number: 31,
    team: "Haas F1 Team",
    color: "#b6babd",
    paceOffset: -1,
  },
  {
    id: "BEA",
    name: "Oliver Bearman",
    number: 87,
    team: "Haas F1 Team",
    color: "#b6babd",
    paceOffset: -2,
  },
  {
    id: "LAW",
    name: "Liam Lawson",
    number: 30,
    team: "Racing Bulls",
    color: "#6692ff",
    paceOffset: 0,
  },
  {
    id: "LIN",
    name: "Arvid Lindblad",
    number: 41,
    team: "Racing Bulls",
    color: "#6692ff",
    paceOffset: -1,
  },
  {
    id: "SAI",
    name: "Carlos Sainz",
    number: 55,
    team: "Williams",
    color: "#64c4ff",
    paceOffset: 1,
  },
  {
    id: "ALB",
    name: "Alexander Albon",
    number: 23,
    team: "Williams",
    color: "#64c4ff",
    paceOffset: 0,
  },
  {
    id: "HUL",
    name: "Nico Hulkenberg",
    number: 27,
    team: "Audi",
    color: "#00e701",
    paceOffset: 0,
  },
  {
    id: "BOR",
    name: "Gabriel Bortoleto",
    number: 5,
    team: "Audi",
    color: "#00e701",
    paceOffset: -1,
  },
  {
    id: "PER",
    name: "Sergio Perez",
    number: 11,
    team: "Cadillac",
    color: "#d4af37",
    paceOffset: 1,
  },
  {
    id: "BOT",
    name: "Valtteri Bottas",
    number: 77,
    team: "Cadillac",
    color: "#d4af37",
    paceOffset: 0,
  },
  {
    id: "ALO",
    name: "Fernando Alonso",
    number: 14,
    team: "Aston Martin",
    color: "#358c75",
    paceOffset: 1,
  },
  {
    id: "STR",
    name: "Lance Stroll",
    number: 18,
    team: "Aston Martin",
    color: "#358c75",
    paceOffset: -1,
  },
];

export const sessions = [
  {
    id: "australia-2026-race",
    name: "2026 Australian Grand Prix",
    type: "Race",
    location: "Melbourne",
  },
  {
    id: "miami-2026-race",
    name: "2026 Miami Grand Prix",
    type: "Race",
    location: "Miami",
  },
  {
    id: "canada-2026-practice",
    name: "2026 Canadian Grand Prix",
    type: "Practice 2",
    location: "Montreal",
  },
  {
    id: "monaco-2026-qualifying",
    name: "2026 Monaco Grand Prix",
    type: "Qualifying",
    location: "Monaco",
  },
];

// Mock telemetry keeps version 1 easy to run without depending on a network call.
export function createMockTelemetry(driverId) {
  const driver = findDriver(driverId);
  const driverSeed = drivers.findIndex((item) => item.id === driver.id) + 1;
  const speedOffset = driver.paceOffset * 3;

  return Array.from({ length: 26 }, (_, index) => {
    const time = index * 4;
    const speedWave = Math.sin(index / 2 + driverSeed / 5) * 28;
    const straightBoost = Math.cos(index / 4 + driverSeed / 7) * 16;
    const brakingZone = index % 8 === 4 || index % 8 === 5;
    const throttleBase = 70 + Math.round(Math.sin(index / 3 + driverSeed / 4) * 24);

    return {
      time,
      speed: Math.round(235 + speedWave + straightBoost + index * 2 + speedOffset),
      throttle: brakingZone ? 24 : Math.min(100, throttleBase),
      brake: brakingZone ? 76 : index % 10 === 0 ? 18 : 0,
    };
  });
}

export function getMockDriverSummary(driverId) {
  const driver = findDriver(driverId);
  const telemetry = createMockTelemetry(driver.id);
  const lapTimes = createMockLapTimes(driverId);
  const fastestLapSeconds = Math.min(...lapTimes.map((lap) => lap.lapTimeSeconds));

  return {
    fastestLap: formatLapTime(fastestLapSeconds),
    maxSpeed: Math.max(...telemetry.map((point) => point.speed)),
  };
}

export function createMockLapTimes(driverId, session) {
  const driver = findDriver(driverId);
  const driverIndex = drivers.findIndex((item) => item.id === driver.id);
  const lapCount = session?.type === "Race" ? 18 : session?.type === "Qualifying" ? 8 : 12;
  const sessionOffset = session?.type === "Qualifying" ? -1.8 : session?.type === "Race" ? 1.2 : 0;
  const baseSeconds = 91.8 - driver.paceOffset * 0.22 + driverIndex * 0.04 + sessionOffset;

  return Array.from({ length: lapCount }, (_, index) => {
    const lap = index + 1;
    const warmupPenalty = lap === 1 ? 3.2 : 0;
    const tyreChange = session?.type === "Race" && lap > 10 ? 0.9 : 0;
    const rhythm = Math.sin((lap + driverIndex) / 2.4) * 0.55;
    const lapTimeSeconds = Number((baseSeconds + warmupPenalty + tyreChange + rhythm).toFixed(3));

    return {
      lap,
      lapTime: formatLapTime(lapTimeSeconds),
      lapTimeSeconds,
    };
  });
}

function findDriver(driverId) {
  return drivers.find((item) => item.id === driverId) ?? drivers[0];
}

function formatLapTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds - minutes * 60).toFixed(3).padStart(6, "0");
  return `${minutes}:${seconds}`;
}
