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
    await chooseOption(user, "Weekday", "Monday");
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
        "This UTC cron value is not supported by the editor. Use a six-field cron with numeric values or wildcards in the time fields.",
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This UTC cron value is not supported by the editor. Use a six-field cron with numeric values or wildcards in the time fields.",
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

    await chooseOption(user, "Month", "February");
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
});

async function chooseOption(user: ReturnType<typeof userEvent.setup>, label: string, optionLabel: string) {
  await user.click(screen.getByRole("button", { name: label }));
  await user.click(screen.getByRole("option", { name: optionLabel }));
}
