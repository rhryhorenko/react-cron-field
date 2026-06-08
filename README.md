# react-cron-field

`react-cron-field` is an embeddable React library for letting non-technical users configure recurring schedules with dropdowns instead of raw cron syntax, while keeping the emitted cron in UTC.

## Install

```bash
npm install react-cron-field
```

React is a peer dependency.

## Minimal usage

```tsx
import { useState } from "react";
import { CronFieldEditor } from "react-cron-field";
import "react-cron-field/styles.css";

export function BillingReminderForm() {
  const [cron, setCron] = useState("0 0 6 * * 1");

  return (
    <CronFieldEditor
      value={cron}
      timezone="America/New_York"
      onChange={setCron}
      multiselect={{ month: true, weekday: true, date: true, hour: true, minute: true }}
      onValidityChange={(state) => {
        if (!state.valid) {
          console.error(state.message);
        }
      }}
      displayFormat={{ hourCycle: "12h", leadingZero: true }}
    />
  );
}
```

## Styling and cosmetic customization

`react-cron-field` keeps dropdown behavior and accessibility inside the library, but v2 adds cosmetic hooks for host design systems:

```tsx
<CronFieldEditor
  value={cron}
  timezone="America/New_York"
  onChange={setCron}
  className="billing-editor"
  errorClassName="billing-editor-error"
  dropdownAppearance={{
    classNames: {
      trigger: "billing-editor-trigger",
      menu: "billing-editor-menu",
      optionSelected: "billing-editor-option-selected",
    },
    triggerIcon: "⌄",
  }}
/>
```

Available dropdown class hooks:

- `root`
- `trigger`
- `value`
- `chevron`
- `menu`
- `option`
- `optionSelected`

These hooks are cosmetic only. They do not replace the built-in dropdown component, open state, option selection behavior, or accessibility semantics.

## API

### `CronFieldEditor`

- `value`: controlled UTC six-field cron string in `second minute hour day month weekday` order.
- `timezone`: required IANA timezone string. This is the display timezone for the editor and summary.
- `onChange`: emits the next UTC cron string after every valid edit.
- `onValidityChange`: optional callback for invalid timezone or unsupported cron states.
- `disabled`: optional interaction lock.
- `className`: optional wrapper styling hook.
- `errorClassName`: optional styling hook for the built-in error region.
- `displayFormat`: optional display formatting config for dropdown labels and summary text.
  - `hourCycle`: `"12h"` or `"24h"`
  - `leadingZero`: `true` or `false`
- `multiselect`: optional field-level multiselect configuration.
  - `month`: enables comma-list month editing through the built-in month dropdown
  - `weekday`: enables comma-list weekday editing through the built-in weekday dropdown
  - `date`: enables comma-list date editing through the built-in date dropdown
  - `hour`: enables comma-list hour editing through the built-in hour dropdown
  - `minute`: enables comma-list minute editing through the built-in minute dropdown
- `dropdownAppearance`: optional cosmetic dropdown customization object.
  - `classNames`: slot-level class hooks listed above
  - `triggerIcon`: optional replacement for the default chevron glyph

The editor always renders a built-in visible error region for:

- invalid IANA timezones
- unsupported incoming cron syntax
- unsupported UTC-to-timezone conversions

### `formatScheduleSummary(schedule, timezone, displayFormat?)`

Formats the same normalized schedule model used by the editor into deterministic summary text. Pass the same optional `displayFormat` object to keep host-rendered summaries aligned with editor labels.

## Timezone contract

- The `timezone` prop is required.
- Browser timezone is not the source of truth.
- The editor converts the UTC cron value into the provided timezone for display.
- Invalid IANA timezone input produces an explicit invalid/error state.
- Host apps should persist the timezone alongside the emitted UTC cron string.

## Linux cron support in v1

- Six-field cron only, emitted in UTC.
- Supported editor patterns: every day, specific weekday, or specific date, with `Every hour`, `Every minute`, and `Every second` available inside the time-field dropdowns.
- Optional multiselect currently supports explicit comma lists for `month`, `weekday`, `date`, `hour`, and `minute` fields.
- Supported multiselect syntax is limited to explicit lists such as `1,3`; ranges and steps remain unsupported.
- Unsupported incoming cron shapes surface an explicit invalid/editor-unsupported state.
- Date-based schedules without a specific month are rejected if timezone conversion would cross month boundaries.

## Demo

```bash
npm run dev
```

The demo page lets the host app switch timezone props, toggle `12h`/`24h` display, enable field-level multiselect for month/weekday/date/hour/minute, inspect the built-in error area, and preview cosmetic dropdown hooks while the emitted cron stays in UTC.
