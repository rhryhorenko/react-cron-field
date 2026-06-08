import type { ReactNode } from "react";

export type MonthSelection = number[] | null;
export type WeekdaySelection = number[];
export type DateSelection = number[];
export type TimeSelection = number[] | null;

export type ScheduleDraft = {
  month: MonthSelection;
  dayMode: "every_day" | "weekday" | "date";
  dayOfWeek: WeekdaySelection;
  dayOfMonth: DateSelection;
  hour: TimeSelection;
  minute: TimeSelection;
  second: number | null;
};

export type ValidityState =
  | { valid: true }
  | {
      valid: false;
      reason: "invalid_timezone" | "unsupported_cron" | "unsupported_utc_conversion";
      message: string;
    };

export type DisplayFormat = {
  hourCycle?: "12h" | "24h";
  leadingZero?: boolean;
};

export type DropdownClassNames = {
  root?: string;
  trigger?: string;
  value?: string;
  chevron?: string;
  menu?: string;
  option?: string;
  optionSelected?: string;
};

export type DropdownAppearance = {
  classNames?: DropdownClassNames;
  triggerIcon?: ReactNode;
};

export type MultiselectConfig = {
  month?: boolean;
  weekday?: boolean;
  date?: boolean;
  hour?: boolean;
  minute?: boolean;
};

export type CronFieldEditorProps = {
  value: string;
  timezone: string;
  onChange: (nextCron: string) => void;
  onValidityChange?: (state: ValidityState) => void;
  disabled?: boolean;
  className?: string;
  dropdownAppearance?: DropdownAppearance;
  displayFormat?: DisplayFormat;
  errorClassName?: string;
  multiselect?: MultiselectConfig;
};
