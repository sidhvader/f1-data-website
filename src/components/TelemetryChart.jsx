import React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function TelemetryChart({ title, data, lines, yAxisLabel, xKey = "time", xUnit = "s", yDomain }) {
  return (
    <section className="min-w-0 rounded-lg border border-f1-border bg-f1-panel p-4 shadow-xl shadow-black/20">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-base font-bold text-white sm:text-lg">{title}</h2>
        <span className="text-xs uppercase tracking-wide text-slate-400">{yAxisLabel}</span>
      </div>

      <div className="h-64 min-w-0 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
            <CartesianGrid stroke="#2a2e38" strokeDasharray="4 4" />
            <XAxis dataKey={xKey} tickLine={false} axisLine={{ stroke: "#3a3f4b" }} unit={xUnit} />
            <YAxis tickLine={false} axisLine={{ stroke: "#3a3f4b" }} domain={yDomain} />
            <Tooltip
              contentStyle={{
                background: "#101114",
                border: "1px solid #2a2e38",
                borderRadius: "8px",
                color: "#ffffff",
              }}
              labelFormatter={(value) => `${value}s`}
            />
            <Legend />
            {lines.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name}
                stroke={line.color}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
