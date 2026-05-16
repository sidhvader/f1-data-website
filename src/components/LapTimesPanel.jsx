import React from "react";

export default function LapTimesPanel({ lapTimes }) {
  const fastestLap = lapTimes.reduce((fastest, current) => {
    return current.lapTimeSeconds < fastest.lapTimeSeconds ? current : fastest;
  }, lapTimes[0]);

  return (
    <section className="rounded-lg border border-f1-border bg-f1-panel p-4 shadow-xl shadow-black/20">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-base font-bold text-white sm:text-lg">Lap Times Per Lap</h2>
        <span className="text-xs uppercase tracking-wide text-slate-400">Fastest lap {fastestLap?.lapTime ?? "--"}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="border-b border-f1-border text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-3 pr-4">Lap</th>
              <th className="py-3 pr-4">Lap Time</th>
              <th className="py-3 pr-4">Gap to Fastest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-f1-border text-slate-200">
            {lapTimes.map((lap) => {
              const gap = lap.lapTimeSeconds - fastestLap.lapTimeSeconds;

              return (
                <tr key={lap.lap}>
                  <td className="py-3 pr-4 font-bold text-white">Lap {lap.lap}</td>
                  <td className="py-3 pr-4">{lap.lapTime}</td>
                  <td className="py-3 pr-4">{gap === 0 ? "Fastest" : `+${gap.toFixed(3)}s`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
