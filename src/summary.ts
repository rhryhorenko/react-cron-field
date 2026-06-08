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
  const monthLabel = formatMonthLabel(draft.month);
  const cadenceLabel = formatCadence(draft, format);

  if (draft.dayMode === "every_day") {
    return `Runs ${cadenceLabel} in ${monthLabel} (${timezone})`;
  }

  if (draft.dayMode === "weekday") {
    return `Runs ${cadenceLabel} ${formatWeekdayPhrase(draft.dayOfWeek)} in ${monthLabel} (${timezone})`;
  }

  return `Runs ${cadenceLabel} ${formatDatePhrase(draft.dayOfMonth)} of ${monthLabel} (${timezone})`;
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
    return `every second at ${formatMinutePhrase(draft.minute, displayFormat)} of each hour`;
  }

  if (draft.hour === null && draft.minute !== null && draft.second !== null) {
    return `every hour at ${formatMinuteSecondPhrase(draft.minute, draft.second, displayFormat)}`;
  }

  if (draft.hour !== null && draft.minute === null && draft.second === null) {
    return `every second during ${formatHourSelectionPhrase(draft.hour, displayFormat)}`;
  }

  if (draft.hour !== null && draft.minute === null && draft.second !== null) {
    return `every minute during ${formatHourSelectionPhrase(draft.hour, displayFormat)} at ${formatNumber(draft.second, displayFormat.leadingZero)} seconds`;
  }

  if (draft.hour !== null && draft.minute !== null && draft.second === null) {
    return `every second at ${formatHourMinuteSelectionPhrase(draft.hour, draft.minute, displayFormat)}`;
  }

  return `at ${formatFixedTimeSelectionPhrase(draft.hour ?? [0], draft.minute ?? [0], draft.second ?? 0, displayFormat)}`;
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

function formatMonthLabel(months: number[] | null): string {
  if (months === null) {
    return "every month";
  }

  const labels = months.map((month) => MONTH_LABELS.get(month) ?? `month ${month}`);
  return formatLabelList(labels);
}

function formatWeekdayPhrase(days: number[]): string {
  const labels = days.map((day) => WEEKDAY_LABELS.get(day) ?? "Monday");
  if (labels.length === 1) {
    return `every ${labels[0]}`;
  }

  return `on ${formatLabelList(labels)}`;
}

function formatDatePhrase(days: number[]): string {
  const labels = days.map((day) => day.toString());
  if (labels.length === 1) {
    return `on day ${labels[0]}`;
  }

  return `on days ${formatLabelList(labels)}`;
}

function formatLabelList(labels: string[]): string {
  if (labels.length <= 2) {
    return joinWithAnd(labels);
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function joinWithAnd(labels: string[]): string {
  if (labels.length === 0) {
    return "";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  return `${labels[0]} and ${labels[1]}`;
}

function formatMinutePhrase(minutes: number[], displayFormat: ResolvedDisplayFormat): string {
  if (minutes.length === 1) {
    return `minute ${formatNumber(minutes[0], displayFormat.leadingZero)}`;
  }

  return `minutes ${formatLabelList(minutes.map((minute) => formatNumber(minute, displayFormat.leadingZero)))}`;
}

function formatMinuteSecondPhrase(minutes: number[], second: number, displayFormat: ResolvedDisplayFormat): string {
  if (minutes.length === 1) {
    return `${formatNumber(minutes[0], displayFormat.leadingZero)}:${formatNumber(second, displayFormat.leadingZero)}`;
  }

  return formatLabelList(
    minutes.map((minute) => `${formatNumber(minute, displayFormat.leadingZero)}:${formatNumber(second, displayFormat.leadingZero)}`),
  );
}

function formatHourSelectionPhrase(hours: number[], displayFormat: ResolvedDisplayFormat): string {
  return formatLabelList(hours.map((hour) => formatHourMinute(hour, 0, displayFormat)));
}

function formatHourMinuteSelectionPhrase(hours: number[], minutes: number[], displayFormat: ResolvedDisplayFormat): string {
  return formatLabelList(
    buildTimePairs(hours, minutes).map(({ hour, minute }) => formatHourMinute(hour, minute, displayFormat)),
  );
}

function formatFixedTimeSelectionPhrase(
  hours: number[],
  minutes: number[],
  second: number,
  displayFormat: ResolvedDisplayFormat,
): string {
  return formatLabelList(
    buildTimePairs(hours, minutes).map(({ hour, minute }) => formatTimeLabel(hour, minute, second, displayFormat)),
  );
}

function buildTimePairs(hours: number[], minutes: number[]): Array<{ hour: number; minute: number }> {
  return hours.flatMap((hour) => minutes.map((minute) => ({ hour, minute })));
}
