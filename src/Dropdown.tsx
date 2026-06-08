import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import type { DropdownClassNames } from "./types";

type DropdownOption = {
  value: string;
  label: string;
};

type DropdownProps = {
  label: string;
  selectedValues: string[];
  options: DropdownOption[];
  onChange: (nextValues: string[]) => void;
  disabled?: boolean;
  classNames?: DropdownClassNames;
  triggerIcon?: ReactNode;
  multiple?: boolean;
  valueLabel?: string;
};

export function Dropdown({
  label,
  selectedValues = [],
  options,
  onChange,
  disabled = false,
  classNames,
  triggerIcon,
  multiple = false,
  valueLabel,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));
  const triggerLabel = valueLabel ?? selectedOptions[0]?.label ?? options[0]?.label ?? "";

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div
      className={joinClassNames("rcf-dropdown", open ? "rcf-dropdown-open" : "", classNames?.root)}
      ref={rootRef}
    >
      <button
        type="button"
        className={joinClassNames("rcf-dropdown-trigger", classNames?.trigger)}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        title={triggerLabel}
      >
        <span className={joinClassNames("rcf-dropdown-value", classNames?.value)}>
          {triggerLabel}
        </span>
        <span className={joinClassNames("rcf-dropdown-chevron", classNames?.chevron)} aria-hidden="true">
          {triggerIcon ?? "▾"}
        </span>
      </button>

      {open ? (
        <div
          className={joinClassNames("rcf-dropdown-menu", classNames?.menu)}
          role="listbox"
          id={listboxId}
          aria-label={label}
          aria-multiselectable={multiple || undefined}
        >
          {options.map((option) => {
            const selected = selectedValues.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={joinClassNames(
                  "rcf-dropdown-option",
                  selected ? "rcf-dropdown-option-selected" : "",
                  classNames?.option,
                  selected ? classNames?.optionSelected : "",
                )}
                onClick={() => {
                  if (multiple) {
                    if (option.value === "*") {
                      onChange(selected ? [] : ["*"]);
                      return;
                    }

                    const baseValues = selectedValues.includes("*")
                      ? []
                      : selectedValues;
                    const nextValues = selected
                      ? selectedValues.filter((value) => value !== option.value)
                      : [...baseValues, option.value];
                    onChange(nextValues);
                    return;
                  }

                  onChange([option.value]);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}
