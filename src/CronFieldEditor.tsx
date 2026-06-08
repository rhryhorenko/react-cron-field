import { useEffect, useMemo, useState } from "react";
import {
  buildUtcCronExpression,
  DEFAULT_SCHEDULE,
  maxDayForMonth,
  monthOptions,
  normalizeDraft,
  parseCronExpression,
  parseUtcCronExpression,
  weekdayOptions,
} from "./cron-model";
import { Dropdown } from "./Dropdown";
import {
  formatHourOptionLabel,
  formatScheduleSummary,
  formatTimeValueLabel,
} from "./summary";
import { isValidTimezone } from "./timezone";
import type {
  CronFieldEditorProps,
  ScheduleDraft,
  ValidityState,
} from "./types";
import "./styles.css";

const DAY_MODE_OPTIONS = [
  { value: "every_day", label: "Every day" },
  { value: "weekday", label: "Specific weekday" },
  { value: "date", label: "Specific date" },
] as const;

const SHORT_MONTH_LABELS = new Map([
  ["1", "JAN"],
  ["2", "FEB"],
  ["3", "MAR"],
  ["4", "APR"],
  ["5", "MAY"],
  ["6", "JUN"],
  ["7", "JUL"],
  ["8", "AUG"],
  ["9", "SEP"],
  ["10", "OCT"],
  ["11", "NOV"],
  ["12", "DEC"],
]);

const SHORT_WEEKDAY_LABELS = new Map([
  ["0", "SUN"],
  ["1", "MON"],
  ["2", "TUE"],
  ["3", "WED"],
  ["4", "THU"],
  ["5", "FRI"],
  ["6", "SAT"],
]);

const getIsTimeZoneUTC = (timezone: string) => timezone.toUpperCase() === "UTC";

