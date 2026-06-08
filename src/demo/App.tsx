import { useState } from "react";
import { CronFieldEditor, formatScheduleSummary } from "../index";
import { parseUtcCronExpression } from "../cron-model";
import "./demo.css";

const TIMEZONES = [
  "UTC",
  "Europe/Kiev",
  "America/New_York",
  "Asia/Tokyo",
  "Invalid/Timezone",
];

export function App() {
  const [cron, setCron] = useState("0 0 9 * * 3");
  const [timezone, setTimezone] = useState("UTC");
  const [validityMessage, setValidityMessage] = useState("Valid schedule");
  const [hourCycle, setHourCycle] = useState<"12h" | "24h">("12h");
  const [leadingZero, setLeadingZero] = useState(true);

  const parsed = parseUtcCronExpression(cron, timezone);
  const summary = parsed
    ? formatScheduleSummary(parsed, timezone, { hourCycle, leadingZero })
    : "Unsupported cron";

  return (
    <main className="demo-shell">
      <section className="demo-intro">
        <p className="demo-kicker">react-cron-field</p>
        <h1>End-user-friendly Linux cron editing for React apps</h1>
        <p>
          This demo treats the cron value as UTC, converts it into the host
          timezone for editing, and emits a normalized six-field UTC cron back
          to the host app after every edit.
        </p>

        <div className="demo-controls">
          <label className="demo-timezone">
            <span>Host timezone prop</span>
            <select
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            >
              {TIMEZONES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="demo-timezone">
            <span>Hour cycle</span>
            <select
              value={hourCycle}
              onChange={(event) => setHourCycle(event.target.value as "12h" | "24h")}
            >
              <option value="12h">12-hour</option>
              <option value="24h">24-hour</option>
            </select>
          </label>

          <label className="demo-checkbox">
            <input
              checked={leadingZero}
              type="checkbox"
              onChange={(event) => setLeadingZero(event.target.checked)}
            />
            <span>Use leading zero labels</span>
          </label>
        </div>
      </section>

      <CronFieldEditor
        value={cron}
        timezone={timezone}
        className="demo-editor"
        errorClassName="demo-editor-error"
        displayFormat={{ hourCycle, leadingZero }}
        dropdownAppearance={{
          classNames: {
            root: "demo-dropdown",
            trigger: "demo-dropdown-trigger",
            menu: "demo-dropdown-menu",
            optionSelected: "demo-dropdown-option-selected",
          },
          triggerIcon: "⌄",
        }}
        onChange={(value) => {
          console.log("Emitted cron:", value);
          setCron(value);
        }}
        onValidityChange={(state) =>
          setValidityMessage(state.valid ? "Valid schedule" : state.message)
        }
      />

      <section className="demo-facts">
        <article>
          <p className="demo-kicker">Emitted cron (UTC)</p>
          <code>{cron}</code>
        </article>
        <article>
          <p className="demo-kicker">Current summary in {timezone}</p>
          <p>{summary}</p>
        </article>
        <article>
          <p className="demo-kicker">Validity callback</p>
          <p>{validityMessage}</p>
        </article>
      </section>
    </main>
  );
}
