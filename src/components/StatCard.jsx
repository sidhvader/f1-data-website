import React from "react";

export default function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-f1-border bg-f1-panel p-4 shadow-lg shadow-black/20">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-bold text-white sm:text-2xl" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}
