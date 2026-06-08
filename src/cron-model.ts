import type { MonthSelection, ScheduleDraft } from "./types";
import { getCurrentTimezoneOffsetMinutes } from "./timezone";

export const DEFAULT_SCHEDULE: ScheduleDraft = {
  month: null,
  dayMode: "every_day",
  dayOfWeek: [1],
  dayOfMonth: [1],
  hour: [9],
  minute: [0],
  second: 0,
};

const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6];
const MONTH_LENGTHS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const SHIFT_YEAR = 2024;

export function buildCronExpression(draft: ScheduleDraft): string {
  const normalized = normalizeDraft(draft);
  const second = formatTimeToken(normalized.second, 0, 59);
  const minute = formatSelectionToken(normalized.minute);
  const hour = formatSelectionToken(normalized.hour);
  const month = formatSelectionToken(normalized.month);

  if (normalized.dayMode === "every_day") {
    return `${second} ${minute} ${hour} * ${month} *`;
  }

  if (normalized.dayMode === "weekday") {
    return `${second} ${minute} ${hour} * ${month} ${formatSelectionToken(normalized.dayOfWeek)}`;
  }

  return `${second} ${minute} ${hour} ${formatSelectionToken(normalized.dayOfMonth)} ${month} *`;
}

export function buildUtcCronExpression(draft: ScheduleDraft, timezone: string): string | null {
  const offsetMinutes = getCurrentTimezoneOffsetMinutes(timezone);
  if (offsetMinutes === null) {
    return null;
  }

  const utcDraft = shiftDraftByMinutes(draft, -offsetMinutes);
  return utcDraft ? buildCronExpression(utcDraft) : null;
}

export function parseCronExpression(cron: string): ScheduleDraft | null {
  const trimmed = cron.trim();

  if (trimmed.length === 0) {
    return DEFAULT_SCHEDULE;
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length !== 6) {
    return null;
  }

  const [secondToken, minuteToken, hourToken, dayOfMonthToken, monthToken, dayOfWeekToken] = parts;
  const second = parseNumericOrWildcard(secondToken, 0, 59);
  const minute = parseNumericListOrWildcard(minuteToken, 0, 59);
  const hour = parseNumericListOrWildcard(hourToken, 0, 23);
  const month = parseNumericListOrWildcard(monthToken, 1, 12);
  const dayOfMonth = parseNumericListOrWildcard(dayOfMonthToken, 1, 31);
  const dayOfWeek = parseNumericListOrWildcard(dayOfWeekToken, 0, 6);

  if (second === null || minute === null || hour === null || month === null || dayOfMonth === null || dayOfWeek === null) {
    return null;
  }

  const resolvedMonth = month === "*" ? null : month;
  const resolvedSecond = second === "*" ? null : second;
  const resolvedMinute = minute === "*" ? null : minute;
  const resolvedHour = hour === "*" ? null : hour;

  if (dayOfMonth === "*" && dayOfWeek === "*") {
    return normalizeDraft({
      month: resolvedMonth,
      dayMode: "every_day",
      dayOfWeek: [1],
      dayOfMonth: [1],
      hour: resolvedHour,
      minute: resolvedMinute,
      second: resolvedSecond,
    });
  }

  if (dayOfMonth === "*" && dayOfWeek !== "*") {
    return normalizeDraft({
      month: resolvedMonth,
      dayMode: "weekday",
      dayOfWeek,
      dayOfMonth: [1],
      hour: resolvedHour,
      minute: resolvedMinute,
      second: resolvedSecond,
    });
  }

  if (dayOfMonth !== "*" && dayOfWeek === "*") {
    return normalizeDraft({
      month: resolvedMonth,
      dayMode: "date",
      dayOfWeek: [1],
      dayOfMonth,
      hour: resolvedHour,
      minute: resolvedMinute,
      second: resolvedSecond,
    });
  }

  return null;
}

export function parseUtcCronExpression(cron: string, timezone: string): ScheduleDraft | null {
  const utcDraft = parseCronExpression(cron);
  if (!utcDraft) {
    return null;
  }

  const offsetMinutes = getCurrentTimezoneOffsetMinutes(timezone);
  if (offsetMinutes === null) {
    return null;
  }

  return shiftDraftByMinutes(utcDraft, offsetMinutes);
}

export function monthOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "*", label: "Every month" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];
}

export function weekdayOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "0", label: "Sunday" },
    { value: "1", label: "Monday" },
    { value: "2", label: "Tuesday" },
    { value: "3", label: "Wednesday" },
    { value: "4", label: "Thursday" },
    { value: "5", label: "Friday" },
    { value: "6", label: "Saturday" },
  ];
}

export function maxDayForMonth(month: MonthSelection): number {
  if (month === null) {
    return 31;
  }

  return Math.min(...month.map((value) => MONTH_LENGTHS[clampInteger(value, 1, 12) - 1]));
}

