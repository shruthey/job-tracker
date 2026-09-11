"use client";

import { useSyncExternalStore } from "react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { STATUS_CHART_COLORS, STATUS_LABELS } from "@/lib/format";
import type { ApplicationStatus } from "@/db/schema";

const AXIS = { fontSize: 11, fill: "currentColor" };

/**
 * Recharts renders the tooltip into its own DOM subtree with inline styles, so
 * it cannot pick up a `dark:` utility. Reading the theme here keeps the tooltip
 * legible in dark mode, where the old hardcoded white-on-dark was not.
 */
function useIsDark() {
  return useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return () => observer.disconnect();
    },
    () => document.documentElement.classList.contains("dark"),
    // The server cannot know the theme; the light tooltip is the safe default,
    // and it is corrected on the client before the tooltip is ever shown.
    () => false,
  );
}

function useTooltipStyle() {
  const isDark = useIsDark();

  return {
    fontSize: 12,
    borderRadius: 8,
    border: `1px solid ${isDark ? "rgb(63 63 70)" : "rgb(228 228 231)"}`,
    background: isDark ? "rgb(24 24 27)" : "rgb(255 255 255)",
    color: isDark ? "rgb(244 244 245)" : "rgb(24 24 27)",
    boxShadow: isDark
      ? "0 8px 24px rgb(0 0 0 / 0.5)"
      : "0 8px 24px rgb(24 24 27 / 0.12)",
  };
}

export function FunnelChart({
  data,
}: {
  data: { status: ApplicationStatus; reached: number }[];
}) {
  const rows = data.map((d) => ({ ...d, label: STATUS_LABELS[d.status] }));
  const tooltipStyle = useTooltipStyle();

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "currentColor", opacity: 0.06 }} />
        <Bar dataKey="reached" name="Reached" radius={[4, 4, 0, 0]}>
          {rows.map((row) => (
            <Cell key={row.status} fill={STATUS_CHART_COLORS[row.status]} />
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
  const tooltipStyle = useTooltipStyle();
  const rows = data
    .filter((d) => d.medianDays !== null)
    .map((d) => ({
      status: d.status,
      label: STATUS_LABELS[d.status],
      days: Number(d.medianDays!.toFixed(1)),
    }));

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
        <Bar dataKey="days" name="Median days" radius={[0, 4, 4, 0]}>
          {rows.map((row) => (
            <Cell key={row.status} fill={STATUS_CHART_COLORS[row.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ActivityChart({
  data,
}: {
  data: { week: string; applied: number }[];
}) {
  const tooltipStyle = useTooltipStyle();

  if (data.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No applications submitted in the last six months.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} />
        <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="applied"
          name="Applications"
          stroke="#8b5cf6"
          strokeWidth={2}
          fill="url(#activityFill)"
          dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
