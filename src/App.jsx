import React from "react";
import { Activity, AlertTriangle, CalendarClock, Flag, Gauge, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { getDashboardData, getDrivers, getSessions } from "./api/openF1Api";
import LapTimesPanel from "./components/LapTimesPanel";
import StatCard from "./components/StatCard";
import TelemetryChart from "./components/TelemetryChart";

export default function App() {
  const [drivers, setDrivers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState("RUS");
  const [selectedSession, setSelectedSession] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Load selector options once when the app starts.
  useEffect(() => {
    async function loadOptions() {
      const [driverOptions, sessionOptions] = await Promise.all([getDrivers(), getSessions()]);
      setDrivers(driverOptions);
      setSessions(sessionOptions);
      setSelectedDriver((currentDriver) => {
        return driverOptions.some((driver) => driver.id === currentDriver) ? currentDriver : driverOptions[0]?.id ?? currentDriver;
      });
      setSelectedSession((currentSession) => {
        const completedSessions = sessionOptions.filter((session) => session.status === "completed");
        const fallbackSession = completedSessions.at(-1) ?? sessionOptions[0];
        return sessionOptions.some((session) => session.id === currentSession) ? currentSession : fallbackSession?.id ?? currentSession;
      });
    }

    loadOptions();
  }, []);

  // Reload telemetry whenever the user changes driver or session.
  useEffect(() => {
    async function loadDashboard() {
      if (!selectedDriver || !selectedSession) {
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");
        const data = await getDashboardData(selectedDriver, selectedSession);
        setDashboardData(data);
      } catch (error) {
        setErrorMessage("Telemetry could not be loaded. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, [selectedDriver, selectedSession]);

  const driver = dashboardData?.driver;
  const session = dashboardData?.session;
  const summary = dashboardData?.summary;
  const telemetry = dashboardData?.telemetry ?? [];
  const lapTimes = dashboardData?.lapTimes ?? [];
  const dataStatus = dashboardData?.dataStatus;
  const sessionStatus = dashboardData?.sessionStatus;
  const hasChartData = telemetry.length > 0 && lapTimes.length > 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#2a1112,#0c0d10_38%,#07080a_100%)] text-f1-silver">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-f1-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-200">
              <Flag size={14} />
              Beginner Telemetry Lab
            </div>
            <h1 className="text-3xl font-black text-white sm:text-5xl">F1 Telemetry Dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Explore real OpenF1 speed, throttle, braking, and lap times for completed 2026 sessions.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
            <label className="text-sm font-semibold text-slate-300">
              Driver
              <select
                className="mt-2 w-full rounded-lg border border-f1-border bg-f1-panel px-3 py-3 text-white outline-none transition focus:border-f1-red"
                value={selectedDriver}
                onChange={(event) => setSelectedDriver(event.target.value)}
              >
                {drivers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {item.team}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-300">
              Session
              <select
                className="mt-2 w-full rounded-lg border border-f1-border bg-f1-panel px-3 py-3 text-white outline-none transition focus:border-f1-red"
                value={selectedSession}
                onChange={(event) => setSelectedSession(event.target.value)}
              >
                {sessions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {item.type}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {isLoading && (
          <div className="flex min-h-80 items-center justify-center rounded-lg border border-f1-border bg-f1-panel">
            <div className="flex items-center gap-3 text-slate-300">
              <RefreshCw className="animate-spin text-f1-red" />
              Loading telemetry...
            </div>
          </div>
        )}

        {errorMessage && !isLoading && (
          <div className="flex items-center gap-3 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-100">
            <AlertTriangle />
            {errorMessage}
          </div>
        )}

        {!isLoading && !errorMessage && dashboardData && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="Driver" value={driver.name} accent={driver.color} />
              <StatCard label="Team" value={driver.team} />
              <StatCard label="Fastest Lap" value={summary.fastestLap} />
              <StatCard label="Max Speed" value={summary.maxSpeed ? `${summary.maxSpeed} km/h` : "--"} />
              <StatCard label="Session" value={`${session.type}, ${session.location}`} />
            </section>

            <section className="rounded-lg border border-f1-border bg-black/25 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current Data</p>
              <p className="mt-2 text-sm text-slate-200">
                Driver and session list: 2026 session cache. Charts: {dataStatus?.source}.
              </p>
              <p className="mt-1 text-sm text-slate-300">{sessionStatus?.message}</p>
            </section>

            {hasChartData ? (
              <>
                <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <TelemetryChart
                    title="Speed Over Time"
                    data={telemetry}
                    yAxisLabel="km/h"
                    lines={[{ key: "speed", name: "Speed", color: "#e10600" }]}
                  />
                  <TelemetryChart
                    title="Throttle and Brake Over Time"
                    data={telemetry}
                    yAxisLabel="%"
                    lines={[
                      { key: "throttle", name: "Throttle", color: "#22c55e" },
                      { key: "brake", name: "Brake", color: "#facc15" },
                    ]}
                  />
                </section>

                <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
                  <TelemetryChart
                    title="Lap Times Per Lap"
                    data={lapTimes}
                    yAxisLabel="seconds"
                    xKey="lap"
                    xUnit=""
                    yDomain={["dataMin - 1", "dataMax + 1"]}
                    lines={[{ key: "lapTimeSeconds", name: "Lap Time", color: "#38bdf8" }]}
                  />
                  <LapTimesPanel lapTimes={lapTimes} />
                </section>
              </>
            ) : (
              <section className="flex items-center gap-4 rounded-lg border border-f1-border bg-f1-panel p-5 text-slate-200">
                <CalendarClock className="text-f1-red" />
                <div>
                  <p className="font-bold text-white">{sessionStatus?.label}</p>
                  <p className="mt-1 text-sm text-slate-300">{sessionStatus?.message}</p>
                </div>
              </section>
            )}

            <section className="grid gap-4 rounded-lg border border-f1-border bg-black/25 p-4 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <Gauge className="text-f1-red" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Car Number</p>
                  <p className="font-bold text-white">#{driver.number}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Activity className="text-green-400" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Data Points</p>
                  <p className="font-bold text-white">{hasChartData ? telemetry.length : "--"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Flag className="text-yellow-300" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Data Source</p>
                  <p className="font-bold text-white">OpenF1 API</p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
