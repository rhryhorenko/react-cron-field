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

export function CronFieldEditor({
  value,
  timezone,
  onChange,
  onValidityChange,
  disabled = false,
  className,
  dropdownAppearance,
  displayFormat,
  errorClassName,
}: CronFieldEditorProps) {
  const [draft, setDraft] = useState<ScheduleDraft>(DEFAULT_SCHEDULE);
  const [commitValidity, setCommitValidity] = useState<ValidityState | null>(null);
  const derivedValidity = useMemo(() => deriveValidity(value, timezone), [timezone, value]);

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
      return { value: day.toString(), label: day.toString() };
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

  const summary = validity.valid ? formatScheduleSummary(draft, timezone, displayFormat) : null;
  const dropdownClassNames = dropdownAppearance?.classNames;

  return (
    <section className={["rcf-editor", className].filter(Boolean).join(" ")} aria-label="Cron schedule editor">
      <div className="rcf-grid">
        <label className="rcf-field">
          <span>Month</span>
          <Dropdown
            label="Month"
            value={draft.month === null ? "*" : draft.month.toString()}
            onChange={(nextValue) =>
              commit({
                ...draft,
                month:
                  nextValue === "*" ? null : Number.parseInt(nextValue, 10),
              })
            }
            options={monthOptions()}
            disabled={disabled}
            classNames={dropdownClassNames}
            triggerIcon={dropdownAppearance?.triggerIcon}
          />
        </label>

        <label className="rcf-field">
          <span>Day type</span>
          <Dropdown
            label="Day type"
            value={draft.dayMode}
            onChange={(nextValue) =>
              commit({
                ...draft,
                dayMode: nextValue as ScheduleDraft["dayMode"],
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
              value={draft.dayOfWeek.toString()}
              onChange={(nextValue) =>
                commit({
                  ...draft,
                  dayOfWeek: Number.parseInt(nextValue, 10),
                })
              }
              options={weekdayOptions()}
              disabled={disabled}
              classNames={dropdownClassNames}
              triggerIcon={dropdownAppearance?.triggerIcon}
            />
          </label>
        )}

        {draft.dayMode === "date" && (
          <label className="rcf-field">
            <span>Date</span>
            <Dropdown
              label="Date"
              value={draft.dayOfMonth.toString()}
              onChange={(nextValue) =>
                commit({
                  ...draft,
                  dayOfMonth: Number.parseInt(nextValue, 10),
                })
              }
              options={dateOptions}
              disabled={disabled}
              classNames={dropdownClassNames}
              triggerIcon={dropdownAppearance?.triggerIcon}
            />
          </label>
        )}

        <label className="rcf-field">
          <span>Hour</span>
          <Dropdown
            label="Hour"
            value={draft.hour === null ? "*" : draft.hour.toString()}
            onChange={(nextValue) =>
              commit({
                ...draft,
                hour:
                  nextValue === "*" ? null : Number.parseInt(nextValue, 10),
              })
            }
            options={[
              { value: "*", label: "Every hour" },
              ...Array.from({ length: 24 }, (_, hour) => ({
                value: hour.toString(),
                label: formatHourOptionLabel(hour, displayFormat),
              })),
            ]}
            disabled={disabled}
            classNames={dropdownClassNames}
            triggerIcon={dropdownAppearance?.triggerIcon}
          />
        </label>

        <label className="rcf-field">
          <span>Minute</span>
          <Dropdown
            label="Minute"
            value={draft.minute === null ? "*" : draft.minute.toString()}
            onChange={(nextValue) =>
              commit({
                ...draft,
                minute:
                  nextValue === "*" ? null : Number.parseInt(nextValue, 10),
              })
            }
            options={[
              { value: "*", label: "Every minute" },
              ...Array.from({ length: 60 }, (_, minute) => ({
                value: minute.toString(),
                label: formatTimeValueLabel(minute, displayFormat),
              })),
            ]}
            disabled={disabled}
            classNames={dropdownClassNames}
            triggerIcon={dropdownAppearance?.triggerIcon}
          />
        </label>

        <label className="rcf-field">
          <span>Second</span>
          <Dropdown
            label="Second"
            value={draft.second === null ? "*" : draft.second.toString()}
            onChange={(nextValue) =>
              commit({
                ...draft,
                second:
                  nextValue === "*" ? null : Number.parseInt(nextValue, 10),
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
        <p className={["rcf-error", errorClassName].filter(Boolean).join(" ")} role="alert">
          {validity.message}
        </p>
      ) : null}
    </section>
  );
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
        "This UTC cron value is not supported by the editor. Use a six-field cron with numeric values or wildcards in the time fields.",
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