export function normalizeDraft(draft: ScheduleDraft): ScheduleDraft {
  const month = normalizeSelection(draft.month, 1, 12, { collapseFullSelection: true });
  const dayOfWeek = normalizeSelection(draft.dayOfWeek, 0, 6, { collapseFullSelection: false }) ?? [1];
  const dayOfMonth = normalizeSelection(draft.dayOfMonth, 1, maxDayForMonth(month), { collapseFullSelection: false }) ?? [1];
  const hour = normalizeSelection(draft.hour, 0, 23, { collapseFullSelection: true });
  const minute = normalizeSelection(draft.minute, 0, 59, { collapseFullSelection: true });
  return {
    month,
    dayMode: draft.dayMode,
    dayOfWeek: dayOfWeek.filter((value) => WEEKDAY_ORDER.includes(value)),
    dayOfMonth,
    hour,
    minute,
    second: draft.second === null ? null : clampInteger(draft.second, 0, 59),
  };
}

function normalizeSelection(
  values: number[] | null,
  min: number,
  max: number,
  options: { collapseFullSelection: boolean },
): number[] | null {
  if (values === null) {
    return null;
  }

  const normalized = Array.from(new Set(values.map((value) => clampInteger(value, min, max)))).sort((left, right) => left - right);
  if (normalized.length === 0) {
    return null;
  }

  if (options.collapseFullSelection && normalized.length === max - min + 1) {
    return null;
  }

  return normalized;
}

