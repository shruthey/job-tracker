"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { STATUS_LABELS } from "@/lib/format";
import type { ApplicationStatus } from "@/db/schema";

/**
 * One ordered palette, used positionally so a funnel reads as a single ramp
 * rather than nine unrelated hues.
 */
const RAMP = [
  "#a1a1aa",
  "#60a5fa",
  "#22d3ee",
  "#a78bfa",
  "#fbbf24",
  "#34d399",
];

const AXIS = { fontSize: 11, fill: "currentColor" };

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid rgb(228 228 231)",
  background: "rgb(255 255 255)",
  color: "rgb(24 24 27)",
};

export function FunnelChart({
  data,
}: {
  data: { status: ApplicationStatus; reached: number }[];
}) {
  const rows = data.map((d) => ({ ...d, label: STATUS_LABELS[d.status] }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "currentColor", opacity: 0.06 }} />
        <Bar dataKey="reached" name="Reached" radius={[4, 4, 0, 0]}>
          {rows.map((_, i) => (
            <Cell key={i} fill={RAMP[i % RAMP.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StageDurationChart({
  data,
}: {
  data: { status: ApplicationStatus; medianDays: number | null }[];
}) {
  const rows = data
    .filter((d) => d.medianDays !== null)
    .map((d) => ({ label: STATUS_LABELS[d.status], days: Number(d.medianDays!.toFixed(1)) }));

  if (rows.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Not enough history yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} unit="d" />
        <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={72} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "currentColor", opacity: 0.06 }} />
        <Bar dataKey="days" name="Median days" fill="#60a5fa" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ActivityChart({
  data,
}: {
  data: { week: string; applied: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No applications submitted in the last six months.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} />
        <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="applied"
          name="Applications"
          stroke="#34d399"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
