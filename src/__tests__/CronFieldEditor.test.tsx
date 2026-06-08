import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CronFieldEditor } from "../CronFieldEditor";

describe("CronFieldEditor", () => {
  it("emits the next UTC cron string when a user sets monday midnight every second", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<CronFieldEditor value="0 0 6 * * *" timezone="UTC" onChange={handleChange} />);

    await chooseOption(user, "Day type", "Specific weekday");
    await chooseOption(user, "Weekday", "MON");
    await chooseOption(user, "Hour", "00");
    await chooseOption(user, "Minute", "00");
    await chooseOption(user, "Second", "Every second");

    expect(handleChange).toHaveBeenLastCalledWith("* 0 0 * * 1");
  });

  it("supports every-minute and every-hour choices inside the time dropdowns", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<CronFieldEditor value="0 0 6 * * *" timezone="UTC" onChange={handleChange} />);

    await chooseOption(user, "Hour", "Every hour");
    await chooseOption(user, "Minute", "Every minute");
    await chooseOption(user, "Second", "15");
    expect(handleChange).toHaveBeenLastCalledWith("15 * * * * *");

    await chooseOption(user, "Minute", "10");
    expect(handleChange).toHaveBeenLastCalledWith("15 10 * * * *");
  });

  it("surfaces invalid timezone state without falling back to browser locale", () => {
    const handleValidityChange = vi.fn();

    render(
      <CronFieldEditor
        value="0 0 9 * * *"
        timezone="Invalid/Timezone"
        onChange={vi.fn()}
        onValidityChange={handleValidityChange}
      />,
    );

    expect(handleValidityChange).toHaveBeenCalledWith({
      valid: false,
      reason: "invalid_timezone",
      message: 'Timezone "Invalid/Timezone" is not a valid IANA timezone.',
    });
    expect(screen.getByText('Timezone "Invalid/Timezone" is not a valid IANA timezone.')).toBeInTheDocument();
  });

  it("renders visible unsupported cron errors", () => {
    const handleValidityChange = vi.fn();

    render(
      <CronFieldEditor
        value="0 0 9 * *"
        timezone="UTC"
        onChange={vi.fn()}
        onValidityChange={handleValidityChange}
      />,
    );

    expect(handleValidityChange).toHaveBeenCalledWith({
      valid: false,
      reason: "unsupported_cron",
      message:
        "This UTC cron value is not supported by the editor. Use a six-field cron with numeric values, supported comma lists, or wildcards in the supported fields.",
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This UTC cron value is not supported by the editor. Use a six-field cron with numeric values, supported comma lists, or wildcards in the supported fields.",
    );
  });

  it("renders visible unsupported UTC conversion errors", () => {
    const handleValidityChange = vi.fn();

    render(
      <CronFieldEditor
        value="0 0 * * * 1"
        timezone="Europe/Kiev"
        onChange={vi.fn()}
        onValidityChange={handleValidityChange}
      />,
    );

    expect(handleValidityChange).toHaveBeenCalledWith({
      valid: false,
      reason: "unsupported_utc_conversion",
      message:
        "This UTC cron cannot be shown safely in the selected timezone because the day selection and every-hour/every-minute settings would spill across UTC day boundaries.",
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This UTC cron cannot be shown safely in the selected timezone because the day selection and every-hour/every-minute settings would spill across UTC day boundaries.",
    );
  });

  it("stops emitting changes when disabled", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<CronFieldEditor value="0 0 9 * * *" timezone="America/New_York" onChange={handleChange} disabled />);

    expect(screen.getByRole("button", { name: "Hour" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Hour" }));

    expect(handleChange).not.toHaveBeenCalled();
  });

  it("updates the displayed local summary when the timezone prop changes while keeping the UTC cron input", () => {
    const { rerender } = render(<CronFieldEditor value="0 0 0 * * *" timezone="Europe/Kiev" onChange={vi.fn()} />);

    expect(screen.getByText("Runs at 3:00:00 AM in every month (Europe/Kiev)")).toBeInTheDocument();

    rerender(<CronFieldEditor value="0 0 0 * * *" timezone="America/New_York" onChange={vi.fn()} />);

    expect(screen.getByText("Runs at 8:00:00 PM in every month (America/New_York)")).toBeInTheDocument();
  });

  it("reduces date choices when a shorter month is selected", async () => {
    const user = userEvent.setup();

    render(<CronFieldEditor value="0 0 9 31 1 *" timezone="UTC" onChange={vi.fn()} />);

    await chooseOption(user, "Month", "FEB");
    await chooseOption(user, "Day type", "Specific date");

    const dateButton = screen.getByRole("button", { name: "Date" });
    expect(dateButton).toHaveTextContent("29");

    await user.click(dateButton);

    const dateListbox = screen.getByRole("listbox", { name: "Date" });
    expect(within(dateListbox).queryByRole("option", { name: "30" })).not.toBeInTheDocument();
    expect(within(dateListbox).queryByRole("option", { name: "31" })).not.toBeInTheDocument();
  });

  it("applies cosmetic dropdown customization hooks without replacing behavior", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <CronFieldEditor
        value="0 0 6 * * *"
        timezone="UTC"
        onChange={handleChange}
        dropdownAppearance={{
          classNames: {
            root: "host-dropdown",
            trigger: "host-trigger",
            value: "host-value",
            chevron: "host-chevron",
            menu: "host-menu",
            option: "host-option",
            optionSelected: "host-option-selected",
          },
          triggerIcon: "v",
        }}
      />,
    );

    const hourButton = screen.getByRole("button", { name: "Hour" });
    expect(hourButton).toHaveClass("host-trigger");
    expect(hourButton.querySelector(".host-value")).not.toBeNull();
    expect(hourButton.querySelector(".host-chevron")).toHaveTextContent("v");

    await user.click(hourButton);

    const hourListbox = screen.getByRole("listbox", { name: "Hour" });
    expect(hourListbox).toHaveClass("host-menu");
    const selectedOption = screen.getByRole("option", { name: "06" });
    expect(selectedOption).toHaveClass("host-option");
    expect(selectedOption).toHaveClass("host-option-selected");

    await user.click(screen.getByRole("option", { name: "07" }));
    expect(handleChange).toHaveBeenLastCalledWith("0 0 7 * * *");
  });

  it("uses the provided display format for both field labels and summary output", () => {
    render(
      <CronFieldEditor
        value="0 0 0 * * *"
        timezone="Europe/Kiev"
        onChange={vi.fn()}
        displayFormat={{ hourCycle: "12h", leadingZero: true }}
      />,
    );

    expect(screen.getByRole("button", { name: "Hour" })).toHaveTextContent("03:00 AM");
    expect(screen.getByText("Runs at 03:00:00 AM in every month (Europe/Kiev)")).toBeInTheDocument();
  });

  it("supports 24-hour no-leading-zero formatting", () => {
    render(
      <CronFieldEditor
        value="0 0 0 * * *"
        timezone="Europe/Kiev"
        onChange={vi.fn()}
        displayFormat={{ hourCycle: "24h", leadingZero: false }}
      />,
    );

    expect(screen.getByRole("button", { name: "Hour" })).toHaveTextContent("3");
    expect(screen.getByText("Runs at 3:0:0 in every month (Europe/Kiev)")).toBeInTheDocument();
  });

  it("supports opt-in month multiselect while preserving the built-in dropdown behavior", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <CronFieldEditor
        value="0 0 6 * * *"
        timezone="UTC"
        onChange={handleChange}
        multiselect={{ month: true }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Month" }));
    await user.click(screen.getByRole("option", { name: "JAN" }));
    expect(screen.getByRole("listbox", { name: "Month" })).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "MAR" }));

    expect(handleChange).toHaveBeenLastCalledWith("0 0 6 * 1,3 *");
    expect(screen.getByRole("button", { name: "Month" })).toHaveTextContent("JAN, MAR");
  });

  it("keeps the full multiselect month label in the trigger title while the visible text can ellipsize", async () => {
    const user = userEvent.setup();

    render(
      <CronFieldEditor
        value="0 0 6 * * *"
        timezone="UTC"
        onChange={vi.fn()}
        multiselect={{ month: true }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Month" }));
    await user.click(screen.getByRole("option", { name: "JAN" }));
    await user.click(screen.getByRole("option", { name: "MAR" }));
    await user.click(screen.getByRole("option", { name: "MAY" }));
    await user.click(screen.getByRole("option", { name: "JUL" }));

    const monthButton = screen.getByRole("button", { name: "Month" });
    expect(monthButton).toHaveTextContent("JAN, MAR, MAY, JUL");
    expect(monthButton).toHaveAttribute("title", "JAN, MAR, MAY, JUL");
  });

  it("supports opt-in weekday multiselect", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <CronFieldEditor
        value="0 0 6 * * *"
        timezone="UTC"
        onChange={handleChange}
        multiselect={{ weekday: true }}
      />,
    );

    await chooseOption(user, "Day type", "Specific weekday");
    await user.click(screen.getByRole("button", { name: "Weekday" }));
    await user.click(screen.getByRole("option", { name: "WED" }));

    expect(handleChange).toHaveBeenLastCalledWith("0 0 6 * * 1,3");
    expect(screen.getByRole("button", { name: "Weekday" })).toHaveTextContent("MON, WED");
  });

  it("keeps an all-weekdays multiselect selection instead of collapsing to a single weekday", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <CronFieldEditor
        value="0 0 6 * * 1"
        timezone="UTC"
        onChange={handleChange}
        multiselect={{ weekday: true }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Weekday" }));
    await user.click(screen.getByRole("option", { name: "SUN" }));
    await user.click(screen.getByRole("option", { name: "TUE" }));
    await user.click(screen.getByRole("option", { name: "WED" }));
    await user.click(screen.getByRole("option", { name: "THU" }));
    await user.click(screen.getByRole("option", { name: "FRI" }));
    await user.click(screen.getByRole("option", { name: "SAT" }));

    expect(handleChange).toHaveBeenLastCalledWith("0 0 6 * * 0,1,2,3,4,5,6");
  });

  it("supports opt-in date multiselect", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <CronFieldEditor
        value="0 0 6 1 1 *"
        timezone="UTC"
        onChange={handleChange}
        multiselect={{ date: true }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Date" }));
    await user.click(screen.getByRole("option", { name: "15" }));

    expect(handleChange).toHaveBeenLastCalledWith("0 0 6 1,15 1 *");
    expect(screen.getByRole("button", { name: "Date" })).toHaveTextContent("1, 15");
  });

  it("supports opt-in hour multiselect", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <CronFieldEditor
        value="0 0 6 * * *"
        timezone="UTC"
        onChange={handleChange}
        multiselect={{ hour: true }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Hour" }));
    await user.click(screen.getByRole("option", { name: "09" }));

    expect(handleChange).toHaveBeenLastCalledWith("0 0 6,9 * * *");
    expect(screen.getByRole("button", { name: "Hour" })).toHaveTextContent("06, 09");
  });

  it("disables timezone-unsafe multiselect hour choices with guidance to use UTC", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <CronFieldEditor
        value="0 0 0 * * 1"
        timezone="Europe/Kiev"
        onChange={handleChange}
        multiselect={{ hour: true }}
        displayFormat={{ hourCycle: "12h", leadingZero: true }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Hour" }));
    await user.click(screen.getByRole("option", { name: "04:00 AM" }));

    handleChange.mockClear();

    const blockedHourOption = screen.getByRole("option", { name: "01:00 AM" });
    expect(blockedHourOption).toBeDisabled();
    expect(blockedHourOption).toHaveAttribute(
      "title",
      "You cannot select this option because of your timezone. use UTC instead",
    );

    await user.click(blockedHourOption);

    expect(handleChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Hour" })).toHaveTextContent(
      "03:00 AM, 04:00 AM",
    );
  });

  it("supports opt-in minute multiselect", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <CronFieldEditor
        value="0 0 6 * * *"
        timezone="UTC"
        onChange={handleChange}
        multiselect={{ minute: true }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Minute" }));
    await user.click(screen.getByRole("option", { name: "15" }));

    expect(handleChange).toHaveBeenLastCalledWith("0 0,15 6 * * *");
    expect(screen.getByRole("button", { name: "Minute" })).toHaveTextContent("00, 15");
  });
});

async function chooseOption(user: ReturnType<typeof userEvent.setup>, label: string, optionLabel: string) {
  await user.click(screen.getByRole("button", { name: label }));
  await user.click(screen.getByRole("option", { name: optionLabel }));
}