export function CronFieldEditor({
  value,
  onChange,
  onValidityChange,
  className,
  dropdownAppearance,
  displayFormat,
  errorClassName,
  multiselect,
  disabled = false,
  timezone = "UTC",
}: CronFieldEditorProps) {
  const [draft, setDraft] = useState<ScheduleDraft>(DEFAULT_SCHEDULE);
  const [commitValidity, setCommitValidity] = useState<ValidityState | null>(
    null,
  );
  const derivedValidity = useMemo(
    () => deriveValidity(value, timezone),
    [timezone, value],
  );
  const isTimezoneUTC = useMemo(() => getIsTimeZoneUTC(timezone), [timezone]);

  const {
    monthMultiselectEnabled,
    weekdayMultiselectEnabled,
    dateMultiselectEnabled,
    hourMultiselectEnabled,
    minuteMultiselectEnabled,
  } = useMemo(() => {
    const result = {
      monthMultiselectEnabled: false,
      weekdayMultiselectEnabled: false,
      dateMultiselectEnabled: false,
      hourMultiselectEnabled: false,
      minuteMultiselectEnabled: false,
    };

    if (!isTimezoneUTC) {
      return result;
    }

    result.monthMultiselectEnabled = multiselect?.month ?? false;
    result.weekdayMultiselectEnabled = multiselect?.weekday ?? false;
    result.dateMultiselectEnabled = multiselect?.date ?? false;
    result.hourMultiselectEnabled = multiselect?.hour ?? false;
    result.minuteMultiselectEnabled = multiselect?.minute ?? false;

    return result;
  }, [isTimezoneUTC, multiselect]);

  useEffect(() => {
    const normalizedDraft = normalizeDraft(DEFAULT_SCHEDULE);
    const initialCron = buildUtcCronExpression(normalizedDraft, timezone) ?? "";

    onChange(initialCron);
  }, [timezone]);

  useEffect(() => {
    setCommitValidity(null);
    onValidityChange?.(derivedValidity);

    if (!derivedValidity.valid) {
      return;
    }

    const parsed = parseUtcCronExpression(value, timezone);
    if (parsed) {
      setDraft(parsed);
    }
  }, [derivedValidity, onValidityChange, timezone, value]);

  const validity = commitValidity ?? derivedValidity;

  const dateOptions = useMemo(() => {
    const maxDay = maxDayForMonth(draft.month);
    return Array.from({ length: maxDay }, (_, index) => {
      const day = index + 1;
      return {
        value: day.toString(),
        label: day.toString(),
      };
    });
  }, [draft.month]);

  function commit(nextDraft: ScheduleDraft) {
    const normalizedDraft = normalizeDraft(nextDraft);
    setDraft(normalizedDraft);

    const nextCron = buildUtcCronExpression(normalizedDraft, timezone);
    if (!nextCron) {
      const nextValidity: ValidityState = {
        valid: false,
        reason: "unsupported_utc_conversion",
        message:
          "This combination of timezone, day selection, and every-hour/every-minute settings cannot be represented safely as one UTC cron expression.",
      };
      setCommitValidity(nextValidity);
      onValidityChange?.(nextValidity);
      return;
    }

    setCommitValidity(null);
    const nextValidity: ValidityState = { valid: true };
    onValidityChange?.(nextValidity);
    onChange(nextCron);
  }

  const summary = validity.valid
    ? formatScheduleSummary(draft, timezone, displayFormat)
    : null;
  const dropdownClassNames = dropdownAppearance?.classNames;
  const monthDropdownOptions = useMemo(
    () =>
      monthOptions().map((option) => ({
        ...option,
        label: option.label,
        shortLabel: SHORT_MONTH_LABELS.get(option.value) ?? option.label,
      })),
    [],
  );

  const weekdayDropdownOptions = useMemo(
    () =>
      weekdayOptions().map((option) => ({
        ...option,
        label: option.label,
        shortLabel: SHORT_WEEKDAY_LABELS.get(option.value) ?? option.label,
      })),
    [],
  );

  const hourDropdownOptions = useMemo(
    () => [
      { value: "*", label: "Every hour" },
      ...Array.from({ length: 24 }, (_, hour) => ({
        value: hour.toString(),
        label: formatHourOptionLabel(hour, displayFormat),
      })),
    ],
    [displayFormat],
  );
  const minuteDropdownOptions = useMemo(
    () => [
      { value: "*", label: "Every minute" },
      ...Array.from({ length: 60 }, (_, minute) => ({
        value: minute.toString(),
        label: formatTimeValueLabel(minute, displayFormat),
      })),
    ],
    [displayFormat],
  );

  return (
    <section
      className={["rcf-editor", className].filter(Boolean).join(" ")}
      aria-label="Cron schedule editor"
    >
      <div className="rcf-grid">
        <label className="rcf-field">
          <span>Month</span>
          <Dropdown
            label="Month"
            selectedValues={
              draft.month === null
                ? ["*"]
                : draft.month.map((value) => value.toString())
            }
            valueLabel={formatDropdownValueLabel(
              draft.month === null
                ? ["*"]
                : draft.month.map((value) => value.toString()),
              monthDropdownOptions,
            )}
            onChange={(nextValues) =>
              commit({
                ...draft,
                month: parseMonthValues(nextValues),
              })
            }
            options={monthDropdownOptions}
            disabled={disabled}
            classNames={dropdownClassNames}
            triggerIcon={dropdownAppearance?.triggerIcon}
            multiple={monthMultiselectEnabled}
          />
        </label>

        <label className="rcf-field">
          <span>Day type</span>
          <Dropdown
            label="Day type"
            selectedValues={[draft.dayMode]}
            onChange={(nextValues) =>
              commit({
                ...draft,
                dayMode: (nextValues[0] ??
                  "every_day") as ScheduleDraft["dayMode"],
              })
            }
            options={DAY_MODE_OPTIONS.map((option) => ({ ...option }))}
            disabled={disabled}
            classNames={dropdownClassNames}
            triggerIcon={dropdownAppearance?.triggerIcon}
          />
        </label>

        {draft.dayMode === "weekday" && (
          <label className="rcf-field">
            <span>Weekday</span>
            <Dropdown
              label="Weekday"
              selectedValues={draft.dayOfWeek.map((value) => value.toString())}
              valueLabel={formatDropdownValueLabel(
                draft.dayOfWeek.map((value) => value.toString()),
                weekdayDropdownOptions,
              )}
              onChange={(nextValues) =>
                commit({
                  ...draft,
                  dayOfWeek: parseWeekdayValues(nextValues),
                })
              }
              options={weekdayDropdownOptions}
              disabled={disabled}
              classNames={dropdownClassNames}
              triggerIcon={dropdownAppearance?.triggerIcon}
              multiple={weekdayMultiselectEnabled}
            />
          </label>
        )}

        {draft.dayMode === "date" && (
          <label className="rcf-field">
            <span>Date</span>
            <Dropdown
              label="Date"
              selectedValues={draft.dayOfMonth.map((value) => value.toString())}
              valueLabel={formatDropdownValueLabel(
                draft.dayOfMonth.map((value) => value.toString()),
                dateOptions,
              )}
              onChange={(nextValues) =>
                commit({
                  ...draft,
                  dayOfMonth: parseSelectedNumbers(nextValues, [1]),
                })
              }
              options={dateOptions}
              disabled={disabled}
              classNames={dropdownClassNames}
              triggerIcon={dropdownAppearance?.triggerIcon}
              multiple={dateMultiselectEnabled}
            />
          </label>
        )}

        <label className="rcf-field">
          <span>Hour</span>
          <Dropdown
            label="Hour"
            selectedValues={
              draft.hour === null
                ? ["*"]
                : draft.hour.map((value) => value.toString())
            }
            valueLabel={formatDropdownValueLabel(
              draft.hour === null
                ? ["*"]
                : draft.hour.map((value) => value.toString()),
              hourDropdownOptions,
            )}
            onChange={(nextValues) =>
              commit({
                ...draft,
                hour: parseOptionalSelectedNumbers(nextValues),
              })
            }
            options={hourDropdownOptions}
            disabled={disabled}
            classNames={dropdownClassNames}
            triggerIcon={dropdownAppearance?.triggerIcon}
            multiple={hourMultiselectEnabled}
          />
        </label>

        <label className="rcf-field">
          <span>Minute</span>
          <Dropdown
            label="Minute"
            selectedValues={
              draft.minute === null
                ? ["*"]
                : draft.minute.map((value) => value.toString())
            }
            valueLabel={formatDropdownValueLabel(
              draft.minute === null
                ? ["*"]
                : draft.minute.map((value) => value.toString()),
              minuteDropdownOptions,
            )}
            onChange={(nextValues) =>
              commit({
                ...draft,
                minute: parseOptionalSelectedNumbers(nextValues),
              })
            }
            options={minuteDropdownOptions}
            disabled={disabled}
            classNames={dropdownClassNames}
            triggerIcon={dropdownAppearance?.triggerIcon}
            multiple={minuteMultiselectEnabled}
          />
        </label>

        <label className="rcf-field">
          <span>Second</span>
          <Dropdown
            label="Second"
            selectedValues={[
              draft.second === null ? "*" : draft.second.toString(),
            ]}
            onChange={(nextValues) =>
              commit({
                ...draft,
                second:
                  nextValues[0] === "*"
                    ? null
                    : Number.parseInt(nextValues[0] ?? "0", 10),
              })
            }
            options={[
              { value: "*", label: "Every second" },
              ...Array.from({ length: 60 }, (_, second) => ({
                value: second.toString(),
                label: formatTimeValueLabel(second, displayFormat),
              })),
            ]}
            disabled={disabled}
            classNames={dropdownClassNames}
            triggerIcon={dropdownAppearance?.triggerIcon}
          />
        </label>
      </div>

      {summary ? <p className="rcf-summary">{summary}</p> : null}

      {!validity.valid ? (
        <p
          className={["rcf-error", errorClassName].filter(Boolean).join(" ")}
          role="alert"
        >
          {validity.message}
        </p>
      ) : null}
    </section>
  );
}

