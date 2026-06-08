import { describe, expect, it } from "vitest";
import {
  buildCronExpression,
  buildUtcCronExpression,
  parseCronExpression,
  parseUtcCronExpression,
} from "../cron-model";
import { formatScheduleSummary } from "../summary";

describe("cron model", () => {
  it("serializes everyday schedules to six-field cron", () => {
    expect(
      buildCronExpression({
        month: null,
        dayMode: "every_day",
        dayOfWeek: 1,
        dayOfMonth: 1,
        hour: 9,
        minute: 30,
        second: 15,
      }),
    ).toBe("15 30 9 * * *");
  });

  it("supports wildcard seconds within a fixed weekday and time", () => {
    expect(
      buildCronExpression({
        month: null,
        dayMode: "weekday",
        dayOfWeek: 1,
        dayOfMonth: 1,
        hour: 0,
        minute: 0,
        second: null,
      }),
    ).toBe("* 0 0 * * 1");
  });

  it("supports every minute via the minute dropdown wildcard", () => {
    expect(
      buildCronExpression({
        month: null,
        dayMode: "every_day",
        dayOfWeek: 1,
        dayOfMonth: 1,
        hour: null,
        minute: null,
        second: 15,
      }),
    ).toBe("15 * * * * *");
  });

  it("supports every second globally via time-field wildcards", () => {
    expect(
      buildCronExpression({
        month: null,
        dayMode: "every_day",
        dayOfWeek: 1,
        dayOfMonth: 1,
        hour: null,
        minute: null,
        second: null,
      }),
    ).toBe("* * * * * *");
  });

  it("parses supported wildcard-second cron", () => {
    expect(parseCronExpression("* 0 0 * * 1")).toEqual({
      month: null,
      dayMode: "weekday",
      dayOfWeek: 1,
      dayOfMonth: 1,
      hour: 0,
      minute: 0,
      second: null,
    });
  });

  it("rejects unsupported mixed day-of-month and day-of-week cron", () => {
    expect(parseCronExpression("0 0 9 1 5 1")).toBeNull();
  });

  it("formats a human-readable every-second weekday summary with timezone", () => {
    expect(
      formatScheduleSummary(
        {
          month: null,
          dayMode: "weekday",
          dayOfWeek: 1,
          dayOfMonth: 1,
          hour: 0,
          minute: 0,
          second: null,
        },
        "America/New_York",
      ),
    ).toBe("Runs every second at 12:00 AM every Monday in every month (America/New_York)");
  });

  it("formats summaries in 24-hour mode without leading zeros when requested", () => {
    expect(
      formatScheduleSummary(
        {
          month: null,
          dayMode: "every_day",
          dayOfWeek: 1,
          dayOfMonth: 1,
          hour: 3,
          minute: 5,
          second: 9,
        },
        "UTC",
        { hourCycle: "24h", leadingZero: false },
      ),
    ).toBe("Runs at 3:5:9 in every month (UTC)");
  });

  it("formats summaries in 12-hour mode with leading zeros when requested", () => {
    expect(
      formatScheduleSummary(
        {
          month: null,
          dayMode: "every_day",
          dayOfWeek: 1,
          dayOfMonth: 1,
          hour: 15,
          minute: 5,
          second: 9,
        },
        "UTC",
        { hourCycle: "12h", leadingZero: true },
      ),
    ).toBe("Runs at 03:05:09 PM in every month (UTC)");
  });

  it("converts a local fixed-time daily schedule into UTC cron for the selected timezone", () => {
    expect(
      buildUtcCronExpression(
        {
          month: null,
          dayMode: "every_day",
          dayOfWeek: 1,
          dayOfMonth: 1,
          hour: 3,
          minute: 0,
          second: 30,
        },
        "Europe/Kiev",
      ),
    ).toBe("30 0 0 * * *");
  });

  it("keeps all-day every-minute schedules stable across timezone conversion", () => {
    expect(
      buildUtcCronExpression(
        {
          month: null,
          dayMode: "every_day",
          dayOfWeek: 1,
          dayOfMonth: 1,
          hour: null,
          minute: null,
          second: 45,
        },
        "Europe/Kiev",
      ),
    ).toBe("45 * * * * *");
  });

  it("rejects weekday schedules that are every hour in non-UTC timezones", () => {
    expect(
      buildUtcCronExpression(
        {
          month: null,
          dayMode: "weekday",
          dayOfWeek: 1,
          dayOfMonth: 1,
          hour: null,
          minute: 0,
          second: 0,
        },
        "Europe/Kiev",
      ),
    ).toBeNull();
  });

  it("converts a UTC cron into the editor timezone for display", () => {
    expect(parseUtcCronExpression("30 0 0 * * *", "Europe/Kiev")).toEqual({
      month: null,
      dayMode: "every_day",
      dayOfWeek: 1,
      dayOfMonth: 1,
      hour: 3,
      minute: 0,
      second: 30,
    });
  });

  it("shifts dated schedules across month boundaries when a specific month is selected", () => {
    expect(parseUtcCronExpression("0 30 22 31 12 *", "Europe/Kiev")).toEqual({
      month: 1,
      dayMode: "date",
      dayOfWeek: 1,
      dayOfMonth: 1,
      hour: 1,
      minute: 30,
      second: 0,
    });
  });
});
