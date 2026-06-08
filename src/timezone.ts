export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone
    }).format(new Date("2026-01-01T00:00:00Z"));
    return true;
  } catch {
    return false;
  }
}

export function getCurrentTimezoneOffsetMinutes(timezone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset"
    }).formatToParts(new Date());
    const offsetLabel = parts.find((part) => part.type === "timeZoneName")?.value;

    if (!offsetLabel || offsetLabel === "GMT") {
      return 0;
    }

    const match = offsetLabel.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
    if (!match) {
      return 0;
    }

    const [, sign, hourToken, minuteToken] = match;
    const hours = Number.parseInt(hourToken, 10);
    const minutes = Number.parseInt(minuteToken ?? "0", 10);
    const totalMinutes = hours * 60 + minutes;
    return sign === "+" ? totalMinutes : -totalMinutes;
  } catch {
    return null;
  }
}