function parseMonthValues(values: string[]): number[] | null {
  return parseOptionalSelectedNumbers(values);
}

function parseWeekdayValues(values: string[]): number[] {
  return parseSelectedNumbers(values, [1]);
}

function parseOptionalSelectedNumbers(values: string[]): number[] | null {
  if (values.length === 0 || values.includes("*")) {
    return null;
  }

  return parseSelectedNumbers(values, []);
}

function parseSelectedNumbers(values: string[], fallback: number[]): number[] {
  if (values.length === 0) {
    return fallback;
  }

  return values.map((value) => Number.parseInt(value, 10));
}

function formatDropdownValueLabel(
  selectedValues: string[],
  options: Array<{ value: string; label: string; shortLabel?: string }>,
): string {
  const labels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.shortLabel ?? option.label);

  return formatVisibleLabelList(labels);
}

function formatVisibleLabelList(labels: string[]): string {
  if (labels.length === 0) {
    return "";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]}, ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, ${labels[labels.length - 1]}`;
}

function deriveValidity(cron: string, timezone: string): ValidityState {
  if (!isValidTimezone(timezone)) {
    return {
      valid: false,
      reason: "invalid_timezone",
      message: `Timezone "${timezone}" is not a valid IANA timezone.`,
    };
  }

  if (parseCronExpression(cron) === null) {
    return {
      valid: false,
      reason: "unsupported_cron",
      message:
        "This UTC cron value is not supported by the editor. Use a six-field cron with numeric values, supported comma lists, or wildcards in the supported fields.",
    };
  }

  if (parseUtcCronExpression(cron, timezone) === null) {
    return {
      valid: false,
      reason: "unsupported_utc_conversion",
      message:
        "This UTC cron cannot be shown safely in the selected timezone because the day selection and every-hour/every-minute settings would spill across UTC day boundaries.",
    };
  }

  return { valid: true };
}
