import { monthOptions, weekdayOptions } from "./cron-model";
import type { DisplayFormat, ScheduleDraft } from "./types";

const MONTH_LABELS = new Map(monthOptions().filter((option) => option.value !== "*").map((option) => [Number(option.value), option.label]));
const WEEKDAY_LABELS = new Map(weekdayOptions().map((option) => [Number(option.value), option.label]));

type ResolvedDisplayFormat = {
  hourCycle: "12h" | "24h";
  leadingZero: boolean;
  legacySummaryHour: boolean;
};

export function formatScheduleSummary(draft: ScheduleDraft, timezone: string, displayFormat?: DisplayFormat): string {
  const format = resolveDisplayFormat(displayFormat, "summary");
  const monthLabel = draft.month === null ? "every month" : MONTH_LABELS.get(draft.month) ?? "that month";
  const cadenceLabel = formatCadence(draft, format);

  if (draft.dayMode === "every_day") {
    return `Runs ${cadenceLabel} in ${monthLabel} (${timezone})`;
  }

  if (draft.dayMode === "weekday") {
    const weekdayLabel = WEEKDAY_LABELS.get(draft.dayOfWeek) ?? "Monday";
    return `Runs ${cadenceLabel} every ${weekdayLabel} in ${monthLabel} (${timezone})`;
  }

  return `Runs ${cadenceLabel} on day ${draft.dayOfMonth} of ${monthLabel} (${timezone})`;
}

export function formatHourOptionLabel(hour: number, displayFormat?: DisplayFormat): string {
  const format = resolveDisplayFormat(displayFormat, "editor");
  if (format.hourCycle === "24h") {
    return formatNumber(hour, format.leadingZero);
  }

  return formatHourMinute(hour, 0, format);
}

export function formatTimeValueLabel(value: number, displayFormat?: DisplayFormat): string {
  const format = resolveDisplayFormat(displayFormat, "editor");
  return formatNumber(value, format.leadingZero);
}

function formatCadence(draft: ScheduleDraft, displayFormat: ResolvedDisplayFormat): string {
  if (draft.hour === null && draft.minute === null && draft.second === null) {
    return "every second";
  }

  if (draft.hour === null && draft.minute === null && draft.second !== null) {
    return `every minute at ${formatNumber(draft.second, displayFormat.leadingZero)} seconds`;
  }

  if (draft.hour === null && draft.minute !== null && draft.second === null) {
    return `every second at minute ${formatNumber(draft.minute, displayFormat.leadingZero)} of each hour`;
  }

  if (draft.hour === null && draft.minute !== null && draft.second !== null) {
    return `every hour at ${formatNumber(draft.minute, displayFormat.leadingZero)}:${formatNumber(draft.second, displayFormat.leadingZero)}`;
  }

  if (draft.hour !== null && draft.minute === null && draft.second === null) {
    return `every second during ${formatHourMinute(draft.hour, 0, displayFormat)}`;
  }

  if (draft.hour !== null && draft.minute === null && draft.second !== null) {
    return `every minute during ${formatHourMinute(draft.hour, 0, displayFormat)} at ${formatNumber(draft.second, displayFormat.leadingZero)} seconds`;
  }

  if (draft.hour !== null && draft.minute !== null && draft.second === null) {
    return `every second at ${formatHourMinute(draft.hour, draft.minute, displayFormat)}`;
  }

  return `at ${formatTimeLabel(draft.hour ?? 0, draft.minute ?? 0, draft.second ?? 0, displayFormat)}`;
}

function formatTimeLabel(hour: number, minute: number, second: number, displayFormat: ResolvedDisplayFormat): string {
  if (displayFormat.hourCycle === "24h") {
    return `${formatNumber(hour, displayFormat.leadingZero)}:${formatNumber(minute, displayFormat.leadingZero)}:${formatNumber(second, displayFormat.leadingZero)}`;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${formatNumber(hour12, displayFormat.legacySummaryHour ? false : displayFormat.leadingZero)}:${formatNumber(minute, displayFormat.leadingZero)}:${formatNumber(second, displayFormat.leadingZero)} ${suffix}`;
}

function formatHourMinute(hour: number, minute: number, displayFormat: ResolvedDisplayFormat): string {
  if (displayFormat.hourCycle === "24h") {
    return `${formatNumber(hour, displayFormat.leadingZero)}:${formatNumber(minute, displayFormat.leadingZero)}`;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${formatNumber(hour12, displayFormat.legacySummaryHour ? false : displayFormat.leadingZero)}:${formatNumber(minute, displayFormat.leadingZero)} ${suffix}`;
}

function formatNumber(value: number, leadingZero: boolean): string {
  return leadingZero ? value.toString().padStart(2, "0") : value.toString();
}

function resolveDisplayFormat(displayFormat: DisplayFormat | undefined, surface: "editor" | "summary"): ResolvedDisplayFormat {
  return {
    hourCycle: displayFormat?.hourCycle ?? (surface === "editor" ? "24h" : "12h"),
    leadingZero: displayFormat?.leadingZero ?? true,
    legacySummaryHour: surface === "summary" && displayFormat?.leadingZero === undefined,
  };
}