function parseNumericOrWildcard(token: string, min: number, max: number): number | "*" | null {
  if (token === "*") {
    return "*";
  }

  if (!/^\d+$/.test(token)) {
    return null;
  }

  const parsed = Number.parseInt(token, 10);
  if (parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}

function parseNumericListOrWildcard(token: string, min: number, max: number): number[] | "*" | null {
  if (token === "*") {
    return "*";
  }

  if (token.includes("-") || token.includes("/")) {
    return null;
  }

  const parts = token.split(",");
  if (parts.some((part) => part.length === 0)) {
    return null;
  }

  const parsed = parts.map((part) => parseNumericOrWildcard(part, min, max));
  if (parsed.some((value) => value === null || value === "*")) {
    return null;
  }

  return Array.from(new Set(parsed as number[])).sort((left, right) => left - right);
}

function formatTimeToken(value: number | null, min: number, max: number): string {
  if (value === null) {
    return "*";
  }

  return clampInteger(value, min, max).toString();
}

function formatSelectionToken(values: number[] | null): string {
  if (values === null) {
    return "*";
  }

  return values.join(",");
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}

function shiftDraftByMinutes(draft: ScheduleDraft, deltaMinutes: number): ScheduleDraft | null {
  const normalized = normalizeDraft(draft);

  if (normalized.dayMode === "every_day") {
    return shiftEveryDayDraft(normalized, deltaMinutes);
  }

  if (normalized.dayMode === "weekday") {
    return shiftWeekdayDraft(normalized, deltaMinutes);
  }

  return shiftDateDraft(normalized, deltaMinutes);
}

function shiftEveryDayDraft(draft: ScheduleDraft, deltaMinutes: number): ScheduleDraft | null {
  if (draft.hour === null) {
    return draft;
  }

  if (draft.minute === null) {
    if (deltaMinutes % 60 !== 0) {
      return null;
    }

    return {
      ...draft,
      hour: draft.hour.map((value) => wrapHour(value + deltaMinutes / 60)),
    };
  }

  const shifted = shiftTimeSelections(draft.hour, draft.minute, deltaMinutes);
  if (!shifted) {
    return null;
  }

  return {
    ...draft,
    hour: shifted.hour,
    minute: shifted.minute,
  };
}

function shiftWeekdayDraft(draft: ScheduleDraft, deltaMinutes: number): ScheduleDraft | null {
  if (draft.hour === null) {
    return deltaMinutes === 0 ? draft : null;
  }

  if (draft.minute === null) {
    if (deltaMinutes % 60 !== 0) {
      return null;
    }

    const shiftedHours = draft.hour.map((value) => shiftFixedTime(value, 0, deltaMinutes));
    const dayShifts = new Set(shiftedHours.map((value) => value.dayShift));
    if (dayShifts.size !== 1) {
      return null;
    }

    return {
      ...draft,
      hour: shiftedHours.map((value) => value.hour),
      dayOfWeek: draft.dayOfWeek.map((value) => wrapWeekday(value + shiftedHours[0].dayShift)),
    };
  }

  const shifted = shiftTimeSelections(draft.hour, draft.minute, deltaMinutes, { requireUniformDayShift: true });
  if (!shifted) {
    return null;
  }

  return {
    ...draft,
    hour: shifted.hour,
    minute: shifted.minute,
    dayOfWeek: draft.dayOfWeek.map((value) => wrapWeekday(value + shifted.dayShift)),
  };
}

function shiftDateDraft(draft: ScheduleDraft, deltaMinutes: number): ScheduleDraft | null {
  if (draft.hour === null) {
    return deltaMinutes === 0 ? draft : null;
  }

  if (draft.month === null) {
    if (draft.minute === null) {
      return deltaMinutes === 0 ? draft : null;
    }

    const shiftedWithoutMonth = shiftTimeSelections(draft.hour, draft.minute, deltaMinutes, { requireUniformDayShift: true });
    if (!shiftedWithoutMonth || shiftedWithoutMonth.dayShift !== 0) {
      return null;
    }

    return {
      ...draft,
      hour: shiftedWithoutMonth.hour,
      minute: shiftedWithoutMonth.minute,
    };
  }

  if (draft.minute === null) {
    if (deltaMinutes % 60 !== 0) {
      return null;
    }

    const shiftedHours = draft.hour.map((value) => shiftFixedTime(value, 0, deltaMinutes));
    const dayShifts = new Set(shiftedHours.map((value) => value.dayShift));
    if (dayShifts.size !== 1) {
      return null;
    }

    if (shiftedHours[0].dayShift === 0) {
      return {
        ...draft,
        hour: shiftedHours.map((value) => value.hour),
      };
    }

    const shiftedDate = shiftDateSelections(draft.month, draft.dayOfMonth, shiftedHours[0].dayShift);
    if (!shiftedDate) {
      return null;
    }

    return {
      ...draft,
      month: shiftedDate.month,
      dayOfMonth: shiftedDate.dayOfMonth,
      hour: shiftedHours.map((value) => value.hour),
    };
  }

  const shiftedTime = shiftTimeSelections(draft.hour, draft.minute, deltaMinutes, { requireUniformDayShift: true });
  if (!shiftedTime) {
    return null;
  }

  const shifted = shiftDateSelections(draft.month, draft.dayOfMonth, shiftedTime.dayShift);
  if (!shifted) {
    return null;
  }

  return {
    ...draft,
    month: shifted.month,
    dayOfMonth: shifted.dayOfMonth,
    hour: shiftedTime.hour,
    minute: shiftedTime.minute,
  };
}

function shiftDateSelections(
  months: number[],
  dayOfMonth: number[],
  dayShift: number,
) {
  const shiftedSelections = months.flatMap((month) =>
    dayOfMonth.map((date) => shiftDateWithReference(month, date, 12, 0, dayShift * 1440)),
  );
  const monthValues = normalizeSelection(
    shiftedSelections.map((selection) => selection.month),
    1,
    12,
    { collapseFullSelection: true },
  );
  const dayValues = normalizeSelection(
    shiftedSelections.map((selection) => selection.dayOfMonth),
    1,
    31,
    { collapseFullSelection: false },
  );
  if (!dayValues) {
    return null;
  }

  const uniquePairs = new Set(shiftedSelections.map((selection) => `${selection.month}:${selection.dayOfMonth}`));
  const monthCount = monthValues === null ? 12 : monthValues.length;
  if (uniquePairs.size !== monthCount * dayValues.length) {
    return null;
  }

  return {
    month: monthValues,
    dayOfMonth: dayValues,
  };
}

function shiftTimeSelections(
  hours: number[],
  minutes: number[],
  deltaMinutes: number,
  options?: { requireUniformDayShift?: boolean },
) {
  const shiftedSelections = hours.flatMap((hour) =>
    minutes.map((minute) => shiftFixedTime(hour, minute, deltaMinutes)),
  );
  const dayShifts = new Set(shiftedSelections.map((selection) => selection.dayShift));
  if (options?.requireUniformDayShift && dayShifts.size !== 1) {
    return null;
  }

  const nextHours = Array.from(new Set(shiftedSelections.map((selection) => selection.hour))).sort((left, right) => left - right);
  const nextMinutes = Array.from(new Set(shiftedSelections.map((selection) => selection.minute))).sort((left, right) => left - right);
  const uniquePairs = new Set(shiftedSelections.map((selection) => `${selection.hour}:${selection.minute}`));
  if (uniquePairs.size !== nextHours.length * nextMinutes.length) {
    return null;
  }

  return {
    hour: nextHours,
    minute: nextMinutes,
    dayShift: shiftedSelections[0]?.dayShift ?? 0,
  };
}

function shiftFixedTime(hour: number, minute: number, deltaMinutes: number) {
  const totalMinutes = hour * 60 + minute + deltaMinutes;
  const dayShift = Math.floor(totalMinutes / 1440);
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  return {
    dayShift,
    hour: Math.floor(normalizedMinutes / 60),
    minute: normalizedMinutes % 60,
  };
}

function shiftDateWithReference(month: number, dayOfMonth: number, hour: number, minute: number, deltaMinutes: number) {
  const shiftedDate = new Date(Date.UTC(SHIFT_YEAR, month - 1, dayOfMonth, hour, minute));
  shiftedDate.setUTCMinutes(shiftedDate.getUTCMinutes() + deltaMinutes);
  return {
    month: shiftedDate.getUTCMonth() + 1,
    dayOfMonth: shiftedDate.getUTCDate(),
    hour: shiftedDate.getUTCHours(),
    minute: shiftedDate.getUTCMinutes(),
  };
}

function wrapHour(hour: number): number {
  return ((hour % 24) + 24) % 24;
}

function wrapWeekday(dayOfWeek: number): number {
  return ((dayOfWeek % 7) + 7) % 7;
}
