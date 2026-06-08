import type { ScheduleDraft } from "./types";
import { getCurrentTimezoneOffsetMinutes } from "./timezone";

export const DEFAULT_SCHEDULE: ScheduleDraft = {
  month: null,
  dayMode: "every_day",
  dayOfWeek: 1,
  dayOfMonth: 1,
  hour: 9,
  minute: 0,
  second: 0,
};

const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6];
const MONTH_LENGTHS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const SHIFT_YEAR = 2024;

export function buildCronExpression(draft: ScheduleDraft): string {
  const normalized = normalizeDraft(draft);
  const second = formatTimeToken(normalized.second, 0, 59);
  const minute = formatTimeToken(normalized.minute, 0, 59);
  const hour = formatTimeToken(normalized.hour, 0, 23);
  const month = normalized.month === null ? "*" : normalized.month.toString();

  if (normalized.dayMode === "every_day") {
    return `${second} ${minute} ${hour} * ${month} *`;
  }

  if (normalized.dayMode === "weekday") {
    return `${second} ${minute} ${hour} * ${month} ${normalized.dayOfWeek}`;
  }

  return `${second} ${minute} ${hour} ${normalized.dayOfMonth} ${month} *`;
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
  const minute = parseNumericOrWildcard(minuteToken, 0, 59);
  const hour = parseNumericOrWildcard(hourToken, 0, 23);
  const month = parseNumericOrWildcard(monthToken, 1, 12);
  const dayOfMonth = parseNumericOrWildcard(dayOfMonthToken, 1, 31);
  const dayOfWeek = parseNumericOrWildcard(dayOfWeekToken, 0, 6);

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
      dayOfWeek: 1,
      dayOfMonth: 1,
      hour: resolvedHour,
      minute: resolvedMinute,
      second: resolvedSecond,
    });
  }

  if (dayOfMonth === "*" && typeof dayOfWeek === "number") {
    return normalizeDraft({
      month: resolvedMonth,
      dayMode: "weekday",
      dayOfWeek,
      dayOfMonth: 1,
      hour: resolvedHour,
      minute: resolvedMinute,
      second: resolvedSecond,
    });
  }

  if (typeof dayOfMonth === "number" && dayOfWeek === "*") {
    return normalizeDraft({
      month: resolvedMonth,
      dayMode: "date",
      dayOfWeek: 1,
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

export function maxDayForMonth(month: number | null): number {
  if (month === null) {
    return 31;
  }

  return MONTH_LENGTHS[clampInteger(month, 1, 12) - 1];
}

export function normalizeDraft(draft: ScheduleDraft): ScheduleDraft {
  const month = draft.month === null ? null : clampInteger(draft.month, 1, 12);
  return {
    month,
    dayMode: draft.dayMode,
    dayOfWeek: WEEKDAY_ORDER.includes(draft.dayOfWeek) ? draft.dayOfWeek : 1,
    dayOfMonth: clampInteger(draft.dayOfMonth, 1, maxDayForMonth(month)),
    hour: draft.hour === null ? null : clampInteger(draft.hour, 0, 23),
    minute: draft.minute === null ? null : clampInteger(draft.minute, 0, 59),
    second: draft.second === null ? null : clampInteger(draft.second, 0, 59),
  };
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

function formatTimeToken(value: number | null, min: number, max: number): string {
  if (value === null) {
    return "*";
  }

  return clampInteger(value, min, max).toString();
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

    const shiftedHour = wrapHour(draft.hour + deltaMinutes / 60);
    return { ...draft, hour: shiftedHour };
  }

  const shifted = shiftFixedTime(draft.hour, draft.minute, deltaMinutes);
  return { ...draft, hour: shifted.hour, minute: shifted.minute };
}

function shiftWeekdayDraft(draft: ScheduleDraft, deltaMinutes: number): ScheduleDraft | null {
  if (draft.hour === null) {
    return deltaMinutes === 0 ? draft : null;
  }

  if (draft.minute === null) {
    if (deltaMinutes % 60 !== 0) {
      return null;
    }

    const shifted = shiftFixedTime(draft.hour, 0, deltaMinutes);
    return {
      ...draft,
      hour: shifted.hour,
      dayOfWeek: wrapWeekday(draft.dayOfWeek + shifted.dayShift),
    };
  }

  const shifted = shiftFixedTime(draft.hour, draft.minute, deltaMinutes);
  return {
    ...draft,
    hour: shifted.hour,
    minute: shifted.minute,
    dayOfWeek: wrapWeekday(draft.dayOfWeek + shifted.dayShift),
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

    const shiftedWithoutMonth = shiftFixedTime(draft.hour, draft.minute, deltaMinutes);
    if (shiftedWithoutMonth.dayShift !== 0) {
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

    const shiftedHourOnly = shiftFixedTime(draft.hour, 0, deltaMinutes);
    if (shiftedHourOnly.dayShift === 0) {
      return { ...draft, hour: shiftedHourOnly.hour };
    }

    const shiftedDate = shiftDateWithReference(draft.month, draft.dayOfMonth, draft.hour, 0, deltaMinutes);
    return {
      ...draft,
      month: shiftedDate.month,
      dayOfMonth: shiftedDate.dayOfMonth,
      hour: shiftedDate.hour,
    };
  }

  const shifted = shiftDateWithReference(draft.month, draft.dayOfMonth, draft.hour, draft.minute, deltaMinutes);
  return {
    ...draft,
    month: shifted.month,
    dayOfMonth: shifted.dayOfMonth,
    hour: shifted.hour,
    minute: shifted.minute,
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
