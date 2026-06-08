import type { ReactNode } from "react";

export type ScheduleDraft = {
  month: number | null;
  dayMode: "every_day" | "weekday" | "date";
  dayOfWeek: number;
  dayOfMonth: number;
  hour: number | null;
  minute: number | null;
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
};
